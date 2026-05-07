/* ── composers/battle_action.js ───────────────────────────────────────────
   Battle Action card composer.
   Registers as Composers.battle_action = { init, destroy }.
   ──────────────────────────────────────────────────────────────────────── */

(function () {
'use strict';

/* ── Data ──────────────────────────────────────────────────────────────── */
const FACTIONS = ['Autobot','Decepticon','Junkion','Mercenary','Quintesson','Unicronian'];

const BATTLE_ICON_OPTS_HTML = `<option value="">— None —</option>
  <option value="B">Blue</option>
  <option value="G">Green</option>
  <option value="K">Black</option>
  <option value="O">Orange</option>
  <option value="W">White</option>`;

const CONFIG = {
  folder:       'battle',
  hasFaction:   true,
  hasHeaderMask: true,
  hasStats:     false,
  artTop:       '13%',
  explanationOptions: ['','Rolling Action','Secret Action'],
};

const EXPORT_SHIFT = {
  tCyberName:   1,
  tName:        1,
  abilityBoxWide: 2,
  tWave:        2,
  tId:          2,
  tCredit:      2,
  tStarsFooter: 0,
};

/* ── Module state ──────────────────────────────────────────────────────── */
let artworkSrc  = null;
let zoomLevel   = 1;
let _saveTimer  = null;
let _progressReady = false;
let _modalEl    = null;

const PROGRESS_STEPS = ['faction','identity','stats','ability','artwork','info'];


/* ── Main render ──────────────────────────────────────────────────────── */
function render() {
  const faction = g('faction').value;
  const typeKey = 'Battle - Action';
  const cp      = comp => cc('battle', `${typeKey} - ${comp}.png`);

  const ALL_LAYERS = ['lGradient','lHeaderBg','lHeaderLines','lHeaderOverlay',
    'lMainFrame','lTextbox','lHeaderMask','lExplanation',
    'lSetSlash','lModeBox','lStarSep','lFactionFrame','lFactionIcon'];
  ALL_LAYERS.forEach(id => setLayer(id, null));

  if (faction) setLayer('lHeaderOverlay', cp(`Header Overlay ${faction}`));
  setLayer('lMainFrame',     cp('Main Frame'));
  setLayer('lSetSlash',      cp('Set Slash'));
  setLayer('lHeaderMask',    cp('Header Mask'));

  // Explanation badge
  const expVal = g('explanationType')?.value || '';
  if (expVal) {
    setLayer('lExplanation', cp(`Explanation ${expVal}`));
    const expEl = g('lExplanation');
    if (expEl) {
      expEl.style.cssText = 'position:absolute;bottom:13%;left:0;width:40%;height:auto;object-fit:contain;display:block;';
    }
  }

  // Artwork
  const artEl = g('lArt');
  if (artworkSrc) {
    const posY    = parseInt(g('artPosY').value)  || 0;
    const scale   = parseInt(g('artScale').value) || 100;
    const baseTop = parseFloat(CONFIG.artTop);
    artEl.src = artworkSrc; artEl.style.display = '';
    artEl.style.top = (baseTop + posY * 0.4) + '%';
    artEl.style.height = scale + '%'; artEl.style.width = '100%';
    artEl.style.objectFit = 'cover'; artEl.style.objectPosition = 'center top';
  } else { artEl.src = ''; artEl.style.display = 'none'; }

  // Name + Cybertonian watermark
  const nameText = (g('cardName').value || 'CARD NAME').toUpperCase();
  g('tName').textContent = nameText;
  g('tName').style.left = '45px';
  g('tName').style.top  = '58px';
  if (g('tCyberName')) {
    g('tCyberName').textContent = nameText;
    g('tCyberName').style.left   = '85px';
    g('tCyberName').style.top    = '42px';
    g('tCyberName').style.right  = '';
  }

  // ACTION label — fixed position
  const actionEl = g('tActionLabel');
  if (actionEl) {
    actionEl.textContent = 'Action';
    actionEl.style.left = '52px';
    actionEl.style.top  = '309px';
  }

  // Battle icons — stacked top-right
  const iconsEl = g('tBattleIcons');
  if (iconsEl) {
    iconsEl.style.left = '282px';
    iconsEl.style.top  = '44px';
    iconsEl.innerHTML = '';
    [g('battleIcon1')?.value, g('battleIcon2')?.value, g('battleIcon3')?.value].forEach(v => {
      if (!v) return;
      const img = document.createElement('img');
      img.src = cc('icons', `Icon - Battle ${v}.png`);
      img.style.cssText = 'width:32px;height:auto;display:block;margin-bottom:3px;';
      iconsEl.appendChild(img);
    });
  }

  // Ability text (wide, centred - no mode box)
  const aFontSize = parseFloat(g('abilityFontSize')?.value) || 15;
  const posAb     = parseFloat(g('posAbilityBox')?.value) ?? 18;
  g('abilityBoxWide').style.display  = '';
  g('abilityBoxWide').style.fontSize = aFontSize + 'px';
  g('abilityBoxWide').style.bottom   = posAb + '%';
  g('tAbilityBodyWide').innerHTML    = formatAbilityText(g('abilityBody').value);
  g('tAbilityParenWide').textContent = '';

  // Stars on front (single-sided card)
  const starsEl   = g('tStarsFooter');
  const starCount = parseInt(g('starCount').value) || 0;
  starsEl.innerHTML = '';
  if (starCount > 0) {
    const use10 = g('starsUse10')?.checked, use5 = g('starsUse5')?.checked;
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
    starsEl.style.left   = '32px';
    starsEl.style.top    = '478px';
    starsEl.style.bottom = '';
    starsEl.style.display = 'flex';
  } else { starsEl.style.display = 'none'; }

  // Stamp
  const stampEl = g('lStamp');
  if (stampEl) {
    stampEl.src = assetUrl('stamp/wave11_tbc.svg');
    stampEl.style.left    = (starCount > 0 ? 213 : 33) + 'px';
    stampEl.style.top     = '473px';
    stampEl.style.width   = '20px';
    stampEl.style.height  = 'auto';
    stampEl.style.display = 'block';
  }

  // Footer
  g('tWave').textContent    = g('cardWave').value;
  g('tWave').style.left     = '87px';
  g('tWave').style.bottom   = '39px';
  g('tId').textContent      = g('cardId').value;
  g('tId').style.left       = '140px';
  g('tId').style.bottom     = '39px';
  g('tCredit').innerHTML    = g('cardCredit').value || '';
  g('tCredit').style.bottom = '39px';
  g('tCredit').style.right  = '34px';

  saveToStorage();
}

/* ── Artwork loader ───────────────────────────────────────────────────── */
function loadArt(input) {
  const file = input.files[0]; if (!file) return;
  const warnEl = g('artSizeWarning');
  if (warnEl) warnEl.style.display = file.size > 5*1024*1024 ? '' : 'none';
  const reader = new FileReader();
  reader.onload = e => {
    artworkSrc = e.target.result;
    artStore.set('battle_action_bot', artworkSrc).catch(()=>{});
    render();
  };
  reader.readAsDataURL(file);
}

/* ── Zoom ─────────────────────────────────────────────────────────────── */
function applyZoom() {
  const z = zoomLevel === 1 ? '' : String(zoomLevel);
  g('cardsDisplay').style.zoom = z;
  g('zoomDisplay').textContent = Math.round(zoomLevel * 100) + '%';
}
function zoom(delta) { zoomLevel = Math.max(0.3, Math.min(2.5, zoomLevel + delta)); applyZoom(); }
function resetZoom() { zoomLevel = 1; applyZoom(); }

/* ── Section toggle ───────────────────────────────────────────────────── */
function toggleSec(name) {
  g('sec-' + name)?.classList.toggle('collapsed');
  const collapsed = ['type','identity','stats','ability','art','info']
    .filter(n => g('sec-'+n)?.classList.contains('collapsed'));
  try { localStorage.setItem('tfBattleSectionState', JSON.stringify(collapsed)); } catch(e) {}
}
function restoreSections() {
  try {
    const c = JSON.parse(localStorage.getItem('tfBattleSectionState') || '[]');
    c.forEach(n => g('sec-'+n)?.classList.add('collapsed'));
  } catch(e) {}
}

/* ── State / persistence ──────────────────────────────────────────────── */
function getState() {
  return {
    faction:    g('faction').value,
    cardName:   g('cardName').value,
    starCount:  g('starCount').value,
    starsUse5:  g('starsUse5')?.checked  || false,
    starsUse10: g('starsUse10')?.checked || false,
    explanationType: g('explanationType')?.value || '',
    battleIcon1: g('battleIcon1')?.value || '',
    battleIcon2: g('battleIcon2')?.value || '',
    battleIcon3: g('battleIcon3')?.value || '',
    abilityFontSize: g('abilityFontSize').value,
    posAbilityBox:   g('posAbilityBox').value,
    abilityBody:     g('abilityBody').value,
    artPosY:   g('artPosY').value,
    artScale:  g('artScale').value,
    cardWave:  g('cardWave').value,
    cardId:    g('cardId').value,
    cardCredit: g('cardCredit').value,
  };
}

function applyState(s) {
  const set = (id, val) => { if (val !== undefined && g(id)) g(id).value = val; };
  set('faction',    s.faction);
  set('cardName',   s.cardName);
  set('starCount',  s.starCount);
  if (g('starsUse5'))  g('starsUse5').checked  = s.starsUse5  || false;
  if (g('starsUse10')) g('starsUse10').checked = s.starsUse10 || false;
  set('explanationType', s.explanationType);
  set('battleIcon1', s.battleIcon1); set('battleIcon2', s.battleIcon2); set('battleIcon3', s.battleIcon3);
  set('abilityFontSize', s.abilityFontSize);
  set('posAbilityBox',   s.posAbilityBox);
  const posLbl = g('posAbilityBoxVal'); if (posLbl && s.posAbilityBox) posLbl.textContent = s.posAbilityBox + '%';
  set('abilityBody', s.abilityBody);
  set('artPosY', s.artPosY); set('artScale', s.artScale);
  set('cardWave', s.cardWave); set('cardId', s.cardId); set('cardCredit', s.cardCredit);
  render();
}

function saveToStorage() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    try { localStorage.setItem('tfBattleActionState', JSON.stringify(getState())); } catch(e) {}
  }, 300);
}

