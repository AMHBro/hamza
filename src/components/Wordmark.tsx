import { Link } from 'react-router-dom'

export function Wordmark({ to }: { to?: string }) {
  const mark = (
    <span className="inline-flex items-center gap-2 text-xl font-semibold text-ink">
      <span className="grid size-8 place-items-center rounded-lg bg-pine text-sm text-sand">د</span>
      ديوان
    </span>
  )

  if (!to) return mark
  return (
    <Link to={to} className="rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-pine">
      {mark}
    </Link>
  )
}
