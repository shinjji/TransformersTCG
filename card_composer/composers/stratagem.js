/* ── composers/stratagem.js ───────────────────────────────────────────────
   Stratagem card composer (two-sided: Standard front + Small back).
   Registers as Composers.stratagem = { init, destroy }.
   ──────────────────────────────────────────────────────────────────────── */

(function () {
'use strict';

/* ── Data ──────────────────────────────────────────────────────────────── */
const FACTIONS = ['Autobot','Decepticon','Junkion','Mercenary','Quintesson','Unicronian'];

/* ── Module state ──────────────────────────────────────────────────────── */
let artworkSrc    = null;   // front artwork
let altArtworkSrc = null;   // back artwork
let zoomLevel     = 1;
let _saveTimer    = null;
let _progressReady = false;
let _modalEl      = null;

const PROGRESS_STEPS = ['type', 'identity', 'stats', 'ability', 'artwork', 'info'];

/* ── Export shift map ──────────────────────────────────────────────────── */
const EXPORT_SHIFT = {
  tCyberName:   1,
  tName:        1,
  tTarget:      1,
  tStratLabel:  1,
  abilityBox:   2,
  tWave:        1,
  tId:          1,
  tCredit:      1,
  tStarsFooter: 1,
};

/* ── Helpers ────────────────────────────────────────────────────────────── */
const sf = path => cc('stratagem', path);

function setBackLayer(id, url) {
  const el = g('b_' + id);
  if (!el) return;
  if (url) { el.src = url; el.style.display = ''; }
  else      { el.src = ''; el.style.display = 'none'; }
}

/* ── Main render (front card) ───────────────────────────────────────────── */
function render() {
  const faction = g('faction').value;

  // Clear all front layers
  ['lMainFrame','lBlackBg','lHeaderBg','lHeaderGrid',
   'lHeaderLine','lHeaderOverlayBg','lHeaderOverlay','lBorderBottom',
   'lTextboxOverlayBg','lTextbox','lTextboxOverlay','lSetSlash'].forEach(id => setLayer(id, null));

  // Faction icon — front
  const factionEl = g('lFaction');
  if (factionEl) {
    if (faction) {
      factionEl.src = cc('faction', `Faction - ${faction}.png`);
      factionEl.style.left    = '154px';
      factionEl.style.top     = '343px';
      factionEl.style.width   = '69px';
      factionEl.style.height  = 'auto';
      factionEl.style.opacity = '0.15';
      factionEl.style.display = '';
    } else { factionEl.src = ''; factionEl.style.display = 'none'; }
  }

  // Layers — back to front
  setLayer('lMainFrame',       sf('Stratagem - Small - Art Border.png'));
  setLayer('lBlackBg',         sf('Stratagem - Small - Black Background.png'));
  setLayer('lHeaderBg',        sf('Stratagem - Small - Header.png'));
  setLayer('lHeaderGrid', sf(faction ? 'Stratagem - Small - Header Grid White.png' : 'Stratagem - Small - Header Grid Black.png'));
  setLayer('lHeaderLine',      sf('Stratagem - Small - Header Line.png'));
  setLayer('lHeaderOverlayBg', sf('Stratagem - Small - Header Overlay Background.png'));
  if (faction) setLayer('lHeaderOverlay', sf(`Stratagem - Small - Header Overlay ${faction}.png`));
  setLayer('lBorderBottom',     sf('Stratagem - Small - Border Bottom.png'));
  setLayer('lTextboxOverlayBg', sf('Stratagem - Small - Textbox Overlay Background.png'));
  setLayer('lTextbox',          sf('Stratagem - Small - Textbox.png'));
  if (faction) setLayer('lTextboxOverlay', sf(`Stratagem - Small - Textbox Overlay ${faction}.png`));
  setLayer('lSetSlash',         sf('Stratagem - Small - Set Slash.png'));

  // Artwork
  const artEl = g('lArt');
  if (artworkSrc) {
    const posY  = parseInt(g('artPosY').value)  || 0;
    const scale = parseInt(g('artScale').value) || 100;
    artEl.src = artworkSrc; artEl.style.display = '';
    artEl.style.top = (13 + posY * 0.4) + '%';
    artEl.style.height = scale + '%'; artEl.style.width = '100%';
    artEl.style.objectFit = 'cover'; artEl.style.objectPosition = 'center top';
  } else { artEl.src = ''; artEl.style.display = 'none'; }

  // Name
  const nameText = (g('cardName').value || 'STRATAGEM NAME').toUpperCase();
  g('tName').textContent    = nameText;
  g('tName').style.left     = '50px';
  g('tName').style.top      = '48px';
  g('tName').style.fontSize = '29px';
  if (g('tCyberName')) {
    g('tCyberName').textContent     = nameText;
    g('tCyberName').style.right     = '55px';
    g('tCyberName').style.top       = '41px';
    g('tCyberName').style.textAlign = 'right';
  }

  // Target
  const targetText = (g('cardTarget').value || '').toUpperCase();
  g('tTarget').textContent      = targetText;
  g('tTarget').style.left       = '0';
  g('tTarget').style.right      = '0';
  g('tTarget').style.top        = '80px';
  g('tTarget').style.fontSize   = '11px';
  g('tTarget').style.textAlign  = 'center';
  g('tTarget').style.color      = faction ? '#fff' : '#000';
  g('tTarget').style.display    = targetText ? '' : 'none';

  // STRATAGEM type label
  g('tStratLabel').textContent     = 'Stratagem';
  g('tStratLabel').style.left      = '0';
  g('tStratLabel').style.right     = '0';
  g('tStratLabel').style.top       = '304px';
  g('tStratLabel').style.textAlign = 'center';
  g('tStratLabel').style.color     = faction ? '#fff' : '#000';

  // Ability text
  const aFontSize = parseFloat(g('abilityFontSize')?.value) || 8;
  const posAb     = parseFloat(g('posAbilityBox')?.value)   ?? 18;
  g('abilityBox').style.fontSize = aFontSize + 'px';
  g('abilityBox').style.bottom   = posAb + '%';
  g('tAbilityBody').innerHTML    = formatAbilityText(g('abilityBody').value);

  // Stars
  const starsEl   = g('tStarsFooter');
  const starCount = parseInt(g('starCount').value) || 0;
  starsEl.innerHTML = '';
  if (starCount > 0) {
    const use10 = g('starsUse10')?.checked;
    const use5  = g('starsUse5')?.checked;
    let sc = starCount; const imgs = [];
    if (use10) { const n=Math.floor(sc/10); sc%=10; for(let i=0;i<n;i++) imgs.push(10); }
    if (use5)  { const n=Math.floor(sc/5);  sc%=5;  for(let i=0;i<n;i++) imgs.push(5);  }
    for (let i=0;i<sc;i++) imgs.push(1);
    let running = 0;
    imgs.forEach(v => {
      if (!use5 && !use10 && running>0 && running%5===0) {
        const sp = document.createElement('span'); sp.style.cssText='width:4px;flex-shrink:0;'; starsEl.appendChild(sp);
      }
      const img = document.createElement('img');
      img.src = cc('icons', `Icon - Stars ${v}.png`); img.style.cssText='height:12px;width:auto;';
      starsEl.appendChild(img); running+=v;
    });
    starsEl.style.left    = '37px';
    starsEl.style.top     = '463px';
    starsEl.style.bottom  = '';
    starsEl.style.display = 'flex';
  } else { starsEl.style.display = 'none'; }

  // Stamp
  const stampEl = g('lStamp');
  if (stampEl) {
    stampEl.src = assetUrl('stamp/wave11_tbc.svg');
    stampEl.style.left    = (starCount > 0 ? 213 : 33) + 'px';
    stampEl.style.top     = '458px';
    stampEl.style.width   = '20px';
    stampEl.style.height  = 'auto';
    stampEl.style.display = 'block';
  }

  // Footer
  g('tWave').textContent    = g('cardWave').value;
  g('tWave').style.left     = '87px';
  g('tWave').style.bottom   = '39px';
  const _idParts = [g('cardRarity').value, g('cardNum').value].filter(Boolean).join('  ');
  const _total   = g('cardTotal').value;
  g('tId').textContent   = _total ? _idParts + '   ' + _total : _idParts;
  g('tId').style.left    = '136px';
  g('tId').style.bottom  = '39px';
  g('tCredit').innerHTML    = g('cardCredit').value || '';
  g('tCredit').style.bottom = '39px';
  g('tCredit').style.right  = '40px';

  saveToStorage();
  renderBack();
}

/* ── Back card render ───────────────────────────────────────────────────── */
function renderBack() {
  if (!g('b_card')) return;
  const faction = g('faction').value;

  // Clear all back layers
  ['lArt','lArtBorder',
   'lTextboxOverlayBg','lBorderBottom','lTextbox','lTextboxOverlay',
   'lStatFrame','lStatAtk','lStatDef','lStatHp'
  ].forEach(id => setBackLayer(id, null));

  // Faction icon — back
  const bFactionEl = g('b_lFaction');
  if (bFactionEl) {
    if (faction) {
      bFactionEl.src = cc('faction', `Faction - ${faction}.png`);
      bFactionEl.style.left    = '40px';
      bFactionEl.style.top     = '40px';
      bFactionEl.style.width   = '63px';
      bFactionEl.style.height  = 'auto';
      bFactionEl.style.display = '';
    } else { bFactionEl.src = ''; bFactionEl.style.display = 'none'; }
  }

  // Back layers — back to front
  setBackLayer('lArtBorder',        sf('Stratagem - Small - Art Border.png'));
  const hasBackAbility = (g('altAbilityBody').value || '').trim().length > 0;
  if (hasBackAbility) {
    setBackLayer('lTextboxOverlayBg', sf('Stratagem - Small - Textbox Overlay Background.png'));
    setBackLayer('lBorderBottom',     sf('Stratagem - Small - Border Bottom.png'));
    setBackLayer('lTextbox',          sf('Stratagem - Small - Textbox.png'));
    if (faction) setBackLayer('lTextboxOverlay', sf(`Stratagem - Small - Textbox Overlay ${faction}.png`));
  }
  // Conditional stat layers
  const atkVal = parseInt(g('statAtk').value) || 0;
  const defVal = parseInt(g('statDef').value) || 0;
  const hpVal  = parseInt(g('statHp').value)  || 0;
  const hasStats = atkVal > 0 || defVal > 0 || hpVal > 0;
  if (hasStats) setBackLayer('lStatFrame', sf('Stratagem - Small - Stat Frame.png'));
  if (atkVal > 0) setBackLayer('lStatAtk', sf('Stratagem - Small - Stat Attack.png'));
  if (defVal > 0) setBackLayer('lStatDef', sf('Stratagem - Small - Stat Defense.png'));
  if (hpVal  > 0) setBackLayer('lStatHp',  sf('Stratagem - Small - Stat Health.png'));

  // Back artwork
  const bArtEl = g('b_lArt');
  if (bArtEl) {
    if (altArtworkSrc) {
      const posY  = parseInt(g('altArtPosY')?.value)  || 0;
      const scale = parseInt(g('altArtScale')?.value) || 100;
      bArtEl.src = altArtworkSrc; bArtEl.style.display = '';
      bArtEl.style.top = (5 + posY * 0.4) + '%';
      bArtEl.style.height = scale + '%'; bArtEl.style.width = '100%';
      bArtEl.style.objectFit = 'cover'; bArtEl.style.objectPosition = 'center top';
    } else { bArtEl.src = ''; bArtEl.style.display = 'none'; }
  }

  // Back stat values
  const bAtk = g('b_tAtk');
  if (bAtk) {
    if (atkVal > 0) { bAtk.textContent = '+' + atkVal; bAtk.style.display = ''; }
    else { bAtk.style.display = 'none'; }
  }
  const bDef = g('b_tDef');
  if (bDef) {
    if (defVal > 0) { bDef.textContent = '+' + defVal; bDef.style.display = ''; }
    else { bDef.style.display = 'none'; }
  }
  const bHp = g('b_tHp');
  if (bHp) {
    if (hpVal > 0) { bHp.textContent = '+' + hpVal; bHp.style.display = ''; }
    else { bHp.style.display = 'none'; }
  }

  // Back ability text
  const aFontSize = parseFloat(g('altAbilityFontSize')?.value) || 8;
  const posAlt    = parseFloat(g('posAltAbilityBox')?.value)   ?? 18;
  const bAbilityBox = g('b_abilityBox');
  if (bAbilityBox) {
    bAbilityBox.style.fontSize = aFontSize + 'px';
    bAbilityBox.style.bottom   = posAlt + '%';
  }
  const bAbBody = g('b_tAbilityBody');
  if (bAbBody) bAbBody.innerHTML = formatAbilityText(g('altAbilityBody').value);

  // Back footer — wave/id hidden
  const bWave = g('b_tWave'); if (bWave) { bWave.textContent = ''; bWave.style.display = 'none'; }
  const bId   = g('b_tId');   if (bId)   { bId.textContent   = ''; bId.style.display   = 'none'; }
}

/* ── Artwork loaders ────────────────────────────────────────────────────── */
function loadArt(input, side) {
  const file = input.files[0]; if (!file) return;
  const isBack = side === 'back';
  const warnEl = g(isBack ? 'altArtSizeWarning' : 'artSizeWarning');
  if (warnEl) warnEl.style.display = file.size > 5*1024*1024 ? '' : 'none';
  const reader = new FileReader();
  reader.onload = e => {
    if (isBack) {
      altArtworkSrc = e.target.result;
      artStore.set('stratagem_back', altArtworkSrc).catch(()=>{});
      renderBack();
    } else {
      artworkSrc = e.target.result;
      artStore.set('stratagem_front', artworkSrc).catch(()=>{});
      render();
    }
  };
  reader.readAsDataURL(file);
}

/* ── Zoom ───────────────────────────────────────────────────────────────── */
function applyZoom() {
  const z = zoomLevel === 1 ? '' : String(zoomLevel);
  g('cardsDisplay').style.zoom = z;
  g('zoomDisplay').textContent = Math.round(zoomLevel * 100) + '%';
}
function zoom(delta) { zoomLevel = Math.max(0.3, Math.min(2.5, zoomLevel + delta)); applyZoom(); }
function resetZoom() { zoomLevel = 1; applyZoom(); }

/* ── Section toggle ─────────────────────────────────────────────────────── */
function toggleSec(name) {
  g('sec-' + name)?.classList.toggle('collapsed');
  const collapsed = ['type','identity','stats','ability','art','info']
    .filter(n => g('sec-'+n)?.classList.contains('collapsed'));
  try { localStorage.setItem('tfStratagemSectionState', JSON.stringify(collapsed)); } catch(e) {}
}
function restoreSections() {
  try {
    const c = JSON.parse(localStorage.getItem('tfStratagemSectionState') || '[]');
    c.forEach(n => g('sec-'+n)?.classList.add('collapsed'));
  } catch(e) {}
}

/* ── State / persistence ────────────────────────────────────────────────── */
function getState() {
  return {
    faction:     g('faction').value,
    cardName:    g('cardName').value,
    cardTarget:  g('cardTarget').value,
    starCount:   g('starCount').value,
    starsUse5:   g('starsUse5')?.checked  || false,
    starsUse10:  g('starsUse10')?.checked || false,
    statAtk:     g('statAtk').value,
    statDef:     g('statDef').value,
    statHp:      g('statHp').value,
    abilityBody:    g('abilityBody').value,
    altAbilityBody: g('altAbilityBody').value,
    abilityFontSize:    g('abilityFontSize').value,
    altAbilityFontSize: g('altAbilityFontSize').value,
    posAbilityBox:    g('posAbilityBox').value,
    posAltAbilityBox: g('posAltAbilityBox').value,
    artPosY:   g('artPosY').value,
    artScale:  g('artScale').value,
    altArtPosY:  g('altArtPosY')?.value  || '0',
    altArtScale: g('altArtScale')?.value || '100',
    cardWave:   g('cardWave').value,
    cardRarity: g('cardRarity').value,
    cardNum:    g('cardNum').value,
    cardTotal:  g('cardTotal').value,
    cardCredit: g('cardCredit').value,
  };
}

function applyState(s) {
  const set = (id, val) => { if (val !== undefined && g(id)) g(id).value = val; };
  set('faction',    s.faction);
  set('cardName',   s.cardName);
  set('cardTarget', s.cardTarget);
  set('starCount',  s.starCount);
  if (g('starsUse5'))  g('starsUse5').checked  = s.starsUse5  || false;
  if (g('starsUse10')) g('starsUse10').checked = s.starsUse10 || false;
  set('statAtk', s.statAtk);
  set('statDef', s.statDef);
  set('statHp',  s.statHp);
  set('abilityBody',    s.abilityBody);
  set('altAbilityBody', s.altAbilityBody);
  set('abilityFontSize',    s.abilityFontSize);
  set('altAbilityFontSize', s.altAbilityFontSize);
  set('posAbilityBox',    s.posAbilityBox);
  set('posAltAbilityBox', s.posAltAbilityBox);
  ['posAbilityBox','posAltAbilityBox'].forEach(id => {
    const el = g(id); if (el) { const lbl = g(id+'Val'); if (lbl) lbl.textContent = el.value + '%'; }
  });
  set('artPosY', s.artPosY); set('artScale', s.artScale);
  set('altArtPosY', s.altArtPosY); set('altArtScale', s.altArtScale);
  set('cardWave', s.cardWave);
  set('cardRarity', s.cardRarity); set('cardNum', s.cardNum); set('cardTotal', s.cardTotal);
  set('cardCredit', s.cardCredit);
  render();
}

function saveToStorage() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    try { localStorage.setItem('tfStratagemState', JSON.stringify(getState())); } catch(e) {}
  }, 300);
}

