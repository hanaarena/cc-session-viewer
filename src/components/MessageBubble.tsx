import { useState, useMemo } from "react";
import type {
  ConversationTurn,
  UserRecord,
  AssistantRecord,
  SystemRecord,
  AssistantContentBlock,
  UserContentBlock,
  TextBlock,
  ImageBlock,
  LocalCommandOutput,
} from "@/types/session";
import { formatTimestamp } from "@/lib/format";
import {
  parseUserContent,
  parseLocalCommandOutput,
  type ParsedUserContent,
} from "@/lib/parse-user-content";
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
    return (
      <UserBubble
        record={turn.record as UserRecord}
        commandOutput={turn.commandOutput}
      />
    );
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
    return (
      <SystemBubble
        record={turn.record as SystemRecord}
        commandOutput={turn.commandOutput}
      />
    );
  }
  return null;
}

// Shared text styling for the blue user bubble.
const USER_TEXT_CLASS =
  "text-blue-900 [&_a]:text-blue-700 [&_a]:decoration-blue-400 [&_code]:bg-blue-200/60 [&_code]:text-blue-800 [&_strong]:text-blue-950 dark:text-blue-100 dark:[&_a]:text-blue-300 dark:[&_code]:bg-blue-800/40 dark:[&_code]:text-blue-200 dark:[&_strong]:text-white";

