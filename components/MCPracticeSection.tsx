'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

export interface MCExercise {
  id: number
  question_chi: string
  question_eng: string
  options: { key: string; text: string }[]
  answer: string
  explanation: string
}

interface MCPracticeSectionProps {
  exercises: MCExercise[]
  patternTitle: string
}

export default function MCPracticeSection({ exercises, patternTitle }: MCPracticeSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)   // option key user clicked
  const [isComplete, setIsComplete] = useState(false)
  const [aiContent, setAiContent] = useState('')
  const [isAiLoading, setIsAiLoading] = useState(false)
  const nextBtnRef = useRef<HTMLButtonElement>(null)

  const current = exercises[currentIndex]
  const isAnswered = selected !== null
  const isCorrect = selected === current.answer

  // Focus next button after answering
  useEffect(() => {
    if (isAnswered) setTimeout(() => nextBtnRef.current?.focus(), 60)
  }, [isAnswered])

  // Reset per question
  useEffect(() => {
    setSelected(null)
    setAiContent('')
    setIsAiLoading(false)
  }, [currentIndex])

  function handleSelect(key: string) {
    if (isAnswered) return
    setSelected(key)
  }

  function advanceQuestion() {
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex(i => i + 1)
    } else {
      setIsComplete(true)
    }
  }

  async function handleAiRequest() {
    if (isAiLoading || aiContent) return
    setIsAiLoading(true)
    try {
      const selectedOption = current.options.find(o => o.key === selected)
      const correctOption = current.options.find(o => o.key === current.answer)
      const res = await fetch('/api/ai-hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: isCorrect ? 'mc-correct' : 'mc-wrong',
          question: current.question_eng,
          pattern: patternTitle,
          userAnswers: [selectedOption?.text ?? selected ?? ''],
          blanks: [correctOption?.text ?? current.answer],
          explanation: current.explanation,
        }),
      })
      const data = await res.json()
      setAiContent(data.hint || '請參考上方說明！')
    } catch {
      setAiContent('請參考上方說明！')
    } finally {
      setIsAiLoading(false)
    }
  }

  // ── Complete screen ──────────────────────────────────────────────
  if (isComplete) {
    return (
      <div style={{ padding: '40px 24px', background: '#f0faf4', borderRadius: '12px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
        <h3 style={{ fontSize: '24px', fontWeight: 700, color: '#1F6B5A', marginBottom: '8px' }}>
          練習完成！
        </h3>
        <p style={{ color: '#555', marginBottom: '24px' }}>
          你已完成全部 {exercises.length} 題選擇題練習。
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => { setIsComplete(false); setCurrentIndex(0); setSelected(null) }}
            style={{
              background: '#1F6B5A', color: '#fff', border: 'none',
              borderRadius: '8px', padding: '10px 24px',
              fontSize: '16px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            再練一次
          </button>
          <MCBackLink />
        </div>
      </div>
    )
  }

  // ── Option button style ──────────────────────────────────────────
  function optionStyle(key: string): React.CSSProperties {
    const base: React.CSSProperties = {
      display: 'flex', alignItems: 'center', gap: '12px',
      width: '100%', textAlign: 'left', padding: '12px 16px',
      borderWidth: '1.5px', borderStyle: 'solid', borderColor: '#CBD8E6',
      borderRadius: '8px',
      background: '#fff', fontSize: '15px', cursor: isAnswered ? 'default' : 'pointer',
      transition: 'border-color 0.15s, background 0.15s',
      marginBottom: '10px', fontFamily: 'inherit',
    }
    if (!isAnswered) return base
    if (key === current.answer) {
      return { ...base, background: '#edfbf3', borderColor: '#1A7A4A', color: '#1A7A4A', fontWeight: 700 }
    }
    if (key === selected) {
      return { ...base, background: '#fff5f5', borderColor: '#C0392B', color: '#C0392B' }
    }
    return { ...base, opacity: 0.45 }
  }

  function optionIcon(key: string): string {
    if (!isAnswered) return ''
    if (key === current.answer) return '✅ '
    if (key === selected) return '❌ '
    return ''
  }

  // ── Main UI ──────────────────────────────────────────────────────
  return (
    <div>
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
          letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px',
        }}>
          第 {currentIndex + 1} 題　選出正確答案
        </p>

        <p style={{ fontSize: '14px', color: '#666', marginBottom: '14px', lineHeight: 1.6 }}>
          {current.question_chi}
        </p>

        <p style={{ fontSize: '19px', lineHeight: 1.9, color: '#1a202c', marginBottom: '24px', fontWeight: 500 }}>
          {/* Highlight the blank visually */}
          {current.question_eng.split('_______').map((part, i, arr) => (
            <span key={i}>
              {part}
              {i < arr.length - 1 && (
                <span style={{
                  display: 'inline-block', minWidth: '80px', borderBottom: '2.5px solid #2E6FA3',
                  margin: '0 4px', textAlign: 'center', color: '#2E6FA3', fontWeight: 700,
                  fontStyle: 'italic', fontSize: '15px',
                }}>
                  {isAnswered
                    ? current.options.find(o => o.key === current.answer)?.text ?? '?'
                    : '？？？'}
                </span>
              )}
            </span>
          ))}
        </p>

        {/* Options */}
        <div>
          {current.options.map(opt => (
            <button key={opt.key} onClick={() => handleSelect(opt.key)} style={optionStyle(opt.key)}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                background: isAnswered
                  ? opt.key === current.answer ? '#1A7A4A'
                    : opt.key === selected ? '#C0392B' : '#ddd'
                  : '#1F4E7A',
                color: '#fff', fontSize: '13px', fontWeight: 700,
              }}>
                {opt.key}
              </span>
              <span>{optionIcon(opt.key)}{opt.text}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Result row — appears after answering */}
      {isAnswered && (
        <div style={{
          padding: '14px 18px', borderRadius: '10px',
          background: isCorrect ? '#f0faf4' : '#fff5f5',
          border: '1px solid ' + (isCorrect ? '#86efac' : '#fca5a5'),
          marginBottom: '8px',
        }}>
          {/* Explanation */}
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.7, margin: '0 0 10px' }}>
            <span style={{ fontWeight: 700 }}>說明：</span>{current.explanation}
          </p>

          {/* Action row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '15px', fontWeight: 600, color: '#1a202c', marginRight: 'auto' }}>
              {isCorrect ? '✅ 答對了！' : '❌ 答錯了'}
            </span>

            {!aiContent && !isAiLoading && (
              <MCAiButton correct={isCorrect} onClick={handleAiRequest} />
            )}
            {isAiLoading && (
              <span style={{ fontSize: '13px', color: '#888' }}>⏳ AI 分析中…</span>
            )}

            <button
              ref={nextBtnRef}
              onClick={advanceQuestion}
              onKeyDown={e => e.key === 'Enter' && advanceQuestion()}
              style={{
                padding: '7px 20px',
                background: '#1F4E7A', color: '#fff',
                border: 'none', borderRadius: '8px',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer', flexShrink: 0,
              }}
            >
              {currentIndex < exercises.length - 1 ? '下一題 →' : '查看結果 →'}
            </button>
          </div>

          {/* AI content */}
          {aiContent && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.7, margin: 0 }}>
                💡 {aiContent}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MCBackLink() {
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
        border: '1.5px solid #2E6FA3', borderRadius: '8px',
        fontSize: '16px', fontWeight: 600,
        textDecoration: 'none',
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      ← 回到句型列表
    </Link>
  )
}

function MCAiButton({ correct, onClick }: { correct: boolean; onClick: () => void }) {
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
        color, border: '1.5px solid ' + color,
        borderRadius: '6px', fontSize: '13px', fontWeight: 600,
        cursor: 'pointer', transition: 'background 0.15s', fontFamily: 'inherit',
      }}
    >
      💡 看 AI 解析
    </button>
  )
}
