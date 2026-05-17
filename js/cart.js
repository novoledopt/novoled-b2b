;(function () {
  const CART_KEY    = 'novoled_b2b_cart_v1'
  // История заказов теперь хранится в Google Sheets (лист orders)
  // APPS_SCRIPT_URL берётся из api.js — убедитесь что оба файла используют один URL
  function getAppsScriptUrl() {
    // Читаем из api.js через общий namespace — или fallback на auth.js
    return (window.Novoled && window.Novoled._scriptUrl)
      ? window.Novoled._scriptUrl
      : (typeof _AUTH_SCRIPT_URL !== 'undefined' ? _AUTH_SCRIPT_URL : '')
  }

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

  // ─── ИСТОРИЯ ЗАКАЗОВ (Google Sheets) ────────────────────────────

  // Загружает историю заказов с сервера по email клиента
  async function fetchOrderHistory(email) {
    if (!email) return []
    try {
      const url = getAppsScriptUrl()
      if (!url || url.includes('ВСТАВЬТЕ')) return []
      const res  = await fetch(url + '?action=getOrderHistory&email=' + encodeURIComponent(email))
      const data = await res.json()
      return Array.isArray(data.orders) ? data.orders : []
    } catch (err) {
      console.warn('Не удалось загрузить историю:', err)
      return []
    }
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
    // Pop-анимация при изменении
    badge.classList.remove('pop')
    void badge.offsetWidth // reflow
    badge.classList.add('pop')
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
      renderHistorySection()
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

    // История загружается асинхронно — не блокирует отображение корзины
    renderHistorySection()
  }

  // ─── ИСТОРИЯ ЗАКАЗОВ: рендер ─────────────────────────────────────
  async function renderHistorySection() {
    const container = document.getElementById('order-history-section')
    if (!container) return

    const email  = (typeof getUserEmail === 'function') ? getUserEmail() : ''
    const canSee = (typeof canUserSeePrices === 'function') ? canUserSeePrices() : false

    // Скелетон пока грузим
    if (window.Novoled && window.Novoled.loaders) window.Novoled.loaders.showHistory()

    const history = await fetchOrderHistory(email)

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
        ? Number(order.total).toFixed(2) + ' ₽'
        : (order.items.length + ' позиц.')

      const itemsPreview = order.items.slice(0, 3).map(function(i) {
        return '<span class="history-item-chip">' + i.name + (i.qty > 1 ? ' ×' + i.qty : '') + '</span>'
      }).join('') + (order.items.length > 3
        ? '<span class="history-item-chip muted">+' + (order.items.length - 3) + ' ещё</span>'
        : '')

      const statusClass = order.status === 'Выполнен' ? 'status-done'
        : order.status === 'Отменён' ? 'status-cancelled'
        : 'status-new'

      // Строим тултип с позициями
      var tooltipItems = order.items.map(function(it) {
        var priceStr = (canSee && it.price) ? ' · ' + (it.qty * it.price).toFixed(0) + ' ₽' : ''
        return '<div class="history-tooltip-item">' +
          '<span class="history-tooltip-item-name">' + it.name + '</span>' +
          '<span class="history-tooltip-item-qty">×' + it.qty + priceStr + '</span>' +
        '</div>'
      }).join('')
      var tooltipTotal = (canSee && order.total != null && order.total > 0)
        ? '<div class="history-tooltip-total"><span class="history-tooltip-total-label">Итого</span><span class="history-tooltip-total-value">' + Number(order.total).toFixed(2) + ' ₽</span></div>'
        : ''

      html +=
        '<div class="history-card">' +
          '<div class="history-card-head">' +
            '<div class="history-meta">' +
              '<span class="history-date">' + (order.date || '') + '</span>' +
              (order.company ? '<span class="history-company">' + order.company + '</span>' : '') +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:10px">' +
              '<span class="history-status ' + statusClass + '">' + (order.status || 'Новый') + '</span>' +
              '<span class="history-total">' + totalStr + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="history-items-preview">' + itemsPreview + '</div>' +
          '<div class="history-card-actions">' +
            // Кнопка «Детали» заменена на hover-тултип
            '<div class="history-details-wrap">' +
              '<button type="button" class="btn-history-details" tabindex="0">Детали</button>' +
              '<div class="history-tooltip">' +
                '<div class="history-tooltip-title">Позиции заказа</div>' +
                tooltipItems +
                tooltipTotal +
              '</div>' +
            '</div>' +
            '<button type="button" class="btn-history-reorder" data-order-id="' + order.id + '">↺ Повторить заказ</button>' +
          '</div>' +
        '</div>'
    })
    html += '</div>'

    // Модалка деталей не нужна — используется hover-тултип

    container.innerHTML = html

    // Делегирование событий
    container.addEventListener('click', function(e) {
      // Повторить заказ
      const reorderBtn = e.target.closest('.btn-history-reorder')
      if (reorderBtn) {
        const id = reorderBtn.getAttribute('data-order-id')
        const order = history.find(function(o) { return String(o.id) === String(id) })
        if (order) reorderFromHistory(order)
      }
    })
  }

    // ─── СТРАНИЦА КОРЗИНЫ ─────────────────────────────────────────────
  function initCartPage() {
    renderCartPage()

    const form     = document.getElementById('request-form')
    const resultEl = document.getElementById('request-result')
    if (!form || !resultEl) return

    // Кнопка «наверх» на странице корзины
    ;(function() {
      var topBtn = document.createElement('button')
      topBtn.className = 'scroll-top-btn-cart'
      topBtn.setAttribute('aria-label', 'Наверх')
      topBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>'
      document.body.appendChild(topBtn)
      topBtn.addEventListener('click', function() { window.scrollTo({ top: 0, behavior: 'smooth' }) })
      window.addEventListener('scroll', function() {
        if (window.scrollY > 300) topBtn.classList.add('visible')
        else topBtn.classList.remove('visible')
      }, { passive: true })
    })()

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

      // Формируем items как массив объектов для записи в Google Sheets
      const orderId   = String(Date.now())
      const orderDate = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })
      const orderItems = cartItems.map(function(i) {
        return {
          id:     i.id,
          name:   i.name,
          socket: i.socket || '',
          unit:   i.unit   || '',
          qty:    Number(i.qty) || 0,
          price:  canSee ? (getPrice(i.id) || null) : null,
        }
      })

      const orderPayload = {
        order_id: orderId,
        date:     orderDate,
        email:    orderData.email   || (typeof getUserEmail === 'function' ? getUserEmail() : ''),
        company:  orderData.company || '',
        name:     orderData.name    || '',
        phone:    orderData.phone   || '',
        comment:  orderData.comment || '',
        items:    orderItems,
      }

      const scriptUrl = getAppsScriptUrl()
      const submitBtn = form.querySelector('[type="submit"]')
      if (submitBtn) submitBtn.disabled = true
      resultEl.textContent = 'Отправляем заказ...'
      resultEl.style.color = 'var(--text-muted)'

      try {
        if (!scriptUrl || scriptUrl.includes('ВСТАВЬТЕ')) {
          throw new Error('URL Apps Script не настроен в js/auth.js')
        }

        await fetch(scriptUrl, {
          method: 'POST',
          mode:   'no-cors',   // Apps Script не возвращает CORS-заголовки на POST
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(orderPayload),
        })

        resultEl.textContent = '✓ Заказ отправлен! Мы свяжемся с вами для подтверждения.'
        resultEl.style.color = 'var(--accent)'
        form.reset()
        clearCart()
        // Перерисовываем корзину и обновляем историю с сервера
        await renderCartPage()
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
