import { readFileSync } from 'fs'
import path from 'path'
import PracticeSection from '@/components/PracticeSection'
import ScrollToTop from '@/components/ScrollToTop'
import { highlightKeywords } from '@/lib/highlight'

// ── Normalized types (internal display structure) ─────────────────

interface FormulaItem {
  formula: string
  zh: string
  label?: string
  color: string
}

interface ExplanationSection {
  heading: string
  text: string
  color: string
}

interface DisplayExample {
  id: number
  sentence: string
  translation: string
  keywords: string[]
  preposition?: string
}

interface AdjEntry { adj: string; zh: string }
interface VocabEntry { adj: string; zh: string }

interface ExtensionExample { test: string; result: string }

interface PracticeExercise {
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

interface MCExerciseRaw {
  id: number
  question_chi: string
  question_eng: string
  options: { key: string; text: string }[]
  answer: string
  explanation: string
}

interface NormalizedPattern {
  code: string
  chapter: number
  title: string
  formulas: FormulaItem[]
  explanationSections: ExplanationSection[]
  examples: DisplayExample[]
  adjTableFor: AdjEntry[]
  adjTableOf: AdjEntry[]
  vocabTable: VocabEntry[]
  vocabTableLabel: string
  extension: { tip: string; examples: ExtensionExample[]; note: string }
  exercises: PracticeExercise[]
  mcExercises: MCExerciseRaw[]
}

// ── Normalize raw JSON → NormalizedPattern ────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalize(raw: Record<string, any>): NormalizedPattern {
  const BLUE = '#1F4E7A'
  const GREEN = '#1F6B5A'

  /* Formulas */
  const formulas: FormulaItem[] = Array.isArray(raw.formulas)
    ? raw.formulas.map((f: Record<string, string>, i: number) => ({
        formula: f.formula ?? '',
        zh: f.zh ?? '',
        label: f.label,
        color: f.color ?? (i === 0 ? BLUE : GREEN),
      }))
    : [
        ...(raw.formula_for
          ? [{ formula: raw.formula_for as string, zh: (raw.formula_for_zh as string) ?? '', label: 'for', color: BLUE }]
          : []),
        ...(raw.formula_of
          ? [{ formula: raw.formula_of as string, zh: (raw.formula_of_zh as string) ?? '', label: 'of', color: GREEN }]
          : []),
      ]

  /* Explanation sections */
  const explanationSections: ExplanationSection[] =
    typeof raw.explanation === 'string'
      ? [{ heading: '用法說明', text: raw.explanation, color: BLUE }]
      : raw.explanation && typeof raw.explanation === 'object'
        ? [
            { heading: 'for 的用法', text: (raw.explanation as Record<string, string>).for ?? '', color: BLUE },
            { heading: 'of 的用法', text: (raw.explanation as Record<string, string>).of ?? '', color: GREEN },
          ]
        : []

  /* Display examples */
  const examples: DisplayExample[] = ((raw.examples as Record<string, unknown>[]) ?? []).map(
    (ex, i) => ({
      id: (ex.id as number) ?? i + 1,
      sentence: (ex.sentence as string) ?? (ex.eng as string) ?? '',
      translation: (ex.translation as string) ?? (ex.chi as string) ?? '',
      keywords: (ex.keywords as string[]) ?? [],
      preposition: (ex.preposition as string) ?? '',
    })
  )

