/**
 * scripts/generate-translation.ts
 * Generate 4 Chinese-to-English translation exercises per pattern using Claude API.
 * Run: export $(grep -v '^#' .env.local | xargs) && npx tsx scripts/generate-translation.ts
 */

import Anthropic from '@anthropic-ai/sdk'
import { readFileSync, writeFileSync, readdirSync } from 'fs'
import path from 'path'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const PATTERNS_DIR = path.join(process.cwd(), 'data', 'patterns')

interface TranslationExercise {
  id: number
  sentence_chi: string
  answer: string
  key_points: string[]
  hints: string[]
}

function getFormula(data: Record<string, unknown>): string {
  if (Array.isArray(data.formulas)) {
    return (data.formulas as { formula: string }[]).map(f => f.formula).join(' / ')
  }
  return [data.formula_for, data.formula_of].filter(Boolean).join(' / ')
}

function getExplanation(data: Record<string, unknown>): string {
  if (typeof data.explanation === 'string') return data.explanation.slice(0, 300)
  if (data.explanation && typeof data.explanation === 'object') {
    return Object.values(data.explanation as Record<string, string>).join('；').slice(0, 300)
  }
  return ''
}

async function generate(
  code: string,
  title: string,
  formula: string,
  explanation: string,
): Promise<TranslationExercise[]> {
  const prompt = `你是台灣高中英文教材設計師，正在為學測句型「${title}」（公式：${formula}）設計中翻英練習。
句型說明：${explanation}

請設計 4 題中翻英練習，難度由易到難。
直接輸出 JSON 陣列（不加 markdown），格式：
[
  {
    "id": 1,
    "sentence_chi": "（中文句子，符合高中生活情境，句子不宜過長）",
    "answer": "（標準英文答案，必須使用句型「${title}」）",
    "key_points": ["關鍵詞或結構1", "關鍵詞或結構2", "關鍵詞或結構3"],
    "hints": ["提示1：句型結構說明", "提示2：注意事項或常見錯誤"]
  }
]

出題原則：
- 中文貼近高中生日常（學校、家庭、社會議題）
- 英文答案一定要使用本章句型（不能用其他句型替代）
- key_points 3-4 個，標記批改重點（具體詞彙或結構）
- hints 2 條：第1條說明句型框架，第2條提醒易錯點`

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1800,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) throw new Error(`No JSON array in response for ${code}`)
  return JSON.parse(match[0]) as TranslationExercise[]
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY not set. Run: export $(grep -v "^#" .env.local | xargs) && npx tsx scripts/generate-translation.ts')
    process.exit(1)
  }

  const files = readdirSync(PATTERNS_DIR).filter(f => f.endsWith('.json')).sort()
  let generated = 0, skipped = 0, failed = 0

  for (const file of files) {
    const filePath = path.join(PATTERNS_DIR, file)
    const data = JSON.parse(readFileSync(filePath, 'utf8')) as Record<string, unknown>

    if (Array.isArray(data.translation_exercises) && (data.translation_exercises as unknown[]).length >= 4) {
      skipped++
      continue
    }

    const code = data.code as string
    const title = data.title as string
    const formula = getFormula(data)
    const explanation = getExplanation(data)

    let success = false
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        process.stdout.write(`Generating ${code} (${title})... `)
        const exercises = await generate(code, title, formula, explanation)
        data.translation_exercises = exercises
        writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n')
        console.log(`✓ (${exercises.length} exercises)`)
        generated++
        success = true
        break
      } catch (e) {
        if (attempt === 1) {
          console.error(`FAILED: ${(e as Error).message}`)
          failed++
        } else {
          console.log('retrying...')
          await new Promise(r => setTimeout(r, 1200))
        }
      }
    }
    if (success) await new Promise(r => setTimeout(r, 600))
  }

  console.log(`\nDone: ${generated} generated, ${skipped} skipped, ${failed} failed`)
}

main().catch(console.error)
