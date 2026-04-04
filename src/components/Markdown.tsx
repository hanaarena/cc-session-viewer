import ReactMarkdown from "react-markdown"
import type { Components } from "react-markdown"
import remarkGfm from "remark-gfm"

const components: Components = {
  h1: ({ children }) => (
    <h1 className="mb-2 mt-4 text-lg font-bold text-gray-900 first:mt-0 dark:text-gray-100">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 mt-3 text-base font-bold text-gray-900 first:mt-0 dark:text-gray-100">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1 mt-2 text-sm font-bold text-gray-900 first:mt-0 dark:text-gray-100">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="my-1.5 text-sm leading-relaxed first:mt-0 last:mb-0">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="my-1.5 ml-4 list-disc space-y-0.5 text-sm">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-1.5 ml-4 list-decimal space-y-0.5 text-sm">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-gray-900 dark:text-gray-100">
      {children}
    </strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ className, children }) => {
    const isBlock = className?.includes("language-")
    if (isBlock) {
      return (
        <code className="block overflow-x-auto rounded-md bg-gray-800 p-3 text-xs leading-relaxed text-gray-200 dark:bg-gray-900">
          {children}
        </code>
      )
    }
    return (
      <code className="rounded bg-gray-200 px-1 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-200">
        {children}
      </code>
    )
  },
  pre: ({ children }) => <pre className="my-2 first:mt-0 last:mb-0">{children}</pre>,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-gray-300 pl-3 italic text-gray-600 dark:border-gray-600 dark:text-gray-400">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-gray-200 dark:border-gray-700" />,
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-gray-300 bg-gray-100 px-2 py-1 text-left font-semibold dark:border-gray-600 dark:bg-gray-800">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-gray-300 px-2 py-1 dark:border-gray-600">
      {children}
    </td>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 underline decoration-blue-300 hover:text-blue-700 dark:text-blue-400 dark:decoration-blue-700 dark:hover:text-blue-300"
    >
      {children}
    </a>
  ),
}

interface MarkdownProps {
  content: string
  className?: string
}

export function Markdown({ content, className = "" }: MarkdownProps) {
  return (
    <div className={`min-w-0 ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{content}</ReactMarkdown>
    </div>
  )
}
