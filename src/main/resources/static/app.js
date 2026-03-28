/* ═══════════════════════ CONFIG ═══════════════════════ */
// const BASE = 'http://localhost:8080';

const BASE = window.location.hostname === 'localhost'
    ? 'http://localhost:8080'
    : 'https://smart-grocery-finder-production.up.railway.app';

/* ═══════════════════════ STATE ═══════════════════════ */
let allItems  = [];
let allShops  = [];
let bucket    = [];       // string[] — item names
let hlShopId  = null;     // highlighted/selected shop id
let visitPath = [];       // ordered array of {id,name,x,y} for the path to draw

/* ═══════════════════════ NAV ═══════════════════════ */
function nav(name) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
  document.querySelector(`[data-panel="${name}"]`).classList.add('active');
  if (name === 'map') {
    if (allShops.length > 0) { renderMap(); }
    else { loadShopsOnMap(); }
  }
  if (name === 'items')     loadItems();
  if (name === 'shops')     { loadShops(); }
  if (name === 'bucket')    loadItemsForBucket();
  if (name === 'recommend') refreshRecPreview();
}

/* Switch to map tab without wiping state — used by "View on Map" buttons */
function goToMap(){
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('panel-map').classList.add('active');
  document.querySelector('[data-panel="map"]').classList.add('active');
  renderMap();
}

