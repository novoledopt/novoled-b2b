/**
 * sync-server.js — синхронизация Google Таблицы → Supabase
 *
 * Запускается через GitHub Actions автоматически 2 раза в день,
 * а также вручную через GitHub → Actions → Run workflow.
 *
 * Переменные окружения (задать в GitHub → Settings → Secrets):
 *   SUPABASE_URL         — https://kvycffsvgfftxzoqrrlj.supabase.co
 *   SUPABASE_SERVICE_KEY — service_role ключ (Supabase → Settings → API)
 *   SHEET_URL            — https://opensheet.elk.sh/ВАШ_ID/products
 */

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY
const SHEET_URL    = process.env.SHEET_URL

if (!SUPABASE_URL || !SERVICE_KEY || !SHEET_URL) {
  console.error('❌ Не заданы переменные окружения:')
  console.error('   SUPABASE_URL =', SUPABASE_URL ? '✓' : '✗ ОТСУТСТВУЕТ')
  console.error('   SUPABASE_SERVICE_KEY =', SERVICE_KEY ? '✓' : '✗ ОТСУТСТВУЕТ')
  console.error('   SHEET_URL =', SHEET_URL ? '✓' : '✗ ОТСУТСТВУЕТ')
  process.exit(1)
}

function parseBoolean(value) {
  if (value === true)  return true
  if (value === false) return false
  if (!value) return false
  const v = String(value).toLowerCase().trim()
  return v === 'true' || v === '1' || v === 'yes' || v === 'да' || v === 'истина'
}

async function sync() {
  console.log('⏳ Загружаем данные из Google Таблицы...')
  console.log('   URL:', SHEET_URL)

  const res = await fetch(SHEET_URL)
  if (!res.ok) throw new Error('Ошибка загрузки таблицы: ' + res.status + ' ' + res.statusText)

  const data = await res.json()
  if (!Array.isArray(data)) throw new Error('Ответ таблицы не является массивом: ' + JSON.stringify(data).slice(0, 200))

  console.log('✅ Загружено строк:', data.length)

  const products = data.map(p => ({
    id:          p.id          || '',
    in_stock:    parseBoolean(p.in_stock),
    name:        p.name        || '',
    category:    p.category    || '',
    subcategory: p.subcategory || '',
    series:      p.series      || '',
    socket:      p.socket      || '',
    power:       p.power       || '',
    lumens:      p.lumens      || '',
    unit:        p.unit        || '',
    price:       p.price ? Number(p.price) : null,
    image_1:     p.image_1     || '',
    image_2:     p.image_2     || '',
    image_3:     p.image_3     || '',
  })).filter(p => p.id) // пропускаем строки без id

  console.log('⏳ Отправляем в Supabase (upsert)...')
  console.log('   Товаров к обновлению:', products.length)

  const supabaseRes = await fetch(SUPABASE_URL + '/rest/v1/products', {
    method: 'POST',
    headers: {
      'apikey':       SERVICE_KEY,
      'Authorization': 'Bearer ' + SERVICE_KEY,
      'Content-Type': 'application/json',
      'Prefer':       'resolution=merge-duplicates',
    },
    body: JSON.stringify(products),
  })

  if (!supabaseRes.ok) {
    const text = await supabaseRes.text()
    throw new Error('Ошибка Supabase (' + supabaseRes.status + '): ' + text)
  }

  console.log('✅ SYNC OK — обновлено', products.length, 'товаров')
  console.log('🕐 Время:', new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Kiev' }), '(Киев)')
}

sync().catch(err => {
  console.error('❌ SYNC FAILED:', err.message)
  process.exit(1)
})
