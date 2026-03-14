import type {
  SessionRecord,
  UserRecord,
  AssistantRecord,
  SystemRecord,
  ConversationTurn,
  ParsedSession,
  ToolResultContent,
  ToolUseBlock,
} from "@/types/session"

function isUserRecord(r: SessionRecord): r is UserRecord {
  return r.type === "user"
}

function isAssistantRecord(r: SessionRecord): r is AssistantRecord {
  return r.type === "assistant"
}

function isSystemRecord(r: SessionRecord): r is SystemRecord {
  return r.type === "system"
}

function isConversationRecord(
  r: SessionRecord,
): r is UserRecord | AssistantRecord | SystemRecord {
  return isUserRecord(r) || isAssistantRecord(r) || isSystemRecord(r)
}

export function buildConversation(
  records: SessionRecord[],
  fileName: string,
): ParsedSession {
  // Filter to conversation records, exclude sidechains
  const conversationRecords = records.filter(
    (r): r is UserRecord | AssistantRecord | SystemRecord =>
      isConversationRecord(r) && !r.isSidechain,
  )

  // Sort by timestamp
  conversationRecords.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  )

  // Deduplicate assistant records by requestId (keep last occurrence — most complete)
  const seenRequestIds = new Map<string, number>()
  for (let i = 0; i < conversationRecords.length; i++) {
    const r = conversationRecords[i]
    if (isAssistantRecord(r) && r.requestId) {
      seenRequestIds.set(r.requestId, i)
    }
  }

  const deduped = conversationRecords.filter((r, i) => {
    if (isAssistantRecord(r) && r.requestId) {
      return seenRequestIds.get(r.requestId) === i
    }
    return true
  })

  // Build turns and pair tool_use → tool_result
  const turns: ConversationTurn[] = []

  for (let i = 0; i < deduped.length; i++) {
    const record = deduped[i]

    if (isAssistantRecord(record)) {
      // Find tool_use blocks in this assistant message
      const toolUseBlocks = record.message.content.filter(
        (c): c is ToolUseBlock => c.type === "tool_use",
      )

      // Look ahead for tool_result in subsequent user messages
      const toolResults = new Map<
        string,
        ToolResultContent & { toolUseResult?: UserRecord["toolUseResult"] }
      >()

      if (toolUseBlocks.length > 0) {
        // Scan forward for user messages with tool results
        for (let j = i + 1; j < deduped.length; j++) {
          const next = deduped[j]
          if (isAssistantRecord(next)) break // stop at next assistant message

          if (isUserRecord(next) && Array.isArray(next.message.content)) {
            for (const content of next.message.content) {
              if (
                typeof content === "object" &&
                content.type === "tool_result"
              ) {
                toolResults.set(content.tool_use_id, {
                  ...content,
                  toolUseResult: next.toolUseResult,
                })
              }
            }
          }
        }
      }

      turns.push({
        id: record.uuid,
        role: "assistant",
        timestamp: record.timestamp,
        record,
        toolResults: toolResults.size > 0 ? toolResults : undefined,
      })
    } else if (isUserRecord(record)) {
      // Skip user messages that are purely tool results (they're paired with assistant turns)
      if (Array.isArray(record.message.content)) continue
      // Skip meta-only messages with no meaningful text
      if (
        record.isMeta &&
        typeof record.message.content === "string" &&
        !record.message.content.trim()
      )
        continue

      turns.push({
        id: record.uuid,
        role: "user",
        timestamp: record.timestamp,
        record,
      })
    } else if (isSystemRecord(record)) {
      turns.push({
        id: record.uuid,
        role: "system",
        timestamp: record.timestamp,
        record,
      })
    }
  }

  // Extract session metadata
  let sessionId = ""
  let model = ""
  let gitBranch = ""
  let cwd = ""
  let totalInputTokens = 0
  let totalOutputTokens = 0

  for (const record of deduped) {
    if (isAssistantRecord(record)) {
      if (!sessionId) sessionId = record.sessionId
      if (!model) model = record.message.model
      totalInputTokens += record.message.usage.input_tokens
      totalOutputTokens += record.message.usage.output_tokens
    }
    if ((isUserRecord(record) || isAssistantRecord(record)) && !gitBranch) {
      gitBranch = record.gitBranch ?? ""
      cwd = record.cwd ?? ""
    }
  }

  const startTime = deduped[0]?.timestamp ?? ""
  const endTime = deduped[deduped.length - 1]?.timestamp ?? ""

  return {
    sessionId,
    model,
    gitBranch,
    cwd,
    startTime,
    endTime,
    totalInputTokens,
    totalOutputTokens,
    turnCount: turns.length,
    turns,
    fileName,
  }
}
