export function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim()
}

export function includesQuery(haystack: string, query: string) {
  const needle = normalizeSearch(query)
  if (!needle) return true
  const hay = normalizeSearch(haystack)
  return needle.split(' ').every((word) => hay.includes(word))
}
