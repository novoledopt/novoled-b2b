;(function () {
  // ─── ЗАМЕНИТЕ НА ВАШ РЕАЛЬНЫЙ URL APPS SCRIPT ───────────────────
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxU9BXOdmvpoyTNXtjgwiLR9q2IA5AKTBzLcp66EuvGQmVxnYgboa7hn5AP1YzeSXFo/exec'
  // ─────────────────────────────────────────────────────────────────

  // Кэш в памяти (для текущей вкладки — мгновенно)
  let _memCache = null
  let _memTime  = 0

  // Кэш в localStorage (между страницами и перезагрузками)
  const LS_KEY     = 'novoled_products_cache'
  const LS_TTL_KEY = 'novoled_products_cache_time'
  const TTL_MS     = 30 * 60 * 1000   // 30 минут — данные актуальны
  const STALE_MS   = 4 * 60 * 60 * 1000 // 4 часа — жёсткий сброс

  function readLsCache() {
    try {
      const t = Number(localStorage.getItem(LS_TTL_KEY) || 0)
      if (!t || Date.now() - t > STALE_MS) return null
      const raw = localStorage.getItem(LS_KEY)
      if (!raw) return null
      return { products: JSON.parse(raw), time: t }
    } catch { return null }
  }

  function writeLsCache(products) {
    try {
      const t = Date.now()
      localStorage.setItem(LS_KEY,     JSON.stringify(products))
      localStorage.setItem(LS_TTL_KEY, String(t))
    } catch { /* localStorage переполнен — игнорируем */ }
  }

  function clearLsCache() {
    localStorage.removeItem(LS_KEY)
    localStorage.removeItem(LS_TTL_KEY)
  }

  async function callScript(params) {
    const url = new URL(APPS_SCRIPT_URL)
    Object.entries(params).forEach(function(kv) { url.searchParams.set(kv[0], kv[1]) })
    const res = await fetch(url.toString())
    if (!res.ok) throw new Error('Ошибка Apps Script: ' + res.status)
    return res.json()
  }

  async function getAllProducts() {
    const now = Date.now()

    // 1. Память — мгновенно (в рамках одной вкладки)
    if (_memCache && now - _memTime < TTL_MS) {
      return _memCache
    }

    // 2. localStorage — мгновенно (между страницами)
    const ls = readLsCache()
    if (ls && now - ls.time < TTL_MS) {
      _memCache = ls.products
      _memTime  = ls.time

      // Тихое фоновое обновление если данным больше 15 мин
      if (now - ls.time > 15 * 60 * 1000) {
        _fetchAndStore().catch(function() {})
      }

      return _memCache
    }

    // 3. Сеть — идём к Apps Script
    return _fetchAndStore()
  }

  async function _fetchAndStore() {
    const email = (typeof getUserEmail === 'function') ? getUserEmail() : ''
    const data  = await callScript({ action: 'getProducts', email: email })
    if (data.error) throw new Error(data.error)
    const products = data.products || []
    _memCache = products
    _memTime  = Date.now()
    writeLsCache(products)
    return products
  }

  async function getProductById(id) {
    const products = await getAllProducts()
    return products.find(function(p) { return String(p.id) === String(id) }) || null
  }

  function clearCache() {
    _memCache = null
    _memTime  = 0
    clearLsCache()
  }

  async function syncFromSheet() {
    clearCache()
    return _fetchAndStore()
  }

  window.Novoled = window.Novoled || {}
  window.Novoled.api = { getAllProducts, getProductById, syncFromSheet, clearCache }
})()
