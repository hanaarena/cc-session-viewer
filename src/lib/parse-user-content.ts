export interface ParsedUserContent {
  type: "text" | "command" | "task-notification"
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
