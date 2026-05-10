import { useRef, useEffect, useState } from "react";
import type { ParsedSession } from "@/types/session";
import type { SearchMatch } from "@/hooks/use-search";
import { formatDuration, formatTokens, formatTimestamp } from "@/lib/format";

interface SessionMetaProps {
  session: ParsedSession;
  onBack: () => void;
  query: string;
  onQueryChange: (q: string) => void;
  matches: SearchMatch[];
  activeMatchIndex: number;
  onSelectMatch: (index: number) => void;
  onNextMatch: () => void;
  onPrevMatch: () => void;
}

export function SessionMeta({
  session,
  onBack,
  query,
  onQueryChange,
  matches,
  activeMatchIndex,
  onSelectMatch,
  onNextMatch,
  onPrevMatch,
}: SessionMetaProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Show dropdown when there are matches
  useEffect(() => {
    if (matches.length > 0 && query.trim()) {
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  }, [matches, query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        onPrevMatch();
      } else {
        onNextMatch();
      }
    }
    if (e.key === "Escape") {
      onQueryChange("");
      inputRef.current?.blur();
    }
  };

  return (
    <div className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      {/* Top row: back + filename + metadata */}
      <div className="flex items-center gap-4 px-4 py-2.5">
        <button
          onClick={onBack}
          className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <svg
            width="20"
            height="20"
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

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
            {session.fileName}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          {session.isSubAgent && (
            <span
              className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              title={
                session.agentId ? `agentId: ${session.agentId}` : undefined
              }
            >
              Sub-agent{session.agentId ? ` · ${session.agentId}` : ""}
            </span>
          )}
          {session.model && (
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
              {session.model}
            </span>
          )}
          {session.gitBranch && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              {session.gitBranch}
            </span>
          )}
          {session.cwd && (
            <span
              className="hidden max-w-[200px] truncate rounded-full bg-gray-100 px-2 py-0.5 sm:inline dark:bg-gray-800"
              title={session.cwd}
            >
              {session.cwd}
            </span>
          )}
          <span>{session.turnCount} rounds</span>
          <span>
            {formatTokens(session.totalInputTokens)} in /{" "}
            {formatTokens(session.totalOutputTokens)} out
          </span>
          {session.startTime && session.endTime && (
            <span>{formatDuration(session.startTime, session.endTime)}</span>
          )}
        </div>
      </div>

      {/* Search row */}
      <div className="relative border-t border-gray-100 px-4 py-2 dark:border-gray-800">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 text-gray-400 dark:text-gray-500"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (matches.length > 0) setShowDropdown(true);
            }}
            placeholder="Search messages..."
            className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-gray-100 dark:placeholder:text-gray-500"
          />
          {query && (
            <div className="flex items-center gap-1.5">
              {matches.length > 0 && (
                <>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {activeMatchIndex + 1}/{matches.length}
                  </span>
                  <button
                    onClick={onPrevMatch}
                    className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
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
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  </button>
                  <button
                    onClick={onNextMatch}
                    className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
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
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                </>
              )}
              {matches.length === 0 && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  No results
                </span>
              )}
              <button
                onClick={() => onQueryChange("")}
                className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
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
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Search results dropdown */}
        {showDropdown && matches.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute left-0 right-0 top-full z-30 max-h-64 overflow-y-auto border-t border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
          >
            {matches.map((match, i) => (
              <button
                key={match.turnIndex}
                onClick={() => {
                  onSelectMatch(i);
                  setShowDropdown(false);
                }}
                className={`flex w-full items-start gap-3 px-4 py-2 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                  i === activeMatchIndex ? "bg-blue-50 dark:bg-blue-900/20" : ""
                }`}
              >
                <span
                  className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    match.turn.role === "user"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {match.turn.role}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-gray-700 dark:text-gray-300">
                    <HighlightSnippet text={match.snippet} query={query} />
                  </p>
                  <p className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-600">
                    {formatTimestamp(match.turn.timestamp)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HighlightSnippet({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;

  const parts: { text: string; highlight: boolean }[] = [];
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  let lastIndex = 0;

  let idx = lower.indexOf(q, lastIndex);
  while (idx !== -1) {
    if (idx > lastIndex) {
      parts.push({ text: text.slice(lastIndex, idx), highlight: false });
    }
    parts.push({ text: text.slice(idx, idx + q.length), highlight: true });
    lastIndex = idx + q.length;
    idx = lower.indexOf(q, lastIndex);
  }
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), highlight: false });
  }

  return (
    <>
      {parts.map((part, i) =>
        part.highlight ? (
          <mark
            key={i}
            className="rounded bg-yellow-200 px-0.5 text-yellow-900 dark:bg-yellow-700/50 dark:text-yellow-200"
          >
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}
