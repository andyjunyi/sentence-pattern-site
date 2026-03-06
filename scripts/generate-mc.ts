/**
 * scripts/generate-mc.ts
 * Run: npx tsx scripts/generate-mc.ts
 *
 * Generates 4 multiple-choice exercises for every pattern JSON
 * that doesn't already have mc_exercises. Saves to mc_exercises field.
 */

import Anthropic from '@anthropic-ai/sdk'
import { readdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = [
  '你是台灣高中英文教材編輯，專門設計學測等級的英文句型選擇題。',
  '設計選擇題時請遵守：',
  '- 4 個選項（A/B/C/D），只有 1 個正確',
  '- 干擾選項：同詞類、意思相近但用法有誤，混淆常見錯誤',
  '- explanation 用繁體中文說明：正確答案的語法依據 + 各錯誤選項的問題',
  '- 只輸出合法 JSON 陣列，不要任何其他文字',
].join('\n')

interface MCExercise {
  id?: number
  question_chi: string
  question_eng: string
  options: { key: string; text: string }[]
  answer: string
  explanation: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildPrompt(raw: Record<string, any>): string {
  const formula = Array.isArray(raw.formulas) && raw.formulas.length > 0
    ? (raw.formulas as { formula: string }[]).map(f => f.formula).join(' / ')
    : String(raw.formula ?? '')
  const explanation = typeof raw.explanation === 'string'
    ? raw.explanation.slice(0, 200)
    : ''
  const examples = ((raw.examples as Record<string, string>[]) ?? [])
    .slice(0, 2)
    .map(e => e.eng || e.sentence || '')
    .filter(Boolean)
    .join('；')

  const lines = [
    '請為以下英文句型設計 4 道選擇題（難度由易到難）：',
    '',
    '句型代碼：' + raw.code,
    '句型標題：' + raw.title,
    '句型公式：' + formula,
    '說明：' + explanation,
    '例句：' + examples,
    '',
    '輸出格式（合法 JSON 陣列，不含其他文字）：',
    '[',
    '  {',
    '    "question_chi": "（中文說明，說明情境或要求，10-20字）",',
    '    "question_eng": "（完整英文句子，空格用 _______ 標示）",',
    '    "options": [',
    '      {"key": "A", "text": "選項A"},',
    '      {"key": "B", "text": "選項B"},',
    '      {"key": "C", "text": "選項C"},',
    '      {"key": "D", "text": "選項D"}',
    '    ],',
    '    "answer": "（正確選項 key）",',
    '    "explanation": "（繁體中文，說明正確答案原因及各選項對錯，50-100字）"',
    '  }',
    ']',
    '',
    '注意：',
    '- 正確答案平均分布在 A/B/C/D，不要集中在 A',
    '- 題目自然、符合學測程度',
    '- 干擾選項真實合理，不能一眼識破',
    '- 只輸出 JSON，第一個字元必須是 [',
  ]
  return lines.join('\n')
}

async function generateMC(raw: Record<string, unknown>): Promise<MCExercise[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prompt = buildPrompt(raw as Record<string, any>)

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1800,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('No JSON array in response: ' + text.slice(0, 200))

  const items = JSON.parse(match[0]) as MCExercise[]
  return items.slice(0, 4).map((item, i) => ({ ...item, id: i + 1 }))
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

// ── Main ───────────────────────────────────────────────────────────
async function main() {
  const dir = join(process.cwd(), 'data', 'patterns')
  const files = readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .sort((a, b) => {
      const [ac, an] = a.replace('.json', '').split('-').map(Number)
      const [bc, bn] = b.replace('.json', '').split('-').map(Number)
      return ac !== bc ? ac - bc : an - bn
    })

  let success = 0, skipped = 0, failed = 0
  const failedCodes: string[] = []

  for (const file of files) {
    const filePath = join(dir, file)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: Record<string, any> = JSON.parse(readFileSync(filePath, 'utf-8'))

    if (Array.isArray(raw.mc_exercises) && (raw.mc_exercises as unknown[]).length >= 4) {
      process.stdout.write('⏭  ' + raw.code + '\n')
      skipped++
      continue
    }

    process.stdout.write('⏳ Generating ' + raw.code + ' (' + String(raw.title).slice(0, 30) + ')… ')

    let attempts = 0
    let done = false

    while (attempts < 2 && !done) {
      attempts++
      try {
        const mc = await generateMC(raw as Record<string, unknown>)
        raw.mc_exercises = mc
        writeFileSync(filePath, JSON.stringify(raw, null, 2), 'utf-8')
        console.log('✅ (' + mc.length + ' questions)')
        success++
        done = true
      } catch (err) {
        if (attempts < 2) {
          console.log('⚠️  retry…')
          await sleep(1500)
        } else {
          console.log('❌ FAILED: ' + (err as Error).message.slice(0, 60))
          failed++
          failedCodes.push(String(raw.code))
        }
      }
    }

    await sleep(600)
  }

  console.log('\n✅ ' + success + ' generated  ⏭  ' + skipped + ' skipped  ❌ ' + failed + ' failed')
  if (failedCodes.length) console.log('Failed: ' + failedCodes.join(', '))
  console.log('✨ Done')
}

main().catch(console.error)
