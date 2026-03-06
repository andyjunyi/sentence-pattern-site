'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

export type PatternSummary = {
  code: string
  title: string
  formula: string
  explanation: string
  chapter: number
  chapterTitle: string
}

const CHAPTER_INFO: Record<number, { title: string; desc: string; color: string }> = {
  1: { title: '虛主詞與強調句型', desc: '以 It 為虛主詞或虛受詞的句型，以及強調特定成分的分裂句與強調名詞子句', color: '#1F4E7A' },
  2: { title: '條件句與假設語氣', desc: '真實條件、假設語氣與表達偏好或遺憾的句型，包含 if 子句與情境假設', color: '#1F6B5A' },
  3: { title: '比較句型', desc: '同級、比較級與程度副詞的各種比較句型，包含 too...to、so...that 等結構', color: '#6B3F1F' },
  4: { title: '關係子句與名詞子句', desc: '關係代名詞、關係副詞與各類名詞子句的引導與運用，包含間接問句與同位語子句', color: '#4A1F6B' },
  5: { title: '動詞進階用法', desc: '被動語態、使役感官動詞、情態動詞與特殊動詞結構的完整運用', color: '#1F4A6B' },
  6: { title: '不定詞與動名詞', desc: '不定詞與動名詞的各種用法與常見混淆辨析，包含特殊動名詞片語', color: '#1F6B3F' },
  7: { title: '分詞與分詞構句', desc: '分詞作形容詞、分詞構句（主動/被動/完成）與 with 獨立分詞構句的運用', color: '#6B1F3F' },
  8: { title: '連接詞與副詞子句', desc: '副詞子句（時間/原因/讓步/條件/目的/結果）、對等連接詞組與倒裝句型', color: '#3F4A1F' },
}

// Recursively highlight all occurrences of `query` in `text`
function highlight(text: string, query: string): React.ReactNode {
  if (!query || !text) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: '#FFF3CD', padding: '0 1px', borderRadius: '2px', fontWeight: 700 }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {highlight(text.slice(idx + query.length), query)}
    </>
  )
}

