import { useEffect, useState } from "react"
import { formatRelativeTime } from "@/lib/format"
import { ACTIVE_WINDOW_MS } from "@/lib/session-file"

interface LiveToggleProps {
  following: boolean
  onToggle: () => void
  lastModified: number
  error: string | null
}

/** Re-render on an interval, for time-relative labels */
function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}

export function LiveToggle({ following, onToggle, lastModified, error }: LiveToggleProps) {
  const now = useNow(10_000)
  const active = following && lastModified > 0 && now - lastModified < ACTIVE_WINDOW_MS
  const lastWrite = lastModified
    ? `last write ${formatRelativeTime(new Date(lastModified).toISOString())}`
    : ""

  const title = error
    ? `${error} — click to retry`
    : following
      ? `Following file changes${lastWrite ? ` · ${lastWrite}` : ""} — click to pause`
      : "Paused — click to follow file changes"

  return (
    <button
      type="button"
      onClick={onToggle}
      title={title}
      aria-pressed={following}
      className={`flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
        error
          ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
          : following
            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
            : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
      }`}
    >
      <span className="relative flex h-2 w-2">
        {active && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${
            error ? "bg-red-500" : following ? "bg-emerald-500" : "bg-gray-400"
          }`}
        />
      </span>
      {error ? "Unavailable" : following ? "Live" : "Paused"}
    </button>
  )
}
