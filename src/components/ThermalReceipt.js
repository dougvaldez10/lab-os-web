export function printThermalReceipt({ caso, abono }) {
  if (!caso) return;

  const width = "80mm";
  const fontSize = "11px";

  const printWindow = window.open('', '_blank', `width=400,height=600`);
  if (!printWindow) {
    alert("Por favor permite las ventanas emergentes para imprimir.");
    return;
  }

  const detallesHTML = (caso.casos_detalle || []).map(d => `
    <tr>
      <td style="text-align: left;">${d.unidades}x ${d.producto}</td>
      <td style="text-align: right;">$${Number(d.subtotal).toFixed(2)}</td>
    </tr>
    ${d.dientes ? `<tr><td colspan="2" style="font-size: 9px; padding-bottom: 4px;">Dientes: ${d.dientes}</td></tr>` : ''}
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Recibo - Caso ${caso.codigo}</title>
        <style>
          @media print {
            * {
              color: #000000 !important;
              opacity: 1 !important;
            }
          }
          @page {
            margin: 0;
            size: 80mm auto;
          }
          body {
            margin: 0;
            padding: 5mm;
            width: ${width};
            font-family: monospace;
            font-size: ${fontSize};
            line-height: 1.2;
            color: #000000;
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
            border-bottom: 1px dashed #000000;
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
            border-bottom: 1px dashed #000000;
            padding-bottom: 3px;
          }
          table td {
            padding: 2px 0;
          }
          .totals {
            border-top: 1px dashed #000000;
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