  /* Practice exercises — prefer raw.exercises, fall back to raw.examples */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawExercises: any[] = Array.isArray(raw.exercises)
    ? raw.exercises
    : (raw.examples as Record<string, unknown>[]) ?? []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const exercises: PracticeExercise[] = rawExercises.map((ex: any, i: number) => {
    const parts: (string | null)[] | undefined =
      Array.isArray(ex.parts) ? ex.parts : undefined

    const blanks: string[] | undefined =
      Array.isArray(ex.blanks) ? ex.blanks : undefined

    const templateStr: string =
      typeof ex.template === 'string'
        ? ex.template
        : parts
          ? parts.map((p) => (p === null ? '___' : p)).join('')
          : ''

    return {
      id: (ex.id as number) ?? i + 1,
      sentence: (ex.sentence as string) ?? (ex.eng as string) ?? '',
      template: templateStr,
      parts,
      blanks,
      answer: blanks?.[0] ?? (ex.answer as string) ?? '',
      translation: (ex.translation as string) ?? (ex.chi as string) ?? '',
      preposition: (ex.preposition as string) ?? '',
      keywords: (ex.keywords as string[]) ?? [],
    }
  })

  /* Adj tables (genuine adjectives only) */
  const adjTableFor: AdjEntry[] = (raw.adj_table_for as AdjEntry[]) ?? []
  const adjTableOf: AdjEntry[] = (raw.adj_table_of as AdjEntry[]) ?? []

  /* General vocab table (verbs, conjunctions, phrases, etc.) */
  const vocabTable: VocabEntry[] = (raw.vocab_table as VocabEntry[]) ?? []
  const vocabTableLabel: string = (raw.vocab_table_label as string) ?? '核心詞彙'

  /* Extension */
  const ext = (raw.extension as Record<string, unknown>) ?? {}
  const extension = {
    tip: (ext.tip as string) ?? '',
    examples: ((ext.examples as ExtensionExample[]) ?? []),
    note: (ext.note as string) ?? '',
  }

  /* MC exercises */
  const mcExercises: MCExerciseRaw[] = (raw.mc_exercises as MCExerciseRaw[]) ?? []

  return {
    code: raw.code as string,
    chapter: raw.chapter as number,
    title: raw.title as string,
    formulas,
    explanationSections,
    examples,
    adjTableFor,
    adjTableOf,
    vocabTable,
    vocabTableLabel,
    extension,
    exercises,
    mcExercises,
  }
}

// ── Data fetching ─────────────────────────────────────────────────

async function getPatternData(code: string): Promise<Record<string, unknown> | null> {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('patterns').select('*').eq('code', code).single()
      if (!error && data) return data as Record<string, unknown>
    } catch { /* fall through */ }
  }
  try {
    const filePath = path.join(process.cwd(), 'data', 'patterns', `${code}.json`)
    return JSON.parse(readFileSync(filePath, 'utf-8')) as Record<string, unknown>
  } catch {
    return null
  }
}

// ── Page ──────────────────────────────────────────────────────────

