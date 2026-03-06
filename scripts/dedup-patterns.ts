/**
 * scripts/dedup-patterns.ts
 * Merge duplicate patterns and renumber chapters.
 * Run: npx tsx scripts/dedup-patterns.ts
 */
import { readFileSync, writeFileSync, unlinkSync, readdirSync } from 'fs'
import path from 'path'

const DIR = path.join(process.cwd(), 'data', 'patterns')

function read(code: string) {
  return JSON.parse(readFileSync(path.join(DIR, code + '.json'), 'utf8'))
}
function write(code: string, data: object) {
  writeFileSync(path.join(DIR, code + '.json'), JSON.stringify(data, null, 2) + '\n')
}
function del(code: string) {
  unlinkSync(path.join(DIR, code + '.json'))
}

// Re-ID exercises so IDs stay sequential after merge
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function reId(arr: any[]) {
  return arr.map((ex, i) => ({ ...ex, id: i + 1 }))
}

// Merge secondary into primary: append exercises (up to maxPer each type)
function merge(keepCode: string, dropCode: string, maxPer = 6) {
  const keep = read(keepCode)
  const drop = read(dropCode)

  const fields = ['exercises', 'mc_exercises', 'translation_exercises'] as const
  for (const f of fields) {
    const kArr = Array.isArray(keep[f]) ? keep[f] : []
    const dArr = Array.isArray(drop[f]) ? drop[f] : []
    const needed = Math.max(0, maxPer - kArr.length)
    const merged = [...kArr, ...dArr.slice(0, needed)]
    keep[f] = reId(merged)
  }

  // Use whichever explanation is longer
  if (
    typeof drop.explanation === 'string' &&
    typeof keep.explanation === 'string' &&
    drop.explanation.length > keep.explanation.length
  ) {
    keep.explanation = drop.explanation
  }

  write(keepCode, keep)
  del(dropCode)
  console.log(`  merged ${dropCode} → ${keepCode} (deleted ${dropCode})`)
}

// Renumber a chapter: pass an ordered list of [oldCode, newCode]
function renumber(pairs: [string, string][]) {
  // Read all into memory first
  const inMem: Record<string, object> = {}
  for (const [old] of pairs) {
    const d = read(old)
    inMem[old] = d
  }
  // Write new files with updated code field
  for (const [old, neu] of pairs) {
    if (old === neu) continue
    const d = inMem[old] as Record<string, unknown>
    d.code = neu
    write(neu, d)
    del(old)
    console.log(`  renamed ${old} → ${neu}`)
  }
}

// ── Step 1: Merge duplicates ───────────────────────────────────────
console.log('\n=== Merging duplicates ===')
merge('3-12', '3-13')   // keep 3-12
merge('7-4',  '7-5')    // keep 7-4
merge('7-9',  '7-10')   // keep 7-9
merge('8-1',  '8-2')    // keep 8-1
merge('8-6',  '8-7')    // keep 8-6
merge('8-12', '8-13')   // keep 8-12
merge('8-16', '8-20')   // keep 8-16
merge('8-17', '8-18')   // keep 8-17
merge('8-17', '8-19')   // keep 8-17

// ── Step 2: Renumber chapters ─────────────────────────────────────
console.log('\n=== Renumbering chapters ===')

// Chapter 3: deleted 3-13 (was last) → no renaming needed
// But verify
const ch3files = readdirSync(DIR).filter(f => f.match(/^3-\d+\.json$/)).sort((a,b) => {
  const na = parseInt(a.match(/\d+/)![0]), nb = parseInt(b.match(/\d+/)![0])
  return na - nb
})
console.log('  Chapter 3 files: ' + ch3files.map(f => f.replace('.json','')).join(', '))

// Chapter 7: deleted 7-5 and 7-10
// Before: 7-1,7-2,7-3,7-4,[gap],7-6,7-7,7-8,7-9
// After:  7-1,7-2,7-3,7-4,7-5, 7-6,7-7,7-8
const ch7sequence = ['7-1','7-2','7-3','7-4','7-6','7-7','7-8','7-9']
const ch7new      = ch7sequence.map((_, i) => '7-' + (i + 1))
renumber(ch7sequence.map((old, i) => [old, ch7new[i]]))

// Chapter 8: deleted 8-2, 8-7, 8-13, 8-18, 8-19, 8-20
// Remaining after deletes:
const ch8remaining = [
  '8-1',          // gap 8-2
  '8-3','8-4','8-5','8-6',  // gap 8-7
  '8-8','8-9','8-10','8-11','8-12',  // gap 8-13
  '8-14','8-15','8-16','8-17',       // gap 8-18, 8-19, 8-20
  '8-21','8-22','8-23','8-24','8-25','8-26','8-27','8-28','8-29','8-30','8-31','8-32',
]
const ch8new = ch8remaining.map((_, i) => '8-' + (i + 1))
renumber(ch8remaining.map((old, i) => [old, ch8new[i]]))

// ── Step 3: Verify ─────────────────────────────────────────────────
console.log('\n=== Final counts per chapter ===')
for (let ch = 1; ch <= 8; ch++) {
  const files = readdirSync(DIR).filter(f => f.match(new RegExp('^' + ch + '-\\d+\\.json$')))
  console.log('  Chapter ' + ch + ': ' + files.length + ' patterns')
}

const total = readdirSync(DIR).filter(f => f.endsWith('.json')).length
console.log('\nTotal patterns: ' + total + ' (was 150, removed 9 duplicates)')
