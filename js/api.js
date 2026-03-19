;(function () {
  const SUPABASE_URL = 'https://kvycffsvgfftxzoqrrlj.supabase.co'
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2eWNmZnN2Z2ZmdHh6b3FycmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNDg4NzcsImV4cCI6MjA4ODkyNDg3N30.rNCbdcooMjp2ibIygT_uQMt10DwyA_pKCQ3kqEs04hk'

  async function fetchJson(url) {
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
      },
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error('Ошибка запроса (' + res.status + '): ' + text)
    }
    return res.json()
  }

  async function getAllProducts() {
    const canSeePrices = sessionStorage.getItem('can_see_prices') === 'true'

    // Если у пользователя есть доступ к ценам — берём из таблицы products (с price)
    // Если нет — берём из products_public (без price)
    const table = canSeePrices ? 'products' : 'products_public'
    const url = SUPABASE_URL + '/rest/v1/' + table + '?select=*'

    return fetchJson(url)
  }

  async function getProductById(id) {
    const canSeePrices = sessionStorage.getItem('can_see_prices') === 'true'
    const table = canSeePrices ? 'products' : 'products_public'
    const url = SUPABASE_URL + '/rest/v1/' + table + '?id=eq.' + encodeURIComponent(id) + '&select=*'
    const data = await fetchJson(url)
    return data[0] || null
  }


  // ─── РУЧНАЯ СИНХРОНИЗАЦИЯ (вызывается кнопкой на сайте) ───
  // Читает Google Таблицу и пишет в Supabase через anon-ключ.
  // Работает только если у пользователя есть can_see_prices (он авторизован).
  // SERVICE_KEY здесь не нужен — используем RLS политику с anon ключом.
  async function syncFromSheet() {
    const SHEET_URL = 'https://opensheet.elk.sh/1CYwbHJ7yFGl_x6to4LLlSpPdQO2qpwzExS8whgrny8E/products'

    function parseBoolean(value) {
      if (value === true) return true
      if (value === false) return false
      if (!value) return false
      const v = String(value).toLowerCase().trim()
      return v === 'true' || v === '1' || v === 'yes' || v === 'да' || v === 'истина'
    }

    const res = await fetch(SHEET_URL)
    if (!res.ok) throw new Error('Ошибка загрузки таблицы: ' + res.status)
    const data = await res.json()
    if (!Array.isArray(data)) throw new Error('Неверный формат ответа таблицы')

    const products = data
      .filter(p => p.id)
      .map(p => ({
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
      }))

    // Пишем через Supabase REST API с anon ключом
    // Требует RLS политику: allow anon INSERT/UPDATE ON products
    const syncRes = await fetch(SUPABASE_URL + '/rest/v1/products', {
      method: 'POST',
      headers: {
        'apikey':        SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Content-Type':  'application/json',
        'Prefer':        'resolution=merge-duplicates',
      },
      body: JSON.stringify(products),
    })

    if (!syncRes.ok) {
      const text = await syncRes.text()
      throw new Error('Supabase error ' + syncRes.status + ': ' + text)
    }

    return products.length
  }

  window.Novoled = window.Novoled || {}
  window.Novoled.api = { getAllProducts, getProductById, syncFromSheet }
})()

// ;(function () {
//   const SUPABASE_URL =
//     'https://kvycffsvgfftxzoqrrlj.supabase.co'

//   const SUPABASE_ANON_KEY =
//     'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2eWNmZnN2Z2ZmdHh6b3FycmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNDg4NzcsImV4cCI6MjA4ODkyNDg3N30.rNCbdcooMjp2ibIygT_uQMt10DwyA_pKCQ3kqEs04hk'

//   const productsEndpoint =
//     `${SUPABASE_URL}/rest/v1/products_public`

//   async function fetchJson(url, config) {
//     const res = await fetch(url, config)

//     if (!res.ok) {
//       const text = await res.text()

//       throw new Error(
//         `Ошибка запроса (${res.status}): ${text || res.statusText}`
//       )
//     }

//     return res.json()
//   }

//   async function getAllProducts() {
//     const url = `${productsEndpoint}?select=*`

//     return fetchJson(url, {
//       headers: {
//         apikey: SUPABASE_ANON_KEY,
//         Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
//       },
//     })
//   }

//   async function getProductById(id) {
//     const url =
//       `${productsEndpoint}?id=eq.${encodeURIComponent(
//         id
//       )}&select=*`

//     const data = await fetchJson(url, {
//       headers: {
//         apikey: SUPABASE_ANON_KEY,
//         Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
//       },
//     })

//     return data[0] || null
//   }

//   window.Novoled = window.Novoled || {}

//   window.Novoled.api = {
//     getAllProducts,
//     getProductById,
//   }
// })()