// ════════════════════════════════════════════════════════════════════
//  NOVOLed — Google Apps Script
//  Файл: apps-script/Code.gs
// ════════════════════════════════════════════════════════════════════

// ─── ЗАМЕНИТЕ ID ТАБЛИЦЫ НА СВОЙ ────────────────────────────────
const SPREADSHEET_ID = '1CYwbHJ7yFGl_x6to4LLlSpPdQO2qpwzExS8whgrny8E'
// ────────────────────────────────────────────────────────────────

const SHEET_PRODUCTS = 'products'
const SHEET_CLIENTS  = 'clients'
const SHEET_ORDERS   = 'orders'   // история заказов

// ─── EMAIL ДЛЯ УВЕДОМЛЕНИЙ О ЗАКАЗАХ ────────────────────────────
const NOTIFY_EMAIL = 'novoledopt@gmail.com'
// ────────────────────────────────────────────────────────────────

// ════════════════════════════════════════════════════════════════════
//  GET — каталог, доступ, история заказов
// ════════════════════════════════════════════════════════════════════
function doGet(e) {
  const params = e.parameter || {}
  const action = params.action || ''
  const email  = (params.email || '').toLowerCase().trim()

  let result
  try {
    if      (action === 'getProducts')    result = actionGetProducts(email)
    else if (action === 'checkAccess')    result = actionCheckAccess(email)
    else if (action === 'getOrderHistory') result = actionGetOrderHistory(email)
    else result = { error: 'Неизвестное действие: ' + action }
  } catch (err) {
    result = { error: err.message }
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON)
}

// ════════════════════════════════════════════════════════════════════
//  POST — сохранить заказ
// ════════════════════════════════════════════════════════════════════
function doPost(e) {
  let result
  try {
    const body = JSON.parse(e.postData.contents || '{}')
    result = actionSaveOrder(body)
  } catch (err) {
    result = { ok: false, error: err.message }
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON)
}

// ════════════════════════════════════════════════════════════════════
//  ДЕЙСТВИЯ
// ════════════════════════════════════════════════════════════════════

// ── Каталог товаров ───────────────────────────────────────────────
function actionGetProducts(email) {
  const ss         = SpreadsheetApp.openById(SPREADSHEET_ID)
  const clientInfo = getClientInfo(ss, email)

  const sheet = ss.getSheetByName(SHEET_PRODUCTS)
  if (!sheet) return { error: 'Лист "' + SHEET_PRODUCTS + '" не найден' }

  const rows    = sheet.getDataRange().getValues()
  const headers = rows[0].map(function(h) { return String(h).trim() })
  const products = []

  for (var i = 1; i < rows.length; i++) {
    const obj = {}
    headers.forEach(function(h, idx) { obj[h] = rows[i][idx] })
    if (!obj.id) continue
    obj.in_stock = parseBool(obj.in_stock)
    obj.price    = obj.price ? Number(obj.price) : null
    if (!clientInfo.can_see_prices) obj.price = null
    products.push(obj)
  }

  return {
    products:     products,
    hasAccess:    clientInfo.active,
    canSeePrices: clientInfo.can_see_prices,
  }
}

// ── Проверка доступа ──────────────────────────────────────────────
function actionCheckAccess(email) {
  if (!email) return { access: false, can_see_prices: false }
  const ss   = SpreadsheetApp.openById(SPREADSHEET_ID)
  const info = getClientInfo(ss, email)
  return { access: info.active, can_see_prices: info.can_see_prices }
}

