import { describe, it, expect } from "vitest"
import { parseJsonlFile } from "../lib/parse-jsonl"

function makeFile(content: string, name = "test.jsonl"): File {
  return new File([content], name, { type: "application/jsonl" })
}

describe("parseJsonlFile", () => {
  it("parses valid JSONL lines", async () => {
    const content = [
      JSON.stringify({ type: "user", uuid: "1", timestamp: "2026-01-01T00:00:00Z" }),
      JSON.stringify({ type: "assistant", uuid: "2", timestamp: "2026-01-01T00:01:00Z" }),
    ].join("\n")

    const records = await parseJsonlFile(makeFile(content))
    expect(records).toHaveLength(2)
    expect(records[0].type).toBe("user")
    expect(records[1].type).toBe("assistant")
  })

  it("skips malformed lines", async () => {
    const content = [
      JSON.stringify({ type: "user", uuid: "1" }),
      "not valid json {{{",
      JSON.stringify({ type: "assistant", uuid: "2" }),
    ].join("\n")

    const records = await parseJsonlFile(makeFile(content))
    expect(records).toHaveLength(2)
  })

  it("handles empty file", async () => {
    const records = await parseJsonlFile(makeFile(""))
    expect(records).toHaveLength(0)
  })

  it("handles file with only whitespace/empty lines", async () => {
    const records = await parseJsonlFile(makeFile("\n\n  \n"))
    expect(records).toHaveLength(0)
  })

  it("reports progress", async () => {
    const content = [
      JSON.stringify({ type: "user", uuid: "1" }),
      JSON.stringify({ type: "user", uuid: "2" }),
    ].join("\n")

    let lastProgress = 0
    await parseJsonlFile(makeFile(content), (p) => {
      lastProgress = p
    })
    expect(lastProgress).toBe(1)
  })

  it("handles line without trailing newline", async () => {
    const content = JSON.stringify({ type: "user", uuid: "1" })
    const records = await parseJsonlFile(makeFile(content))
    expect(records).toHaveLength(1)
  })
})
