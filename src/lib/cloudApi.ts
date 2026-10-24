import { translateError } from './errors'
import { todayISO } from './format'
import { compressImage } from './images'
import { isStatus } from './status'
import { sortDocuments, summarizeOffices } from './summarize'
import { supabase } from './supabaseClient'
import type { DataApi, DocumentItem, Office, Status } from '../types'

const BUCKET = 'documents'

type DocumentRow = {
  id: string
  office_id: string
  title: string
  image_url: string
  storage_path?: string | null
  upload_date: string
  status: string
  note?: string | null
  created_at?: string
}

function client() {
  if (!supabase) throw new Error('Supabase غير مهيأ.')
  return supabase
}

function normalize(row: DocumentRow): DocumentItem {
  return {
    id: row.id,
    office_id: row.office_id,
    title: row.title,
    image_url: row.image_url,
    storage_path: row.storage_path ?? null,
    upload_date: row.upload_date.slice(0, 10),
    status: isStatus(row.status) ? row.status : 'new',
    note: row.note ?? '',
    created_at: row.created_at ?? new Date().toISOString(),
  }
}

export const cloudApi: DataApi = {
  async listOffices() {
    const db = client()
    const [officesResult, documentsResult] = await Promise.all([
      db.from('offices').select('id, name, created_at').order('created_at', { ascending: false }),
      db.from('documents').select('office_id, status'),
    ])
    if (officesResult.error) throw new Error(translateError(officesResult.error))
    if (documentsResult.error) throw new Error(translateError(documentsResult.error))

    const offices = (officesResult.data ?? []) as Office[]
    const documents = (documentsResult.data ?? []).map((row) => ({
      office_id: String(row.office_id),
      status: isStatus(String(row.status)) ? (row.status as Status) : 'new',
    }))
    return summarizeOffices(offices, documents)
  },

  async createOffice(name) {
    const db = client()
    const { data, error } = await db
      .from('offices')
      .insert({ name: name.trim() })
      .select('id, name, created_at')
      .single()
    if (error) throw new Error(translateError(error))
    return data as Office
  },

  async renameOffice(id, name) {
    const db = client()
    const { data, error } = await db
      .from('offices')
      .update({ name: name.trim() })
      .eq('id', id)
      .select('id, name, created_at')
      .single()
    if (error) throw new Error(translateError(error))
    return data as Office
  },

  async deleteOffice(id) {
    const db = client()
    const { data, error: readError } = await db.from('documents').select('storage_path').eq('office_id', id)
    if (readError) throw new Error(translateError(readError))
    const paths = (data ?? [])
      .map((row) => row.storage_path)
      .filter((path): path is string => typeof path === 'string' && path.length > 0)
    if (paths.length > 0) {
      const { error: storageError } = await db.storage.from(BUCKET).remove(paths)
      if (storageError) throw new Error(translateError(storageError))
    }
    const { error } = await db.from('offices').delete().eq('id', id)
    if (error) throw new Error(translateError(error))
  },

  async listDocuments(officeId) {
    const db = client()
    const { data, error } = await db
      .from('documents')
      .select('*')
      .eq('office_id', officeId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(translateError(error))
    return sortDocuments((data ?? []).map((row) => normalize(row as DocumentRow)))
  },

  async upload(officeId, title, file) {
    const db = client()
    const blob = await compressImage(file)
    const id = crypto.randomUUID()
    const path = `${officeId}/${id}.jpg`
    const { error: uploadError } = await db.storage.from(BUCKET).upload(path, blob, {
      contentType: 'image/jpeg',
      upsert: false,
    })
    if (uploadError) throw new Error(translateError(uploadError))

    const publicUrl = db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
    const { data, error } = await db
      .from('documents')
      .insert({
        id,
        office_id: officeId,
        title: title.trim(),
        image_url: publicUrl,
        storage_path: path,
        upload_date: todayISO(),
        status: 'new',
        note: '',
      })
      .select('*')
      .single()

    if (error) {
      await db.storage.from(BUCKET).remove([path])
      throw new Error(translateError(error))
    }
    return normalize(data as DocumentRow)
  },

  async review(id, status, note) {
    const db = client()
    const { error } = await db.from('documents').update({ status, note }).eq('id', id)
    if (error) throw new Error(translateError(error))
  },

  async replace(id, file) {
    const db = client()
    const { data: existing, error: readError } = await db.from('documents').select('*').eq('id', id).single()
    if (readError) throw new Error(translateError(readError))
    const current = normalize(existing as DocumentRow)
    const blob = await compressImage(file)
    const path = current.storage_path || `${current.office_id}/${current.id}.jpg`
    const { error: uploadError } = await db.storage.from(BUCKET).upload(path, blob, {
      contentType: 'image/jpeg',
      upsert: true,
    })
    if (uploadError) throw new Error(translateError(uploadError))

    const publicUrl = db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
    const { error } = await db
      .from('documents')
      .update({
        image_url: `${publicUrl}?v=${Date.now()}`,
        storage_path: path,
        upload_date: todayISO(),
        status: 'new',
      })
      .eq('id', id)
    if (error) throw new Error(translateError(error))
  },

  async removeDocument(id) {
    const db = client()
    const { data, error: readError } = await db.from('documents').select('storage_path').eq('id', id).maybeSingle()
    if (readError) throw new Error(translateError(readError))
    const path = data?.storage_path
    if (typeof path === 'string' && path.length > 0) {
      const { error: storageError } = await db.storage.from(BUCKET).remove([path])
      if (storageError) throw new Error(translateError(storageError))
    }
    const { error } = await db.from('documents').delete().eq('id', id)
    if (error) throw new Error(translateError(error))
  },

  subscribe(cb) {
    const db = supabase
    if (!db) return () => undefined
    const realtime = db
      .channel('diwan-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, () => cb())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offices' }, () => cb())
      .subscribe()
    return () => {
      void db.removeChannel(realtime)
    }
  },
}
