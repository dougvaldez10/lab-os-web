import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizePhone } from "@/lib/phoneUtils";

// Supabase client with admin access
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy-key"
);

// GET: Verificación de Webhook para Meta
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "legion_verify_token";

  if (mode === "subscribe" && token === verifyToken) {
    console.log("[WhatsApp Webhook] Webhook verificado correctamente.");
    return new Response(challenge, { status: 200 });
  }

  console.warn("[WhatsApp Webhook] Fallo en la verificación del webhook.");
  return new Response("Forbidden", { status: 403 });
}

// POST: Recepción de eventos/mensajes de WhatsApp
export async function POST(request) {
  try {
    const payload = await request.json();

    // Validar estructura de Meta
    if (!payload.object || !payload.entry || payload.entry.length === 0) {
      return NextResponse.json({ success: true, message: "No data in entry" });
    }

    const entry = payload.entry[0];
    if (!entry.changes || entry.changes.length === 0) {
      return NextResponse.json({ success: true, message: "No changes in entry" });
    }

    const value = entry.changes[0].value;
    if (!value.messages || value.messages.length === 0) {
      return NextResponse.json({ success: true, message: "No messages in payload" });
    }

    const message = value.messages[0];
    const fromRaw = message.from; // Número remitente
    const normalizedFrom = normalizePhone(fromRaw);
    const messageId = message.id;

    console.log(`[WhatsApp Webhook] Mensaje recibido de: ${fromRaw} (Normalizado: ${normalizedFrom})`);

    // 1. Identificar remitente
    // Buscar en usuarios (equipo)
    const { data: usuario } = await supabaseAdmin
      .from("usuarios")
      .select("id, username, rol")
      .eq("telefono", normalizedFrom)
      .maybeSingle();

    if (usuario) {
      console.log(`[WhatsApp Webhook] Remitente reconocido como miembro del equipo: ${usuario.username}`);
      await handleInternalFlow(message, normalizedFrom, usuario);
      return NextResponse.json({ success: true });
    }

    // Buscar en clientes (doctores/clínicas)
    const { data: cliente } = await supabaseAdmin
      .from("clientes")
      .select("id, nombre, responsable")
      .or(`tel_whatsapp.eq.${normalizedFrom},tel_celular.eq.${normalizedFrom}`)
      .maybeSingle();

    if (cliente) {
      console.log(`[WhatsApp Webhook] Remitente reconocido como cliente: ${cliente.nombre}`);
      await handleExternalFlow(message, normalizedFrom, cliente);
      return NextResponse.json({ success: true });
    }

    // Remitente desconocido (Estrategia AI)
    console.log(`[WhatsApp Webhook] Remitente desconocido: ${normalizedFrom}`);
    await handleUnknownFlow(message, normalizedFrom);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("[WhatsApp Webhook] Error crítico procesando webhook:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * Envia un mensaje de texto de respuesta al usuario via API de WhatsApp Graph.
 */
async function sendWhatsAppMessage(to, textBody) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    console.error("[WhatsApp Webhook] Falta configurar WHATSAPP_ACCESS_TOKEN o WHATSAPP_PHONE_NUMBER_ID.");
    return;
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to.replace("+", ""), // Quitar el signo '+'
        type: "text",
        text: {
          body: textBody
        }
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("[WhatsApp Webhook] Error al enviar mensaje por WhatsApp:", data);
    } else {
      console.log(`[WhatsApp Webhook] Mensaje enviado exitosamente a ${to}`);
    }
  } catch (err) {
    console.error("[WhatsApp Webhook] Error de red enviando WhatsApp:", err);
  }
}

/**
 * Descarga una imagen de los servidores de Meta y la convierte a Buffer/Base64.
 */
