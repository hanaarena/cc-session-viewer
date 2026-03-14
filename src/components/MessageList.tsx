import { useRef, useCallback, useState, useEffect, useImperativeHandle, forwardRef } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import type { ParsedSession } from "@/types/session"
import { MessageBubble } from "./MessageBubble"

export interface MessageListHandle {
  scrollToIndex: (index: number) => void
}

interface MessageListProps {
  session: ParsedSession
}

export const MessageList = forwardRef<MessageListHandle, MessageListProps>(
  function MessageList({ session }, ref) {
    const parentRef = useRef<HTMLDivElement>(null)
    const [showBackToTop, setShowBackToTop] = useState(false)

    const virtualizer = useVirtualizer({
      count: session.turns.length,
      getScrollElement: () => parentRef.current,
      estimateSize: () => 120,
      overscan: 5,
    })

    useImperativeHandle(ref, () => ({
      scrollToIndex: (index: number) => {
        virtualizer.scrollToIndex(index, { align: "center", behavior: "smooth" })
      },
    }))

    // Track scroll position for back-to-top button
    useEffect(() => {
      const el = parentRef.current
      if (!el) return

      const handleScroll = () => {
        setShowBackToTop(el.scrollTop > 600)
      }

      el.addEventListener("scroll", handleScroll, { passive: true })
      return () => el.removeEventListener("scroll", handleScroll)
    }, [])

    const scrollToTop = useCallback(() => {
      parentRef.current?.scrollTo({ top: 0, behavior: "smooth" })
    }, [])

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
      <div ref={parentRef} className="relative h-full overflow-y-auto">
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

        {/* Back to top button */}
        {showBackToTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-white shadow-lg transition-all hover:bg-gray-800 active:scale-95 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </button>
        )}
      </div>
    )
  },
)
