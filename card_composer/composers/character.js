/* ── composers/character.js ───────────────────────────────────────────────
   Character card composer (Standard, Slim, Small).
   Registers as Composers.character = { init, destroy }.
   ──────────────────────────────────────────────────────────────────────── */

(function () {
'use strict';

/* ── Data ──────────────────────────────────────────────────────────────── */
const FACTIONS = ['Autobot','Decepticon','Junkion','Mercenary','Quintesson','Unicronian'];

const TRAIT_X_BASE     = { 1: -20, 2: -4, 3: 12, 4: 29 };
const TRAIT_X_DEFAULTS = { 1: 0, 2: 0, 3: 0, 4: 0 };

const CARD_CONFIGS = {
  'Character - Standard': {
    folder: 'character',
    hasFaction: true, hasModeBox: true, hasTraits: true, hasHeaderMask: true,
    hasStats: true, isStratagem: false,
    maxTraits: 4,
    modeBoxOptions: ['1 Mode','One Mode','2 Modes','3 Modes','Choose One'],
    traitBarTop: '12.5%',
    artTop: '16%',
  },
  'Character - Slim': {
    folder: 'character',
    hasFaction: true, hasModeBox: true, hasTraits: true, hasHeaderMask: false,
    hasStats: true, isStratagem: false,
    maxTraits: 4,
    modeBoxOptions: ['One Mode','2 Modes','3 Modes','Choose One'],
    traitBarTop: '12.5%',
    artTop: '16%',
  },
  'Character - Small': {
    folder: 'character',
    hasFaction: true, hasModeBox: true, hasTraits: true, hasHeaderMask: true,
    hasStats: true, isStratagem: false,
    maxTraits: 4,
    modeBoxOptions: ['1 Mode','2 Modes','3 Modes','Choose One'],
    traitBarTop: '12.5%',
    artTop: '16%',
  },
};

/* ── Module state ──────────────────────────────────────────────────────── */
let artworkSrc    = null;
let altArtworkSrc = null;
let zoomLevel     = 1;
let _saveTimer    = null;
let _progressReady = false;
let _modalEl      = null;

const PROGRESS_STEPS = ['type','identity','traits','stats','ability','artwork','info'];

const EXPORT_SHIFT = {
  tCyberName:   2,
  tName:        1,
  tSubtitle:    2,
  tTraitBar:    2,
  statsBar:     2,
  tModeLabel:   1,
  abilityBox:   2,
  altModePanel: 1,
  tWave:        2,
  tId:          2,
  tCredit:      2,
  tStarsFooter: 0,
};

/* ── Layer helper (local alias for clarity) ────────────────────────────── */
// setLayer is defined in shared.js

/* ── Build trait row controls ─────────────────────────────────────────── */
function buildTraitRows() {
  const traitOpts = TRAIT_NAMES.map(n => `<option value="${n}">${n}</option>`).join('');
  const mkRow = (prefix, i) => `
    <div class="trait-row">
      <span class="trait-num">${i}</span>
      <select id="${prefix ? prefix+'Trait' : 'trait'}Type${i}" class="main" onchange="render()">
        <option value="">— None —</option>${traitOpts}
      </select>
      <select id="${prefix ? prefix+'Trait' : 'trait'}Size${i}" class="size" onchange="render()">
        <option value="Short">Short</option>
        <option value="Long">Long</option>
      </select>
    </div>`;

  const bot = g('traitRows');
  if (bot) { bot.innerHTML = ''; for (let i = 1; i <= 4; i++) bot.insertAdjacentHTML('beforeend', mkRow('', i)); }

  const alt = g('altTraitRows');
  if (alt) { alt.innerHTML = ''; for (let i = 1; i <= 4; i++) alt.insertAdjacentHTML('beforeend', mkRow('alt', i)); }

  const sliders = g('traitXSliderRows');
  if (sliders) {
    sliders.innerHTML = '';
    for (let i = 1; i <= 4; i++) {
      const def = TRAIT_X_DEFAULTS[i] ?? 0;
      sliders.insertAdjacentHTML('beforeend', `
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="font-size:10px;color:var(--muted);min-width:12px;">${i}</span>
          <input type="range" id="traitOffX${i}" min="-60" max="60" value="${def}"
            style="flex:1;" oninput="g('traitOffXVal${i}').textContent=this.value;render()">
          <span id="traitOffXVal${i}" style="font-size:10px;color:var(--muted);min-width:28px;text-align:right;">${def}</span>
        </div>`);
    }
  }
}

/* ── Update UI when card sub-type changes ─────────────────────────────── */
function onTypeChange() {
  const config = CARD_CONFIGS[g('cardType').value];
  const modeBoxSel = g('modeBox');
  const current = modeBoxSel.value;
  modeBoxSel.innerHTML = '<option value="">- None -</option>' +
    config.modeBoxOptions.map(o =>
      `<option value="${o}"${o===current?' selected':''}>${o}</option>`
    ).join('');

  g('sec-traits').style.display  = config.hasTraits  ? '' : 'none';
  g('sec-stats').style.display   = config.hasStats   ? '' : 'none';
  g('modeBoxRow').style.display  = config.hasModeBox ? '' : 'none';
  g('altStatsRow').style.display = config.hasModeBox ? '' : 'none';
  g('faction2Field').style.display = config.hasFaction ? '' : 'none';

  const lbl = ['BOT MODE','ALT MODE'];
  g('frontLabel').textContent = lbl[0];
  g('backLabel').textContent  = lbl[1];

  const subLabel = config.isStratagem ? 'Stratagem Name / Target' : 'Subtitle';
  const subLbl = g('cardSubtitle')?.previousElementSibling;
  if (subLbl) subLbl.textContent = subLabel;

  buildTraitRows();
  render();
}

/* ── Main render ──────────────────────────────────────────────────────── */
function render() {
  const typeKey = g('cardType').value;
  const config  = CARD_CONFIGS[typeKey];
  if (!config) return;
  const folder  = config.folder;
  const faction = g('faction').value;
  const cp      = comp => cc(folder, `${typeKey} - ${comp}.png`);

  const ALL_LAYERS = ['lGradient','lHeaderBg','lHeaderLines','lHeaderOverlay','lHeaderOverlay2',
    'lMainFrame','lFactionFrame','lFactionIcon','lFactionIcon2','lFactionDual',
    'lTrait1','lTrait2','lTrait3','lTrait4',
    'lModeBox','lSetSlash','lStarSep','lTextbox','lHeaderMask'];
  ALL_LAYERS.forEach(id => setLayer(id, null));

  // Character layers
  setLayer('lGradient',      cp('Gradient'));
  setLayer('lHeaderBg',      cp('Header Background'));
  setLayer('lHeaderLines',   cp('Header Lines'));
  setLayer('lHeaderOverlay', cp(`Header Overlay ${faction}`));
  setLayer('lMainFrame',     cp('Main Frame'));
  setLayer('lFactionFrame',  cp('Faction Icon Frame'));

  const faction2    = g('faction2')?.value || '';
  const iconEl      = g('lFactionIcon');
  const icon2El     = g('lFactionIcon2');
  const overlay2El  = g('lHeaderOverlay2');
  const SPLIT = '85.6%';
  if (faction2) {
    if (iconEl)  iconEl.style.clipPath  = `polygon(0 0, ${SPLIT} 0, ${SPLIT} 100%, 0 100%)`;
    if (icon2El) icon2El.style.clipPath = `polygon(${SPLIT} 0, 100% 0, 100% 100%, ${SPLIT} 100%)`;
    setLayer('lFactionIcon',    cp(`Faction Icon ${faction}`));
    setLayer('lFactionIcon2',   cp(`Faction Icon ${faction2}`));
    setLayer('lFactionDual',    cp('Faction Icon Frame Dual-Faction'));
    setLayer('lHeaderOverlay2', cp(`Header Overlay ${faction2}`));
    if (overlay2El) {
      const fade = 'linear-gradient(to right, transparent 20%, black 60%)';
      overlay2El.style.webkitMaskImage = fade;
      overlay2El.style.maskImage       = fade;
    }
  } else {
    if (iconEl)  iconEl.style.clipPath  = '';
    if (icon2El) icon2El.style.clipPath = '';
    setLayer('lFactionIcon',    cp(`Faction Icon ${faction}`));
    setLayer('lFactionIcon2',   null);
    setLayer('lFactionDual',    null);
    setLayer('lHeaderOverlay2', null);
    if (overlay2El) { overlay2El.style.webkitMaskImage = ''; overlay2El.style.maskImage = ''; }
  }

  setLayer('lTextbox', cp('Textbox'));
  const lTextboxEl = g('lTextbox'); if (lTextboxEl) lTextboxEl.style.opacity = '0.85';
  setLayer('lSetSlash', cp('Set Slash'));
  if (config.hasHeaderMask) setLayer('lHeaderMask', cp('Header Mask'));

  const modeBoxVal = g('modeBox').value;
  if (modeBoxVal) setLayer('lModeBox', cp(`ModeBox ${modeBoxVal}`));

  // Trait image layers
  const SCALE = 0.48;
  const BAR_H = Math.round(60 * SCALE);
  const GAP   = -26;
  for (let i = 1; i <= 4; i++) { const el = g(`lTrait${i}`); if (el) { el.style.cssText = ''; el.style.display = 'none'; } }
  if (config.hasTraits && config.traitBarTop) {
    const traitTopPx = parseFloat(config.traitBarTop) / 100 * 530;
    let offsetRight = 380;
    for (let slot = 1; slot <= 4; slot++) {
      const size = g(`traitSize${slot}`)?.value || 'Short';
      const nw   = size === 'Long' ? 393 : 270;
      const displayW = Math.round(nw * SCALE);
      offsetRight -= displayW + GAP;
      const el = g(`lTrait${slot}`);
      if (!el) continue;
      if (g(`traitType${slot}`)?.value) {
        const xAdj = parseInt(g(`traitOffX${slot}`)?.value) || 0;
        el.src = cp(`Trait ${slot} ${size}`);
        el.style.cssText = `position:absolute;display:block;pointer-events:none;top:${traitTopPx}px;left:${offsetRight+(TRAIT_X_BASE[slot]||0)+xAdj}px;width:${displayW}px;height:${BAR_H}px;object-fit:fill;`;
      } else {
        el.style.display = 'none';
      }
    }
  }

  // Artwork
  const artEl = g('lArt');
  if (artworkSrc) {
    const posY    = parseInt(g('artPosY').value)  || 0;
    const scale   = parseInt(g('artScale').value) || 100;
    const baseTop = parseFloat(config.artTop) || 16;
    artEl.src                  = artworkSrc;
    artEl.style.display        = '';
    artEl.style.top            = (baseTop + posY * 0.4) + '%';
    artEl.style.height         = scale + '%';
    artEl.style.width          = '100%';
    artEl.style.objectFit      = 'cover';
    artEl.style.objectPosition = 'center top';
  } else {
    artEl.src = ''; artEl.style.display = 'none';
  }

  // Name
  const nameText = (g('cardName').value || 'CARD NAME').toUpperCase();
  g('tName').textContent = nameText;
  if (g('tCyberName')) g('tCyberName').textContent = nameText;

  // Subtitle
  const subtitle = (g('cardSubtitle').value || '').toUpperCase();
  g('tSubtitle').style.display = '';
  g('tSubtitle').textContent   = subtitle;

  // Ability position sliders
  const posAbilityBox = parseFloat(g('posAbilityBox')?.value) ?? 14;
  g('abilityBox').style.bottom     = posAbilityBox + '%';
  g('abilityBoxWide').style.bottom = posAbilityBox + '%';
  g('statsBar').style.bottom       = '27.7%';
  g('tModeLabel').style.bottom     = '26.6%';
  g('altModePanel').style.bottom   = '17%';
  g('altModePanel').style.right    = '8.1%';

  // Stats bar
  g('statsBar').style.display = config.hasStats ? 'flex' : 'none';
  if (config.hasStats) {
    g('tAtk').textContent = g('statAtk').value || '0';
    g('tHp').textContent  = g('statHp').value  || '0';
    g('tDef').textContent = g('statDef').value || '0';
    g('tModeLabel').textContent = 'BOT MODE';
  }

  // Alt mode stats panel
  const showAltMode = config.hasModeBox && modeBoxVal &&
                      modeBoxVal !== 'One Mode' && modeBoxVal !== '1 Mode' && modeBoxVal !== 'Choose One';
  g('altModePanel').style.display = showAltMode ? '' : 'none';
  if (showAltMode) {
    g('tAltModeLabel').textContent = 'ALT';
    g('tAltAtk').textContent = g('altAtk').value || '0';
    g('tAltDef').textContent = g('altDef').value || '0';
  }

  // Trait text overlay
  const traitBarEl = g('tTraitBar');
  const T_SCALE = 0.48, T_BAR_H = Math.round(60 * T_SCALE), T_GAP = -26;
  if (config.hasTraits && config.traitBarTop) {
    const traitTopPx = parseFloat(config.traitBarTop) / 100 * 530;
    traitBarEl.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;display:block;';
    traitBarEl.innerHTML = '';
    let offsetRight = 380;
    for (let slot = 1; slot <= 4; slot++) {
      const size     = g(`traitSize${slot}`)?.value || 'Short';
      const nw       = size === 'Long' ? 393 : 270;
      const displayW = Math.round(nw * T_SCALE);
      offsetRight   -= displayW + T_GAP;
      const traitName = g(`traitType${slot}`)?.value || '';
      if (!traitName) continue;
      const xAdj  = parseInt(g(`traitOffX${slot}`)?.value) || 0;
      const leftPx = offsetRight + (TRAIT_X_BASE[slot]||0) + xAdj + 21;
      const item = document.createElement('div');
      item.style.cssText = `position:absolute;top:${traitTopPx}px;left:${leftPx}px;width:${displayW}px;height:${T_BAR_H}px;display:flex;align-items:center;gap:8px;padding:0 6px;overflow:hidden;`;
      item.innerHTML =
        `<img src="${_traitIconCache.get(traitName) || cc('traits','Trait - '+traitName+'.png')}" width="17" height="17" style="width:17px;height:17px;flex-shrink:0;position:relative;top:3px;">` +
        `<span style="font-size:8px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:0.5px;font-family:'OpenSansSemiBold',sans-serif;white-space:nowrap;">${traitName.toUpperCase()}</span>`;
      traitBarEl.appendChild(item);
    }
  } else {
    traitBarEl.style.display = 'none';
  }

  // Ability text
  const useWide    = !config.hasStats;
  const aFontSize  = parseFloat(g('abilityFontSize')?.value) || 7.5;
  g('abilityBox').style.display      = useWide ? 'none' : '';
  g('abilityBox').style.fontSize     = aFontSize + 'px';
  g('abilityBoxWide').style.display  = useWide ? '' : 'none';
  g('abilityBoxWide').style.fontSize = aFontSize + 'px';
  const aBody = g('abilityBody').value;
  if (useWide) {
    g('tAbilityBodyWide').innerHTML    = formatAbilityText(aBody);
    g('tAbilityParenWide').textContent = '';
  } else {
    g('tAbilityName').textContent  = '';
    g('tAbilityParen').textContent = '';
    g('tAbilityBody').innerHTML    = formatAbilityText(aBody);
  }

  // Stars — on back card only; hidden here
  g('tStarsFooter').style.display = 'none';
  g('tStarsFooter').innerHTML     = '';

  // Footer
  g('tWave').textContent    = g('cardWave').value;
  g('tWave').style.left     = '10.9%';
  g('tId').textContent      = g('cardId').value;
  g('tId').style.left       = '24.2%';
  g('tCredit').innerHTML    = g('cardCredit').value || '';
  g('tCredit').style.bottom = '4.6%';
  g('tCredit').style.right  = '22.2%';

  saveToStorage();
  renderBack();
}

/* ── Back card render ─────────────────────────────────────────────────── */
function renderBack() {
  if (!g('b_card')) return;
  const p      = id => g('b_' + id);
  const config = CARD_CONFIGS[g('cardType').value];
  if (!config) return;

  // Mirror all layer images
  const ALL_LAYERS = ['lGradient','lHeaderBg','lHeaderLines','lHeaderOverlay','lHeaderOverlay2',
    'lMainFrame','lFactionFrame','lFactionIcon','lFactionIcon2','lFactionDual',
    'lTrait1','lTrait2','lTrait3','lTrait4','lModeBox','lTextbox','lHeaderMask'];
  ALL_LAYERS.forEach(id => {
    const f = g(id), b = p(id);
    if (!f || !b) return;
    b.src = f.src; b.style.cssText = f.style.cssText;
  });

  // Alt artwork
  const bArtEl = p('lArt');
  if (bArtEl) {
    if (altArtworkSrc) {
      const posY    = parseInt(g('altArtPosY')?.value)  || 0;
      const scale   = parseInt(g('altArtScale')?.value) || 100;
      const baseTop = parseFloat(config.artTop) || 16;
      bArtEl.src = altArtworkSrc; bArtEl.style.display = '';
      bArtEl.style.top = (baseTop + posY * 0.4) + '%';
      bArtEl.style.height = scale + '%'; bArtEl.style.width = '100%';
      bArtEl.style.objectFit = 'cover'; bArtEl.style.objectPosition = 'center top';
    } else { bArtEl.src = ''; bArtEl.style.display = 'none'; }
  }

  // Set Slash + Stamp — front only
  const bSetSlash = p('lSetSlash'); if (bSetSlash) { bSetSlash.src = ''; bSetSlash.style.display = 'none'; }
  const bStamp    = p('lStamp');    if (bStamp)    bStamp.style.display = 'none';

  // Stars + star separator — alt card only
  const bStarSep     = p('lStarSep');
  const bStarsFooter = p('tStarsFooter');
  let starCount = parseInt(g('starCount').value) || 0;
  if (starCount > 0 && bStarSep) {
    bStarSep.src = cc(config.folder, `${g('cardType').value} - Star Separator.png`);
    bStarSep.style.display = '';
  } else if (bStarSep) { bStarSep.src = ''; bStarSep.style.display = 'none'; }
  if (bStarsFooter) {
    bStarsFooter.style.bottom = '5%';
    bStarsFooter.innerHTML = '';
    if (starCount > 0) {
      const use10 = g('starsUse10')?.checked, use5 = g('starsUse5')?.checked;
      const imgs = [];
      let sc = starCount;
      if (use10) { const n = Math.floor(sc/10); sc%=10; for(let i=0;i<n;i++) imgs.push(10); }
      if (use5)  { const n = Math.floor(sc/5);  sc%=5;  for(let i=0;i<n;i++) imgs.push(5);  }
      for (let i=0; i<sc; i++) imgs.push(1);
      let running = 0;
      imgs.forEach(v => {
        if (!use5 && !use10 && running>0 && running%5===0) {
          const sp = document.createElement('span'); sp.style.cssText='width:4px;flex-shrink:0;'; bStarsFooter.appendChild(sp);
        }
        const img = document.createElement('img');
        img.src = cc('icons', `Icon - Stars ${v}.png`); img.style.cssText='height:12px;width:auto;';
        bStarsFooter.appendChild(img); running+=v;
      });
      bStarsFooter.style.display = 'flex';
    } else { bStarsFooter.style.display = 'none'; }
  }

  // Alt trait image layers
  const SCALE=0.48, T_BAR_H=Math.round(60*0.48), GAP=-26;
  const traitTopPx = config.traitBarTop ? parseFloat(config.traitBarTop)/100*530 : 0;
  for (let slot=1; slot<=4; slot++) {
    const traitEl = p(`lTrait${slot}`); if (!traitEl) continue;
    const size = g(`altTraitSize${slot}`)?.value || g(`traitSize${slot}`)?.value || 'Short';
    const nw   = size==='Long' ? 393 : 270;
    const displayW = Math.round(nw * SCALE);
    if (g(`altTraitType${slot}`)?.value) {
      const xAdj = parseInt(g(`traitOffX${slot}`)?.value) || 0;
      traitEl.src = cc(config.folder, `${g('cardType').value} - Trait ${slot} ${size}.png`);
      traitEl.style.cssText = `position:absolute;display:block;pointer-events:none;top:${traitTopPx}px;left:${380-(Math.round(nw*SCALE)+GAP)*(slot-1)-(Math.round(nw*SCALE)+GAP)+(TRAIT_X_BASE[slot]||0)+xAdj}px;width:${displayW}px;height:${T_BAR_H}px;object-fit:fill;`;
    } else { traitEl.style.display = 'none'; }
  }

  // Re-render alt trait text overlay
  const backTraitBar = p('tTraitBar');
  if (backTraitBar && config.hasTraits && config.traitBarTop) {
    backTraitBar.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;display:block;';
    backTraitBar.innerHTML = '';
    let oR = 380;
    for (let slot=1; slot<=4; slot++) {
      const size = g(`altTraitSize${slot}`)?.value || g(`traitSize${slot}`)?.value || 'Short';
      const nw   = size==='Long' ? 393 : 270;
      const displayW = Math.round(nw*SCALE);
      oR -= displayW + GAP;
      const traitName = g(`altTraitType${slot}`)?.value || '';
      if (!traitName) continue;
      const xAdj   = parseInt(g(`traitOffX${slot}`)?.value) || 0;
      const leftPx = oR + (TRAIT_X_BASE[slot]||0) + xAdj + 21;
      const item = document.createElement('div');
      item.style.cssText = `position:absolute;top:${traitTopPx}px;left:${leftPx}px;width:${displayW}px;height:${T_BAR_H}px;display:flex;align-items:center;gap:8px;padding:0 6px;overflow:hidden;`;
      item.innerHTML =
        `<img src="${_traitIconCache.get(traitName) || cc('traits','Trait - '+traitName+'.png')}" width="17" height="17" style="width:17px;height:17px;flex-shrink:0;position:relative;top:3px;">` +
        `<span style="font-size:8px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:0.5px;font-family:'OpenSansSemiBold',sans-serif;white-space:nowrap;">${traitName.toUpperCase()}</span>`;
      backTraitBar.appendChild(item);
    }
  }

  // Mirror style blocks + HTML
  ['statsBar','abilityBox','abilityBoxWide','altModePanel','tSubtitle'].forEach(id => {
    const f = g(id), b = p(id);
    if (f && b) { b.style.cssText = f.style.cssText; b.innerHTML = f.innerHTML; }
  });
  ['tName','tCredit','tCyberName'].forEach(id => {
    const f = g(id), b = p(id); if (f && b) b.textContent = f.textContent;
  });
  const bWave = p('tWave'); if (bWave) { bWave.textContent=''; bWave.style.display='none'; }
  const bId   = p('tId');   if (bId)   { bId.textContent='';   bId.style.display='none'; }
  const bCredit = p('tCredit');
  if (bCredit) { bCredit.style.bottom = '4.6%'; bCredit.style.right = '22.2%'; }

  if (!config.hasStats) return;

  // Swap stats for alt mode
  const bCard = g('b_card');
  const bq = id => bCard?.querySelector('#' + id);
  const bAtk = bq('tAtk'); if (bAtk) bAtk.textContent = g('altAtk').value || '0';
  const bDef = bq('tDef'); if (bDef) bDef.textContent = g('altDef').value || '0';
  const bModeLabel    = p('tModeLabel');      if (bModeLabel)    bModeLabel.textContent    = 'ALT MODE';
  const bAltModeLabel = bq('tAltModeLabel'); if (bAltModeLabel) bAltModeLabel.textContent = 'BOT';
  const bAltAtk = bq('tAltAtk'); if (bAltAtk) bAltAtk.textContent = g('statAtk').value || '0';
  const bAltDef = bq('tAltDef'); if (bAltDef) bAltDef.textContent = g('statDef').value || '0';

  // Alt ability text
  const aBody      = g('altAbilityBody').value || '';
  const aFontSize  = parseFloat(g('altAbilityFontSize')?.value) || 7.5;
  const useWide    = !config.hasStats;
  const posAlt     = parseFloat(g('posAltAbilityBox')?.value) ?? 14;
  const bAbilityBox     = g('b_abilityBox');
  const bAbilityBoxWide = g('b_abilityBoxWide');
  if (bAbilityBox)     { bAbilityBox.style.fontSize = aFontSize+'px'; bAbilityBox.style.bottom = posAlt+'%'; }
  if (bAbilityBoxWide) { bAbilityBoxWide.style.fontSize = aFontSize+'px'; bAbilityBoxWide.style.bottom = posAlt+'%'; }
  if (useWide) {
    const bAbWide = bq('tAbilityBodyWide');  if (bAbWide) bAbWide.innerHTML = formatAbilityText(aBody);
    const bApWide = bq('tAbilityParenWide'); if (bApWide) bApWide.textContent = '';
  } else {
    const bAbName  = bq('tAbilityName');  if (bAbName)  bAbName.textContent  = '';
    const bAbParen = bq('tAbilityParen'); if (bAbParen) bAbParen.textContent = '';
    const bAbBody  = bq('tAbilityBody');  if (bAbBody)  bAbBody.innerHTML    = formatAbilityText(aBody);
  }
}

/* ── Artwork loader ───────────────────────────────────────────────────── */
function loadArt(input, mode) {
  const file = input.files[0]; if (!file) return;
  const isAlt  = mode === 'alt';
  const warnEl = g(isAlt ? 'altArtSizeWarning' : 'artSizeWarning');
  if (warnEl) warnEl.style.display = file.size > 5*1024*1024 ? '' : 'none';
  const reader = new FileReader();
  reader.onload = e => {
    if (isAlt) { altArtworkSrc = e.target.result; artStore.set('character_alt', altArtworkSrc).catch(()=>{}); renderBack(); }
    else        { artworkSrc   = e.target.result; artStore.set('character_bot', artworkSrc).catch(()=>{});    render(); }
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
  g('sec-' + name).classList.toggle('collapsed');
  const collapsed = ['type','identity','traits','stats','ability','art','info']
    .filter(n => g('sec-'+n)?.classList.contains('collapsed'));
  try { localStorage.setItem('tfCharSectionState', JSON.stringify(collapsed)); } catch(e) {}
}
function restoreSections() {
  try {
    const c = JSON.parse(localStorage.getItem('tfCharSectionState') || '[]');
    c.forEach(n => g('sec-'+n)?.classList.add('collapsed'));
  } catch(e) {}
}

/* ── JSON state ───────────────────────────────────────────────────────── */
function getState() {
  const traits = [1,2,3,4].map(i => ({
    type:    g(`traitType${i}`)?.value    || '',
    size:    g(`traitSize${i}`)?.value    || 'Short',
    xOffset: parseInt(g(`traitOffX${i}`)?.value) || 0,
  }));
  return {
    cardType: g('cardType').value,
    faction:  g('faction').value,
    faction2: g('faction2')?.value || '',
    cardName: g('cardName').value,
    cardSubtitle: g('cardSubtitle').value,
    starCount: g('starCount').value,
    starsUse5:  g('starsUse5')?.checked  || false,
    starsUse10: g('starsUse10')?.checked || false,
    modeBox: g('modeBox').value,
    statAtk: g('statAtk').value,
    statHp:  g('statHp').value,
    statDef: g('statDef').value,
    altAtk:  g('altAtk').value,
    altDef:  g('altDef').value,
    traits,
    altTraits: [1,2,3,4].map(i => ({
      type: g(`altTraitType${i}`)?.value || '',
      size: g(`altTraitSize${i}`)?.value || 'Short',
    })),
    abilityFontSize:    g('abilityFontSize').value,
    altAbilityFontSize: g('altAbilityFontSize').value,
    posAbilityBox:    g('posAbilityBox').value,
    posAltAbilityBox: g('posAltAbilityBox').value,
    abilityBody:    g('abilityBody').value,
    altAbilityBody: g('altAbilityBody').value,
    artPosY:   g('artPosY').value,
    artScale:  g('artScale').value,
    altArtPosY:  g('altArtPosY')?.value  || '0',
    altArtScale: g('altArtScale')?.value || '100',
    cardWave:   g('cardWave').value,
    cardId:     g('cardId').value,
    cardCredit: g('cardCredit').value,
  };
}

function applyState(s) {
  const set = (id, val) => { if (val !== undefined && g(id)) g(id).value = val; };
  set('cardType', s.cardType);
  set('faction',  s.faction);
  set('cardName', s.cardName);
  set('cardSubtitle', s.cardSubtitle);
  set('starCount', s.starCount);
  if (g('starsUse5'))  g('starsUse5').checked  = s.starsUse5  || false;
  if (g('starsUse10')) g('starsUse10').checked = s.starsUse10 || false;
  set('statAtk', s.statAtk); set('statHp', s.statHp); set('statDef', s.statDef);
  set('altAtk',  s.altAtk);  set('altDef', s.altDef);
  set('abilityFontSize', s.abilityFontSize); set('altAbilityFontSize', s.altAbilityFontSize);
  set('posAbilityBox', s.posAbilityBox);     set('posAltAbilityBox', s.posAltAbilityBox);
  ['posAbilityBox','posAltAbilityBox'].forEach(id => {
    const el = g(id); if (el) { const lbl = g(id+'Val'); if (lbl) lbl.textContent = el.value+'%'; }
  });
  set('abilityBody', s.abilityBody); set('altAbilityBody', s.altAbilityBody);
  set('artPosY', s.artPosY); set('artScale', s.artScale);
  set('altArtPosY', s.altArtPosY); set('altArtScale', s.altArtScale);
  set('cardWave', s.cardWave); set('cardId', s.cardId); set('cardCredit', s.cardCredit);
  if (g('faction2') && s.faction2 !== undefined) g('faction2').value = s.faction2;
  onTypeChange();
  set('modeBox', s.modeBox);
  if (s.traits) s.traits.forEach((t, i) => {
    const ti = g(`traitType${i+1}`), si = g(`traitSize${i+1}`), xi = g(`traitOffX${i+1}`), xv = g(`traitOffXVal${i+1}`);
    if (ti) ti.value = t.type || '';
    if (si) si.value = t.size || 'Long';
    const xVal = t.xOffset !== undefined ? t.xOffset : (TRAIT_X_DEFAULTS[i+1] ?? 0);
    if (xi) xi.value = xVal;
    if (xv) xv.textContent = xVal;
  });
  if (s.altTraits) s.altTraits.forEach((t, i) => {
    const ti = g(`altTraitType${i+1}`); if (ti) ti.value = t.type || '';
    const si = g(`altTraitSize${i+1}`); if (si) si.value = t.size || 'Long';
  });
  render();
}

/* ── Persistence ──────────────────────────────────────────────────────── */
function saveToStorage() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    try { localStorage.setItem('tfCharState', JSON.stringify(getState())); } catch(e) {}
  }, 300);
}

