const HUNK_RE = /^@@ -\d+(?:,\d+)? \+\d+(?:,\d+)? @@/m;
const FILE_HEADER_RE = /^file:\s+\S+/im;
const CHANGE_LINE_RE = /^[+-](?![+-])/m;

/** Detect text that is (or is wrapped in) a git diff / unified diff. */
export function detectDiff(
  text: string,
): { diff: string; before: string; after: string } | null {
  const fenced = text.match(
    /^([\s\S]*?)```(?:diff|patch)\n([\s\S]*?)\n```([\s\S]*)$/,
  );
  if (fenced) {
    return { before: fenced[1], diff: fenced[2], after: fenced[3] };
  }
  const trimmed = text.trim();
  if (
    trimmed.startsWith("diff --git ") ||
    /^---\s+\S+\n\+\+\+\s+\S+/m.test(trimmed) ||
    HUNK_RE.test(trimmed) ||
    (FILE_HEADER_RE.test(trimmed) && CHANGE_LINE_RE.test(trimmed))
  ) {
    return { before: "", diff: text, after: "" };
  }
  return null;
}

interface DiffLine {
  type: "add" | "del" | "ctx" | "hunk" | "meta";
  text: string;
  oldNo: number | null;
  newNo: number | null;
}

export function parseDiff(diff: string): DiffLine[] {
  const lines = diff.split("\n");
  const out: DiffLine[] = [];
  let oldNo = 0;
  let newNo = 0;
  let inHunk = false;
  for (const line of lines) {
    const hunk = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      oldNo = parseInt(hunk[1], 10);
      newNo = parseInt(hunk[2], 10);
      inHunk = true;
      out.push({ type: "hunk", text: line, oldNo: null, newNo: null });
      continue;
    }
    if (
      line.startsWith("diff --git ") ||
      line.startsWith("--- ") ||
      line.startsWith("+++ ") ||
      line.startsWith("index ") ||
      line.startsWith("\\") ||
      /^file:\s/i.test(line)
    ) {
      out.push({ type: "meta", text: line, oldNo: null, newNo: null });
      continue;
    }
    if (line.startsWith("+")) {
      out.push({
        type: "add",
        text: line.slice(1),
        oldNo: null,
        newNo: inHunk ? newNo++ : null,
      });
    } else if (line.startsWith("-")) {
      out.push({
        type: "del",
        text: line.slice(1),
        oldNo: inHunk ? oldNo++ : null,
        newNo: null,
      });
    } else {
      const t = line.startsWith(" ") ? line.slice(1) : line;
      out.push({
        type: "ctx",
        text: t,
        oldNo: inHunk ? oldNo++ : null,
        newNo: inHunk ? newNo++ : null,
      });
    }
  }
  return out;
}
