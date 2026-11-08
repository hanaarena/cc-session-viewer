import { useState, useEffect } from "react"
import { SessionFile, type SessionSource } from "@/lib/session-file"

interface UseSessionsResult {
  sessions: SessionFile[]
  loading: boolean
  error: string | null
  progress: number // 0-1 across all files
  currentFile: string
}

export function useSessions(sources: SessionSource[]): UseSessionsResult {
  const [sessions, setSessions] = useState<SessionFile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [currentFile, setCurrentFile] = useState("")

  useEffect(() => {
    if (sources.length === 0) {
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

      const results: SessionFile[] = []

      for (let i = 0; i < sources.length; i++) {
        if (cancelled) return

        const source = sources[i]
        setCurrentFile(source.name)

        try {
          const sessionFile = new SessionFile(source)
          await sessionFile.sync((fileProgress) => {
            if (!cancelled) {
              const overall = (i + fileProgress) / sources.length
              setProgress(overall)
            }
          })

          if (cancelled) return

          if (sessionFile.recordCount === 0) continue

          results.push(sessionFile)
        } catch (e) {
          if (cancelled) return
          // Continue with other files, collect errors
          console.warn(`Failed to parse ${source.name}:`, e)
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
  }, [sources])

  return { sessions, loading, error, progress, currentFile }
}
