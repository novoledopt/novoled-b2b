;(function () {
  const body = document.body
  const page = body.dataset.page

  const yearEl = document.getElementById('year')
  if (yearEl) yearEl.textContent = new Date().getFullYear()

  window.Novoled = window.Novoled || {}

  if (window.Novoled.initCartBadge) window.Novoled.initCartBadge()

  // Ждём пока auth загрузит сессию — тогда sessionStorage.can_see_prices
  // уже будет заполнен в момент рендера карточек товаров.
  // loadSession() НЕ редиректит — незалогиненный просто видит скрытые цены.
  ;(async function () {
    if (typeof loadSession === 'function') {
      await loadSession()
    }

    // Обновляем шапку (email / кнопка войти)
    if (typeof updateHeaderAuth === 'function') {
      updateHeaderAuth()
    }

    if (page === 'catalog' && window.Novoled.initCatalogPage) {
      window.Novoled.initCatalogPage()
    }

    if (page === 'product' && window.Novoled.initProductPage) {
      window.Novoled.initProductPage()
    }

    if (page === 'cart' && window.Novoled.initCartPage) {
      window.Novoled.initCartPage()
    }
  })()

  // Параллакс героя
  const heroBg = document.querySelector('.hero-bg')
  if (heroBg) {
    window.addEventListener('scroll', function () {
      heroBg.style.transform = 'translateY(' + (window.scrollY * 0.25) + 'px) scale(1.1)'
    })
  }
})()

// ─── SCROLL TO TOP ───
document.addEventListener('DOMContentLoaded', function () {
  var scrollBtn = document.getElementById('scroll-top-btn')
  if (!scrollBtn) return

  window.addEventListener('scroll', function () {
    if (window.scrollY > 300) {
      scrollBtn.classList.add('visible')
    } else {
      scrollBtn.classList.remove('visible')
    }
  }, { passive: true })

  scrollBtn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  })
})
// ─── TOAST УВЕДОМЛЕНИЕ ───
function showToast(msg) {
  var existing = document.getElementById('novoled-toast')
  if (existing) existing.remove()

  var toast = document.createElement('div')
  toast.id = 'novoled-toast'
  toast.className = 'toast'
  toast.textContent = msg
  document.body.appendChild(toast)

  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      toast.classList.add('show')
    })
  })

  setTimeout(function() {
    toast.classList.remove('show')
    setTimeout(function() { toast.remove() }, 220)
  }, 2000)
}

// ─── SKELETON LOADER ───
document.addEventListener('DOMContentLoaded', function () {
  var treeContainer = document.getElementById('catalog-tree')
  var loader = document.getElementById('products-loader')
  if (treeContainer && loader) {
    // Прячем текстовый лоадер, показываем skeleton карточки
    loader.style.display = 'none'
    var skeleton = document.createElement('div')
    skeleton.id = 'catalog-skeleton'
    skeleton.className = 'skeleton-grid'
    for (var i = 0; i < 8; i++) {
      var card = document.createElement('div')
      card.className = 'skeleton-card'
      skeleton.appendChild(card)
    }
    treeContainer.parentNode.insertBefore(skeleton, treeContainer)
  }
})