async function loadFromStorage() {
  try { const raw = localStorage.getItem('tfCharState'); if (raw) applyState(JSON.parse(raw)); } catch(e) {}
  try { const art = await artStore.get('character_bot'); if (art) { artworkSrc = art; render(); } } catch(e) {}
  try { const alt = await artStore.get('character_alt'); if (alt) { altArtworkSrc = alt; renderBack(); } } catch(e) {}
}

function copyJSON() {
  const txt = JSON.stringify(getState(), null, 2);
  navigator.clipboard.writeText(txt)
    .then(() => alert('Card JSON copied to clipboard!'))
    .catch(() => { const t=document.createElement('textarea'); t.value=txt; document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t); alert('Copied!'); });
}

function resetToDefaults() {
  if (!confirm('Reset everything to defaults? This will clear all card data.')) return;
  try { localStorage.removeItem('tfCharState'); } catch(e) {}
  artStore.del('character_bot').catch(()=>{}); artStore.del('character_alt').catch(()=>{});
  artworkSrc = null; altArtworkSrc = null;
  g('cardType').value = 'Character - Standard'; g('faction').value = 'Autobot';
  if (g('faction2')) g('faction2').value = '';
  g('cardName').value = 'CARD NAME'; g('cardSubtitle').value = '';
  g('starCount').value = '0';
  if (g('starsUse5'))  g('starsUse5').checked  = false;
  if (g('starsUse10')) g('starsUse10').checked = false;
  g('statAtk').value='0'; g('statHp').value='0'; g('statDef').value='0';
  g('altAtk').value='0';  g('altDef').value='0';
  g('abilityBody').value=''; g('altAbilityBody').value='';
  g('abilityFontSize').value='7.5'; g('altAbilityFontSize').value='7.5';
  g('posAbilityBox').value='14'; g('posAltAbilityBox').value='14';
  g('posAbilityBoxVal').textContent='14%'; g('posAltAbilityBoxVal').textContent='14%';
  g('artPosY').value='0'; g('artScale').value='100';
  if (g('altArtPosY'))  g('altArtPosY').value='0';
  if (g('altArtScale')) g('altArtScale').value='100';
  g('cardWave').value=''; g('cardId').value=''; g('cardCredit').value='';
  if (g('artUpload'))    g('artUpload').value='';
  if (g('altArtUpload')) g('altArtUpload').value='';
  resetProgress();
  onTypeChange();
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

/* ── Filename builder ─────────────────────────────────────────────────── */
function buildFilename(side) {
  const waveNum  = (g('cardWave').value || '').match(/\d+/)?.[0] || '0';
  const idMatch  = (g('cardId').value   || '').match(/T(\d+)/);
  const cardNum  = idMatch ? idMatch[1].padStart(3,'0') : '000';
  return `FMW${waveNum}_C_${cardNum}_${side}`;
}

/* ── Progress tracker ─────────────────────────────────────────────────── */
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
  try { localStorage.setItem('tfCharProgress', JSON.stringify(state)); } catch(e) {}
}
function loadProgressFromStorage() {
  try {
    const raw = localStorage.getItem('tfCharProgress');
    if (raw) { const s=JSON.parse(raw); PROGRESS_STEPS.forEach(k => { const el=g('prog_'+k); if (el && s[k]!==undefined) el.checked=s[k]; }); }
  } catch(e) {}
  _progressReady = true;
  updateProgress();
}
function resetProgress() {
  PROGRESS_STEPS.forEach(s => { const el=g('prog_'+s); if (el) el.checked=false; });
  updateProgress();
}