// ── История заказов по email ──────────────────────────────────────
function actionGetOrderHistory(email) {
  if (!email) return { orders: [] }

  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID)
  const sheet = ss.getSheetByName(SHEET_ORDERS)
  if (!sheet) return { orders: [] }

  const rows    = sheet.getDataRange().getValues()
  if (rows.length < 2) return { orders: [] }

  const headers  = rows[0].map(function(h) { return String(h).trim() })
  const emailIdx = headers.indexOf('email')
  if (emailIdx < 0) return { orders: [] }

  // Группируем строки по order_id
  const orderMap = {}
  const orderDates = {}

  for (var i = 1; i < rows.length; i++) {
    const row = rows[i]
    const obj = {}
    headers.forEach(function(h, idx) { obj[h] = row[idx] })

    const rowEmail = String(obj.email || '').toLowerCase().trim()
    if (rowEmail !== email) continue

    const orderId = String(obj.order_id || '')
    if (!orderId) continue

    if (!orderMap[orderId]) {
      orderMap[orderId]  = []
      orderDates[orderId] = String(obj.date || '')
    }

    orderMap[orderId].push({
      product_id:   String(obj.product_id   || ''),
      product_name: String(obj.product_name || ''),
      socket:       String(obj.socket       || ''),
      unit:         String(obj.unit         || ''),
      qty:          Number(obj.qty)          || 0,
      price:        obj.price ? Number(obj.price) : null,
      // доп. поля из шапки заказа (одинаковы во всех строках одного order_id)
      company:      String(obj.company      || ''),
      client_name:  String(obj.client_name  || ''),
      phone:        String(obj.phone        || ''),
      comment:      String(obj.comment      || ''),
      status:       String(obj.status       || ''),
    })
  }

  // Собираем итоговый массив заказов, сортируем новые первыми
  const orders = Object.keys(orderMap).map(function(id) {
    const items = orderMap[id]
    const first = items[0]

    // Считаем сумму только если у всех позиций есть цена
    var total = null
    var allHavePrice = items.every(function(it) { return it.price !== null })
    if (allHavePrice) {
      total = items.reduce(function(s, it) { return s + it.qty * (it.price || 0) }, 0)
    }

    return {
      id:          id,
      date:        orderDates[id],
      company:     first.company,
      client_name: first.client_name,
      phone:       first.phone,
      comment:     first.comment,
      status:      first.status,
      total:       total,
      items:       items.map(function(it) {
        return {
          id:    it.product_id,
          name:  it.product_name,
          socket: it.socket,
          unit:  it.unit,
          qty:   it.qty,
          price: it.price,
        }
      }),
    }
  })

  // Сортируем по дате — свежие первыми
  orders.sort(function(a, b) {
    return new Date(b.date) - new Date(a.date)
  })

  return { orders: orders }
}

// ── Сохранить заказ в таблицу ─────────────────────────────────────
function actionSaveOrder(body) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID)

  // ─ Инициализируем лист orders если нет ─
  var sheet = ss.getSheetByName(SHEET_ORDERS)
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_ORDERS)
    sheet.appendRow([
      'order_id', 'date', 'email', 'company', 'client_name', 'phone', 'comment',
      'product_id', 'product_name', 'socket', 'unit', 'qty', 'price', 'status'
    ])
    // Заголовки — жирные
    sheet.getRange(1, 1, 1, 14).setFontWeight('bold')
    sheet.setFrozenRows(1)
  }

  const orderId   = body.order_id || String(Date.now())
  const date      = body.date     || new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })
  const email     = (body.email   || '').toLowerCase().trim()
  const company   = body.company  || ''
  const name      = body.name     || ''
  const phone     = body.phone    || ''
  const comment   = body.comment  || ''
  const items     = Array.isArray(body.items) ? body.items : []

  if (!items.length) return { ok: false, error: 'Пустой заказ' }

  // Одна строка на каждую позицию
  items.forEach(function(item) {
    sheet.appendRow([
      orderId,
      date,
      email,
      company,
      name,
      phone,
      comment,
      String(item.id   || ''),
      String(item.name || ''),
      String(item.socket || ''),
      String(item.unit  || ''),
      Number(item.qty)  || 0,
      item.price != null ? Number(item.price) : '',
      'Новый',
    ])
  })

  // Отправляем email-уведомление
  sendOrderNotification({ orderId: orderId, date: date, email: email, company: company, name: name, phone: phone, comment: comment, items: items })

  return { ok: true, order_id: orderId }
}

