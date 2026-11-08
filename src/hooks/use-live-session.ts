import { useState, useEffect } from "react"
import type { ParsedSession } from "@/types/session"
import { describeUnreadable, type SessionFile } from "@/lib/session-file"

const POLL_MS = 1000

export interface LiveSessionState {
  session: ParsedSession
  /** Whether the file can be re-read at all (Chromium file handle) */
  canFollow: boolean
  following: boolean
  setFollowing: (following: boolean) => void
  /** File mtime as of the last poll */
  lastModified: number
  error: string | null
}

/**
 * Polls the session file for appended records while `following` is on.
 * `handle.getFile()` is just a stat, and only new bytes are parsed, so a
 * 1s poll stays cheap even for large sessions.
 */
export function useLiveSession(file: SessionFile): LiveSessionState {
  const [session, setSession] = useState(() => file.session)
  const [following, setFollowing] = useState(file.canFollow)
  const [lastModified, setLastModified] = useState(file.lastModified)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!following || !file.canFollow) return

    let stopped = false
    const poll = async () => {
      try {
        await file.sync()
        if (!stopped) setError(null)
      } catch (e) {
        if (stopped) return
        const reason = describeUnreadable(e)
        if (reason) {
          setError(reason)
          setFollowing(false)
        }
        // Anything else (e.g. the file changed mid-read): retry next poll
      }
      if (stopped) return
      // Same object when nothing changed, so React skips the re-render
      setSession(file.session)
      setLastModified(file.lastModified)
    }

    poll()
    const timer = setInterval(poll, POLL_MS)
    // Background tabs throttle timers; catch up as soon as the tab is visible
    const onVisibilityChange = () => {
      if (!document.hidden) poll()
    }
    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => {
      stopped = true
      clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [file, following])

  return {
    session,
    canFollow: file.canFollow,
    following,
    setFollowing,
    lastModified,
    error,
  }
}
