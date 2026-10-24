import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { arNum, formatArabicDate } from '../lib/format'
import { REVIEW_ACTIONS, STATUS_META } from '../lib/status'
import type { DocumentItem, Role, Status } from '../types'
import { StatusBadge } from './StatusBadge'

const fieldClass =
  'w-full rounded-xl border border-line bg-sheet px-3 py-2.5 outline-none focus:border-pine'

export function Lightbox({
  docs,
  index,
  role,
  onClose,
  onIndex,
  onReview,
  onReplace,
  onDelete,
}: {
  docs: DocumentItem[]
  index: number
  role: Role
  onClose: () => void
  onIndex: (index: number) => void
  onReview: (id: string, status: Status, note: string) => Promise<void>
  onReplace: (id: string, file: File) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const doc = docs[index]
  const [status, setStatus] = useState<Status | null>(doc && doc.status !== 'new' ? doc.status : null)
  const [note, setNote] = useState(doc?.note ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState<'review' | 'replace' | 'delete' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!doc) return
    setStatus(doc.status === 'new' ? null : doc.status)
    setNote(doc.note)
    setError(null)
    setSaved(false)
    setBusy(null)
    setConfirmDelete(false)
    // إعادة ضبط النموذج عند الانتقال لصورة أخرى أو بعد استبدال الملف فقط.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.id, doc?.image_url])

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName
      const typing = tag === 'TEXTAREA' || tag === 'INPUT'
      if (event.key === 'Escape') onClose()
      if (typing) return
      if (event.key === 'ArrowLeft' && index < docs.length - 1) onIndex(index + 1)
      if (event.key === 'ArrowRight' && index > 0) onIndex(index - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [docs.length, index, onClose, onIndex])

  if (!doc) return null

  async function saveReview() {
    if (!doc || !status || status === 'new') {
      setError('اختر حالة: تم التعديل، مقبول، أو رفض.')
      return
    }
    setBusy('review')
    setError(null)
    try {
      await onReview(doc.id, status, note.trim())
      setSaved(true)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'تعذر حفظ المراجعة.')
    } finally {
      setBusy(null)
    }
  }

  async function replace(file: File | null) {
    if (!doc || !file) return
    setBusy('replace')
    setError(null)
    try {
      await onReplace(doc.id, file)
      setSaved(true)
    } catch (replaceError) {
      setError(replaceError instanceof Error ? replaceError.message : 'تعذر استبدال الصورة.')
    } finally {
      setBusy(null)
    }
  }

  async function remove() {
    if (!doc) return
    setBusy('delete')
    setError(null)
    try {
      await onDelete(doc.id)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'تعذر حذف الصورة.')
      setBusy(null)
    }
  }

  const viewerNote =
    doc.status === 'new' && doc.note
      ? `ملاحظة سابقة: ${doc.note}`
      : doc.status === 'new'
        ? 'لسه ما انراجعت.'
        : doc.note || 'انراجعت بدون ملاحظة.'

  return (
    <div className="fixed inset-0 z-50 bg-ink/70 sm:p-4" role="dialog" aria-modal="true" aria-label={doc.title}>
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-sand sm:rounded-3xl sm:border sm:border-line">
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <p className="text-sm text-muted">
              {arNum(index + 1)} من {arNum(docs.length)}
            </p>
            <h2 className="text-lg font-semibold">{doc.title}</h2>
          </div>
          <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-full border border-line" aria-label="إغلاق">
            <X size={18} />
          </button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col-reverse lg:grid lg:grid-cols-[380px_minmax(0,1fr)]">
          <aside className="max-h-[58%] overflow-auto border-t border-line lg:max-h-none lg:border-t-0 lg:border-s">
            <div className="space-y-5 p-5">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted">اسم الصورة</dt>
                  <dd className="mt-1 font-medium">{doc.title}</dd>
                </div>
                <div>
                  <dt className="text-muted">تاريخ الرفع</dt>
                  <dd className="mt-1 font-medium">{formatArabicDate(doc.upload_date)}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-muted">الحالة</dt>
                  <dd className="mt-1 flex items-center gap-2">
                    <StatusBadge status={doc.status} />
                    <span className="text-muted">{STATUS_META[doc.status].hint}</span>
                  </dd>
                </div>
              </dl>

              {role === 'viewer' ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted">اختر الحالة واكتب ملاحظة لمدخل البيانات، ثم احفظ المراجعة.</p>
                  <div className="grid gap-2">
                    {REVIEW_ACTIONS.map((action) => {
                      const selected = status === action.status
                      return (
                        <button
                          key={action.status}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => {
                            setStatus(action.status)
                            setSaved(false)
                          }}
                          className={`rounded-xl border px-3 py-2 text-right ${selected ? 'border-pine bg-pine-soft' : 'border-line bg-sheet'}`}
                        >
                          <span className="block font-medium">{action.label}</span>
                          <span className="text-sm text-muted">{action.description}</span>
                        </button>
                      )
                    })}
                  </div>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium">ملاحظة للمدخل</span>
                    <textarea
                      className={`${fieldClass} min-h-28 resize-y`}
                      value={note}
                      maxLength={1000}
                      onChange={(event) => {
                        setNote(event.target.value)
                        setSaved(false)
                      }}
                      placeholder="مثال: أعد التصوير بضوء أوضح والورقة كاملة."
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void saveReview()}
                    disabled={busy !== null}
                    className="w-full rounded-xl bg-pine px-4 py-3 font-medium text-sand disabled:opacity-60"
                  >
                    {busy === 'review' ? 'نحفظ المراجعة...' : 'حفظ المراجعة'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-line bg-paper px-4 py-3">
                    <p className="text-sm font-medium">ملاحظة المشاهد</p>
                    <p className="mt-2 text-sm leading-7">{viewerNote}</p>
                  </div>
                  <label className="inline-flex w-full cursor-pointer items-center justify-center rounded-xl border border-line bg-sheet px-4 py-3 text-sm font-medium">
                    {busy === 'replace' ? 'نبدّل الصورة...' : 'استبدال الصورة'}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      disabled={busy !== null}
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null
                        event.target.value = ''
                        void replace(file)
                      }}
                    />
                  </label>
                  <p className="text-sm text-muted">الاستبدال يرجّع الحالة إلى جديد، والملاحظة السابقة تبقى حتى يراجعها المشاهد.</p>
                  {confirmDelete ? (
                    <div className="rounded-2xl border border-rejected/30 bg-rejected-soft p-3">
                      <p className="text-sm">نحذف هالصورة من المكتب؟</p>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => void remove()}
                          disabled={busy !== null}
                          className="rounded-xl bg-rejected px-3 py-2 text-sm text-sand"
                        >
                          {busy === 'delete' ? 'نحذف...' : 'تأكيد الحذف'}
                        </button>
                        <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-xl border border-line bg-sheet px-3 py-2 text-sm">
                          إلغاء
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setConfirmDelete(true)} className="text-sm text-rejected">
                      حذف الصورة
                    </button>
                  )}
                </div>
              )}

              {saved ? <p className="text-sm text-accepted">تم الحفظ.</p> : null}
              {error ? <p className="text-sm text-rejected">{error}</p> : null}
            </div>
          </aside>
          <div className="relative flex min-h-[38vh] flex-1 items-center justify-center bg-paper p-4 lg:min-h-0">
            <img src={doc.image_url} alt={doc.title} className="max-h-[42vh] max-w-full object-contain lg:max-h-[calc(100vh-8rem)]" />
            <button
              type="button"
              aria-label="السابق"
              disabled={index === 0}
              onClick={() => onIndex(index - 1)}
              className="absolute top-1/2 right-3 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-line bg-sand disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
            <button
              type="button"
              aria-label="التالي"
              disabled={index === docs.length - 1}
              onClick={() => onIndex(index + 1)}
              className="absolute top-1/2 left-3 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-line bg-sand disabled:opacity-30"
            >
              <ChevronLeft size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
