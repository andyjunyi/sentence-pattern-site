/**
 * scripts/renumber.ts
 * Run: npx tsx scripts/renumber.ts
 *
 * Renames all data/patterns/[code].json files to follow new sequential
 * numbering within each chapter, and updates the `code` field inside each file.
 */

import { readdirSync, readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs'
import { join } from 'path'

// ── Old code → New code mapping ────────────────────────────────────
// Order within each chapter follows teaching progression (basic → advanced)
const RENAME_MAP: [string, string][] = [
  // ── Chapter 1: 虛主詞與強調句型 ──
  ['1-3',  '1-1'],   // There is/are (存在句)
  ['1-1',  '1-2'],   // It is + adj. + for/of sb. + to V
  ['1-2',  '1-3'],   // It takes + 時間/金錢
  ['1-4',  '1-4'],   // It seems/appears
  ['1-5',  '1-5'],   // It is said/reported/believed
  ['4-21', '1-6'],   // It + V + that（虛主詞名詞子句）
  ['6-21', '1-7'],   // It is no use/good + V-ing
  ['1-6',  '1-8'],   // It is not until...that（強調時間）
  ['1-8',  '1-9'],   // What + S + V + is（強調名詞子句）
  ['1-7',  '1-10'],  // It is...that/who（強調分裂句）

  // ── Chapter 2: 條件句與假設語氣 ──
  ['3-9',  '2-1'],   // 真實條件句 if/unless
  ['7-9',  '2-2'],   // if/unless/as long as 條件連接詞比較
  ['2-15', '2-3'],   // would rather + V + than
  ['3-10', '2-4'],   // 假設語氣（與現在相反）
  ['3-11', '2-5'],   // 假設語氣（與過去相反）
  ['4-18', '2-6'],   // as if/as though（假設方式）
  ['3-20', '2-7'],   // It is time + S + V-ed

  // ── Chapter 3: 比較句型 ──
  ['2-13', '3-1'],   // as...as（同等比較）
  ['2-14', '3-2'],   // 比較級 + than
  ['2-16', '3-3'],   // prefer...to（偏好比較）
  ['2-17', '3-4'],   // as...as possible
  ['2-6',  '3-5'],   // too...to
  ['2-7',  '3-6'],   // enough...to
  ['2-8',  '3-7'],   // so...that
  ['2-9',  '3-8'],   // such...that
  ['4-16', '3-9'],   // so...that（結果子句）
  ['4-17', '3-10'],  // such...that（結果子句）
  ['7-8',  '3-11'],  // so.../such...that（兩者比較）
  ['1-10', '3-12'],  // The 比較級, the 比較級（v1）
  ['7-14', '3-13'],  // The 比較級, the 比較級（v2）

  // ── Chapter 4: 關係子句與名詞子句 ──
  ['4-1',  '4-1'],   // who/that 限定關係子句
  ['4-2',  '4-2'],   // which/that 限定關係子句
  ['3-3',  '4-3'],   // who/which/that 限定（綜合）
  ['4-4',  '4-4'],   // whose
  ['3-4',  '4-5'],   // whose（綜合）
  ['4-5',  '4-6'],   // whom 受格
  ['4-6',  '4-7'],   // 受格關係代名詞省略
  ['4-23', '4-8'],   // 介系詞 + which/whom
  ['4-7',  '4-9'],   // 關係副詞 where/when/why
  ['3-5',  '4-10'],  // 關係副詞（綜合）
  ['4-3',  '4-11'],  // 非限定, who/which
  ['3-6',  '4-12'],  // 非限定（綜合）
  ['4-24', '4-13'],  // which 指涉整個子句
  ['4-25', '4-14'],  // as 引導關係子句
  ['3-1',  '4-15'],  // that 名詞子句（主詞/受詞）
  ['4-9',  '4-16'],  // that 名詞子句作受詞
  ['4-8',  '4-17'],  // what 名詞子句作主詞
  ['4-10', '4-18'],  // whether/if 名詞子句
  ['4-11', '4-19'],  // 間接問句
  ['4-12', '4-20'],  // wh- + to V
  ['3-2',  '4-21'],  // 疑問詞 + to V（不定詞名詞片語）
  ['4-15', '4-22'],  // the fact that（同位語子句）
  ['4-20', '4-23'],  // N + that（同位語子句）
  ['4-13', '4-24'],  // whoever/whatever/whichever
  ['4-14', '4-25'],  // wherever/whenever/however
  ['4-19', '4-26'],  // no matter wh-
  ['3-19', '4-27'],  // no matter/-ever（綜合）
  ['2-18', '4-28'],  // 虛受詞 find it + adj. + to V
  ['4-22', '4-29'],  // 虛受詞 find/think/make it

  // ── Chapter 5: 動詞進階用法 ──
  ['2-1',  '5-1'],   // 連綴動詞 + SC
  ['2-3',  '5-2'],   // 授與動詞 IO + DO
  ['2-2',  '5-3'],   // 受詞補語 OC
  ['5-15', '5-4'],   // name/call/elect + O + N
  ['5-14', '5-5'],   // find/consider + O + adj.
  ['5-1',  '5-6'],   // 現在被動
  ['5-2',  '5-7'],   // 過去被動
  ['5-3',  '5-8'],   // 未來被動
  ['5-4',  '5-9'],   // 現在完成被動
  ['5-5',  '5-10'],  // 進行被動
  ['5-6',  '5-11'],  // 被動 + 不定詞
  ['5-7',  '5-12'],  // get 被動
  ['2-4',  '5-13'],  // 使役動詞 make/let/have
  ['5-9',  '5-14'],  // make/let/have（詳細）
  ['5-10', '5-15'],  // get/cause 使役
  ['2-19', '5-16'],  // have/get + O + p.p.（綜合）
  ['5-8',  '5-17'],  // have + O + p.p.（詳細）
  ['2-5',  '5-18'],  // 感官動詞（綜合）
  ['5-11', '5-19'],  // 感官動詞（詳細）
  ['5-12', '5-20'],  // help + O + (to) V
  ['5-13', '5-21'],  // keep/leave + O + V-ing
  ['5-16', '5-22'],  // used to + V
  ['5-17', '5-23'],  // be used to + V-ing
  ['2-20', '5-24'],  // used to / be used to（綜合）
  ['5-18', '5-25'],  // had better / ought to
  ['5-19', '5-26'],  // must / have to
  ['5-23', '5-27'],  // need not
  ['5-24', '5-28'],  // dare
  ['5-25', '5-29'],  // be supposed to
  ['5-20', '5-30'],  // should have p.p.
  ['5-21', '5-31'],  // must have p.p.
  ['5-22', '5-32'],  // cannot have p.p.

  // ── Chapter 6: 不定詞與動名詞 ──
  ['6-1',  '6-1'],   // 不定詞作受詞
  ['6-2',  '6-2'],   // 動名詞作受詞
  ['6-4',  '6-3'],   // 不定詞/動名詞作主詞
  ['6-5',  '6-4'],   // 受詞 + 不定詞
  ['6-3',  '6-5'],   // 不定詞 vs 動名詞（兩者皆可）
  ['6-18', '6-6'],   // stop/remember/forget（意思不同）
  ['6-17', '6-7'],   // wh- + to V
  ['6-7',  '6-8'],   // in order to / so as to
  ['6-6',  '6-9'],   // too...to / enough...to
  ['6-16', '6-10'],  // adj. + enough + to V
  ['6-12', '6-11'],  // spend + V-ing
  ['6-13', '6-12'],  // be worth + V-ing
  ['6-14', '6-13'],  // cannot help + V-ing
  ['6-15', '6-14'],  // look forward to + V-ing
  ['6-22', '6-15'],  // accustomed/dedicated + to + V-ing
  ['6-23', '6-16'],  // object to / be opposed to + V-ing
  ['6-20', '6-17'],  // 現在進行式表未來

  // ── Chapter 7: 分詞與分詞構句 ──
  ['6-19', '7-1'],   // V-ing/p.p. 作形容詞
  ['6-24', '7-2'],   // There + be + N + V-ing/p.p.
  ['6-25', '7-3'],   // S + V + N + p.p.（受詞補語）
  ['6-8',  '7-4'],   // 分詞構句主動 V-ing
  ['3-12', '7-5'],   // 分詞構句主動（綜合）
  ['6-9',  '7-6'],   // 分詞構句被動 p.p.
  ['3-13', '7-7'],   // 分詞構句被動（綜合）
  ['6-10', '7-8'],   // 完成分詞構句 Having + p.p.
  ['6-11', '7-9'],   // with + O + V-ing/p.p.
  ['3-14', '7-10'],  // with 獨立分詞構句（綜合）

  // ── Chapter 8: 連接詞與副詞子句 ──
  ['3-7',  '8-1'],   // because/since/as 原因
  ['7-1',  '8-2'],   // because/since/as（詳細）
  ['3-8',  '8-3'],   // although/even though 讓步
  ['7-2',  '8-4'],   // although/though/even though（詳細）
  ['7-3',  '8-5'],   // while/whereas 對比
  ['3-16', '8-6'],   // when/while/as 時間
  ['7-4',  '8-7'],   // when/while/as（詳細）
  ['3-17', '8-8'],   // before/after/until
  ['7-5',  '8-9'],   // before/after/until/since（詳細）
  ['3-18', '8-10'],  // as soon as
  ['7-6',  '8-11'],  // as soon as/the moment/once
  ['3-15', '8-12'],  // so that 目的
  ['7-7',  '8-13'],  // so that/in order that（詳細）
  ['7-13', '8-14'],  // as 方式子句
  ['2-12', '8-15'],  // both...and / not...but
  ['7-11', '8-16'],  // both/either/neither（詳細）
  ['1-9',  '8-17'],  // Not only...but (also)...
  ['2-10', '8-18'],  // not only...but also（倒裝）
  ['7-10', '8-19'],  // not only...but also（連接詞組）
  ['2-11', '8-20'],  // either...or / neither...nor
  ['7-12', '8-21'],  // however/therefore 連接副詞
  ['7-24', '8-22'],  // as well as / in addition to
  ['7-25', '8-23'],  // rather than
  ['7-15', '8-24'],  // whether...or not
  ['7-16', '8-25'],  // now that
  ['7-17', '8-26'],  // in that
  ['7-18', '8-27'],  // except that/for
  ['7-19', '8-28'],  // No sooner...than（倒裝）
  ['7-20', '8-29'],  // Hardly/Scarcely...when（倒裝）
  ['7-21', '8-30'],  // Not until（倒裝）
  ['7-22', '8-31'],  // Only（倒裝）
  ['7-23', '8-32'],  // Seldom/Never（倒裝）
]

// ── Main ───────────────────────────────────────────────────────────
const dir = join(process.cwd(), 'data', 'patterns')

// Step 1: Read all JSON data into memory (keyed by current code)
console.log('📖 Reading all patterns into memory...')
const dataStore = new Map<string, Record<string, unknown>>()
const files = readdirSync(dir).filter(f => f.endsWith('.json'))

for (const file of files) {
  const raw = JSON.parse(readFileSync(join(dir, file), 'utf-8')) as Record<string, unknown>
  const code = raw.code as string
  dataStore.set(code, raw)
}

console.log(`   Loaded ${dataStore.size} patterns\n`)

// Validate all old codes exist
const missing = RENAME_MAP.filter(([old]) => !dataStore.has(old)).map(([old]) => old)
if (missing.length) {
  console.error(`❌ Missing codes in data: ${missing.join(', ')}`)
  process.exit(1)
}

// Step 2: Write all new files (with updated code field)
console.log('✏️  Writing new files...')
const newCodes = new Set<string>()
for (const [oldCode, newCode] of RENAME_MAP) {
  const data = { ...dataStore.get(oldCode)!, code: newCode }
  writeFileSync(join(dir, `${newCode}.json`), JSON.stringify(data, null, 2), 'utf-8')
  newCodes.add(newCode)
}

// Step 3: Delete old files that are no longer needed
console.log('🗑️  Removing obsolete files...')
let deleted = 0
for (const file of files) {
  const oldCode = file.replace('.json', '')
  if (!newCodes.has(oldCode)) {
    unlinkSync(join(dir, file))
    deleted++
  }
}

// Step 4: Print mapping table
console.log('\n─────────────────────────────────────────────────────────')
console.log('舊編號 → 新編號  標題')
console.log('─────────────────────────────────────────────────────────')
for (const [oldCode, newCode] of RENAME_MAP) {
  const data = dataStore.get(oldCode)!
  const changed = oldCode !== newCode ? '  ←更名' : ''
  console.log(`${oldCode.padEnd(6)} → ${newCode.padEnd(6)}  ${data.title}${changed}`)
}

console.log('─────────────────────────────────────────────────────────')
console.log(`\n✅ ${RENAME_MAP.length} 個句型重新編號完成`)
console.log(`🗑️  刪除舊檔案：${deleted} 個`)

// Verify final file count
const finalFiles = readdirSync(dir).filter(f => f.endsWith('.json'))
console.log(`📁 最終檔案數：${finalFiles.length} 個\n✨ Done`)
