// ─── КОНФИГУРАЦИЯ ────────────────────────────────────────────────
// Замените на ваш реальный URL Apps Script (тот же, что в api.js)
const _AUTH_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxU9BXOdmvpoyTNXtjgwiLR9q2IA5AKTBzLcp66EuvGQmVxnYgboa7hn5AP1YzeSXFo/exec'
// ─────────────────────────────────────────────────────────────────

// localStorage-ключи
const _LS_EMAIL  = 'novoled_user_email'
const _LS_PRICES = 'novoled_can_see_prices'

async function _callAuthScript(params) {
  const url = new URL(_AUTH_SCRIPT_URL)
  Object.entries(params).forEach(function(kv) { url.searchParams.set(kv[0], kv[1]) })
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error('Auth error: ' + res.status)
  return res.json()
}

// --- ВХОД (только email, без пароля) ---
async function login(email) {
  const em = (email || '').trim().toLowerCase()
  if (!em) return { success: false, message: 'Введите email' }
  try {
    const data = await _callAuthScript({ action: 'checkAccess', email: em })
    if (data.access) {
      localStorage.setItem(_LS_EMAIL,  em)
      localStorage.setItem(_LS_PRICES, String(!!data.can_see_prices))
      return { success: true, canSeePrices: !!data.can_see_prices }
    } else {
      return { success: false, message: 'Email не найден. Запросите доступ у менеджера.' }
    }
  } catch (e) {
    return { success: false, message: 'Ошибка соединения. Попробуйте ещё раз.' }
  }
}

// --- ВЫХОД ---
function logout() {
  localStorage.removeItem(_LS_EMAIL)
  localStorage.removeItem(_LS_PRICES)
  window.location.href = 'login.html'
}

// --- ТЕКУЩИЙ ПОЛЬЗОВАТЕЛЬ ---
function getCurrentUser() {
  const email = localStorage.getItem(_LS_EMAIL)
  if (!email) return null
  return {
    email: email,
    canSeePrices: localStorage.getItem(_LS_PRICES) === 'true'
  }
}

// --- ЗАГРУЗКА СЕССИИ (без редиректа) ---
// Используется в app.js на всех страницах
async function loadSession() {
  const user = getCurrentUser()
  if (!user) {
    localStorage.removeItem(_LS_PRICES)
    return null
  }
  // Актуализируем can_see_prices с сервера при каждом открытии страницы
  try {
    const data = await _callAuthScript({ action: 'checkAccess', email: user.email })
    if (!data.access) {
      // Если доступ отозван — разлогиниваем
      localStorage.removeItem(_LS_EMAIL)
      localStorage.removeItem(_LS_PRICES)
      window.location.href = 'login.html'
      return null
    }
    localStorage.setItem(_LS_PRICES, String(!!data.can_see_prices))
  } catch (e) {
    // Нет связи — используем сохранённое значение
    console.warn('Не удалось проверить доступ:', e)
  }
  return getCurrentUser()
}

// --- ОБНОВИТЬ ШАПКУ ---
function updateHeaderAuth() {
  const email = localStorage.getItem(_LS_EMAIL)
  const loginArea = document.getElementById('header-auth')
  if (!loginArea) return
  if (email) {
    loginArea.innerHTML =
      '<span class="auth-email">' + email + '</span>' +
      '<button class="auth-logout-btn" onclick="logout()">Выйти</button>'
  } else {
    loginArea.innerHTML = '<a href="login.html" class="auth-login-link">Войти</a>'
  }
}

// --- ВИДИМОСТЬ ЦЕН (хелпер для products.js и cart.js) ---
function canUserSeePrices() {
  return localStorage.getItem(_LS_PRICES) === 'true'
}

function getUserEmail() {
  return localStorage.getItem(_LS_EMAIL) || ''
}
