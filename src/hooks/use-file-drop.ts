import { useState, useEffect, useCallback } from "react"
import type { SessionSource } from "@/lib/session-file"

const isJsonl = (name: string) => name.endsWith(".jsonl")

/**
 * Turn dropped items into sources. Where supported, also grab a file handle
 * so the session can be followed live. Both `getAsFile` and
 * `getAsFileSystemHandle` must be called before the drop handler returns:
 * the items are emptied once the event is over.
 */
async function sourcesFromDrop(dataTransfer: DataTransfer): Promise<SessionSource[]> {
  const pending = Array.from(dataTransfer.items)
    .filter((item) => item.kind === "file")
    .map((item) => ({
      file: item.getAsFile(),
      handle: item.getAsFileSystemHandle?.().catch(() => null),
    }))

  const sources: SessionSource[] = []
  for (const { file, handle: handlePromise } of pending) {
    if (!file || !isJsonl(file.name)) continue
    const handle = await handlePromise
    sources.push({
      name: file.name,
      file,
      handle: handle?.kind === "file" ? (handle as FileSystemFileHandle) : undefined,
    })
  }
  return sources
}

export function useFileDrop() {
  const [sources, setSources] = useState<SessionSource[]>([])
  const [isDragOver, setIsDragOver] = useState(false)

  useEffect(() => {
    let dragCounter = 0

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault()
      dragCounter++
      setIsDragOver(true)
    }

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
    }

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault()
      dragCounter--
      if (dragCounter === 0) {
        setIsDragOver(false)
      }
    }

    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      dragCounter = 0
      setIsDragOver(false)

      if (!e.dataTransfer) return
      sourcesFromDrop(e.dataTransfer).then((dropped) => {
        if (dropped.length > 0) setSources(dropped)
      })
    }

    document.addEventListener("dragenter", handleDragEnter)
    document.addEventListener("dragover", handleDragOver)
    document.addEventListener("dragleave", handleDragLeave)
    document.addEventListener("drop", handleDrop)

    return () => {
      document.removeEventListener("dragenter", handleDragEnter)
      document.removeEventListener("dragover", handleDragOver)
      document.removeEventListener("dragleave", handleDragLeave)
      document.removeEventListener("drop", handleDrop)
    }
  }, [])

  const clearFiles = useCallback(() => setSources([]), [])

  const pickFiles = useCallback(async () => {
    // File System Access picker returns handles, which make live follow possible
    if (window.showOpenFilePicker) {
      try {
        const handles = await window.showOpenFilePicker({
          id: "cc-session-viewer",
          multiple: true,
          types: [
            {
              description: "Claude Code session",
              accept: { "application/jsonl": [".jsonl"] },
            },
          ],
        })
        const picked = handles
          .filter((h) => isJsonl(h.name))
          .map((handle) => ({ name: handle.name, handle }))
        if (picked.length > 0) setSources(picked)
      } catch (e) {
        if (!(e instanceof DOMException && e.name === "AbortError")) {
          console.warn("File picker failed:", e)
        }
      }
      return
    }

    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".jsonl"
    input.multiple = true
    input.onchange = () => {
      const picked = Array.from(input.files ?? [])
        .filter((f) => isJsonl(f.name))
        .map((file) => ({ name: file.name, file }))
      if (picked.length > 0) {
        setSources(picked)
      }
    }
    input.click()
  }, [])

  return { sources, isDragOver, clearFiles, pickFiles }
}
