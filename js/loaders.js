// ─── LOADERS.JS — скелетоны и лоадеры для каталога и корзины ──────
// Подключается на всех страницах ПОСЛЕ styles.css

;(function () {

  // ══════════════════════════════════════════════════════════════════
  //  КАТАЛОГ: скелетон-дерево категорий
  // ══════════════════════════════════════════════════════════════════

  // Создаёт один скелетон-блок категории с карточками товаров внутри
  function makeCategorySkeletonBlock(cardCount) {
    var block = document.createElement('div')
    block.className = 'skel-category-block'

    // Заголовок категории
    var header = document.createElement('div')
    header.className = 'skel-category-header'
    header.innerHTML =
      '<div class="skel-line skel-line--title"></div>' +
      '<div class="skel-chevron"></div>'
    block.appendChild(header)

    // Сетка карточек
    var grid = document.createElement('div')
    grid.className = 'skel-products-grid'
    for (var i = 0; i < (cardCount || 4); i++) {
      var card = document.createElement('div')
      card.className = 'skel-product-card'
      card.innerHTML =
        '<div class="skel-product-thumb"></div>' +
        '<div class="skel-product-body">' +
          '<div class="skel-line skel-line--badge"></div>' +
          '<div class="skel-line skel-line--name"></div>' +
          '<div class="skel-line skel-line--sku"></div>' +
          '<div class="skel-line skel-line--price"></div>' +
        '</div>' +
        '<div class="skel-product-footer">' +
          '<div class="skel-btn"></div>' +
        '</div>'
      grid.appendChild(card)
    }
    block.appendChild(grid)
    return block
  }

  // Показывает скелетон каталога и возвращает элемент для последующего удаления
  function showCatalogSkeleton() {
    var treeContainer = document.getElementById('catalog-tree')
    var loader = document.getElementById('products-loader')
    if (!treeContainer) return null

    // Прячем текстовый лоадер
    if (loader) loader.style.display = 'none'

    var existing = document.getElementById('catalog-skeleton')
    if (existing) return existing

    var wrap = document.createElement('div')
    wrap.id = 'catalog-skeleton'

    // Генерируем 3 категории с разным числом карточек
    var counts = [4, 6, 3]
    counts.forEach(function(n) {
      wrap.appendChild(makeCategorySkeletonBlock(n))
    })

    treeContainer.parentNode.insertBefore(wrap, treeContainer)
    return wrap
  }

  function hideCatalogSkeleton() {
    var el = document.getElementById('catalog-skeleton')
    if (el) {
      el.style.opacity = '0'
      el.style.transition = 'opacity 0.2s'
      setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el) }, 200)
    }
    var loader = document.getElementById('products-loader')
    if (loader) loader.style.display = 'none'
  }

  // ══════════════════════════════════════════════════════════════════
  //  КОРЗИНА: скелетон таблицы
  // ══════════════════════════════════════════════════════════════════

  function showCartSkeleton() {
    var existing = document.getElementById('cart-skeleton')
    if (existing) return existing

    var cartSection = document.querySelector('.cart-section .container')
    if (!cartSection) return null

    var wrap = document.createElement('div')
    wrap.id = 'cart-skeleton'
    wrap.className = 'skel-cart-wrap'

    // 4 строки таблицы
    for (var i = 0; i < 4; i++) {
      var row = document.createElement('div')
      row.className = 'skel-cart-row'
      row.innerHTML =
        '<div class="skel-cart-name">' +
          '<div class="skel-line skel-line--name" style="width:70%"></div>' +
          '<div class="skel-line skel-line--sku" style="width:40%"></div>' +
        '</div>' +
        '<div class="skel-line skel-line--badge" style="width:60px"></div>' +
        '<div class="skel-cart-qty">' +
          '<div class="skel-qty-btn"></div>' +
          '<div class="skel-line" style="width:28px;height:16px"></div>' +
          '<div class="skel-qty-btn"></div>' +
        '</div>' +
        '<div class="skel-line skel-line--price"></div>' +
        '<div class="skel-line skel-line--price"></div>' +
        '<div class="skel-icon-btn"></div>'
      wrap.appendChild(row)
    }

    // Вставляем после h1
    var h1 = cartSection.querySelector('h1')
    var ref = h1 ? h1.nextSibling : cartSection.firstChild
    cartSection.insertBefore(wrap, ref && ref.nextSibling ? ref.nextSibling : ref)
    return wrap
  }

  function hideCartSkeleton() {
    var el = document.getElementById('cart-skeleton')
    if (el) {
      el.style.opacity = '0'
      el.style.transition = 'opacity 0.18s'
      setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el) }, 180)
    }
  }

  // ══════════════════════════════════════════════════════════════════
  //  ИСТОРИЯ ЗАКАЗОВ: скелетон
  // ══════════════════════════════════════════════════════════════════

  function showHistorySkeleton() {
    var container = document.getElementById('order-history-section')
    if (!container) return

    container.innerHTML =
      '<div class="skel-line skel-line--title" style="width:200px;margin-bottom:20px"></div>' +
      '<div class="skel-history-list">' +
        [1,2].map(function() {
          return '<div class="skel-history-card">' +
            '<div style="display:flex;justify-content:space-between;margin-bottom:12px">' +
              '<div><div class="skel-line skel-line--sku" style="width:120px;margin-bottom:6px"></div><div class="skel-line skel-line--badge" style="width:90px"></div></div>' +
              '<div class="skel-line skel-line--price" style="width:70px"></div>' +
            '</div>' +
            '<div style="display:flex;gap:8px;margin-bottom:14px">' +
              '<div class="skel-line skel-line--badge" style="width:80px"></div>' +
              '<div class="skel-line skel-line--badge" style="width:100px"></div>' +
              '<div class="skel-line skel-line--badge" style="width:60px"></div>' +
            '</div>' +
            '<div style="display:flex;gap:10px">' +
              '<div class="skel-btn" style="width:80px"></div>' +
              '<div class="skel-btn" style="width:140px;background:rgba(255,198,0,0.15)"></div>' +
            '</div>' +
          '</div>'
        }).join('') +
      '</div>'
  }

  // ══════════════════════════════════════════════════════════════════
  //  ЭКСПОРТ
  // ══════════════════════════════════════════════════════════════════

  window.Novoled = window.Novoled || {}
  window.Novoled.loaders = {
    showCatalog:  showCatalogSkeleton,
    hideCatalog:  hideCatalogSkeleton,
    showCart:     showCartSkeleton,
    hideCart:     hideCartSkeleton,
    showHistory:  showHistorySkeleton,
  }

})()
