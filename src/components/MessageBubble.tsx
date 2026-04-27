import { useState, useMemo } from "react";
import type {
  ConversationTurn,
  UserRecord,
  AssistantRecord,
  SystemRecord,
  AssistantContentBlock,
} from "@/types/session";
import { formatTimestamp } from "@/lib/format";
import { parseUserContent } from "@/lib/parse-user-content";
import { Markdown } from "./Markdown";
import { ThinkingBlock } from "./ThinkingBlock";
import { ToolUseBlock } from "./ToolUseBlock";
import { CopyButton } from "./CopyButton";
import { DiffView } from "./DiffView";
import { detectDiff } from "@/lib/detect-diff";

interface MessageBubbleProps {
  turn: ConversationTurn;
}

export function MessageBubble({ turn }: MessageBubbleProps) {
  if (turn.role === "user") {
    return <UserBubble record={turn.record as UserRecord} />;
  }
  if (turn.role === "assistant") {
    return (
      <AssistantBubble
        record={turn.record as AssistantRecord}
        toolResults={turn.toolResults}
      />
    );
  }
  if (turn.role === "system") {
    return <SystemBubble record={turn.record as SystemRecord} />;
  }
  return null;
}

function UserBubble({ record }: { record: UserRecord }) {
  const content = record.message.content;
  if (typeof content !== "string") return null;

  const parsed = parseUserContent(content);

  if (parsed.type === "command") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%]">
          <div className="rounded-2xl rounded-br-md bg-indigo-100 px-4 py-2.5 shadow-sm dark:bg-indigo-900/40">
            <div className="flex items-center gap-2">
              <span className="rounded bg-indigo-200 px-1.5 py-0.5 font-mono text-xs text-indigo-800 dark:bg-indigo-800/60 dark:text-indigo-300">
                {parsed.commandName}
              </span>
              {parsed.commandArgs && (
                <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400">
                  {parsed.commandArgs}
                </span>
              )}
            </div>
          </div>
          <p className="mt-1 text-right text-xs text-gray-400 dark:text-gray-600">
            {formatTimestamp(record.timestamp)}
          </p>
        </div>
      </div>
    );
  }

  if (parsed.type === "task-notification") {
    const statusColor =
      parsed.taskStatus === "completed"
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
        : parsed.taskStatus === "killed"
          ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";

    return (
      <div className="flex justify-center">
        <div className="max-w-[90%]">
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800/80">
            <div className="flex items-center gap-2">
              {parsed.taskStatus && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor}`}
                >
                  {parsed.taskStatus}
                </span>
              )}
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {parsed.taskSummary}
              </span>
            </div>
            {parsed.taskResult && (
              <details className="group/task mt-2">
                <summary className="sticky top-0 z-10 flex cursor-pointer items-center justify-between gap-2 bg-white/95 text-xs text-gray-500 backdrop-blur-sm dark:bg-gray-800/95 dark:text-gray-400">
                  <span>Show result</span>
                  <CopyButton
                    content={parsed.taskResult}
                    label="Copy markdown"
                    className="hidden group-open/task:inline-flex"
                  />
                </summary>
                <div className="mt-1.5 max-h-[70vh] overflow-y-auto">
                  <Markdown
                    content={parsed.taskResult}
                    className="text-gray-700 dark:text-gray-300"
                  />
                </div>
              </details>
            )}
          </div>
          <p className="mt-1 text-center text-xs text-gray-400 dark:text-gray-600">
            {formatTimestamp(record.timestamp)}
          </p>
        </div>
      </div>
    );
  }

  // Regular text message — render as markdown
  const isLong = parsed.text.length > 800;

  return (
    <div className="flex justify-end">
      <div className="max-w-[85%]">
        <div className="overflow-hidden rounded-2xl rounded-br-md bg-blue-100 shadow-sm dark:bg-blue-900/40">
          {isLong && (
            <div className="sticky top-0 z-10 border-b border-blue-200/60 bg-blue-100/95 px-4 py-1.5 text-right backdrop-blur-sm dark:border-blue-800/40 dark:bg-blue-900/80">
              <span className="text-xs text-blue-500 dark:text-blue-400">
                {formatTimestamp(record.timestamp)}
              </span>
            </div>
          )}
          <div
            className={
              isLong ? "max-h-[70vh] overflow-y-auto px-4 py-3" : "px-4 py-3"
            }
          >
            <Markdown
              content={parsed.text}
              className="text-blue-900 [&_a]:text-blue-700 [&_a]:decoration-blue-400 [&_code]:bg-blue-200/60 [&_code]:text-blue-800 [&_strong]:text-blue-950 dark:text-blue-100 dark:[&_a]:text-blue-300 dark:[&_code]:bg-blue-800/40 dark:[&_code]:text-blue-200 dark:[&_strong]:text-white"
            />
          </div>
        </div>
        {!isLong && (
          <p className="mt-1 text-right text-xs text-gray-400 dark:text-gray-600">
            {formatTimestamp(record.timestamp)}
          </p>
        )}
      </div>
    </div>
  );
}

function AssistantBubble({
  record,
  toolResults,
}: {
  record: AssistantRecord;
  toolResults?: ConversationTurn["toolResults"];
}) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] min-w-0">
        <div className="rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
          {record.message.content.map((block, i) => (
            <ContentBlock key={i} block={block} toolResults={toolResults} />
          ))}
        </div>
        <div className="mt-1 flex gap-2 text-xs text-gray-400 dark:text-gray-500">
          <span>{formatTimestamp(record.timestamp)}</span>
          <span className="text-gray-300 dark:text-gray-600">
            {record.message.model}
          </span>
        </div>
      </div>
    </div>
  );
}

function SystemBubble({ record }: { record: SystemRecord }) {
  if (!record.content?.trim()) return null;

  return (
    <div className="flex justify-center">
      <div className="rounded-full bg-gray-200 px-3 py-1 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
        {record.content}
      </div>
    </div>
  );
}

/** Truncate text at a paragraph/line boundary near the midpoint. */
function truncateAtBreak(text: string): string {
  const mid = Math.floor(text.length / 2);
  // Look for a double-newline (paragraph break) near the midpoint
  const paraBreak = text.indexOf("\n\n", mid);
  if (paraBreak !== -1 && paraBreak < mid + 200)
    return text.slice(0, paraBreak);
  // Fall back to a single newline
  const lineBreak = text.indexOf("\n", mid);
  if (lineBreak !== -1 && lineBreak < mid + 200)
    return text.slice(0, lineBreak);
  return text.slice(0, mid);
}

const COLLAPSE_THRESHOLD = 800;

function TextBlock({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const diffMatch = useMemo(() => detectDiff(text), [text]);
  const isLong = text.length > COLLAPSE_THRESHOLD;
  const truncated = useMemo(
    () => (isLong ? truncateAtBreak(text) : text),
    [text, isLong],
  );

  if (diffMatch) {
    return (
      <div>
        {diffMatch.before.trim() && (
          <Markdown
            content={diffMatch.before}
            className="text-gray-800 dark:text-gray-200"
          />
        )}
        <DiffView diff={diffMatch.diff} />
        {diffMatch.after.trim() && (
          <Markdown
            content={diffMatch.after}
            className="text-gray-800 dark:text-gray-200"
          />
        )}
      </div>
    );
  }

  if (!isLong || expanded) {
    return (
      <div className="group relative">
        <CopyButton
          content={text}
          label="Copy markdown"
          className="absolute right-0 top-0 z-10 opacity-0 group-hover:opacity-100"
        />
        <Markdown content={text} className="text-gray-800 dark:text-gray-200" />
      </div>
    );
  }

  return (
    <div className="group relative">
      <CopyButton
        content={text}
        className="absolute right-0 top-0 z-10 opacity-0 group-hover:opacity-100"
      />
      <Markdown
        content={truncated}
        className="text-gray-800 dark:text-gray-200"
      />
      {/* Fade mask */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white dark:from-gray-800" />
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="relative z-10 mt-1 w-full py-1.5 cursor-pointer text-center text-xs font-medium text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
      >
        Show more
      </button>
    </div>
  );
}

function ContentBlock({
  block,
  toolResults,
}: {
  block: AssistantContentBlock;
  toolResults?: ConversationTurn["toolResults"];
}) {
  if (block.type === "text") {
    return <TextBlock text={block.text} />;
  }

  if (block.type === "thinking") {
    return <ThinkingBlock text={block.thinking} />;
  }

  if (block.type === "tool_use") {
    const result = toolResults?.get(block.id);
    return (
      <ToolUseBlock name={block.name} input={block.input} result={result} />
    );
  }

  return null;
}
