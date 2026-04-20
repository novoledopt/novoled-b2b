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

// Заголовки для запросов к Supabase с service key
function sbHeaders() {
  return {
    'apikey':        SERVICE_KEY,
    'Authorization': 'Bearer ' + SERVICE_KEY,
    'Content-Type':  'application/json',
  }
}

// Получить все id которые сейчас есть в Supabase
async function getSupabaseIds() {
  // Загружаем постранично — лимит Supabase 1000 строк за запрос
  let allIds = []
  let offset = 0
  const PAGE = 1000

  while (true) {
    const res = await fetch(
      SUPABASE_URL + '/rest/v1/products?select=id&limit=' + PAGE + '&offset=' + offset,
      { headers: sbHeaders() }
    )
    if (!res.ok) {
      const text = await res.text()
      throw new Error('Ошибка чтения ID из Supabase (' + res.status + '): ' + text)
    }
    const page = await res.json()
    allIds = allIds.concat(page.map(r => r.id))
    if (page.length < PAGE) break
    offset += PAGE
  }

  return allIds
}

// Удалить из Supabase товары которых больше нет в Google Таблице
async function deleteObsoleteProducts(obsoleteIds) {
  if (obsoleteIds.length === 0) {
    console.log('✅ Устаревших товаров нет — всё актуально')
    return
  }

  console.log('🗑  Удаляем', obsoleteIds.length, 'устаревших товаров:')
  console.log('   ', obsoleteIds.join(', '))

  // Удаляем чанками по 50 (на случай большого количества)
  const CHUNK = 50
  for (let i = 0; i < obsoleteIds.length; i += CHUNK) {
    const chunk = obsoleteIds.slice(i, i + CHUNK)

    // Supabase REST фильтр: id=in.("A","B","C")
    const filter = chunk.map(id => '"' + id + '"').join(',')
    const res = await fetch(
      SUPABASE_URL + '/rest/v1/products?id=in.(' + filter + ')',
      { method: 'DELETE', headers: sbHeaders() }
    )

    if (!res.ok) {
      const text = await res.text()
      console.warn('⚠️  Ошибка удаления чанка:', text)
    } else {
      console.log('   ✓ Удалено', chunk.length, 'товаров')
    }
  }
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

  // ─── ИСПРАВЛЕНИЕ БАГА: удаляем товары которых нет в таблице ───
  //
  // sheet_ids = все id из Google Таблицы
  // db_ids    = все id из Supabase
  // obsolete  = db_ids - sheet_ids  →  удаляем
  //
  const sheetIds = new Set(products.map(p => p.id))

  console.log('⏳ Получаем текущие ID из Supabase...')
  const dbIds = await getSupabaseIds()
  console.log('   В Supabase сейчас:', dbIds.length, 'товаров')
  console.log('   В таблице сейчас: ', products.length, 'товаров')

  const obsoleteIds = dbIds.filter(id => !sheetIds.has(id))

  console.log('⏳ Удаляем устаревшие товары...')
  await deleteObsoleteProducts(obsoleteIds)
  // ─────────────────────────────────────────────────────────────

  console.log('⏳ Отправляем в Supabase (upsert)...')
  console.log('   Товаров к обновлению:', products.length)

  const supabaseRes = await fetch(SUPABASE_URL + '/rest/v1/products', {
    method: 'POST',
    headers: {
      ...sbHeaders(),
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify(products),
  })

  if (!supabaseRes.ok) {
    const text = await supabaseRes.text()
    throw new Error('Ошибка Supabase (' + supabaseRes.status + '): ' + text)
  }

  console.log('✅ SYNC OK — обновлено', products.length, 'товаров, удалено', obsoleteIds.length)
  console.log('🕐 Время:', new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Kiev' }), '(Киев)')
}

sync().catch(err => {
  console.error('❌ SYNC FAILED:', err.message)
  process.exit(1)
})