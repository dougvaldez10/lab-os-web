const fs = require('fs');
let text = fs.readFileSync('c:/Users/legio/Documents/LabOS/src/app/page.js', 'utf8');
const lines = text.split('\n');
const idx = lines.findIndex(l => l.includes('const filteredCases = cases.filter(') || l.includes('cases.filter('));
if (idx !== -1) {
  console.log(lines.slice(idx - 5, idx + 15).join('\n'));
} else {
  console.log('filter not found');
}