async function loadFromStorage() {
  try { const raw = localStorage.getItem('tfStratagemState'); if (raw) applyState(JSON.parse(raw)); } catch(e) {}
  try { const art = await artStore.get('stratagem_front'); if (art) { artworkSrc = art; render(); } } catch(e) {}
  try { const alt = await artStore.get('stratagem_back');  if (alt) { altArtworkSrc = alt; renderBack(); } } catch(e) {}
}

function copyJSON() {
  const txt = JSON.stringify(getState(), null, 2);
  navigator.clipboard.writeText(txt)
    .then(() => alert('Card JSON copied!'))
    .catch(() => { const t=document.createElement('textarea'); t.value=txt; document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t); alert('Copied!'); });
}

function resetToDefaults() {
  if (!confirm('Reset to defaults? This clears all card data.')) return;
  try { localStorage.removeItem('tfStratagemState'); } catch(e) {}
  artStore.del('stratagem_front').catch(()=>{}); artStore.del('stratagem_back').catch(()=>{});
  artworkSrc = null; altArtworkSrc = null;
  g('faction').value = 'Autobot';
  g('cardName').value = 'STRATAGEM NAME';
  g('cardTarget').value = '';
  g('starCount').value = '0';
  if (g('starsUse5'))  g('starsUse5').checked  = false;
  if (g('starsUse10')) g('starsUse10').checked = false;
  g('statAtk').value = '0'; g('statDef').value = '0'; g('statHp').value = '0';
  g('abilityBody').value = ''; g('altAbilityBody').value = '';
  g('abilityFontSize').value = '8'; g('altAbilityFontSize').value = '8';
  g('posAbilityBox').value = '18';    if (g('posAbilityBoxVal'))    g('posAbilityBoxVal').textContent    = '18%';
  g('posAltAbilityBox').value = '18'; if (g('posAltAbilityBoxVal')) g('posAltAbilityBoxVal').textContent = '18%';
  g('artPosY').value = '0'; g('artScale').value = '100';
  if (g('altArtPosY'))  g('altArtPosY').value  = '0';
  if (g('altArtScale')) g('altArtScale').value = '100';
  g('cardWave').value = ''; g('cardRarity').value = ''; g('cardNum').value = '';
  g('cardTotal').value = ''; g('cardCredit').value = 'Designed by SHINJJI';
  if (g('artUpload'))    g('artUpload').value = '';
  if (g('altArtUpload')) g('altArtUpload').value = '';
  resetProgress();
  render();
}

