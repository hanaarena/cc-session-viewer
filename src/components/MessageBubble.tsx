import type {
  ConversationTurn,
  UserRecord,
  AssistantRecord,
  AssistantContentBlock,
} from "@/types/session"
import { formatTimestamp } from "@/lib/format"
import { ThinkingBlock } from "./ThinkingBlock"
import { ToolUseBlock } from "./ToolUseBlock"

interface MessageBubbleProps {
  turn: ConversationTurn
}

export function MessageBubble({ turn }: MessageBubbleProps) {
  if (turn.role === "user") {
    return <UserBubble record={turn.record as UserRecord} />
  }
  if (turn.role === "assistant") {
    return (
      <AssistantBubble
        record={turn.record as AssistantRecord}
        toolResults={turn.toolResults}
      />
    )
  }
  return null
}

function UserBubble({ record }: { record: UserRecord }) {
  const content = record.message.content
  if (typeof content !== "string") return null

  return (
    <div className="flex justify-end">
      <div className="max-w-[85%]">
        <div className="rounded-2xl rounded-br-md bg-blue-50 px-4 py-3 dark:bg-blue-950/40">
          <p className="whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100">
            {content}
          </p>
        </div>
        <p className="mt-1 text-right text-xs text-gray-400 dark:text-gray-600">
          {formatTimestamp(record.timestamp)}
        </p>
      </div>
    </div>
  )
}

function AssistantBubble({
  record,
  toolResults,
}: {
  record: AssistantRecord
  toolResults?: ConversationTurn["toolResults"]
}) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] min-w-0">
        <div className="rounded-2xl rounded-bl-md bg-gray-100 px-4 py-3 dark:bg-gray-800">
          {record.message.content.map((block, i) => (
            <ContentBlock
              key={i}
              block={block}
              toolResults={toolResults}
            />
          ))}
        </div>
        <div className="mt-1 flex gap-2 text-xs text-gray-400 dark:text-gray-600">
          <span>{formatTimestamp(record.timestamp)}</span>
          <span>{record.message.model}</span>
        </div>
      </div>
    </div>
  )
}

function ContentBlock({
  block,
  toolResults,
}: {
  block: AssistantContentBlock
  toolResults?: ConversationTurn["toolResults"]
}) {
  if (block.type === "text") {
    return (
      <p className="whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100">
        {block.text}
      </p>
    )
  }

  if (block.type === "thinking") {
    return <ThinkingBlock text={block.thinking} />
  }

  if (block.type === "tool_use") {
    const result = toolResults?.get(block.id)
    return <ToolUseBlock name={block.name} input={block.input} result={result} />
  }

  return null
}
