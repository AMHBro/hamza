import { writeFileSync } from 'node:fs'

function xml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

function paperSvg(title, office, stripe, stamp) {
  const lines = [340, 390, 440, 490, 540, 590, 640]
    .map((y, index) => {
      const width = index === 6 ? 280 : 470
      return `<rect x="130" y="${y}" width="${width}" height="12" rx="6" fill="#efe6d8"/>`
    })
    .join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1040" viewBox="0 0 800 1040">
    <rect width="800" height="1040" fill="#efe8dc"/>
    <rect x="86" y="86" width="628" height="868" fill="#e7dfd1"/>
    <rect x="70" y="70" width="628" height="868" fill="#fffdf8" stroke="#e4d9c8" stroke-width="2"/>
    <rect x="70" y="70" width="628" height="26" fill="${stripe}"/>
    <text x="384" y="230" text-anchor="middle" font-family="Tahoma, Segoe UI, sans-serif" font-size="40" fill="#1a1814">${xml(title)}</text>
    <text x="384" y="278" text-anchor="middle" font-family="Tahoma, Segoe UI, sans-serif" font-size="22" fill="#6f675e">${xml(office)}</text>
    ${lines}
    <circle cx="560" cy="800" r="58" fill="none" stroke="${stamp}" stroke-width="6"/>
    <text x="560" y="808" text-anchor="middle" font-family="Tahoma, Segoe UI, sans-serif" font-size="20" fill="${stamp}">نموذج</text>
  </svg>`
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

const offices = [
  ['11111111-1111-4111-8111-111111111111', 'علاء الفراشة', '2026-10-20 09:00:00+00'],
  ['22222222-2222-4222-8222-222222222222', 'سارة الجبوري', '2026-10-22 11:30:00+00'],
]

const documents = [
  ['11111111-1111-4111-8111-111111111101', '11111111-1111-4111-8111-111111111111', 'صورة الهوية الأمامية', paperSvg('صورة الهوية الأمامية', 'علاء الفراشة', '#1e4a38', '#1d6b43'), '2026-10-20', 'accepted', 'واضحة، والختم يبين. مقبولة.', '2026-10-20 09:10:00+00'],
  ['11111111-1111-4111-8111-111111111102', '11111111-1111-4111-8111-111111111111', 'عقد الإيجار', paperSvg('عقد الإيجار', 'علاء الفراشة', '#8d3530', '#8d3530'), '2026-10-21', 'rejected', 'الصورة مائلة والإضاءة ضعيفة. أعد التصوير والورقة كاملة داخل الإطار.', '2026-10-21 08:40:00+00'],
  ['11111111-1111-4111-8111-111111111103', '11111111-1111-4111-8111-111111111111', 'كشف حساب تشرين', paperSvg('كشف حساب تشرين', 'علاء الفراشة', '#2c4a6e', '#2c4a6e'), '2026-10-23', 'new', '', '2026-10-23 07:15:00+00'],
  ['11111111-1111-4111-8111-111111111104', '11111111-1111-4111-8111-111111111111', 'تجديد الإقامة', paperSvg('تجديد الإقامة', 'علاء الفراشة', '#8a5a1e', '#8a5a1e'), '2026-10-22', 'edited', 'تم قص الأطراف الزايدة. اعتمد هالنسخة بعد ما تتأكد من رقم الإقامة.', '2026-10-22 13:05:00+00'],
  ['22222222-2222-4222-8222-222222222201', '22222222-2222-4222-8222-222222222222', 'جواز السفر', paperSvg('جواز السفر', 'سارة الجبوري', '#1e4a38', '#1e4a38'), '2026-10-22', 'new', '', '2026-10-22 11:45:00+00'],
]

function q(value) {
  return `'${String(value).replaceAll("'", "''")}'`
}

const officeSql = offices
  .map(([id, name, created]) => `  (${q(id)}, ${q(name)}, ${q(created)})`)
  .join(',\n')

const documentSql = documents
  .map(([id, officeId, title, image, date, status, note, created]) =>
    `  (${q(id)}, ${q(officeId)}, ${q(title)}, ${q(image)}, null, ${q(date)}, ${q(status)}, ${q(note)}, ${q(created)})`,
  )
  .join(',\n')

const sql = `-- بيانات ديوان المرتبة: مكتبان وخمس صور.
-- الحسابات ما تنحط هنا. تنشأ من لوحة Supabase بعد تنفيذ السكربت:
-- entry@diwan.app / 123456  بدور entry
-- viewer@diwan.app / 123456 بدور viewer

insert into public.offices (id, name, created_at)
values
${officeSql}
on conflict (id) do update
  set name = excluded.name;

insert into public.documents (
  id, office_id, title, image_url, storage_path, upload_date, status, note, created_at
)
values
${documentSql}
on conflict (id) do update
  set title = excluded.title,
      image_url = excluded.image_url,
      upload_date = excluded.upload_date,
      status = excluded.status,
      note = excluded.note;
`

writeFileSync(new URL('../supabase/seed.sql', import.meta.url), sql, 'utf8')
console.log('wrote supabase/seed.sql')
