// ─── НАСТРОЙКИ — ЗАМЕНИТЕ ID ТАБЛИЦ НА СВОИ ─────────────────────
const SPREADSHEET_ID = '1CYwbHJ7yFGl_x6to4LLlSpPdQO2qpwzExS8whgrny8E'  // ID вашей Google Таблицы
// ─────────────────────────────────────────────────────────────────

// Имена листов таблицы (не меняйте без необходимости)
const SHEET_PRODUCTS = 'products'   // лист с товарами
const SHEET_CLIENTS  = 'clients'    // лист с клиентами

// ─── CORS — разрешаем запросы с любого домена ────────────────────
function doGet(e) {
  const params = e.parameter || {}
  const action = params.action || ''
  const email  = (params.email || '').toLowerCase().trim()

  let result
  try {
    if (action === 'getProducts') {
      result = actionGetProducts(email)
    } else if (action === 'checkAccess') {
      result = actionCheckAccess(email)
    } else {
      result = { error: 'Неизвестное действие: ' + action }
    }
  } catch (err) {
    result = { error: err.message }
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON)
}

// ─── ДЕЙСТВИЕ: получить товары ───────────────────────────────────
function actionGetProducts(email) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID)

  // Проверяем доступ клиента
  const clientInfo = getClientInfo(ss, email)
  const hasAccess      = clientInfo.active
  const canSeePrices   = clientInfo.can_see_prices

  // Читаем товары
  const sheet = ss.getSheetByName(SHEET_PRODUCTS)
  if (!sheet) return { error: 'Лист "' + SHEET_PRODUCTS + '" не найден' }

  const rows    = sheet.getDataRange().getValues()
  const headers = rows[0].map(function(h) { return String(h).trim() })
  const products = []

  for (var i = 1; i < rows.length; i++) {
    const row = rows[i]
    const obj = {}
    headers.forEach(function(h, idx) { obj[h] = row[idx] })

    // Пропускаем пустые строки
    if (!obj.id) continue

    // Нормализуем поля
    obj.in_stock = parseBool(obj.in_stock)
    obj.price    = obj.price ? Number(obj.price) : null

    // Скрываем цену если нет доступа
    if (!canSeePrices) {
      obj.price = null
    }

    products.push(obj)
  }

  return {
    products:      products,
    hasAccess:     hasAccess,
    canSeePrices:  canSeePrices,
  }
}

// ─── ДЕЙСТВИЕ: проверить доступ по email ─────────────────────────
function actionCheckAccess(email) {
  if (!email) return { access: false, can_see_prices: false }
  const ss   = SpreadsheetApp.openById(SPREADSHEET_ID)
  const info = getClientInfo(ss, email)
  return {
    access:        info.active,
    can_see_prices: info.can_see_prices,
  }
}

// ─── ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ─────────────────────────────────────

function getClientInfo(ss, email) {
  const notFound = { active: false, can_see_prices: false }
  if (!email) return notFound

  const sheet = ss.getSheetByName(SHEET_CLIENTS)
  if (!sheet) return notFound

  const rows    = sheet.getDataRange().getValues()
  const headers = rows[0].map(function(h) { return String(h).trim().toLowerCase() })
  const emailIdx    = headers.indexOf('email')
  const activeIdx   = headers.indexOf('active')
  const pricesIdx   = headers.indexOf('can_see_prices')

  if (emailIdx < 0) return notFound

  for (var i = 1; i < rows.length; i++) {
    const rowEmail = String(rows[i][emailIdx] || '').toLowerCase().trim()
    if (rowEmail === email) {
      const active      = activeIdx   >= 0 ? parseBool(rows[i][activeIdx])  : true
      const canSeePrices = pricesIdx  >= 0 ? parseBool(rows[i][pricesIdx])  : true
      return { active: active, can_see_prices: canSeePrices }
    }
  }
  return notFound
}

function parseBool(value) {
  if (value === true)  return true
  if (value === false) return false
  if (value == null)   return false
  const v = String(value).toLowerCase().trim()
  return v === 'true' || v === '1' || v === 'yes' || v === 'да' || v === 'истина'
}
