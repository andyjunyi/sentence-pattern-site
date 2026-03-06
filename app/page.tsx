import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import PatternSearch, { type PatternSummary } from '@/components/PatternSearch'

const CHAPTER_TITLES: Record<number, string> = {
  1: '虛主詞與強調句型',
  2: '條件句與假設語氣',
  3: '比較句型',
  4: '關係子句與名詞子句',
  5: '動詞進階用法',
  6: '不定詞與動名詞',
  7: '分詞與分詞構句',
  8: '連接詞與副詞子句',
}

function loadPatterns(): PatternSummary[] {
  const dir = join(process.cwd(), 'data', 'patterns')
  const files = readdirSync(dir).filter(f => f.endsWith('.json'))

  const patterns: PatternSummary[] = files.map(file => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: Record<string, any> = JSON.parse(readFileSync(join(dir, file), 'utf-8'))
    const formula =
      Array.isArray(raw.formulas) && raw.formulas.length > 0
        ? (raw.formulas[0].formula as string)
        : (raw.formula_for ?? raw.formula ?? '') as string
    const explanation =
      typeof raw.explanation === 'string'
        ? raw.explanation
        : typeof raw.explanation === 'object' && raw.explanation !== null
          ? Object.values(raw.explanation as Record<string, string>).join(' ')
          : ''
    return {
      code: raw.code as string,
      chapter: raw.chapter as number,
      title: raw.title as string,
      formula,
      explanation,
      chapterTitle: CHAPTER_TITLES[raw.chapter as number] ?? '',
    }
  })

  return patterns.sort((a, b) => {
    if (a.chapter !== b.chapter) return a.chapter - b.chapter
    const aNum = Number(a.code.split('-')[1])
    const bNum = Number(b.code.split('-')[1])
    return aNum - bNum
  })
}

export default function Home() {
  const patterns = loadPatterns()
  const chapterCount = new Set(patterns.map(p => p.chapter)).size

  return (
    <>
      {/* Header */}
      <header style={{
        background: '#1A3A5C',
        color: '#fff',
        padding: '48px 24px 40px',
        textAlign: 'center',
      }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
          學測英文必備句型
        </h1>
        <p style={{ fontSize: '16px', color: '#a8c4e0', margin: '10px 0 0' }}>
          系統化學習 · 互動練習 · AI 即時解析
        </p>
        <p style={{ fontSize: '13px', color: '#7aa5c8', margin: '6px 0 0' }}>
          共 {patterns.length} 個句型 · {chapterCount} 大章節
        </p>
      </header>

      <PatternSearch patterns={patterns} />

      {/* Footer */}
      <footer style={{
        background: '#f7f8fa',
        borderTop: '1px solid #e2e8f0',
        padding: '24px',
        textAlign: 'center',
        fontSize: '13px',
        color: '#999',
      }}>
        學測英文必備句型 © 2025
      </footer>
    </>
  )
}
