import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ParsedSession,
  ConversationTurn,
  UserRecord,
  AssistantRecord,
} from "@/types/session";
import { parseUserContent } from "@/lib/parse-user-content";
import { formatTimestamp } from "@/lib/format";

interface SidePanelProps {
  session: ParsedSession;
  activeTurnIndex: number;
  onSelectTurn: (turnIndex: number) => void;
}

interface MainTurn {
  /** Index in session.turns — used for scrollToIndex */
  turnIndex: number;
  turn: ConversationTurn;
  kind: "text" | "command" | "task";
  text: string;
  meta?: string;
}

/**
 * "Main" turn = user message OR assistant message with non-empty text content.
 * Pure-tool-use assistant turns (Read/Bash/Grep/etc.) are excluded.
 */
function isMainTurn(turn: ConversationTurn): boolean {
  if (turn.role === "system") return false;
  if (turn.role === "user") {
    const content = (turn.record as UserRecord).message.content;
    if (typeof content !== "string") return false;
    return content.trim().length > 0;
  }
  if (turn.role === "assistant") {
    const blocks = (turn.record as AssistantRecord).message.content;
    return blocks.some((b) => b.type === "text" && b.text.trim().length > 0);
  }
  return false;
}

function snippetFromMarkdown(text: string, maxLen = 120): string {
  const stripped = text
    .replace(/```[\s\S]*?```/g, " [code] ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .trim();

  const firstLine =
    stripped.split(/\n+/).find((l) => l.trim().length > 0) ?? stripped;
  const collapsed = firstLine.replace(/\s+/g, " ").trim();
  return collapsed.length > maxLen
    ? collapsed.slice(0, maxLen).trimEnd() + "…"
    : collapsed;
}

function describeTurn(
  turn: ConversationTurn,
): Omit<MainTurn, "turnIndex" | "turn"> {
  if (turn.role === "user") {
    const content = (turn.record as UserRecord).message.content;
    const raw = typeof content === "string" ? content : "";
    const parsed = parseUserContent(raw);
    if (parsed.type === "command") {
      return {
        kind: "command",
        text: parsed.commandName ?? raw,
        meta: parsed.commandArgs || undefined,
      };
    }
    if (parsed.type === "task-notification") {
      return {
        kind: "task",
        text: parsed.taskSummary ?? "Task notification",
        meta: parsed.taskStatus,
      };
    }
    return { kind: "text", text: snippetFromMarkdown(parsed.text) };
  }

  // assistant
  const blocks = (turn.record as AssistantRecord).message.content;
  const firstText = blocks.find(
    (b): b is { type: "text"; text: string } =>
      b.type === "text" && b.text.trim().length > 0,
  );
  return { kind: "text", text: snippetFromMarkdown(firstText?.text ?? "") };
}

export function SidePanel({
  session,
  activeTurnIndex,
  onSelectTurn,
}: SidePanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  const mainTurns = useMemo<MainTurn[]>(() => {
    const out: MainTurn[] = [];
    for (let i = 0; i < session.turns.length; i++) {
      const turn = session.turns[i];
      if (!isMainTurn(turn)) continue;
      out.push({
        turnIndex: i,
        turn,
        ...describeTurn(turn),
      });
    }
    return out;
  }, [session.turns]);

  // Find the side-panel item that matches the active turn (or the closest preceding main turn)
  const activeMainIndex = useMemo(() => {
    let bestIdx = -1;
    for (let i = 0; i < mainTurns.length; i++) {
      if (mainTurns[i].turnIndex <= activeTurnIndex) {
        bestIdx = i;
      } else {
        break;
      }
    }
    return bestIdx;
  }, [mainTurns, activeTurnIndex]);

  // Auto-scroll the active item into view within the panel
  useEffect(() => {
    if (activeMainIndex < 0) return;
    const item = itemRefs.current.get(activeMainIndex);
    const list = listRef.current;
    if (!item || !list) return;
    const itemTop = item.offsetTop;
    const itemBottom = itemTop + item.offsetHeight;
    const viewTop = list.scrollTop;
    const viewBottom = viewTop + list.clientHeight;
    if (itemTop < viewTop || itemBottom > viewBottom) {
      item.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activeMainIndex]);

  if (collapsed) {
    return (
      <div className="flex h-full w-10 shrink-0 flex-col items-center border-r border-gray-200 bg-white py-2 dark:border-gray-800 dark:bg-gray-900">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label="Expand turn list"
          title="Expand turn list"
          className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <aside className="hidden h-full w-72 shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 lg:flex">
      <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2 dark:border-gray-800">
        <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Turns · {mainTurns.length}
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label="Collapse turn list"
          title="Collapse"
          className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto">
        {mainTurns.length === 0 ? (
          <div className="px-3 py-4 text-xs text-gray-400 dark:text-gray-500">
            No main turns
          </div>
        ) : (
          <ul className="py-1">
            {mainTurns.map((item, i) => (
              <li key={item.turn.id}>
                <SidePanelItem
                  ref={(node) => {
                    if (node) itemRefs.current.set(i, node);
                    else itemRefs.current.delete(i);
                  }}
                  item={item}
                  active={i === activeMainIndex}
                  onClick={() => onSelectTurn(item.turnIndex)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

interface SidePanelItemProps {
  item: MainTurn;
  active: boolean;
  onClick: () => void;
  ref?: React.Ref<HTMLButtonElement>;
}

function SidePanelItem({ item, active, onClick, ref }: SidePanelItemProps) {
  const role = item.turn.role;
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className={`group flex w-full items-start gap-2 px-3 py-2 text-left transition-colors ${
        active
          ? "bg-blue-50 dark:bg-blue-900/20"
          : "hover:bg-gray-50 dark:hover:bg-gray-800/60"
      }`}
    >
      <RoleDot role={role} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <RoleBadge role={role} kind={item.kind} />
          {item.kind === "task" && item.meta && (
            <span
              className={`shrink-0 rounded px-1 py-px text-[9px] font-medium ${
                item.meta === "completed"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                  : item.meta === "killed"
                    ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
              }`}
            >
              {item.meta}
            </span>
          )}
          <span className="ml-auto shrink-0 text-[10px] text-gray-400 dark:text-gray-600">
            {formatTimestamp(item.turn.timestamp)}
          </span>
        </div>
        <p
          className={`mt-0.5 line-clamp-2 break-words text-xs leading-snug ${
            item.kind === "command"
              ? "font-mono text-indigo-700 dark:text-indigo-400"
              : "text-gray-700 dark:text-gray-300"
          }`}
        >
          {item.text || <span className="text-gray-400 italic">(empty)</span>}
          {item.kind === "command" && item.meta ? (
            <span className="ml-1 text-gray-500 dark:text-gray-500">
              {item.meta}
            </span>
          ) : null}
        </p>
      </div>
    </button>
  );
}

function RoleDot({ role }: { role: ConversationTurn["role"] }) {
  const color =
    role === "user"
      ? "bg-blue-400"
      : role === "assistant"
        ? "bg-gray-400 dark:bg-gray-500"
        : "bg-gray-300 dark:bg-gray-700";
  return (
    <span
      className={`mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${color}`}
    />
  );
}

function RoleBadge({
  role,
  kind,
}: {
  role: ConversationTurn["role"];
  kind: MainTurn["kind"];
}) {
  const label =
    kind === "command"
      ? "cmd"
      : kind === "task"
        ? "task"
        : role === "user"
          ? "you"
          : role === "assistant"
            ? "AI"
            : role;
  const cls =
    kind === "command"
      ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
      : kind === "task"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        : role === "user"
          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  return (
    <span
      className={`shrink-0 rounded px-1 py-px text-[9px] font-medium uppercase tracking-wide ${cls}`}
    >
      {label}
    </span>
  );
}
