import { ChevronRight, ImagePlus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Lightbox } from '../components/Lightbox'
import { Modal } from '../components/Modal'
import { StatusBadge } from '../components/StatusBadge'
import { StudioModal } from '../components/StudioModal'
import { useApp } from '../context/AppState'
import { api } from '../lib/api'
import { arNum, formatArabicDate } from '../lib/format'
import type { DocumentItem, Status } from '../types'

const filters: { id: Status | 'all'; label: string }[] = [
  { id: 'all', label: 'الكل' },
  { id: 'new', label: 'جديد' },
  { id: 'edited', label: 'تم التعديل' },
  { id: 'accepted', label: 'مقبول' },
  { id: 'rejected', label: 'مرفوض' },
]

export function OfficePage() {
  const { officeId = '' } = useParams()
  const navigate = useNavigate()
  const { session, offices, officesLoading, refreshOffices } = useApp()
  const office = offices.find((item) => item.id === officeId)
  const [docs, setDocs] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Status | 'all'>('all')
  const [studio, setStudio] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [confirmOffice, setConfirmOffice] = useState(false)
  const [deletingOffice, setDeletingOffice] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [renaming, setRenaming] = useState(false)

  const loadDocs = useCallback(async () => {
    const next = await api.listDocuments(officeId)
    setDocs(next)
    setError(null)
  }, [officeId])

  useEffect(() => {
    document.title = office ? `${office.name} · ديوان` : 'ديوان'
  }, [office])

  useEffect(() => {
    let live = true
    setLoading(true)
    loadDocs()
      .catch((loadError) => {
        if (live) setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل الصور.')
      })
      .finally(() => {
        if (live) setLoading(false)
      })
    const unsubscribe = api.subscribe(() => {
      void loadDocs().catch((loadError) => {
        if (live) setError(loadError instanceof Error ? loadError.message : 'تعذر تحديث الصور.')
      })
      void refreshOffices()
    })
    return () => {
      live = false
      unsubscribe()
    }
  }, [loadDocs, refreshOffices])

  if (!session) return null

  const visible = docs.filter((doc) => filter === 'all' || doc.status === filter)
  const openIndex = visible.findIndex((doc) => doc.id === openId)
  const isEntry = session.role === 'entry'

  function noteLine(doc: DocumentItem) {
    if (doc.status === 'new' && doc.note) return `ملاحظة سابقة: ${doc.note}`
    if (doc.status === 'new') return 'لسه ما انراجعت'
    return doc.note || 'انراجعت بدون ملاحظة'
  }

  async function upload(title: string, file: File) {
    await api.upload(officeId, title, file)
    await loadDocs()
    await refreshOffices()
  }

  async function review(id: string, status: Status, note: string) {
    await api.review(id, status, note)
    await loadDocs()
    await refreshOffices()
  }

  async function replace(id: string, file: File) {
    await api.replace(id, file)
    await loadDocs()
    await refreshOffices()
  }

  async function removeDocument(id: string) {
    const previous = visible
    const removedAt = previous.findIndex((doc) => doc.id === id)
    await api.removeDocument(id)
    const nextDocs = await api.listDocuments(officeId)
    setDocs(nextDocs)
    await refreshOffices()
    const nextVisible = nextDocs.filter((doc) => filter === 'all' || doc.status === filter)
    const neighbor = nextVisible[removedAt] ?? nextVisible[removedAt - 1]
    setOpenId(neighbor?.id ?? null)
  }

  async function removeOffice() {
    setDeletingOffice(true)
    try {
      await api.deleteOffice(officeId)
      await refreshOffices()
      navigate('/offices')
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'تعذر حذف المكتب.')
      setDeletingOffice(false)
    }
  }

  if (!office && (officesLoading || loading)) {
    return <p className="text-muted">نحمّل المكتب...</p>
  }

  if (!office) {
    return (
      <p className="text-muted">
        هذا المكتب ما موجود.{' '}
        <Link to="/offices" className="text-pine">
          رجوع للمكاتب
        </Link>
      </p>
    )
  }

  return (
    <div>
      <Link to="/offices" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronRight size={16} />
        المكاتب
      </Link>
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="border-s-4 border-pine ps-3 text-3xl font-semibold">{office.name}</h1>
            {isEntry ? (
              <button
                type="button"
                onClick={() => {
                  setRenameValue(office.name)
                  setError(null)
                  setRenameOpen(true)
                }}
                className="rounded-lg border border-line bg-sand px-3 py-1.5 text-sm"
              >
                تعديل الاسم
              </button>
            ) : null}
          </div>
          <p className="mt-3 max-w-2xl text-muted">
            {isEntry
              ? 'ارفع الصورة من الاستوديو. تحت كل صورة حالتها، وإذا شافها المشاهد شنو كتب.'
              : 'افتح الصورة بحجم كامل، ثبّت الحالة، واكتب الملاحظة لمدخل البيانات.'}
          </p>
        </div>
        {isEntry ? (
          <button
            type="button"
            onClick={() => setStudio(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-pine px-4 py-2.5 font-medium text-sand sm:shrink-0"
          >
            <ImagePlus size={18} />
            رفع صورة
          </button>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {filters.map((item) => {
          const count = item.id === 'all' ? docs.length : docs.filter((doc) => doc.status === item.id).length
          const selected = filter === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`rounded-full border px-3 py-1.5 text-sm ${selected ? 'border-pine bg-pine text-sand' : 'border-line bg-sand'}`}
            >
              {item.label} {arNum(count)}
            </button>
          )
        })}
      </div>

      {error ? <p className="mt-4 text-sm text-rejected">{error}</p> : null}
      {loading && docs.length === 0 ? <p className="mt-8 text-muted">نحمّل الصور...</p> : null}

      {!loading && docs.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-line bg-sand px-5 py-8 text-muted">
          {isEntry ? 'هذا المكتب فاضي. ارفع أول صورة من الاستوديو.' : 'ماكو صور بهالمكتب بعد.'}
        </p>
      ) : null}

      {!loading && docs.length > 0 && visible.length === 0 ? (
        <p className="mt-8 text-muted">ماكو صور بهالحالة.</p>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((doc) => (
          <button
            key={doc.id}
            type="button"
            onClick={() => setOpenId(doc.id)}
            className="overflow-hidden rounded-2xl border border-line bg-sand text-right hover:border-pine"
          >
            <img src={doc.image_url} alt="" className="aspect-[4/3] w-full bg-paper object-cover" />
            <span className="block p-4">
              <span className="flex items-start justify-between gap-3">
                <span className="font-semibold">{doc.title}</span>
                <StatusBadge status={doc.status} />
              </span>
              <span className="mt-2 block text-sm text-muted">{formatArabicDate(doc.upload_date)}</span>
              <span className="mt-2 line-clamp-2 block text-sm leading-6">{noteLine(doc)}</span>
            </span>
          </button>
        ))}
      </div>

      {isEntry ? (
        <button type="button" onClick={() => setConfirmOffice(true)} className="mt-10 text-sm text-rejected">
          حذف المكتب
        </button>
      ) : null}

      {studio ? <StudioModal onClose={() => setStudio(false)} onSubmit={upload} /> : null}

      {openIndex >= 0 ? (
        <Lightbox
          docs={visible}
          index={openIndex}
          role={session.role}
          onClose={() => setOpenId(null)}
          onIndex={(index) => setOpenId(visible[index]?.id ?? null)}
          onReview={review}
          onReplace={replace}
          onDelete={removeDocument}
        />
      ) : null}

      {renameOpen ? (
        <Modal title="تعديل المجلد" subtitle="غيّر اسم المكتب. الصور تبقى بمكانها." onClose={() => setRenameOpen(false)}>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (!renameValue.trim()) {
                setError('اكتب اسم المكتب.')
                return
              }
              setRenaming(true)
              setError(null)
              void api
                .renameOffice(office.id, renameValue.trim())
                .then(() => refreshOffices())
                .then(() => setRenameOpen(false))
                .catch((renameError) => setError(renameError instanceof Error ? renameError.message : 'تعذر تعديل المكتب.'))
                .finally(() => setRenaming(false))
            }}
            className="space-y-4"
          >
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">اسم المكتب</span>
              <input
                className="w-full rounded-xl border border-line bg-sheet px-3 py-2.5 outline-none focus:border-pine"
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                maxLength={80}
                autoFocus
              />
            </label>
            {error ? <p className="text-sm text-rejected">{error}</p> : null}
            <button type="submit" disabled={renaming} className="w-full rounded-xl bg-pine px-4 py-3 font-medium text-sand disabled:opacity-60">
              {renaming ? 'نحفظ الاسم...' : 'حفظ التعديل'}
            </button>
          </form>
        </Modal>
      ) : null}

      {confirmOffice ? (
        <Modal title="حذف المكتب" onClose={() => setConfirmOffice(false)}>
          <p className="leading-7">نحذف «{office.name}» وكل الصور اللي بداخله؟ هذا الإجراء ما يرجع.</p>
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => void removeOffice()}
              disabled={deletingOffice}
              className="rounded-xl bg-rejected px-4 py-2.5 text-sand disabled:opacity-60"
            >
              {deletingOffice ? 'نحذف...' : 'حذف المكتب'}
            </button>
            <button type="button" onClick={() => setConfirmOffice(false)} className="rounded-xl border border-line bg-sheet px-4 py-2.5">
              إلغاء
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