async function downloadMetaMedia(mediaId) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!accessToken) throw new Error("Falta token de WhatsApp");

  // 1. Obtener la URL de descarga
  const resUrl = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
    headers: { "Authorization": `Bearer ${accessToken}` }
  });
  
  const mediaData = await resUrl.json();
  if (!resUrl.ok || !mediaData.url) {
    throw new Error(`No se pudo obtener URL del medio: ${JSON.stringify(mediaData)}`);
  }

  // 2. Descargar el archivo binario
  const resMedia = await fetch(mediaData.url, {
    headers: { "Authorization": `Bearer ${accessToken}` }
  });

  if (!resMedia.ok) {
    throw new Error(`Error descargando el archivo multimedia de Meta.`);
  }

  const arrayBuffer = await resMedia.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Envía una imagen y un prompt a Gemini Vision API y obtiene el texto analizado.
 */
async function analyzeImageWithGemini(imageBuffer, mimeType, prompt) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) throw new Error("Falta GEMINI_API_KEY");

  const base64Data = imageBuffer.toString("base64");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data
              }
            }
          ]
        }
      ]
    })
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("Gemini API Error:", data);
    throw new Error(data.error?.message || "Error al invocar Gemini");
  }

  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

/**
 * Consulta a Gemini en modo conversacional.
 */
async function queryGeminiChat(systemInstruction, userMessage) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return "Lo siento, mi servicio de inteligencia artificial está temporalmente inactivo.";

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        contents: [
          {
            parts: [{ text: userMessage }]
          }
        ]
      })
    });

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "No logré procesar tu solicitud.";
  } catch (err) {
    console.error("Gemini Chat Error:", err);
    return "Ocurrió un error al procesar el mensaje con Gemini.";
  }
}

/**
 * Flujo Interno (Miembros del Equipo): Registro automático de gastos por foto
 */
