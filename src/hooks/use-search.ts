import { useState, useMemo, useRef, useCallback, useEffect } from "react"
import type { ParsedSession, ConversationTurn, UserRecord, AssistantRecord } from "@/types/session"

export interface SearchMatch {
  turnIndex: number
  turn: ConversationTurn
  snippet: string
}

export interface UseSearchResult {
  query: string
  setQuery: (q: string) => void
  debouncedQuery: string
  matches: SearchMatch[]
  activeMatchIndex: number
  setActiveMatchIndex: (i: number) => void
  nextMatch: () => void
  prevMatch: () => void
}

function getTurnText(turn: ConversationTurn): string {
  const record = turn.record
  if (turn.role === "user") {
    const content = (record as UserRecord).message.content
    return typeof content === "string" ? content : ""
  }
  if (turn.role === "assistant") {
    const msg = (record as AssistantRecord).message
    return msg.content
      .map((b) => {
        if (b.type === "text") return b.text
        if (b.type === "tool_use") return `${b.name} ${JSON.stringify(b.input)}`
        return ""
      })
      .join(" ")
  }
  return ""
}

export function useSearch(session: ParsedSession): UseSearchResult {
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [activeMatchIndex, setActiveMatchIndex] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Debounce query
  useEffect(() => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(query)
      setActiveMatchIndex(0)
    }, 300)
    return () => clearTimeout(timerRef.current)
  }, [query])

  const matches = useMemo(() => {
    if (!debouncedQuery.trim()) return []
    const q = debouncedQuery.toLowerCase()
    const results: SearchMatch[] = []

    for (let i = 0; i < session.turns.length; i++) {
      const turn = session.turns[i]
      const text = getTurnText(turn)
      const idx = text.toLowerCase().indexOf(q)
      if (idx !== -1) {
        // Extract snippet around match
        const start = Math.max(0, idx - 40)
        const end = Math.min(text.length, idx + q.length + 40)
        const snippet =
          (start > 0 ? "..." : "") +
          text.slice(start, end) +
          (end < text.length ? "..." : "")
        results.push({ turnIndex: i, turn, snippet })
      }
    }
    return results
  }, [debouncedQuery, session.turns])

  const nextMatch = useCallback(() => {
    if (matches.length === 0) return
    setActiveMatchIndex((prev) => (prev + 1) % matches.length)
  }, [matches.length])

  const prevMatch = useCallback(() => {
    if (matches.length === 0) return
    setActiveMatchIndex((prev) => (prev - 1 + matches.length) % matches.length)
  }, [matches.length])

  return {
    query,
    setQuery,
    debouncedQuery,
    matches,
    activeMatchIndex,
    setActiveMatchIndex,
    nextMatch,
    prevMatch,
  }
}
