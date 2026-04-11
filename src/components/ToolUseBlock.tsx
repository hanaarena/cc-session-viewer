import { useState, useCallback } from "react";
import type { ToolResultContent, UserRecord } from "@/types/session";
import { CodeBlock } from "./CodeBlock";

interface ToolUseBlockProps {
  name: string;
  input: Record<string, unknown>;
  result?: ToolResultContent & { toolUseResult?: UserRecord["toolUseResult"] };
}

const TOOL_ICONS: Record<string, string> = {
  Read: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20",
  Write: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7",
  Edit: "M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z",
  Bash: "M4 17l6-6-6-6M12 19h8",
  Glob: "M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z",
  Grep: "M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z",
  Agent:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12 7a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  AskUserQuestion:
    "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
};

function ToolIcon({ name }: { name: string }) {
  const path = TOOL_ICONS[name];
  if (!path) return null;

  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <path d={path} />
    </svg>
  );
}

function getToolSummary(name: string, input: Record<string, unknown>): string {
  if (name === "Read" && input.file_path) return String(input.file_path);
  if (name === "Write" && input.file_path) return String(input.file_path);
  if (name === "Edit" && input.file_path) return String(input.file_path);
  if (name === "Bash" && input.command) {
    const cmd = String(input.command);
    return cmd.length > 80 ? cmd.slice(0, 80) + "..." : cmd;
  }
  if (name === "Glob" && input.pattern) return String(input.pattern);
  if (name === "Grep" && input.pattern) return String(input.pattern);
  if (name === "Agent" && input.description) return String(input.description);
  if (name === "AskUserQuestion" && input.questions) {
    const questions = input.questions as { question: string }[];
    if (questions.length === 1) return questions[0].question;
    return `${questions.length} questions`;
  }
  return "";
}

function formatInput(name: string, input: Record<string, unknown>): string {
  // For common tools, show a cleaner display instead of raw JSON
  if (name === "Bash" && input.command) {
    return String(input.command);
  }
  if (name === "Edit" && input.old_string != null) {
    const parts: string[] = [];
    if (input.file_path) parts.push(`file: ${input.file_path}`);
    parts.push(`- ${input.old_string}`);
    parts.push(`+ ${input.new_string}`);
    return parts.join("\n");
  }
  return JSON.stringify(input, null, 2);
}

interface AskQuestion {
  question: string;
  header?: string;
  options?: { label: string; description?: string }[];
  multiSelect?: boolean;
}

interface ParsedOutput {
  answers: Map<string, string>;
  userNotes: string | null;
}

