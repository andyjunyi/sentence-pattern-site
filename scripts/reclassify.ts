/**
 * scripts/reclassify.ts
 * Run: npx tsx scripts/reclassify.ts
 *
 * Updates the `chapter` field in every data/patterns/[code].json
 * according to the new 8-chapter architecture.
 */

import { readdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

// ── New chapter mapping (code → new chapter number) ───────────────
const CHAPTER_MAP: Record<string, number> = {
  // Chapter 1：虛主詞與強調句型
  '1-1': 1, '1-2': 1, '1-3': 1, '1-4': 1, '1-5': 1,
  '1-6': 1, '1-7': 1, '1-8': 1, '4-21': 1, '6-21': 1,

  // Chapter 2：條件句與假設語氣
  '2-15': 2, '3-9': 2, '3-10': 2, '3-11': 2, '3-20': 2,
  '4-18': 2, '7-9': 2,

  // Chapter 3：比較句型
  '1-10': 3, '2-6': 3, '2-7': 3, '2-8': 3, '2-9': 3,
  '2-13': 3, '2-14': 3, '2-16': 3, '2-17': 3,
  '4-16': 3, '4-17': 3, '7-8': 3, '7-14': 3,

  // Chapter 4：關係子句與名詞子句
  '2-18': 4,
  '3-1': 4, '3-2': 4, '3-3': 4, '3-4': 4, '3-5': 4,
  '3-6': 4, '3-19': 4,
  '4-1': 4, '4-2': 4, '4-3': 4, '4-4': 4, '4-5': 4,
  '4-6': 4, '4-7': 4, '4-8': 4, '4-9': 4, '4-10': 4,
  '4-11': 4, '4-12': 4, '4-13': 4, '4-14': 4, '4-15': 4,
  '4-19': 4, '4-20': 4, '4-22': 4, '4-23': 4, '4-24': 4, '4-25': 4,

  // Chapter 5：動詞進階用法
  '2-1': 5, '2-2': 5, '2-3': 5, '2-4': 5, '2-5': 5,
  '2-19': 5, '2-20': 5,
  '5-1': 5, '5-2': 5, '5-3': 5, '5-4': 5, '5-5': 5,
  '5-6': 5, '5-7': 5, '5-8': 5, '5-9': 5, '5-10': 5,
  '5-11': 5, '5-12': 5, '5-13': 5, '5-14': 5, '5-15': 5,
  '5-16': 5, '5-17': 5, '5-18': 5, '5-19': 5, '5-20': 5,
  '5-21': 5, '5-22': 5, '5-23': 5, '5-24': 5, '5-25': 5,

  // Chapter 6：不定詞與動名詞
  '6-1': 6, '6-2': 6, '6-3': 6, '6-4': 6, '6-5': 6,
  '6-6': 6, '6-7': 6, '6-12': 6, '6-13': 6, '6-14': 6,
  '6-15': 6, '6-16': 6, '6-17': 6, '6-18': 6, '6-20': 6,
  '6-22': 6, '6-23': 6,

  // Chapter 7：分詞與分詞構句
  '3-12': 7, '3-13': 7, '3-14': 7,
  '6-8': 7, '6-9': 7, '6-10': 7, '6-11': 7,
  '6-19': 7, '6-24': 7, '6-25': 7,

  // Chapter 8：連接詞與副詞子句
  '1-9': 8, '2-10': 8, '2-11': 8, '2-12': 8,
  '3-7': 8, '3-8': 8, '3-15': 8, '3-16': 8, '3-17': 8, '3-18': 8,
  '7-1': 8, '7-2': 8, '7-3': 8, '7-4': 8, '7-5': 8,
  '7-6': 8, '7-7': 8, '7-10': 8, '7-11': 8, '7-12': 8,
  '7-13': 8, '7-15': 8, '7-16': 8, '7-17': 8, '7-18': 8,
  '7-19': 8, '7-20': 8, '7-21': 8, '7-22': 8, '7-23': 8,
  '7-24': 8, '7-25': 8,
}

// ── Run ───────────────────────────────────────────────────────────
const dir = join(process.cwd(), 'data', 'patterns')
const files = readdirSync(dir).filter(f => f.endsWith('.json'))

const counts: Record<number, number> = {}
let updated = 0
let skipped = 0
const unmapped: string[] = []

for (const file of files) {
  const path = join(dir, file)
  const raw = JSON.parse(readFileSync(path, 'utf-8')) as Record<string, unknown>
  const code = raw.code as string

  if (!CHAPTER_MAP[code]) {
    console.warn(`⚠️  No mapping for code: ${code}`)
    unmapped.push(code)
    continue
  }

  const newChapter = CHAPTER_MAP[code]
  if (raw.chapter === newChapter) {
    skipped++
    continue
  }

  raw.chapter = newChapter
  writeFileSync(path, JSON.stringify(raw, null, 2), 'utf-8')
  counts[newChapter] = (counts[newChapter] ?? 0) + 1
  updated++
}

console.log(`\n✅ Updated: ${updated}  ⏭ Already correct: ${skipped}`)
if (unmapped.length) console.log(`⚠️  Unmapped: ${unmapped.join(', ')}`)

console.log('\nNew chapter distribution:')
for (let ch = 1; ch <= 8; ch++) {
  const total = Object.entries(CHAPTER_MAP).filter(([, v]) => v === ch).length
  console.log(`  Chapter ${ch}: ${total} patterns`)
}
console.log('\n✨ Done')
