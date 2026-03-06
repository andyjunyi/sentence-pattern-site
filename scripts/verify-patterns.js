const fs = require('fs');
const dir = 'data/patterns';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
let ok = 0, mismatch = [], exErr = 0, exOk = 0;
for (const f of files) {
  const d = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8'));
  const expected = f.replace('.json', '');
  if (d.code == expected) ok++;
  else mismatch.push(f + ' has code=' + d.code);
  for (const ex of (d.exercises || [])) {
    if (!Array.isArray(ex.parts) || !Array.isArray(ex.blanks)) { exErr++; continue; }
    const nulls = ex.parts.filter(function(p){ return p === null; }).length;
    if (nulls == ex.blanks.length) exOk++;
    else exErr++;
  }
}
console.log('Files: ' + ok + ' OK, ' + mismatch.length + ' mismatches');
mismatch.forEach(function(m){ console.log('  ' + m); });
console.log('Exercises: ' + exOk + ' OK, ' + exErr + ' errors');
