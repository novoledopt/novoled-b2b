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

  window.Novoled = window.Novoled || {}
  window.Novoled.api = { getAllProducts, getProductById }
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