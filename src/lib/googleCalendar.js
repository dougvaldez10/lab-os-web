import { google } from 'googleapis';

/**
 * Obtiene el cliente autenticado de Google Calendar API utilizando una Service Account
 * con Domain-Wide Delegation para impersonar a servicio@legiondentallab.com.
 */
function getGoogleAuthClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const subject = process.env.GOOGLE_SUBJECT_EMAIL || 'servicio@legiondentallab.com';

  if (!email || !privateKey) {
    console.warn("Google Calendar integration disabled: missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY");
    return null;
  }

  // Corregir escapes de salto de línea y comillas que Vercel o el .env pudieran introducir
  let formattedKey = privateKey.replace(/\\n/g, '\n');
  if (formattedKey.startsWith('"') && formattedKey.endsWith('"')) {
    formattedKey = formattedKey.slice(1, -1);
  }
  if (formattedKey.startsWith("'") && formattedKey.endsWith("'")) {
    formattedKey = formattedKey.slice(1, -1);
  }

  // Log de diagnóstico seguro
  console.log(`[Google Calendar] Auth setup: Email=${email}, Subject=${subject}, KeyLen=${formattedKey.length}, startsWithPEMHeader=${formattedKey.startsWith('-----BEGIN PRIVATE KEY-----')}`);

  return new google.auth.JWT(
    email,
    null,
    formattedKey,
    ['https://www.googleapis.com/auth/calendar'],
    subject
  );
}

/**
 * Retorna la fecha del día siguiente en formato YYYY-MM-DD
 * necesario para la fecha de fin exclusiva en eventos de todo el día.
 */
function getNextDayString(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  date.setDate(date.getDate() + 1);
  return date.toISOString().split('T')[0];
}

/**
 * Crea un evento en el Google Calendar principal de la cuenta impersonada.
 * Título: "[Folio] Paciente — Doctor"
 */
export async function createCalendarEvent(caso, detalles = []) {
  const auth = getGoogleAuthClient();
  if (!auth) return null;

  if (!caso.fecha_entrega) {
    console.log(`[Google Calendar] Caso ${caso.codigo || caso.id} no tiene fecha_entrega. Omitiendo creación de evento.`);
    return null;
  }

  try {
    // Forzar la obtención del token de acceso (genera error detallado si las credenciales fallan)
    console.log(`[Google Calendar] Solicitando token de acceso...`);
    const tokenResponse = await auth.getAccessToken();
    if (!tokenResponse || !tokenResponse.token) {
      throw new Error("No se pudo obtener un token de acceso válido de Google.");
    }
    console.log(`[Google Calendar] Token de acceso obtenido con éxito.`);

    const calendar = google.calendar({ version: 'v3' });

    // Construir descripción con materiales y comentarios
    let description = '';
    if (detalles && detalles.length > 0) {
      description += 'Materiales/Productos:\n';
      detalles.forEach(d => {
        description += `- ${d.producto} (${d.unidades} ${d.unidades === 1 ? 'unidad' : 'unidades'})\n`;
      });
    } else {
      description += 'Sin productos registrados.\n';
    }

    if (caso.comentarios) {
      description += `\nComentarios:\n${caso.comentarios}\n`;
    }

    const summary = `[${caso.codigo || caso.id}] ${caso.paciente} — ${caso.doctor || 'Sin Doctor'}`;

    let start, end;
    if (caso.hora_entrega && caso.hora_entrega.trim()) {
      // Evento con hora definida
      const startDateTime = `${caso.fecha_entrega}T${caso.hora_entrega.trim()}:00`;
      const startDate = new Date(startDateTime);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hora de duración por defecto

      start = {
        dateTime: startDateTime,
        timeZone: 'America/Tijuana',
      };

      if (isNaN(startDate.getTime())) {
        start = { date: caso.fecha_entrega };
        end = { date: getNextDayString(caso.fecha_entrega) };
      } else {
        end = {
          dateTime: endDate.toISOString().split('.')[0].slice(0, 16) + ':00',
          timeZone: 'America/Tijuana',
        };
      }
    } else {
      // Evento de todo el día
      start = { date: caso.fecha_entrega };
      end = { date: getNextDayString(caso.fecha_entrega) };
    }

    const event = {
      summary,
      description,
      start,
      end,
      colorId: '1', // Color azul predeterminado
    };

    const response = await calendar.events.insert({
      auth, // Pasar auth de forma explícita en la llamada
      calendarId: 'primary',
      requestBody: event,
    });

    console.log(`[Google Calendar] Evento creado para caso ${caso.codigo || caso.id}: ${response.data.id}`);
    return response.data.id;
  } catch (error) {
    console.error(`[Google Calendar] Error al crear evento para caso ${caso.codigo || caso.id}:`, error);
    return null;
  }
}