/* ── Export ───────────────────────────────────────────────────────────── */
function updateExportBtn() {
  const btn = g('exportBtn'); if (!btn) return;
  btn.textContent = 'Export PNGs ↓';
  updateProgress();
}
async function exportPNG() {
  const btn = g('exportBtn'); btn.textContent='Generating…'; btn.disabled=true;
  try {
    await exportCard(g('card'),   buildFilename('f')+'.png', { shiftMap: EXPORT_SHIFT, iconNudge: 2 });
    await exportCard(g('b_card'), buildFilename('b')+'.png', { shiftMap: EXPORT_SHIFT, iconNudge: 2 });
  } catch(e) { alert('Export failed: '+e.message); }
  finally { updateExportBtn(); }
}

/* ── Back card DOM clone ──────────────────────────────────────────────── */
function buildBackCard() {
  const front = g('card');
  const back  = front.cloneNode(true);
  back.id = 'b_card';
  back.querySelectorAll('[id]').forEach(el => { el.id = 'b_' + el.id; });
  back.querySelectorAll('img').forEach(el => { el.src=''; el.style.display='none'; });
  g('b_cardWrapper').appendChild(back);
}

/* ── HTML template ────────────────────────────────────────────────────── */
const FACTIONS_HTML = FACTIONS.map(f => `<option>${f}</option>`).join('');
const FACTIONS2_HTML = `<option value="">- None -</option>` + FACTIONS.map(f => `<option>${f}</option>`).join('');

