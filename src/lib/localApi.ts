import { todayISO } from './format'
import { blobToDataUrl, compressImage } from './images'
import { sortDocuments, summarizeOffices } from './summarize'
import type { DataApi, DocumentItem, Office, Role, Session, Status } from '../types'

const DB_NAME = 'diwan-hamza'
const DB_VERSION = 3

type LocalUser = {
  id: string
  username: string
  name: string
  role: Role
  salt: string
  passwordHash: string
}

type MetaRow = { key: string; value: boolean }

const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('diwan-hamza') : null

function notify() {
  channel?.postMessage({ type: 'changed' })
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('تعذر القراءة من ذاكرة المتصفح.'))
  })
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('تعذر حفظ البيانات على هذا الجهاز.'))
    tx.onabort = () => reject(tx.error ?? new Error('انقطع حفظ البيانات.'))
  })
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const database = req.result
      if (!database.objectStoreNames.contains('offices')) {
        database.createObjectStore('offices', { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains('documents')) {
        database.createObjectStore('documents', { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains('meta')) {
        database.createObjectStore('meta', { keyPath: 'key' })
      }
      if (!database.objectStoreNames.contains('users')) {
        const users = database.createObjectStore('users', { keyPath: 'id' })
        users.createIndex('username', 'username', { unique: true })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('المتصفح منع حفظ البيانات محلياً.'))
  })
}

let databasePromise: Promise<IDBDatabase> | null = null

function database(): Promise<IDBDatabase> {
  if (!databasePromise) {
    databasePromise = openDatabase().catch((error) => {
      databasePromise = null
      throw error
    })
  }
  return databasePromise
}

async function getAll<T>(store: 'offices' | 'documents'): Promise<T[]> {
  const db = await database()
  const tx = db.transaction(store, 'readonly')
  const done = transactionDone(tx)
  const rows = request<T[]>(tx.objectStore(store).getAll())
  const [result] = await Promise.all([rows, done])
  return result
}

async function getOne<T>(store: 'offices' | 'documents', id: string): Promise<T | undefined> {
  const db = await database()
  const tx = db.transaction(store, 'readonly')
  const done = transactionDone(tx)
  const row = request<T | undefined>(tx.objectStore(store).get(id))
  const [result] = await Promise.all([row, done])
  return result
}

function xmlEscape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function paperSvg(title: string, office: string, stripe: string, stamp: string): string {
  const lines = [340, 390, 440, 490, 540, 590, 640]
    .map((y, index) => {
      const width = index === 6 ? 280 : 470
      return `<rect x="130" y="${y}" width="${width}" height="12" rx="6" fill="#efe6d8"/>`
    })
    .join('')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1040" viewBox="0 0 800 1040">
    <rect width="800" height="1040" fill="#efe8dc"/>
    <rect x="86" y="86" width="628" height="868" fill="#e7dfd1"/>
    <rect x="70" y="70" width="628" height="868" fill="#fffdf8" stroke="#e4d9c8" stroke-width="2"/>
    <rect x="70" y="70" width="628" height="26" fill="${stripe}"/>
    <text x="384" y="230" text-anchor="middle" font-family="Tahoma, Segoe UI, sans-serif" font-size="40" fill="#1a1814">${xmlEscape(title)}</text>
    <text x="384" y="278" text-anchor="middle" font-family="Tahoma, Segoe UI, sans-serif" font-size="22" fill="#6f675e">${xmlEscape(office)}</text>
    ${lines}
    <circle cx="560" cy="800" r="58" fill="none" stroke="${stamp}" stroke-width="6"/>
    <text x="560" y="808" text-anchor="middle" font-family="Tahoma, Segoe UI, sans-serif" font-size="20" fill="${stamp}">نموذج</text>
  </svg>`

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

function seedOffices(): Office[] {
  return [
    { id: 'office-alaa', name: 'علاء الفراشة', created_at: '2026-10-20T09:00:00.000Z' },
    { id: 'office-sara', name: 'سارة الجبوري', created_at: '2026-10-22T11:30:00.000Z' },
  ]
}

function seedDocuments(): DocumentItem[] {
  return [
    {
      id: 'doc-alaa-id',
      office_id: 'office-alaa',
      title: 'صورة الهوية الأمامية',
      image_url: paperSvg('صورة الهوية الأمامية', 'علاء الفراشة', '#1e4a38', '#1d6b43'),
      storage_path: null,
      upload_date: '2026-10-20',
      status: 'accepted',
      note: 'واضحة، والختم يبين. مقبولة.',
      created_at: '2026-10-20T09:10:00.000Z',
    },
    {
      id: 'doc-alaa-contract',
      office_id: 'office-alaa',
      title: 'عقد الإيجار',
      image_url: paperSvg('عقد الإيجار', 'علاء الفراشة', '#8d3530', '#8d3530'),
      storage_path: null,
      upload_date: '2026-10-21',
      status: 'rejected',
      note: 'الصورة مائلة والإضاءة ضعيفة. أعد التصوير والورقة كاملة داخل الإطار.',
      created_at: '2026-10-21T08:40:00.000Z',
    },
    {
      id: 'doc-alaa-statement',
      office_id: 'office-alaa',
      title: 'كشف حساب تشرين',
      image_url: paperSvg('كشف حساب تشرين', 'علاء الفراشة', '#2c4a6e', '#2c4a6e'),
      storage_path: null,
      upload_date: '2026-10-23',
      status: 'new',
      note: '',
      created_at: '2026-10-23T07:15:00.000Z',
    },
    {
      id: 'doc-alaa-residency',
      office_id: 'office-alaa',
      title: 'تجديد الإقامة',
      image_url: paperSvg('تجديد الإقامة', 'علاء الفراشة', '#8a5a1e', '#8a5a1e'),
      storage_path: null,
      upload_date: '2026-10-22',
      status: 'edited',
      note: 'تم قص الأطراف الزايدة. اعتمد هالنسخة بعد ما تتأكد من رقم الإقامة.',
      created_at: '2026-10-22T13:05:00.000Z',
    },
    {
      id: 'doc-sara-passport',
      office_id: 'office-sara',
      title: 'جواز السفر',
      image_url: paperSvg('جواز السفر', 'سارة الجبوري', '#1e4a38', '#1e4a38'),
      storage_path: null,
      upload_date: '2026-10-22',
      status: 'new',
      note: '',
      created_at: '2026-10-22T11:45:00.000Z',
    },
  ]
}

async function ensureSeed(): Promise<void> {
  const db = await database()
  const readTx = db.transaction('meta', 'readonly')
  const readDone = transactionDone(readTx)
  const metaReq = request<MetaRow | undefined>(readTx.objectStore('meta').get('seeded'))
  const [meta] = await Promise.all([metaReq, readDone])
  if (meta?.value) return

  const writeTx = db.transaction(['offices', 'documents', 'meta'], 'readwrite')
  const writeDone = transactionDone(writeTx)
  for (const office of seedOffices()) writeTx.objectStore('offices').put(office)
  for (const doc of seedDocuments()) writeTx.objectStore('documents').put(doc)
  writeTx.objectStore('meta').put({ key: 'seeded', value: true } satisfies MetaRow)
  await writeDone
}

async function requireDocument(id: string): Promise<DocumentItem> {
  const doc = await getOne<DocumentItem>('documents', id)
  if (!doc) throw new Error('الصورة ما موجودة.')
  return doc
}

export const localApi: DataApi = {
  async listOffices() {
    await ensureSeed()
    const [offices, documents] = await Promise.all([
      getAll<Office>('offices'),
      getAll<Pick<DocumentItem, 'office_id' | 'status' | 'title' | 'note'>>('documents'),
    ])
    return summarizeOffices(offices, documents)
  },

  async createOffice(name) {
    await ensureSeed()
    const office: Office = {
      id: crypto.randomUUID(),
      name: name.trim(),
      created_at: new Date().toISOString(),
    }
    const db = await database()
    const tx = db.transaction('offices', 'readwrite')
    const done = transactionDone(tx)
    tx.objectStore('offices').put(office)
    await done
    notify()
    return office
  },

  async renameOffice(id, name) {
    await ensureSeed()
    const current = await getOne<Office>('offices', id)
    if (!current) throw new Error('المكتب ما موجود.')
    const next: Office = { ...current, name: name.trim() }
    const db = await database()
    const tx = db.transaction('offices', 'readwrite')
    const done = transactionDone(tx)
    tx.objectStore('offices').put(next)
    await done
    notify()
    return next
  },

  async deleteOffice(id) {
    await ensureSeed()
    const documents = await getAll<DocumentItem>('documents')
    const db = await database()
    const tx = db.transaction(['offices', 'documents'], 'readwrite')
    const done = transactionDone(tx)
    tx.objectStore('offices').delete(id)
    for (const doc of documents) {
      if (doc.office_id === id) tx.objectStore('documents').delete(doc.id)
    }
    await done
    notify()
  },

  async listDocuments(officeId) {
    await ensureSeed()
    const documents = await getAll<DocumentItem>('documents')
    return sortDocuments(documents.filter((doc) => doc.office_id === officeId))
  },

  async upload(officeId, title, file) {
    await ensureSeed()
    const blob = await compressImage(file)
    const doc: DocumentItem = {
      id: crypto.randomUUID(),
      office_id: officeId,
      title: title.trim(),
      image_url: await blobToDataUrl(blob),
      storage_path: null,
      upload_date: todayISO(),
      status: 'new',
      note: '',
      created_at: new Date().toISOString(),
    }
    const db = await database()
    const tx = db.transaction('documents', 'readwrite')
    const done = transactionDone(tx)
    tx.objectStore('documents').put(doc)
    await done
    notify()
    return doc
  },

  async review(id, status: Status, note) {
    await ensureSeed()
    const current = await requireDocument(id)
    const next: DocumentItem = { ...current, status, note }
    const db = await database()
    const tx = db.transaction('documents', 'readwrite')
    const done = transactionDone(tx)
    tx.objectStore('documents').put(next)
    await done
    notify()
  },

  async replace(id, file) {
    await ensureSeed()
    const current = await requireDocument(id)
    const blob = await compressImage(file)
    const next: DocumentItem = {
      ...current,
      image_url: await blobToDataUrl(blob),
      upload_date: todayISO(),
      status: 'new',
    }
    const db = await database()
    const tx = db.transaction('documents', 'readwrite')
    const done = transactionDone(tx)
    tx.objectStore('documents').put(next)
    await done
    notify()
  },

  async removeDocument(id) {
    await ensureSeed()
    const db = await database()
    const tx = db.transaction('documents', 'readwrite')
    const done = transactionDone(tx)
    tx.objectStore('documents').delete(id)
    await done
    notify()
  },

  subscribe(cb) {
    if (!channel) return () => undefined
    const handler = () => cb()
    channel.addEventListener('message', handler)
    return () => channel.removeEventListener('message', handler)
  },
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase()
}

async function hashPassword(password: string, salt: string) {
  const encoded = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function findUser(username: string): Promise<LocalUser | undefined> {
  const db = await database()
  const tx = db.transaction('users', 'readonly')
  const done = transactionDone(tx)
  const row = request<LocalUser | undefined>(tx.objectStore('users').index('username').get(username))
  const [result] = await Promise.all([row, done])
  return result
}

async function ensureAccounts() {
  const db = await database()
  const readTx = db.transaction('meta', 'readonly')
  const readDone = transactionDone(readTx)
  const metaReq = request<MetaRow | undefined>(readTx.objectStore('meta').get('accounts-seeded'))
  const [meta] = await Promise.all([metaReq, readDone])
  if (meta?.value) return

  const drafts: { id: string; username: string; name: string; role: Role; password: string }[] = [
    { id: 'user-entry', username: 'entry', name: 'مدخل البيانات', role: 'entry', password: '123456' },
    { id: 'user-viewer', username: 'viewer', name: 'المشاهد', role: 'viewer', password: '123456' },
  ]
  const users: LocalUser[] = []
  for (const draft of drafts) {
    const salt = crypto.randomUUID()
    users.push({
      id: draft.id,
      username: draft.username,
      name: draft.name,
      role: draft.role,
      salt,
      passwordHash: await hashPassword(draft.password, salt),
    })
  }

  const writeTx = db.transaction(['users', 'meta'], 'readwrite')
  const writeDone = transactionDone(writeTx)
  for (const user of users) writeTx.objectStore('users').put(user)
  writeTx.objectStore('meta').put({ key: 'accounts-seeded', value: true } satisfies MetaRow)
  await writeDone
}

function sessionFromAccount(account: LocalUser): Session {
  return {
    role: account.role,
    name: account.name,
    username: account.username,
    mode: 'local',
  }
}

export async function signInLocal(username: string, password: string): Promise<Session> {
  await ensureAccounts()
  const account = await findUser(normalizeUsername(username))
  if (!account) throw new Error('اسم المستخدم أو كلمة السر غير صحيحة.')
  const hash = await hashPassword(password, account.salt)
  if (hash !== account.passwordHash) throw new Error('اسم المستخدم أو كلمة السر غير صحيحة.')
  return sessionFromAccount(account)
}
