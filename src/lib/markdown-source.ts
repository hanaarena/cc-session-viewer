// Helpers for recovering copyable text from react-markdown's hast nodes.

interface SourcePoint {
  line: number
  column: number
  offset?: number
}

interface SourceNode {
  position?: { start: SourcePoint; end: SourcePoint }
}

interface HastLike {
  type: string
  value?: string
  children?: HastLike[]
}

/**
 * The markdown source a rendered node came from, e.g. a table's `| a | b |`
 * lines. A block nested in a list item or blockquote has its container prefix
 * (`   `, `> `) on every line after the first; that prefix is stripped so the
 * result stands on its own. Returns undefined when positions are missing.
 */
export function sliceNodeSource(source: string, node: SourceNode | undefined): string | undefined {
  const start = node?.position?.start
  const end = node?.position?.end
  if (start?.offset == null || end?.offset == null) return undefined

  const prefix = new RegExp(`^[ \\t>]{0,${start.column - 1}}`)
  return source
    .slice(start.offset, end.offset)
    .split("\n")
    .map((line, i) => (i === 0 ? line : line.replace(prefix, "")))
    .join("\n")
}

/** Concatenated text of a hast node, e.g. the code inside a `<pre>`. */
export function hastText(node: HastLike | undefined): string {
  if (!node) return ""
  if (node.type === "text") return node.value ?? ""
  return node.children?.map(hastText).join("") ?? ""
}
