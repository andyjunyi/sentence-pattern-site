'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import PrintButton from './PrintButton'

interface Exercise {
  id: number
  sentence: string
  template: string
  parts?: (string | null)[]
  blanks?: string[]
  answer: string
  translation: string
  preposition: string
  keywords?: string[]
}

interface PracticeSectionProps {
  exercises: Exercise[]
  patternTitle: string
}

type BlankStatus = 'idle' | 'correct' | 'wrong'

function blankWidth(answer: string): number {
  return Math.max(50, answer.length * 11 + 20)
}

function resolveParts(ex: Exercise): { parts: (string | null)[]; blanks: string[] } {
  if (ex.parts && ex.blanks) return { parts: ex.parts, blanks: ex.blanks }
  const segments = ex.template.split('___')
  const parts: (string | null)[] = segments.flatMap((s, i) =>
    i < segments.length - 1 ? [s, null] : [s]
  )
  return { parts, blanks: [ex.answer] }
}

export default function PracticeSection({ exercises, patternTitle }: PracticeSectionProps) {
  const [hasStarted, setHasStarted] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userInputs, setUserInputs] = useState<string[]>([])
  const [statuses, setStatuses] = useState<BlankStatus[]>([])
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)
  const [isAllCorrect, setIsAllCorrect] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [shakeKey, setShakeKey] = useState(0)

  const [resultMsg, setResultMsg] = useState('')       // '' = not yet submitted
  const [aiContent, setAiContent] = useState('')       // '' = AI not fetched
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [submittedInputs, setSubmittedInputs] = useState<string[]>([])
  const [submittedBlanks, setSubmittedBlanks] = useState<string[]>([])
  const [submittedCorrect, setSubmittedCorrect] = useState(false)

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const nextBtnRef = useRef<HTMLButtonElement>(null)

  const current = exercises[currentIndex]
  const { parts, blanks } = resolveParts(current)
  const blankCount = blanks.length

  const nullPositions = parts.reduce<number[]>((acc, p, i) => {
    if (p === null) acc.push(i)
    return acc
  }, [])

  // Focus "下一題 →" button as soon as the answer is correct (only after user has started)
  useEffect(() => {
    if (!isAllCorrect || !hasStarted) return
    setTimeout(() => nextBtnRef.current?.focus(), 60)
  }, [isAllCorrect, hasStarted])

  // Reset everything when question changes (only after user has started)
  useEffect(() => {
    if (!hasStarted) return
    setUserInputs(Array(blankCount).fill(''))
    setStatuses(Array(blankCount).fill('idle'))
    setFocusedIndex(null)
    setIsAllCorrect(false)
    setResultMsg('')
    setAiContent('')
    setIsAiLoading(false)
    setSubmittedInputs([])
    setSubmittedBlanks([])
    inputRefs.current = Array(blankCount).fill(null)
    setTimeout(() => inputRefs.current[0]?.focus(), 60)
  }, [currentIndex, blankCount]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleStart() {
    setHasStarted(true)
    setUserInputs(Array(blankCount).fill(''))
    setStatuses(Array(blankCount).fill('idle'))
    inputRefs.current = Array(blankCount).fill(null)
    setTimeout(() => inputRefs.current[0]?.focus(), 60)
  }

  function advanceQuestion() {
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex(i => i + 1)
    } else {
      setIsComplete(true)
    }
  }

  function handleInputChange(bi: number, value: string) {
    setUserInputs(prev => { const n = [...prev]; n[bi] = value; return n })
    // If editing after a wrong submission, go back to pre-submit state
    if (resultMsg && !isAllCorrect) {
      setStatuses(prev => { const n = [...prev]; n[bi] = 'idle'; return n })
      setResultMsg('')
      setAiContent('')
    }
  }

  function handleKeyDown(bi: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (bi < blankCount - 1) inputRefs.current[bi + 1]?.focus()
    else handleSubmit()
  }

  async function handleSubmit() {
    if (isAllCorrect || isSubmitting) return
    if (!userInputs.every(v => v.trim() !== '')) return

    const newStatuses: BlankStatus[] = userInputs.map((v, i) =>
      v.trim().toLowerCase() === blanks[i].toLowerCase() ? 'correct' : 'wrong'
    )
    setStatuses(newStatuses)

    const allCorrect = newStatuses.every(s => s === 'correct')
    setSubmittedInputs([...userInputs])
    setSubmittedBlanks([...blanks])
    setSubmittedCorrect(allCorrect)

    if (allCorrect) {
      setIsAllCorrect(true)
      setResultMsg('✅ 答對了！')
      // Focus moves to "下一題 →" via the useEffect above
    } else {
      setShakeKey(k => k + 1)
      setResultMsg('❌ 再想想看')
      const firstWrong = newStatuses.findIndex(s => s === 'wrong')
      if (firstWrong !== -1) setTimeout(() => inputRefs.current[firstWrong]?.focus(), 80)
    }
  }

  async function handleAiRequest() {
    if (isAiLoading || aiContent) return
    setIsAiLoading(true)
    try {
      const wrongInputs = submittedCorrect
        ? submittedInputs
        : submittedInputs.filter((_, i) => statuses[i] === 'wrong')
      const wrongBlanks = submittedCorrect
        ? submittedBlanks
        : submittedBlanks.filter((_, i) => statuses[i] === 'wrong')

      const res = await fetch('/api/ai-hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: submittedCorrect ? 'correct' : 'hint',
          question: current.template,
          pattern: patternTitle,
          userAnswers: wrongInputs,
          blanks: wrongBlanks,
        }),
      })
      const data = await res.json()
      setAiContent(data.hint || (submittedCorrect ? '答對了！太棒了！' : '注意句型結構，再試試看！'))
    } catch {
      setAiContent(submittedCorrect ? '答對了！繼續加油！' : '注意句型結構，再試試看！')
    } finally {
      setIsAiLoading(false)
    }
  }

  // "重新作答": clear inputs, reset to pre-submit state, focus first input
  function handleRetry() {
    setUserInputs(Array(blankCount).fill(''))
    setStatuses(Array(blankCount).fill('idle'))
    setResultMsg('')
    setAiContent('')
    setTimeout(() => inputRefs.current[0]?.focus(), 60)
  }

  function inputStyle(bi: number): React.CSSProperties {
    const st = statuses[bi]
    const focused = focusedIndex === bi
    let borderColor = '#1F7A8C', bg = 'transparent', color = 'inherit'
    if (st === 'correct')    { borderColor = '#1A7A4A'; bg = '#edfbf3'; color = '#1A7A4A' }
    else if (st === 'wrong') { borderColor = '#C0392B'; bg = '#fff5f5'; color = '#C0392B' }
    else if (focused)        { borderColor = '#2E6FA3'; bg = '#f0f7ff' }
    return {
      display: 'inline-block',
      width: `${blankWidth(blanks[bi])}px`,
      border: 'none',
      borderBottom: `2px solid ${borderColor}`,
      background: bg,
      color,
      fontStyle: 'italic',
      fontFamily: 'inherit',
      fontSize: 'inherit',
      fontWeight: 600,
      lineHeight: 'inherit',
      padding: '0 4px 1px',
      outline: 'none',
      textAlign: 'center',
      verticalAlign: 'baseline',
      borderRadius: 0,
      transition: 'border-color 0.18s, background 0.18s, color 0.18s',
    }
  }

  /* ── Complete screen ── */
  if (isComplete) {
    return (
      <section style={{ padding: '40px 24px', background: '#f0faf4', borderRadius: '12px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
        <h3 style={{ fontSize: '24px', fontWeight: 700, color: '#1F6B5A', marginBottom: '8px' }}>
          練習完成！
        </h3>
        <p style={{ color: '#555', marginBottom: '24px' }}>
          你已完成全部 {exercises.length} 題填空練習。
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => { setIsComplete(false); setCurrentIndex(0); setHasStarted(false) }}
            style={{
              background: '#1F6B5A', color: '#fff', border: 'none',
              borderRadius: '8px', padding: '10px 24px',
              fontSize: '16px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            再練一次
          </button>
          <BackLink />
        </div>
      </section>
    )
  }

  const allFilled = userInputs.length === blankCount && userInputs.every(v => v.trim() !== '')
  const isSubmitted = resultMsg !== ''

  /* ── Main UI ── */
  return (
    <section>
      {/* ── 開始練習 gate ── */}
      {!hasStarted && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', padding: '32px 0 8px', flexWrap: 'wrap' }}>
          <BackLink />
          <PrintButton />
          <button
            onClick={handleStart}
            style={{
              padding: '12px 36px',
              background: '#1F4E7A', color: '#fff',
              border: 'none', borderRadius: '8px',
              fontSize: '16px', fontWeight: 700, cursor: 'pointer',
              letterSpacing: '0.03em',
            }}
          >
            ▶ 開始練習
          </button>
        </div>
      )}
      {hasStarted && (<>
      {/* Progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
        {exercises.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: '6px', borderRadius: '3px',
            background: i < currentIndex ? '#1F6B5A' : i === currentIndex ? '#1F4E7A' : '#ddd',
            transition: 'background 0.3s',
          }} />
        ))}
        <span style={{ fontSize: '14px', color: '#666', whiteSpace: 'nowrap' }}>
          {currentIndex + 1} / {exercises.length}
        </span>
      </div>

      {/* Question card */}
      <div style={{
        background: '#fff', border: '2px solid #e2e8f0',
        borderRadius: '12px', padding: '28px', marginBottom: '20px',
      }}>
        <p style={{
          fontSize: '12px', color: '#999', fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px',
        }}>
          第 {currentIndex + 1} 題　填入正確答案
        </p>

        <div
          key={shakeKey}
          className={shakeKey > 0 ? 'practice-shake' : undefined}
          style={{ fontSize: '20px', lineHeight: 2.2, color: '#1a202c' }}
        >
          {parts.map((part, i) => {
            if (part !== null) return <span key={i}>{part}</span>
            const bi = nullPositions.indexOf(i)
            return (
              <input
                key={i}
                ref={el => { inputRefs.current[bi] = el }}
                type="text"
                value={userInputs[bi] ?? ''}
                onChange={e => handleInputChange(bi, e.target.value)}
                onKeyDown={e => handleKeyDown(bi, e)}
                onFocus={() => setFocusedIndex(bi)}
                onBlur={() => setFocusedIndex(prev => prev === bi ? null : prev)}
                disabled={isAllCorrect || isSubmitting}
                autoComplete="off"
                spellCheck={false}
                style={inputStyle(bi)}
              />
            )
          })}
        </div>

        <p style={{ fontSize: '14px', color: '#888', marginTop: '8px' }}>
          {current.translation}
        </p>
      </div>

      {/* ── Phase 1: not yet submitted ── */}
      {!isSubmitted && (
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={handleSubmit}
            disabled={!allFilled || isSubmitting}
            style={{
              padding: '10px 24px',
              background: '#1F4E7A', color: '#fff',
              border: 'none', borderRadius: '8px',
              fontSize: '15px', fontWeight: 600,
              cursor: !allFilled || isSubmitting ? 'not-allowed' : 'pointer',
              opacity: !allFilled || isSubmitting ? 0.55 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            確認作答
          </button>
        </div>
      )}

      {/* ── Phase 2: after submission ── */}
      {isSubmitted && (
        <div style={{
          padding: '14px 18px', borderRadius: '10px',
          background: isAllCorrect ? '#f0faf4' : '#fffbeb',
          border: `1px solid ${isAllCorrect ? '#86efac' : '#fcd34d'}`,
          marginBottom: '8px',
        }}>
          {/* Single flex row: result msg | AI button | next/retry button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '15px', fontWeight: 600, color: '#1a202c', marginRight: 'auto' }}>
              {resultMsg}
            </span>

            {/* AI button — disappears once content loads */}
            {!aiContent && !isAiLoading && (
              <AiButton correct={isAllCorrect} onClick={handleAiRequest} />
            )}
            {isAiLoading && (
              <span style={{ fontSize: '13px', color: '#888' }}>⏳ AI 分析中…</span>
            )}

            {/* Next / retry button */}
            {isAllCorrect ? (
              <button
                ref={nextBtnRef}
                onClick={advanceQuestion}
                style={{
                  padding: '7px 20px',
                  background: '#1F6B5A', color: '#fff',
                  border: 'none', borderRadius: '8px',
                  fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                {currentIndex < exercises.length - 1 ? '下一題 →' : '查看結果 →'}
              </button>
            ) : (
              <button
                onClick={handleRetry}
                style={{
                  padding: '7px 16px',
                  background: 'transparent', color: '#555',
                  border: '1px solid #cbd5e0', borderRadius: '8px',
                  fontSize: '14px', cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                重新作答
              </button>
            )}
          </div>

          {/* AI content — shown below the row */}
          {aiContent && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.7, margin: 0 }}>
                💡 {aiContent}
              </p>
            </div>
          )}
        </div>
      )}
      </>)}
    </section>
  )
}

/* ── Back to list link ── */
function BackLink() {
  const [hovered, setHovered] = useState(false)
  return (
    <Link
      href="/"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex', alignItems: 'center',
        padding: '10px 24px',
        background: hovered ? '#2E6FA3' : 'transparent',
        color: hovered ? '#fff' : '#2E6FA3',
        border: '1.5px solid #2E6FA3',
        borderRadius: '8px',
        fontSize: '16px', fontWeight: 600,
        textDecoration: 'none',
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      ← 回到句型列表
    </Link>
  )
}

/* ── AI trigger button ── */
function AiButton({ correct, onClick }: { correct: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  const color = correct ? '#1A7A4A' : '#856404'
  const bgHov = correct ? '#f0faf4' : '#fffbeb'

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        padding: '5px 14px',
        background: hovered ? bgHov : 'transparent',
        color, border: `1.5px solid ${color}`,
        borderRadius: '6px', fontSize: '13px', fontWeight: 600,
        cursor: 'pointer', transition: 'background 0.15s',
      }}
    >
      💡 {correct ? '看 AI 解析' : '需要提示嗎？'}
    </button>
  )
}
