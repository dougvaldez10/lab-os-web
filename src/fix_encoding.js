const fs = require('fs');
const path = require('path');

const replacements = {
  'Ã¡': 'á',
  'Ã©': 'é',
  'Ã­': 'í',
  'Ã³': 'ó',
  'Ãº': 'ú',
  'Ã±': 'ñ',
  'Ã‘': 'Ñ',
  'Â¿': '¿',
  'Â¡': '¡',
  'Ã¢â‚¬â€': '—',
  'Ã¢â‚¬Å“': '\"',
  'Ã¢â‚¬Â': '\"',
  'Ã¢â€ â‚¬': '─'
};

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      if (dirPath.endsWith('.js')) {
        callback(dirPath);
      }
    }
  });
}

let fixedFiles = [];
walkDir('c:/Users/legio/Documents/LabOS/src/app', (filepath) => {
  let original = fs.readFileSync(filepath, 'utf8');
  let text = original;
  for (const [bad, good] of Object.entries(replacements)) {
    text = text.split(bad).join(good);
  }
  if (text !== original) {
    fs.writeFileSync(filepath, text, 'utf8');
    fixedFiles.push(filepath);
  }
});

console.log('Fixed encoding in:', fixedFiles);
