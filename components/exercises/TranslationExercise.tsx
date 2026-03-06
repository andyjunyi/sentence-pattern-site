'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import type { GradeResult } from '@/app/api/ai-grade/route'

export interface TranslationEx {
  id: number
  sentence_chi: string
  answer: string
  key_points: string[]
  hints: string[]
}

interface TranslationExerciseProps {
  exercises: TranslationEx[]
  patternTitle: string
}

function TranslationBackLink() {
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

function scoreColor(score: number): string {
  if (score >= 90) return '#1A7A4A'
  if (score >= 70) return '#1F4E7A'
  if (score >= 50) return '#856404'
  return '#C0392B'
}

function scoreBg(score: number): string {
  if (score >= 90) return '#f0faf4'
  if (score >= 70) return '#eff6ff'
  if (score >= 50) return '#fffbeb'
  return '#fff5f5'
}

function scoreBorder(score: number): string {
  if (score >= 90) return '#86efac'
  if (score >= 70) return '#93c5fd'
  if (score >= 50) return '#fcd34d'
  return '#fca5a5'
}

export default function TranslationExercise({ exercises, patternTitle }: TranslationExerciseProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [isGrading, setIsGrading] = useState(false)
  const [gradeResult, setGradeResult] = useState<GradeResult | null>(null)
  const [showHints, setShowHints] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [scores, setScores] = useState<number[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const nextBtnRef = useRef<HTMLButtonElement>(null)

  const current = exercises[currentIndex]

  // Reset per question
  useEffect(() => {
    setUserAnswer('')
    setGradeResult(null)
    setShowHints(false)
    setTimeout(() => textareaRef.current?.focus(), 60)
  }, [currentIndex])

  // Focus next button after grading
  useEffect(() => {
    if (gradeResult) setTimeout(() => nextBtnRef.current?.focus(), 60)
  }, [gradeResult])

  async function handleSubmit() {
    const trimmed = userAnswer.trim()
    if (!trimmed || isGrading) return
    setIsGrading(true)
    try {
      const res = await fetch('/api/ai-grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentAnswer: trimmed,
          correctAnswer: current.answer,
          keyPoints: current.key_points,
          sentenceChi: current.sentence_chi,
          pattern: patternTitle,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setGradeResult(data as GradeResult)
      setScores(prev => [...prev, (data as GradeResult).score])
    } catch {
      setGradeResult({
        score: 0,
        feedback: '批改時發生錯誤，請參考下方參考答案。',
        keyPointsResults: current.key_points.map(p => ({ point: p, correct: false, comment: '無法判斷' })),
      })
    } finally {
      setIsGrading(false)
    }
  }

  function handleRetry() {
    setUserAnswer('')
    setGradeResult(null)
    setShowHints(false)
    setTimeout(() => textareaRef.current?.focus(), 60)
  }

  function advanceQuestion() {
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex(i => i + 1)
    } else {
      setIsComplete(true)
    }
  }

  // ── Complete screen ──────────────────────────────────────────────
  if (isComplete) {
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
    return (
      <div style={{ padding: '40px 24px', background: scoreBg(avg), borderRadius: '12px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
        <h3 style={{ fontSize: '24px', fontWeight: 700, color: '#1F6B5A', marginBottom: '8px' }}>
          練習完成！
        </h3>
        <p style={{ color: '#555', marginBottom: '8px' }}>
          你已完成全部 {exercises.length} 題中翻英練習。
        </p>
        {scores.length > 0 && (
          <p style={{ fontSize: '20px', fontWeight: 700, color: scoreColor(avg), marginBottom: '24px' }}>
            平均分數：{avg} / 100
          </p>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => { setIsComplete(false); setCurrentIndex(0); setScores([]) }}
            style={{
              background: '#1F6B5A', color: '#fff', border: 'none',
              borderRadius: '8px', padding: '10px 24px',
              fontSize: '16px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            再練一次
          </button>
          <TranslationBackLink />
        </div>
      </div>
    )
  }

  const isSubmitted = gradeResult !== null

  return (
    <div>
      {/* Progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
        {exercises.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: '6px', borderRadius: '3px',
            background: i < currentIndex ? '#1F6B5A' : i === currentIndex ? '#856404' : '#ddd',
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
          第 {currentIndex + 1} 題　中翻英
        </p>

        {/* Chinese sentence */}
        <p style={{
          fontSize: '22px', lineHeight: 1.7, color: '#1a202c', fontWeight: 600,
          marginBottom: '8px', letterSpacing: '0.02em',
        }}>
          {current.sentence_chi}
        </p>
        <p style={{ fontSize: '13px', color: '#888', marginBottom: '20px' }}>
          請用本章節句型「{patternTitle}」將上方中文翻譯成英文
        </p>

        {/* Hints toggle */}
        {!isSubmitted && (
          <div style={{ marginBottom: '16px' }}>
            <button
              onClick={() => setShowHints(h => !h)}
              style={{
                background: 'transparent', border: '1px solid #CBD8E6',
                borderRadius: '6px', padding: '4px 12px',
                fontSize: '13px', color: '#666', cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {showHints ? '▲ 收起提示' : '💡 顯示提示'}
            </button>
            {showHints && (
              <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
                {current.hints.map((h, i) => (
                  <li key={i} style={{ fontSize: '13px', color: '#555', lineHeight: 1.7 }}>{h}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={userAnswer}
          onChange={e => setUserAnswer(e.target.value)}
          disabled={isSubmitted || isGrading}
          placeholder="在此輸入英文翻譯……"
          rows={3}
          style={{
            width: '100%', minHeight: '80px',
            fontSize: '16px', lineHeight: 1.7,
            padding: '12px 14px',
            border: '1.5px solid ' + (isSubmitted ? '#cbd5e0' : '#1F7A8C'),
            borderRadius: '8px',
            fontFamily: 'inherit',
            resize: 'vertical',
            outline: 'none',
            background: isSubmitted ? '#f8fafc' : '#fff',
            color: '#1a202c',
            boxSizing: 'border-box',
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit()
          }}
        />
        <p style={{ fontSize: '12px', color: '#aaa', marginTop: '4px', textAlign: 'right' }}>
          {isSubmitted ? '' : 'Ctrl+Enter 快速提交'}
        </p>
      </div>

      {/* Pre-submit action row */}
      {!isSubmitted && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <button
            onClick={handleSubmit}
            disabled={!userAnswer.trim() || isGrading}
            style={{
              padding: '10px 28px',
              background: !userAnswer.trim() || isGrading ? '#94a3b8' : '#856404',
              color: '#fff', border: 'none', borderRadius: '8px',
              fontSize: '15px', fontWeight: 600,
              cursor: !userAnswer.trim() || isGrading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {isGrading ? '⏳ AI 批改中…' : '提交翻譯'}
          </button>
          {userAnswer && (
            <button
              onClick={() => setUserAnswer('')}
              style={{
                padding: '10px 20px',
                background: 'transparent', color: '#555',
                border: '1px solid #cbd5e0', borderRadius: '8px',
                fontSize: '14px', cursor: 'pointer',
              }}
            >
              ← 清除重填
            </button>
          )}
        </div>
      )}

      {/* Grade result */}
      {isSubmitted && gradeResult && (
        <div style={{
          borderRadius: '12px',
          background: scoreBg(gradeResult.score),
          border: `1px solid ${scoreBorder(gradeResult.score)}`,
          padding: '20px 22px',
          marginBottom: '8px',
        }}>
          {/* Score */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px' }}>
            <span style={{
              fontSize: '40px', fontWeight: 800,
              color: scoreColor(gradeResult.score), lineHeight: 1,
            }}>
              {gradeResult.score}
            </span>
            <span style={{ fontSize: '18px', color: '#888' }}>/ 100</span>
            <span style={{ marginLeft: '8px', fontSize: '18px' }}>
              {gradeResult.score >= 90 ? '🎉 優秀！' :
               gradeResult.score >= 70 ? '👍 不錯！' :
               gradeResult.score >= 50 ? '💪 繼續加油！' : '📚 多練習！'}
            </span>
          </div>

          {/* Feedback */}
          <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.7, marginBottom: '16px' }}>
            {gradeResult.feedback}
          </p>

          {/* Reference answer */}
          <div style={{
            background: '#fff', border: '1px solid #e2e8f0',
            borderRadius: '8px', padding: '12px 16px', marginBottom: '16px',
          }}>
            <p style={{ fontSize: '12px', color: '#999', fontWeight: 700, marginBottom: '4px', letterSpacing: '0.06em' }}>
              參考答案
            </p>
            <p style={{ fontSize: '15px', color: '#1a202c', lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>
              {gradeResult.score < 100
                ? current.answer
                : current.answer}
            </p>
          </div>

          {/* Key points check */}
          {gradeResult.keyPointsResults?.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '13px', color: '#666', fontWeight: 700, marginBottom: '8px' }}>重點檢查</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {gradeResult.keyPointsResults.map((kp, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: '8px',
                    fontSize: '13px', color: '#444',
                  }}>
                    <span style={{ flexShrink: 0 }}>{kp.correct ? '✅' : '❌'}</span>
                    <span>
                      <span style={{ fontWeight: 700, color: kp.correct ? '#1A7A4A' : '#C0392B' }}>
                        {kp.point}
                      </span>
                      {kp.comment ? <span style={{ color: '#666' }}>：{kp.comment}</span> : null}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={handleRetry}
              style={{
                padding: '8px 18px',
                background: 'transparent', color: '#555',
                border: '1px solid #cbd5e0', borderRadius: '8px',
                fontSize: '14px', cursor: 'pointer',
              }}
            >
              再試一次
            </button>
            <button
              ref={nextBtnRef}
              onClick={advanceQuestion}
              style={{
                padding: '8px 22px',
                background: '#856404', color: '#fff',
                border: 'none', borderRadius: '8px',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              {currentIndex < exercises.length - 1 ? '下一題 →' : '查看結果 →'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
