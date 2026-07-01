const fs = require('fs');

let content = fs.readFileSync('src/app/page.js', 'utf8');

// 1. Remove StackedCases component
const stackedCasesRegex = /\/\/\s*ΓöÇ+[\s\S]*?function StackedCases\([\s\S]*?^}$/m;
// Let's use a simpler approach to remove function StackedCases:
let lines = content.split('\n');

let startIndex = -1;
let endIndex = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('function StackedCases({ cases, onRefresh, operatorName }) {')) {
    startIndex = i - 4; // Including the comments above it
  }
  if (startIndex !== -1 && lines[i] === '}' && lines[i-1] && lines[i-1].includes('  );')) {
    // Look for the end of StackedCases
    endIndex = i;
    break;
  }
}
if (startIndex !== -1 && endIndex !== -1) {
  lines.splice(startIndex, endIndex - startIndex + 1);
}

// 2. Remove casosYesosEnProceso
startIndex = -1;
endIndex = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const casosYesosEnProceso = cases.filter(c =>')) {
    startIndex = i - 1; // Include comment
  }
  if (startIndex !== -1 && lines[i].includes("(c.status === 'En Proceso' || c.status === 'En Pausa')")) {
    endIndex = i;
    break;
  }
}
if (startIndex !== -1 && endIndex !== -1) {
  lines.splice(startIndex, endIndex - startIndex + 1);
}

// 3. Remove StackedCases usage
startIndex = -1;
endIndex = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('{casosYesosEnProceso.length > 0 && activeDept !== "all" && (')) {
    startIndex = i;
  }
  if (startIndex !== -1 && lines[i].includes('/>') && lines[i+1] && lines[i+1].includes(')}')) {
    endIndex = i + 1;
    break;
  }
}
if (startIndex !== -1 && endIndex !== -1) {
  lines.splice(startIndex, endIndex - startIndex + 1);
}

// 4. Remove casosApilados
startIndex = -1;
endIndex = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const casosApilados = grupo.id === \'Digital_Escaneo\'')) {
    startIndex = i - 2; // Include comments
  }
  if (startIndex !== -1 && lines[i].includes(': [];')) {
    endIndex = i;
    break;
  }
}
if (startIndex !== -1 && endIndex !== -1) {
  lines.splice(startIndex, endIndex - startIndex + 1);
}

// 5. Update cases empty logic
content = lines.join('\n');
content = content.replace(
  '{casosEnGrupo.length === 0 && casosApilados.length === 0 ? (',
  '{casosEnGrupo.length === 0 ? ('
);

content = content.replace(
  ') : casosEnGrupo.length === 0 ? null : (',
  ') : ('
);

fs.writeFileSync('src/app/page.js', content);
