export type Role = 'entry' | 'viewer'

export type Status = 'new' | 'edited' | 'accepted' | 'rejected'

export type AppMode = 'local' | 'cloud'

export type Office = {
  id: string
  name: string
  created_at: string
}

export type OfficeSummary = Office & {
  total: number
  byStatus: Record<Status, number>
  searchText: string
}

export type DocumentItem = {
  id: string
  office_id: string
  title: string
  image_url: string
  storage_path: string | null
  upload_date: string
  status: Status
  note: string
  created_at: string
}

export type Session = {
  role: Role
  name: string
  username?: string
  email?: string
  mode: AppMode
}

export interface DataApi {
  listOffices(): Promise<OfficeSummary[]>
  createOffice(name: string): Promise<Office>
  renameOffice(id: string, name: string): Promise<Office>
  deleteOffice(id: string): Promise<void>
  listDocuments(officeId: string): Promise<DocumentItem[]>
  upload(officeId: string, title: string, file: File): Promise<DocumentItem>
  review(id: string, status: Status, note: string): Promise<void>
  replace(id: string, file: File): Promise<void>
  removeDocument(id: string): Promise<void>
  subscribe(cb: () => void): () => void
}