async function loadFromStorage() {
  try { const raw = localStorage.getItem('tfBattleActionState'); if (raw) applyState(JSON.parse(raw)); } catch(e) {}
  try { const art = await artStore.get('battle_action_bot'); if (art) { artworkSrc = art; render(); } } catch(e) {}
}

function copyJSON() {
  const txt = JSON.stringify(getState(), null, 2);
  navigator.clipboard.writeText(txt)
    .then(() => alert('Card JSON copied!'))
    .catch(() => { const t=document.createElement('textarea'); t.value=txt; document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t); alert('Copied!'); });
}

function resetToDefaults() {
  if (!confirm('Reset to defaults? This clears all card data.')) return;
  try { localStorage.removeItem('tfBattleActionState'); } catch(e) {}
  artStore.del('battle_action_bot').catch(()=>{});
  artworkSrc = null;
  g('faction').value = ''; g('cardName').value = 'CARD NAME';
  g('starCount').value = '0';
  if (g('starsUse5'))  g('starsUse5').checked  = false;
  if (g('starsUse10')) g('starsUse10').checked = false;
  if (g('explanationType')) g('explanationType').value = '';
  if (g('battleIcon1')) g('battleIcon1').value = '';
  if (g('battleIcon2')) g('battleIcon2').value = '';
  if (g('battleIcon3')) g('battleIcon3').value = '';
  g('abilityBody').value = ''; g('abilityFontSize').value = '15';
  g('posAbilityBox').value = '18'; if (g('posAbilityBoxVal')) g('posAbilityBoxVal').textContent = '25%';
  g('artPosY').value = '0'; g('artScale').value = '100';
  g('cardWave').value = ''; g('cardId').value = ''; g('cardCredit').value = 'Designed by SHINJJI';
  if (g('artUpload')) g('artUpload').value = '';
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
  catch(e) { g('jsonError').textContent = '⚠ Invalid JSON - ' + e.message; }
}

