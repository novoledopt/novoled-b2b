;(function () {
  const CART_KEY    = 'novoled_b2b_cart_v1'
  const HISTORY_KEY = 'novoled_order_history_v1'
  const MAX_HISTORY = 20 // максимум заказов в истории

  // ─── КОРЗИНА: хранение ────────────────────────────────────────────
  function readCart() {
    try {
      const raw = localStorage.getItem(CART_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch { return [] }
  }

  function writeCart(items) {
    const clean = items.map(function(i) {
      return { id: String(i.id), name: i.name || '', socket: i.socket || '', unit: i.unit || '', qty: Number(i.qty) || 1 }
    })
    localStorage.setItem(CART_KEY, JSON.stringify(clean))
  }

  // ─── КЭШ ЦЕН ─────────────────────────────────────────────────────
  // Цены берём из общего кэша api.js — он уже в localStorage,
  // поэтому loadPriceCache теперь мгновенная при повторном открытии.
  var _priceCache = null

  async function loadPriceCache() {
    if (_priceCache) return _priceCache
    _priceCache = {}
    try {
      const canSee = (typeof canUserSeePrices === 'function') ? canUserSeePrices() : false
      if (!canSee) return _priceCache
      // getAllProducts() вернёт из кэша (память или localStorage) — без запроса в сеть
      const products = await window.Novoled.api.getAllProducts()
      products.forEach(function(p) {
        if (p.id && p.price) _priceCache[String(p.id)] = Number(p.price)
      })
    } catch (err) { console.warn('Не удалось загрузить цены:', err) }
    return _priceCache
  }

  function getPrice(id) {
    if (!_priceCache) return null
    return _priceCache[String(id)] || null
  }

  // ─── ИСТОРИЯ ЗАКАЗОВ ─────────────────────────────────────────────
  function readHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch { return [] }
  }

  function saveOrderToHistory(orderData, cartItems, canSee) {
    const history = readHistory()
    const order = {
      id:      Date.now(),
      date:    new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Kiev' }),
      company: orderData.company || '',
      name:    orderData.name    || '',
      phone:   orderData.phone   || '',
      email:   orderData.email   || '',
      comment: orderData.comment || '',
      items:   cartItems.map(function(i) {
        const price = canSee ? (getPrice(i.id) || 0) : null
        return { id: i.id, name: i.name, socket: i.socket, unit: i.unit, qty: i.qty, price: price }
      }),
      total: (function() {
        if (!canSee) return null
        return cartItems.reduce(function(s, i) {
          return s + (Number(i.qty) || 0) * (getPrice(i.id) || 0)
        }, 0)
      })()
    }
    history.unshift(order)
    if (history.length > MAX_HISTORY) history.length = MAX_HISTORY
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  }

  function reorderFromHistory(order) {
    order.items.forEach(function(item) {
      if (!item.id) return
      const existing = readCart().find(function(i) { return i.id === item.id })
      if (existing) {
        updateQuantity(item.id, (existing.qty || 0) + (item.qty || 1))
      } else {
        addToCart({ id: item.id, name: item.name, socket: item.socket, unit: item.unit, in_stock: true }, item.qty || 1)
      }
    })
    updateCartBadge()
    if (typeof showToast === 'function') showToast('Товары из заказа добавлены в корзину')
    // Прокручиваем к корзине
    const tableWrapper = document.getElementById('cart-table-wrapper')
    if (tableWrapper) tableWrapper.scrollIntoView({ behavior: 'smooth' })
    renderCartPage()
  }

  // ─── ОПЕРАЦИИ С КОРЗИНОЙ ─────────────────────────────────────────
  function addToCart(product, quantity) {
    if (product && product.in_stock === false) return
    const items = readCart()
    const qty = Math.max(1, Number(quantity) || 1)
    const existing = items.find(function(i) { return i.id === String(product.id) })
    if (existing) {
      existing.qty = (existing.qty || 0) + qty
    } else {
      items.push({ id: String(product.id), name: product.name || '', socket: product.socket || '', unit: product.unit || '', qty: qty })
    }
    writeCart(items)
    updateCartBadge()
  }

  function updateQuantity(id, quantity) {
    const items = readCart()
    const item = items.find(function(i) { return i.id === String(id) })
    if (!item) return
    item.qty = Math.max(1, Number(quantity) || 1)
    writeCart(items)
    updateCartBadge()
  }

  function removeFromCart(id) {
    writeCart(readCart().filter(function(i) { return i.id !== String(id) }))
    updateCartBadge()
  }

  function clearCart() {
    writeCart([])
    updateCartBadge()
  }

  function updateCartBadge() {
    const badge = document.getElementById('cart-count-badge')
    if (!badge) return
    const total = readCart().reduce(function(s, i) { return s + (Number(i.qty) || 0) }, 0)
    badge.textContent = String(total)
  }

  // ─── РЕНДЕР КОРЗИНЫ ──────────────────────────────────────────────
  async function renderCartPage() {
    if (window.Novoled && window.Novoled.loaders) window.Novoled.loaders.showCart()
    const emptyEl      = document.getElementById('cart-empty')
    const tableWrapper = document.getElementById('cart-table-wrapper')
    const itemsBody    = document.getElementById('cart-items')
    const itemsCountEl = document.getElementById('cart-items-count')
    const totalEl      = document.getElementById('cart-total')
    if (!emptyEl || !tableWrapper || !itemsBody) return

    await loadPriceCache()
    if (window.Novoled && window.Novoled.loaders) window.Novoled.loaders.hideCart()
    const cartItems = readCart()
    const canSee = (typeof canUserSeePrices === 'function') ? canUserSeePrices() : false

    if (!cartItems.length) {
      emptyEl.hidden = false
      tableWrapper.hidden = true
      itemsBody.innerHTML = ''
      if (itemsCountEl) itemsCountEl.textContent = '0'
      if (totalEl) totalEl.textContent = '0 ₽'
      renderHistorySection(canSee)
      return
    }

    emptyEl.hidden = true
    tableWrapper.hidden = false

    var totalItems = 0
    var totalSum   = 0
    cartItems.forEach(function(i) {
      const qty   = Number(i.qty) || 0
      const price = canSee ? (getPrice(i.id) || 0) : 0
      totalItems += qty
      totalSum   += qty * price
    })

    itemsBody.innerHTML = ''
    cartItems.forEach(function(item) {
      const qty      = Number(item.qty) || 0
      const price    = canSee ? (getPrice(item.id) || 0) : null
      const priceStr = (price !== null && price > 0) ? price.toFixed(2) : '—'
      const sumStr   = (price !== null && price > 0) ? (qty * price).toFixed(2) : '—'

      const tr = document.createElement('tr')
      tr.innerHTML =
        '<td>' +
          '<div class="cart-item-name">' + item.name + '</div>' +
          '<div class="cart-item-meta">Арт.: ' + item.id + (item.socket ? ' · ' + item.socket : '') + '</div>' +
        '</td>' +
        '<td>' + (item.socket || '') + '</td>' +
        '<td>' +
          '<div class="qty-stepper">' +
            '<button type="button" class="qty-btn" data-qty-minus="' + item.id + '" aria-label="Минус"><span class="qty-icon">&#8722;</span></button>' +
            '<div class="qty-value">' + qty + '</div>' +
            '<button type="button" class="qty-btn" data-qty-plus="' + item.id + '" aria-label="Плюс"><span class="qty-icon">+</span></button>' +
          '</div>' +
        '</td>' +
        '<td>' + priceStr + '</td>' +
        '<td>' + sumStr + '</td>' +
        '<td>' +
          '<button class="icon-btn icon-btn-danger" type="button" data-remove="' + item.id + '" aria-label="Удалить">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" stroke-width="0.5" style="pointer-events:none">' +
              '<path fill="#ffd6d6" d="m14 2 2 1 1 2h3a1 1 0 1 1 0 2l-1 12q0 3-3 3H8q-3 0-3-3L4 7a1 1 0 0 1 0-2h3l1-2 2-1zm4 5H6l1 12 1 1h8l1-1zm-8 3v5a1 1 0 0 1-2 0v-5zm4 0 1 1v5a1 1 0 1 1-2 0v-5zm0-6h-4L9 5h6z"/>' +
            '</svg>' +
          '</button>' +
        '</td>'
      itemsBody.appendChild(tr)
    })

    if (itemsCountEl) itemsCountEl.textContent = String(totalItems)
    if (totalEl) totalEl.textContent = (canSee && totalSum > 0) ? totalSum.toFixed(2) + ' ₽' : '—'

    // Клонируем tbody чтобы не накапливать слушателей
    const freshBody = itemsBody.cloneNode(true)
    itemsBody.parentNode.replaceChild(freshBody, itemsBody)

    freshBody.addEventListener('click', async function(e) {
      const plus = e.target.closest('[data-qty-plus]')
      if (plus) {
        const id = plus.getAttribute('data-qty-plus')
        const found = readCart().find(function(i) { return i.id === id })
        if (found) updateQuantity(id, (Number(found.qty) || 0) + 1)
        await renderCartPage(); return
      }
      const minus = e.target.closest('[data-qty-minus]')
      if (minus) {
        const id = minus.getAttribute('data-qty-minus')
        const found = readCart().find(function(i) { return i.id === id })
        if (found) {
          if ((Number(found.qty) || 1) <= 1) removeFromCart(id)
          else updateQuantity(id, Number(found.qty) - 1)
        }
        await renderCartPage(); return
      }
      const removeBtn = e.target.closest('[data-remove]')
      if (removeBtn) { removeFromCart(removeBtn.getAttribute('data-remove')); await renderCartPage() }
    })

    renderHistorySection(canSee)
  }

  // ─── ИСТОРИЯ ЗАКАЗОВ: рендер ─────────────────────────────────────
  function renderHistorySection(canSee) {
    const container = document.getElementById('order-history-section')
    if (!container) return

    // Кратковременный скелетон пока JS рендерит историю
    if (window.Novoled && window.Novoled.loaders) window.Novoled.loaders.showHistory()
    const history = readHistory()
    if (!history.length) {
      container.innerHTML =
        '<h2 class="history-title">История заказов</h2>' +
        '<p class="muted" style="margin-top:12px">Здесь появятся ваши отправленные заказы.</p>'
      return
    }

    let html =
      '<h2 class="history-title">История заказов <span class="history-badge">' + history.length + '</span></h2>' +
      '<div class="history-list">'

    history.forEach(function(order) {
      const totalStr = (canSee && order.total != null && order.total > 0)
        ? order.total.toFixed(2) + ' ₽'
        : (order.items.length + ' позиц.')
      const itemsPreview = order.items.slice(0, 3).map(function(i) {
        return '<span class="history-item-chip">' + i.name + (i.qty > 1 ? ' ×' + i.qty : '') + '</span>'
      }).join('') + (order.items.length > 3 ? '<span class="history-item-chip muted">+' + (order.items.length - 3) + ' ещё</span>' : '')

      html +=
        '<div class="history-card" data-order-id="' + order.id + '">' +
          '<div class="history-card-head">' +
            '<div class="history-meta">' +
              '<span class="history-date">' + order.date + '</span>' +
              (order.company ? '<span class="history-company">' + order.company + '</span>' : '') +
            '</div>' +
            '<span class="history-total">' + totalStr + '</span>' +
          '</div>' +
          '<div class="history-items-preview">' + itemsPreview + '</div>' +
          '<div class="history-card-actions">' +
            '<button type="button" class="btn-history-details" data-order-id="' + order.id + '">Детали</button>' +
            '<button type="button" class="btn-history-reorder" data-order-id="' + order.id + '">↺ Повторить заказ</button>' +
          '</div>' +
        '</div>'
    })
    html += '</div>'

    // Модалка деталей заказа (скрытая)
    html +=
      '<div id="history-modal" class="modal-backdrop" hidden>' +
        '<div class="modal-window" style="max-width:560px">' +
          '<button class="modal-close-btn" data-modal-close type="button" aria-label="Закрыть">&#x2715;</button>' +
          '<div id="history-modal-body"></div>' +
        '</div>' +
      '</div>'

    container.innerHTML = html

    // Делегирование событий
    container.addEventListener('click', function(e) {
      // Кнопка "Повторить заказ"
      const reorderBtn = e.target.closest('.btn-history-reorder')
      if (reorderBtn) {
        const id = Number(reorderBtn.getAttribute('data-order-id'))
        const order = readHistory().find(function(o) { return o.id === id })
        if (order) reorderFromHistory(order)
        return
      }
      // Кнопка "Детали"
      const detailsBtn = e.target.closest('.btn-history-details')
      if (detailsBtn) {
        const id = Number(detailsBtn.getAttribute('data-order-id'))
        const order = readHistory().find(function(o) { return o.id === id })
        if (order) openHistoryModal(order, canSee)
        return
      }
      // Закрыть модалку
      if (e.target.closest('[data-modal-close]') || e.target.id === 'history-modal') {
        const m = document.getElementById('history-modal')
        if (m) m.hidden = true
      }
    })
  }

  function openHistoryModal(order, canSee) {
    const modal = document.getElementById('history-modal')
    const body  = document.getElementById('history-modal-body')
    if (!modal || !body) return

    const totalStr = (canSee && order.total != null && order.total > 0)
      ? order.total.toFixed(2) + ' ₽' : '—'

    let rows = order.items.map(function(i) {
      const price = (canSee && i.price) ? i.price.toFixed(2) : '—'
      const sum   = (canSee && i.price) ? (i.price * (i.qty || 1)).toFixed(2) : '—'
      return '<tr>' +
        '<td><div class="cart-item-name">' + i.name + '</div><div class="cart-item-meta">Арт.: ' + i.id + '</div></td>' +
        '<td style="text-align:center">' + (i.qty || 1) + '</td>' +
        '<td style="text-align:right">' + price + '</td>' +
        '<td style="text-align:right">' + sum + '</td>' +
      '</tr>'
    }).join('')

    body.innerHTML =
      '<h2 style="margin:0 0 12px">Заказ от ' + order.date + '</h2>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 16px;margin-bottom:16px;font-size:13px">' +
        (order.company ? '<div><span style="color:var(--text-muted)">Компания:</span> ' + order.company + '</div>' : '') +
        (order.name    ? '<div><span style="color:var(--text-muted)">Контакт:</span> ' + order.name + '</div>' : '') +
        (order.phone   ? '<div><span style="color:var(--text-muted)">Телефон:</span> ' + order.phone + '</div>' : '') +
        (order.email   ? '<div><span style="color:var(--text-muted)">Email:</span> ' + order.email + '</div>' : '') +
        (order.comment ? '<div style="grid-column:1/-1"><span style="color:var(--text-muted)">Комментарий:</span> ' + order.comment + '</div>' : '') +
      '</div>' +
      '<table style="width:100%;border-collapse:collapse;font-size:13px">' +
        '<thead><tr>' +
          '<th style="text-align:left;padding:6px 0;border-bottom:1px solid var(--border-subtle)">Товар</th>' +
          '<th style="text-align:center;padding:6px;border-bottom:1px solid var(--border-subtle)">Кол.</th>' +
          '<th style="text-align:right;padding:6px 0;border-bottom:1px solid var(--border-subtle)">Цена</th>' +
          '<th style="text-align:right;padding:6px 0;border-bottom:1px solid var(--border-subtle)">Сумма</th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
        (canSee ? '<tfoot><tr><td colspan="3" style="text-align:right;padding-top:10px;font-weight:600">Итого:</td><td style="text-align:right;padding-top:10px;font-weight:600">' + totalStr + '</td></tr></tfoot>' : '') +
      '</table>' +
      '<button type="button" class="btn-history-reorder" data-order-id="' + order.id + '" style="margin-top:20px;width:100%">↺ Повторить этот заказ</button>'

    modal.hidden = false
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { modal.hidden = true; document.removeEventListener('keydown', esc) }
    }, { once: true })
  }

  // ─── СТРАНИЦА КОРЗИНЫ ─────────────────────────────────────────────
  function initCartPage() {
    renderCartPage()

    const form     = document.getElementById('request-form')
    const resultEl = document.getElementById('request-result')
    if (!form || !resultEl) return

    form.addEventListener('submit', async function(e) {
      e.preventDefault()
      const formData  = new FormData(form)
      const cartItems = readCart()
      const canSee    = (typeof canUserSeePrices === 'function') ? canUserSeePrices() : false

      if (!cartItems.length) {
        resultEl.textContent = 'Добавьте хотя бы один товар в корзину.'
        return
      }

      await loadPriceCache()

      var totalSum   = 0
      var totalItems = 0
      cartItems.forEach(function(i) {
        const qty   = Number(i.qty) || 0
        const price = canSee ? (getPrice(i.id) || 0) : 0
        totalSum   += qty * price
        totalItems += qty
      })

      const orderData = {
        company: formData.get('company') || '',
        name:    formData.get('name')    || '',
        phone:   formData.get('phone')   || '',
        email:   formData.get('email')   || '',
        comment: formData.get('comment') || '',
      }

      const itemsText = cartItems.map(function(i) {
        const qty   = Number(i.qty) || 0
        const price = canSee ? getPrice(i.id) : null
        return i.name + ' ×' + qty + (price ? ' (' + (qty * price).toFixed(2) + ' ₽)' : '')
      }).join('; ')

      const orderRow = {
        date:    new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Kiev' }),
        company: orderData.company,
        name:    orderData.name,
        phone:   orderData.phone,
        email:   orderData.email,
        items:   itemsText,
        total:   (canSee && totalSum > 0) ? totalSum.toFixed(2) + ' ₽' : '—',
        comment: orderData.comment,
        status:  'Новый',
      }

      const ORDERS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw3HIoHc1d8pR0x7h58L8xvEGofchb_tS6ian7hxRpoZJ9UxHRrbhLvxMcu5HLdV6xE/exec'

      const submitBtn = form.querySelector('[type="submit"]')
      if (submitBtn) submitBtn.disabled = true
      resultEl.textContent = 'Отправляем заказ...'
      resultEl.style.color = 'var(--text-muted)'

      try {
        await fetch(ORDERS_SCRIPT_URL, {
          method: 'POST', mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderRow),
        })

        // Сохраняем в историю ДО очистки корзины
        saveOrderToHistory(orderData, cartItems, canSee)

        resultEl.textContent = '✓ Заказ отправлен! Мы свяжемся с вами для подтверждения.'
        resultEl.style.color = 'var(--accent)'
        form.reset()
        clearCart()
        renderCartPage()
      } catch (err) {
        console.error('Ошибка отправки:', err)
        resultEl.textContent = 'Ошибка отправки. Пожалуйста, свяжитесь с нами напрямую.'
        resultEl.style.color = 'var(--danger)'
      } finally {
        if (submitBtn) submitBtn.disabled = false
      }
    })
  }

  window.Novoled = window.Novoled || {}
  window.Novoled.addToCart     = addToCart
  window.Novoled.readCart      = readCart
  window.Novoled.initCartBadge = updateCartBadge
  window.Novoled.initCartPage  = initCartPage
})()
