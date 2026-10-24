import { emptyCounts } from './status'
import type { DocumentItem, Office, OfficeSummary } from '../types'

export function summarizeOffices(
  offices: Office[],
  documents: Pick<DocumentItem, 'office_id' | 'status'>[],
): OfficeSummary[] {
  return offices
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((office) => {
      const byStatus = emptyCounts()
      let total = 0
      for (const doc of documents) {
        if (doc.office_id !== office.id) continue
        total += 1
        byStatus[doc.status] += 1
      }
      return { ...office, total, byStatus }
    })
}

export function sortDocuments<T extends { created_at: string }>(documents: T[]): T[] {
  return documents.slice().sort((a, b) => b.created_at.localeCompare(a.created_at))
}
