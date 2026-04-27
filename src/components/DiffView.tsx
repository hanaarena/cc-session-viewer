import { useMemo } from "react";
import { CopyButton } from "./CopyButton";
import { parseDiff } from "@/lib/detect-diff";

export function DiffView({ diff }: { diff: string }) {
  const rows = useMemo(() => parseDiff(diff), [diff]);
  return (
    <div className="group relative my-2 overflow-hidden rounded-md border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/60">
      <CopyButton
        content={diff}
        className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100"
      />
      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-mono text-xs leading-relaxed">
          <tbody>
            {rows.map((r, i) => {
              const rowCls =
                r.type === "add"
                  ? "bg-emerald-50 dark:bg-emerald-950/30"
                  : r.type === "del"
                    ? "bg-red-50 dark:bg-red-950/30"
                    : r.type === "hunk"
                      ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                      : r.type === "meta"
                        ? "bg-gray-100 text-gray-500 dark:bg-gray-800/60 dark:text-gray-400"
                        : "";
              const sign =
                r.type === "add"
                  ? "+"
                  : r.type === "del"
                    ? "-"
                    : r.type === "hunk"
                      ? ""
                      : " ";
              const signCls =
                r.type === "add"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : r.type === "del"
                    ? "text-red-600 dark:text-red-400"
                    : "text-gray-400 dark:text-gray-600";
              const textCls =
                r.type === "add"
                  ? "text-emerald-900 dark:text-emerald-200"
                  : r.type === "del"
                    ? "text-red-900 dark:text-red-200"
                    : r.type === "hunk" || r.type === "meta"
                      ? ""
                      : "text-gray-700 dark:text-gray-300";
              return (
                <tr key={i} className={rowCls}>
                  <td className="select-none border-r border-gray-200 px-2 text-right text-[10px] text-gray-400 tabular-nums dark:border-gray-700 dark:text-gray-600">
                    {r.oldNo ?? ""}
                  </td>
                  <td className="select-none border-r border-gray-200 px-2 text-right text-[10px] text-gray-400 tabular-nums dark:border-gray-700 dark:text-gray-600">
                    {r.newNo ?? ""}
                  </td>
                  <td className={`select-none px-1 text-center ${signCls}`}>
                    {sign}
                  </td>
                  <td className={`whitespace-pre-wrap break-all px-2 ${textCls}`}>
                    {r.text || "\u00A0"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
