'use client'

import { useState } from 'react'

export default function PrintButton() {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={() => window.print()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '10px 24px',
        background: hovered ? '#4A4A4A' : 'transparent',
        color: hovered ? '#fff' : '#4A4A4A',
        border: '1.5px solid #4A4A4A',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      🖨 列印此講義
    </button>
  )
}
