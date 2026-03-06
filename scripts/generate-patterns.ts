/**
 * scripts/generate-patterns.ts
 * Run: npx tsx scripts/generate-patterns.ts
 *
 * Generates data/patterns/1-2.json … 1-10.json via Anthropic API.
 */

import Anthropic from '@anthropic-ai/sdk'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'

// ── Load .env.local ───────────────────────────────────────────────
function loadEnv() {
  const p = join(process.cwd(), '.env.local')
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf-8').split('\n')) {
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const k = line.slice(0, eq).trim()
    const v = line.slice(eq + 1).trim()
    if (k && !process.env[k]) process.env[k] = v
  }
}
loadEnv()

// ── Pattern list ──────────────────────────────────────────────────
const PATTERNS = [
  {
    code: '1-2', chapter: 1,
    title: 'It takes + 時間/金錢 + (for sb.) + to V',
    formula: 'It takes + 時間/金錢 + (for sb.) + to V',
    description: '表達做某事需要花費多少時間或金錢，It 為虛主詞',
  },
  {
    code: '1-3', chapter: 1,
    title: 'There is/are + N + (地點/時間)',
    formula: 'There is/are + N + 地點副詞',
    description: '表達某地有某物存在，注意 be 動詞需與最近的名詞一致',
  },
  {
    code: '1-4', chapter: 1,
    title: 'It seems/appears (that) + S + V',
    formula: 'It seems/appears (that) + 子句',
    description: '表達「看起來、似乎」，用於描述外表觀察或推測',
  },
  {
    code: '1-5', chapter: 1,
    title: 'It is said/reported/believed (that) + S + V',
    formula: 'It is said/reported/believed (that) + 子句',
    description: '被動語態的虛主詞句型，表達「據說、據報導、據信」',
  },
  {
    code: '1-6', chapter: 1,
    title: 'It is not until... that + S + V',
    formula: 'It is not until + 時間/事件 + that + S + V',
    description: '強調句型，表達「直到……才……」，強調動作發生的時間點',
  },
  {
    code: '1-7', chapter: 1,
    title: 'It is... that/who + 強調部分（強調句）',
    formula: 'It is/was + 強調部分 + that/who + 剩餘句子',
    description: '分裂句強調句型，用來強調句子中的某個成分',
  },
  {
    code: '1-8', chapter: 1,
    title: 'What + S + V + is/was + (that) 子句／名詞',
    formula: 'What + S + V + is + 名詞子句／名詞',
    description: '名詞子句作主詞，用 What 引導，強調重要資訊',
  },
  {
    code: '1-9', chapter: 1,
    title: 'Not only... but (also)...',
    formula: 'Not only + A + but (also) + B',
    description: '連接詞句型，表達「不只……而且……」，注意倒裝與動詞一致性',
  },
  {
    code: '1-10', chapter: 1,
    title: 'The + 比較級..., the + 比較級...',
    formula: 'The + 比較級 + S + V, the + 比較級 + S + V',
    description: '平行比較句型，表達「越……就越……」',
  },
] as const

// ── Prompt builder ────────────────────────────────────────────────
function buildPrompt(code: string, formula: string, description: string): string {
  return `你是台灣高中英文教材編輯，請為以下句型生成完整的學習資料。

句型代碼：${code}
句型：${formula}
說明：${description}

請嚴格按照以下 JSON 結構回應，只回傳純 JSON，不要 markdown 包裹，不要任何說明文字：

{
  "formulas": [
    { "formula": "完整句型公式（可有1-2個變體）", "zh": "中文意思說明" }
  ],
  "explanation": "繁體中文用法說明（100-150字，含結構說明、使用時機、注意事項）",
  "examples": [
    {
      "id": 1,
      "eng": "英文例句（符合學測程度，15-25字）",
      "chi": "繁體中文翻譯",
      "keywords": ["句型核心關鍵字1", "關鍵字2"]
    }
  ],
  "adj_table_for": [
    { "adj": "詞彙或片語", "zh": "中文意思" }
  ],
  "adj_table_of": [],
  "extension": {
    "tip": "使用判斷技巧說明（繁體中文，50-80字）",
    "examples": [
      { "test": "判斷範例或對照句", "result": "→ 結論與正確用法" }
    ],
    "note": "口訣或記憶技巧（繁體中文，一句話）"
  },
  "exercises": [
    {
      "id": 1,
      "parts": ["句子前段 ", null, " 句子後段"],
      "blanks": ["正確填空答案"],
      "sentence": "完整英文例句",
      "translation": "繁體中文翻譯",
      "keywords": ["關鍵字1", "關鍵字2"]
    }
  ]
}

生成要求：
1. formulas：列出此句型的核心公式（1-2個變體）
2. explanation：100-150字，說明結構、使用時機、易混淆點
3. examples：恰好 4 句，符合學測程度，實用且多樣
4. adj_table_for：列出與此句型搭配的核心詞彙 12 個（形容詞、時間詞、動詞等視句型而定）；若此句型不涉及 for，仍列出相關核心詞彙
5. adj_table_of：若句型涉及 of 的對比用法列出 12 個；否則回傳空陣列 []
6. extension.examples：2-3個對照範例，說明正確vs錯誤或不同情境
7. exercises：恰好 4 題填空，parts 中 null 對應 blanks 中的答案，每題至少一個填空`
}

// ── Generate one pattern ──────────────────────────────────────────
async function generate(
  client: Anthropic,
  pattern: typeof PATTERNS[number]
): Promise<Record<string, unknown>> {
  const msg = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: buildPrompt(pattern.code, pattern.formula, pattern.description) }],
  })

  const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''

  // Strip possible markdown fences
  const cleaned = raw
    .replace(/^```json\s*/m, '')
    .replace(/^```\s*/m, '')
    .replace(/```\s*$/m, '')
    .trim()

  // Extract first {...} block
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error(`No JSON object found in response`)

  const data = JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>

  return {
    code: pattern.code,
    chapter: pattern.chapter,
    title: pattern.title,
    ...data,
  }
}

// ── Main ──────────────────────────────────────────────────────────
async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not found in .env.local')
    process.exit(1)
  }

  const client = new Anthropic({ apiKey })
  const outDir = join(process.cwd(), 'data', 'patterns')

  for (const pattern of PATTERNS) {
    const outPath = join(outDir, `${pattern.code}.json`)

    if (existsSync(outPath)) {
      console.log(`⏭  ${pattern.code} — already exists, skipping`)
      continue
    }

    process.stdout.write(`🔄 Generating ${pattern.code} (${pattern.title}) … `)

    try {
      const data = await generate(client, pattern)
      writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf-8')
      console.log('✅')
    } catch (err) {
      console.log('❌')
      console.error(`   Error: ${err instanceof Error ? err.message : String(err)}`)
    }

    // Brief pause between requests
    await new Promise(r => setTimeout(r, 800))
  }

  console.log('\n✨ Done')
}

main().catch(err => { console.error(err); process.exit(1) })
