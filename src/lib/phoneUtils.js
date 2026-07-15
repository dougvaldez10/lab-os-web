/**
 * Utilidades para normalizar y dar formato a números de teléfono
 * adaptados para la API de WhatsApp Business (Meta).
 */

/**
 * Normaliza un número de teléfono para guardarlo en la base de datos.
 * Para México, añade +521 y elimina caracteres no numéricos.
 * Ejemplos de entrada:
 * - "6634366694" -> "+5216634366694"
 * - "+52 663 436 6694" -> "+5216634366694"
 * - "+521 663 436 6694" -> "+5216634366694"
 * - "16195550123" -> "+16195550123" (USA)
 */
export function normalizePhone(phone) {
  if (!phone) return "";
  
  // Eliminar todo lo que no sea dígito
  const cleaned = phone.replace(/\D/g, "");
  
  if (cleaned.length === 0) return "";

  // 1. Caso estándar de 10 dígitos (México sin código de país)
  if (cleaned.length === 10) {
    return `+521${cleaned}`;
  }

  // 2. Caso con código de país de México (52)
  if (cleaned.startsWith("52")) {
    const remainder = cleaned.slice(2);
    // Si ya incluye el '1' (celular de México según Meta: 521...)
    if (remainder.startsWith("1") && remainder.length === 11) {
      return `+52${remainder}`;
    }
    // Si no incluye el '1' (e.g. 526634366694)
    if (remainder.length === 10) {
      return `+521${remainder}`;
    }
  }

  // 3. Caso estándar de USA/Canadá (1 + 10 dígitos)
  if (cleaned.startsWith("1") && cleaned.length === 11) {
    return `+${cleaned}`;
  }

  // 4. Cualquier otro caso, simplemente agregamos el '+' al inicio
  return `+${cleaned}`;
}

/**
 * Formatea un número telefónico para mostrarlo en pantalla.
 * Convierte "+5216634366694" -> "+52 1 (663) 436 6694"
 */
export function formatPhoneDisplay(phone) {
  if (!phone) return "";
  
  const cleaned = phone.replace(/\D/g, "");
  
  if (cleaned.length === 0) return phone;

  // México con 1 (celular WhatsApp): +52 1 (663) 436 6694
  if (cleaned.startsWith("521") && cleaned.length === 13) {
    return `+52 1 (${cleaned.slice(3, 6)}) ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  }

  // México sin 1: +52 (663) 436 6694
  if (cleaned.startsWith("52") && cleaned.length === 12) {
    return `+52 (${cleaned.slice(2, 5)}) ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
  }

  // USA: +1 (619) 555-0123
  if (cleaned.startsWith("1") && cleaned.length === 11) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

  // 10 dígitos solos (asumimos celular nacional México)
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }

  // Si ya tiene el +, lo dejamos como está, si no, lo añadimos
  return phone.startsWith("+") ? phone : `+${phone}`;
}
