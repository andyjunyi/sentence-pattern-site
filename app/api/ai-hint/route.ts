import { NextRequest, NextResponse } from 'next/server'
import { getAIHint } from '@/lib/anthropic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, question, pattern, userAnswers, blanks } = body

    if (!question || !pattern || !userAnswers || !blanks) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const hint = await getAIHint({ type, question, pattern, userAnswers, blanks })
    return NextResponse.json({ hint })
  } catch (error) {
    console.error('AI hint error:', error)
    return NextResponse.json(
      { hint: '請再試一次，注意句型中 for 和 of 的用法差異。' },
      { status: 500 }
    )
  }
}
