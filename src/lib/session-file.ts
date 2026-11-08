import type { ParsedSession } from "@/types/session"
import { JsonlTail } from "./parse-jsonl"
import { buildConversation } from "./build-conversation"

/**
 * Where a session comes from. `handle` is only available in Chromium (file
 * picker or drag-and-drop) and is what lets the file be read again as
 * Claude Code appends to it. A plain `File` is a one-time snapshot.
 */
export interface SessionSource {
  name: string
  file?: File
  handle?: FileSystemFileHandle
}

const READ_ATTEMPTS = 3

/** A file written within this window counts as an active session */
export const ACTIVE_WINDOW_MS = 2 * 60 * 1000

/** A session file that can be re-synced to pick up appended records. */
export class SessionFile {
  readonly source: SessionSource
  /** mtime of the file as of the last sync */
  lastModified = 0
  private tail = new JsonlTail()
  private syncing: Promise<void> | null = null
  private built: ParsedSession | null = null
  private builtVersion = -1

  constructor(source: SessionSource) {
    this.source = source
  }

  get canFollow(): boolean {
    return !!this.source.handle
  }

  get recordCount(): number {
    return this.tail.records.length
  }

  /** The conversation as of the last sync; same object until records change */
  get session(): ParsedSession {
    if (!this.built || this.builtVersion !== this.tail.version) {
      // Rebuilt from all records: tool results and same-requestId assistant
      // records can arrive after the turn they belong to.
      this.built = buildConversation(this.tail.records, this.source.name)
      this.builtVersion = this.tail.version
    }
    return this.built
  }

  /**
   * Read what was appended since the last sync. Concurrent calls share one
   * read, since two reads from the same offset would duplicate records.
   */
  sync(onProgress?: (percent: number) => void): Promise<void> {
    this.syncing ??= this.readLatest(onProgress).finally(() => {
      this.syncing = null
    })
    return this.syncing
  }

  private async readLatest(onProgress?: (percent: number) => void) {
    const { handle, file } = this.source
    if (!handle) {
      if (!file) throw new Error(`No file for ${this.source.name}`)
      this.lastModified = file.lastModified
      return this.tail.read(file, onProgress)
    }

    for (let attempt = 1; ; attempt++) {
      // A fresh snapshot each time: reading a snapshot the file has since
      // outgrown throws NotReadableError. The tail keeps what it got so far.
      const latest = await handle.getFile()
      this.lastModified = latest.lastModified
      try {
        return await this.tail.read(latest, onProgress)
      } catch (e) {
        if (attempt >= READ_ATTEMPTS || !isDomError(e, "NotReadableError")) throw e
      }
    }
  }
}

function isDomError(e: unknown, name: string): boolean {
  return e instanceof DOMException && e.name === name
}

/** Why a followed file can no longer be read, or null if it's worth retrying. */
export function describeUnreadable(e: unknown): string | null {
  if (isDomError(e, "NotFoundError")) return "Session file was moved or deleted"
  if (isDomError(e, "NotAllowedError")) return "Permission to read the file was revoked"
  return null
}
