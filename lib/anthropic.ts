import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface AIHintParams {
  type: 'hint' | 'correct' | string
  question: string
  pattern: string
  userAnswers: string[]
  blanks: string[]
}

export async function getAIHint({
  type,
  question,
  pattern,
  userAnswers,
  blanks,
}: AIHintParams): Promise<string> {
  const systemPrompt = `你是一位親切的英文文法老師，正在教學句型「${pattern}」。
請用繁體中文提供簡短、鼓勵性的回饋，限80字以內。`

  let userPrompt = ''

  if (type === 'correct') {
    userPrompt = `學生正確回答了「${userAnswers.join(', ')}」，題目是：「${question}」
請給予鼓勵並補充一個簡短的文法小提示。`
  } else {
    userPrompt = `學生填入「${userAnswers.join(', ')}」，題目是：「${question}」
正確答案是「${blanks.join(', ')}」
請給予提示，但不要直接說出答案。`
  }

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 150,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const content = message.content[0]
  return content.type === 'text' ? content.text : '請再試一次！'
}