function getHTML() {
  return `
  <div class="controls-panel">

    <div class="section" id="sec-type">
      <div class="section-header" onclick="toggleSec('type')">Card Type <span class="chevron">▾</span></div>
      <div class="section-body">
        <div class="field">
          <label>Sub-type</label>
          <select id="cardType" onchange="onTypeChange()">
            <option value="Character - Standard">Character - Standard</option>
            <option value="Character - Slim" disabled>Character - Slim</option>
            <option value="Character - Small" disabled>Character - Small</option>
          </select>
        </div>
        <div class="field" id="factionField">
          <label>Faction</label>
          <select id="faction" onchange="render()">${FACTIONS_HTML}</select>
        </div>
        <div class="field" id="faction2Field">
          <label>Second Faction</label>
          <select id="faction2" onchange="render()">${FACTIONS2_HTML}</select>
        </div>
      </div>
    </div>

    <div class="section" id="sec-identity">
      <div class="section-header" onclick="toggleSec('identity')">Identity <span class="chevron">▾</span></div>
      <div class="section-body">
        <div class="field">
          <label>Name</label>
          <input type="text" id="cardName" value="CARD NAME" oninput="render()">
        </div>
        <div class="field">
          <label>Subtitle</label>
          <input type="text" id="cardSubtitle" value="LEGENDARY COMMANDER" oninput="render()">
        </div>
      </div>
    </div>

    <div class="section" id="sec-traits">
      <div class="section-header" onclick="toggleSec('traits')">Traits <span class="chevron">▾</span></div>
      <div class="section-body">
        <div style="font-size:9px;color:var(--label);letter-spacing:0.7px;text-transform:uppercase;margin-bottom:4px;">Bot Mode</div>
        <div id="traitRows"></div>
        <div style="font-size:9px;color:var(--label);letter-spacing:0.7px;text-transform:uppercase;margin-top:10px;margin-bottom:4px;">Alt Mode</div>
        <div id="altTraitRows"></div>
        <div style="margin-top:6px;display:flex;flex-direction:column;gap:4px;" id="traitXSliders">
          <div style="font-size:9px;color:var(--label);letter-spacing:0.7px;text-transform:uppercase;margin-bottom:2px;">X Position</div>
          <div id="traitXSliderRows"></div>
        </div>
      </div>
    </div>

    <div class="section" id="sec-stats">
      <div class="section-header" onclick="toggleSec('stats')">Stats <span class="chevron">▾</span></div>
      <div class="section-body">
        <div class="field" id="modeBoxRow">
          <label>Mode Box</label>
          <select id="modeBox" onchange="render()">
            <option value="">- None -</option>
            <option value="2 Modes" selected>2 Modes</option>
          </select>
        </div>
        <div style="font-size:10px;font-weight:700;letter-spacing:1px;color:#888;text-transform:uppercase;margin:6px 0 4px;">Bot Mode</div>
        <div class="row-2">
          <div class="field"><label>ATK</label><input type="number" id="statAtk" value="5" min="0" max="99" oninput="render()"></div>
          <div class="field"><label>DEF</label><input type="number" id="statDef" value="2" min="0" max="99" oninput="render()"></div>
        </div>
        <div class="field">
          <label>HP</label><input type="number" id="statHp" value="13" min="0" max="99" oninput="render()" style="max-width:80px;">
        </div>
        <div id="altStatsRow">
          <div style="font-size:10px;font-weight:700;letter-spacing:1px;color:#888;text-transform:uppercase;margin:10px 0 4px;">Alt Mode</div>
          <div class="row-2">
            <div class="field"><label>ATK</label><input type="number" id="altAtk" value="4" min="0" max="99" oninput="render()"></div>
            <div class="field"><label>DEF</label><input type="number" id="altDef" value="3" min="0" max="99" oninput="render()"></div>
          </div>
        </div>
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
          <div class="field"><label>Font Size</label><input type="number" id="abilityFontSize" value="7.5" min="4" max="20" step="0.5" oninput="render()"></div>
        </div>
        <div class="field"><label>Bot Mode Text</label><textarea id="abilityBody" oninput="render()" style="min-height:100px;">When you flip to this mode → You may draw 2 cards.</textarea></div>
        <div class="field"><label>Position</label><div style="display:flex;align-items:center;gap:6px;"><input type="range" id="posAbilityBox" min="0" max="50" step="0.1" value="14" oninput="g('posAbilityBoxVal').textContent=this.value+'%';render()" style="flex:1;"><span id="posAbilityBoxVal" style="font-size:10px;color:var(--muted);min-width:34px;">14%</span></div></div>
        <div id="altAbilitySection" style="margin-top:6px;padding-top:6px;border-top:1px solid var(--border);">
          <div class="row-2">
            <div class="field"><label>Font Size</label><input type="number" id="altAbilityFontSize" value="7.5" min="4" max="20" step="0.5" oninput="render()"></div>
          </div>
          <div class="field" style="margin-top:6px;"><label>Alt Mode Text</label><textarea id="altAbilityBody" oninput="render()" style="min-height:100px;"></textarea></div>
          <div class="field"><label>Position</label><div style="display:flex;align-items:center;gap:6px;"><input type="range" id="posAltAbilityBox" min="0" max="50" step="0.1" value="14" oninput="g('posAltAbilityBoxVal').textContent=this.value+'%';render()" style="flex:1;"><span id="posAltAbilityBoxVal" style="font-size:10px;color:var(--muted);min-width:34px;">14%</span></div></div>
        </div>
      </div>
    </div>

    <div class="section" id="sec-art">
      <div class="section-header" onclick="toggleSec('art')">Artwork <span class="chevron">▾</span></div>
      <div class="section-body">
        <div style="font-size:9px;color:var(--label);letter-spacing:0.7px;text-transform:uppercase;margin-bottom:4px;">Bot Mode</div>
        <div class="field">
          <input type="file" id="artUpload" accept="image/*" onchange="loadArt(this,'bot')" style="font-size:11px;color:var(--muted);cursor:pointer;padding:4px 0;">
          <span id="artSizeWarning" style="display:none;font-size:10px;color:#e67e22;">⚠ Image over 5 MB — won't be saved in local storage.</span>
        </div>
        <div class="field"><label>Vertical Position</label><input type="range" id="artPosY" min="-100" max="100" value="0" oninput="render()" style="padding:0;border:none;background:none;"></div>
        <div class="field"><label>Scale</label><input type="range" id="artScale" min="50" max="220" value="100" oninput="render()" style="padding:0;border:none;background:none;"></div>
        <div style="font-size:9px;color:var(--label);letter-spacing:0.7px;text-transform:uppercase;margin-top:10px;margin-bottom:4px;">Alt Mode</div>
        <div class="field">
          <input type="file" id="altArtUpload" accept="image/*" onchange="loadArt(this,'alt')" style="font-size:11px;color:var(--muted);cursor:pointer;padding:4px 0;">
          <span id="altArtSizeWarning" style="display:none;font-size:10px;color:#e67e22;">⚠ Image over 5 MB — won't be saved in local storage.</span>
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
          <div class="field"><label>Card ID</label><input type="text" id="cardId" value="CT T01   T38" oninput="render()"></div>
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

      <div class="card-col">
        <div class="card-col-label" id="frontLabel">BOT MODE</div>
        <div class="card-wrapper" id="cardWrapper">
          <div class="card" id="card">
            <img id="lArt" class="card-layer" style="display:none;object-fit:cover;object-position:center top;mix-blend-mode:normal;">
            <img id="lGradient"       class="card-layer" alt="">
            <img id="lHeaderMask"     class="card-layer" alt="">
            <img id="lTrait4"         class="card-layer" alt="">
            <img id="lTrait3"         class="card-layer" alt="">
            <img id="lTrait2"         class="card-layer" alt="">
            <img id="lTrait1"         class="card-layer" alt="">
            <img id="lTextbox"        class="card-layer" alt="">
            <img id="lMainFrame"      class="card-layer" alt="">
            <img id="lModeBox"        class="card-layer" alt="">
            <img id="lSetSlash"       class="card-layer" alt="">
            <img id="lStarSep"        class="card-layer" alt="">
            <img id="lStamp" src="" alt="" style="position:absolute;bottom:3.4%;left:2.4%;width:6.6%;height:auto;pointer-events:none;display:none;">
            <img id="lHeaderBg"       class="card-layer" alt="">
            <img id="lHeaderOverlay"  class="card-layer" alt="">
            <img id="lHeaderOverlay2" class="card-layer" alt="">
            <img id="lHeaderLines"    class="card-layer" alt="">
            <img id="lFactionFrame"   class="card-layer" alt="">
            <img id="lFactionIcon"    class="card-layer" alt="">
            <img id="lFactionIcon2"   class="card-layer" alt="">
            <img id="lFactionDual"    class="card-layer" alt="">

            <div id="tCyberName" class="card-text" style="top:1.5%;right:2%;font-family:'CybertonicFont',sans-serif;font-size:15px;color:rgba(210,210,210,0.3);text-transform:uppercase;letter-spacing:2px;text-align:right;white-space:nowrap;overflow:hidden;pointer-events:none;"></div>
            <div id="tName" class="card-text" style="top:5%;left:4%;right:16%;font-family:'BayformersName','Segoe UI',sans-serif;font-size:32px;color:#fff;text-transform:uppercase;letter-spacing:1px;line-height:1;white-space:nowrap;overflow:hidden;"></div>
            <div id="tSubtitle" class="card-text" style="top:10.5%;left:4%;right:16%;font-family:'GothamNarrow','Segoe UI',sans-serif;font-size:9px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:1px;white-space:nowrap;overflow:hidden;"></div>
            <div id="tTraitBar" class="card-text" style="left:3%;right:3%;height:20px;display:none;align-items:center;overflow:hidden;"></div>
            <div id="statsBar" class="card-text" style="bottom:27.7%;left:1%;right:1%;height:32px;display:flex;align-items:center;justify-content:space-between;padding:0 8px;">
              <div style="display:flex;align-items:center;margin-left:36px;"><span id="tAtk" style="font-size:26px;font-weight:900;color:#fff;font-family:'ArmadaCondensed',sans-serif;line-height:1;"></span></div>
              <div style="display:flex;align-items:center;margin-left:66px;"><span id="tHp"  style="font-size:26px;font-weight:900;color:#fff;font-family:'ArmadaCondensed',sans-serif;line-height:1;"></span></div>
              <div style="display:flex;align-items:center;margin-right:52px;"><span id="tDef" style="font-size:26px;font-weight:900;color:#fff;font-family:'ArmadaCondensed',sans-serif;line-height:1;"></span></div>
            </div>
            <div id="tModeLabel" class="card-text" style="font-size:7px;font-weight:700;letter-spacing:1.5px;color:#fff;text-transform:uppercase;font-family:'OpenSansSCBold',sans-serif;text-align:center;bottom:26.6%;left:calc(50% - 43px);transform:translateX(-50%);height:32px;display:flex;align-items:center;"></div>
            <div id="abilityBox" class="card-text" style="bottom:14%;left:12%;right:23%;font-size:7.5px;line-height:1.45;color:#1a1a1a;text-align:center;">
              <span id="tAbilityName" style="font-weight:700;font-style:italic;font-family:'GothamNarrowItalic','Georgia',serif;"></span>
              <span id="tAbilityParen" style="font-style:italic;font-family:'GothamNarrowItalic','Georgia',serif;"></span>
              <span id="tAbilityBody" style="font-family:'GothamNarrow','Arial',sans-serif;"></span>
            </div>
            <div id="abilityBoxWide" class="card-text" style="bottom:6%;left:4%;right:4%;font-size:8.5px;line-height:1.55;color:#1a1a1a;text-align:center;display:none;">
              <div id="tAbilityBodyWide" style="font-family:'GothamNarrow','Arial',sans-serif;"></div>
              <div id="tAbilityParenWide" style="font-style:italic;font-family:'GothamNarrowItalic','Georgia',serif;margin-top:4px;"></div>
            </div>
            <div id="altModePanel" class="card-text" style="right:1.5%;bottom:7.5%;width:15%;text-align:center;line-height:1.6;">
              <div id="tAltModeLabel" style="font-size:10px;letter-spacing:0.8px;color:#444;font-weight:700;text-transform:uppercase;font-family:'OpenSansBold',sans-serif;margin-left:10px;"></div>
              <div style="display:flex;align-items:center;justify-content:center;gap:1px;margin-top:4px;"><span id="tAltAtk" style="font-size:15px;font-weight:900;color:#444;line-height:1;font-family:'ArmadaCondensed',sans-serif;"></span></div>
              <div style="display:flex;align-items:center;justify-content:center;gap:1px;"><span id="tAltDef" style="font-size:15px;font-weight:900;color:#444;line-height:1;font-family:'ArmadaCondensed',sans-serif;"></span></div>
            </div>
            <span id="tWave"   class="card-text" style="font-size:8px;color:#fff;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;font-family:'OpenSansBold',sans-serif;bottom:4.6%;left:3%;"></span>
            <span id="tId"     class="card-text" style="font-size:8px;font-weight:700;color:#fff;letter-spacing:0.5px;font-family:'OpenSansBold',sans-serif;bottom:4.6%;left:30%;white-space:pre;"></span>
            <div  id="tCredit" class="card-text" style="font-size:8px;color:#fff;text-align:right;line-height:1.35;font-family:'OpenSansBold',sans-serif;bottom:4.6%;right:3%;"></div>
            <div  id="tStarsFooter" class="card-text" style="display:none;bottom:5%;left:9.7%;align-items:center;gap:2px;"></div>
          </div><!-- .card -->
        </div><!-- .card-wrapper front -->
      </div><!-- .card-col front -->

      <div class="card-col" id="backCardCol">
        <div class="card-col-label" id="backLabel">ALT MODE</div>
        <div class="card-wrapper" id="b_cardWrapper"></div>
      </div>

    </div><!-- .cards-display -->
  </div><!-- .preview-area -->

  <!-- ── RIGHT: Progress panel ── -->
  <div class="layers-panel">
    <div class="layers-title">Progress</div>
    <div class="progress-bar-track"><div class="progress-bar-fill" id="progressBarFill"></div></div>
    <div class="progress-label" id="progressLabel">0 / 7 complete</div>
    <div class="progress-steps" id="progressSteps">
      <label class="progress-step"><input type="checkbox" id="prog_type"     onchange="updateProgress()"><div class="progress-step-body"><span class="progress-step-name">Card Type &amp; Faction</span></div></label>
      <label class="progress-step"><input type="checkbox" id="prog_identity" onchange="updateProgress()"><div class="progress-step-body"><span class="progress-step-name">Identity</span></div></label>
      <label class="progress-step"><input type="checkbox" id="prog_traits"   onchange="updateProgress()"><div class="progress-step-body"><span class="progress-step-name">Traits</span></div></label>
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
      <textarea id="jsonInput" class="modal-textarea" placeholder='{ "cardType": "Character - Standard", ... }'></textarea>
      <div id="jsonError" class="modal-error"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeJSONModal()">Cancel</button>
      <button class="btn btn-primary" onclick="confirmLoadJSON()" style="flex:1;">Load</button>
    </div>
  </div>
</div>`;

/* ── Composer interface ───────────────────────────────────────────────── */
const GLOBALS = ['render','renderBack','onTypeChange','loadArt','zoom','resetZoom',
  'toggleSec','copyJSON','loadJSON','closeJSONModal','confirmLoadJSON',
  'exportPNG','updateProgress','resetToDefaults'];

function init(mountEl) {
  mountEl.innerHTML = getHTML();

  // Inject modal into body
  _modalEl = document.createElement('div');
  _modalEl.innerHTML = MODAL_HTML;
  document.body.appendChild(_modalEl.firstElementChild);

  // Expose functions as globals (for inline event handlers)
  const fns = { render, renderBack, onTypeChange, loadArt, zoom, resetZoom,
    toggleSec, copyJSON, loadJSON, closeJSONModal, confirmLoadJSON,
    exportPNG, updateProgress, resetToDefaults };
  GLOBALS.forEach(k => { window[k] = fns[k]; });

  // Init sequence
  const stampEl = g('lStamp');
  if (stampEl) { stampEl.src = assetUrl('stamp/wave11_tbc.svg'); stampEl.style.display = ''; }
  buildBackCard();
  buildTraitRows();
  onTypeChange();
  loadFromStorage();
  loadProgressFromStorage();
  restoreSections();
  Promise.all([preconvertBlackImages(), preconvertTraitIcons()])
    .then(() => { render(); renderBack(); });

  window.addEventListener('beforeunload', _onUnload);
}

function _onUnload() {
  try { localStorage.setItem('tfCharState', JSON.stringify(getState())); } catch(e) {}
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

window.Composers.character = { init, destroy };

})(); // end IIFE
