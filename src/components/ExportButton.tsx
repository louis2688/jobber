import { useState } from 'react'
import type { ExportPayload } from '../lib/exportExcel.ts'

interface ExportButtonProps {
  payload: ExportPayload
}

export function ExportButton({ payload }: ExportButtonProps) {
  const [busy, setBusy] = useState(false)

  return (
    <button
      type="button"
      className="export-btn"
      disabled={busy}
      onClick={() => {
        setBusy(true)
        void import('../lib/exportExcel.ts')
          .then(({ exportToExcel }) => exportToExcel(payload))
          .catch((err: unknown) => {
            console.error('Excel export failed', err)
          })
          .finally(() => setBusy(false))
      }}
    >
      {busy ? 'Exporting…' : 'Export Excel'}
    </button>
  )
}