export default async function PatternPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const raw = await getPatternData(code)

  if (!raw) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '24px', color: '#333' }}>找不到句型 {code}</h1>
          <p style={{ color: '#888' }}>請確認句型代碼是否正確。</p>
        </div>
      </div>
    )
  }

  const p = normalize(raw)
  const BLUE = '#1F4E7A'
  const GREEN = '#1F6B5A'
  const NAVY = '#0F2547'

  return (
    <div style={{ fontFamily: 'Arial, "Microsoft JhengHei", sans-serif', background: '#f7f9fc', minHeight: '100vh' }}>
      <style>{`
        .adj-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
        }
        @media (max-width: 640px) {
          .adj-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
      <ScrollToTop />

      {/* ── 列印專用標題（螢幕隱藏）── */}
      <div className="print-only" style={{ borderBottom: '2px solid #1A3A5C', paddingBottom: '8px', marginBottom: '16px' }}>
        <div style={{ fontSize: '11pt', color: '#555' }}>學測英文必備句型 · 第 {p.chapter} 章</div>
        <div style={{ fontSize: '16pt', fontWeight: 700, color: '#1A3A5C' }}>句型 {p.code}　{p.title}</div>
      </div>

      {/* ── 深藍頂部章節列 ── */}
      <header className="no-print" style={{ background: NAVY, color: '#fff' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ padding: '12px 0 4px', fontSize: '13px', opacity: 0.7, letterSpacing: '0.08em' }}>
            第 {p.chapter} 章 · 不定詞句型
          </div>
          <h1 style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 700, padding: '8px 0 20px', lineHeight: 1.3, letterSpacing: '0.02em' }}>
            句型 {p.code}　{p.title}
          </h1>
        </div>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px 64px' }}>

        {/* ── 句型公式區 ── */}
        {p.formulas.length > 0 && (
          <section style={{ marginBottom: '40px' }}>
            <SectionTitle>句型公式</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {p.formulas.map((f, i) => (
                <FormulaCard key={i} color={f.color} label={f.label} formula={f.formula} meaning={f.zh} />
              ))}
            </div>
          </section>
        )}

        {/* ── 用法解說 ── */}
        {p.explanationSections.length > 0 && (
          <section style={{ marginBottom: '40px' }}>
            <SectionTitle>用法解說</SectionTitle>
            <div style={{
              display: 'grid',
              gridTemplateColumns: p.explanationSections.length === 1 ? '1fr' : '1fr 1fr',
              gap: '16px',
            }}>
              {p.explanationSections.map((sec, i) => (
                <ExplanationCard key={i} color={sec.color} heading={sec.heading} text={sec.text} />
              ))}
            </div>
          </section>
        )}

        {/* ── 詞彙表 ── */}
        {(p.adjTableFor.length > 0 || p.adjTableOf.length > 0 || p.vocabTable.length > 0) && (
          <section style={{ marginBottom: '40px' }}>
            <SectionTitle>詞彙表</SectionTitle>
            <div>
              {p.adjTableFor.length > 0 && (
                <AdjTable
                  color={BLUE}
                  title="搭配 for 的形容詞"
                  entries={p.adjTableFor}
                />
              )}
              {p.adjTableOf.length > 0 && (
                <AdjTable
                  color={GREEN}
                  title="搭配 of 的形容詞"
                  entries={p.adjTableOf}
                />
              )}
              {p.vocabTable.length > 0 && (
                <AdjTable
                  color={NAVY}
                  title={p.vocabTableLabel}
                  entries={p.vocabTable}
                />
              )}
            </div>
          </section>
        )}

        {/* ── 實用例句 ── */}
        {p.examples.length > 0 && (
          <section style={{ marginBottom: '40px' }}>
            <SectionTitle>實用例句</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {p.examples.map((ex, i) => (
                <ExampleCard
                  key={ex.id}
                  index={i + 1}
                  sentence={ex.sentence}
                  keywords={ex.keywords}
                  translation={ex.translation}
                  preposition={ex.preposition ?? ''}
                  blueColor={BLUE}
                  greenColor={GREEN}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── 延伸學習 ── */}
        {(p.extension.tip || p.extension.note) && (
          <section style={{ marginBottom: '48px' }}>
            <SectionTitle>延伸學習</SectionTitle>
            <div className="extension-block" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
              {p.extension.tip && (
                <p style={{ fontWeight: 700, color: '#333', marginBottom: '12px', fontSize: '16px' }}>
                  {p.extension.tip}
                </p>
              )}
              {p.extension.examples.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                  {p.extension.examples.map((ex, i) => (
                    <div key={i} style={{
                      background: '#f8fafc', borderRadius: '8px', padding: '12px 16px',
                      borderLeft: `4px solid ${i % 2 === 0 ? GREEN : BLUE}`,
                    }}>
                      <p style={{ margin: '0 0 4px', fontSize: '14px', color: '#555' }}>{ex.test}</p>
                      <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: i % 2 === 0 ? GREEN : BLUE }}>
                        {ex.result}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {p.extension.note && (
                <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px', padding: '12px 16px' }}>
                  <span style={{ fontWeight: 700, color: '#92400e' }}>口訣：</span>
                  <span style={{ color: '#78350f' }}>{p.extension.note.replace(/^口訣[：:]?\s*/, '')}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── 互動填空練習區 ── */}
        {p.exercises.length > 0 && (
          <section className="no-print">
            <SectionTitle>互動填空練習</SectionTitle>
            <p style={{ color: '#666', marginBottom: '24px', fontSize: '15px' }}>
              填入正確答案，可按「💡 看 AI 解析」取得引導回饋。
            </p>
            <PracticeSection exercises={p.exercises} mcExercises={p.mcExercises} patternTitle={p.title} />
          </section>
        )}
      </main>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1a202c', marginBottom: '16px', paddingBottom: '8px', borderBottom: '2px solid #e2e8f0' }}>
      {children}
    </h2>
  )
}

function FormulaCard({
  color, label, formula, meaning,
}: {
  color: string; label?: string; formula: string; meaning: string
}) {
  return (
    <div className="formula-card" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#fff', border: `2px solid ${color}`, borderRadius: '10px', padding: '16px 20px' }}>
      {label && (
        <span style={{ background: color, color: '#fff', borderRadius: '6px', padding: '4px 12px', fontSize: '13px', fontWeight: 700, letterSpacing: '0.05em', flexShrink: 0, alignSelf: 'flex-start', marginTop: '2px' }}>
          {label}
        </span>
      )}
      <div>
        <code style={{ fontSize: '16px', color: '#1a202c', fontFamily: '"Courier New", Courier, monospace', fontWeight: 600, display: 'block' }}>
          {formula}
        </code>
        {meaning && (
          <span className="formula-meaning" style={{ display: 'block', marginTop: '5px', fontSize: '13px', color, opacity: 0.85, fontStyle: 'italic', letterSpacing: '0.01em' }}>
            {meaning}
          </span>
        )}
      </div>
    </div>
  )
}

function ExplanationCard({
  color, heading, text,
}: {
  color: string; heading: string; text: string
}) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
      <div className="color-header" style={{ background: color, padding: '10px 16px' }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '16px' }}>{heading}</span>
      </div>
      <p style={{ padding: '16px', margin: 0, fontSize: '14px', color: '#444', lineHeight: 1.7 }}>{text}</p>
    </div>
  )
}

function AdjTable({
  color, title, entries,
}: {
  color: string; title: string; entries: AdjEntry[]
}) {
  return (
    <div style={{ background: '#fff', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
      <div className="color-header" style={{ background: color, padding: '10px 16px' }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>{title}</span>
      </div>
      <div className="adj-grid">
        {entries.map((entry, i) => (
          <div
            key={i}
            style={{
              padding: '6px 10px',
              borderRight: '1px solid #E8EEF5',
              borderBottom: '1px solid #E8EEF5',
            }}
          >
            <div style={{ fontFamily: '"Courier New", Courier, monospace', fontWeight: 700, color: '#1A3A5C', fontSize: '13px' }}>
              {entry.adj}
            </div>
            <div style={{ fontSize: '12px', color: '#4A4A4A' }}>
              {entry.zh}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ExampleCard({
  index, sentence, keywords, translation, preposition, blueColor, greenColor,
}: {
  index: number; sentence: string; keywords: string[]; translation: string
  preposition: string; blueColor: string; greenColor: string
}) {
  const accent = preposition === 'of' ? greenColor : blueColor
  return (
    <div className="example-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderLeft: `4px solid ${accent}`, borderRadius: '8px', padding: '14px 18px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
      <span style={{ background: accent, color: '#fff', borderRadius: '50%', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, flexShrink: 0, marginTop: '2px' }}>
        {index}
      </span>
      <div style={{ flex: 1 }}>
        <p style={{ margin: '0 0 4px', fontSize: '15px', color: '#1a202c', lineHeight: 1.6 }}>
          {highlightKeywords(sentence, keywords)}
        </p>
        <p style={{ margin: 0, fontSize: '13px', color: '#777' }}>{translation}</p>
      </div>
      {preposition && (
        <span style={{ marginLeft: 'auto', background: accent + '18', color: accent, borderRadius: '4px', padding: '2px 8px', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
          {preposition}
        </span>
      )}
    </div>
  )
}