// ════════════════════════════════════════════════════════════════════
//  ВСПОМОГАТЕЛЬНЫЕ
// ════════════════════════════════════════════════════════════════════
function getClientInfo(ss, email) {
  const notFound = { active: false, can_see_prices: false }
  if (!email) return notFound

  const sheet = ss.getSheetByName(SHEET_CLIENTS)
  if (!sheet) return notFound

  const rows    = sheet.getDataRange().getValues()
  const headers = rows[0].map(function(h) { return String(h).trim().toLowerCase() })
  const eIdx = headers.indexOf('email')
  const aIdx = headers.indexOf('active')
  const pIdx = headers.indexOf('can_see_prices')

  if (eIdx < 0) return notFound

  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][eIdx] || '').toLowerCase().trim() === email) {
      return {
        active:        aIdx >= 0 ? parseBool(rows[i][aIdx]) : true,
        can_see_prices: pIdx >= 0 ? parseBool(rows[i][pIdx]) : true,
      }
    }
  }
  return notFound
}

function parseBool(value) {
  if (value === true || value === false) return value
  if (value == null) return false
  const v = String(value).toLowerCase().trim()
  return v === 'true' || v === '1' || v === 'yes' || v === 'да' || v === 'истина'
}

// ════════════════════════════════════════════════════════════════════
//  УВЕДОМЛЕНИЕ О НОВОМ ЗАКАЗЕ НА EMAIL
// ════════════════════════════════════════════════════════════════════
function sendOrderNotification(data) {
  try {
    var subject = '🛒 Новый заказ #' + data.orderId + ' — ' + (data.company || data.name || data.email)

    // ── Текстовая версия письма ───────────────────────────────────
    var lines = []
    lines.push('Новый заказ поступил через сайт NOVOLed B2B.')
    lines.push('')
    lines.push('─────────────────────────────────────────────')
    lines.push('ЗАКАЗ #' + data.orderId)
    lines.push('Дата:        ' + data.date)
    lines.push('Email:       ' + data.email)
    lines.push('Компания:    ' + (data.company  || '—'))
    lines.push('Контакт:     ' + (data.name     || '—'))
    lines.push('Телефон:     ' + (data.phone    || '—'))
    if (data.comment) lines.push('Комментарий: ' + data.comment)
    lines.push('─────────────────────────────────────────────')
    lines.push('СОСТАВ ЗАКАЗА:')
    lines.push('')

    var totalKnown = true
    var total = 0
    var items = Array.isArray(data.items) ? data.items : []

    items.forEach(function(item, idx) {
      var qty   = Number(item.qty) || 0
      var price = (item.price != null && item.price !== '') ? Number(item.price) : null
      var line  = (idx + 1) + '. ' + (item.name || item.id)
      if (item.socket) line += ' [' + item.socket + ']'
      line += '  ×  ' + qty + ' ' + (item.unit || 'шт.')
      if (price !== null) {
        var sum = qty * price
        line += '  —  ' + price.toLocaleString('ru-RU') + ' грн/шт.  =  ' + sum.toLocaleString('ru-RU') + ' грн'
        total += sum
      } else {
        totalKnown = false
        line += '  —  цена не указана'
      }
      lines.push(line)
    })

    lines.push('')
    if (totalKnown && items.length > 0) {
      lines.push('ИТОГО: ' + total.toLocaleString('ru-RU') + ' грн')
    }
    lines.push('─────────────────────────────────────────────')
    lines.push('Откройте таблицу, чтобы обработать заказ.')
    var textBody = lines.join('\n')

    // ── HTML-версия письма ────────────────────────────────────────
    var tableRows = items.map(function(item, idx) {
      var qty      = Number(item.qty) || 0
      var price    = (item.price != null && item.price !== '') ? Number(item.price) : null
      var priceStr = price !== null ? price.toLocaleString('ru-RU') + ' грн' : '—'
      var sumStr   = price !== null ? (qty * price).toLocaleString('ru-RU') + ' грн' : '—'
      var bg       = idx % 2 === 0 ? '#f7f7f7' : '#ffffff'
      return '<tr style="background:' + bg + '">' +
        '<td style="padding:7px 10px;color:#666">' + (idx + 1) + '</td>' +
        '<td style="padding:7px 10px"><b>' + (item.name || item.id) + '</b>' +
          (item.socket ? ' <span style="color:#888;font-size:12px">[' + item.socket + ']</span>' : '') + '</td>' +
        '<td style="padding:7px 10px;text-align:center">' + qty + ' ' + (item.unit || 'шт.') + '</td>' +
        '<td style="padding:7px 10px;text-align:right">' + priceStr + '</td>' +
        '<td style="padding:7px 10px;text-align:right"><b>' + sumStr + '</b></td>' +
        '</tr>'
    }).join('')

    var footerRow = (totalKnown && items.length > 0)
      ? '<tfoot><tr style="background:#1a1a2e;color:#fff">' +
          '<td colspan="4" style="padding:9px 10px;text-align:right;font-weight:bold">ИТОГО:</td>' +
          '<td style="padding:9px 10px;text-align:right;font-weight:bold">' + total.toLocaleString('ru-RU') + ' грн</td>' +
        '</tr></tfoot>'
      : ''

    var infoRows =
      '<tr><td style="color:#888;padding:4px 16px 4px 0;white-space:nowrap">Дата</td><td><b>' + data.date + '</b></td></tr>' +
      '<tr><td style="color:#888;padding:4px 16px 4px 0">Email</td><td>' + data.email + '</td></tr>' +
      '<tr><td style="color:#888;padding:4px 16px 4px 0">Компания</td><td>' + (data.company || '—') + '</td></tr>' +
      '<tr><td style="color:#888;padding:4px 16px 4px 0">Контакт</td><td>' + (data.name || '—') + '</td></tr>' +
      '<tr><td style="color:#888;padding:4px 16px 4px 0">Телефон</td><td>' + (data.phone || '—') + '</td></tr>' +
      (data.comment ? '<tr><td style="color:#888;padding:4px 16px 4px 0">Комментарий</td><td>' + data.comment + '</td></tr>' : '')

    var htmlBody =
      '<div style="font-family:Arial,sans-serif;max-width:700px;color:#222;margin:0 auto">' +
        '<div style="background:#1a1a2e;color:#fff;padding:18px 24px;border-radius:8px 8px 0 0">' +
          '<h2 style="margin:0;font-size:20px">🛒 Новый заказ #' + data.orderId + '</h2>' +
        '</div>' +
        '<div style="border:1px solid #ddd;border-top:none;padding:24px;border-radius:0 0 8px 8px">' +
          '<table style="font-size:14px;margin-bottom:20px">' + infoRows + '</table>' +
          '<h3 style="margin:0 0 10px;font-size:15px;color:#333">Состав заказа</h3>' +
          '<table style="width:100%;border-collapse:collapse;font-size:14px">' +
            '<thead><tr style="background:#2d2d4e;color:#fff">' +
              '<th style="padding:9px 10px;text-align:left;font-weight:normal">№</th>' +
              '<th style="padding:9px 10px;text-align:left;font-weight:normal">Товар</th>' +
              '<th style="padding:9px 10px;text-align:center;font-weight:normal">Кол-во</th>' +
              '<th style="padding:9px 10px;text-align:right;font-weight:normal">Цена</th>' +
              '<th style="padding:9px 10px;text-align:right;font-weight:normal">Сумма</th>' +
            '</tr></thead>' +
            '<tbody>' + tableRows + '</tbody>' +
            footerRow +
          '</table>' +
        '</div>' +
      '</div>'

    MailApp.sendEmail({
      to:       NOTIFY_EMAIL,
      subject:  subject,
      body:     textBody,
      htmlBody: htmlBody,
    })

  } catch (mailErr) {
    // Не роняем заказ из-за ошибки с почтой — просто логируем
    Logger.log('sendOrderNotification error: ' + mailErr.message)
  }
}

function testEmail() {
  sendOrderNotification({
    orderId: 'TEST-001',
    date: new Date().toLocaleString('ru-RU'),
    email: 'test@example.com',
    company: 'Тест Компания',
    name: 'Иван Иванов',
    phone: '+38 000 000 0000',
    comment: 'Тестовый заказ',
    items: [
      { id: '1', name: 'Тестовый товар', socket: 'E27', unit: 'шт.', qty: 5, price: 100 }
    ]
  })
}