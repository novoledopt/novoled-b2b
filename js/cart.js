;(function(){const CART_KEY='novoled_b2b_cart_v1'
function getAppsScriptUrl(){return(window.Novoled&&window.Novoled._scriptUrl)?window.Novoled._scriptUrl:(typeof _AUTH_SCRIPT_URL!=='undefined'?_AUTH_SCRIPT_URL:'')}
function readCart(){try{const raw=localStorage.getItem(CART_KEY)
if(!raw)return[]
const parsed=JSON.parse(raw)
return Array.isArray(parsed)?parsed:[]}catch{return[]}}
function writeCart(items){const clean=items.map(function(i){return{id:String(i.id),name:i.name||'',socket:i.socket||'',unit:i.unit||'',qty:Number(i.qty)||1}})
localStorage.setItem(CART_KEY,JSON.stringify(clean))}
// ── Профиль клиента ───────────────────────────────────────────────
const _LS_PROFILE='novoled_client_profile_v1'
function saveLocalProfile(data){try{localStorage.setItem(_LS_PROFILE,JSON.stringify(data))}catch(e){}}
function loadLocalProfile(){try{const raw=localStorage.getItem(_LS_PROFILE);return raw?JSON.parse(raw):null}catch(e){return null}}

async function fetchClientProfile(email){
  if(!email)return null
  try{const url=getAppsScriptUrl()
  if(!url||url.includes('ВСТАВЬТЕ'))return null
  const res=await fetch(url+'?action=getClientProfile&email='+encodeURIComponent(email))
  const data=await res.json()
  if(data&&data.profile){saveLocalProfile(data.profile);return data.profile}
  }catch(e){console.warn('Не удалось загрузить профиль:',e)}
  return null
}

function getClientProfile(){return loadLocalProfile()}

function prefillOrderForm(){
  const email=(typeof getUserEmail==='function')?getUserEmail():''
  const profile=getClientProfile()
  const emailField=document.getElementById('field-email')
  const companyField=document.getElementById('field-company')
  const phoneField=document.getElementById('field-phone')
  const addressField=document.getElementById('field-address')
  const notice=document.getElementById('profile-autofill-notice')
  let filled=false
  if(emailField&&email){emailField.value=email;filled=true}
  if(profile){
    if(companyField&&profile.company){companyField.value=profile.company;filled=true}
    if(phoneField&&profile.phone){phoneField.value=profile.phone;filled=true}
    if(addressField&&profile.address){addressField.value=profile.address;filled=true}
  }
  if(filled&&notice)notice.style.display='block'
  // Подгружаем актуальный профиль из таблицы в фоне
  if(email){fetchClientProfile(email).then(function(fresh){
    if(!fresh)return
    if(companyField&&fresh.company)companyField.value=fresh.company
    if(phoneField&&fresh.phone)phoneField.value=fresh.phone
    if(addressField&&fresh.address)addressField.value=fresh.address
    if((fresh.company||fresh.phone||fresh.address)&&notice)notice.style.display='block'
  })}
}

var _priceCache=null
async function loadPriceCache(){if(_priceCache)return _priceCache
_priceCache={}
try{const canSee=(typeof canUserSeePrices==='function')?canUserSeePrices():false
if(!canSee)return _priceCache
const products=await window.Novoled.api.getAllProducts()
products.forEach(function(p){if(p.id&&p.price)_priceCache[String(p.id)]=Number(p.price)})}catch(err){console.warn('Не удалось загрузить цены:',err)}
return _priceCache}
function getPrice(id){if(!_priceCache)return null
return _priceCache[String(id)]||null}
async function fetchOrderHistory(email){if(!email)return[]
try{const url=getAppsScriptUrl()
if(!url||url.includes('ВСТАВЬТЕ'))return[]
const res=await fetch(url+'?action=getOrderHistory&email='+encodeURIComponent(email))
const data=await res.json()
return Array.isArray(data.orders)?data.orders:[]}catch(err){console.warn('Не удалось загрузить историю:',err)
return[]}}
function reorderFromHistory(order){order.items.forEach(function(item){if(!item.id)return
const existing=readCart().find(function(i){return i.id===item.id})
if(existing){updateQuantity(item.id,(existing.qty||0)+(item.qty||1))}else{addToCart({id:item.id,name:item.name,socket:item.socket,unit:item.unit,in_stock:true},item.qty||1)}})
updateCartBadge()
if(typeof showToast==='function')showToast('Товары из заказа добавлены в корзину')
const tableWrapper=document.getElementById('cart-table-wrapper')
if(tableWrapper)tableWrapper.scrollIntoView({behavior:'smooth'})
renderCartPage()}
function addToCart(product,quantity){if(product&&product.in_stock===false)return
const items=readCart()
const qty=Math.max(1,Number(quantity)||1)
const existing=items.find(function(i){return i.id===String(product.id)})
if(existing){existing.qty=(existing.qty||0)+qty}else{items.push({id:String(product.id),name:product.name||'',socket:product.socket||'',unit:product.unit||'',qty:qty})}
writeCart(items)
updateCartBadge()}
function updateQuantity(id,quantity){const items=readCart()
const item=items.find(function(i){return i.id===String(id)})
if(!item)return
item.qty=Math.max(1,Number(quantity)||1)
writeCart(items)
updateCartBadge()}
function removeFromCart(id){writeCart(readCart().filter(function(i){return i.id!==String(id)}))
updateCartBadge()}
function clearCart(){writeCart([])
updateCartBadge()}
function updateCartBadge(){const badge=document.getElementById('cart-count-badge')
if(!badge)return
const total=readCart().reduce(function(s,i){return s+(Number(i.qty)||0)},0)
badge.textContent=String(total)
badge.classList.remove('pop')
void badge.offsetWidth
badge.classList.add('pop')}
async function renderCartPage(){if(window.Novoled&&window.Novoled.loaders)window.Novoled.loaders.showCart()
const emptyEl=document.getElementById('cart-empty')
const tableWrapper=document.getElementById('cart-table-wrapper')
const itemsBody=document.getElementById('cart-items')
const itemsCountEl=document.getElementById('cart-items-count')
const totalEl=document.getElementById('cart-total')
if(!emptyEl||!tableWrapper||!itemsBody)return
await loadPriceCache()
if(window.Novoled&&window.Novoled.loaders)window.Novoled.loaders.hideCart()
const cartItems=readCart()
const canSee=(typeof canUserSeePrices==='function')?canUserSeePrices():false
if(!cartItems.length){emptyEl.hidden=false
tableWrapper.hidden=true
itemsBody.innerHTML=''
if(itemsCountEl)itemsCountEl.textContent='0'
if(totalEl)totalEl.textContent='0 ₽'
renderHistorySection()
return}
emptyEl.hidden=true
tableWrapper.hidden=false
var totalItems=0
var totalSum=0
cartItems.forEach(function(i){const qty=Number(i.qty)||0
const price=canSee?(getPrice(i.id)||0):0
totalItems+=qty
totalSum+=qty*price})
itemsBody.innerHTML=''
cartItems.forEach(function(item){const qty=Number(item.qty)||0
const price=canSee?(getPrice(item.id)||0):null
const priceStr=(price!==null&&price>0)?price.toFixed(2):'—'
const sumStr=(price!==null&&price>0)?(qty*price).toFixed(2):'—'
const tr=document.createElement('tr')
tr.innerHTML='<td>'+'<div class="cart-item-name">'+item.name+'</div>'+'<div class="cart-item-meta">Арт.: '+item.id+(item.socket?' · '+item.socket:'')+'</div>'+'</td>'+'<td>'+(item.socket||'')+'</td>'+'<td>'+'<div class="qty-stepper">'+'<button type="button" class="qty-btn" data-qty-minus="'+item.id+'" aria-label="Минус"><span class="qty-icon">&#8722;</span></button>'+'<div class="qty-value">'+qty+'</div>'+'<button type="button" class="qty-btn" data-qty-plus="'+item.id+'" aria-label="Плюс"><span class="qty-icon">+</span></button>'+'</div>'+'</td>'+'<td>'+priceStr+'</td>'+'<td>'+sumStr+'</td>'+'<td>'+'<button class="icon-btn icon-btn-danger" type="button" data-remove="'+item.id+'" aria-label="Удалить">'+'<svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" stroke-width="0.5" style="pointer-events:none">'+'<path fill="#ffd6d6" d="m14 2 2 1 1 2h3a1 1 0 1 1 0 2l-1 12q0 3-3 3H8q-3 0-3-3L4 7a1 1 0 0 1 0-2h3l1-2 2-1zm4 5H6l1 12 1 1h8l1-1zm-8 3v5a1 1 0 0 1-2 0v-5zm4 0 1 1v5a1 1 0 1 1-2 0v-5zm0-6h-4L9 5h6z"/>'+'</svg>'+'</button>'+'</td>'
itemsBody.appendChild(tr)})
if(itemsCountEl)itemsCountEl.textContent=String(totalItems)
if(totalEl)totalEl.textContent=(canSee&&totalSum>0)?totalSum.toFixed(2)+' ₽':'—'
const freshBody=itemsBody.cloneNode(true)
itemsBody.parentNode.replaceChild(freshBody,itemsBody)
freshBody.addEventListener('click',async function(e){const plus=e.target.closest('[data-qty-plus]')
if(plus){const id=plus.getAttribute('data-qty-plus')
const found=readCart().find(function(i){return i.id===id})
if(found)updateQuantity(id,(Number(found.qty)||0)+1)
await renderCartPage();return}
const minus=e.target.closest('[data-qty-minus]')
if(minus){const id=minus.getAttribute('data-qty-minus')
const found=readCart().find(function(i){return i.id===id})
if(found){if((Number(found.qty)||1)<=1)removeFromCart(id)
else updateQuantity(id,Number(found.qty)-1)}
await renderCartPage();return}
const removeBtn=e.target.closest('[data-remove]')
if(removeBtn){removeFromCart(removeBtn.getAttribute('data-remove'));await renderCartPage()}})
renderHistorySection()}
async function renderHistorySection(){const container=document.getElementById('order-history-section')
if(!container)return
const email=(typeof getUserEmail==='function')?getUserEmail():''
const canSee=(typeof canUserSeePrices==='function')?canUserSeePrices():false
if(window.Novoled&&window.Novoled.loaders)window.Novoled.loaders.showHistory()
const history=await fetchOrderHistory(email)
if(!history.length){container.innerHTML='<h2 class="history-title">История заказов</h2>'+'<p class="muted" style="margin-top:12px">Здесь появятся ваши отправленные заказы.</p>'
return}
let html='<h2 class="history-title">История заказов <span class="history-badge">'+history.length+'</span></h2>'+'<div class="history-list">'
history.forEach(function(order){const totalStr=(canSee&&order.total!=null&&order.total>0)?Number(order.total).toFixed(2)+' ₽':(order.items.length+' позиц.')
const itemsPreview=order.items.slice(0,3).map(function(i){return'<span class="history-item-chip">'+i.name+(i.qty>1?' ×'+i.qty:'')+'</span>'}).join('')+(order.items.length>3?'<span class="history-item-chip muted">+'+(order.items.length-3)+' ещё</span>':'')
const statusClass=order.status==='Выполнен'?'status-done':order.status==='Отменён'?'status-cancelled':'status-new'
var tooltipItems=order.items.map(function(it){var priceStr=(canSee&&it.price)?' · '+(it.qty*it.price).toFixed(0)+' ₽':''
return'<div class="history-tooltip-item">'+'<span class="history-tooltip-item-name">'+it.name+'</span>'+'<span class="history-tooltip-item-qty">×'+it.qty+priceStr+'</span>'+'</div>'}).join('')
var tooltipTotal=(canSee&&order.total!=null&&order.total>0)?'<div class="history-tooltip-total"><span class="history-tooltip-total-label">Итого</span><span class="history-tooltip-total-value">'+Number(order.total).toFixed(2)+' ₽</span></div>':''
html+='<div class="history-card">'+'<div class="history-card-head">'+'<div class="history-meta">'+'<span class="history-date">'+(order.date||'')+'</span>'+
(order.company?'<span class="history-company">'+order.company+'</span>':'')+'</div>'+'<div style="display:flex;align-items:center;gap:10px">'+'<span class="history-status '+statusClass+'">'+(order.status||'Новый')+'</span>'+'<span class="history-total">'+totalStr+'</span>'+'</div>'+'</div>'+'<div class="history-items-preview">'+itemsPreview+'</div>'+'<div class="history-card-actions">'+'<div class="history-details-wrap">'+'<button type="button" class="btn-history-details" tabindex="0">Детали</button>'+'<div class="history-tooltip">'+'<div class="history-tooltip-title">Позиции заказа</div>'+
tooltipItems+
tooltipTotal+'</div>'+'</div>'+'<button type="button" class="btn-history-reorder" data-order-id="'+order.id+'">↺ Повторить заказ</button>'+'</div>'+'</div>'})
html+='</div>'
container.innerHTML=html
container.addEventListener('click',function(e){const reorderBtn=e.target.closest('.btn-history-reorder')
if(reorderBtn){const id=reorderBtn.getAttribute('data-order-id')
const order=history.find(function(o){return String(o.id)===String(id)})
if(order)reorderFromHistory(order)}})}
function initCartPage(){renderCartPage()
prefillOrderForm()
const form=document.getElementById('request-form')
const resultEl=document.getElementById('request-result')
if(!form||!resultEl)return;(function(){var topBtn=document.createElement('button')
topBtn.className='scroll-top-btn-cart'
topBtn.setAttribute('aria-label','Наверх')
topBtn.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>'
document.body.appendChild(topBtn)
topBtn.addEventListener('click',function(){window.scrollTo({top:0,behavior:'smooth'})})
window.addEventListener('scroll',function(){if(window.scrollY>300)topBtn.classList.add('visible')
else topBtn.classList.remove('visible')},{passive:true})})()
form.addEventListener('submit',async function(e){e.preventDefault()
const formData=new FormData(form)
const cartItems=readCart()
const canSee=(typeof canUserSeePrices==='function')?canUserSeePrices():false
if(!cartItems.length){resultEl.textContent='Добавьте хотя бы один товар в корзину.'
return}
await loadPriceCache()
var totalSum=0
var totalItems=0
cartItems.forEach(function(i){const qty=Number(i.qty)||0
const price=canSee?(getPrice(i.id)||0):0
totalSum+=qty*price
totalItems+=qty})
const orderData={company:formData.get('company')||'',phone:formData.get('phone')||'',email:formData.get('email')||'',address:formData.get('address')||'',comment:formData.get('comment')||'',}
// Сохраняем профиль локально для автозаполнения следующего заказа
saveLocalProfile({company:orderData.company,phone:orderData.phone,address:orderData.address})
const orderId=String(Date.now())
const orderDate=new Date().toLocaleString('ru-RU',{timeZone:'Europe/Moscow'})
const orderItems=cartItems.map(function(i){return{id:i.id,name:i.name,socket:i.socket||'',unit:i.unit||'',qty:Number(i.qty)||0,price:canSee?(getPrice(i.id)||null):null,}})
const orderPayload={order_id:orderId,date:orderDate,email:orderData.email||(typeof getUserEmail==='function'?getUserEmail():''),company:orderData.company||'',phone:orderData.phone||'',address:orderData.address||'',comment:orderData.comment||'',items:orderItems,}
const scriptUrl=getAppsScriptUrl()
const submitBtn=form.querySelector('[type="submit"]')
if(submitBtn)submitBtn.disabled=true
resultEl.textContent='Отправляем заказ...'
resultEl.style.color='var(--text-muted)'
try{if(!scriptUrl||scriptUrl.includes('ВСТАВЬТЕ')){throw new Error('URL Apps Script не настроен в js/auth.js')}
await fetch(scriptUrl,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/json'},body:JSON.stringify(orderPayload),})
resultEl.textContent='✓ Заказ отправлен! Мы свяжемся с вами для подтверждения.'
resultEl.style.color='var(--accent)'
form.reset()
clearCart()
await renderCartPage()}catch(err){console.error('Ошибка отправки:',err)
resultEl.textContent='Ошибка отправки. Пожалуйста, свяжитесь с нами напрямую.'
resultEl.style.color='var(--danger)'}finally{if(submitBtn)submitBtn.disabled=false}})}
// ── Превью-корзина в шапке ────────────────────────────────────────
function renderCartPreview(){
  const wrap=document.getElementById('cart-preview-wrap')
  const dropdown=document.getElementById('cart-preview-dropdown')
  const itemsEl=document.getElementById('cart-preview-items')
  const totalEl=document.getElementById('cart-preview-total-val')
  if(!wrap||!dropdown||!itemsEl)return
  const items=readCart()
  if(!items.length){dropdown.hidden=true;return}
  const canSee=(typeof canUserSeePrices==='function')?canUserSeePrices():false
  const preview=items.slice(0,5)
  let totalSum=0
  let allPriced=true
  itemsEl.innerHTML=preview.map(function(item){
    const price=canSee?getPrice(item.id):null
    const qty=Number(item.qty)||1
    if(price){totalSum+=price*qty}else{allPriced=false}
    const priceStr=price?(price.toFixed(0)+' ₽ × '+qty):'× '+qty
    return'<div class="cart-preview-item">'+
      '<div class="cart-preview-item-name">'+item.name+'</div>'+
      '<div class="cart-preview-item-qty">'+priceStr+'</div>'+
      '</div>'
  }).join('')+(items.length>5?'<div class="cart-preview-more">+ещё '+(items.length-5)+' позиций</div>':'')
  if(totalEl)totalEl.textContent=(canSee&&allPriced&&totalSum>0)?totalSum.toFixed(0)+' ₽':'—'
}

function initCartPreview(){
  const wrap=document.getElementById('cart-preview-wrap')
  const trigger=document.getElementById('cart-preview-trigger')
  const dropdown=document.getElementById('cart-preview-dropdown')
  if(!wrap||!trigger||!dropdown)return
  let hideTimer=null
  function showPreview(){
    if(!readCart().length)return
    clearTimeout(hideTimer)
    renderCartPreview()
    dropdown.hidden=false
  }
  function scheduleHide(){hideTimer=setTimeout(function(){dropdown.hidden=true},200)}
  // Десктоп: hover
  wrap.addEventListener('mouseenter',showPreview)
  wrap.addEventListener('mouseleave',scheduleHide)
  dropdown.addEventListener('mouseenter',function(){clearTimeout(hideTimer)})
  dropdown.addEventListener('mouseleave',scheduleHide)
  // Мобайл: tap на бейдж
  trigger.addEventListener('click',function(e){
    if(window.innerWidth>768)return// на десктопе ссылка работает как обычно
    if(dropdown.hidden&&readCart().length){e.preventDefault();showPreview()}else{dropdown.hidden=true}
  })
  document.addEventListener('click',function(e){if(!wrap.contains(e.target))dropdown.hidden=true})
}

window.Novoled=window.Novoled||{}
window.Novoled.addToCart=addToCart
window.Novoled.readCart=readCart
window.Novoled.initCartBadge=updateCartBadge
window.Novoled.initCartPage=initCartPage
window.Novoled.initCartPreview=initCartPreview
window.Novoled.renderCartPreview=renderCartPreview})()