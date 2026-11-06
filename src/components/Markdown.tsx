import { createContext, useCallback, useContext, useRef } from "react";
import type { ComponentProps } from "react";
import ReactMarkdown from "react-markdown";
import type { Components, ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";
import { CopyButton } from "./CopyButton";
import { hastText, sliceNodeSource } from "@/lib/markdown-source";

/** The markdown being rendered, so blocks can copy their own source. */
const MarkdownSourceContext = createContext("");

/**
 * Marker class on blocks with their own copy button. Containers with a
 * whole-message copy button hide it while one of these is hovered
 * (`group-has-[.inline-copy:hover]:invisible`), so the two never overlap.
 */
const INLINE_COPY_WRAPPER = "inline-copy group/copy relative";
const INLINE_COPY_BUTTON =
  "absolute right-1.5 top-1.5 z-10 opacity-0 group-hover/copy:opacity-100 focus-visible:opacity-100";

/** Fenced code block with a copy button for its code (without the fences). */
function MarkdownPre({ node, children }: ComponentProps<"pre"> & ExtraProps) {
  const code = hastText(node).replace(/\n$/, "");
  return (
    <div className={`${INLINE_COPY_WRAPPER} my-2 first:mt-0 last:mb-0`}>
      {code && <CopyButton content={code} className={INLINE_COPY_BUTTON} />}
      <pre>{children}</pre>
    </div>
  );
}

/**
 * GFM table with a copy button: plain text is the table's markdown source,
 * and the rendered table goes along as HTML for spreadsheets/docs.
 */
function MarkdownTable({ node, children }: ComponentProps<"table"> & ExtraProps) {
  const source = useContext(MarkdownSourceContext);
  const tableRef = useRef<HTMLTableElement>(null);
  const getHtml = useCallback(() => tableRef.current?.outerHTML, []);
  const markdown = sliceNodeSource(source, node) ?? hastText(node);

  return (
    <div className={`${INLINE_COPY_WRAPPER} my-2`}>
      <CopyButton
        content={markdown}
        getHtml={getHtml}
        label="Copy table"
        title="Copies as Markdown; pastes as a table into spreadsheets and docs"
        className={INLINE_COPY_BUTTON}
      />
      <div className="overflow-x-auto">
        <table ref={tableRef} className="w-full text-xs">
          {children}
        </table>
      </div>
    </div>
  );
}

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
    <p className="my-1.5 text-sm leading-relaxed first:mt-0 last:mb-0 overflow-hidden">
      {children}
    </p>
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
    // Fenced blocks without a language have no className, but their text always
    // ends with "\n" (inline code never contains one)
    const isBlock =
      className?.includes("language-") || String(children).endsWith("\n");
    if (isBlock) {
      return (
        <code className="block overflow-x-auto rounded-md bg-gray-800 p-3 text-xs leading-relaxed text-gray-200 dark:bg-gray-900">
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-gray-200 px-1 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-200">
        {children}
      </code>
    );
  },
  pre: MarkdownPre,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-gray-300 pl-3 italic text-gray-600 dark:border-gray-600 dark:text-gray-400">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-gray-200 dark:border-gray-700" />,
  table: MarkdownTable,
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
};

interface MarkdownProps {
  content: string;
  className?: string;
}

export function Markdown({ content, className = "" }: MarkdownProps) {
  return (
    <div className={`min-w-0 ${className}`}>
      <MarkdownSourceContext.Provider value={content}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {content}
        </ReactMarkdown>
      </MarkdownSourceContext.Provider>
    </div>
  );
}