function normalizeText(s: string): string {
  return s
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036"]/g, "") // curly/smart quotes & straight quotes
    .replace(/[\u2014\u2013\u2015]/g, "-") // em/en dashes → hyphen
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function parseSelectedAnswers(output: string): ParsedOutput {
  const answers = new Map<string, string>();
  // Match patterns like "question"="answer"
  const regex = /"(.+?)"="(.+?)"/g;
  let match;
  while ((match = regex.exec(output)) !== null) {
    answers.set(match[1], match[2]);
  }
  // Extract user notes if exist
  const notesMatch = output.match(
    /user notes:\s*(.+?)\.?\s*You can now continue/s,
  );
  const userNotes = notesMatch ? notesMatch[1].trim() : null;
  return { answers, userNotes };
}

// Look up answer for a question
function getAnswer(
  answers: Map<string, string>,
  question: string,
): string | undefined {
  // Exact match first
  const exact = answers.get(question);
  if (exact != null) return exact;
  // Normalized match
  const normQ = normalizeText(question);
  for (const [key, value] of answers) {
    if (normalizeText(key) === normQ) return value;
  }
  // Substring containment — handles truncated keys from broken regex captures
  for (const [key, value] of answers) {
    const normKey = normalizeText(key);
    if (normQ.includes(normKey) || normKey.includes(normQ)) return value;
  }
  return undefined;
}

function AgentInput({ input }: { input: Record<string, unknown> }) {
  const subagentType = input.subagent_type
    ? String(input.subagent_type)
    : "general-purpose";
  const description = input.description ? String(input.description) : null;
  const prompt = input.prompt ? String(input.prompt) : null;
  const model = input.model ? String(input.model) : null;
  const isolation = input.isolation ? String(input.isolation) : null;
  const runInBackground = input.run_in_background === true;

  return (
    <div className="space-y-2">
      {/* Metadata badges */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12 7a4 4 0 1 0-8 0 4 4 0 0 0 8 0z" />
          </svg>
          {subagentType}
        </span>
        {model && (
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            {model}
          </span>
        )}
        {isolation && (
          <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[11px] font-medium text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
            {isolation}
          </span>
        )}
        {runInBackground && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-700/40 dark:text-gray-400">
            background
          </span>
        )}
      </div>

      {/* Description */}
      {description && (
        <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
          {description}
        </div>
      )}

      {/* Prompt */}
      {prompt && (
        <div>
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-purple-500/60 dark:text-purple-400/50">
            Prompt
          </div>
          <div className="whitespace-pre-wrap rounded-md border border-purple-200/60 bg-white/60 px-2.5 py-2 text-xs leading-relaxed text-gray-700 dark:border-purple-800/30 dark:bg-gray-800/40 dark:text-gray-300">
            {prompt}
          </div>
        </div>
      )}
    </div>
  );
}

function AskUserQuestionInput({
  questions,
  parsedOutput,
}: {
  questions: AskQuestion[];
  parsedOutput: ParsedOutput;
}) {
  const { answers: selectedAnswers, userNotes } = parsedOutput;
  return (
    <div className="space-y-3">
      {questions.map((q, i) => (
        <div key={i}>
          {q.header && (
            <div className="mb-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
              {q.header}
            </div>
          )}
          <div className="mb-1.5 text-sm text-gray-800 dark:text-gray-200">
            {q.question}
          </div>
          {q.options && q.options.length > 0 ? (
            <div className="space-y-1">
              {q.options.map((opt, j) => {
                const answer = getAnswer(selectedAnswers, q.question);
                const isSelected =
                  answer != null &&
                  (answer === opt.label ||
                    answer === opt.description ||
                    // Multi-select: answer is comma-separated labels
                    answer.includes(opt.label) ||
                    opt.label.toLowerCase().includes(answer.toLowerCase()));
                return (
                  <div
                    key={j}
                    className={`flex items-start gap-2 rounded-md border px-2.5 py-1.5 ${
                      isSelected
                        ? "border-green-400 bg-green-50/80 ring-1 ring-green-300 dark:border-green-600 dark:bg-green-950/30 dark:ring-green-800"
                        : "border-amber-200/60 bg-white/60 dark:border-amber-800/30 dark:bg-gray-800/40"
                    }`}
                  >
                    <span
                      className={`mt-0.5 text-xs ${
                        isSelected
                          ? "text-green-600 dark:text-green-400"
                          : "text-amber-500 dark:text-amber-600"
                      }`}
                    >
                      {isSelected
                        ? q.multiSelect
                          ? "☑"
                          : "●"
                        : q.multiSelect
                          ? "☐"
                          : "○"}
                    </span>
                    <div className="min-w-0">
                      <div
                        className={`text-xs font-medium ${
                          isSelected
                            ? "text-green-800 dark:text-green-300"
                            : "text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {opt.label}
                      </div>
                      {opt.description && (
                        <div
                          className={`text-[11px] ${
                            isSelected
                              ? "text-green-600/80 dark:text-green-400/70"
                              : "text-gray-500 dark:text-gray-500"
                          }`}
                        >
                          {opt.description}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // No predefined options — show the free-form answer if available
            (() => {
              const answer = getAnswer(selectedAnswers, q.question);
              return answer ? (
                <div className="rounded-md border border-green-400 bg-green-50/80 px-2.5 py-1.5 text-xs text-green-800 ring-1 ring-green-300 dark:border-green-600 dark:bg-green-950/30 dark:text-green-300 dark:ring-green-800">
                  {answer}
                </div>
              ) : null;
            })()
          )}
        </div>
      ))}
      {userNotes && (
        <div className="mt-2 rounded-md border border-blue-200 bg-blue-50/60 px-2.5 py-1.5 dark:border-blue-800/40 dark:bg-blue-950/20">
          <div className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-blue-500/70 dark:text-blue-400/60">
            User Notes
          </div>
          <div className="text-xs text-blue-800 dark:text-blue-300">
            {userNotes}
          </div>
        </div>
      )}
    </div>
  );
}

export function ToolUseBlock({ name, input, result }: ToolUseBlockProps) {
  const summary = getToolSummary(name, input);
  const isError = result?.is_error;
  const rawResult =
    result?.content ??
    result?.toolUseResult?.stdout ??
    result?.toolUseResult?.stderr ??
    "";
  const resultContent =
    typeof rawResult === "object" && rawResult !== null
      ? JSON.stringify(rawResult, null, 2)
      : rawResult;

  // Lazy-render: only mount detail content once opened
  const [hasOpened, setHasOpened] = useState(false);
  const handleToggle = useCallback(
    (e: React.ToggleEvent<HTMLDetailsElement>) => {
      if (e.newState === "open" && !hasOpened) setHasOpened(true);
    },
    [hasOpened],
  );

  return (
    <details
      className="group/tool my-2 rounded-lg border border-amber-200 dark:border-amber-800/40"
      onToggle={handleToggle}
    >
      <summary className="sticky top-0 z-10 flex cursor-pointer items-center gap-2 rounded-t-lg bg-white/95 px-3 py-2 text-xs font-medium text-amber-700 backdrop-blur-sm select-none group-open/tool:border-b group-open/tool:border-amber-200 dark:bg-gray-800/95 dark:text-amber-400 dark:group-open/tool:border-amber-800/40">
        <ToolIcon name={name} />
        <span className="font-semibold">{name}</span>
        {summary && (
          <span className="min-w-0 truncate font-normal text-amber-600/70 dark:text-amber-500/60">
            {summary}
          </span>
        )}
        {isError && (
          <span className="ml-auto rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
            error
          </span>
        )}
      </summary>

      {hasOpened && (
        <div
          className="max-h-[70vh] space-y-0 overflow-y-auto"
          style={{ contentVisibility: "auto" }}
        >
          {/* Input */}
          <div className="bg-amber-50/50 p-3 dark:bg-amber-950/10">
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-amber-600/60 dark:text-amber-500/50">
              {name === "Agent" ? "Sub-Agent" : "Input"}
            </div>
            {name === "Agent" ? (
              <AgentInput input={input} />
            ) : name === "AskUserQuestion" &&
              Array.isArray(input.questions) ? (
              <AskUserQuestionInput
                questions={input.questions as AskQuestion[]}
                parsedOutput={parseSelectedAnswers(String(resultContent ?? ""))}
              />
            ) : (
              <CodeBlock content={formatInput(name, input)} maxLines={30} />
            )}
          </div>

          {/* Result */}
          {resultContent && (
            <div
              className={`border-t p-3 ${
                isError
                  ? "border-red-200 bg-red-50/50 dark:border-red-800/30 dark:bg-red-950/10"
                  : "border-amber-200 bg-gray-50/50 dark:border-amber-800/40 dark:bg-gray-900/50"
              }`}
            >
              <div
                className={`mb-1 text-[10px] font-medium uppercase tracking-wider ${
                  isError
                    ? "text-red-600/60 dark:text-red-500/50"
                    : "text-gray-500/60 dark:text-gray-500/50"
                }`}
              >
                Output
              </div>
              <CodeBlock content={String(resultContent ?? "")} />
            </div>
          )}
        </div>
      )}
    </details>
  );
}
