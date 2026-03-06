/**
 * scripts/fix-vocab-tables.ts
 * Run: npx tsx scripts/fix-vocab-tables.ts
 *
 * Fixes mismatched vocab table field names and titles across all pattern JSON files.
 * Patterns with genuine adjectives keep adj_table_for / adj_table_of.
 * All other patterns get their content moved to vocab_table + vocab_table_label.
 */

import { readdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

// ── Patterns whose adj_table_for contains genuine adjectives ───────
const KEEP_ADJ_FOR = new Set([
  '1-2',  // important, necessary (adj + for sb. to V)
  '1-4',  // likely, obvious (adj after It seems)
  '3-1',  // expensive, difficult (adj for as...as)
  '3-2',  // tall, short (adj for 比較級+than)
  '3-5',  // difficult, easy (adj for too...to)
  '3-6',  // wide, strong (adj for enough...to)
  '3-7',  // interesting, beautiful (adj for so...that)
  '3-8',  // difficult, useful (adj for such...that)
  '3-9',  // exciting, difficult (adj for so...that 結果子句)
  '3-10', // interesting, beautiful (adj for such...that 結果子句)
  '3-11', // interesting, difficult (combined so/such)
  '4-8',  // interested, concerned (adj for prep. + which/whom)
  '4-14', // remarkable, significant (adj for as 引導)
  '4-15', // important, necessary (adj for that 名詞子句)
  '4-17', // surprising, important (adj for what 名詞子句)
  '4-28', // difficult, important (adj for 虛受詞 find it + adj.)
  '4-29', // difficult, easy (adj for 虛受詞 find/think/make it)
  '5-1',  // happy, tired (adj after 連綴動詞)
  '5-5',  // interesting, difficult (adj for find/consider + O + adj.)
  '5-21', // open, closed (adj for keep/leave + O + adj.)
  '6-3',  // necessary, important (adj as predicate / with It is)
  '6-9',  // difficult, easy (adj for too...to / enough...to)
  '6-10', // old, young (adj for adj. + enough + to V)
  '8-5',  // similar, different (adj for while/whereas 對比)
  '8-17', // entertaining, affordable (adj for Not only...but)
  '8-19', // talented, intelligent (adj for not only...but also)
  '8-26', // unique, different (adj for in that)
  '8-27', // successful, complete (adj for except that/for)
])

// ── Patterns whose adj_table_of contains genuine adjectives ────────
const KEEP_ADJ_OF = new Set([
  '1-2',  // kind, nice (adj + of sb. to V)
  // 5-2 adj_of has preposition usage patterns, not adjectives — remove it
])

// ── New vocab_table_label for every pattern being migrated ─────────
const VOCAB_LABELS: Record<string, string> = {
  '1-1':  '常用位置介系詞',
  '1-3':  '常用時間表達',
  '1-5':  '常用被動動詞',
  '1-6':  '常用被動動詞',
  '1-7':  '常用片語',
  '1-8':  '核心詞彙',
  '1-9':  '核心句型結構',
  '1-10': '常用強調結構',
  '2-1':  '常用動詞片語',
  '2-2':  '常用條件連接詞',
  '2-3':  '常用動詞片語',
  '2-4':  '假設語氣關鍵詞',
  '2-5':  '假設語氣關鍵詞',
  '2-6':  '常用連接詞',
  '2-7':  '常用時間片語',
  '3-3':  '常用動名詞',
  '3-4':  '常用副詞',
  '3-12': '常用比較級',
  '3-13': '常用形容詞／副詞',
  '4-1':  '常用動詞',
  '4-2':  '常用動詞',
  '4-3':  '關係代名詞',
  '4-4':  '常用名詞',
  '4-5':  '常用形容詞',
  '4-6':  '常用動詞',
  '4-7':  '常用過去分詞',
  '4-9':  '常用形容詞',
  '4-10': '關係副詞',
  '4-11': '核心詞彙',
  '4-12': '核心詞彙',
  '4-13': '常用動詞',
  '4-16': '常用動詞',
  '4-18': '常用動詞',
  '4-19': '常用動詞',
  '4-20': '常用動詞',
  '4-21': '常用動詞',
  '4-22': '常用同位語名詞',
  '4-23': '常用同位語名詞',
  '4-24': '核心詞彙',
  '4-25': '常用副詞連接詞',
  '4-26': '常用 no matter 片語',
  '4-27': '常用形容詞／副詞',
  '5-2':  '常用授與動詞',
  '5-3':  '常用動詞',
  '5-4':  '常用動詞',
  '5-6':  '常用被動動詞',
  '5-7':  '常用過去分詞',
  '5-8':  '常用未來被動句型',
  '5-9':  '常用動詞',
  '5-10': '常用進行被動片語',
  '5-11': '常用動詞',
  '5-12': '常用 get 被動片語',
  '5-13': '常用使役動詞',
  '5-14': '常用使役動詞',
  '5-15': '常用動詞',
  '5-16': '常用過去分詞',
  '5-17': '常用過去分詞',
  '5-18': '常用感官動詞',
  '5-19': '常用感官動詞',
  '5-20': '常用動詞',
  '5-22': '常用時間表達',
  '5-23': '常用形容詞',
  '5-24': '常用動詞',
  '5-25': '常用動詞',
  '5-26': '常用形容詞',
  '5-27': '常用動詞',
  '5-28': 'dare 的常見用法',
  '5-29': '常用副詞片語',
  '5-30': '常用動詞',
  '5-31': '常用情態動詞推測',
  '5-32': '核心詞彙',
  '6-1':  '常用動詞',
  '6-2':  '常用動詞',
  '6-4':  '常用動詞',
  '6-5':  '常用動詞',
  '6-6':  '常用動詞',
  '6-7':  '常用疑問詞',
  '6-8':  '常用動詞',
  '6-11': '常用時間與數量表達',
  '6-12': '常用 V-ing',
  '6-13': '常用動名詞',
  '6-14': '表期待的形容詞',
  '6-15': '常用 to + V-ing 片語',
  '6-16': '常用反對片語',
  '6-17': '常用動詞',
  '7-1':  '常用分詞形容詞',
  '7-2':  '常用分詞',
  '7-3':  '常用動詞',
  '7-4':  '常用 V-ing 形式',
  '7-5':  '常用分詞構句形式',
  '7-6':  '常用過去分詞',
  '7-7':  '常用過去分詞',
  '7-8':  '常用動詞',
  '7-9':  '常用 with 獨立結構',
  '7-10': '常用分詞',
  '8-1':  '核心詞彙',
  '8-2':  '常用原因連接詞',
  '8-3':  '常用讓步連接詞',
  '8-4':  '常用讓步連接詞',
  '8-6':  '常用時間連接詞',
  '8-7':  '常用動詞',
  '8-8':  '常用時間連接詞',
  '8-9':  '常用時間連接詞',
  '8-10': '常用即時連接詞',
  '8-11': '常用動詞',
  '8-12': '常用動詞片語',
  '8-13': '常用動詞',
  '8-14': '常用副詞',
  '8-15': '常用連接詞組',
  '8-16': '常用連接詞組',
  '8-18': '核心詞彙',
  '8-20': '常用連接詞',
  '8-21': '常用連接副詞',
  '8-22': '常用附加連接詞',
  '8-23': '常用動詞',
  '8-24': '核心詞彙',
  '8-25': '常用動詞',
  '8-28': '常用動詞',
  '8-29': '常用動詞',
  '8-30': '常用過去分詞',
  '8-31': '常用時間副詞',
  '8-32': '常用頻率副詞',
}

// ── Main ───────────────────────────────────────────────────────────
const dir = join(process.cwd(), 'data', 'patterns')
const files = readdirSync(dir).filter(f => f.endsWith('.json'))

let updated = 0
let skipped = 0

for (const file of files) {
  const filePath = join(dir, file)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: Record<string, any> = JSON.parse(readFileSync(filePath, 'utf-8'))
  const code = raw.code as string
  let changed = false

  const adjFor = raw.adj_table_for ?? []
  const adjOf  = raw.adj_table_of  ?? []

  // ── Handle adj_table_for ──────────────────────────────────────────
  if (!KEEP_ADJ_FOR.has(code) && adjFor.length > 0) {
    const label = VOCAB_LABELS[code] ?? '核心詞彙'
    raw.vocab_table       = adjFor
    raw.vocab_table_label = label
    raw.adj_table_for     = []
    changed = true
    console.log(`  ${code}: adj_table_for → vocab_table ("${label}")`)
  }

  // ── Handle adj_table_of ───────────────────────────────────────────
  if (!KEEP_ADJ_OF.has(code) && adjOf.length > 0) {
    // For 5-2, the adj_of content (preposition patterns) is moved to vocab_table
    // only if vocab_table isn't already set from adj_for migration above
    if (!raw.vocab_table || raw.vocab_table.length === 0) {
      raw.vocab_table       = adjOf
      raw.vocab_table_label = VOCAB_LABELS[code] ?? '核心詞彙'
    }
    raw.adj_table_of = []
    changed = true
    console.log(`  ${code}: adj_table_of cleared (non-adjective content)`)
  }

  if (changed) {
    writeFileSync(filePath, JSON.stringify(raw, null, 2), 'utf-8')
    updated++
  } else {
    skipped++
  }
}

console.log(`\n✅ Updated: ${updated}  ⏭ Unchanged: ${skipped}`)

// ── Summary of kept adj tables ─────────────────────────────────────
console.log('\nPatterns with genuine adj_table_for kept:')
console.log([...KEEP_ADJ_FOR].join(', '))
console.log('\nPatterns with genuine adj_table_of kept:')
console.log([...KEEP_ADJ_OF].join(', '))
console.log('\n✨ Done')
