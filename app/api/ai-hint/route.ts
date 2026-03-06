import { NextRequest, NextResponse } from 'next/server'
import { getAIHint } from '@/lib/anthropic'
import { checkRateLimit } from '@/lib/ratelimit'

// ── Environment check (fail fast at cold-start) ──────────────────
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('[ai-hint] ANTHROPIC_API_KEY is not set')
}

export async function POST(request: NextRequest) {
  // ── 1. Rate limiting ────────────────────────────────────────────
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: '請求太頻繁，請稍後再試' },
      { status: 429 },
    )
  }

  // ── 2. Env guard ────────────────────────────────────────────────
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: '伺服器設定錯誤，請聯絡管理員' },
      { status: 500 },
    )
  }

  // ── 3. Parse & validate body ────────────────────────────────────
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '無效的請求格式' }, { status: 400 })
  }

  const { type, question, pattern, userAnswers, blanks, explanation } = body as {
    type?: string
    question?: string
    pattern?: string
    userAnswers?: unknown
    blanks?: unknown
    explanation?: string
  }

  if (!type || !question || !pattern || !Array.isArray(userAnswers) || !Array.isArray(blanks)) {
    return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
  }

  // Sanity-cap input lengths to prevent abuse
  if (
    String(question).length > 500 ||
    String(pattern).length > 200
  ) {
    return NextResponse.json({ error: '請求內容過長' }, { status: 400 })
  }

  // ── 4. Call AI ──────────────────────────────────────────────────
  try {
    const hint = await getAIHint({
      type,
      question: String(question),
      pattern: String(pattern),
      userAnswers: (userAnswers as unknown[]).map(String),
      blanks: (blanks as unknown[]).map(String),
      explanation: explanation ? String(explanation) : undefined,
    })
    return NextResponse.json({ hint })
  } catch (error) {
    console.error('[ai-hint] API error:', error)
    return NextResponse.json(
      { hint: '請再試一次，注意句型結構。' },
      { status: 500 },
    )
  }
}