function loadJSON() {
  g('jsonInput').value=''; g('jsonError').textContent='';
  g('jsonModal').classList.add('open');
  setTimeout(() => g('jsonInput').focus(), 50);
}
function closeJSONModal(e) {
  if (e && e.target !== g('jsonModal')) return;
  g('jsonModal').classList.remove('open');
}
function confirmLoadJSON() {
  const json = g('jsonInput').value.trim(); if (!json) return;
  try { applyState(JSON.parse(json)); g('jsonModal').classList.remove('open'); }
  catch(e) { g('jsonError').textContent = '⚠ Invalid JSON — ' + e.message; }
}

/* ── Filename builder ───────────────────────────────────────────────────── */
function buildFilename(side) {
  const waveNum = (g('cardWave').value || '').match(/\d+/)?.[0] || '0';
  const idVal   = (g('cardNum').value || '').trim();
  const idMatch = idVal.match(/T(\d+)/) || idVal.match(/^(\d+)$/);
  const cardNum = idMatch ? idMatch[1].padStart(3,'0') : '000';
  return `FMW${waveNum}_S_${cardNum}_${side}`;
}

/* ── Progress tracker ───────────────────────────────────────────────────── */
function updateProgress() {
  const total    = PROGRESS_STEPS.length;
  const done     = PROGRESS_STEPS.filter(s => g('prog_'+s)?.checked).length;
  const complete = done === total;
  const pct      = Math.round((done/total)*100);
  const fill  = g('progressBarFill');
  const label = g('progressLabel');
  const btn   = g('exportBtn');
  if (fill)  { fill.style.width=pct+'%'; fill.classList.toggle('complete', complete); }
  if (label) label.textContent = complete ? '✦ Complete' : `${done} / ${total} complete`;
  if (btn)   { btn.disabled=!complete; btn.style.opacity=complete?'':'0.4'; btn.title=complete?'':'Complete all steps to enable export'; }
  saveProgressToStorage();
}
function saveProgressToStorage() {
  if (!_progressReady) return;
  const state = {};
  PROGRESS_STEPS.forEach(s => { state[s] = g('prog_'+s)?.checked || false; });
  try { localStorage.setItem('tfStratagemProgress', JSON.stringify(state)); } catch(e) {}
}
function loadProgressFromStorage() {
  try {
    const raw = localStorage.getItem('tfStratagemProgress');
    if (raw) { const s=JSON.parse(raw); PROGRESS_STEPS.forEach(k => { const el=g('prog_'+k); if(el&&s[k]!==undefined) el.checked=s[k]; }); }
  } catch(e) {}
  _progressReady = true;
  updateProgress();
}
function resetProgress() {
  PROGRESS_STEPS.forEach(s => { const el=g('prog_'+s); if(el) el.checked=false; });
  updateProgress();
}