function UserBubble({
  record,
  commandOutput,
}: {
  record: UserRecord;
  commandOutput?: LocalCommandOutput;
}) {
  const content = record.message.content;

  // Structured content (pasted images, multi-block text) arrives as an array.
  if (Array.isArray(content)) {
    return <UserBlocksBubble blocks={content} timestamp={record.timestamp} />;
  }

  // Local command output whose invocation record is missing (older sessions
  // store it as a user record; paired output is folded into the command turn)
  const orphanOutput = parseLocalCommandOutput(content);
  if (orphanOutput) {
    return <CommandBubble output={orphanOutput} timestamp={record.timestamp} />;
  }

  const parsed = parseUserContent(content);

  if (parsed.type === "command") {
    return (
      <CommandBubble
        name={parsed.commandName}
        args={parsed.commandArgs}
        output={commandOutput}
        timestamp={record.timestamp}
      />
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

  if (parsed.type === "artifact-attached") {
    return (
      <ArtifactAttachedBubble parsed={parsed} timestamp={record.timestamp} />
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
            <Markdown content={parsed.text} className={USER_TEXT_CLASS} />
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

/** Only link out to http(s) URLs — session files are untrusted input. */
function isSafeHttpUrl(url: string | undefined): url is string {
  return !!url && /^https?:\/\//i.test(url);
}

/** Card for `<artifact-attached url="..." title="..."/>`: the user attached a claude.ai artifact to the session. */
function ArtifactAttachedBubble({
  parsed,
  timestamp,
}: {
  parsed: ParsedUserContent;
  timestamp: string;
}) {
  const url = parsed.artifactUrl;
  const linkable = isSafeHttpUrl(url);
  const title = parsed.artifactTitle || "Untitled artifact";
  const displayUrl = url?.replace(/^https?:\/\//i, "");

  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] min-w-0">
        <div className="rounded-2xl rounded-br-md bg-violet-100 px-4 py-3 shadow-sm dark:bg-violet-900/40">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded bg-violet-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-800 dark:bg-violet-800/60 dark:text-violet-200">
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
              Artifact attached
            </span>
            {parsed.artifactAuthoredByOthers && (
              <span
                className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                title="This artifact's content was authored by another user"
              >
                by others
              </span>
            )}
          </div>

          <div className="mt-2 flex items-start gap-3 rounded-xl bg-white/70 px-3 py-2.5 ring-1 ring-violet-200 dark:bg-gray-900/40 dark:ring-violet-800/50">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-300">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              {linkable ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block break-words text-sm font-medium text-violet-900 hover:underline dark:text-violet-100"
                >
                  {title}
                </a>
              ) : (
                <p className="break-words text-sm font-medium text-violet-900 dark:text-violet-100">
                  {title}
                </p>
              )}
              {displayUrl && (
                <p className="mt-0.5 truncate font-mono text-[11px] text-violet-600/80 dark:text-violet-300/70">
                  {displayUrl}
                </p>
              )}
            </div>
            {url && (
              <CopyButton content={url} label="Copy link" className="shrink-0" />
            )}
          </div>

          {parsed.artifactNote && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-violet-600 dark:text-violet-300">
                Show injected context
              </summary>
              <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-violet-900/80 dark:text-violet-100/70">
                {parsed.artifactNote}
              </p>
            </details>
          )}
        </div>
        <p className="mt-1 text-right text-xs text-gray-400 dark:text-gray-600">
          {formatTimestamp(timestamp)}
        </p>
      </div>
    </div>
  );
}

/** User message whose content is a block array (text + pasted images). */
function UserBlocksBubble({
  blocks,
  timestamp,
}: {
  blocks: UserContentBlock[];
  timestamp: string;
}) {
  // tool_result blocks are shown with their paired assistant turn, not here.
  const renderable = blocks.filter(
    (b): b is TextBlock | ImageBlock =>
      b.type === "text" || b.type === "image",
  );
  if (renderable.length === 0) return null;

  return (
    <div className="flex justify-end">
      <div className="max-w-[85%]">
        <div className="space-y-2 overflow-hidden rounded-2xl rounded-br-md bg-blue-100 px-4 py-3 shadow-sm dark:bg-blue-900/40">
          {renderable.map((block, i) =>
            block.type === "image" ? (
              <ImageContent key={i} source={block.source} />
            ) : (
              <Markdown
                key={i}
                content={parseUserContent(block.text).text}
                className={USER_TEXT_CLASS}
              />
            ),
          )}
        </div>
        <p className="mt-1 text-right text-xs text-gray-400 dark:text-gray-600">
          {formatTimestamp(timestamp)}
        </p>
      </div>
    </div>
  );
}

/** Render an image content block (base64 data URL or remote URL), click to open full size. */
function ImageContent({ source }: { source: ImageBlock["source"] }) {
  const src =
    source.type === "base64"
      ? `data:${source.media_type};base64,${source.data}`
      : source.url;

  return (
    <a
      href={src}
      target="_blank"
      rel="noopener noreferrer"
      className="block w-fit"
      title="Open image in new tab"
    >
      <img
        src={src}
        alt="Attached image"
        loading="lazy"
        className="max-h-96 w-auto max-w-full rounded-lg border border-blue-200/70 object-contain transition-opacity hover:opacity-90 dark:border-blue-800/50"
      />
    </a>
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

/** A slash command the user ran, optionally with its local output. */
function CommandBubble({
  name,
  args,
  output,
  timestamp,
}: {
  name?: string;
  args?: string;
  output?: LocalCommandOutput;
  timestamp: string;
}) {
  const hasOutput = !!(output?.stdout || output?.stderr);

  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] min-w-0">
        <div className="rounded-2xl rounded-br-md bg-indigo-100 px-4 py-2.5 shadow-sm dark:bg-indigo-900/40">
          {name && (
            <div className="flex items-center gap-2">
              <span className="rounded bg-indigo-200 px-1.5 py-0.5 font-mono text-xs text-indigo-800 dark:bg-indigo-800/60 dark:text-indigo-300">
                {name}
              </span>
              {args && (
                <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400">
                  {args}
                </span>
              )}
            </div>
          )}
          {hasOutput && (
            <div className={name ? "mt-2 space-y-1.5" : "space-y-1.5"}>
              {output?.stdout && <CommandOutputText text={output.stdout} />}
              {output?.stderr && (
                <CommandOutputText text={output.stderr} isError />
              )}
            </div>
          )}
        </div>
        <p className="mt-1 text-right text-xs text-gray-400 dark:text-gray-600">
          {formatTimestamp(timestamp)}
        </p>
      </div>
    </div>
  );
}

const URL_PATTERN = /(https?:\/\/[^\s<>"'`)\]]*[^\s<>"'`)\].,;:!?])/g;

/** Plain-text command output, with http(s) URLs made clickable. */
function CommandOutputText({
  text,
  isError,
}: {
  text: string;
  isError?: boolean;
}) {
  // split() with a capturing group puts the URL matches at odd indices
  const parts = text.split(URL_PATTERN);
  return (
    <pre
      className={`max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg px-3 py-2 font-mono text-xs leading-relaxed ${
        isError
          ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
          : "bg-white/70 text-indigo-950 dark:bg-gray-900/50 dark:text-indigo-100"
      }`}
    >
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300"
          >
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </pre>
  );
}

function SystemBubble({
  record,
  commandOutput,
}: {
  record: SystemRecord;
  commandOutput?: LocalCommandOutput;
}) {
  if (!record.content?.trim()) return null;

  // Local slash commands (/status, /artifacts, ...) run without the model
  if (record.subtype === "local_command") {
    const parsed = parseUserContent(record.content);
    if (parsed.type === "command") {
      return (
        <CommandBubble
          name={parsed.commandName}
          args={parsed.commandArgs}
          output={commandOutput}
          timestamp={record.timestamp}
        />
      );
    }
    // Output whose invocation record is missing
    const output = parseLocalCommandOutput(record.content);
    if (output) {
      return <CommandBubble output={output} timestamp={record.timestamp} />;
    }
  }

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
