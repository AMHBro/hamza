import { LogOut } from 'lucide-react'
import type { ReactNode } from 'react'
import { useApp } from '../context/AppState'
import { isCloud } from '../lib/supabaseClient'
import { Wordmark } from './Wordmark'

export function Shell({ children }: { children: ReactNode }) {
  const { session, signOut } = useApp()
  if (!session) return null

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line bg-paper">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Wordmark to="/offices" />
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted md:inline">{isCloud ? 'سحابي' : 'على هذا الجهاز'}</span>
            <span className="rounded-full bg-pine-soft px-2.5 py-1 text-sm font-medium text-pine sm:px-3">
              <span className="sm:hidden">{session.role === 'entry' ? 'مدخل' : 'مشاهد'}</span>
              <span className="hidden sm:inline">{session.role === 'entry' ? 'مدخل البيانات' : 'المشاهد'}</span>
            </span>
            {session.username ? (
              <span className="hidden max-w-32 truncate text-sm text-muted sm:inline">{session.username}</span>
            ) : null}
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex items-center gap-1 rounded-xl border border-line bg-sand px-2.5 py-1.5 text-sm hover:border-pine sm:px-3"
            >
              <LogOut size={16} />
              خروج
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  )
}
