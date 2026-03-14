interface DropZoneProps {
  isDragOver: boolean
  onPickFiles: () => void
}

export function DropZone({ isDragOver, onPickFiles }: DropZoneProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div
        className={`flex flex-col items-center gap-6 rounded-2xl border-2 border-dashed p-16 transition-colors ${
          isDragOver
            ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/30"
            : "border-gray-300 dark:border-gray-700"
        }`}
      >
        <div className="text-6xl text-gray-400 dark:text-gray-600">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            CC Session Viewer
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Drop <code className="rounded bg-gray-200 px-1.5 py-0.5 text-sm dark:bg-gray-800">.jsonl</code> session files here
          </p>
        </div>
        <button
          onClick={onPickFiles}
          className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
        >
          Browse files
        </button>
      </div>
    </div>
  )
}
