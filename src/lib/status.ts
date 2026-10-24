import type { Status } from '../types'

export function emptyCounts(): Record<Status, number> {
  return { new: 0, edited: 0, accepted: 0, rejected: 0 }
}

export const STATUS_META: Record<Status, { label: string; chip: string; hint: string }> = {
  new: {
    label: 'جديد',
    chip: 'bg-new-soft text-new',
    hint: 'بانتظار المراجعة',
  },
  edited: {
    label: 'تم التعديل',
    chip: 'bg-edited-soft text-edited',
    hint: 'المشاهد ثبّت التعديل',
  },
  accepted: {
    label: 'مقبول',
    chip: 'bg-accepted-soft text-accepted',
    hint: 'الصورة مقبولة',
  },
  rejected: {
    label: 'مرفوض',
    chip: 'bg-rejected-soft text-rejected',
    hint: 'مطلوب تعديل',
  },
}

export const REVIEW_ACTIONS: { status: Exclude<Status, 'new'>; label: string; description: string }[] = [
  { status: 'edited', label: 'تم التعديل', description: 'النسخة تعدلت وتثبت' },
  { status: 'accepted', label: 'مقبول', description: 'الصورة تمام' },
  { status: 'rejected', label: 'رفض', description: 'اطلب تعديل من المدخل' },
]

export function isStatus(value: string): value is Status {
  return value === 'new' || value === 'edited' || value === 'accepted' || value === 'rejected'
}
