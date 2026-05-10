import {
  useRef,
  useCallback,
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type {
  ParsedSession,
  ConversationTurn,
  AssistantRecord,
} from "@/types/session";
import { MessageBubble } from "./MessageBubble";

export interface MessageListHandle {
  scrollToIndex: (index: number) => void;
}

interface MessageListProps {
  session: ParsedSession;
  onActiveTurnIndexChange?: (index: number) => void;
}

/**
 * Heuristic estimate based on turn content.
 * Closer estimates → fewer layout corrections → less jank.
 */
function estimateTurnHeight(turn: ConversationTurn): number {
  if (turn.role === "system") return 40;

  if (turn.role === "user") return 80;

  // Assistant: base + per-block estimate
  const record = turn.record as AssistantRecord;
  const blocks = record.message.content;
  let h = 56; // bubble chrome (padding, timestamp row)

  for (const block of blocks) {
    if (block.type === "text") {
      // Long text blocks start collapsed (half content + "show more" button)
      const len =
        block.text.length > 800 ? block.text.length / 2 : block.text.length;
      h += Math.max(24, Math.ceil(len / 80) * 20);
    } else if (block.type === "thinking") {
      h += 36; // collapsed summary height
    } else if (block.type === "tool_use") {
      h += 36; // collapsed summary height
    }
  }

  return Math.min(h, 600); // cap estimate
}

export const MessageList = forwardRef<MessageListHandle, MessageListProps>(
  function MessageList({ session, onActiveTurnIndexChange }, ref) {
    const parentRef = useRef<HTMLDivElement>(null);
    const [showBackToTop, setShowBackToTop] = useState(false);
    const rowRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    const observerRef = useRef<ResizeObserver | null>(null);
    const lastActiveIndexRef = useRef<number>(-1);
    const programmaticTargetRef = useRef<number | null>(null);
    const programmaticTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );

    const virtualizer = useVirtualizer({
      count: session.turns.length,
      getScrollElement: () => parentRef.current,
      estimateSize: (index) => estimateTurnHeight(session.turns[index]),
      overscan: 5,
      // Keep scroll position anchored when items above the viewport resize
      scrollPaddingStart: 0,
      scrollPaddingEnd: 0,
    });

    // Single ResizeObserver for all mounted rows — re-measures on any size change
    useEffect(() => {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          const index = Number(el.dataset.index);
          if (!isNaN(index)) {
            virtualizer.measureElement(el);
          }
        }
      });
      observerRef.current = observer;

      // Observe any rows already in the map
      for (const el of rowRefs.current.values()) {
        observer.observe(el);
      }

      return () => observer.disconnect();
    }, [virtualizer]);

    // Callback ref that both registers in our map and starts observing
    const setRowRef = useCallback(
      (index: number) => (node: HTMLDivElement | null) => {
        const map = rowRefs.current;
        const observer = observerRef.current;

        if (node) {
          const prev = map.get(index);
          if (prev === node) return; // same node, skip
          if (prev) observer?.unobserve(prev);
          map.set(index, node);
          observer?.observe(node);
          // Initial measurement
          virtualizer.measureElement(node);
        } else {
          const prev = map.get(index);
          if (prev) {
            observer?.unobserve(prev);
            map.delete(index);
          }
        }
      },
      [virtualizer],
    );

    useImperativeHandle(ref, () => ({
      scrollToIndex: (index: number) => {
        programmaticTargetRef.current = index;
        if (programmaticTimeoutRef.current) {
          clearTimeout(programmaticTimeoutRef.current);
        }
        programmaticTimeoutRef.current = setTimeout(() => {
          programmaticTargetRef.current = null;
          programmaticTimeoutRef.current = null;
        }, 1200);
        virtualizer.scrollToIndex(index, {
          align: "center",
          behavior: "smooth",
        });
      },
    }));

    // Track scroll position for back-to-top button + active turn (centermost visible)
    useEffect(() => {
      const el = parentRef.current;
      if (!el) return;

      const reportActive = () => {
        const items = virtualizer.getVirtualItems();
        if (items.length === 0) return;
        const viewCenter = el.scrollTop + el.clientHeight / 2;
        let next = items[0].index;
        let bestDist = Infinity;
        for (const it of items) {
          const itemCenter = it.start + it.size / 2;
          const dist = Math.abs(itemCenter - viewCenter);
          if (dist < bestDist) {
            bestDist = dist;
            next = it.index;
          }
        }

        const prev = lastActiveIndexRef.current;
        lastActiveIndexRef.current = next;

        if (programmaticTargetRef.current !== null) {
          if (next === programmaticTargetRef.current) {
            programmaticTargetRef.current = null;
            if (programmaticTimeoutRef.current) {
              clearTimeout(programmaticTimeoutRef.current);
              programmaticTimeoutRef.current = null;
            }
          }
          return;
        }

        if (next !== prev) {
          onActiveTurnIndexChange?.(next);
        }
      };

      // Emit initial active turn after layout
      reportActive();

      let ticking = false;
      const handleScroll = () => {
        if (!ticking) {
          requestAnimationFrame(() => {
            setShowBackToTop(el.scrollTop > 600);
            reportActive();
            ticking = false;
          });
          ticking = true;
        }
      };

      el.addEventListener("scroll", handleScroll, { passive: true });
      return () => el.removeEventListener("scroll", handleScroll);
    }, [virtualizer, onActiveTurnIndexChange]);

    const scrollToTop = useCallback(() => {
      parentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }, []);

    return (
      <div ref={parentRef} className="relative h-full overflow-y-auto">
        <div
          className="relative mx-auto w-full max-w-3xl"
          style={{ height: virtualizer.getTotalSize() }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const turn = session.turns[virtualRow.index];
            return (
              <div
                key={turn.id}
                ref={setRowRef(virtualRow.index)}
                data-index={virtualRow.index}
                className="absolute left-0 w-full px-4 py-2"
                style={{
                  top: virtualRow.start,
                }}
              >
                <MessageBubble turn={turn} />
              </div>
            );
          })}
        </div>

        {/* Back to top button */}
        {showBackToTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-white shadow-lg transition-all hover:bg-gray-800 active:scale-95 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </button>
        )}
      </div>
    );
  },
);
