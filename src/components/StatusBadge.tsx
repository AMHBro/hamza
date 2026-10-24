import { STATUS_META } from '../lib/status'
import type { Status } from '../types'

export function StatusBadge({ status }: { status: Status }) {
  const meta = STATUS_META[status]
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${meta.chip}`}>{meta.label}</span>
}
