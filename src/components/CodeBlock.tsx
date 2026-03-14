import { useState, useCallback } from "react"

interface CodeBlockProps {
  content: string
  maxLines?: number
  className?: string
}

export function CodeBlock({ content, maxLines = 500, className = "" }: CodeBlockProps) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const lines = content.split("\n")
  const truncated = !expanded && lines.length > maxLines
  const displayContent = truncated
    ? lines.slice(0, maxLines).join("\n")
    : content

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [content])

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
          Show all {lines.length} lines
        </button>
      )}
    </div>
  )
}
