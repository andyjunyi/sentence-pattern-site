import React from 'react'

/**
 * Build a regex for a keyword that:
 * - is case-insensitive
 * - respects word boundaries
 * - allows optional morphological suffixes (-s, -es, -ed, -ing, 's) on the last word
 */
function buildKeywordRegex(keyword: string): RegExp {
  const trimmed = keyword.trim()
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  if (trimmed.includes(' ')) {
    // Multi-word phrase: flexible whitespace, suffix on last word only
    const parts = escaped.split(/\s+/)
    const last = parts[parts.length - 1]
    parts[parts.length - 1] = `${last}(?:(?:s|es|ed|ing|'s)(?=\\b))?`
    return new RegExp(`\\b${parts.join('\\s+')}\\b`, 'gi')
  }

  // Single word with optional suffix variants
  return new RegExp(`\\b${escaped}(?:(?:s|es|ed|ing|'s)(?=\\b))?\\b`, 'gi')
}

/**
 * Highlight keywords in a sentence.
 *
 * - Case-insensitive matching
 * - Supports morphological variants (-s, -es, -ed, -ing) on last token
 * - Multi-word phrases (e.g. "to review", "It is") matched as phrases
 * - Overlapping/adjacent ranges merged before rendering
 *
 * Returns a React node with matched segments wrapped in <strong><u> styled spans.
 */
export function highlightKeywords(
  sentence: string,
  keywords: string[]
): React.ReactNode {
  if (!keywords || keywords.length === 0) return sentence

  // Collect all match ranges [start, end)
  const ranges: Array<[number, number]> = []

  for (const kw of keywords) {
    const regex = buildKeywordRegex(kw)
    let match: RegExpExecArray | null
    while ((match = regex.exec(sentence)) !== null) {
      if (match[0].length === 0) break // guard against zero-length matches
      ranges.push([match.index, match.index + match[0].length])
    }
  }

  if (ranges.length === 0) return sentence

  // Sort by start position, then merge overlapping/adjacent ranges
  ranges.sort((a, b) => a[0] - b[0])
  const merged: Array<[number, number]> = []
  for (const [s, e] of ranges) {
    const prev = merged[merged.length - 1]
    if (prev && s <= prev[1]) {
      prev[1] = Math.max(prev[1], e)
    } else {
      merged.push([s, e])
    }
  }

  // Build React node list
  const nodes: React.ReactNode[] = []
  let cursor = 0

  for (const [start, end] of merged) {
    if (start > cursor) {
      nodes.push(sentence.slice(cursor, start))
    }
    nodes.push(
      <strong
        key={`h-${start}`}
        style={{ fontWeight: 700, textDecoration: 'underline', color: '#1A3A5C' }}
      >
        {sentence.slice(start, end)}
      </strong>
    )
    cursor = end
  }

  if (cursor < sentence.length) {
    nodes.push(sentence.slice(cursor))
  }

  return <>{nodes}</>
}
