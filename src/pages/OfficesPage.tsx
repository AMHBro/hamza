import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Modal } from '../components/Modal'
import { useApp } from '../context/AppState'
import { api } from '../lib/api'
import { arNum, formatArabicDate } from '../lib/format'
import { isCloud } from '../lib/supabaseClient'
import { STATUS_META } from '../lib/status'
import type { Status } from '../types'

const fieldClass =
  'w-full rounded-xl border border-line bg-sheet px-3 py-2.5 outline-none focus:border-pine'

const countOrder: Status[] = ['new', 'edited', 'accepted', 'rejected']

export function OfficesPage() {
  const navigate = useNavigate()
  const { session, offices, officesLoading, officesError, refreshOffices } = useApp()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [hideTip, setHideTip] = useState(() => sessionStorage.getItem('diwan-hide-tip') === '1')

  useEffect(() => {
    document.title = 'المكاتب · ديوان'
  }, [])

  if (!session) return null
  const isEntry = session.role === 'entry'
  const deleting = offices.find((office) => office.id === deletingId)

  async function createOffice(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      setError('اكتب اسم المكتب.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const created = await api.createOffice(name.trim())
      await refreshOffices()
      setName('')
      setOpen(false)
      navigate(`/offices/${created.id}`)
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'تعذر إضافة المكتب.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="border-s-4 border-pine ps-3 text-3xl font-semibold">المكاتب</h1>
          <p className="mt-3 max-w-2xl text-muted">
            كل مكتب يجمع صور شخص أو ملف. المدخل يرفع، والمشاهد يراجع ويكتب الملاحظة.
          </p>
        </div>
        {isEntry ? (
          <button type="button" onClick={() => setOpen(true)} className="rounded-xl bg-pine px-4 py-2.5 font-medium text-sand sm:shrink-0">
            إضافة مكتب جديد
          </button>
        ) : null}
      </div>

      {!isCloud && !hideTip ? (
        <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-line bg-pine-soft px-4 py-3 text-sm leading-7 text-pine sm:flex-row sm:items-start sm:justify-between">
          <p>الحفظ على هذا المتصفح. للطرف الثاني افتح نافذة جديدة وادخل بحساب viewer وكلمة السر 123456.</p>
          <button
            type="button"
            className="self-start rounded-lg border border-pine/20 px-3 py-1"
            onClick={() => {
              sessionStorage.setItem('diwan-hide-tip', '1')
              setHideTip(true)
            }}
          >
            إخفاء
          </button>
        </div>
      ) : null}

      {officesError ? <p className="mt-4 text-sm text-rejected">{officesError}</p> : null}

      {officesLoading && offices.length === 0 ? <p className="mt-8 text-muted">نحمّل المكاتب...</p> : null}

      {!officesLoading && offices.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-line bg-sand px-5 py-8 text-muted">
          {isEntry ? 'ماكو مكاتب بعد. أضف أول مكتب، مثل: علاء الفراشة.' : 'ماكو مكاتب بعد. مدخل البيانات يضيفها.'}
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {offices.map((office) => (
          <article key={office.id} className="rounded-2xl border border-line bg-sand hover:border-pine">
            <Link to={`/offices/${office.id}`} className="block p-5">
              <span className="flex items-start justify-between gap-3">
                <span className="grid size-12 place-items-center rounded-xl bg-pine text-xl text-sand">{office.name.trim().slice(0, 1)}</span>
                <span className="text-sm text-muted">{formatArabicDate(office.created_at)}</span>
              </span>
              <h2 className="mt-4 text-xl font-semibold">{office.name}</h2>
              <p className="mt-1 text-sm text-muted">{office.total === 0 ? 'بعد ما انرفعت صور' : `${arNum(office.total)} صور`}</p>
              <span className="mt-4 flex flex-wrap gap-2">
                {countOrder.map((status) =>
                  office.byStatus[status] > 0 ? (
                    <span key={status} className={`rounded-full px-2.5 py-1 text-xs ${STATUS_META[status].chip}`}>
                      {STATUS_META[status].label} {arNum(office.byStatus[status])}
                    </span>
                  ) : null,
                )}
              </span>
            </Link>
            {isEntry ? (
              <div className="flex gap-2 border-t border-line px-5 py-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(office.id)
                    setEditName(office.name)
                    setError(null)
                  }}
                  className="rounded-lg border border-line bg-sheet px-3 py-1.5 text-sm"
                >
                  تعديل
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeletingId(office.id)
                    setError(null)
                  }}
                  className="rounded-lg px-3 py-1.5 text-sm text-rejected"
                >
                  حذف
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>

      {open ? (
        <Modal title="إضافة مكتب جديد" subtitle="اسم الشخص أو الملف اللي تتجمع صوره هنا." onClose={() => setOpen(false)}>
          <form onSubmit={(event) => void createOffice(event)} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">اسم المكتب</span>
              <input
                className={fieldClass}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="مثال: علاء الفراشة"
                maxLength={80}
                autoFocus
              />
            </label>
            {error ? <p className="text-sm text-rejected">{error}</p> : null}
            <button type="submit" disabled={busy} className="w-full rounded-xl bg-pine px-4 py-3 font-medium text-sand disabled:opacity-60">
              {busy ? 'نضيف المكتب...' : 'حفظ المكتب'}
            </button>
          </form>
        </Modal>
      ) : null}

      {editingId ? (
        <Modal title="تعديل المجلد" subtitle="غيّر اسم المكتب. الصور اللي بداخله تبقى بمكانها." onClose={() => setEditingId(null)}>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (!editName.trim()) {
                setError('اكتب اسم المكتب.')
                return
              }
              setBusy(true)
              setError(null)
              void api
                .renameOffice(editingId, editName.trim())
                .then(() => refreshOffices())
                .then(() => setEditingId(null))
                .catch((renameError) => setError(renameError instanceof Error ? renameError.message : 'تعذر تعديل المكتب.'))
                .finally(() => setBusy(false))
            }}
            className="space-y-4"
          >
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">اسم المكتب</span>
              <input
                className={fieldClass}
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                maxLength={80}
                autoFocus
              />
            </label>
            {error ? <p className="text-sm text-rejected">{error}</p> : null}
            <button type="submit" disabled={busy} className="w-full rounded-xl bg-pine px-4 py-3 font-medium text-sand disabled:opacity-60">
              {busy ? 'نحفظ الاسم...' : 'حفظ التعديل'}
            </button>
          </form>
        </Modal>
      ) : null}

      {deleting ? (
        <Modal title="حذف المجلد" onClose={() => setDeletingId(null)}>
          <p className="leading-7">نحذف «{deleting.name}» وكل الصور اللي بداخله؟ هذا الإجراء ما يرجع.</p>
          {error ? <p className="mt-3 text-sm text-rejected">{error}</p> : null}
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setBusy(true)
                setError(null)
                void api
                  .deleteOffice(deleting.id)
                  .then(() => refreshOffices())
                  .then(() => setDeletingId(null))
                  .catch((deleteError) => setError(deleteError instanceof Error ? deleteError.message : 'تعذر حذف المكتب.'))
                  .finally(() => setBusy(false))
              }}
              className="rounded-xl bg-rejected px-4 py-2.5 text-sand disabled:opacity-60"
            >
              {busy ? 'نحذف...' : 'حذف المكتب'}
            </button>
            <button type="button" onClick={() => setDeletingId(null)} className="rounded-xl border border-line bg-sheet px-4 py-2.5">
              إلغاء
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
