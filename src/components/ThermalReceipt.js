export function printThermalReceipt({ caso, abono }) {
  if (!caso) return;

  const width = "80mm";
  const fontSize = "11px";

  const printWindow = window.open('', '_blank', `width=400,height=600`);
  if (!printWindow) {
    alert("Por favor permite las ventanas emergentes para imprimir.");
    return;
  }

  const FDI_TO_ADA = {
    '18':'1', '17':'2', '16':'3', '15':'4', '14':'5', '13':'6', '12':'7', '11':'8',
    '21':'9', '22':'10', '23':'11', '24':'12', '25':'13', '26':'14', '27':'15', '28':'16',
    '38':'17', '37':'18', '36':'19', '35':'20', '34':'21', '33':'22', '32':'23', '31':'24',
    '41':'25', '42':'26', '43':'27', '44':'28', '45':'29', '46':'30', '47':'31', '48':'32'
  };
  const notacion = caso.clientes?.notacion_dental || 'FDI';

  const detallesHTML = (caso.casos_detalle || []).map(d => {
    let dientes = d.dientes || '';
    if (dientes && notacion === 'ADA') {
      dientes = String(dientes).replace(/\b(11|12|13|14|15|16|17|18|21|22|23|24|25|26|27|28|31|32|33|34|35|36|37|38|41|42|43|44|45|46|47|48)\b/g, m => FDI_TO_ADA[m] || m);
    }
    return `
      <tr>
        <td style="text-align: left;">${d.unidades}x ${d.producto}</td>
        <td style="text-align: right;">$${Number(d.subtotal).toFixed(2)}</td>
      </tr>
      ${dientes ? `<tr><td colspan="2" style="font-size: 9px; padding-bottom: 4px;">Dientes: ${dientes}</td></tr>` : ''}
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Recibo - Caso ${caso.codigo}</title>
        <style>
          @media print {
            @page {
              size: 80mm auto;
              margin: 0mm;
            }
            body, html {
              margin: 0 !important;
              padding: 0 !important;
              width: 80mm !important;
              font-family: monospace;
              font-size: ${fontSize};
              color: #000;
              background-color: white;
            }
            .receipt-container {
              width: 79.4mm !important;
              margin: 0 auto !important;
              padding: 4mm 0.3mm !important;
              box-sizing: border-box !important;
            }
          }
          
          /* Estilos generales para cuando se ve en la mini ventana antes de imprimir */
          body {
            font-family: monospace;
            font-size: ${fontSize};
            line-height: 1.2;
            color: #000;
            margin: 0;
            padding: 0;
            background: #fff;
          }
          .receipt-container {
            width: 80mm;
            padding: 5mm;
            box-sizing: border-box;
          }
          .header {
            text-align: center;
            margin-bottom: 10px;
          }
          .header h2 {
            margin: 0 0 5px 0;
            font-size: 14px;
          }
          .info {
            margin-bottom: 10px;
            border-bottom: 1px dashed #000;
            padding-bottom: 5px;
          }
          .info div {
            margin-bottom: 3px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
          }
          table th {
            text-align: left;
            border-bottom: 1px dashed #000;
            padding-bottom: 3px;
          }
          table td {
            padding: 2px 0;
          }
          .totals {
            border-top: 1px dashed #000;
            padding-top: 5px;
            margin-bottom: 15px;
          }
          .totals div {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
          }
          .totals .bold {
            font-weight: bold;
          }
          .footer {
            text-align: center;
            font-size: 10px;
            margin-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="header">
          <h2>LEGION DENTAL LAB</h2>
          <div>Folio: ${caso.codigo || caso.id}</div>
          <div>Fecha: ${new Date().toLocaleDateString()}</div>
        </div>

        <div class="info">
          <div><strong>Clínica:</strong> ${caso.clientes?.nombre || 'N/A'}</div>
          <div><strong>Doctor:</strong> ${caso.doctor || 'N/A'}</div>
          <div><strong>Paciente:</strong> ${caso.paciente || 'N/A'}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Cant/Prod</th>
              <th style="text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${detallesHTML}
          </tbody>
        </table>

        <div class="totals">
          ${Number(caso.descuento) > 0 ? `
            <div>
              <span>Subtotal:</span>
              <span>$${(Number(caso.total_caso) + Number(caso.descuento)).toFixed(2)}</span>
            </div>
            <div>
              <span>Descuento:</span>
              <span>-$${Number(caso.descuento).toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="bold">
            <span>Total Caso:</span>
            <span>$${Number(caso.total_caso).toFixed(2)}</span>
          </div>
          <div>
            <span>Abonos Recibidos:</span>
            <span>$${Number(abono || 0).toFixed(2)}</span>
          </div>
          <div class="bold" style="margin-top: 5px; font-size: 13px;">
            <span>Saldo Pendiente:</span>
            <span>$${Number(caso.saldo_pendiente).toFixed(2)}</span>
          </div>
        </div>

        <div class="footer">
          <div>Gracias por su preferencia</div>
        </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 250);
          }
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
