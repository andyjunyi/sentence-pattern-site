import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { checkRateLimit } from '@/lib/ratelimit'

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('[ai-grade] ANTHROPIC_API_KEY is not set')
}

export interface GradeResult {
  score: number
  feedback: string
  keyPointsResults: { point: string; correct: boolean; comment: string }[]
}

export async function POST(request: NextRequest) {
  // Rate limit
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: '請求太頻繁，請稍後再試' }, { status: 429 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: '伺服器設定錯誤' }, { status: 500 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '無效的請求格式' }, { status: 400 })
  }

  const { studentAnswer, correctAnswer, keyPoints, sentenceChi, pattern } = body as {
    studentAnswer?: string
    correctAnswer?: string
    keyPoints?: unknown
    sentenceChi?: string
    pattern?: string
  }

  if (
    !studentAnswer || !correctAnswer || !Array.isArray(keyPoints) ||
    !sentenceChi || !pattern
  ) {
    return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
  }

  if (
    String(studentAnswer).length > 600 ||
    String(correctAnswer).length > 600 ||
    String(sentenceChi).length > 200
  ) {
    return NextResponse.json({ error: '請求內容過長' }, { status: 400 })
  }

  const systemPrompt = `你是一位親切的高中英文老師，正在批改學生的中翻英作業。
句型主題：「${pattern}」

【評分配分】
- 句型結構正確：50 分（最重要）
- 關鍵字正確（key_points 每項平均分配）：30 分
- 文法正確：10 分
- 表達自然流暢：10 分

【拼字錯誤扣分】（寬鬆處理）
- 非關鍵字的拼字錯誤：每個扣 2 分，最多扣 5 分
- 關鍵字的拼字錯誤：每個扣 5 分
- 大小寫錯誤：每個扣 1 分，最多扣 2 分
- 標點符號錯誤：不扣分

【寬鬆認定原則】
- 同義詞視為正確（如 hard = difficult、big = large）
- 合理的句型變體視為正確（如語序略有調整但語意相同）
- 僅有一個小拼字錯誤、其他完全正確 → 給 93–97 分
- 整體語意正確但有一兩處小文法錯誤 → 給 80–89 分
- 句型用對但有多處錯誤 → 給 70–79 分
- 句型完全錯誤 → 給 0–49 分

請以 JSON 格式回傳批改結果（不加 markdown）：
{
  "score": <0-100的整數>,
  "feedback": "<2-3句整體評語，繁體中文，以鼓勵為主，指出優點再說改進>",
  "keyPointsResults": [
    {"point": "<關鍵點>", "correct": <true/false>, "comment": "<簡短說明，15字以內>"}
  ]
}`

  const userPrompt = `中文題目：「${sentenceChi}」
參考答案：「${correctAnswer}」
學生作答：「${studentAnswer}」
評分重點：${(keyPoints as string[]).join('、')}`

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON in response')

    const result = JSON.parse(match[0]) as GradeResult
    // Clamp score
    result.score = Math.max(0, Math.min(100, Math.round(result.score)))
    return NextResponse.json(result)
  } catch (error) {
    console.error('[ai-grade] error:', error)
    return NextResponse.json({ error: '批改失敗，請稍後再試' }, { status: 500 })
  }
}
