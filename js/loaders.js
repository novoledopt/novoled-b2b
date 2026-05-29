;(function(){var _overlay=null
function createOverlay(text){if(_overlay)return _overlay
_overlay=document.createElement('div')
_overlay.id='novoled-loader-overlay'
_overlay.innerHTML='<div class="nlo-box">'+'<div class="nlo-headlight">'+'<svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" class="nlo-svg">'+'<path d="M8 58 C8 58 15 20 38 14 L95 10 C105 10 112 18 112 28 L112 52 C112 62 105 70 95 70 L38 66 C15 60 8 58 8 58 Z" fill="#0b0d13" stroke="#1c2133" stroke-width="1.5"/>'+'<path d="M18 54 C18 54 24 26 42 21 L90 18 C98 18 104 25 104 33 L104 48 C104 56 98 63 90 63 L42 60 C24 55 18 54 18 54 Z" fill="#0d1020" stroke="#232840" stroke-width="1"/>'+'<rect x="24" y="36" width="79" height="8" rx="4" fill="#4df29b" opacity="0.15" class="nlo-drl-bg"/>'+'<rect x="25" y="37.5" width="77" height="5" rx="2.5" fill="#4df29b" class="nlo-drl"/>'+'<line x1="35" y1="24" x2="33" y2="58" stroke="#1c2133" stroke-width="0.8" opacity="0.6"/>'+'<line x1="50" y1="20" x2="48" y2="60" stroke="#1c2133" stroke-width="0.8" opacity="0.6"/>'+'<line x1="65" y1="20" x2="63" y2="61" stroke="#1c2133" stroke-width="0.8" opacity="0.6"/>'+'<line x1="80" y1="19" x2="78" y2="62" stroke="#1c2133" stroke-width="0.8" opacity="0.6"/>'+'<polygon points="112,33 199,5 200,80 112,47" fill="url(#beam-grad)" class="nlo-beam"/>'+'<polygon points="17,33 -78,5 -78,88 11,47" fill="url(#beam-grad-opposite)" class="nlo-beam"/>'+'<circle cx="72" cy="40" r="8" fill="#0d1020" stroke="#232840" stroke-width="1"/>'+'<circle cx="72" cy="40" r="5" fill="#4df29b" opacity="0.7" class="nlo-lens-inner"/>'+'<circle cx="72" cy="40" r="2.5" fill="#fff" opacity="0.9"/>'+'<defs>'+'<linearGradient id="beam-grad" x1="0%" y1="50%" x2="100%" y2="50%">'+'<stop offset="0%"  stop-color="#4df29b" stop-opacity="0.18"/>'+'<stop offset="100%" stop-color="#4df29b" stop-opacity="0"/>'+'</linearGradient>'+'<linearGradient id="beam-grad-opposite" x1="100%" y1="50%" x2="0%" y2="50%">'+'<stop offset="0%"  stop-color="#4df29b" stop-opacity="0.18"/>'+'<stop offset="100%" stop-color="#4df29b" stop-opacity="0"/>'+'</linearGradient>'+'</defs>'+'</svg>'+'<div class="nlo-road"></div>'+'</div>'+'<p class="nlo-text" id="nlo-text"></p>'+'<div class="nlo-dots"><span></span><span></span><span></span></div>'+'</div>'
document.body.appendChild(_overlay)
return _overlay}
function showOverlay(text){function doShow(){var el=createOverlay()
var textEl=el.querySelector('.nlo-text')
if(textEl)textEl.textContent=text||'Загрузка…'
el.style.display='flex'
el.style.opacity='0'
el.style.transition=''
requestAnimationFrame(function(){requestAnimationFrame(function(){el.style.transition='opacity 0.25s'
el.style.opacity='1'})})}
if(document.body){doShow()}else{document.addEventListener('DOMContentLoaded',doShow,{once:true})}}
function hideOverlay(){if(!_overlay)return
_overlay.style.transition='opacity 0.3s'
_overlay.style.opacity='0'
setTimeout(function(){if(_overlay)_overlay.style.display='none'},300)}
function makeCategorySkeletonBlock(cardCount){var block=document.createElement('div')
block.className='skel-category-block'
var header=document.createElement('div')
header.className='skel-category-header'
header.innerHTML='<div class="skel-line skel-line--title"></div>'+'<div class="skel-chevron"></div>'
block.appendChild(header)
var grid=document.createElement('div')
grid.className='skel-products-grid'
for(var i=0;i<(cardCount||4);i++){var card=document.createElement('div')
card.className='skel-product-card'
card.innerHTML='<div class="skel-product-thumb"></div>'+'<div class="skel-product-body">'+'<div class="skel-line skel-line--badge"></div>'+'<div class="skel-line skel-line--name"></div>'+'<div class="skel-line skel-line--sku"></div>'+'<div class="skel-line skel-line--price"></div>'+'</div>'+'<div class="skel-product-footer"><div class="skel-btn"></div></div>'
grid.appendChild(card)}
block.appendChild(grid)
return block}
function showCatalogSkeleton(){showOverlay('Загружаем каталог…')
var treeContainer=document.getElementById('catalog-tree')
var loader=document.getElementById('products-loader')
if(loader)loader.style.display='none'
if(!treeContainer)return null
var existing=document.getElementById('catalog-skeleton')
if(existing)return existing
var wrap=document.createElement('div')
wrap.id='catalog-skeleton';[4,6,3].forEach(function(n){wrap.appendChild(makeCategorySkeletonBlock(n))})
treeContainer.parentNode.insertBefore(wrap,treeContainer)
return wrap}
function hideCatalogSkeleton(){hideOverlay()
var el=document.getElementById('catalog-skeleton')
if(el){el.style.opacity='0'
el.style.transition='opacity 0.2s'
setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el)},200)}
var loader=document.getElementById('products-loader')
if(loader)loader.style.display='none'}
function showCartSkeleton(){showOverlay('Загружаем корзину…')
var existing=document.getElementById('cart-skeleton')
if(existing)return existing
var cartSection=document.querySelector('.cart-section .container')
if(!cartSection)return null
var wrap=document.createElement('div')
wrap.id='cart-skeleton'
wrap.className='skel-cart-wrap'
for(var i=0;i<4;i++){var row=document.createElement('div')
row.className='skel-cart-row'
row.innerHTML='<div class="skel-cart-name">'+'<div class="skel-line skel-line--name" style="width:70%"></div>'+'<div class="skel-line skel-line--sku" style="width:40%"></div>'+'</div>'+'<div class="skel-line skel-line--badge" style="width:60px"></div>'+'<div class="skel-cart-qty">'+'<div class="skel-qty-btn"></div>'+'<div class="skel-line" style="width:28px;height:16px"></div>'+'<div class="skel-qty-btn"></div>'+'</div>'+'<div class="skel-line skel-line--price"></div>'+'<div class="skel-line skel-line--price"></div>'+'<div class="skel-icon-btn"></div>'
wrap.appendChild(row)}
var h1=cartSection.querySelector('h1')
var ref=h1?h1.nextSibling:cartSection.firstChild
cartSection.insertBefore(wrap,ref&&ref.nextSibling?ref.nextSibling:ref)
return wrap}
function hideCartSkeleton(){hideOverlay()
var el=document.getElementById('cart-skeleton')
if(el){el.style.opacity='0'
el.style.transition='opacity 0.18s'
setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el)},180)}}
function showHistorySkeleton(){var container=document.getElementById('order-history-section')
if(!container)return
container.innerHTML='<div class="skel-line skel-line--title" style="width:200px;margin-bottom:20px"></div>'+'<div class="skel-history-list">'+
[1,2].map(function(){return'<div class="skel-history-card">'+'<div style="display:flex;justify-content:space-between;margin-bottom:12px">'+'<div><div class="skel-line skel-line--sku" style="width:120px;margin-bottom:6px"></div>'+'<div class="skel-line skel-line--badge" style="width:90px"></div></div>'+'<div class="skel-line skel-line--price" style="width:70px"></div>'+'</div>'+'<div style="display:flex;gap:8px;margin-bottom:14px">'+'<div class="skel-line skel-line--badge" style="width:80px"></div>'+'<div class="skel-line skel-line--badge" style="width:100px"></div>'+'</div>'+'<div style="display:flex;gap:10px">'+'<div class="skel-btn" style="width:80px"></div>'+'<div class="skel-btn" style="width:140px;background:rgba(255,198,0,0.15)"></div>'+'</div>'+'</div>'}).join('')+'</div>'}
window.Novoled=window.Novoled||{}
window.Novoled.loaders={showCatalog:showCatalogSkeleton,hideCatalog:hideCatalogSkeleton,showCart:showCartSkeleton,hideCart:hideCartSkeleton,showHistory:showHistorySkeleton,}})()