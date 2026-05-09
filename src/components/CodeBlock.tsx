import { useState } from "react"
import { DiffView } from "./DiffView"
import { detectDiff } from "@/lib/detect-diff"

interface CodeBlockProps {
  content: string
  maxLines?: number
  className?: string
}

export function CodeBlock({ content, maxLines = 500, className = "" }: CodeBlockProps) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const diffMatch = detectDiff(content)

  let lineCount = 1
  for (let i = 0; i < content.length; i++) {
    if (content[i] === "\n") lineCount++
  }

  const truncated = !expanded && lineCount > maxLines

  let displayContent = content
  if (truncated) {
    let newlinesSeen = 0
    for (let i = 0; i < content.length; i++) {
      if (content[i] === "\n") {
        newlinesSeen++
        if (newlinesSeen === maxLines) {
          displayContent = content.slice(0, i)
          break
        }
      }
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (diffMatch) {
    return (
      <div className={className}>
        {diffMatch.before.trim() && (
          <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-gray-700 dark:text-gray-300">
            {diffMatch.before}
          </pre>
        )}
        <DiffView diff={diffMatch.diff} />
        {diffMatch.after.trim() && (
          <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-gray-700 dark:text-gray-300">
            {diffMatch.after}
          </pre>
        )}
      </div>
    )
  }

  return (
    <div className={`group relative ${className}`}>
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 rounded bg-gray-200 px-1.5 py-0.5 text-[10px] text-gray-600 opacity-0 transition-opacity hover:bg-gray-300 group-hover:opacity-100 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
      >
        {copied ? "Copied" : "Copy"}
      </button>
      <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-gray-700 dark:text-gray-300">
        {displayContent}
      </pre>
      {truncated && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Show all {lineCount} lines
        </button>
      )}
    </div>
  )
}
