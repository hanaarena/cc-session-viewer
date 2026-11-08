import type { SessionRecord } from "@/types/session"

/**
 * Incremental JSONL reader. Remembers how many bytes of the file it has
 * consumed, so calling `read` again with a newer snapshot of the same file
 * only parses the lines appended since.
 */
export class JsonlTail {
  records: SessionRecord[] = []
  /** Bytes of the file consumed so far */
  offset = 0
  /** Bumped whenever `records` changes */
  version = 0
  private pending = "" // incomplete trailing line
  private decoder = new TextDecoder()

  /**
   * Parse whatever `file` holds past `offset`. A file smaller than what was
   * already read was truncated or replaced, so it is re-read from the start.
   */
  async read(file: Blob, onProgress?: (percent: number) => void): Promise<void> {
    if (file.size < this.offset) this.reset()

    const start = this.offset
    const total = file.size - start
    if (total > 0) {
      const blob = file.slice(start, file.size)
      if (typeof blob.stream === "function") {
        // Stream so large files aren't held in memory as one string
        const reader = blob.stream().getReader()
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          this.feed(value)
          onProgress?.((this.offset - start) / total)
        }
      } else {
        this.feed(new Uint8Array(await blob.arrayBuffer()))
      }
      this.flushPending()
    }
    onProgress?.(1)
  }

  reset() {
    this.records = []
    this.offset = 0
    this.pending = ""
    this.decoder = new TextDecoder()
    this.version++
  }

  private feed(chunk: Uint8Array) {
    this.offset += chunk.byteLength
    // stream: true keeps a multi-byte character split across chunks intact
    this.pending += this.decoder.decode(chunk, { stream: true })
    const lines = this.pending.split("\n")
    this.pending = lines.pop()!
    for (const line of lines) {
      if (!line.trim()) continue
      try {
        this.records.push(JSON.parse(line))
        this.version++
      } catch {
        // skip malformed lines
      }
    }
  }

  /**
   * A last line without "\n" is either still being written or the file has
   * no trailing newline. A cut-off JSON object never parses, so accept the
   * line only if it does; otherwise keep it until the rest arrives.
   */
  private flushPending() {
    if (!this.pending.trim()) return
    try {
      this.records.push(JSON.parse(this.pending))
      this.pending = ""
      this.version++
    } catch {
      // wait for the rest of the line
    }
  }
}

export async function parseJsonlFile(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<SessionRecord[]> {
  const tail = new JsonlTail()
  await tail.read(file, onProgress)
  return tail.records
}
