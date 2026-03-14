interface ThinkingBlockProps {
  text: string
}

export function ThinkingBlock({ text }: ThinkingBlockProps) {
  const charCount = text.length
  const label = charCount > 1000
    ? `Thinking (${Math.round(charCount / 1000)}K chars)...`
    : "Thinking..."

  return (
    <details className="my-2 rounded-lg border border-purple-200 dark:border-purple-800/50">
      <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs font-medium text-purple-600 select-none dark:text-purple-400">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
        {label}
      </summary>
      <div className="border-t border-purple-200 bg-purple-50/50 p-3 dark:border-purple-800/50 dark:bg-purple-950/20">
        <p className="whitespace-pre-wrap text-xs leading-relaxed text-purple-900 dark:text-purple-200">
          {text}
        </p>
      </div>
    </details>
  )
}