/* ── Filename ─────────────────────────────────────────────────────────── */
function buildFilename() {
  const waveNum = (g('cardWave').value || '').match(/\d+/)?.[0] || '0';
  const idMatch = (g('cardId').value   || '').match(/T(\d+)/);
  const cardNum = idMatch ? idMatch[1].padStart(3,'0') : '000';
  return `FMW${waveNum}_B_${cardNum}_f`;
}

/* ── Progress ─────────────────────────────────────────────────────────── */
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
  try { localStorage.setItem('tfBattleActionProgress', JSON.stringify(state)); } catch(e) {}
}
function loadProgressFromStorage() {
  try {
    const raw = localStorage.getItem('tfBattleActionProgress');
    if (raw) { const s=JSON.parse(raw); PROGRESS_STEPS.forEach(k => { const el=g('prog_'+k); if(el&&s[k]!==undefined) el.checked=s[k]; }); }
  } catch(e) {}
  _progressReady = true;
  updateProgress();
}
function resetProgress() {
  PROGRESS_STEPS.forEach(s => { const el=g('prog_'+s); if(el) el.checked=false; });
  updateProgress();
}

/* ── Export ───────────────────────────────────────────────────────────── */
async function exportPNG() {
  const btn = g('exportBtn'); btn.textContent='Generating…'; btn.disabled=true;
  try {
    await exportCard(g('card'), buildFilename()+'.png', { shiftMap: EXPORT_SHIFT, iconNudge: 2 });
  } catch(e) { alert('Export failed: '+e.message); }
  finally { btn.textContent = 'Export PNG ↓'; updateProgress(); }
}

