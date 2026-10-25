import { Search } from 'lucide-react'

export function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <label className="relative block">
      <span className="sr-only">بحث</span>
      <Search size={18} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-11 w-full rounded-xl border border-line bg-sand py-2.5 pr-10 pl-3 outline-none focus:border-pine"
      />
    </label>
  )
}
