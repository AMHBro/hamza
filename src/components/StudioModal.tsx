import { Camera, ImagePlus } from 'lucide-react'
import { useEffect, useState, type DragEvent, type FormEvent } from 'react'
import { formatArabicDate, todayISO } from '../lib/format'
import { Modal } from './Modal'

const fieldClass =
  'w-full rounded-xl border border-line bg-sheet px-3 py-2.5 outline-none focus:border-pine'

export function StudioModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (title: string, file: File) => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const today = todayISO()

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  function pick(next: File | null) {
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current)
      return next ? URL.createObjectURL(next) : null
    })
    setFile(next)
    setError(null)
  }

  function onDrop(event: DragEvent) {
    event.preventDefault()
    const next = event.dataTransfer.files?.[0] ?? null
    if (next) pick(next)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) {
      setError('اكتب اسم الصورة.')
      return
    }
    if (!file) {
      setError('اختر صورة من الجهاز أو الكاميرا.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onSubmit(title.trim(), file)
      onClose()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'تعذر رفع الصورة.')
      setBusy(false)
    }
  }

  return (
    <Modal title="الاستوديو" subtitle="اسم الصورة، وتاريخ اليوم ينزل لحاله." onClose={onClose}>
      <form onSubmit={(event) => void submit(event)} className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">اسم الصورة</span>
          <input
            className={fieldClass}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="مثال: عقد الإيجار"
            maxLength={120}
            autoFocus
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">تاريخ الرفع</span>
          <input className={`${fieldClass} text-muted`} value={formatArabicDate(today)} readOnly />
        </label>
        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDrop}
          className="rounded-2xl border border-dashed border-line bg-paper p-4"
        >
          {preview ? (
            <img src={preview} alt="معاينة الصورة قبل الحفظ" className="mx-auto max-h-64 rounded-xl object-contain" />
          ) : (
            <div className="py-8 text-center text-sm text-muted">
              <ImagePlus className="mx-auto mb-2 text-pine" size={28} />
              اسحب الصورة هنا، أو اخترها من الأزرار.
            </div>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-line bg-sheet px-3 py-2.5 text-sm">
              <ImagePlus size={16} />
              من الجهاز
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => pick(event.target.files?.[0] ?? null)}
              />
            </label>
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-line bg-sheet px-3 py-2.5 text-sm">
              <Camera size={16} />
              الكاميرا
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(event) => pick(event.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </div>
        {error ? <p className="text-sm text-rejected">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-pine px-4 py-3 font-medium text-sand disabled:opacity-60"
        >
          {busy ? 'نرفع الصورة...' : 'حفظ في المكتب'}
        </button>
      </form>
    </Modal>
  )
}