/* ═══════════════════════ TOAST ═══════════════════════ */
const TM = {
  success:{ svg:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>', title:'Success' },
  error:  { svg:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>', title:'Error' },
  info:   { svg:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>', title:'Info' },
  warn:   { svg:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>', title:'Warning' },
};
function toast(msg, type='info', ms=4000) {
  const m = TM[type]||TM.info;
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<div class="t-ico">${m.svg}</div><div><div class="t-title">${m.title}</div><div class="t-msg">${msg}</div></div>`;
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => { el.style.transition='opacity .3s,transform .3s'; el.style.opacity='0'; el.style.transform='translateX(8px)'; setTimeout(()=>el.remove(),320); }, ms);
}

/* ═══════════════════════ API ═══════════════════════ */
async function api(path, opts={}) {
  const res = await fetch(BASE+path, { headers:{'Content-Type':'application/json'}, ...opts });
  if (res.status===204) return null;
  let data; try { data=await res.json(); } catch { data=null; }
  if (!res.ok) throw new Error(data?.message||data?.error||`HTTP ${res.status}`);
  return data;
}

/* ═══════════════════════ BADGES ═══════════════════════ */
function setBadge(id, n) {
  const el = document.getElementById('badge-'+id);
  if (!el) return;
  if (n>0){el.textContent=n;el.classList.add('show');}else el.classList.remove('show');
}

/* ═══════════════════════ ITEMS ═══════════════════════ */
async function loadItems() {
  const ld = document.getElementById('items-loading');
  ld.classList.add('show');
  try { allItems=await api('/items')||[]; renderItemsTable(); setBadge('items',allItems.length); refreshAssignDropdowns(); }
  catch(e){ toast('Could not load items: '+e.message,'error'); }
  finally { ld.classList.remove('show'); }
}
function renderItemsTable() {
  const tb = document.getElementById('items-tbody');
  if (!allItems.length){ tb.innerHTML='<tr class="empty-row"><td colspan="4">No items yet.</td></tr>'; return; }
  tb.innerHTML = allItems.map(it=>`
    <tr>
      <td><span class="id-cell">${it.id}</span></td>
      <td style="font-weight:600">${it.name}</td>
      <td>${bucket.includes(it.name)?'<span class="tag tag-green">In bucket</span>':'<span class="tag tag-gray">—</span>'}</td>
      <td><button class="btn btn-danger btn-sm" onclick="deleteItem(${it.id},'${it.name}')">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        Delete
      </button></td>
    </tr>`).join('');
}
async function createItem() {
  const inp=document.getElementById('item-name'), name=inp.value.trim();
  if (!name){ toast('Item name is required','warn'); inp.focus(); return; }
  try { await api('/items',{method:'POST',body:JSON.stringify({name})}); toast(`"${name}" added`,'success'); inp.value=''; inp.focus(); await loadItems(); }
  catch(e){ toast('Failed: '+e.message,'error'); }
}
async function deleteItem(id,name) {
  if (!confirm(`Delete "${name}"?`)) return;
  try { await api(`/items/${id}`,{method:'DELETE'}); toast(`"${name}" deleted`,'success'); bucket=bucket.filter(b=>b!==name); updateBucketBadge(); await loadItems(); }
  catch(e){ toast('Delete failed: '+e.message,'error'); }
}

/* ═══════════════════════ SHOPS ═══════════════════════ */
async function loadShops() {
  const ld=document.getElementById('shops-loading'); ld.classList.add('show');
  try { allShops=await api('/shops')||[]; renderShopsTable(); setBadge('shops',allShops.length); refreshAssignDropdowns(); }
  catch(e){ toast('Could not load shops: '+e.message,'error'); }
  finally { ld.classList.remove('show'); }
}

async function deleteShop(id, name) {
  if (!confirm(`Delete "${name}"?`)) return;
  try {
    await api(`/shops/${id}`, {method:'DELETE'});
    toast(`"${name}" deleted`, 'success');
    await loadShops();
    renderMap();
  }
  catch(e){ toast('Delete failed: '+e.message, 'error'); }
}

function renderShopsTable() {
  const tb=document.getElementById('shops-tbody');
  if (!allShops.length){ tb.innerHTML='<tr class="empty-row"><td colspan="5">No shops yet.</td></tr>'; return; }
  tb.innerHTML=allShops.map(s=>`
    <tr>
      <td><span class="id-cell">${s.id}</span></td>
      <td style="font-weight:600">${s.name}</td>
      <td><span class="coord-cell">${s.xCoordinate}</span></td>
      <td><span class="coord-cell">${s.yCoordinate}</span></td>
      <td style="display:flex;gap:6px">
        <button class="btn btn-outline btn-sm" onclick="pinShop(${s.id})">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
          Map
        </button>
        <button class="btn btn-danger btn-sm" onclick="deleteShop(${s.id},'${s.name}')">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          Delete
        </button>
      </td>
    </tr>`).join('');
}
async function createShop() {
  const name=document.getElementById('shop-name').value.trim();
  const x=parseFloat(document.getElementById('shop-x').value);
  const y=parseFloat(document.getElementById('shop-y').value);
  if (!name){ toast('Shop name is required','warn'); return; }
  if (isNaN(x)||isNaN(y)){ toast('X and Y coordinates required','warn'); return; }
  try {
    await api('/shops',{method:'POST',body:JSON.stringify({name,xCoordinate:x,yCoordinate:y})});
    toast(`Shop "${name}" created at (${x},${y})`,'success');
    ['shop-name','shop-x','shop-y'].forEach(id=>document.getElementById(id).value='');
    await loadShops(); renderMap();
  } catch(e){ toast('Failed: '+e.message,'error'); }
}
async function assignItem() {
  const shopSel = document.getElementById('assign-shop-sel');
  const itemSel = document.getElementById('assign-item-sel');
  const shopId  = shopSel?.value;
  const itemId  = itemSel?.value;
  const shopName = shopSel?.options[shopSel.selectedIndex]?.text || '';
  const itemName = itemSel?.options[itemSel.selectedIndex]?.text || '';
  if (!shopId || !itemId){ toast('Select both a shop and an item','warn'); return; }
  try {
    await api(`/shops/${shopId}/items/${itemId}`,{method:'POST'});
    toast(`"${itemName}" assigned to "${shopName}"`, 'success');
    shopSel.value = '';
    itemSel.value = '';
  } catch(e){ toast('Assignment failed: '+e.message,'error'); }
}

function refreshAssignDropdowns(){
  const shopSel = document.getElementById('assign-shop-sel');
  const itemSel = document.getElementById('assign-item-sel');
  if(!shopSel || !itemSel) return;
  const prevShop = shopSel.value, prevItem = itemSel.value;
  shopSel.innerHTML = '<option value="">— select shop —</option>' +
    allShops.map(s=>`<option value="${s.id}">${s.name}</option>`).join('');
  itemSel.innerHTML = '<option value="">— select item —</option>' +
    allItems.map(i=>`<option value="${i.id}">${i.name}</option>`).join('');
  if(prevShop) shopSel.value = prevShop;
  if(prevItem) itemSel.value = prevItem;
}
function pinShop(id) { hlShopId=id; nav('map'); setTimeout(renderMap,80); }

/* ═══════════════════════ BUCKET ═══════════════════════ */
async function loadItemsForBucket() {
  const ld=document.getElementById('bucket-loading'); ld.classList.add('show');
  try { allItems=await api('/items')||[]; renderChips(); }
  catch(e){ toast('Could not load: '+e.message,'error'); }
  finally { ld.classList.remove('show'); }
}
function renderChips() {
  const c=document.getElementById('items-chips');
  if (!allItems.length){ c.innerHTML='<div class="bkt-empty">No items in system yet.</div>'; return; }
  c.innerHTML=`<div class="chips-grid">${allItems.map(it=>`
    <div class="chip ${bucket.includes(it.name)?'selected':''}" onclick="toggleBucket('${it.name}')">
      <span>${it.name}</span>
      <span>${bucket.includes(it.name)
        ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
        : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'
      }</span>
    </div>`).join('')}</div>`;
  renderBucketSelected();
}
function toggleBucket(name){ bucket.includes(name)?bucket=bucket.filter(b=>b!==name):bucket.push(name); renderChips(); updateBucketBadge(); }
function renderBucketSelected(){
  const el=document.getElementById('bucket-selected');
  document.getElementById('bucket-count').textContent=bucket.length;
  if (!bucket.length){ el.innerHTML='<div class="bkt-empty">No items selected yet</div>'; return; }
  el.innerHTML=`<div class="chips-grid">${bucket.map(n=>`
    <div class="chip selected" onclick="toggleBucket('${n}')">
      <span>${n}</span>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
    </div>`).join('')}</div>`;
}
function clearBucket(){ bucket=[]; renderChips(); updateBucketBadge(); }
function updateBucketBadge(){ setBadge('bucket',bucket.length); document.getElementById('bucket-count').textContent=bucket.length; }

/* ═══════════════════════ RECOMMEND ═══════════════════════ */
function refreshRecPreview(){
  const el=document.getElementById('rec-bucket-preview');
  if (!bucket.length){ el.innerHTML='<span style="color:var(--t300)">Go to the Bucket List tab and select items first.</span>'; return; }
  el.innerHTML=bucket.map(n=>`<span class="tag tag-green" style="margin:2px">${n}</span>`).join('');
}
function pick(obj,...keys){ for(const k of keys)if(obj!=null&&obj[k]!=null)return obj[k]; return null; }

function getCoords(){
  const xv = document.getElementById('rec-x')?.value.trim();
  const yv = document.getElementById('rec-y')?.value.trim();
  if(!xv || !yv) return null;
  const x = parseFloat(xv), y = parseFloat(yv);
  if(isNaN(x) || isNaN(y)) return null;
  return { userX: x, userY: y };
}

function hasUserPosition(){ return getCoords() !== null; }

function syncCoords(){} // no-op — kept so old call sites don't break

function setAllCoords(x, y){
  const rx = document.getElementById('rec-x'); if(rx) rx.value = x;
  const ry = document.getElementById('rec-y'); if(ry) ry.value = y;
  renderMap();
}

async function runBasicRecommend(){
  if(!bucket.length){ toast('Select items in the Bucket List first','warn'); return; }
  if(!hasUserPosition()){
    showRecError('Please enter your X and Y coordinates before finding a shop.');
    return;
  }
  const {userX,userY} = getCoords();
  const ld = document.getElementById('rec-loading'); ld.classList.add('show');
  document.getElementById('rec-output').innerHTML = '';
  try {
    if(!allShops.length){ allShops = await api('/shops') || []; }

    const r = await api('/recommend', {method:'POST', body:JSON.stringify({userX,userY,items:bucket})});
    if(!r){ showRecError('No result returned from API'); return; }

    const shopName = pick(r,'shopName','name') || '';
    const shopId   = pick(r,'shopId','id');
    const matched  =
      allShops.find(s => s.name.toLowerCase() === shopName.toLowerCase()) ||
      allShops.find(s => s.id === shopId);

    const rx = matched ? matched.xCoordinate : (pick(r,'shopX','xCoordinate','xCoordinate') ?? null);
    const ry = matched ? matched.yCoordinate : (pick(r,'shopY','yCoordinate','yCoordinate') ?? null);

    if(rx === null || ry === null){
      toast('Shop coordinates not found — check shop is saved in /shops', 'warn');
    }

    visitPath = [{
      id:          matched?.id ?? shopId,
      name:        matched?.name || shopName || 'Shop',
      xCoordinate: rx !== null ? Number(rx) : 0,
      yCoordinate: ry !== null ? Number(ry) : 0,
      distance:    r.distance,
      items:       r.itemsFound || r.items || []
    }];
    hlShopId = visitPath[0].id;

    renderBasicResult(visitPath[0], userX, userY, r);
    renderMap();
    toast('Best shop found! See map for route.', 'success');
  } catch(e){ toast('Recommendation failed: '+e.message,'error'); showRecError(e.message); }
  finally { ld.classList.remove('show'); }
}

async function runAdvancedRecommend(){
  if(!bucket.length){ toast('Select items in the Bucket List first','warn'); return; }
  if(!hasUserPosition()){
    showRecError('Please enter your X and Y coordinates before finding a shop.');
    return;
  }
  const {userX,userY} = getCoords();
  const ld = document.getElementById('rec-loading'); ld.classList.add('show');
  document.getElementById('rec-output').innerHTML = '';
  try {
    if(!allShops.length){ allShops = await api('/shops') || []; }

    const results = await api('/recommend/advanced', {method:'POST', body:JSON.stringify({userX,userY,items:bucket})});
    if(!results?.length){ showRecError('No results returned from API'); return; }

    visitPath = results.map(r => {
      const shopName = pick(r,'shopName','name') || '';
      const shopId   = pick(r,'shopId','id');
      const matched  =
        allShops.find(s => s.name.toLowerCase() === shopName.toLowerCase()) ||
        allShops.find(s => s.id === shopId);
      const rx = matched ? matched.xCoordinate : (pick(r,'shopX','xCoordinate','xCoordinate') ?? 0);
      const ry = matched ? matched.yCoordinate : (pick(r,'shopY','yCoordinate','yCoordinate') ?? 0);
      return {
        id:          matched?.id ?? shopId,
        name:        matched?.name || shopName || 'Shop',
        xCoordinate: Number(rx),
        yCoordinate: Number(ry),
        distance:    r.distance,
        items:       r.itemsFound || r.items || []
      };
    });
    hlShopId = visitPath[0]?.id || null;

    renderAdvancedResults(visitPath, userX, userY, results);
    renderMap();
    toast('Advanced route ready! See map for path.', 'success');
  } catch(e){ toast('Failed: '+e.message,'error'); showRecError(e.message); }
  finally { ld.classList.remove('show'); }
}

function renderBasicResult(resolvedShop, userX, userY, rawResponse){
  const r = rawResponse || {};
  const shopName = resolvedShop.name || '—';
  const cx       = resolvedShop.xCoordinate;
  const cy       = resolvedShop.yCoordinate;
  const coordStr = (cx !== 0 || cy !== 0) ? `(${cx}, ${cy})` : '(resolving…)';
  const distVal  = resolvedShop.distance != null ? parseFloat(resolvedShop.distance).toFixed(3) : '—';
  const found    = resolvedShop.items || r.itemsFound || r.items || [];
  const missing  = r.itemsNotFound || r.missingItems || [];
  const pathHtml = buildPathStepsHtml([resolvedShop], userX, userY);

  document.getElementById('rec-output').innerHTML=`
    <div class="rec-card">
      <div class="rec-eyebrow">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        Best Match Found
      </div>
      <div class="rec-name">${shopName}</div>
      <div class="rec-meta">
        <div class="rec-meta-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          ${coordStr}
        </div>
        <div class="rec-meta-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2l10 10-10 10"/></svg>
          Distance: ${distVal}
        </div>
      </div>
      ${found.length?`<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--t400);margin-bottom:5px">Items Covered</div>
      <div class="rec-tags">${found.map(i=>`<span class="tag tag-green"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>${i}</span>`).join('')}</div>`:''}
      ${missing.length?`<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--t400);margin:10px 0 5px">Not Available</div>
      <div class="rec-tags">${missing.map(i=>`<span class="tag tag-orange">${i}</span>`).join('')}</div>`:''}
    </div>
    <div class="card" style="margin-top:16px">
      <div class="card-hdr"><div class="card-title">
        <div class="card-ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--g400)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 0 0 1 1h3m10-11l2 2m-2-2v10a1 1 0 0 1-1 1h-3m-6 0a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1m-6 0h6"/></svg></div>
        Visit Path
      </div></div>
      ${pathHtml}
    </div>
    <div class="btn-row">
      <button class="btn btn-outline" onclick="goToMap()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
        View on Map
      </button>
    </div>`;
}

function renderAdvancedResults(resolvedStops, userX, userY, rawResults){
  if(!resolvedStops?.length){ showRecError('No results returned'); return; }

  const cards = resolvedStops.map((shop, i) => {
    const coordStr = `(${shop.xCoordinate}, ${shop.yCoordinate})`;
    const distVal  = shop.distance != null ? parseFloat(shop.distance).toFixed(3) : '—';
    const found    = shop.items || [];
    const raw      = rawResults?.[i] || {};
    const miss     = raw.itemsNotFound || raw.missingItems || [];
    const rankEmoji = ['🥇','🥈','🥉'][i] || `#${i+1}`;
    return `<div class="adv-card ${i===0?'rank-1':''}">
      <div class="adv-rnk">${rankEmoji}</div>
      <div class="adv-info">
        <div class="adv-name">${shop.name}</div>
        <div class="adv-det">${coordStr} · d=${distVal}</div>
        <div class="adv-tags">
          ${found.map(n=>`<span class="tag tag-green">${n}</span>`).join('')}
          ${miss.map(n=>`<span class="tag tag-orange">${n}</span>`).join('')}
        </div>
      </div>
    </div>`;
  }).join('');

  document.getElementById('rec-output').innerHTML=`
    <div style="font-size:12px;color:var(--t400);margin-bottom:10px;font-weight:600">${resolvedStops.length} route(s) — sorted by optimality</div>
    <div class="adv-results">${cards}</div>
    <div class="card" style="margin-top:16px">
      <div class="card-hdr"><div class="card-title">
        <div class="card-ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--g400)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 0 0 1 1h3m10-11l2 2m-2-2v10a1 1 0 0 1-1 1h-3m-6 0a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1m-6 0h6"/></svg></div>
        Suggested Visit Path
      </div></div>
      ${buildPathStepsHtml(resolvedStops, userX, userY)}
    </div>
    <div class="btn-row">
      <button class="btn btn-outline" onclick="goToMap()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
        View on Map
      </button>
    </div>`;
}

function buildPathStepsHtml(stops, userX, userY){
  const all = [
    {type:'start', name:'Your Location', x:userX, y:userY},
    ...stops.map((s,i)=>({type:'shop', ...s, x:s.xCoordinate, y:s.yCoordinate, index:i}))
  ];
  return `<div class="path-steps">${all.map((step,i)=>{
    const isLast = i===all.length-1;
    const isStart = step.type==='start';
    const nodeColor = isStart ? '#3b82f6' : (step.index===0?'#2da653':'#64748b');
    const nodeBg = isStart ? '#eff6ff' : (step.index===0?'#f0faf3':'#f8fafc');
    const nodeBorder = isStart ? '#bfdbfe' : (step.index===0?'var(--g200)':'#e2e8f0');
    let distLabel='';
    if (!isStart&&step.distance!=null) distLabel=`<div class="step-dist">Distance from previous: ${parseFloat(step.distance).toFixed(3)}</div>`;
    const icon = isStart
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${nodeColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${nodeColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
    return `<div class="path-step">
      <div class="step-line">
        <div class="step-node" style="background:${nodeBg};border:1.5px solid ${nodeBorder}">${icon}</div>
        ${!isLast?`<div class="step-connector"></div>`:''}
      </div>
      <div class="step-content">
        <div class="step-label">${isStart?'Start: ':step.index===0?'#1 · ':'#'+(step.index+1)+' · '}${step.name}</div>
        <div class="step-detail">(${step.x}, ${step.y})</div>
        ${distLabel}
        ${step.items?.length?`<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:5px">${step.items.map(it=>`<span class="tag tag-green" style="font-size:11px">${it}</span>`).join('')}</div>`:''}
      </div>
    </div>`;
  }).join('')}</div>`;
}

function showRecError(msg){
  document.getElementById('rec-output').innerHTML=`
    <div class="err-card">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      <div><strong>Error:</strong> ${msg}</div>
    </div>`;
}

/* ═══════════════════════════════════════════════════
   MAP
═══════════════════════════════════════════════════ */
const SVG_W=620, SVG_H=480;
const MAP_PAD=52;

function dist(ax,ay,bx,by){ return Math.sqrt((bx-ax)**2+(by-ay)**2); }

function nearestNeighbourPath(ux, uy, shops){
  if (!shops.length) return [];
  let remaining=[...shops];
  const order=[];
  let cx=ux, cy=uy;
  while(remaining.length){
    let best=null, bestD=Infinity;
    remaining.forEach(s=>{
      const d=dist(cx,cy,s.xCoordinate,s.yCoordinate);
      if(d<bestD){bestD=d;best=s;}
    });
    order.push({...best, distFromPrev:bestD});
    cx=best.xCoordinate; cy=best.yCoordinate;
    remaining=remaining.filter(s=>s.id!==best.id);
  }
  return order;
}

function getBounds(ux,uy){
  const pts=[{x:ux,y:uy},...allShops.map(s=>({x:s.xCoordinate,y:s.yCoordinate}))];
  if(pts.length===1) return {minX:Math.max(0,ux-5),minY:Math.max(0,uy-5),maxX:ux+5,maxY:uy+5};
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  pts.forEach(p=>{minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y);});
  const rx=Math.max(maxX-minX,1), ry=Math.max(maxY-minY,1);
  return { minX:minX-rx*.22, minY:minY-ry*.22, maxX:maxX+rx*.22, maxY:maxY+ry*.22 };
}

function toSVG(x,y,b){
  const dw=SVG_W-MAP_PAD*2, dh=SVG_H-MAP_PAD*2;
  const rx=b.maxX-b.minX||1, ry=b.maxY-b.minY||1;
  return {
    sx: MAP_PAD+(x-b.minX)/rx*dw,
    sy: (SVG_H-MAP_PAD)-(y-b.minY)/ry*dh
  };
}

function niceStep(range){
  if(range<=0) return 1;
  const rough=range/6;
  const mag=Math.pow(10,Math.floor(Math.log10(rough)));
  const n=rough/mag;
  if(n<1.5) return mag;
  if(n<3.5) return 2*mag;
  if(n<7.5) return 5*mag;
  return 10*mag;
}

async function loadShopsOnMap(){
  try {
    const freshShops = await api('/shops')||[];
    allShops = freshShops;
    if(visitPath.length>0){
      visitPath = visitPath.map(vp=>{
        const matched = allShops.find(s=>s.id===vp.id);
        return matched ? {
          ...vp,
          xCoordinate: matched.xCoordinate,
          yCoordinate: matched.yCoordinate
        } : vp;
      });
    }
  } catch(e){ toast('Map: could not load shops','warn'); }
  renderMap();
}

function getBoundsShopsOnly(){
  if(!allShops.length) return {minX:0,minY:0,maxX:10,maxY:10};
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  allShops.forEach(s=>{
    minX=Math.min(minX,s.xCoordinate); minY=Math.min(minY,s.yCoordinate);
    maxX=Math.max(maxX,s.xCoordinate); maxY=Math.max(maxY,s.yCoordinate);
  });
  const rx=Math.max(maxX-minX,1), ry=Math.max(maxY-minY,1);
  return {minX:minX-rx*.25, minY:minY-ry*.25, maxX:maxX+rx*.25, maxY:maxY+ry*.25};
}

function renderMap(){
  const coords = getCoords();
  const hasPos = coords !== null;
  const ux = hasPos ? coords.userX : null;
  const uy = hasPos ? coords.userY : null;

  const b = hasPos ? getBounds(ux, uy) : getBoundsShopsOnly();

  const drawPath = visitPath.length > 0 && hasPos;
  const pathStops = drawPath ? visitPath : [];

  /* ── 1. Background ── */
  const dw = SVG_W - MAP_PAD*2, dh = SVG_H - MAP_PAD*2;
  document.getElementById('m-bg').innerHTML =
    `<rect width="${SVG_W}" height="${SVG_H}" fill="#f4f8f0"/>
     <rect x="${MAP_PAD}" y="${MAP_PAD}" width="${dw}" height="${dh}" fill="#edf5e6" rx="8"/>`;

  /* ── 2. Grid ── */
  const rangeX = b.maxX - b.minX || 1;
  const rangeY = b.maxY - b.minY || 1;
  const stepX  = niceStep(rangeX);
  const stepY  = niceStep(rangeY);
  let grid = '', gridLabels = '';

  for(let v = Math.ceil(b.minX/stepX)*stepX; v <= b.maxX+stepX*.01; v = Math.round((v+stepX)*1e10)/1e10){
    const sx = toSVG(v, 0, b).sx;
    if(sx < MAP_PAD-1 || sx > SVG_W-MAP_PAD+1) continue;
    grid       += `<line x1="${f(sx)}" y1="${MAP_PAD}" x2="${f(sx)}" y2="${SVG_H-MAP_PAD}" stroke="#d8e8ce" stroke-width="1"/>`;
    gridLabels += `<text x="${f(sx)}" y="${SVG_H-MAP_PAD+14}" text-anchor="middle" fill="#aac096" font-family="JetBrains Mono,monospace" font-size="9">${round1(v)}</text>`;
  }
  for(let v = Math.ceil(b.minY/stepY)*stepY; v <= b.maxY+stepY*.01; v = Math.round((v+stepY)*1e10)/1e10){
    const sy = toSVG(0, v, b).sy;
    if(sy < MAP_PAD-1 || sy > SVG_H-MAP_PAD+1) continue;
    grid       += `<line x1="${MAP_PAD}" y1="${f(sy)}" x2="${SVG_W-MAP_PAD}" y2="${f(sy)}" stroke="#d8e8ce" stroke-width="1"/>`;
    gridLabels += `<text x="${MAP_PAD-6}" y="${f(sy+3.5)}" text-anchor="end" fill="#aac096" font-family="JetBrains Mono,monospace" font-size="9">${round1(v)}</text>`;
  }
  document.getElementById('m-minor').innerHTML = '';
  document.getElementById('m-major').innerHTML  = grid + gridLabels;

  /* ── 3. Path arrows ── */
  const USER_R = 7;
  const SHOP_R = 7;
  const ARROW_HEAD = 7;

  function arrowSegment(p1, p2, g1, g2, col, sw, dash){
    const dx  = p2.sx - p1.sx;
    const dy  = p2.sy - p1.sy;
    const len = Math.sqrt(dx*dx + dy*dy);
    if(len < 2) return '';
    const ux3 = dx/len, uy3 = dy/len;

    const fromR = p1.isUser ? USER_R + 2 : SHOP_R + 2;
    const toR   = p2.isUser ? USER_R + 2 : SHOP_R + 2;
    const x1 = p1.sx + ux3 * fromR;
    const y1 = p1.sy + uy3 * fromR;
    const x2 = p2.sx - ux3 * (toR + ARROW_HEAD);
    const y2 = p2.sy - uy3 * (toR + ARROW_HEAD);

    const tipX = p2.sx - ux3 * toR;
    const tipY = p2.sy - uy3 * toR;
    const hw   = 4;
    const bx   = tipX - ux3 * ARROW_HEAD;
    const by   = tipY - uy3 * ARROW_HEAD;
    const lx   = bx + (-uy3) * hw,  ly  = by + ux3 * hw;
    const rx2  = bx +   uy3  * hw,  ry2 = by - ux3 * hw;

    const gridDist = dist(g1.x, g1.y, g2.x, g2.y);
    const mx  = (x1+x2)/2, my  = (y1+y2)/2;
    const off = 11;
    const lbx = mx + (-uy3)*off, lby = my + ux3*off;
    const lw  = 28;

    return `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"
        stroke="${col}" stroke-width="${sw}" stroke-dasharray="${dash}" opacity=".9" stroke-linecap="round"/>
      <polygon points="${f(tipX)},${f(tipY)} ${f(lx)},${f(ly)} ${f(rx2)},${f(ry2)}" fill="${col}" opacity=".95"/>
      <rect x="${f(lbx-lw/2)}" y="${f(lby-7)}" width="${lw}" height="14" rx="4"
        fill="white" stroke="${col}" stroke-width=".8" opacity=".93"/>
      <text x="${f(lbx)}" y="${f(lby+4)}" text-anchor="middle" fill="${col}"
        font-family="JetBrains Mono,monospace" font-size="8.5" font-weight="600">${gridDist.toFixed(1)}</text>`;
  }

  let pathSvg = '';
  if(drawPath && pathStops.length > 0 && hasPos){
    const userP  = { ...toSVG(ux, uy, b), isUser: true };
    const shopPs = pathStops.map(s => ({ ...toSVG(s.xCoordinate, s.yCoordinate, b), isUser: false }));
    const pts    = [userP, ...shopPs];
    const gPts   = [{ x:ux, y:uy }, ...pathStops.map(s => ({ x:s.xCoordinate, y:s.yCoordinate }))];

    for(let i = 0; i < pts.length-1; i++){
      const col = i === 0 ? '#3b82f6' : '#f97316';
      const sw  = i === 0 ? 2 : 1.8;
      const da  = i === 0 ? '6,3' : '5,3';
      pathSvg  += arrowSegment(pts[i], pts[i+1], gPts[i], gPts[i+1], col, sw, da);
    }
  }
  document.getElementById('m-path').innerHTML = pathSvg;

  /* ── 4. Shop markers ── */
  const SR  = 7;
  const SHL = 11;
  let shopSvg = '';

  allShops.forEach(s => {
    const {sx, sy} = toSVG(s.xCoordinate, s.yCoordinate, b);
    const isHl    = s.id === hlShopId;
    const pathIdx = pathStops.findIndex(p =>
      (p.id != null && p.id === s.id) ||
      (p.name && p.name.toLowerCase() === s.name.toLowerCase())
    );
    const inPath  = pathIdx >= 0;
    const r       = isHl ? SHL : SR;
    const col     = isHl ? '#f97316' : inPath ? '#f97316' : '#2da653';

    const badge = inPath ? `
      <circle cx="${f(sx+r+1)}" cy="${f(sy-r)}" r="7" fill="${col}" stroke="white" stroke-width="1.2"/>
      <text x="${f(sx+r+1)}" y="${f(sy-r+3.5)}" text-anchor="middle" fill="white"
        font-family="JetBrains Mono,monospace" font-size="8" font-weight="700">${pathIdx+1}</text>` : '';

    const lw2     = s.name.length * 6.5 + 12;
    const lx3     = sx - lw2/2;
    const labelId = `lbl-${s.id}`;
    const labelVis = (inPath || isHl) ? 'visible' : 'hidden';

    shopSvg += `
      <g style="cursor:pointer"
         onclick="clickPin(${s.id},'${s.name}',${s.xCoordinate},${s.yCoordinate})"
         onmouseenter="document.getElementById('${labelId}').setAttribute('visibility','visible')"
         onmouseleave="${inPath||isHl ? '' : `document.getElementById('${labelId}').setAttribute('visibility','hidden')`}">
        <circle cx="${f(sx)}" cy="${f(sy)}" r="${r+8}" fill="${col}" opacity=".06"/>
        <circle cx="${f(sx)}" cy="${f(sy)}" r="${r}" fill="${col}" stroke="white" stroke-width="1.8"/>
        <circle cx="${f(sx-r*.3)}" cy="${f(sy-r*.3)}" r="${f(r*.3)}" fill="white" opacity=".7"/>
        ${badge}
        <g id="${labelId}" visibility="${labelVis}">
          <rect x="${f(lx3)}" y="${f(sy-r-19)}" width="${f(lw2)}" height="15" rx="5"
            fill="${inPath?'#fff4ed':'white'}" stroke="${col}" stroke-width="1"/>
          <text x="${f(sx)}" y="${f(sy-r-9)}" text-anchor="middle" fill="${col}"
            font-family="Outfit,sans-serif" font-size="10" font-weight="700">${s.name}</text>
        </g>
        <text x="${f(sx)}" y="${f(sy+r+11)}" text-anchor="middle" fill="#9ab08a"
          font-family="JetBrains Mono,monospace" font-size="7.5">(${s.xCoordinate},${s.yCoordinate})</text>
      </g>`;
  });
  document.getElementById('m-shops').innerHTML = shopSvg;

  /* ── 5. User marker ── */
  if(hasPos){
    const {sx: usx, sy: usy} = toSVG(ux, uy, b);
    document.getElementById('m-user').innerHTML = `
      <circle cx="${f(usx)}" cy="${f(usy)}" r="16" fill="#3b82f6" opacity=".08">
        <animate attributeName="r" values="12;18;12" dur="2.5s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".10;.04;.10" dur="2.5s" repeatCount="indefinite"/>
      </circle>
      <circle cx="${f(usx)}" cy="${f(usy)}" r="7" fill="#3b82f6" stroke="white" stroke-width="2"/>
      <circle cx="${f(usx-2)}" cy="${f(usy-2)}" r="2" fill="white" opacity=".8"/>
      <rect x="${f(usx-13)}" y="${f(usy-25)}" width="26" height="13" rx="4"
        fill="#eff6ff" stroke="#93c5fd" stroke-width=".9"/>
      <text x="${f(usx)}" y="${f(usy-16)}" text-anchor="middle" fill="#1d4ed8"
        font-family="Outfit,sans-serif" font-size="8.5" font-weight="800">YOU</text>
      <text x="${f(usx)}" y="${f(usy+18)}" text-anchor="middle" fill="#93c5fd"
        font-family="JetBrains Mono,monospace" font-size="7.5">(${ux},${uy})</text>`;
  } else {
    document.getElementById('m-user').innerHTML = '';
  }
}

/* Formatting helpers */
function f(n){ return (+n).toFixed(1); }
function round1(v){ return +(Math.round(v*10)/10); }

function clickPin(id,name,x,y){
  hlShopId = hlShopId===id ? null : id;
  toast(`${name}  ·  (${x}, ${y})`,'info',3000);
  renderMap();
}

/* ── Map: hover tooltip ── */
(function initMap(){
  document.addEventListener('DOMContentLoaded', ()=>{
    const vp = document.getElementById('map-vp');
    if(!vp) return;

    vp.addEventListener('mousemove', e=>{
      const rect = vp.getBoundingClientRect();
      const svgX = (e.clientX - rect.left)  / rect.width  * SVG_W;
      const svgY = (e.clientY - rect.top)   / rect.height * SVG_H;
      const coords = getCoords();
      if(!coords) return;
      const {userX: ux, userY: uy} = coords;
      const b  = getBounds(ux, uy);
      const dw = SVG_W - MAP_PAD*2, dh = SVG_H - MAP_PAD*2;
      const rxr = b.maxX - b.minX || 1, ryr = b.maxY - b.minY || 1;
      const gx = +(Math.round((b.minX + (svgX - MAP_PAD) / dw * rxr) * 10) / 10).toFixed(1);
      const gy = +(Math.round((b.minY + (SVG_H - MAP_PAD - svgY) / dh * ryr) * 10) / 10).toFixed(1);
      document.getElementById('hover-coords').textContent = `x: ${gx}  y: ${gy}`;
    });

    vp.style.cursor = 'default';

    loadShopsOnMap();
  });
})();
