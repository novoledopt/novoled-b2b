const SUPABASE_URL = 'https://eprgxwxyapnfvwgqhrjt.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwcmd4d3h5YXBuZnZ3Z3Focmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2OTQxOTEsImV4cCI6MjA4OTI3MDE5MX0.rjlO-8SNELUFcFJm_Gjilylzq9oocHa_Dk3-SqXlUIk'
const SHEET_URL = 'https://opensheet.elk.sh/1RkK3OeeQXircxyDPsJFP2S6V8032OuyS2O-TiP_b5mM/profiles'

// Инициализируем клиент Supabase (window.supabase подключён через CDN)
const _supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// --- ПРОВЕРКА can_see_prices из Google Таблицы ---
async function checkCanSeePrices(email) {
  try {
    const res = await fetch(SHEET_URL)
    const rows = await res.json()
    const user = rows.find(function(r) {
      return r.email && r.email.toLowerCase() === email.toLowerCase()
    })
    return user && user.can_see_prices === 'TRUE'
  } catch (e) {
    console.warn('Не удалось загрузить профили:', e)
    return false
  }
}

// --- ВХОД ---
async function login(email, password) {
  const result = await _supabaseClient.auth.signInWithPassword({ email: email, password: password })
  const error = result.error

  if (error) {
    return { success: false, message: 'Неверный email или пароль' }
  }

  const canSeePrices = await checkCanSeePrices(email)

  sessionStorage.setItem('user_email', email)
  sessionStorage.setItem('can_see_prices', String(canSeePrices))

  return { success: true, canSeePrices: canSeePrices }
}

// --- ВЫХОД ---
async function logout() {
  await _supabaseClient.auth.signOut()
  sessionStorage.clear()
  window.location.href = 'login.html'
}

// --- ПОЛУЧИТЬ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ (без редиректа) ---
async function getCurrentUser() {
  const result = await _supabaseClient.auth.getSession()
  const session = result.data.session
  if (!session) return null
  return session.user
}

// --- ПРОВЕРКА СЕССИИ — вызывай на защищённых страницах ---
// Если не авторизован — редиректит на login.html
async function requireAuth() {
  const result = await _supabaseClient.auth.getSession()
  const session = result.data.session

  if (!session) {
    window.location.href = 'login.html'
    return null
  }

  const email = session.user.email

  // Каждый раз перечитываем can_see_prices из таблицы — менеджер мог изменить
  const canSeePrices = await checkCanSeePrices(email)
  sessionStorage.setItem('can_see_prices', String(canSeePrices))
  sessionStorage.setItem('user_email', email)

  return { email: email, canSeePrices: canSeePrices }
}

// --- ПОКАЗАТЬ / СКРЫТЬ ЦЕНЫ ---
// Вызывай после requireAuth() или после рендера товаров
function applyPriceVisibility() {
  const canSee = sessionStorage.getItem('can_see_prices') === 'true'

  // Элементы с классом .price-value показываются если есть доступ
  document.querySelectorAll('.price-value').forEach(function(el) {
    el.style.display = canSee ? '' : 'none'
  })

  // Элементы с классом .price-locked показывают заглушку
  document.querySelectorAll('.price-locked').forEach(function(el) {
    el.style.display = canSee ? 'none' : ''
  })
}

// --- ОБНОВИТЬ ШАПКУ (имейл + кнопка выхода) ---
function updateHeaderAuth() {
  const email = sessionStorage.getItem('user_email')
  const loginArea = document.getElementById('header-auth')
  if (!loginArea) return

  if (email) {
    loginArea.innerHTML =
      '<span class="auth-email">' + email + '</span>' +
      '<button class="auth-logout-btn" onclick="logout()">Выйти</button>'
  } else {
    loginArea.innerHTML =
      '<a href="login.html" class="auth-login-link">Войти</a>'
  }
}

// --- ЗАГРУЗКА СЕССИИ БЕЗ РЕДИРЕКТА ---
// Используется в app.js для каталога: если не залогинен — цены просто скрыты,
// редиректа на login.html нет.
async function loadSession() {
  const result = await _supabaseClient.auth.getSession()
  const session = result.data && result.data.session

  if (!session) {
    // Не залогинен — сбрасываем флаг цен (цены будут скрыты)
    sessionStorage.setItem('can_see_prices', 'false')
    sessionStorage.removeItem('user_email')
    return null
  }

  const email = session.user.email
  const canSeePrices = await checkCanSeePrices(email)
  sessionStorage.setItem('can_see_prices', String(canSeePrices))
  sessionStorage.setItem('user_email', email)

  return { email: email, canSeePrices: canSeePrices }
}
