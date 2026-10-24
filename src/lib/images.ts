export async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    throw new Error('الملف لازم يكون صورة.')
  }
  if (file.size > 20 * 1024 * 1024) {
    throw new Error('حجم الصورة أكبر من ٢٠ ميغابايت.')
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('تعذر قراءة الصورة. جرّب صيغة أخرى مثل JPG أو PNG.')
  }

  const maxEdge = 1600
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    throw new Error('تعذر معالجة الصورة.')
  }

  context.fillStyle = '#fffdf8'
  context.fillRect(0, 0, width, height)
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.72)
  })
  if (!blob) throw new Error('تعذر ضغط الصورة.')
  return blob
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('تعذر حفظ الصورة على هذا الجهاز.'))
    reader.readAsDataURL(blob)
  })
}