async function handleInternalFlow(message, from, user) {
  // Si el mensaje es una foto
  if (message.type === "image") {
    await sendWhatsAppMessage(from, "📸 He recibido tu imagen. Leyendo los datos del comprobante con la IA de la Legión...");

    try {
      const mediaId = message.image.id;
      const mimeType = message.image.mime_type;
      const buffer = await downloadMetaMedia(mediaId);

      // Prompt para Gemini
      const prompt = `Analiza esta imagen de recibo o comprobante de compra y extrae la información en formato JSON estricto.
Retorna UNICAMENTE el objeto JSON sin formato markdown ni caracteres extras.
Estructura del JSON:
{
  "concepto": "Descripción corta y clara del gasto",
  "monto": 1250.50,
  "proveedor": "Nombre del proveedor o tienda",
  "tipo_producto": "Materiales" o "Servicios" o "Renta" o "Nómina" o "Equipo" o "Mantenimiento" o "Otros" (selecciona la más apropiada),
  "fecha": "YYYY-MM-DD",
  "detalles": [
    {
      "descripcion": "nombre del producto o insumo",
      "cantidad": 1,
      "precio_unitario": 1250.50
    }
  ]
}`;

      const geminiResult = await analyzeImageWithGemini(buffer, mimeType, prompt);
      
      // Limpiar respuesta JSON
      const jsonStr = geminiResult.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsedData = JSON.parse(jsonStr);

      // Subir archivo a Supabase Storage bucket 'comprobantes_pago'
      const fileExt = mimeType.split("/").pop() || "png";
      const filePath = `gastos/gasto_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from("comprobantes_pago")
        .upload(filePath, buffer, { contentType: mimeType, upsert: true });

      let publicComprobanteUrl = null;
      if (!uploadError) {
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from("comprobantes_pago")
          .getPublicUrl(filePath);
        publicComprobanteUrl = publicUrl;
      }

      // Guardar en base de datos de manera directa
      const { data: insertedGasto, error: errGasto } = await supabaseAdmin
        .from("gastos")
        .insert({
          fecha: parsedData.fecha || new Date().toISOString().split("T")[0],
          concepto: parsedData.concepto,
          monto: parsedData.monto,
          tipo_producto: parsedData.tipo_producto || "Otros",
          proveedor: parsedData.proveedor || "Genérico",
          comprobante_url: publicComprobanteUrl,
          creado_por: `WhatsApp: ${user.username}`
        })
        .select()
        .single();

      if (errGasto) throw errGasto;

      // Insertar detalles si existen
      if (parsedData.detalles && parsedData.detalles.length > 0) {
        const detailRows = parsedData.detalles.map(item => ({
          gasto_id: insertedGasto.id,
          descripcion: item.descripcion,
          cantidad: item.cantidad || 1,
          precio_unitario: item.precio_unitario || 0,
          subtotal: (item.cantidad || 1) * (item.precio_unitario || 0)
        }));

        await supabaseAdmin.from("gastos_detalle").insert(detailRows);
      }

      // Responder con éxito
      const responseMsg = `✅ **¡Gasto Registrado con Éxito en LabOS!**\n\n` +
                          `• **Concepto**: ${parsedData.concepto}\n` +
                          `• **Categoría**: ${parsedData.tipo_producto}\n` +
                          `• **Proveedor**: ${parsedData.proveedor}\n` +
                          `• **Monto**: $${Number(parsedData.monto).toFixed(2)}\n` +
                          `• **Fecha**: ${parsedData.fecha}\n\n` +
                          `Los datos y la imagen ya se encuentran listados en el panel financiero del laboratorio.`;
      await sendWhatsAppMessage(from, responseMsg);

    } catch (err) {
      console.error("Error en flujo de OCR de gasto:", err);
      await sendWhatsAppMessage(from, "❌ Ocurrió un error leyendo el comprobante o guardando los datos. Por favor revísalo de manera manual en LabOS.");
    }
  } else {
    // Respuesta administrativa conversacional básica para empleados
    const msgText = message.text?.body || "";
    const systemPrompt = `Eres la IA asistente interna de Laboratorio Dental Legion (LabOS).
Hablas con un empleado de administración llamado ${user.username}. Puedes ayudarle con consultas breves. Sé conciso e informal.`;
    
    const reply = await queryGeminiChat(systemPrompt, msgText);
    await sendWhatsAppMessage(from, reply);
  }
}

/**
 * Flujo Externo (Clientes/Doctores): Consulta de estatus de casos
 */
async function handleExternalFlow(message, from, client) {
  const msgText = message.text?.body || "";

  // 1. Verificar si pregunta por un caso (e.g. buscando palabras clave o nombres)
  // Hacemos una búsqueda simple de casos en Supabase vinculados a este cliente
  const { data: casos } = await supabaseAdmin
    .from("casos_master")
    .select("codigo, paciente, estado, depto_actual, fecha_entrega")
    .eq("cliente_id", client.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const systemPrompt = `Eres la IA asistente virtual de la Legión (Laboratorio Dental Legion).
Te estás comunicando con el cliente/doctor: ${client.responsable || client.nombre}.
Tienes acceso a sus últimos casos registrados: ${JSON.stringify(casos || [])}.
Si te pregunta por el estado de un paciente o caso específico, busca en esa lista y dale una respuesta clara y directa.
Si te pide atención especializada o no tienes la respuesta, indícale amablemente que transferirás la conversación con un miembro humano del equipo.
Aclara siempre que eres una inteligencia artificial y tus respuestas pueden contener errores. Mantén un tono sumamente educado y servicial.`;

  const reply = await queryGeminiChat(systemPrompt, msgText);
  await sendWhatsAppMessage(from, reply);
}

/**
 * Flujo Desconocidos: Guía y recopilación de datos
 */
async function handleUnknownFlow(message, from) {
  const msgText = message.text?.body || "";

  const systemPrompt = `Eres la IA asistente virtual de bienvenida de la Legión (Laboratorio Dental Legion).
Te está escribiendo un número telefónico que no se encuentra en nuestra base de datos (${from}).
Debes:
1. Presentarte amablemente como la Inteligencia Artificial del Laboratorio.
2. Aclarar que eres un asistente virtual y que puedes cometer errores.
3. Preguntarle educadamente su nombre completo y si es doctor o asistente de alguna clínica dental en particular.
4. Explicarle que para consultar estatus de casos o registrar abonos primero debemos dar de alta su número en nuestro sistema LabOS.
5. Si requiere hablar con un humano, indícale que de inmediato un administrador revisará este chat.
Mantén un tono sumamente profesional, atento y servicial.`;

  const reply = await queryGeminiChat(systemPrompt, msgText);
  await sendWhatsAppMessage(from, reply);
}
