import type { SessionRecord } from "@/types/session"

export async function parseJsonlFile(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<SessionRecord[]> {
  const records: SessionRecord[] = []

  if (typeof file.stream === "function") {
    // Streaming parse — avoids loading entire file as a single string
    const stream = file.stream()
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    let buffer = ""
    let bytesRead = 0

    for (;;) {
      const { done, value } = await reader.read()
      if (done) break

      bytesRead += value.byteLength
      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split("\n")
      buffer = lines.pop()! // keep incomplete last line in buffer

      for (const line of lines) {
        if (line.trim()) {
          try {
            records.push(JSON.parse(line))
          } catch {
            // skip malformed lines
          }
        }
      }

      onProgress?.(bytesRead / file.size)
    }

    // handle final line
    if (buffer.trim()) {
      try {
        records.push(JSON.parse(buffer))
      } catch {
        // skip malformed
      }
    }
  } else {
    // Fallback for browsers without File.stream()
    const text = await file.text()
    const lines = text.split("\n")
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line) {
        try {
          records.push(JSON.parse(line))
        } catch {
          // skip malformed lines
        }
      }
      if (i % 500 === 0) {
        onProgress?.(i / lines.length)
      }
    }
  }

  onProgress?.(1)
  return records
}