/* ── HTML template ────────────────────────────────────────────────────── */
const FACTIONS_HTML = `<option value="">- None -</option>` + FACTIONS.map(f => `<option>${f}</option>`).join('');

function getHTML() {
  return `
  <div class="controls-panel">

    <div class="section" id="sec-type">
      <div class="section-header" onclick="toggleSec('type')">Card Type <span class="chevron">▾</span></div>
      <div class="section-body">
        <div class="field">
          <label>Sub-type</label>
          <select id="battleSubType">
            <option value="Battle - Action">Battle Action</option>
            <option value="Battle - Upgrade" disabled>Battle Upgrade</option>
          </select>
        </div>
        <div class="field">
          <label>Faction</label>
          <select id="faction" onchange="render()">${FACTIONS_HTML}</select>
        </div>
<div class="field">
          <label>Explanation Badge</label>
          <select id="explanationType" onchange="render()">
            <option value="">- None -</option>
            <option value="Rolling Action">Rolling Action</option>
            <option value="Secret Action">Secret Action</option>
          </select>
        </div>
      </div>
    </div>

    <div class="section" id="sec-identity">
      <div class="section-header" onclick="toggleSec('identity')">Identity <span class="chevron">▾</span></div>
      <div class="section-body">
        <div class="field">
          <label>Name</label>
          <input type="text" id="cardName" value="ARMED TO THE TEETH" oninput="render()">
        </div>
      </div>
    </div>

    <div class="section" id="sec-stats">
      <div class="section-header" onclick="toggleSec('stats')">Stats <span class="chevron">▾</span></div>
      <div class="section-body">
        <div class="field"><label>Battle Icon 1</label><select id="battleIcon1" onchange="render()">${BATTLE_ICON_OPTS_HTML}</select></div>
        <div class="field"><label>Battle Icon 2</label><select id="battleIcon2" onchange="render()">${BATTLE_ICON_OPTS_HTML}</select></div>
        <div class="field"><label>Battle Icon 3</label><select id="battleIcon3" onchange="render()">${BATTLE_ICON_OPTS_HTML}</select></div>
        <div class="field">
          <label>Stars</label>
          <input type="number" id="starCount" value="0" min="0" max="30" oninput="render()">
        </div>
        <div style="display:flex;gap:14px;">
          <label style="display:flex;align-items:center;gap:5px;font-size:10px;color:var(--label);cursor:pointer;"><input type="checkbox" id="starsUse5" onchange="render()"> Use 5s</label>
          <label style="display:flex;align-items:center;gap:5px;font-size:10px;color:var(--label);cursor:pointer;"><input type="checkbox" id="starsUse10" onchange="render()"> Use 10s</label>
        </div>
      </div>
    </div>

    <div class="section" id="sec-ability">
      <div class="section-header" onclick="toggleSec('ability')">Ability Text <span class="chevron">▾</span></div>
      <div class="section-body">
        <div class="row-2">
          <div class="field"><label>Font Size</label><input type="number" id="abilityFontSize" value="15" min="4" max="20" step="0.5" oninput="render()"></div>
        </div>
        <div class="field"><label>Text</label><textarea id="abilityBody" oninput="render()" style="min-height:120px;"></textarea></div>
        <div class="field"><label>Position</label><div style="display:flex;align-items:center;gap:6px;"><input type="range" id="posAbilityBox" min="0" max="50" step="0.1" value="18" oninput="g('posAbilityBoxVal').textContent=this.value+'%';render()" style="flex:1;"><span id="posAbilityBoxVal" style="font-size:10px;color:var(--muted);min-width:34px;">25%</span></div></div>
      </div>
    </div>

    <div class="section" id="sec-art">
      <div class="section-header" onclick="toggleSec('art')">Artwork <span class="chevron">▾</span></div>
      <div class="section-body">
        <div class="field">
          <input type="file" id="artUpload" accept="image/*" onchange="loadArt(this)" style="font-size:11px;color:var(--muted);cursor:pointer;padding:4px 0;">
          <span id="artSizeWarning" style="display:none;font-size:10px;color:#e67e22;">⚠ Image over 5 MB.</span>
        </div>
        <div class="field"><label>Vertical Position</label><input type="range" id="artPosY" min="-100" max="100" value="0" oninput="render()" style="padding:0;border:none;background:none;"></div>
        <div class="field"><label>Scale</label><input type="range" id="artScale" min="50" max="220" value="100" oninput="render()" style="padding:0;border:none;background:none;"></div>
      </div>
    </div>

    <div class="section" id="sec-info">
      <div class="section-header" onclick="toggleSec('info')">Card Details <span class="chevron">▾</span></div>
      <div class="section-body">
        <div class="row-2">
          <div class="field"><label>Wave</label><input type="text" id="cardWave" value="WAVE 8" oninput="render()"></div>
          <div class="field"><label>Card ID</label><input type="text" id="cardId" value="" oninput="render()"></div>
        </div>
        <div class="field"><label>Credits</label><input type="text" id="cardCredit" value="Designed by SHINJJI" oninput="render()"></div>
      </div>
    </div>

    <div class="btn-row">
      <button class="btn btn-secondary" onclick="copyJSON()">Copy JSON</button>
      <button class="btn btn-secondary" onclick="loadJSON()">Load JSON</button>
    </div>
    <button class="btn btn-primary" id="exportBtn" onclick="exportPNG()">Export PNG ↓</button>
    <button class="btn btn-secondary" onclick="resetToDefaults()" style="width:100%;margin-top:2px;color:#e05a5a;border-color:#5a2a2a;flex-grow:0;">↺ Reset to Defaults</button>

  </div><!-- .controls-panel -->

  <!-- ── CENTER: Card Preview ── -->
  <div class="preview-area">
    <div class="cards-display" id="cardsDisplay">
      <div class="card-col">
        <div class="card-col-label" id="frontLabel">BATTLE ACTION</div>
        <div class="card-wrapper" id="cardWrapper">
          <div class="card" id="card">
            <img id="lArt" class="card-layer" style="display:none;object-fit:cover;object-position:center top;mix-blend-mode:normal;">
            <img id="lGradient"      class="card-layer" alt="">
            <img id="lHeaderMask"    class="card-layer" alt="">
            <img id="lTextbox"       class="card-layer" alt="">
            <img id="lExplanation"   class="card-layer" alt="" style="display:none;">
            <img id="lMainFrame"     class="card-layer" alt="">
            <img id="lSetSlash"      class="card-layer" alt="">
            <img id="lStarSep"       class="card-layer" alt="" style="display:none;">
            <img id="lModeBox"       class="card-layer" alt="" style="display:none;">
            <img id="lHeaderBg"      class="card-layer" alt="">
            <img id="lHeaderOverlay" class="card-layer" alt="">
            <img id="lHeaderLines"   class="card-layer" alt="">
            <img id="lFactionFrame"  class="card-layer" alt="">
            <img id="lFactionIcon"   class="card-layer" alt="">

            <div id="tCyberName" class="card-text" style="top:2%;right:2%;font-family:'CybertonicFont',sans-serif;font-size:13px;color:rgba(80,80,80,0.85);text-transform:uppercase;letter-spacing:-0.5px;text-align:right;white-space:nowrap;overflow:hidden;pointer-events:none;"></div>
            <div id="tName" class="card-text" style="font-family:'BayformersName','Segoe UI',sans-serif;font-size:32px;color:#1a1a1a;text-transform:uppercase;letter-spacing:-0.5px;line-height:1;white-space:nowrap;overflow:hidden;"></div>
            <div id="abilityBoxWide" class="card-text" style="bottom:6%;left:8%;right:8%;font-size:8.5px;line-height:1.55;color:#1a1a1a;text-align:center;">
              <div id="tAbilityBodyWide" style="font-family:'GothamNarrow','Arial',sans-serif;"></div>
              <div id="tAbilityParenWide" style="font-style:italic;font-family:'GothamNarrowItalic','Georgia',serif;margin-top:4px;"></div>
            </div>
            <span id="tWave"   class="card-text" style="font-size:10px;color:#fff;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;font-family:'OpenSansBold',sans-serif;bottom:4.6%;left:3%;"></span>
            <span id="tId"     class="card-text" style="font-size:10px;font-weight:700;color:#fff;letter-spacing:0.5px;font-family:'OpenSansBold',sans-serif;bottom:4.6%;left:30%;white-space:pre;"></span>
            <div  id="tCredit" class="card-text" style="font-size:10px;color:#fff;text-align:right;line-height:1.35;font-family:'OpenSansBold',sans-serif;bottom:4.6%;right:3%;"></div>
            <div  id="tStarsFooter" class="card-text" style="display:none;bottom:5%;left:9.7%;align-items:center;gap:2px;"></div>
            <div id="tBattleIcons" class="card-text" style="top:0;right:0;display:flex;flex-direction:column;align-items:center;pointer-events:none;"></div>
            <img id="lStamp" class="card-text" style="display:none;position:absolute;pointer-events:none;">
            <div id="tActionLabel" class="card-text" style="font-family:'BattleCardType',sans-serif;font-size:13px;color:#1a1a1a;text-transform:uppercase;letter-spacing:0px;pointer-events:none;"></div>
          </div><!-- .card -->
        </div>
      </div>
    </div>
  </div><!-- .preview-area -->

  <!-- ── RIGHT: Progress panel ── -->
  <div class="layers-panel">
    <div class="layers-title">Progress</div>
    <div class="progress-bar-track"><div class="progress-bar-fill" id="progressBarFill"></div></div>
    <div class="progress-label" id="progressLabel">0 / 6 complete</div>
    <div class="progress-steps">
      <label class="progress-step"><input type="checkbox" id="prog_faction"  onchange="updateProgress()"><div class="progress-step-body"><span class="progress-step-name">Card Type &amp; Faction</span></div></label>
      <label class="progress-step"><input type="checkbox" id="prog_identity" onchange="updateProgress()"><div class="progress-step-body"><span class="progress-step-name">Identity</span></div></label>
      <label class="progress-step"><input type="checkbox" id="prog_stats"    onchange="updateProgress()"><div class="progress-step-body"><span class="progress-step-name">Stats</span></div></label>
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

/* ── Composer interface ───────────────────────────────────────────────── */
const GLOBALS = ['render','loadArt','zoom','resetZoom','toggleSec',
  'copyJSON','loadJSON','closeJSONModal','confirmLoadJSON',
  'exportPNG','updateProgress','resetToDefaults'];

function init(mountEl) {
  mountEl.innerHTML = getHTML();

  _modalEl = document.createElement('div');
  _modalEl.innerHTML = MODAL_HTML;
  document.body.appendChild(_modalEl.firstElementChild);

  const fns = { render, loadArt, zoom, resetZoom, toggleSec,
    copyJSON, loadJSON, closeJSONModal, confirmLoadJSON,
    exportPNG, updateProgress, resetToDefaults };
  GLOBALS.forEach(k => { window[k] = fns[k]; });

  loadFromStorage();
  loadProgressFromStorage();
  restoreSections();
  Promise.all([preconvertBlackImages(), preconvertTraitIcons()])
    .then(() => render());

  window.addEventListener('beforeunload', _onUnload);
}

function _onUnload() {
  try { localStorage.setItem('tfBattleActionState', JSON.stringify(getState())); } catch(e) {}
}

function destroy() {
  _onUnload();
  window.removeEventListener('beforeunload', _onUnload);
  GLOBALS.forEach(k => { delete window[k]; });
  const modal = g('jsonModal');
  if (modal) modal.parentNode?.removeChild(modal);
  _modalEl = null;
  artworkSrc = null;
  _progressReady = false;
}

window.Composers.battle_action = { init, destroy };

})();
