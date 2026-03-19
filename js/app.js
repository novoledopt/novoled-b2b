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
