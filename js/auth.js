const _AUTH_SCRIPT_URL='https://script.google.com/macros/s/AKfycbwgeGiv7qWar_NEnmESPkr-9tkEyHFBtkf4gH2qUoIgkUpAuMxGIQD5mF6yZp7RQJCU/exec'
const _LS_EMAIL='novoled_user_email'
const _LS_PRICES='novoled_can_see_prices'
async function _callAuthScript(params){const url=new URL(_AUTH_SCRIPT_URL)
Object.entries(params).forEach(function(kv){url.searchParams.set(kv[0],kv[1])})
const res=await fetch(url.toString())
if(!res.ok)throw new Error('Auth error: '+res.status)
return res.json()}
async function login(email){const em=(email||'').trim().toLowerCase()
if(!em)return{success:false,message:'Введите email'}
try{const data=await _callAuthScript({action:'checkAccess',email:em})
if(data.access){localStorage.setItem(_LS_EMAIL,em)
localStorage.setItem(_LS_PRICES,String(!!data.can_see_prices))
return{success:true,canSeePrices:!!data.can_see_prices}}else{return{success:false,message:'Email не найден. Запросите доступ у менеджера.'}}}catch(e){return{success:false,message:'Ошибка соединения. Попробуйте ещё раз.'}}}
function logout(){localStorage.removeItem(_LS_EMAIL)
localStorage.removeItem(_LS_PRICES)
window.location.href='login.html'}
function getCurrentUser(){const email=localStorage.getItem(_LS_EMAIL)
if(!email)return null
return{email:email,canSeePrices:localStorage.getItem(_LS_PRICES)==='true'}}
async function loadSession(){const user=getCurrentUser()
if(!user){localStorage.removeItem(_LS_PRICES)
return null}
try{const data=await _callAuthScript({action:'checkAccess',email:user.email})
if(!data.access){localStorage.removeItem(_LS_EMAIL)
localStorage.removeItem(_LS_PRICES)
window.location.href='login.html'
return null}
localStorage.setItem(_LS_PRICES,String(!!data.can_see_prices))}catch(e){console.warn('Не удалось проверить доступ:',e)}
return getCurrentUser()}
function updateHeaderAuth(){const email=localStorage.getItem(_LS_EMAIL)
const loginArea=document.getElementById('header-auth')
if(!loginArea)return
if(email){loginArea.innerHTML='<span class="auth-email">'+email+'</span>'+'<button class="auth-logout-btn" onclick="logout()">Выйти</button>'}else{loginArea.innerHTML='<a href="login.html" class="auth-login-link">Войти</a>'}}
function canUserSeePrices(){return localStorage.getItem(_LS_PRICES)==='true'}
function getUserEmail(){return localStorage.getItem(_LS_EMAIL)||''}