/* ── Export ─────────────────────────────────────────────────────────────── */
async function exportPNG() {
  const btn = g('exportBtn'); btn.textContent='Generating…'; btn.disabled=true;
  try {
    await exportCard(g('card'),   buildFilename('f')+'.png', { shiftMap: EXPORT_SHIFT, iconNudge: 2, scale: 844/380, exportW: 844, exportH: 1139 });
    await exportCard(g('b_card'), buildFilename('b')+'.png', { shiftMap: EXPORT_SHIFT, iconNudge: 2, scale: 844/380, exportW: 844, exportH: 1139 });
  } catch(e) { alert('Export failed: '+e.message); }
  finally { btn.textContent = 'Export PNGs ↓'; updateProgress(); }
}

/* ── HTML template ──────────────────────────────────────────────────────── */
const FACTIONS_HTML = `<option value="">- None -</option>` + FACTIONS.map(f => `<option>${f}</option>`).join('');

function getHTML() {
  return `
  <div class="controls-panel">

    <div class="section" id="sec-type">
      <div class="section-header" onclick="toggleSec('type')">Card Type <span class="chevron">▾</span></div>
      <div class="section-body">
        <div class="field">
          <label>Faction</label>
          <select id="faction" onchange="render()">${FACTIONS_HTML}</select>
        </div>
      </div>
    </div>

    <div class="section" id="sec-identity">
      <div class="section-header" onclick="toggleSec('identity')">Identity <span class="chevron">▾</span></div>
      <div class="section-body">
        <div class="field">
          <label>Name</label>
          <input type="text" id="cardName" value="STRATAGEM NAME" oninput="render()">
        </div>
        <div class="field">
          <label>Target</label>
          <input type="text" id="cardTarget" value="" placeholder="e.g. OPTIMUS PRIME" oninput="render()">
        </div>
      </div>
    </div>

    <div class="section" id="sec-stats">
      <div class="section-header" onclick="toggleSec('stats')">Stats <span class="chevron">▾</span></div>
      <div class="section-body">
        <div style="font-size:10px;font-weight:700;letter-spacing:1px;color:#888;text-transform:uppercase;margin:0 0 6px;">Star Cost</div>
        <div class="field">
          <label>Stars</label>
          <input type="number" id="starCount" value="0" min="0" max="30" oninput="render()">
        </div>
        <div style="display:flex;gap:14px;margin-bottom:10px;">
          <label style="display:flex;align-items:center;gap:5px;font-size:10px;color:var(--label);cursor:pointer;"><input type="checkbox" id="starsUse5" onchange="render()"> Use 5s</label>
          <label style="display:flex;align-items:center;gap:5px;font-size:10px;color:var(--label);cursor:pointer;"><input type="checkbox" id="starsUse10" onchange="render()"> Use 10s</label>
        </div>
        <div style="font-size:10px;font-weight:700;letter-spacing:1px;color:#888;text-transform:uppercase;margin:0 0 6px;">Stat Modifiers (Back Card)</div>
        <div class="row-2">
          <div class="field"><label>ATK</label><input type="number" id="statAtk" value="0" min="0" max="99" oninput="render()"></div>
          <div class="field"><label>DEF</label><input type="number" id="statDef" value="0" min="0" max="99" oninput="render()"></div>
        </div>
        <div class="field">
          <label>HP</label><input type="number" id="statHp" value="0" min="0" max="99" oninput="render()" style="max-width:80px;">
        </div>
      </div>
    </div>

    <div class="section" id="sec-ability">
      <div class="section-header" onclick="toggleSec('ability')">Ability Text <span class="chevron">▾</span></div>
      <div class="section-body">
        <div style="font-size:9px;color:var(--label);letter-spacing:0.7px;text-transform:uppercase;margin-bottom:4px;">Front (Play Effect)</div>
        <div class="row-2">
          <div class="field"><label>Font Size</label><input type="number" id="abilityFontSize" value="8" min="4" max="20" step="0.5" oninput="render()"></div>
        </div>
        <div class="field"><label>Text</label><textarea id="abilityBody" oninput="render()" style="min-height:100px;"></textarea></div>
        <div class="field"><label>Position</label><div style="display:flex;align-items:center;gap:6px;"><input type="range" id="posAbilityBox" min="0" max="50" step="0.1" value="18" oninput="g('posAbilityBoxVal').textContent=this.value+'%';render()" style="flex:1;"><span id="posAbilityBoxVal" style="font-size:10px;color:var(--muted);min-width:34px;">18%</span></div></div>
        <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);">
          <div style="font-size:9px;color:var(--label);letter-spacing:0.7px;text-transform:uppercase;margin-bottom:4px;">Back (While Attached)</div>
          <div class="row-2">
            <div class="field"><label>Font Size</label><input type="number" id="altAbilityFontSize" value="8" min="4" max="20" step="0.5" oninput="renderBack()"></div>
          </div>
          <div class="field"><label>Text</label><textarea id="altAbilityBody" oninput="renderBack()" style="min-height:80px;"></textarea></div>
          <div class="field"><label>Position</label><div style="display:flex;align-items:center;gap:6px;"><input type="range" id="posAltAbilityBox" min="0" max="50" step="0.1" value="18" oninput="g('posAltAbilityBoxVal').textContent=this.value+'%';renderBack()" style="flex:1;"><span id="posAltAbilityBoxVal" style="font-size:10px;color:var(--muted);min-width:34px;">18%</span></div></div>
        </div>
      </div>
    </div>

    <div class="section" id="sec-art">
      <div class="section-header" onclick="toggleSec('art')">Artwork <span class="chevron">▾</span></div>
      <div class="section-body">
        <div style="font-size:9px;color:var(--label);letter-spacing:0.7px;text-transform:uppercase;margin-bottom:4px;">Front</div>
        <div class="field">
          <input type="file" id="artUpload" accept="image/*" onchange="loadArt(this,'front')" style="font-size:11px;color:var(--muted);cursor:pointer;padding:4px 0;">
          <span id="artSizeWarning" style="display:none;font-size:10px;color:#e67e22;">⚠ Image over 5 MB.</span>
        </div>
        <div class="field"><label>Vertical Position</label><input type="range" id="artPosY" min="-100" max="100" value="0" oninput="render()" style="padding:0;border:none;background:none;"></div>
        <div class="field"><label>Scale</label><input type="range" id="artScale" min="50" max="220" value="100" oninput="render()" style="padding:0;border:none;background:none;"></div>
        <div style="font-size:9px;color:var(--label);letter-spacing:0.7px;text-transform:uppercase;margin-top:10px;margin-bottom:4px;">Back</div>
        <div class="field">
          <input type="file" id="altArtUpload" accept="image/*" onchange="loadArt(this,'back')" style="font-size:11px;color:var(--muted);cursor:pointer;padding:4px 0;">
          <span id="altArtSizeWarning" style="display:none;font-size:10px;color:#e67e22;">⚠ Image over 5 MB.</span>
        </div>
        <div class="field"><label>Vertical Position</label><input type="range" id="altArtPosY" min="-100" max="100" value="0" oninput="renderBack()" style="padding:0;border:none;background:none;"></div>
        <div class="field"><label>Scale</label><input type="range" id="altArtScale" min="50" max="220" value="100" oninput="renderBack()" style="padding:0;border:none;background:none;"></div>
      </div>
    </div>

    <div class="section" id="sec-info">
      <div class="section-header" onclick="toggleSec('info')">Card Details <span class="chevron">▾</span></div>
      <div class="section-body">
        <div class="row-2">
          <div class="field"><label>Wave</label><input type="text" id="cardWave" value="WAVE " oninput="render()"></div>
          <div class="field"><label>Rarity</label><input type="text" id="cardRarity" value="" oninput="render()"></div>
        </div>
        <div class="row-2">
          <div class="field"><label>Card ID</label><input type="text" id="cardNum" value="" oninput="render()"></div>
          <div class="field"><label>Total</label><input type="text" id="cardTotal" value="" oninput="render()"></div>
        </div>
        <div class="field"><label>Credits</label><input type="text" id="cardCredit" value="Designed by SHINJJI" oninput="render()"></div>
      </div>
    </div>

    <div class="btn-row">
      <button class="btn btn-secondary" onclick="copyJSON()">Copy JSON</button>
      <button class="btn btn-secondary" onclick="loadJSON()">Load JSON</button>
    </div>
    <button class="btn btn-primary" id="exportBtn" onclick="exportPNG()">Export PNGs ↓</button>
    <button class="btn btn-secondary" onclick="resetToDefaults()" style="width:100%;margin-top:2px;color:#e05a5a;border-color:#5a2a2a;flex-grow:0;">↺ Reset to Defaults</button>

  </div><!-- .controls-panel -->

  <!-- ── CENTER: Card Preview ── -->
  <div class="preview-area">
    <div class="cards-display" id="cardsDisplay">

      <!-- FRONT CARD -->
      <div class="card-col">
        <div class="card-col-label" id="frontLabel">STRATAGEM FRONT</div>
        <div class="card-wrapper" id="cardWrapper">
          <div class="card" id="card" style="height:513px;">
            <img id="lArt"           class="card-layer" style="display:none;object-fit:cover;object-position:center top;">
            <img id="lMainFrame"     class="card-layer" alt="">
            <img id="lBlackBg"       class="card-layer" alt="">
            <img id="lHeaderOverlayBg" class="card-layer" alt="">
            <img id="lHeaderBg"      class="card-layer" alt="">
            <img id="lHeaderLine"    class="card-layer" alt="">
            <img id="lHeaderOverlay" class="card-layer" alt="">
            <img id="lHeaderGrid"    class="card-layer" alt="">
            <img id="lBorderBottom"      class="card-layer" alt="">
            <img id="lTextboxOverlayBg"  class="card-layer" alt="">
            <img id="lTextbox"           class="card-layer" alt="">
            <img id="lTextboxOverlay"    class="card-layer" alt="">
            <img id="lSetSlash"          class="card-layer" alt="">
            <img id="lFaction"           class="card-text"  alt="" style="display:none;position:absolute;pointer-events:none;">

            <div id="tCyberName" class="card-text" style="top:2%;right:2%;font-family:'CybertonicFont',sans-serif;font-size:13px;color:rgba(180,180,180,0.5);text-transform:uppercase;letter-spacing:-2px;text-align:right;white-space:nowrap;overflow:hidden;pointer-events:none;"></div>
            <div id="tName" class="card-text" style="top:29px;left:13px;right:40px;font-family:'BayformersName','Segoe UI',sans-serif;font-size:22px;color:#fff;text-transform:uppercase;letter-spacing:0.5px;line-height:1;white-space:nowrap;overflow:hidden;"></div>
            <div id="tTarget" class="card-text" style="top:55px;left:13px;right:6px;font-family:'OpenSansSCMedItal',sans-serif;font-size:8px;color:#fff;text-transform:uppercase;letter-spacing:0.8px;white-space:nowrap;overflow:hidden;display:none;"></div>
            <div id="tStratLabel" class="card-text" style="top:299px;left:52px;font-family:'BattleCardType',sans-serif;font-size:13px;color:#fff;text-transform:uppercase;letter-spacing:0px;"></div>
            <div id="abilityBox" class="card-text" style="bottom:18%;left:10%;right:10%;font-size:8px;line-height:1.55;color:#1a1a1a;text-align:center;">
              <div id="tAbilityBody" style="font-family:'GothamNarrow','Arial',sans-serif;"></div>
            </div>
            <span id="tWave"   class="card-text" style="font-size:10px;color:#fff;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;font-family:'OpenSansBold',sans-serif;bottom:39px;"></span>
            <span id="tId"     class="card-text" style="font-size:10px;font-weight:700;color:#fff;letter-spacing:0.5px;font-family:'OpenSansBold',sans-serif;bottom:39px;white-space:pre;"></span>
            <div  id="tCredit" class="card-text" style="font-size:10px;color:#fff;text-align:right;line-height:1.35;font-family:'OpenSansBold',sans-serif;bottom:39px;"></div>
            <div  id="tStarsFooter" class="card-text" style="display:none;align-items:center;gap:2px;"></div>
            <img  id="lStamp"  class="card-text" style="display:none;position:absolute;pointer-events:none;">
          </div><!-- .card -->
        </div><!-- .card-wrapper front -->
      </div><!-- .card-col front -->

      <!-- BACK CARD -->
      <div class="card-col" id="backCardCol">
        <div class="card-col-label" id="backLabel">STRATAGEM BACK</div>
        <div class="card-wrapper" id="b_cardWrapper">
          <div class="card" id="b_card" style="height:513px;">
            <img id="b_lArt"            class="card-layer" style="display:none;object-fit:cover;object-position:center top;">
            <img id="b_lArtBorder"      class="card-layer" alt="">
            <img id="b_lTextboxOverlayBg" class="card-layer" alt="">
            <img id="b_lBorderBottom"   class="card-layer" alt="">
            <img id="b_lTextbox"        class="card-layer" alt="">
            <img id="b_lTextboxOverlay" class="card-layer" alt="">
            <img id="b_lFaction"        class="card-text"  alt="" style="display:none;position:absolute;pointer-events:none;">
            <img id="b_lStatFrame"      class="card-layer" alt="">
            <img id="b_lStatAtk"        class="card-layer" alt="" style="display:none;">
            <img id="b_lStatDef"        class="card-layer" alt="" style="display:none;">
            <img id="b_lStatHp"         class="card-layer" alt="" style="display:none;">
            <span id="b_tAtk" class="card-text" style="display:none;font-family:'ArmadaCondensed',sans-serif;font-size:24px;font-weight:700;color:#fff;line-height:1;top:402px;left:48px;"></span>
            <span id="b_tDef" class="card-text" style="display:none;font-family:'ArmadaCondensed',sans-serif;font-size:24px;font-weight:700;color:#fff;line-height:1;top:402px;left:270px;"></span>
            <span id="b_tHp"  class="card-text" style="display:none;font-family:'ArmadaCondensed',sans-serif;font-size:24px;font-weight:700;color:#fff;line-height:1;top:402px;left:160px;"></span>
            <div id="b_abilityBox" class="card-text" style="bottom:18%;left:10%;right:10%;font-size:8px;line-height:1.55;color:#1a1a1a;text-align:center;">
              <div id="b_tAbilityBody" style="font-family:'GothamNarrow','Arial',sans-serif;"></div>
            </div>
            <span id="b_tWave"   class="card-text" style="display:none;"></span>
            <span id="b_tId"     class="card-text" style="display:none;"></span>
          </div><!-- .card back -->
        </div><!-- .card-wrapper back -->
      </div><!-- .card-col back -->

    </div><!-- .cards-display -->
  </div><!-- .preview-area -->

  <!-- ── RIGHT: Progress panel ── -->
  <div class="layers-panel">
    <div class="layers-title">Progress</div>
    <div class="progress-bar-track"><div class="progress-bar-fill" id="progressBarFill"></div></div>
    <div class="progress-label" id="progressLabel">0 / 6 complete</div>
    <div class="progress-steps">
      <label class="progress-step"><input type="checkbox" id="prog_type"     onchange="updateProgress()"><div class="progress-step-body"><span class="progress-step-name">Card Type &amp; Faction</span></div></label>
      <label class="progress-step"><input type="checkbox" id="prog_identity" onchange="updateProgress()"><div class="progress-step-body"><span class="progress-step-name">Identity</span></div></label>
      <label class="progress-step"><input type="checkbox" id="prog_stats"    onchange="updateProgress()"><div class="progress-step-body"><span class="progress-step-name">Stars &amp; Stats</span></div></label>
      <label class="progress-step"><input type="checkbox" id="prog_ability"  onchange="updateProgress()"><div class="progress-step-body"><span class="progress-step-name">Abilities</span></div></label>
      <label class="progress-step"><input type="checkbox" id="prog_artwork"  onchange="updateProgress()"><div class="progress-step-body"><span class="progress-step-name">Artwork</span></div></label>
      <label class="progress-step"><input type="checkbox" id="prog_info"     onchange="updateProgress()"><div class="progress-step-body"><span class="progress-step-name">Card Details</span></div></label>
    </div>
    <div style="flex:1;"></div>
    <div class="preview-controls" style="padding-top:10px;border-top:1px solid var(--border);margin-top:10px;justify-content:center;">
      <button class="zoom-btn" onclick="zoom(-0.1)">−</button>
      <span class="zoom-display" id="zoomDisplay">100%</span>
      <button class="zoom-btn" onclick="zoom(0.1)">+</button>
      <button class="zoom-btn" onclick="resetZoom()">Reset</button>
    </div>
  </div><!-- .layers-panel -->
  `;
}

