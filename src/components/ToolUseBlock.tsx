import type { ToolResultContent, UserRecord } from "@/types/session"
import { CodeBlock } from "./CodeBlock"

interface ToolUseBlockProps {
  name: string
  input: Record<string, unknown>
  result?: ToolResultContent & { toolUseResult?: UserRecord["toolUseResult"] }
}

const TOOL_ICONS: Record<string, string> = {
  Read: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20",
  Write: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7",
  Edit: "M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z",
  Bash: "M4 17l6-6-6-6M12 19h8",
  Glob: "M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z",
  Grep: "M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z",
  Agent: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12 7a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
}

function ToolIcon({ name }: { name: string }) {
  const path = TOOL_ICONS[name]
  if (!path) return null

  return (
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
      <path d={path} />
    </svg>
  )
}

function getToolSummary(name: string, input: Record<string, unknown>): string {
  if (name === "Read" && input.file_path) return String(input.file_path)
  if (name === "Write" && input.file_path) return String(input.file_path)
  if (name === "Edit" && input.file_path) return String(input.file_path)
  if (name === "Bash" && input.command) {
    const cmd = String(input.command)
    return cmd.length > 80 ? cmd.slice(0, 80) + "..." : cmd
  }
  if (name === "Glob" && input.pattern) return String(input.pattern)
  if (name === "Grep" && input.pattern) return String(input.pattern)
  if (name === "Agent" && input.description) return String(input.description)
  return ""
}

function formatInput(name: string, input: Record<string, unknown>): string {
  // For common tools, show a cleaner display instead of raw JSON
  if (name === "Bash" && input.command) {
    return String(input.command)
  }
  if (name === "Edit" && input.old_string != null) {
    const parts: string[] = []
    if (input.file_path) parts.push(`file: ${input.file_path}`)
    parts.push(`- ${input.old_string}`)
    parts.push(`+ ${input.new_string}`)
    return parts.join("\n")
  }
  return JSON.stringify(input, null, 2)
}

export function ToolUseBlock({ name, input, result }: ToolUseBlockProps) {
  const summary = getToolSummary(name, input)
  const isError = result?.is_error
  const resultContent =
    result?.content ??
    result?.toolUseResult?.stdout ??
    result?.toolUseResult?.stderr ??
    ""

  return (
    <details className="my-2 rounded-lg border border-amber-200 dark:border-amber-800/40">
      <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs font-medium text-amber-700 select-none dark:text-amber-400">
        <ToolIcon name={name} />
        <span className="font-semibold">{name}</span>
        {summary && (
          <span className="min-w-0 truncate font-normal text-amber-600/70 dark:text-amber-500/60">
            {summary}
          </span>
        )}
        {isError && (
          <span className="ml-auto rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
            error
          </span>
        )}
      </summary>

      <div className="space-y-0 border-t border-amber-200 dark:border-amber-800/40">
        {/* Input */}
        <div className="bg-amber-50/50 p-3 dark:bg-amber-950/10">
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-amber-600/60 dark:text-amber-500/50">
            Input
          </div>
          <CodeBlock content={formatInput(name, input)} maxLines={30} />
        </div>

        {/* Result */}
        {resultContent && (
          <div
            className={`border-t p-3 ${
              isError
                ? "border-red-200 bg-red-50/50 dark:border-red-800/30 dark:bg-red-950/10"
                : "border-amber-200 bg-gray-50/50 dark:border-amber-800/40 dark:bg-gray-900/50"
            }`}
          >
            <div
              className={`mb-1 text-[10px] font-medium uppercase tracking-wider ${
                isError
                  ? "text-red-600/60 dark:text-red-500/50"
                  : "text-gray-500/60 dark:text-gray-500/50"
              }`}
            >
              Output
            </div>
            <CodeBlock content={String(resultContent)} />
          </div>
        )}
      </div>
    </details>
  )
}
