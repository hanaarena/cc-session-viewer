import { describe, it, expect } from "vitest"
import { buildConversation } from "../lib/build-conversation"
import type { SessionRecord, UserRecord, AssistantRecord } from "../types/session"

function makeUser(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    type: "user",
    uuid: crypto.randomUUID(),
    parentUuid: null,
    sessionId: "test-session",
    timestamp: new Date().toISOString(),
    message: { role: "user", content: "hello" },
    ...overrides,
  }
}

function makeAssistant(overrides: Partial<AssistantRecord> = {}): AssistantRecord {
  return {
    type: "assistant",
    uuid: crypto.randomUUID(),
    parentUuid: null,
    sessionId: "test-session",
    timestamp: new Date().toISOString(),
    message: {
      model: "claude-opus-4-6",
      id: "msg_test",
      type: "message",
      role: "assistant",
      content: [{ type: "text", text: "Hello!" }],
      stop_reason: "end_turn",
      usage: { input_tokens: 100, output_tokens: 50 },
    },
    ...overrides,
  }
}

describe("buildConversation", () => {
  it("filters out progress and file-history records", () => {
    const records: SessionRecord[] = [
      makeUser({ timestamp: "2026-01-01T00:00:00Z" }),
      { type: "progress", timestamp: "2026-01-01T00:00:01Z", sessionId: "s" } as SessionRecord,
      makeAssistant({ timestamp: "2026-01-01T00:00:02Z" }),
      { type: "file-history-snapshot", messageId: "m", snapshot: {}, isSnapshotUpdate: false } as SessionRecord,
    ]

    const session = buildConversation(records, "test.jsonl")
    expect(session.turns).toHaveLength(2)
    expect(session.turns[0].role).toBe("user")
    expect(session.turns[1].role).toBe("assistant")
  })

  it("filters out sidechain messages when main-chain records exist", () => {
    const records: SessionRecord[] = [
      makeUser({ timestamp: "2026-01-01T00:00:00Z", isSidechain: false }),
      makeAssistant({ timestamp: "2026-01-01T00:00:01Z", isSidechain: true }),
      makeAssistant({ timestamp: "2026-01-01T00:00:02Z", isSidechain: false }),
    ]

    const session = buildConversation(records, "test.jsonl")
    expect(session.turns).toHaveLength(2)
    expect(session.isSubAgent).toBeUndefined()
  })

  it("renders sub-agent transcripts when every record is a sidechain", () => {
    const records: SessionRecord[] = [
      makeUser({
        timestamp: "2026-01-01T00:00:00Z",
        isSidechain: true,
        agentId: "ae02608",
      }),
      makeAssistant({
        timestamp: "2026-01-01T00:00:01Z",
        isSidechain: true,
        agentId: "ae02608",
      }),
    ]

    const session = buildConversation(records, "sub-agent.jsonl")
    expect(session.turns).toHaveLength(2)
    expect(session.isSubAgent).toBe(true)
    expect(session.agentId).toBe("ae02608")
  })

  it("sorts by timestamp", () => {
    const records: SessionRecord[] = [
      makeAssistant({ timestamp: "2026-01-01T00:00:02Z", uuid: "b" }),
      makeUser({ timestamp: "2026-01-01T00:00:00Z", uuid: "a" }),
    ]

    const session = buildConversation(records, "test.jsonl")
    expect(session.turns[0].id).toBe("a")
    expect(session.turns[1].id).toBe("b")
  })

  it("deduplicates assistant records by requestId", () => {
    const records: SessionRecord[] = [
      makeUser({ timestamp: "2026-01-01T00:00:00Z" }),
      makeAssistant({
        timestamp: "2026-01-01T00:00:01Z",
        requestId: "req1",
        uuid: "first",
        message: {
          model: "claude-opus-4-6",
          id: "msg1",
          type: "message",
          role: "assistant",
          content: [{ type: "text", text: "partial" }],
          stop_reason: null,
          usage: { input_tokens: 50, output_tokens: 10 },
        },
      }),
      makeAssistant({
        timestamp: "2026-01-01T00:00:02Z",
        requestId: "req1",
        uuid: "last",
        message: {
          model: "claude-opus-4-6",
          id: "msg1",
          type: "message",
          role: "assistant",
          content: [{ type: "text", text: "complete response" }],
          stop_reason: "end_turn",
          usage: { input_tokens: 100, output_tokens: 50 },
        },
      }),
    ]

    const session = buildConversation(records, "test.jsonl")
    const assistantTurns = session.turns.filter((t) => t.role === "assistant")
    expect(assistantTurns).toHaveLength(1)
    expect(assistantTurns[0].id).toBe("last")
  })

  it("pairs tool_use with tool_result", () => {
    const toolUseId = "tu_123"
    const records: SessionRecord[] = [
      makeUser({ timestamp: "2026-01-01T00:00:00Z" }),
      makeAssistant({
        timestamp: "2026-01-01T00:00:01Z",
        uuid: "asst1",
        message: {
          model: "claude-opus-4-6",
          id: "msg1",
          type: "message",
          role: "assistant",
          content: [
            { type: "tool_use", id: toolUseId, name: "Read", input: { file_path: "/test" } },
          ],
          stop_reason: "tool_use",
          usage: { input_tokens: 100, output_tokens: 50 },
        },
      }),
      makeUser({
        timestamp: "2026-01-01T00:00:02Z",
        message: {
          role: "user",
          content: [
            { tool_use_id: toolUseId, type: "tool_result", content: "file contents here" },
          ],
        },
      }),
    ]

    const session = buildConversation(records, "test.jsonl")
    const assistantTurn = session.turns.find((t) => t.role === "assistant")!
    expect(assistantTurn.toolResults).toBeDefined()
    expect(assistantTurn.toolResults!.get(toolUseId)?.content).toBe("file contents here")
  })

  it("skips user messages that are purely tool results", () => {
    const records: SessionRecord[] = [
      makeUser({ timestamp: "2026-01-01T00:00:00Z" }),
      makeAssistant({
        timestamp: "2026-01-01T00:00:01Z",
        message: {
          model: "claude-opus-4-6",
          id: "msg1",
          type: "message",
          role: "assistant",
          content: [{ type: "tool_use", id: "tu1", name: "Bash", input: { command: "ls" } }],
          stop_reason: "tool_use",
          usage: { input_tokens: 100, output_tokens: 50 },
        },
      }),
      makeUser({
        timestamp: "2026-01-01T00:00:02Z",
        message: {
          role: "user",
          content: [{ tool_use_id: "tu1", type: "tool_result", content: "output" }],
        },
      }),
    ]

    const session = buildConversation(records, "test.jsonl")
    const userTurns = session.turns.filter((t) => t.role === "user")
    expect(userTurns).toHaveLength(1) // only the first real user message
  })

  it("extracts session metadata", () => {
    const records: SessionRecord[] = [
      makeUser({
        timestamp: "2026-01-01T00:00:00Z",
        gitBranch: "main",
        cwd: "/home/user/project",
      }),
      makeAssistant({
        timestamp: "2026-01-01T00:05:00Z",
        sessionId: "sess-123",
        message: {
          model: "claude-opus-4-6",
          id: "msg1",
          type: "message",
          role: "assistant",
          content: [{ type: "text", text: "hi" }],
          stop_reason: "end_turn",
          usage: { input_tokens: 200, output_tokens: 100 },
        },
      }),
    ]

    const session = buildConversation(records, "my-session.jsonl")
    expect(session.sessionId).toBe("sess-123")
    expect(session.model).toBe("claude-opus-4-6")
    expect(session.gitBranch).toBe("main")
    expect(session.cwd).toBe("/home/user/project")
    expect(session.totalInputTokens).toBe(200)
    expect(session.totalOutputTokens).toBe(100)
    expect(session.fileName).toBe("my-session.jsonl")
  })

  it("handles empty records", () => {
    const session = buildConversation([], "empty.jsonl")
    expect(session.turns).toHaveLength(0)
    expect(session.startTime).toBe("")
  })
})