const MODAL_HTML = `
<div id="jsonModal" class="modal-backdrop" onclick="closeJSONModal(event)">
  <div class="modal">
    <div class="modal-header">
      <span class="modal-title">Load JSON</span>
      <button class="modal-close" onclick="closeJSONModal()">✕</button>
    </div>
    <div class="modal-body">
      <label class="modal-label">Paste card JSON below</label>
      <textarea id="jsonInput" class="modal-textarea" placeholder='{ "cardName": "...", ... }'></textarea>
      <div id="jsonError" class="modal-error"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeJSONModal()">Cancel</button>
      <button class="btn btn-primary" onclick="confirmLoadJSON()" style="flex:1;">Load</button>
    </div>
  </div>
</div>`;

/* ── Composer interface ─────────────────────────────────────────────────── */
const GLOBALS = ['render','renderBack','loadArt','zoom','resetZoom','toggleSec',
  'copyJSON','loadJSON','closeJSONModal','confirmLoadJSON',
  'exportPNG','updateProgress','resetToDefaults'];

function init(mountEl) {
  mountEl.innerHTML = getHTML();

  _modalEl = document.createElement('div');
  _modalEl.innerHTML = MODAL_HTML;
  document.body.appendChild(_modalEl.firstElementChild);

  const fns = { render, renderBack, loadArt, zoom, resetZoom, toggleSec,
    copyJSON, loadJSON, closeJSONModal, confirmLoadJSON,
    exportPNG, updateProgress, resetToDefaults };
  GLOBALS.forEach(k => { window[k] = fns[k]; });

  loadFromStorage();
  loadProgressFromStorage();
  restoreSections();
  preconvertBlackImages().then(() => render());

  window.addEventListener('beforeunload', _onUnload);
}

function _onUnload() {
  try { localStorage.setItem('tfStratagemState', JSON.stringify(getState())); } catch(e) {}
}

function destroy() {
  _onUnload();
  window.removeEventListener('beforeunload', _onUnload);
  GLOBALS.forEach(k => { delete window[k]; });
  const modal = g('jsonModal');
  if (modal) modal.parentNode?.removeChild(modal);
  _modalEl = null;
  artworkSrc = null; altArtworkSrc = null;
  _progressReady = false;
}

window.Composers.stratagem = { init, destroy };

})();
