import { exportToExcel, type ExportPayload } from '../lib/exportExcel.ts'

interface ExportButtonProps {
  payload: ExportPayload
}

export function ExportButton({ payload }: ExportButtonProps) {
  return (
    <button
      type="button"
      className="export-btn"
      onClick={() => exportToExcel(payload)}
    >
      Export Excel
    </button>
  )
}
