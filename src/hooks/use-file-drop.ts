import { useState, useEffect, useCallback } from "react"

export function useFileDrop() {
  const [files, setFiles] = useState<File[]>([])
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

      const dropped = Array.from(e.dataTransfer?.files ?? []).filter((f) =>
        f.name.endsWith(".jsonl"),
      )
      if (dropped.length > 0) {
        setFiles(dropped)
      }
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

  const clearFiles = useCallback(() => setFiles([]), [])

  const pickFiles = useCallback(() => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".jsonl"
    input.multiple = true
    input.onchange = () => {
      const picked = Array.from(input.files ?? []).filter((f) =>
        f.name.endsWith(".jsonl"),
      )
      if (picked.length > 0) {
        setFiles(picked)
      }
    }
    input.click()
  }, [])

  return { files, isDragOver, clearFiles, pickFiles }
}
