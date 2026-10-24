export function translateError(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error && 'message' in error
        ? String((error as { message: unknown }).message)
        : 'خطأ غير متوقع'

  const normalized = message.toLowerCase()

  if (normalized.includes('invalid login') || normalized.includes('invalid credentials')) {
    return 'اسم المستخدم أو كلمة السر غير صحيحة.'
  }
  if (normalized.includes('email not confirmed')) {
    return 'اسم المستخدم وكلمة السر صحيحة، لكن Supabase يوقف الدخول لحين إطفاء تأكيد البريد من إعدادات Authentication.'
  }
  if (normalized.includes('already registered') || normalized.includes('already been registered')) {
    return 'هذا البريد مسجّل. ادخله من تبويب الدخول.'
  }
  if (normalized.includes('password')) {
    return 'كلمة السر لازم تكون ٦ أحرف على الأقل.'
  }
  if (normalized.includes('row-level') || normalized.includes('permission denied') || normalized.includes('rls')) {
    return 'صلاحية هذا الحساب ما تسمح بهالإجراء. تأكد إن الدور مدخل بيانات أو مشاهد، وإن سكربت القاعدة انتنفذ.'
  }
  if (normalized.includes('failed to fetch') || normalized.includes('network')) {
    return 'ماكو اتصال بالخادم. تأكد من الإنترنت ومن عنوان Supabase.'
  }
  if (normalized.includes('bucket') || normalized.includes('storage')) {
    return 'تعذر حفظ الصورة بالمخزن. تأكد إن وعاء documents موجود وإن سكربت القاعدة انتنفذ.'
  }
  if (normalized.includes('profiles') || normalized.includes('schema cache') || normalized.includes('relation')) {
    return 'جداول القاعدة غير جاهزة. نفّذ ملف supabase/schema.sql من محرر SQL.'
  }

  return message.length > 0 && message.length < 180 ? message : 'صار خطأ غير متوقع.'
}
