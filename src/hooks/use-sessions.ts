import { useState, useEffect } from "react"
import type { ParsedSession } from "@/types/session"
import { parseJsonlFile } from "@/lib/parse-jsonl"
import { buildConversation } from "@/lib/build-conversation"

interface UseSessionsResult {
  sessions: ParsedSession[]
  loading: boolean
  error: string | null
  progress: number // 0-1 across all files
  currentFile: string
}

export function useSessions(files: File[]): UseSessionsResult {
  const [sessions, setSessions] = useState<ParsedSession[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [currentFile, setCurrentFile] = useState("")

  useEffect(() => {
    if (files.length === 0) {
      setSessions([])
      setLoading(false)
      setError(null)
      setProgress(0)
      setCurrentFile("")
      return
    }

    let cancelled = false

    async function parseAll() {
      setLoading(true)
      setError(null)
      setProgress(0)
      setSessions([])

      const results: ParsedSession[] = []

      for (let i = 0; i < files.length; i++) {
        if (cancelled) return

        const file = files[i]
        setCurrentFile(file.name)

        try {
          const records = await parseJsonlFile(file, (fileProgress) => {
            if (!cancelled) {
              const overall = (i + fileProgress) / files.length
              setProgress(overall)
            }
          })

          if (cancelled) return

          if (records.length === 0) continue

          results.push(buildConversation(records, file.name))
        } catch (e) {
          if (cancelled) return
          // Continue with other files, collect errors
          console.warn(`Failed to parse ${file.name}:`, e)
        }
      }

      if (!cancelled) {
        if (results.length === 0) {
          setError("No valid sessions found in the dropped files")
        } else {
          setSessions(results)
        }
        setLoading(false)
        setProgress(1)
        setCurrentFile("")
      }
    }

    parseAll()
    return () => {
      cancelled = true
    }
  }, [files])

  return { sessions, loading, error, progress, currentFile }
}
