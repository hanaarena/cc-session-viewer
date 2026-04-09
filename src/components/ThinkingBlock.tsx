import { useState, useCallback, useMemo } from "react";

interface ThinkingBlockProps {
  text: string;
}

/** Format character count as human-readable label */
function formatCharCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M chars`;
  if (count >= 1_000) return `${Math.round(count / 1_000)}K chars`;
  return `${count} chars`;
}

/** Brain/thinking SVG icon */
function ThinkingIcon() {
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
      <path d="M12 2a8 8 0 0 0-8 8c0 3.4 2.1 6.3 5 7.4V20a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-2.6c2.9-1.1 5-4 5-7.4a8 8 0 0 0-8-8z" />
      <path d="M10 14.5a2 2 0 0 0 4 0" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  );
}

/**
 * Minimal inline formatter: renders **bold** markers as <strong> and
 * preserves whitespace/newlines. Avoids pulling in full Markdown renderer
 * for what is essentially plain reasoning text.
 */
function formatThinkingText(text: string) {
  // Split on **..** patterns, alternating between normal and bold segments
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-purple-800 dark:text-purple-200">
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function ThinkingBlock({ text }: ThinkingBlockProps) {
  const charCount = text.length;

  // Lazy-render: only mount content once opened (matches ToolUseBlock pattern)
  const [hasOpened, setHasOpened] = useState(false);
  const handleToggle = useCallback(
    (e: React.ToggleEvent<HTMLDetailsElement>) => {
      if (e.newState === "open" && !hasOpened) setHasOpened(true);
    },
    [hasOpened],
  );

  const formatted = useMemo(() => formatThinkingText(text), [text]);

  return (
    <details
      className="group/thinking my-2 rounded-lg border border-purple-200 dark:border-purple-800/50"
      onToggle={handleToggle}
    >
      <summary className="sticky top-0 z-10 flex cursor-pointer items-center gap-2 rounded-t-lg bg-white/95 px-3 py-2 text-xs font-medium text-purple-600 backdrop-blur-sm select-none group-open/thinking:border-b group-open/thinking:border-purple-200 dark:bg-gray-800/95 dark:text-purple-400 dark:group-open/thinking:border-purple-800/50">
        <ThinkingIcon />
        <span className="font-semibold">Thinking</span>
        <span className="ml-auto rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-600 dark:bg-purple-900/40 dark:text-purple-400">
          {formatCharCount(charCount)}
        </span>
      </summary>

      {hasOpened && (
        <div
          className="max-h-[70vh] overflow-y-auto bg-purple-50/50 p-3 dark:bg-purple-950/20"
          style={{ contentVisibility: "auto" }}
        >
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-purple-900 dark:text-purple-200">
            {formatted}
          </p>
        </div>
      )}
    </details>
  );
}
