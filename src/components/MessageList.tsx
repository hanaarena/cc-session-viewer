import { useRef, useCallback } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import type { ParsedSession } from "@/types/session"
import { MessageBubble } from "./MessageBubble"

interface MessageListProps {
  session: ParsedSession
}

export function MessageList({ session }: MessageListProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: session.turns.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 5,
  })

  const measureRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) {
        const index = Number(node.dataset.index)
        if (!isNaN(index)) {
          virtualizer.measureElement(node)
        }
      }
    },
    [virtualizer],
  )

  return (
    <div ref={parentRef} className="h-full overflow-y-auto">
      <div
        className="relative mx-auto w-full max-w-3xl"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const turn = session.turns[virtualRow.index]
          return (
            <div
              key={turn.id}
              ref={measureRef}
              data-index={virtualRow.index}
              className="absolute left-0 w-full px-4 py-2"
              style={{
                top: virtualRow.start,
              }}
            >
              <MessageBubble turn={turn} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
