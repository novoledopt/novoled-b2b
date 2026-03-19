;(function () {
  const STORAGE_KEY = 'novoled_b2b_cart_v1'

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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }

  function addToCart(product, quantity) {
    if (product && product.in_stock === false) return
    const items = readCart()
    const qty = Math.max(1, Number(quantity) || 1)
    const existing = items.find((i) => i.id === product.id)
    if (existing) {
      existing.qty = (existing.qty || 0) + qty
    } else {
      items.push({
        id: product.id,
        name: product.name,
        socket: product.socket || '',
        unit: product.unit || '',
        price: Number(product.price) || 0,
        qty,
      })
    }
    writeCart(items)
    updateCartBadge()
  }

  function updateQuantity(id, quantity) {
    const items = readCart()
    const item = items.find((i) => i.id === id)
    if (!item) return
    item.qty = Math.max(1, Number(quantity) || 1)
    delete item.quantity
    writeCart(items)
    updateCartBadge()
  }

  function removeFromCart(id) {
    const items = readCart().filter((i) => i.id !== id)
    writeCart(items)
    updateCartBadge()
  }

  function clearCart() {
    writeCart([])
    updateCartBadge()
  }

  function getCartTotals() {
    const items = readCart()
    const normalized = items.map((i) => ({
      ...i,
      qty: Number(i.qty ?? i.quantity ?? 0),
    }))
    const totalItems = normalized.reduce((s, i) => s + i.qty, 0)
    const totalSum = normalized.reduce(
      (s, i) => s + i.qty * (Number(i.price) || 0),
      0
    )
    return { items: normalized, totalItems, totalSum }
  }

  function updateCartBadge() {
    const badge = document.getElementById('cart-count-badge')
    if (!badge) return
    const { totalItems } = getCartTotals()
    badge.textContent = String(totalItems)
  }

  function renderCartPage() {
    const { items, totalItems, totalSum } = getCartTotals()
    const emptyEl = document.getElementById('cart-empty')
    const tableWrapper = document.getElementById('cart-table-wrapper')
    const itemsBody = document.getElementById('cart-items')
    const itemsCountEl = document.getElementById('cart-items-count')
    const totalEl = document.getElementById('cart-total')

    if (!emptyEl || !tableWrapper || !itemsBody || !itemsCountEl || !totalEl) return

    if (!items.length) {
      emptyEl.hidden = false
      tableWrapper.hidden = true
      itemsBody.innerHTML = ''
      itemsCountEl.textContent = '0'
      totalEl.textContent = '0 ₽'
      return
    }

    emptyEl.hidden = true
    tableWrapper.hidden = false

    itemsBody.innerHTML = ''
    for (const item of items) {
      const count = item.qty
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
            '<div class="qty-value" aria-label="Количество">' + count + '</div>' +
            '<button type="button" class="qty-btn" data-qty-plus="' + item.id + '" aria-label="Плюс">' +
              '<span class="qty-icon">+</span>' +
            '</button>' +
          '</div>' +
        '</td>' +
        '<td>' + Number(item.price || 0).toFixed(2) + '</td>' +
        '<td>' + (count * (Number(item.price) || 0)).toFixed(2) + '</td>' +
        '<td>' +
          '<button class="icon-btn icon-btn-danger" type="button" data-remove="' + item.id + '" aria-label="Удалить">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" stroke-width="0.5" style="pointer-events:none">' +
              '<path fill="#ffd6d6" d="m14 2 2 1 1 2h3a1 1 0 1 1 0 2l-1 12q0 3-3 3H8q-3 0-3-3L4 7a1 1 0 0 1 0-2h3l1-2 2-1zm4 5H6l1 12 1 1h8l1-1zm-8 3v5a1 1 0 0 1-2 0v-5zm4 0 1 1v5a1 1 0 1 1-2 0v-5zm0-6h-4L9 5h6z"/>' +
            '</svg>' +
          '</button>' +
        '</td>'
      itemsBody.appendChild(tr)
    }

    itemsCountEl.textContent = String(totalItems)
    totalEl.textContent = totalSum.toFixed(2) + ' ₽'

    // Клонируем tbody чтобы убрать старые обработчики и не дублировать
    const freshBody = itemsBody.cloneNode(true)
    itemsBody.parentNode.replaceChild(freshBody, itemsBody)

    freshBody.addEventListener('click', function(e) {
      // ПЛЮС: строго +1
      const plus = e.target.closest('[data-qty-plus]')
      if (plus) {
        const id = plus.getAttribute('data-qty-plus')
        if (!id) return
        const cart = readCart()
        const found = cart.find(function(i){ return i.id === id })
        if (!found) return
        const cur = Number(found.qty != null ? found.qty : (found.quantity != null ? found.quantity : 0))
        updateQuantity(id, cur + 1)
        renderCartPage()
        return
      }

      // МИНУС: -1, при qty=1 → удалить товар
      const minus = e.target.closest('[data-qty-minus]')
      if (minus) {
        const id = minus.getAttribute('data-qty-minus')
        if (!id) return
        const cart = readCart()
        const found = cart.find(function(i){ return i.id === id })
        if (!found) return
        const cur = Number(found.qty != null ? found.qty : (found.quantity != null ? found.quantity : 1))
        if (cur <= 1) {
          removeFromCart(id)
        } else {
          updateQuantity(id, cur - 1)
        }
        renderCartPage()
        return
      }

      // УДАЛИТЬ
      const removeBtn = e.target.closest('[data-remove]')
      if (removeBtn) {
        const id = removeBtn.getAttribute('data-remove')
        if (!id) return
        removeFromCart(id)
        renderCartPage()
      }
    })
  }

  function initCartPage() {
    renderCartPage()

    const form = document.getElementById('request-form')
    const resultEl = document.getElementById('request-result')
    if (!form || !resultEl) return

    form.addEventListener('submit', async function(e) {
      e.preventDefault()
      const data = new FormData(form)
      const totals = getCartTotals()
      const items = totals.items
      const totalItems = totals.totalItems
      const totalSum = totals.totalSum

      if (!items.length) {
        resultEl.textContent = 'Добавьте хотя бы один товар в корзину.'
        return
      }

      // Формируем строку с товарами для колонки "Товары"
      const itemsText = items.map(function(i) {
        return i.name + ' x' + i.qty + (i.price ? ' (' + (i.qty * Number(i.price)).toFixed(2) + ' ₽)' : '')
      }).join('; ')

      // Данные заказа для Google Таблицы
      const orderRow = {
        date:      new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Kiev' }),
        company:   data.get('company') || '',
        name:      data.get('name')    || '',
        phone:     data.get('phone')   || '',
        email:     data.get('email')   || '',
        items:     itemsText,
        total:     totalSum.toFixed(2) + ' ₽',
        comment:   data.get('comment') || '',
        status:    'Новый',
      }

      // Отправляем в Google Apps Script
      const ORDERS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw3HIoHc1d8pR0x7h58L8xvEGofchb_tS6ian7hxRpoZJ9UxHRrbhLvxMcu5HLdV6xE/exec'

      const submitBtn = form.querySelector('[type="submit"]')
      if (submitBtn) submitBtn.disabled = true
      resultEl.textContent = 'Отправляем заказ...'
      resultEl.style.color = 'var(--text-muted)'

      try {
        const res = await fetch(ORDERS_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderRow),
        })
        // no-cors не даёт читать ответ, но если нет ошибки — считаем успехом
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
  window.Novoled.addToCart = addToCart
  window.Novoled.readCart = readCart
  window.Novoled.initCartBadge = updateCartBadge
  window.Novoled.initCartPage = initCartPage
})()
