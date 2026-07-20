const FDI_TO_ADA = {
  '18':'1', '17':'2', '16':'3', '15':'4', '14':'5', '13':'6', '12':'7', '11':'8',
  '21':'9', '22':'10', '23':'11', '24':'12', '25':'13', '26':'14', '27':'15', '28':'16',
  '38':'17', '37':'18', '36':'19', '35':'20', '34':'21', '33':'22', '32':'23', '31':'24',
  '41':'25', '42':'26', '43':'27', '44':'28', '45':'29', '46':'30', '47':'31', '48':'32'
};

/**
 * Convierte un string de piezas dentales FDI a notación ADA si corresponde.
 * Soporta rangos (ej: "14-16"), numerales (ej: "#14"), listas separadas por comas con o sin espacios.
 * @param {string} piezasFDI - Lista de piezas (ej. "11, 26")
 * @param {string} notacionDestino - "FDI" o "ADA"
 */
export function convertirNotacion(piezasFDI, notacionDestino) {
  if (!piezasFDI) return '';
  if (notacionDestino !== 'ADA') return piezasFDI;
  
  return piezasFDI.replace(/\b(11|12|13|14|15|16|17|18|21|22|23|24|25|26|27|28|31|32|33|34|35|36|37|38|41|42|43|44|45|46|47|48)\b/g, (match) => {
    return FDI_TO_ADA[match] || match;
  });
}
