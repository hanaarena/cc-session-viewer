import { useState, useCallback } from "react";

interface CopyButtonProps {
  content: string;
  /**
   * Optional rich version, written to the clipboard as text/html next to the
   * plain text, so e.g. a table pastes as a real table into spreadsheets/docs.
   * Called at click time.
   */
  getHtml?: () => string | undefined;
  className?: string;
  label?: string;
  copiedLabel?: string;
  title?: string;
}

export function CopyButton({
  content,
  getHtml,
  className = "",
  label = "Copy",
  copiedLabel = "Copied",
  title,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        const html = getHtml?.();
        if (html && typeof ClipboardItem !== "undefined") {
          await navigator.clipboard.write([
            new ClipboardItem({
              "text/plain": new Blob([content], { type: "text/plain" }),
              "text/html": new Blob([html], { type: "text/html" }),
            }),
          ]);
        } else {
          await navigator.clipboard.writeText(content);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Clipboard unavailable — silently ignore
      }
    },
    [content, getHtml],
  );

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={title}
      className={`inline-flex cursor-pointer items-center rounded bg-gray-200 px-1.5 py-0.5 text-[10px] text-gray-600 transition-opacity hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 ${className}`}
    >
      {copied ? copiedLabel : label}
    </button>
  );
}
