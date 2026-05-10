import { useState, useEffect, useRef, useCallback } from "react"
import { useFileDrop } from "@/hooks/use-file-drop"
import { useSessions } from "@/hooks/use-sessions"
import { useSearch } from "@/hooks/use-search"
import { DropZone } from "@/components/DropZone"
import { SessionList } from "@/components/SessionList"
import { MessageList } from "@/components/MessageList"
import type { MessageListHandle } from "@/components/MessageList"
import { SessionMeta } from "@/components/SessionMeta"
import { SidePanel } from "@/components/SidePanel"

type View = "landing" | "loading" | "list" | "viewer"

function App() {
  const { files, isDragOver, clearFiles, pickFiles } = useFileDrop()
  const { sessions, loading, error, progress, currentFile } = useSessions(files)
  const [view, setView] = useState<View>("landing")
  const [activeIndex, setActiveIndex] = useState(0)

  // React to file drops
  useEffect(() => {
    if (files.length > 0) {
      setView("loading")
    }
  }, [files])

  // React to parsing completion
  useEffect(() => {
    if (!loading && sessions.length > 0) {
      if (sessions.length === 1) {
        setActiveIndex(0)
        setView("viewer")
      } else {
        setView("list")
      }
    }
  }, [loading, sessions])

  const handleBack = () => {
    if (view === "viewer" && sessions.length > 1) {
      setView("list")
    } else {
      setView("landing")
      setActiveIndex(0)
      clearFiles()
    }
  }

  const handleSelectSession = (index: number) => {
    setActiveIndex(index)
    setView("viewer")
  }

  // Landing
  if (view === "landing") {
    return <DropZone isDragOver={isDragOver} onPickFiles={pickFiles} />
  }

  // Loading
  if (view === "loading" || loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-64 text-center">
          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-200"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {currentFile ? (
              <>Parsing <span className="font-medium text-gray-700 dark:text-gray-300">{currentFile}</span></>
            ) : (
              "Preparing..."
            )}
          </p>
          {files.length > 1 && (
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-600">
              {Math.round(progress * 100)}% ({Math.min(Math.floor(progress * files.length) + 1, files.length)} of {files.length} files)
            </p>
          )}
        </div>
      </div>
    )
  }

  // Error
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600 dark:text-red-400">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={handleBack}
            className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  // Session list
  if (view === "list") {
    return (
      <SessionList
        sessions={sessions}
        onSelect={handleSelectSession}
        onBack={handleBack}
      />
    )
  }

  // Viewer
  const activeSession = sessions[activeIndex]
  if (view === "viewer" && activeSession) {
    return <SessionViewer session={activeSession} onBack={handleBack} />
  }

  return null
}

function SessionViewer({
  session,
  onBack,
}: {
  session: import("@/types/session").ParsedSession
  onBack: () => void
}) {
  const messageListRef = useRef<MessageListHandle>(null)
  const search = useSearch(session)
  const [activeTurnIndex, setActiveTurnIndex] = useState(0)

  // Scroll to active match when it changes
  const scrollToActiveMatch = useCallback(() => {
    const match = search.matches[search.activeMatchIndex]
    if (match) {
      messageListRef.current?.scrollToIndex(match.turnIndex)
    }
  }, [search.matches, search.activeMatchIndex])

  useEffect(() => {
    scrollToActiveMatch()
  }, [scrollToActiveMatch])

  const handleSelectMatch = (index: number) => {
    search.setActiveMatchIndex(index)
  }

  const handleNextMatch = () => {
    search.nextMatch()
  }

  const handlePrevMatch = () => {
    search.prevMatch()
  }

  const handleSelectTurn = useCallback((turnIndex: number) => {
    setActiveTurnIndex(turnIndex)
    messageListRef.current?.scrollToIndex(turnIndex)
  }, [])

  return (
    <div className="flex h-screen flex-col bg-gray-50 dark:bg-gray-950">
      <SessionMeta
        session={session}
        onBack={onBack}
        query={search.query}
        onQueryChange={search.setQuery}
        matches={search.matches}
        activeMatchIndex={search.activeMatchIndex}
        onSelectMatch={handleSelectMatch}
        onNextMatch={handleNextMatch}
        onPrevMatch={handlePrevMatch}
      />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <SidePanel
          session={session}
          activeTurnIndex={activeTurnIndex}
          onSelectTurn={handleSelectTurn}
        />
        <div className="min-w-0 flex-1">
          <MessageList
            ref={messageListRef}
            session={session}
            onActiveTurnIndexChange={setActiveTurnIndex}
          />
        </div>
      </div>
    </div>
  )
}

export default App
