import { emptyCounts } from './status'
import type { DocumentItem, Office, OfficeSummary } from '../types'

type SummaryDocument = Pick<DocumentItem, 'office_id' | 'status'> & Partial<Pick<DocumentItem, 'title' | 'note'>>

export function summarizeOffices(offices: Office[], documents: SummaryDocument[]): OfficeSummary[] {
  return offices
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((office) => {
      const byStatus = emptyCounts()
      const words = [office.name]
      let total = 0
      for (const doc of documents) {
        if (doc.office_id !== office.id) continue
        total += 1
        byStatus[doc.status] += 1
        if (doc.title) words.push(doc.title)
        if (doc.note) words.push(doc.note)
      }
      return { ...office, total, byStatus, searchText: words.join(' ') }
    })
}

export function sortDocuments<T extends { created_at: string }>(documents: T[]): T[] {
  return documents.slice().sort((a, b) => b.created_at.localeCompare(a.created_at))
}
