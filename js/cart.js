;(function () {
  const STORAGE_KEY = 'novoled_b2b_cart_v1'

  // ─── ХРАНИЛИЩЕ ───────────────────────────────────────────────
  // В localStorage хранятся ТОЛЬКО id, qty и базовые поля (name, socket, unit).
  // Цена НЕ хранится — она всегда берётся из актуального каталога.
  // Это значит при логине/выходе цены автоматически появляются/исчезают.

  function readCart() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  function writeCart(items) {
    // Сохраняем без цены — цена всегда актуальная из каталога
    const clean = items.map(function(i) {
      return {
        id:     i.id,
        name:   i.name   || '',
        socket: i.socket || '',
        unit:   i.unit   || '',
        qty:    Number(i.qty) || 1,
        // цену намеренно НЕ сохраняем
      }
    })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean))
  }

  // ─── КЭШ ЦЕН ─────────────────────────────────────────────────
  // Загружается один раз при открытии страницы корзины.
  // Ключ — id товара, значение — актуальная цена из Supabase.
  var _priceCache = null

  async function loadPriceCache() {
    if (_priceCache) return _priceCache
    _priceCache = {}
    try {
      const canSeePrices = sessionStorage.getItem('can_see_prices') === 'true'
      if (!canSeePrices) return _priceCache // нет доступа — кэш остаётся пустым

      const products = await window.Novoled.api.getAllProducts()
      products.forEach(function(p) {
        if (p.id && p.price) _priceCache[p.id] = Number(p.price)
      })
    } catch (err) {
      console.warn('Не удалось загрузить цены:', err)
    }
    return _priceCache
  }

  function getPrice(id) {
    if (!_priceCache) return null
    return _priceCache[id] || null
  }

  // ─── ОПЕРАЦИИ С КОРЗИНОЙ ─────────────────────────────────────

  function addToCart(product, quantity) {
    if (product && product.in_stock === false) return
    const items = readCart()
    const qty = Math.max(1, Number(quantity) || 1)
    const existing = items.find(function(i) { return i.id === product.id })
    if (existing) {
      existing.qty = (existing.qty || 0) + qty
    } else {
      items.push({
        id:     product.id,
        name:   product.name   || '',
        socket: product.socket || '',
        unit:   product.unit   || '',
        qty:    qty,
        // цену не сохраняем
      })
    }
    writeCart(items)
    updateCartBadge()
  }

  function updateQuantity(id, quantity) {
    const items = readCart()
    const item = items.find(function(i) { return i.id === id })
    if (!item) return
    item.qty = Math.max(1, Number(quantity) || 1)
    writeCart(items)
    updateCartBadge()
  }

  function removeFromCart(id) {
    writeCart(readCart().filter(function(i) { return i.id !== id }))
    updateCartBadge()
  }

  function clearCart() {
    writeCart([])
    updateCartBadge()
  }

  function updateCartBadge() {
    const badge = document.getElementById('cart-count-badge')
    if (!badge) return
    const items = readCart()
    const total = items.reduce(function(s, i) { return s + (Number(i.qty) || 0) }, 0)
    badge.textContent = String(total)
  }

  // ─── РЕНДЕР КОРЗИНЫ ──────────────────────────────────────────

  async function renderCartPage() {
    const emptyEl      = document.getElementById('cart-empty')
    const tableWrapper = document.getElementById('cart-table-wrapper')
    const itemsBody    = document.getElementById('cart-items')
    const itemsCountEl = document.getElementById('cart-items-count')
    const totalEl      = document.getElementById('cart-total')

    if (!emptyEl || !tableWrapper || !itemsBody) return

    // Загружаем актуальные цены из Supabase
    await loadPriceCache()

    const cartItems = readCart()
    const canSeePrices = sessionStorage.getItem('can_see_prices') === 'true'

    if (!cartItems.length) {
      emptyEl.hidden = false
      tableWrapper.hidden = true
      itemsBody.innerHTML = ''
      if (itemsCountEl) itemsCountEl.textContent = '0'
      if (totalEl) totalEl.textContent = '0 ₽'
      return
    }

    emptyEl.hidden = true
    tableWrapper.hidden = false

    // Считаем итоги с актуальными ценами
    var totalItems = 0
    var totalSum   = 0
    cartItems.forEach(function(i) {
      const qty   = Number(i.qty) || 0
      const price = canSeePrices ? (getPrice(i.id) || 0) : 0
      totalItems += qty
      totalSum   += qty * price
    })

    itemsBody.innerHTML = ''

    cartItems.forEach(function(item) {
      const qty        = Number(item.qty) || 0
      const price      = canSeePrices ? (getPrice(item.id) || 0) : null
      const priceStr   = price !== null && price > 0 ? price.toFixed(2) : '—'
      const sumStr     = price !== null && price > 0 ? (qty * price).toFixed(2) : '—'

      const tr = document.createElement('tr')
      tr.innerHTML =
        '<td>' +
          '<div class="cart-item-name">' + item.name + '</div>' +
          '<div class="cart-item-meta">ID: ' + item.id + '</div>' +
        '</td>' +
        '<td>' + (item.socket || '') + '</td>' +
        '<td>' +
          '<div class="qty-stepper" data-id="' + item.id + '">' +
            '<button type="button" class="qty-btn" data-qty-minus="' + item.id + '" aria-label="Минус">' +
              '<span class="qty-icon">&#8722;</span>' +
            '</button>' +
            '<div class="qty-value" aria-label="Количество">' + qty + '</div>' +
            '<button type="button" class="qty-btn" data-qty-plus="' + item.id + '" aria-label="Плюс">' +
              '<span class="qty-icon">+</span>' +
            '</button>' +
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
    if (totalEl) totalEl.textContent = canSeePrices && totalSum > 0
      ? totalSum.toFixed(2) + ' ₽'
      : '—'

    // Навешиваем обработчики (клонируем чтобы не дублировать)
    const freshBody = itemsBody.cloneNode(true)
    itemsBody.parentNode.replaceChild(freshBody, itemsBody)

    freshBody.addEventListener('click', async function(e) {
      const plus = e.target.closest('[data-qty-plus]')
      if (plus) {
        const id = plus.getAttribute('data-qty-plus')
        const found = readCart().find(function(i) { return i.id === id })
        if (!found) return
        updateQuantity(id, (Number(found.qty) || 0) + 1)
        await renderCartPage()
        return
      }

      const minus = e.target.closest('[data-qty-minus]')
      if (minus) {
        const id = minus.getAttribute('data-qty-minus')
        const found = readCart().find(function(i) { return i.id === id })
        if (!found) return
        const cur = Number(found.qty) || 1
        if (cur <= 1) removeFromCart(id)
        else updateQuantity(id, cur - 1)
        await renderCartPage()
        return
      }

      const removeBtn = e.target.closest('[data-remove]')
      if (removeBtn) {
        removeFromCart(removeBtn.getAttribute('data-remove'))
        await renderCartPage()
      }
    })
  }

  // ─── СТРАНИЦА КОРЗИНЫ ─────────────────────────────────────────

  function initCartPage() {
    renderCartPage()

    const form     = document.getElementById('request-form')
    const resultEl = document.getElementById('request-result')
    if (!form || !resultEl) return

    form.addEventListener('submit', async function(e) {
      e.preventDefault()
      const data     = new FormData(form)
      const cartItems = readCart()
      const canSeePrices = sessionStorage.getItem('can_see_prices') === 'true'

      if (!cartItems.length) {
        resultEl.textContent = 'Добавьте хотя бы один товар в корзину.'
        return
      }

      await loadPriceCache()

      var totalSum = 0
      var totalItems = 0
      cartItems.forEach(function(i) {
        const qty   = Number(i.qty) || 0
        const price = canSeePrices ? (getPrice(i.id) || 0) : 0
        totalSum   += qty * price
        totalItems += qty
      })

      const itemsText = cartItems.map(function(i) {
        const qty   = Number(i.qty) || 0
        const price = canSeePrices ? getPrice(i.id) : null
        return i.name + ' x' + qty +
          (price ? ' (' + (qty * price).toFixed(2) + ' ₽)' : '')
      }).join('; ')

      const orderRow = {
        date:    new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Kiev' }),
        company: data.get('company') || '',
        name:    data.get('name')    || '',
        phone:   data.get('phone')   || '',
        email:   data.get('email')   || '',
        items:   itemsText,
        total:   canSeePrices && totalSum > 0 ? totalSum.toFixed(2) + ' ₽' : '—',
        comment: data.get('comment') || '',
        status:  'Новый',
      }

      const ORDERS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw3HIoHc1d8pR0x7h58L8xvEGofchb_tS6ian7hxRpoZJ9UxHRrbhLvxMcu5HLdV6xE/exec'

      const submitBtn = form.querySelector('[type="submit"]')
      if (submitBtn) submitBtn.disabled = true
      resultEl.textContent = 'Отправляем заказ...'
      resultEl.style.color = 'var(--text-muted)'

      try {
        await fetch(ORDERS_SCRIPT_URL, {
          method:  'POST',
          mode:    'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(orderRow),
        })
        resultEl.textContent = '✓ Заказ отправлен! Мы свяжемся с вами для подтверждения.'
        resultEl.style.color = 'var(--accent)'
        form.reset()
        clearCart()
        renderCartPage()
      } catch (err) {
        console.error('Ошибка отправки заказа:', err)
        resultEl.textContent = 'Ошибка отправки. Пожалуйста, свяжитесь с нами напрямую.'
        resultEl.style.color = 'var(--danger)'
      } finally {
        if (submitBtn) submitBtn.disabled = false
      }
    })
  }

  window.Novoled = window.Novoled || {}
  window.Novoled.addToCart      = addToCart
  window.Novoled.readCart       = readCart
  window.Novoled.initCartBadge  = updateCartBadge
  window.Novoled.initCartPage   = initCartPage
})()
