// Content blocks inside assistant messages
export interface TextBlock {
  type: "text"
  text: string
}

export interface ThinkingBlock {
  type: "thinking"
  thinking: string
  signature?: string
}

export interface ToolUseBlock {
  type: "tool_use"
  id: string
  name: string
  input: Record<string, unknown>
  caller?: { type: string }
}

export type AssistantContentBlock = TextBlock | ThinkingBlock | ToolUseBlock

export interface AssistantMessage {
  model: string
  id: string
  type: "message"
  role: "assistant"
  content: AssistantContentBlock[]
  stop_reason: string | null
  usage: {
    input_tokens: number
    output_tokens: number
    cache_creation_input_tokens?: number
    cache_read_input_tokens?: number
    cache_creation?: Record<string, number>
    service_tier?: string
  }
}

// Tool result inside user content
export interface ToolResultContent {
  tool_use_id: string
  type: "tool_result"
  content: string
  is_error?: boolean
}

export type UserContent = string | ToolResultContent[]

export interface UserMessage {
  role: "user"
  content: UserContent
}

// Base fields present on most records
export interface BaseRecord {
  uuid: string
  parentUuid: string | null
  sessionId: string
  timestamp: string
  cwd?: string
  gitBranch?: string
  version?: string
  slug?: string
  isSidechain?: boolean
  userType?: string
}

export interface UserRecord extends BaseRecord {
  type: "user"
  message: UserMessage
  isMeta?: boolean
  permissionMode?: string
  toolUseResult?: {
    type?: string
    file?: {
      filePath: string
      content: string
      numLines: number
      startLine: number
      totalLines: number
    }
    stdout?: string
    stderr?: string
    interrupted?: boolean
    isImage?: boolean
  }
  sourceToolAssistantUUID?: string
}

export interface AssistantRecord extends BaseRecord {
  type: "assistant"
  message: AssistantMessage
  requestId?: string
}

export interface ProgressRecord {
  type: "progress" | "agent_progress" | "bash_progress"
  timestamp: string
  sessionId?: string
  uuid?: string
  data?: Record<string, unknown>
  toolUseID?: string
  parentToolUseID?: string
}

export interface FileHistoryRecord {
  type: "file-history-snapshot"
  messageId: string
  snapshot: Record<string, unknown>
  isSnapshotUpdate: boolean
  timestamp?: string
}

export interface SystemRecord extends BaseRecord {
  type: "system"
  subtype?: string
  content?: string
  level?: string
}

export interface QueueOperationRecord {
  type: "queue-operation"
  operation: string
  timestamp: string
  sessionId: string
  content: string
}

export type SessionRecord =
  | UserRecord
  | AssistantRecord
  | ProgressRecord
  | FileHistoryRecord
  | SystemRecord
  | QueueOperationRecord

// Processed conversation turn
export interface ConversationTurn {
  id: string
  role: "user" | "assistant" | "system"
  timestamp: string
  record: UserRecord | AssistantRecord | SystemRecord
  // For assistant turns: map tool_use_id → matching tool_result from next user message
  toolResults?: Map<
    string,
    ToolResultContent & { toolUseResult?: UserRecord["toolUseResult"] }
  >
}

export interface ParsedSession {
  sessionId: string
  model: string
  gitBranch: string
  cwd: string
  startTime: string
  endTime: string
  totalInputTokens: number
  totalOutputTokens: number
  turnCount: number
  turns: ConversationTurn[]
  fileName: string
}
