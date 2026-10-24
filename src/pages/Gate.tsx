import { useEffect, useState, type FormEvent } from 'react'
import { Wordmark } from '../components/Wordmark'
import { useApp } from '../context/AppState'

const fieldClass =
  'w-full rounded-xl border border-line bg-sheet px-3 py-2.5 outline-none focus:border-pine'

const accounts = [
  { username: 'entry', password: '123456', label: 'مدخل البيانات' },
  { username: 'viewer', password: '123456', label: 'المشاهد' },
]

export function Gate() {
  const { signIn } = useApp()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    document.title = 'تسجيل الدخول · ديوان'
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (!identifier.trim() || !password) {
      setError('اكتب اسم المستخدم وكلمة السر.')
      return
    }
    setBusy(true)
    try {
      await signIn(identifier, password)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'تعذر الدخول.')
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <Wordmark />
      <h1 className="mt-8 text-3xl font-semibold">تسجيل الدخول</h1>
      <p className="mt-3 leading-7 text-muted">ادخل بحسابك. مدخل البيانات يرفع، والمشاهد يراجع.</p>

      <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-4 rounded-3xl border border-line bg-sand p-5">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">اسم المستخدم</span>
          <input
            className={fieldClass}
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="entry"
            autoComplete="username"
            autoFocus
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">كلمة السر</span>
          <input
            type="password"
            autoComplete="current-password"
            className={fieldClass}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error ? <p className="text-sm text-rejected">{error}</p> : null}
        <button type="submit" disabled={busy} className="w-full rounded-xl bg-pine px-4 py-3 font-medium text-sand disabled:opacity-60">
          {busy ? 'لحظة...' : 'دخول'}
        </button>
      </form>

      <div className="mt-4 rounded-2xl border border-line bg-sand p-4">
          <p className="text-sm font-medium">الحسابات</p>
          <p className="mt-1 text-sm leading-7 text-muted">كلمة السر: 123456. اضغط الحساب حتى تنعبى الحقول، ثم دخول.</p>
          <div className="mt-3 grid gap-2">
            {accounts.map((account) => (
              <button
                key={account.username}
                type="button"
                onClick={() => {
                  setIdentifier(account.username)
                  setPassword(account.password)
                  setError(null)
                }}
                className="rounded-xl border border-line bg-sheet px-3 py-2 text-right text-sm hover:border-pine"
              >
                <span className="font-medium">{account.label}</span>
                <span className="mt-0.5 block text-muted">{account.username}</span>
              </button>
            ))}
          </div>
        </div>
    </div>
  )
}
