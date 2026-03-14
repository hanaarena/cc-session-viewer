import type { ParsedSession } from "@/types/session"
import { formatTimestamp, formatDuration, formatTokens } from "@/lib/format"

interface SessionListProps {
  sessions: ParsedSession[]
  onSelect: (index: number) => void
  onBack: () => void
}

export function SessionList({ sessions, onSelect, onBack }: SessionListProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <button
            onClick={onBack}
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {sessions.length} sessions loaded
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-4xl p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session, i) => (
            <button
              key={session.sessionId || i}
              onClick={() => onSelect(i)}
              className="group rounded-xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-gray-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
            >
              <h3 className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                {session.fileName}
              </h3>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {session.model && (
                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                    {session.model}
                  </span>
                )}
                {session.gitBranch && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    {session.gitBranch}
                  </span>
                )}
              </div>

              <div className="mt-3 space-y-1 text-xs text-gray-500 dark:text-gray-400">
                {session.startTime && (
                  <p>{formatTimestamp(session.startTime)}</p>
                )}
                <p>
                  {session.turnCount} turns
                  {session.startTime && session.endTime && (
                    <> &middot; {formatDuration(session.startTime, session.endTime)}</>
                  )}
                </p>
                <p>
                  {formatTokens(session.totalInputTokens)} in / {formatTokens(session.totalOutputTokens)} out
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
