const fs = require('fs');
const dir = 'data/patterns';

function read(code) { return JSON.parse(fs.readFileSync(dir + '/' + code + '.json', 'utf8')); }
function write(code, data) { fs.writeFileSync(dir + '/' + code + '.json', JSON.stringify(data, null, 2) + '\n'); }
function del(code) { fs.unlinkSync(dir + '/' + code + '.json'); }
function reId(arr) { return arr.map(function(ex, i) { return Object.assign({}, ex, { id: i + 1 }); }); }

// ── Step 1: Merge 5-14 unique content into 5-13 ──
var keep = read('5-13');
var drop = read('5-14');

// Append 2 unique exercises from 5-14 (different sentences)
keep.exercises = reId(keep.exercises.concat(drop.exercises.slice(0, 2)));
keep.mc_exercises = reId(keep.mc_exercises.concat(drop.mc_exercises.slice(1, 3))); // skip mc[0] (similar theme)
keep.translation_exercises = reId(keep.translation_exercises.concat(drop.translation_exercises.slice(1, 3)));

// Use 5-14's better extension note + tip
keep.extension.note = drop.extension.note;
keep.extension.tip = keep.extension.tip + '\n\n' + drop.extension.tip;

// Merge the extra explanation detail from 5-14 about let/have passive
keep.explanation = keep.explanation + ' let 和 have 的被動式仍保持原形動詞，只有 make 被動需改為 be made to V。';

write('5-13', keep);
console.log('Merged 5-14 into 5-13:');
console.log('  exercises:', keep.exercises.length);
console.log('  mc_exercises:', keep.mc_exercises.length);
console.log('  translation_exercises:', keep.translation_exercises.length);

// ── Step 2: Delete 5-14 ──
del('5-14');
console.log('Deleted 5-14.json');

// ── Step 3: Renumber 5-15 .. 5-32 → 5-14 .. 5-31 ──
// Find all ch5 files beyond 5-14
var ch5files = fs.readdirSync(dir)
  .filter(function(f) { return f.match(/^5-\d+\.json$/); })
  .map(function(f) { return parseInt(f.replace('5-','').replace('.json','')); })
  .sort(function(a,b){ return a-b; });

// Read all into memory first
var mem = {};
ch5files.forEach(function(n) {
  mem[n] = JSON.parse(fs.readFileSync(dir + '/5-' + n + '.json', 'utf8'));
});

// Renumber: anything with number > 14 shifts down by 1
ch5files.forEach(function(n) {
  if (n > 14) {
    var newN = n - 1;
    var data = mem[n];
    data.code = '5-' + newN;
    fs.writeFileSync(dir + '/5-' + newN + '.json', JSON.stringify(data, null, 2) + '\n');
    fs.unlinkSync(dir + '/5-' + n + '.json');
    console.log('  renamed 5-' + n + ' -> 5-' + newN);
  }
});

// ── Step 4: Verify ──
var finalFiles = fs.readdirSync(dir)
  .filter(function(f) { return f.match(/^5-\d+\.json$/); })
  .length;
console.log('\nChapter 5 final count:', finalFiles, 'patterns');

var total = fs.readdirSync(dir).filter(function(f) { return f.endsWith('.json'); }).length;
console.log('Total patterns:', total);
