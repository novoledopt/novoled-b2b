;(function () {
  function normalizeProduct(row) {
    const parseBoolean = (value) => {
      if (value === true) return true
      if (value === false) return false
      if (value == null) return false
      const v = String(value).trim().toLowerCase()
      return v === 'истина' || v === 'true' || v === '1' || v === 'yes' || v === 'да'
    }
    return {
      ...row,
      id: row.id,
      in_stock: parseBoolean(row.in_stock),
      name: row.name || '',
      category: row.category || '',
      subcategory: row.subcategory || '',
      series: row.series || '',
      socket: row.socket || '',
      power: row.power || '',
      lumens: row.lumens || '',
      unit: row.unit || '',
      price: Number(row.price) || '',
      image_1: row.image_1 || '',
      image_2: row.image_2 || '',
      image_3: row.image_3 || '',
    }
  }

  const COMING_SOON_IMG = 'images/products/coming-soon.png'

  function getProductImage(product) {
    function fixPath(p) {
      if (!p) return ''
      // Если путь уже полный — не трогаем
      if (p.startsWith('http') || p.startsWith('images/')) return p
      // Иначе добавляем папку
      return 'images/products/' + p
    }
    if (product.image_1) return fixPath(product.image_1)
    if (product.image_2) return fixPath(product.image_2)
    if (product.image_3) return fixPath(product.image_3)
    return COMING_SOON_IMG
  }

  function normalizeBooleanStockLabel(inStock) {
    return inStock ? 'В НАЛИЧИИ' : 'ОЖИДАЕТСЯ ПОСТАВКА'
  }

  // ─── СОЗДАНИЕ КАРТОЧКИ ───────────────────────────────────────────
  // Возвращает DOM-узел. addEventListener навешивается здесь же и
  // не теряется — карточка больше НЕ конвертируется в строку HTML.
  function createProductCard(product) {
    const card = document.createElement('article')
    card.className = 'product-card'

    const sockets  = product.socket || ''
    const power    = product.power  ? product.power  + ' W'  : ''
    const lumens   = product.lumens ? product.lumens + ' lm' : ''
    const specsRight = [power, lumens].filter(Boolean).join(' · ')
    const imgSrc   = getProductImage(product)
    const stockLabel = normalizeBooleanStockLabel(!!product.in_stock)
    const canSeePrices = sessionStorage.getItem('can_see_prices') === 'true'
    const priceStr = product.price ? Number(product.price).toFixed(2) + ' ₽' : '—'

    card.innerHTML = `
      <div class="product-thumb">
        <img src="${imgSrc}" alt="${product.name}" loading="lazy"
             onerror="this.onerror=null;this.src='${COMING_SOON_IMG}'" />
        <button class="product-info-badge" type="button" data-product-details="${product.id}">
          Подробнее
        </button>
      </div>

      <div class="product-body">
        <div class="product-badges">
          ${product.category ? `<span class="badge badge-accent">${product.category}</span>` : ''}
          ${product.series   ? `<span class="badge">${product.series}</span>` : ''}
          ${sockets          ? `<span class="badge">${sockets}</span>` : ''}
          ${specsRight       ? `<span class="badge">${specsRight}</span>` : ''}
        </div>

        <div class="product-title">${product.name}</div>
        <div class="product-sku">Арт.: ${product.id}</div>

        <div class="product-price">
          <span class="price-value" style="display:${canSeePrices ? '' : 'none'}">${priceStr}</span>
          <span class="price-locked" style="display:${canSeePrices ? 'none' : ''};font-size:13px;color:var(--text-muted)">Цена после входа</span>
        </div>
        ${product.unit ? `<div class="product-unit">Ед.: ${product.unit}</div>` : ''}

        <div class="product-stock-row">
          <span class="stock-indicator ${product.in_stock ? 'stock-available' : 'stock-pending'}"></span>
          <span class="${product.in_stock ? 'stock-label-available' : 'stock-label-pending'}">
            ${product.in_stock ? 'В наличии' : 'Ожидается поставка'}
          </span>
        </div>
      </div>

      <div class="product-bottom">
        <div class="product-actions">
          <button
            class="btn-add-to-cart"
            data-add-to-cart="${product.id}"
            ${product.in_stock ? '' : 'disabled'}
            type="button"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            ${product.in_stock ? 'В корзину' : 'Ожидается'}
          </button>
        </div>
      </div>
    `

    // ── Кнопка "В корзину" — addEventListener на живой DOM-узел ──
    const addBtn = card.querySelector('[data-add-to-cart]')
    if (addBtn) {
      addBtn.addEventListener('click', function(e) {
        e.stopPropagation()
        if (!product.in_stock) return
        if (window.Novoled && window.Novoled.addToCart) {
          window.Novoled.addToCart(product, 1)
        }
        addBtn.classList.remove('btn-pulse')
        void addBtn.offsetWidth
        addBtn.classList.add('btn-pulse')
        // Toast уведомление
        if (typeof showToast === 'function') showToast('Добавлено в корзину')
      })
    }

    return card
  }

  // ─── СЕТКА ТОВАРОВ — возвращает DOM-узел, а не строку! ──────────
  // Это ключевое исправление: раньше возвращался outerHTML (строка),
  // при вставке через innerHTML все addEventListener терялись.
  function renderProductsGrid(products) {
    const wrapper = document.createElement('div')
    wrapper.className = 'products-grid'
    if (!products.length) {
      wrapper.innerHTML = '<div class="muted">Нет товаров.</div>'
      return wrapper
    }
    products.forEach(function(p) {
      wrapper.appendChild(createProductCard(p))
    })
    return wrapper
  }

  function applyFilters(products, searchTerm, seriesSet, socketSet) {
    const term = (searchTerm || '').trim().toLowerCase()
    const hasTerm = !!term
    return products.filter(function(p) {
      if (seriesSet.size && !seriesSet.has(p.series)) return false
      if (socketSet.size && !socketSet.has(p.socket)) return false
      if (!hasTerm) return true
      const haystack = [p.name, p.category, p.subcategory, p.series, p.socket, p.id]
        .filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(term)
    })
  }

  const CATEGORY_ORDER = [
    'LED Группа', 'Батарейки', 'Брелока/Заглушки', 'Лампы Галогенные',
    'Наконечники KBT', 'НИВА', 'Разное', 'Распродажа', 'Щетки Стеклоочестителя',
  ]

  function sortByCategoryOrder(a, b) {
    const ia = CATEGORY_ORDER.indexOf(a)
    const ib = CATEGORY_ORDER.indexOf(b)
    if (ia === -1 && ib === -1) return a.localeCompare(b, 'ru')
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  }

  function buildCategoryTree(products) {
    const tree = new Map()
    for (const p of products) {
      const catKey = p.category || 'Без категории'
      if (!tree.has(catKey)) tree.set(catKey, { products: [], subcategories: new Map(), series: new Map() })
      const catNode = tree.get(catKey)
      const sub = p.subcategory || ''
      const ser = p.series || ''
      if (sub && ser) {
        if (!catNode.subcategories.has(sub)) catNode.subcategories.set(sub, { products: [], series: new Map() })
        const subNode = catNode.subcategories.get(sub)
        if (!subNode.series.has(ser)) subNode.series.set(ser, [])
        subNode.series.get(ser).push(p)
      } else if (sub && !ser) {
        if (!catNode.subcategories.has(sub)) catNode.subcategories.set(sub, { products: [], series: new Map() })
        catNode.subcategories.get(sub).products.push(p)
      } else if (!sub && ser) {
        if (!catNode.series.has(ser)) catNode.series.set(ser, [])
        catNode.series.get(ser).push(p)
      } else {
        catNode.products.push(p)
      }
    }
    return tree
  }

  // ─── ДЕРЕВО КАТЕГОРИЙ — теперь appendChild вместо innerHTML ─────
  function renderCategoryTree(tree, container) {
    container.innerHTML = ''
    const categories = Array.from(tree.keys()).sort(sortByCategoryOrder)
    const isFiltered =
      (document.getElementById('search-input')?.value || '').trim().length > 0 ||
      document.querySelector('.filter-chip-active') != null

    for (const cat of categories) {
      const node = tree.get(cat)
      const hasChildren = node.subcategories.size || node.series.size || node.products.length

      const details = document.createElement('details')
      details.className = 'tree-node tree-node-depth-0'
      details.open = !!isFiltered
      details.innerHTML = `
        <summary>
          <div class="tree-node-label"><span>${cat}</span></div>
          <span class="tree-node-toggle"></span>
        </summary>
      `
      const childrenContainer = document.createElement('div')
      childrenContainer.className = 'tree-node-children'
      details.appendChild(childrenContainer)

      // Подкатегории
      const subcats = Array.from(node.subcategories.keys()).sort((a, b) => a.localeCompare(b, 'ru'))
      for (const sub of subcats) {
        const subNode = node.subcategories.get(sub)
        const subDetails = document.createElement('details')
        subDetails.className = 'tree-node tree-node-depth-1'
        subDetails.open = !!isFiltered
        subDetails.innerHTML = `
          <summary>
            <div class="tree-node-label"><span>${sub}</span></div>
            <span class="tree-node-toggle"></span>
          </summary>
        `
        const subChildren = document.createElement('div')
        subChildren.className = 'tree-node-children'
        subDetails.appendChild(subChildren)

        const seriesNames = Array.from(subNode.series.keys()).sort((a, b) => a.localeCompare(b, 'ru'))
        for (const ser of seriesNames) {
          const serProducts = subNode.series.get(ser)
          const serDetails = document.createElement('details')
          serDetails.className = 'tree-node tree-node-depth-2'
          serDetails.open = !!isFiltered
          serDetails.innerHTML = `
            <summary>
              <div class="tree-node-label"><span>${ser}</span></div>
              <span class="tree-node-toggle"></span>
            </summary>
          `
          const serChildren = document.createElement('div')
          serChildren.className = 'tree-node-children'
          serDetails.appendChild(serChildren)
          serChildren.appendChild(renderProductsGrid(serProducts))
          subChildren.appendChild(serDetails)
        }

        if (subNode.products.length) {
          subChildren.appendChild(renderProductsGrid(subNode.products))
        }
        childrenContainer.appendChild(subDetails)
      }

      // Серии без подкатегории
      const catSeriesNames = Array.from(node.series.keys()).sort((a, b) => a.localeCompare(b, 'ru'))
      for (const ser of catSeriesNames) {
        const serProducts = node.series.get(ser)
        const serDetails = document.createElement('details')
        serDetails.className = 'tree-node tree-node-depth-1'
        serDetails.open = !!isFiltered
        serDetails.innerHTML = `
          <summary>
            <div class="tree-node-label"><span>${ser}</span></div>
            <span class="tree-node-toggle"></span>
          </summary>
        `
        const serChildren = document.createElement('div')
        serChildren.className = 'tree-node-children'
        serDetails.appendChild(serChildren)
        serChildren.appendChild(renderProductsGrid(serProducts))
        childrenContainer.appendChild(serDetails)
      }

      // Товары без подкатегории и серии
      if (node.products.length) {
        childrenContainer.appendChild(renderProductsGrid(node.products))
      }

      container.appendChild(details)
    }
  }

  function renderFilterChips(values, container, selectedSet) {
    container.innerHTML = ''
    values.forEach(function(val) {
      const chip = document.createElement('button')
      chip.type = 'button'
      chip.className = 'filter-chip'
      chip.dataset.value = val
      if (selectedSet.has(val)) chip.classList.add('filter-chip-active')
      chip.innerHTML = `<span>${val}</span>`
      container.appendChild(chip)
    })
  }

  async function initCatalogPage() {
    const loader         = document.getElementById('products-loader')
    const errorEl        = document.getElementById('products-error')
    const treeContainer  = document.getElementById('catalog-tree')
    const countEl        = document.getElementById('products-count')
    const searchInput    = document.getElementById('search-input')
    const seriesFilterList = document.getElementById('series-filter-list')
    const socketFilterList = document.getElementById('socket-filter-list')
    const resetBtn       = document.getElementById('reset-filters')

    if (!treeContainer) return

    let products = []
    const selectedSeries  = new Set()
    const selectedSockets = new Set()

    try {
      const data = await window.Novoled.api.getAllProducts()
      products = data.map(normalizeProduct)
      loader.style.display = 'none'
      // Убираем skeleton если был показан
      const skeleton = document.getElementById('catalog-skeleton')
      if (skeleton) skeleton.remove()
    } catch (err) {
      loader.style.display = 'none'
      const skeleton = document.getElementById('catalog-skeleton')
      if (skeleton) skeleton.remove()
      if (errorEl) {
        errorEl.hidden = false
        errorEl.textContent = 'Не удалось загрузить каталог из Supabase. Проверьте таблицу products и CORS.'
      }
      console.error(err)
      return
    }

    const seriesValues = Array.from(new Set(products.map(p => p.series).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, 'ru'))
    const socketValues = Array.from(new Set(products.map(p => p.socket).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, 'ru'))

    renderFilterChips(seriesValues,  seriesFilterList,  selectedSeries)
    renderFilterChips(socketValues,  socketFilterList,  selectedSockets)

    function render() {
      const filtered = applyFilters(products, searchInput.value, selectedSeries, selectedSockets)
      const tree = buildCategoryTree(filtered)
      treeContainer.innerHTML = ''
      if (!filtered.length) {
        treeContainer.innerHTML = '<div class="muted">По выбранным фильтрам товары не найдены.</div>'
      } else {
        renderCategoryTree(tree, treeContainer)
      }
      if (countEl) countEl.textContent = `Показано ${filtered.length} из ${products.length}`
    }

    let searchTimeout = null
    searchInput.addEventListener('input', function() {
      clearTimeout(searchTimeout)
      searchTimeout = setTimeout(render, 160)
    })

    // Знак +/− управляется через CSS (::before на details[open] > summary)
    // JS-обработчик toggle убран — он конфликтовал с браузерным рендером details

    seriesFilterList.addEventListener('click', function(e) {
      const chip = e.target.closest('.filter-chip')
      if (!chip) return
      const val = chip.dataset.value
      if (!val) return
      if (selectedSeries.has(val)) selectedSeries.delete(val)
      else selectedSeries.add(val)
      renderFilterChips(seriesValues, seriesFilterList, selectedSeries)
      render()
    })

    socketFilterList.addEventListener('click', function(e) {
      const chip = e.target.closest('.filter-chip')
      if (!chip) return
      const val = chip.dataset.value
      if (!val) return
      if (selectedSockets.has(val)) selectedSockets.delete(val)
      else selectedSockets.add(val)
      renderFilterChips(socketValues, socketFilterList, selectedSockets)
      render()
    })

    resetBtn.addEventListener('click', function() {
      searchInput.value = ''
      selectedSeries.clear()
      selectedSockets.clear()
      renderFilterChips(seriesValues,  seriesFilterList,  selectedSeries)
      renderFilterChips(socketValues,  socketFilterList,  selectedSockets)
      render()
    })

    render()

    // Обработчик открытия модалки
    document.addEventListener('click', function(e) {
      const btn = e.target.closest('[data-product-details]')
      if (!btn) return
      const id = btn.getAttribute('data-product-details')
      const product = products.find(p => p.id === id)
      if (product) openProductModal(product)
    })
  }

  // ─── МОДАЛКА ────────────────────────────────────────────────────
  function openProductModal(product) {
    const modal = document.getElementById('product-modal')
    const body  = document.getElementById('product-modal-body')
    if (!modal || !body) return

    const images = [product.image_1, product.image_2, product.image_3].filter(Boolean)
    const mainImg = getProductImage(product)
    const stockLabel = normalizeBooleanStockLabel(!!product.in_stock)
    const canSeePrices = sessionStorage.getItem('can_see_prices') === 'true'
    const priceStr = product.price ? Number(product.price).toFixed(2) + ' ₽' : '—'

    body.innerHTML = `
      <div class="modal-product-layout">
        <div class="modal-product-gallery">
          <div class="modal-main-image">
            <img id="modal-main-image" src="${mainImg}" alt="${product.name}"
                 onerror="this.onerror=null;this.src='${COMING_SOON_IMG}'" />
          </div>
          ${images.length ? `<div class="modal-thumbs">
            ${images.map((src, idx) => `
              <button type="button" class="modal-thumb${idx === 0 ? ' modal-thumb-active' : ''}" data-src="${src}">
                <img src="${src}" alt="${product.name}" onerror="this.onerror=null;this.src='${COMING_SOON_IMG}'" />
              </button>`).join('')}
          </div>` : ''}
        </div>
        <div class="modal-product-info">
          <div class="modal-product-header">
            <div>
              <h2>${product.name}</h2>
              <div class="product-category">ID: ${product.id}${product.category ? ' · ' + product.category : ''}</div>
              ${product.subcategory ? `<div class="product-category">Подкатегория: ${product.subcategory}</div>` : ''}
            </div>
          </div>
          <div class="product-tags">
            ${product.series ? `<span class="badge">${product.series}</span>` : ''}
            ${product.socket ? `<span class="badge">${product.socket}</span>` : ''}
            <span class="badge">
              <span class="stock-indicator ${product.in_stock ? 'stock-available' : 'stock-pending'}" title="${stockLabel}"></span>
              ${stockLabel}
            </span>
          </div>
          <div class="product-specs">
            <div class="specs-grid">
              ${product.power  ? `<div class="spec-row"><span class="spec-label">Мощность</span><span class="spec-value">${product.power} W</span></div>` : ''}
              ${product.lumens ? `<div class="spec-row"><span class="spec-label">Световой поток</span><span class="spec-value">${product.lumens} lm</span></div>` : ''}
            </div>
          </div>

          <div class="modal-price-block">
            <div class="product-price-lg">
              <span class="price-value" style="display:${canSeePrices ? '' : 'none'}" id="modal-price-display">${priceStr}</span>
              <span class="price-locked" style="display:${canSeePrices ? 'none' : ''};color:var(--text-muted);font-size:14px">Цена после входа</span>
            </div>
            ${product.unit ? `<div class="product-unit">Ед.: ${product.unit}</div>` : ''}
            ${canSeePrices && product.price ? `
            <div class="modal-total-row">
              <span class="modal-total-label">Сумма:</span>
              <span class="modal-total-value" id="modal-total">${priceStr}</span>
            </div>` : ''}
          </div>

          <div class="product-detail-actions">
            <div class="modal-qty-row">
              <div class="qty-stepper">
                <button type="button" class="qty-btn" id="modal-qty-minus" aria-label="Минус">
                  <span class="qty-icon">&#8722;</span>
                </button>
                <div class="qty-value" id="modal-qty-value">1</div>
                <button type="button" class="qty-btn" id="modal-qty-plus" aria-label="Плюс">
                  <span class="qty-icon">+</span>
                </button>
              </div>
              <button class="btn-primary${product.in_stock ? '' : ' btn-disabled'}"
                id="modal-add-to-cart" type="button"
                ${product.in_stock ? '' : 'disabled'}>
                ${product.in_stock ? 'В корзину' : 'Ожидается'}
              </button>
            </div>
            <span class="muted">Корзина используется как запрос счёта.</span>
          </div>
        </div>
      </div>
    `

    // Миниатюры
    const mainImgEl = document.getElementById('modal-main-image')
    body.querySelectorAll('.modal-thumb').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const src = btn.getAttribute('data-src')
        if (!src || !mainImgEl) return
        mainImgEl.src = src
        body.querySelectorAll('.modal-thumb').forEach(b => b.classList.remove('modal-thumb-active'))
        btn.classList.add('modal-thumb-active')
      })
    })

    // Счётчик количества + пересчёт суммы
    let modalQty = 1
    const qtyValueEl  = document.getElementById('modal-qty-value')
    const totalEl     = document.getElementById('modal-total')
    const unitPrice   = Number(product.price) || 0

    function updateModalQty(newQty) {
      modalQty = Math.max(1, newQty)
      if (qtyValueEl) qtyValueEl.textContent = String(modalQty)
      if (totalEl && unitPrice) {
        totalEl.textContent = (unitPrice * modalQty).toFixed(2) + ' ₽'
      }
    }

    const minusBtn = document.getElementById('modal-qty-minus')
    const plusBtn  = document.getElementById('modal-qty-plus')
    if (minusBtn) minusBtn.addEventListener('click', function() { updateModalQty(modalQty - 1) })
    if (plusBtn)  plusBtn.addEventListener('click',  function() { updateModalQty(modalQty + 1) })

    // Кнопка "В корзину" в модалке — передаёт актуальное qty
    const addBtn = document.getElementById('modal-add-to-cart')
    if (addBtn && product.in_stock) {
      addBtn.addEventListener('click', function() {
        if (window.Novoled && window.Novoled.addToCart) {
          window.Novoled.addToCart(product, modalQty)
        }
        addBtn.classList.remove('btn-pulse')
        void addBtn.offsetWidth
        addBtn.classList.add('btn-pulse')
      })
    }

    modal.hidden = false

    modal.querySelectorAll('[data-modal-close]').forEach(function(el) {
      el.addEventListener('click', function() { modal.hidden = true })
    })

    document.addEventListener('keydown', function escListener(e) {
      if (e.key === 'Escape') {
        modal.hidden = true
        document.removeEventListener('keydown', escListener)
      }
    }, { once: true })
  }

  window.Novoled = window.Novoled || {}
  window.Novoled.initCatalogPage = initCatalogPage
})()