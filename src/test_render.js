const fs = require('fs');
let text = fs.readFileSync('c:/Users/legio/Documents/LabOS/src/app/page.js', 'utf8');
const lines = text.split('\n');
const idx = lines.findIndex(l => l.includes('className="grid'));
if (idx !== -1) {
  console.log(lines.slice(idx, idx + 40).join('\n'));
} else {
  console.log('grid not found');
}