/**
 * Actualiza un evento existente en Google Calendar.
 */
export async function updateCalendarEvent(googleEventId, caso, detalles = []) {
  if (!googleEventId) return null;

  const auth = getGoogleAuthClient();
  if (!auth) return null;

  // Si el caso ya no tiene fecha de entrega, eliminamos el evento
  if (!caso.fecha_entrega) {
    console.log(`[Google Calendar] Caso ${caso.codigo || caso.id} ya no tiene fecha_entrega. Eliminando evento de Google Calendar.`);
    await deleteCalendarEvent(googleEventId);
    return null;
  }

  try {
    console.log(`[Google Calendar] Solicitando token de acceso para actualizar...`);
    await auth.getAccessToken();

    const calendar = google.calendar({ version: 'v3' });

    let description = '';
    if (detalles && detalles.length > 0) {
      description += 'Materiales/Productos:\n';
      detalles.forEach(d => {
        description += `- ${d.producto} (${d.unidades} ${d.unidades === 1 ? 'unidad' : 'unidades'})\n`;
      });
    } else {
      description += 'Sin productos registrados.\n';
    }

    if (caso.comentarios) {
      description += `\nComentarios:\n${caso.comentarios}\n`;
    }

    const summary = `[${caso.codigo || caso.id}] ${caso.paciente} — ${caso.doctor || 'Sin Doctor'}`;

    let start, end;
    if (caso.hora_entrega && caso.hora_entrega.trim()) {
      const startDateTime = `${caso.fecha_entrega}T${caso.hora_entrega.trim()}:00`;
      const startDate = new Date(startDateTime);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

      start = {
        dateTime: startDateTime,
        timeZone: 'America/Tijuana',
      };

      if (isNaN(startDate.getTime())) {
        start = { date: caso.fecha_entrega };
        end = { date: getNextDayString(caso.fecha_entrega) };
      } else {
        end = {
          dateTime: endDate.toISOString().split('.')[0].slice(0, 16) + ':00',
          timeZone: 'America/Tijuana',
        };
      }
    } else {
      start = { date: caso.fecha_entrega };
      end = { date: getNextDayString(caso.fecha_entrega) };
    }

    const event = {
      summary,
      description,
      start,
      end,
    };

    const response = await calendar.events.patch({
      auth, // Pasar auth de forma explícita en la llamada
      calendarId: 'primary',
      eventId: googleEventId,
      requestBody: event,
    });

    console.log(`[Google Calendar] Evento actualizado para caso ${caso.codigo || caso.id}: ${response.data.id}`);
    return response.data.id;
  } catch (error) {
    if (error.code === 404 || error.message?.includes('Not Found')) {
      console.warn(`[Google Calendar] El evento con ID ${googleEventId} no existe. Recreándolo...`);
      return await createCalendarEvent(caso, detalles);
    }
    console.error(`[Google Calendar] Error al actualizar evento ${googleEventId}:`, error);
    return googleEventId;
  }
}

/**
 * Elimina un evento de Google Calendar.
 */
export async function deleteCalendarEvent(googleEventId) {
  if (!googleEventId) return false;

  const auth = getGoogleAuthClient();
  if (!auth) return false;

  try {
    console.log(`[Google Calendar] Solicitando token de acceso para eliminar...`);
    await auth.getAccessToken();

    const calendar = google.calendar({ version: 'v3' });
    await calendar.events.delete({
      auth, // Pasar auth de forma explícita en la llamada
      calendarId: 'primary',
      eventId: googleEventId,
    });
    console.log(`[Google Calendar] Evento de Google Calendar ${googleEventId} eliminado.`);
    return true;
  } catch (error) {
    if (error.code === 404 || error.message?.includes('Not Found')) {
      console.log(`[Google Calendar] Evento ${googleEventId} no encontrado al intentar eliminarlo (quizá ya fue eliminado).`);
      return true;
    }
    console.error(`[Google Calendar] Error al eliminar evento ${googleEventId}:`, error);
    return false;
  }
}
