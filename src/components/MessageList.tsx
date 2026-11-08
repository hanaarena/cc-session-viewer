import {
  useRef,
  useCallback,
  useState,
  useEffect,
  useLayoutEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type {
  ParsedSession,
  ConversationTurn,
  AssistantRecord,
  UserRecord,
} from "@/types/session";
import { MessageBubble } from "./MessageBubble";

export interface MessageListHandle {
  scrollToIndex: (index: number) => void;
}

interface MessageListProps {
  session: ParsedSession;
  onActiveTurnIndexChange?: (index: number) => void;
  /** Live mode: stay pinned to the bottom as turns arrive (when already there) */
  follow?: boolean;
  /** Open scrolled to the latest turn instead of the first */
  startAtEnd?: boolean;
}

/** Within this many px of the bottom counts as "at the bottom" */
const BOTTOM_THRESHOLD = 80;

function isAtBottom(el: HTMLElement): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_THRESHOLD;
}

/**
 * Heuristic estimate based on turn content.
 * Closer estimates → fewer layout corrections → less jank.
 */
function estimateTurnHeight(turn: ConversationTurn): number {
  if (turn.role === "system") return 40;

  if (turn.role === "user") {
    const content = (turn.record as UserRecord).message.content;
    if (Array.isArray(content)) {
      let h = 56;
      for (const block of content) {
        if (block.type === "image") {
          h += 300;
        } else if (block.type === "text") {
          h += Math.max(24, Math.ceil(block.text.length / 80) * 20);
        }
      }
      return Math.min(h, 900);
    }
    return 80;
  }

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
  function MessageList(
    { session, onActiveTurnIndexChange, follow = false, startAtEnd = false },
    ref,
  ) {
    const parentRef = useRef<HTMLDivElement>(null);
    const [showBackToTop, setShowBackToTop] = useState(false);
    // Pinned = keep the bottom in view as content grows (tail -f). The ref is
    // read by the scroll logic, the state drives the "new turns" pill.
    const pinnedRef = useRef(startAtEnd);
    const [pinned, setPinnedState] = useState(startAtEnd);
    const lastScrollTopRef = useRef(0);
    // Turn count the user has seen while pinned; the rest are "new"
    const [seenTurnCount, setSeenTurnCount] = useState(session.turns.length);
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

      // Pin on reaching the bottom; unpin only when the user scrolls up.
      // Content growing below doesn't move scrollTop, so it never unpins.
      const updatePinned = () => {
        const top = el.scrollTop;
        const scrolledUp = top < lastScrollTopRef.current - 1;
        lastScrollTopRef.current = top;
        const next = isAtBottom(el) ? true : scrolledUp ? false : null;
        if (next !== null && next !== pinnedRef.current) {
          pinnedRef.current = next;
          setPinnedState(next);
        }
      };

      // Emit initial active turn after layout
      reportActive();

      let ticking = false;
      const handleScroll = () => {
        if (!ticking) {
          requestAnimationFrame(() => {
            setShowBackToTop(el.scrollTop > 600);
            updatePinned();
            reportActive();
            ticking = false;
          });
          ticking = true;
        }
      };

      // Initial check: a session that fits on screen starts at the bottom
      handleScroll();
      el.addEventListener("scroll", handleScroll, { passive: true });
      return () => el.removeEventListener("scroll", handleScroll);
    }, [virtualizer, onActiveTurnIndexChange]);

    const scrollToTop = useCallback(() => {
      parentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }, []);

    const scrollToBottom = useCallback(() => {
      const el = parentRef.current;
      if (!el) return;
      pinnedRef.current = true;
      setPinnedState(true);
      el.scrollTop = el.scrollHeight;
    }, []);

    const turnCount = session.turns.length;
    const totalSize = virtualizer.getTotalSize();

    // Keep the bottom in view while pinned: new turns, a growing last turn and
    // rows measured taller than estimated all change the total size.
    useLayoutEffect(() => {
      const el = parentRef.current;
      if (!el || !pinnedRef.current || !(follow || startAtEnd)) return;
      el.scrollTop = el.scrollHeight;
    }, [follow, startAtEnd, totalSize, turnCount]);

    // Everything is "seen" while pinned (derived state, adjusted during render)
    if (pinned && seenTurnCount !== turnCount) {
      setSeenTurnCount(turnCount);
    }
    const unseenTurns = follow && !pinned ? turnCount - seenTurnCount : 0;

    return (
      <div ref={parentRef} className="relative h-full overflow-y-auto">
        <div
          className="relative mx-auto w-full max-w-5xl text-base"
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

        {/* New turns arrived while scrolled up */}
        {unseenTurns > 0 && (
          <button
            onClick={scrollToBottom}
            className="fixed bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-blue-600 px-3.5 py-2 text-xs font-medium text-white shadow-lg transition-all hover:bg-blue-500 active:scale-95"
          >
            {unseenTurns} new {unseenTurns === 1 ? "turn" : "turns"}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        )}

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