export default function PatternSearch({ patterns }: { patterns: PatternSummary[] }) {
  const [query, setQuery] = useState('')

  const trimmed = query.trim()
  const lower = trimmed.toLowerCase()

  const filtered = useMemo(() => {
    if (!lower) return []
    return patterns.filter(p =>
      p.code.toLowerCase().includes(lower) ||
      p.title.toLowerCase().includes(lower) ||
      p.formula.toLowerCase().includes(lower) ||
      p.explanation.toLowerCase().includes(lower) ||
      p.chapterTitle.toLowerCase().includes(lower)
    )
  }, [patterns, lower])

  const chapters = useMemo(
    () => [...new Set(patterns.map(p => p.chapter))].sort((a, b) => a - b),
    [patterns]
  )

  const isSearching = trimmed.length > 0

  return (
    <>
      <style>{`
        .card {
          display: block;
          background: #fff;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          text-decoration: none;
          color: inherit;
          transition: border-color 0.18s, box-shadow 0.18s, transform 0.18s;
        }
        .card:hover {
          border-color: #2E6FA3;
          box-shadow: 0 4px 16px rgba(46,111,163,0.12);
          transform: translateY(-2px);
        }
        .card-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        @media (max-width: 900px) {
          .card-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 560px) {
          .card-grid { grid-template-columns: 1fr; }
        }
        .search-input::placeholder { color: #9baab8; }
        .search-input:focus { outline: none; border-color: #2E6FA3 !important; box-shadow: 0 0 0 3px rgba(46,111,163,0.12); }
        .clear-btn { background: none; border: none; cursor: pointer; color: #9baab8; padding: 0 4px; line-height: 1; font-size: 16px; }
        .clear-btn:hover { color: #555; }
      `}</style>

      {/* ── 搜尋列 ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '20px 28px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', position: 'relative', display: 'flex', alignItems: 'center' }}>
          {/* Search icon */}
          <span style={{
            position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
            color: '#9baab8', fontSize: '16px', pointerEvents: 'none', lineHeight: 1,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>

          <input
            className="search-input"
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="搜尋句型⋯⋯ 例如：假設語氣、比較級、if、關係子句"
            style={{
              width: '100%',
              padding: '10px 40px 10px 42px',
              fontSize: '15px',
              border: '1.5px solid #CBD8E6',
              borderRadius: '8px',
              fontFamily: 'inherit',
              background: '#fafcff',
            }}
          />

          {/* Clear button */}
          {trimmed && (
            <button
              className="clear-btn"
              onClick={() => setQuery('')}
              aria-label="清除搜尋"
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Main content ── */}
      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 24px 80px' }}>

        {isSearching ? (
          /* ── Search results ── */
          <>
            <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1a202c', margin: 0 }}>
                搜尋結果
              </h2>
              <span style={{
                fontSize: '13px', fontWeight: 600,
                background: filtered.length > 0 ? '#1A3A5C' : '#999',
                color: '#fff', borderRadius: '10px', padding: '2px 10px',
              }}>
                {filtered.length > 0 ? `找到 ${filtered.length} 個句型` : '無結果'}
              </span>
            </div>

            {filtered.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '60px 24px',
                color: '#888', fontSize: '15px', background: '#fff',
                borderRadius: '12px', border: '1px solid #e2e8f0',
              }}>
                找不到符合「{trimmed}」的句型，請嘗試其他關鍵字。
              </div>
            ) : (
              <div className="card-grid">
                {filtered.map(p => {
                  const info = CHAPTER_INFO[p.chapter]
                  return (
                    <Link key={p.code} href={`/patterns/${p.code}`} className="card">
                      <div style={{
                        display: 'inline-block',
                        background: info?.color ?? '#1A3A5C',
                        color: '#fff', fontSize: '11px', fontWeight: 700,
                        padding: '2px 8px', borderRadius: '4px',
                        marginBottom: '10px', letterSpacing: '0.05em',
                      }}>
                        {highlight(p.code, trimmed)}
                      </div>

                      <p style={{
                        fontFamily: 'monospace', fontSize: '13px', color: '#2E6FA3',
                        margin: '0 0 8px', lineHeight: 1.5, wordBreak: 'break-word',
                      }}>
                        {highlight(p.formula, trimmed)}
                      </p>

                      <p style={{ fontSize: '14px', color: '#333', margin: '0 0 8px', lineHeight: 1.5 }}>
                        {highlight(p.title, trimmed)}
                      </p>

                      <p style={{ fontSize: '11px', color: info?.color ?? '#666', margin: '0 0 10px', fontWeight: 600 }}>
                        Ch.{p.chapter} {p.chapterTitle}
                      </p>

                      <span style={{ fontSize: '13px', color: '#2E6FA3', fontWeight: 600 }}>
                        前往學習 →
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
          </>
        ) : (
          /* ── Chapter-grouped view ── */
          <>
            {chapters.map(chapter => {
              const info = CHAPTER_INFO[chapter]
              const chapterPatterns = patterns.filter(p => p.chapter === chapter)

              return (
                <section key={chapter} style={{ marginBottom: '56px' }}>
                  <div style={{
                    borderLeft: `4px solid ${info?.color ?? '#1A3A5C'}`,
                    paddingLeft: '14px', marginBottom: '20px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
                      <h2 style={{ fontSize: '20px', fontWeight: 800, color: info?.color ?? '#1A3A5C', margin: 0 }}>
                        Chapter {chapter}　{info?.title ?? `第 ${chapter} 章`}
                      </h2>
                      <span style={{
                        fontSize: '12px', fontWeight: 700,
                        background: info?.color ?? '#1A3A5C',
                        color: '#fff', borderRadius: '10px', padding: '2px 10px',
                      }}>
                        {chapterPatterns.length} 個句型
                      </span>
                    </div>
                    {info?.desc && (
                      <p style={{ fontSize: '13px', color: '#666', margin: '4px 0 0', lineHeight: 1.6 }}>
                        {info.desc}
                      </p>
                    )}
                  </div>

                  <div className="card-grid">
                    {chapterPatterns.map(p => (
                      <Link key={p.code} href={`/patterns/${p.code}`} className="card">
                        <div style={{
                          display: 'inline-block',
                          background: info?.color ?? '#1A3A5C',
                          color: '#fff', fontSize: '11px', fontWeight: 700,
                          padding: '2px 8px', borderRadius: '4px',
                          marginBottom: '10px', letterSpacing: '0.05em',
                        }}>
                          {p.code}
                        </div>
                        <p style={{
                          fontFamily: 'monospace', fontSize: '13px', color: '#2E6FA3',
                          margin: '0 0 8px', lineHeight: 1.5, wordBreak: 'break-word',
                        }}>
                          {p.formula}
                        </p>
                        <p style={{ fontSize: '14px', color: '#333', margin: '0 0 14px', lineHeight: 1.5 }}>
                          {p.title}
                        </p>
                        <span style={{ fontSize: '13px', color: '#2E6FA3', fontWeight: 600 }}>
                          前往學習 →
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              )
            })}
          </>
        )}
      </main>
    </>
  )
}
