import type { ParsedSession } from "@/types/session"
import { formatDuration, formatTokens } from "@/lib/format"

interface SessionMetaProps {
  session: ParsedSession
  onBack: () => void
}

export function SessionMeta({ session, onBack }: SessionMetaProps) {
  return (
    <div className="flex items-center gap-4 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
      <button
        onClick={onBack}
        className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <div className="min-w-0 flex-1">
        <h2 className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
          {session.fileName}
        </h2>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        {session.model && (
          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
            {session.model}
          </span>
        )}
        {session.gitBranch && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            {session.gitBranch}
          </span>
        )}
        {session.cwd && (
          <span className="hidden max-w-[200px] truncate rounded-full bg-gray-100 px-2 py-0.5 sm:inline dark:bg-gray-800" title={session.cwd}>
            {session.cwd}
          </span>
        )}
        <span>{session.turnCount} turns</span>
        <span>
          {formatTokens(session.totalInputTokens)} in / {formatTokens(session.totalOutputTokens)} out
        </span>
        {session.startTime && session.endTime && (
          <span>{formatDuration(session.startTime, session.endTime)}</span>
        )}
      </div>
    </div>
  )
}
