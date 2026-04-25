import { useState, useCallback } from "react";

interface CopyButtonProps {
  content: string;
  className?: string;
  label?: string;
  copiedLabel?: string;
}

export function CopyButton({
  content,
  className = "",
  label = "Copy",
  copiedLabel = "Copied",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Clipboard unavailable — silently ignore
      }
    },
    [content],
  );

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex cursor-pointer items-center rounded bg-gray-200 px-1.5 py-0.5 text-[10px] text-gray-600 transition-opacity hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 ${className}`}
    >
      {copied ? copiedLabel : label}
    </button>
  );
}
