;(function(){const body=document.body
const page=body.dataset.page
const yearEl=document.getElementById('year')
if(yearEl)yearEl.textContent=new Date().getFullYear()
window.Novoled=window.Novoled||{}
if(window.Novoled.initCartBadge)window.Novoled.initCartBadge();(async function(){if(typeof loadSession==='function'){await loadSession()}
if(typeof updateHeaderAuth==='function'){updateHeaderAuth()}
if(page==='catalog'&&window.Novoled.initCatalogPage){window.Novoled.initCatalogPage()}
if(page==='product'&&window.Novoled.initProductPage){window.Novoled.initProductPage()}
if(page==='cart'&&window.Novoled.initCartPage){window.Novoled.initCartPage()}})()
const heroBg=document.querySelector('.hero-bg')
if(heroBg){window.addEventListener('scroll',function(){heroBg.style.transform='translateY('+(window.scrollY*0.25)+'px) scale(1.1)'})}})()
document.addEventListener('DOMContentLoaded',function(){var scrollBtn=document.getElementById('scroll-top-btn')
if(!scrollBtn)return
window.addEventListener('scroll',function(){if(window.scrollY>300){scrollBtn.classList.add('visible')}else{scrollBtn.classList.remove('visible')}},{passive:true})
scrollBtn.addEventListener('click',function(){window.scrollTo({top:0,behavior:'smooth'})})})
function showToast(msg){var existing=document.getElementById('novoled-toast')
if(existing)existing.remove()
var toast=document.createElement('div')
toast.id='novoled-toast'
toast.className='toast'
toast.textContent=msg
document.body.appendChild(toast)
requestAnimationFrame(function(){requestAnimationFrame(function(){toast.classList.add('show')})})
setTimeout(function(){toast.classList.remove('show')
setTimeout(function(){toast.remove()},220)},2000)}
document.addEventListener('DOMContentLoaded',function(){if(window.Novoled&&window.Novoled.loaders){if(document.getElementById('catalog-tree')){window.Novoled.loaders.showCatalog()}}})
document.addEventListener('DOMContentLoaded',function(){var syncBtn=document.getElementById('sync-catalog-btn')
if(!syncBtn)return
syncBtn.addEventListener('click',async function(){const email=localStorage.getItem('novoled_user_email')
if(!email){if(typeof showToast==='function')showToast('Войдите в систему для обновления')
return}
syncBtn.disabled=true
var icon=syncBtn.querySelector('svg')
if(icon)icon.style.animation='spin-icon 0.8s linear infinite'
try{const result=await window.Novoled.api.syncFromSheet()
const count=Array.isArray(result)?result.length:(Number(result)||0)
if(typeof showToast==='function')showToast('✓ Каталог обновлён ('+count+' товаров)')
if(window.Novoled.initCatalogPage){document.getElementById('catalog-tree').innerHTML=''
await window.Novoled.initCatalogPage()}}catch(err){console.error('Sync error:',err)
if(typeof showToast==='function')showToast('Ошибка обновления: '+err.message)}finally{syncBtn.disabled=false
if(icon)icon.style.animation=''}})})
document.addEventListener('DOMContentLoaded',function(){if(window.Novoled&&window.Novoled.initCartPreview)window.Novoled.initCartPreview()})