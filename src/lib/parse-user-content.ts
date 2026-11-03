import type { UserContent, TextBlock, LocalCommandOutput } from "@/types/session"


// Flatten user message content
export function userContentToText(content: UserContent): string {
  if (typeof content === "string") return content
  return content
    .filter((b): b is TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n\n")
}

export function hasDisplayableUserContent(content: UserContent): boolean {
  if (typeof content === "string") return content.trim().length > 0
  return content.some(
    (b) =>
      b.type === "image" || (b.type === "text" && b.text.trim().length > 0),
  )
}

export interface ParsedUserContent {
  type: "text" | "command" | "task-notification" | "artifact-attached"
  /** The display text or markdown content */
  text: string
  /** For commands: the command name (e.g. "/gsd:plan-phase") */
  commandName?: string
  /** For commands: the args */
  commandArgs?: string
  /** For task notifications */
  taskStatus?: string
  taskSummary?: string
  taskResult?: string
  /** For artifact attachments: the artifact's claude.ai URL */
  artifactUrl?: string
  /** For artifact attachments: the artifact's title */
  artifactTitle?: string
  /** For artifact attachments: true when the artifact was authored by another user */
  artifactAuthoredByOthers?: boolean
  /** For artifact attachments: the guidance text Claude Code injected after the tag */
  artifactNote?: string
}

const XML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
}

function decodeXmlEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code =
        entity[1] === "x" || entity[1] === "X"
          ? parseInt(entity.slice(2), 16)
          : parseInt(entity.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : match
    }
    return XML_ENTITIES[entity.toLowerCase()] ?? match
  })
}

/** Parse `key="value"` pairs from the inside of an XML-like tag. */
function parseTagAttributes(source: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  for (const m of source.matchAll(/([\w-]+)\s*=\s*"([^"]*)"/g)) {
    attrs[m[1]] = decodeXmlEntities(m[2])
  }
  return attrs
}

/**
 * Parse local slash-command output (`<local-command-stdout>` / `<local-command-stderr>`).
 * Returns null unless the text starts with one of those tags — output records
 * hold nothing else, so a message that only mentions the tag isn't output.
 */
export function parseLocalCommandOutput(raw: string): LocalCommandOutput | null {
  if (!/^\s*<local-command-std(?:out|err)>/.test(raw)) return null
  const stdout = raw.match(/<local-command-stdout>([\s\S]*?)<\/local-command-stdout>/)
  const stderr = raw.match(/<local-command-stderr>([\s\S]*?)<\/local-command-stderr>/)
  if (!stdout && !stderr) return null
  return {
    stdout: stdout?.[1].trim() || undefined,
    stderr: stderr?.[1].trim() || undefined,
  }
}

/**
 * Parse user message content that may contain XML-like tags
 * from Claude Code (command-message, task-notification, etc.)
 */
export function parseUserContent(raw: string): ParsedUserContent {
  const trimmed = raw.trim()

  // Command messages: <command-message>cmd</command-message> <command-name>/cmd</command-name> <command-args>...</command-args>
  const commandMatch = trimmed.match(/<command-message>([\s\S]*?)<\/command-message>/)
  if (commandMatch) {
    const nameMatch = trimmed.match(/<command-name>([\s\S]*?)<\/command-name>/)
    const argsMatch = trimmed.match(/<command-args>([\s\S]*?)<\/command-args>/)
    return {
      type: "command",
      text: commandMatch[1].trim(),
      commandName: nameMatch?.[1]?.trim() ?? commandMatch[1].trim(),
      commandArgs: argsMatch?.[1]?.trim() ?? "",
    }
  }

  // Task notifications: <task-notification>...</task-notification>
  const taskMatch = trimmed.match(/<task-notification>([\s\S]*?)<\/task-notification>/)
  if (taskMatch) {
    const inner = taskMatch[1]
    const statusMatch = inner.match(/<status>([\s\S]*?)<\/status>/)
    const summaryMatch = inner.match(/<summary>([\s\S]*?)<\/summary>/)
    const resultMatch = inner.match(/<result>([\s\S]*?)<\/result>/)
    return {
      type: "task-notification",
      text: summaryMatch?.[1]?.trim() ?? "Task notification",
      taskStatus: statusMatch?.[1]?.trim(),
      taskSummary: summaryMatch?.[1]?.trim(),
      taskResult: resultMatch?.[1]?.trim(),
    }
  }

  // Artifact attachments: <artifact-attached url="..." title="..."/> followed by
  // an optional <artifact-content-authored-by-others/> marker and guidance text.
  const artifactMatch = trimmed.match(/^<artifact-attached\b([^>]*?)\/?>(?:\s*<\/artifact-attached>)?/)
  if (artifactMatch) {
    const attrs = parseTagAttributes(artifactMatch[1])
    const rest = trimmed.slice(artifactMatch[0].length)
    const othersPattern = /<artifact-content-authored-by-others\s*\/?>/
    const note = rest
      .replace(othersPattern, "")
      .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, "")
      .trim()
    return {
      type: "artifact-attached",
      text: attrs.title || attrs.url || "Artifact",
      artifactUrl: attrs.url,
      artifactTitle: attrs.title,
      artifactAuthoredByOthers: othersPattern.test(rest),
      artifactNote: note || undefined,
    }
  }

  // Strip any remaining XML-like system tags that wrap real content
  let cleaned = trimmed
  cleaned = cleaned.replace(/<local-command-caveat>[\s\S]*?<\/local-command-caveat>/g, "")
  cleaned = cleaned.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, "")
  cleaned = cleaned.replace(/<local-command-stdout>[\s\S]*?<\/local-command-stdout>/g, "")
  cleaned = cleaned.trim()

  return {
    type: "text",
    text: cleaned || raw,
  }
}
