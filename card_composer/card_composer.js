
/* ── Data ── */
const FACTIONS = ['Autobot','Decepticon','Junkion','Mercenary','Quintesson','Unicronian'];

const TRAIT_X_BASE     = { 1: -20, 2: -4, 3: 12, 4: 29 }; // baked-in per-slot offset
const TRAIT_X_DEFAULTS = { 1: 0, 2: 0, 3: 0, 4: 0 };      // slider starts at zero

const TRAIT_NAMES = [
  'Aerialbot','Air Strike Patrol','Allicon','Battle Master','Battle Patrol',
  'Beast','Boat','Car','Combaticon','Constructicon','Dinobot','Dreadwing',
  'Firecon','Guardian','Helicopter','Insecticon','Judge','Leader','Me Grimlock',
  'Melee','Mini-Cassette','Motorcycle','Off-Road Patrol','Omnibot','Plane',
  'Predacon','Ranged','Rescue Patrol','Road Drone','Sentinel','Sharkticon',
  'Spaceship','Specialist','Sports Car Patrol','Spy Patrol','Station','Stunticon',
  'Tank','Tentacle','Terrorcon','Titan Master','Titan','Train','Truck',
  'Vehicle','Weaponizer','Wrecker'
];

// Per card type: which folder, which components exist, layout hints
const CARD_CONFIGS = {
  'Character - Standard': {
    folder: 'character',
    layers: ['Gradient','Header Background','Header Lines','Header Overlay','Main Frame',
             'Faction Icon Frame','Faction Icon','Traits','ModeBox','Set Slash',
             'Star Separator','Textbox','Header Mask'],
    hasFaction: true, hasModeBox: true, hasTraits: true, hasHeaderMask: true,
    hasStats: true, isStratagem: false,
    maxTraits: 4,
    modeBoxOptions: ['1 Mode','One Mode','2 Modes','3 Modes','Choose One'],
    traitBarTop: '12.5%',   // trait bar sits just below the header
    artTop: '16%',
  },
  'Character - Slim': {
    folder: 'character',
    layers: ['Gradient','Header Background','Header Lines','Header Overlay','Main Frame',
             'Faction Icon Frame','Faction Icon','Traits','ModeBox','Set Slash',
             'Star Separator','Textbox'],
    hasFaction: true, hasModeBox: true, hasTraits: true, hasHeaderMask: false,
    hasStats: true, isStratagem: false,
    maxTraits: 4,
    modeBoxOptions: ['One Mode','2 Modes','3 Modes','Choose One'],
    traitBarTop: '12.5%',
    artTop: '16%',
  },
  'Character - Small': {
    folder: 'character',
    layers: ['Gradient','Header Background','Header Lines','Header Overlay','Main Frame',
             'Faction Icon Frame','Faction Icon','Traits','ModeBox','Set Slash',
             'Star Separator','Textbox','Header Mask'],
    hasFaction: true, hasModeBox: true, hasTraits: true, hasHeaderMask: true,
    hasStats: true, isStratagem: false,
    maxTraits: 4,
    modeBoxOptions: ['1 Mode','2 Modes','3 Modes','Choose One'],
    traitBarTop: '12.5%',
    artTop: '16%',
  },
  'Battle - Action': {
    folder: 'battle',
    layers: ['Header Overlay','Main Frame','Header Mask','Set Slash','Traits'],
    hasFaction: true, hasModeBox: false, hasTraits: true, hasHeaderMask: true,
    hasStats: false, isStratagem: false,
    maxTraits: 2,
    modeBoxOptions: [],
    traitBarTop: '64%',   // "ACTION" bar sits at bottom of art area
    artTop: '13%',
  },
  'Battle - Upgrade': {
    folder: 'battle',
    layers: ['Header Overlay','Main Frame','Set Slash'],
    hasFaction: true, hasModeBox: false, hasTraits: false, hasHeaderMask: false,
    hasStats: false, isStratagem: false,
    maxTraits: 0,
    modeBoxOptions: [],
    traitBarTop: null,
    artTop: '13%',
  },
  'Stratagem - Small': {
    folder: 'stratagem',
    layers: ['Black Background','Header','Header Grid Black','Header Overlay Background',
             'Header Overlay','Border Regular','Textbox','Textbox Overlay Background',
             'Textbox Overlay','Set Slash'],
    hasFaction: true, hasModeBox: false, hasTraits: false, hasHeaderMask: false,
    hasStats: false, isStratagem: true,
    maxTraits: 0,
    modeBoxOptions: [],
    traitBarTop: null,
    artTop: '0%',   // art fills from top on stratagem
  },
};


/* ── State ── */
let artworkSrc    = null;
let altArtworkSrc = null;
let zoomLevel = 1;

/* ── IndexedDB artwork store (no size limit unlike localStorage) ── */
const artStore = (() => {
  let _db = null;
  const DB   = 'tfCardArtDB';
  const STOR = 'artworks';

  function openDB() {
    return new Promise((res, rej) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = e => e.target.result.createObjectStore(STOR);
      req.onsuccess = e => { _db = e.target.result; res(_db); };
      req.onerror   = e => rej(e.target.error);
    });
  }
  async function db() { return _db || openDB(); }

  return {
    async set(key, val) {
      const d = await db();
      return new Promise((res, rej) => {
        const tx = d.transaction(STOR, 'readwrite');
        tx.objectStore(STOR).put(val, key);
        tx.oncomplete = res; tx.onerror = e => rej(e.target.error);
      });
    },
    async get(key) {
      const d = await db();
      return new Promise((res, rej) => {
        const tx  = d.transaction(STOR, 'readonly');
        const req = tx.objectStore(STOR).get(key);
        req.onsuccess = e => res(e.target.result ?? null);
        req.onerror   = e => rej(e.target.error);
      });
    },
    async del(key) {
      const d = await db();
      return new Promise((res, rej) => {
        const tx = d.transaction(STOR, 'readwrite');
        tx.objectStore(STOR).delete(key);
        tx.oncomplete = res; tx.onerror = e => rej(e.target.error);
      });
    },
  };
})();

/* ── Helpers ── */
const g = id => document.getElementById(id);
const cc = (folder, file) => `card_components/${folder}/${file}`;

function abilityImgSrc(name) {
  if (name.startsWith('Trait - ')) return `card_components/traits/${name}.png`;
  if (name.startsWith('Icon - '))  return `card_components/icons/${name}.png`;
  return null;
}

function formatAbilityText(text) {
  return (text || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/--&gt;/g, '<span style="font-family:\'GothamNarrowMedium\',sans-serif;font-size:1.4em;vertical-align:-0.15em;">→</span>')
    .replace(/\*\*(.+?)\*\*/g, '<span style="font-family:\'GothamNarrowMedium\',sans-serif;">$1</span>')
    .replace(/\*([^*]+?)\*/g, '<span style="font-family:\'GothamNarrowItalic\',sans-serif;">$1</span>')
    .replace(/\[([^\]]+)\]/g, (_, name) => {
      const src = abilityImgSrc(name);
      const filter = (name.startsWith('Trait - ') || name.startsWith('Icon - Stat - ')) ? 'filter:brightness(0);' : '';
      const height = name.startsWith('Icon - Small ') ? '1.11em' : '1.3em';
      return src ? `<img src="${src}" style="height:${height};width:auto;vertical-align:middle;${filter}">` : `[${name}]`;
    })
    .replace(/\n/g, '<span style="display:block;height:0.2em;"></span>');
}

function setLayer(id, src) {
  const el = g(id);
  if (!el) return;
  if (src) { el.src = src; el.style.display = ''; }
  else      { el.src = ''; el.style.display = 'none'; }
}

/* ── Build trait row controls ── */
function buildTraitRows() {
  // Bot Mode rows
  const container = g('traitRows');
  container.innerHTML = '';
  for (let i = 1; i <= 4; i++) {
    const div = document.createElement('div');
    div.className = 'trait-row';
    div.innerHTML = `
      <span class="trait-num">${i}</span>
      <select id="traitType${i}" class="main" onchange="render()">
        <option value="">— none —</option>
        ${TRAIT_NAMES.map(n => `<option value="${n}">${n}</option>`).join('')}
      </select>
      <select id="traitSize${i}" class="size" onchange="render()">
        <option value="Short">Short</option>
        <option value="Long">Long</option>
      </select>`;
    container.appendChild(div);
  }
  // Alt Mode rows
  const altContainer = g('altTraitRows');
  if (altContainer) {
    altContainer.innerHTML = '';
    for (let i = 1; i <= 4; i++) {
      const div = document.createElement('div');
      div.className = 'trait-row';
      div.innerHTML = `
        <span class="trait-num">${i}</span>
        <select id="altTraitType${i}" class="main" onchange="render()">
          <option value="">— none —</option>
          ${TRAIT_NAMES.map(n => `<option value="${n}">${n}</option>`).join('')}
        </select>
        <select id="altTraitSize${i}" class="size" onchange="render()">
          <option value="Short">Short</option>
          <option value="Long">Long</option>
        </select>`;
      altContainer.appendChild(div);
    }
  }
  // Build X-offset sliders (PNG position)
  const sliderContainer = g('traitXSliderRows');
  if (sliderContainer) {
    sliderContainer.innerHTML = '';
    for (let i = 1; i <= 4; i++) {
      const def = TRAIT_X_DEFAULTS[i];
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:6px;';
      row.innerHTML = `
        <span style="font-size:10px;color:var(--muted);min-width:12px;">${i}</span>
        <input type="range" id="traitOffX${i}" min="-100" max="100" value="${def}" step="1"
          style="flex:1;" oninput="g('traitOffXVal${i}').textContent=this.value;render()">
        <span id="traitOffXVal${i}" style="font-size:10px;color:var(--muted);min-width:28px;text-align:right;">${def}</span>`;
      sliderContainer.appendChild(row);
    }
  }
}

/* ── Update UI when card type changes ── */
function onTypeChange() {
  const config = CARD_CONFIGS[g('cardType').value];

  // Rebuild mode box dropdown for this type
  const modeBoxSel = g('modeBox');
  const current = modeBoxSel.value;
  modeBoxSel.innerHTML = '<option value="">None</option>' +
    config.modeBoxOptions.map(o =>
      `<option value="${o}"${o===current?' selected':''}>${o}</option>`
    ).join('');

  // Show/hide control sections based on card type capabilities
  g('sec-traits').style.display  = config.hasTraits  ? '' : 'none';
  g('sec-stats').style.display   = config.hasStats   ? '' : 'none';
  g('modeBoxRow').style.display  = config.hasModeBox ? '' : 'none';
  g('altStatsRow').style.display = config.hasModeBox ? '' : 'none';
  g('factionField').style.display = config.hasFaction ? '' : 'none';
  g('faction2Field').style.display =
    (config.hasFaction && config.folder === 'character') ? '' : 'none';
  g('upgradeTypeField').style.display =
    (g('cardType').value === 'Battle - Upgrade') ? '' : 'none';

  // Show back card col + alt ability fields for non-Battle types
  const hasTwoSides = config.folder !== 'battle';
  g('backCardCol').style.display    = hasTwoSides ? '' : 'none';
  g('altAbilitySection').style.display = hasTwoSides ? '' : 'none';

  // Update labels
  const lbl = config.isStratagem ? ['FRONT', 'BACK'] : ['BOT MODE', 'ALT MODE'];
  g('frontLabel').textContent = lbl[0];
  g('backLabel').textContent  = lbl[1];

  // Stratagem subtitle label
  const subLabel = config.isStratagem ? 'Stratagem Name / Target' : 'Subtitle';
  g('cardSubtitle').previousElementSibling.textContent = subLabel;

  buildTraitRows();
  updateExportBtn();
  render();
}

/* ── Main render ── */
function render() {
  const typeKey = g('cardType').value;
  const config  = CARD_CONFIGS[typeKey];
  const folder  = config.folder;
  const faction = g('faction').value;
  const cp = comp => cc(folder, `${typeKey} - ${comp}.png`);

  // Clear all structural layers first, then set only what this type needs
  const ALL_LAYERS = ['lGradient','lHeaderBg','lHeaderLines','lHeaderOverlay','lHeaderOverlay2','lMainFrame',
                      'lFactionFrame','lFactionIcon','lFactionIcon2','lFactionDual',
                      'lTrait1','lTrait2','lTrait3','lTrait4',
                      'lModeBox','lSetSlash','lStarSep','lTextbox','lHeaderMask'];
  ALL_LAYERS.forEach(id => setLayer(id, null));

  // ── Layers by card family ──
  if (folder === 'character') {
    setLayer('lGradient',      cp('Gradient'));
    setLayer('lHeaderBg',      cp('Header Background'));
    setLayer('lHeaderLines',   cp('Header Lines'));
    setLayer('lHeaderOverlay', cp(`Header Overlay ${faction}`));
    setLayer('lMainFrame',     cp('Main Frame'));
    setLayer('lFactionFrame', cp('Faction Icon Frame'));
    const faction2  = g('faction2')?.value || '';
    const iconEl    = g('lFactionIcon');
    const icon2El   = g('lFactionIcon2');
    const overlay2El = g('lHeaderOverlay2');
    const SPLIT     = '85.6%';
    if (faction2) {
      iconEl.style.clipPath  = `polygon(0 0, ${SPLIT} 0, ${SPLIT} 100%, 0 100%)`;
      icon2El.style.clipPath = `polygon(${SPLIT} 0, 100% 0, 100% 100%, ${SPLIT} 100%)`;
      setLayer('lFactionIcon',  cp(`Faction Icon ${faction}`));
      setLayer('lFactionIcon2', cp(`Faction Icon ${faction2}`));
      setLayer('lFactionDual',  cp('Faction Icon Frame Dual-Faction'));
      const cp2 = comp => cc(folder, `${typeKey} - ${comp}.png`);
      setLayer('lHeaderOverlay2', cp2(`Header Overlay ${faction2}`));
      if (overlay2El) {
        const fade = 'linear-gradient(to right, transparent 20%, black 60%)';
        overlay2El.style.webkitMaskImage = fade;
        overlay2El.style.maskImage       = fade;
      }
    } else {
      iconEl.style.clipPath  = '';
      if (icon2El) icon2El.style.clipPath = '';
      setLayer('lFactionIcon',  cp(`Faction Icon ${faction}`));
      setLayer('lFactionIcon2', null);
      setLayer('lFactionDual',  null);
      setLayer('lHeaderOverlay2', null);
      if (overlay2El) {
        overlay2El.style.webkitMaskImage = '';
        overlay2El.style.maskImage       = '';
      }
    }
    setLayer('lTextbox',       cp('Textbox'));
    const lTextboxEl = g('lTextbox'); if (lTextboxEl) lTextboxEl.style.opacity = '0.85';
    setLayer('lSetSlash',      cp('Set Slash'));
    if (config.hasHeaderMask) setLayer('lHeaderMask', cp('Header Mask'));

    // lStarSep is alt mode only — set in renderBack(), not here

    const modeBoxVal = g('modeBox').value;
    if (modeBoxVal) setLayer('lModeBox', cp(`ModeBox ${modeBoxVal}`));

  }

  else if (folder === 'battle') {
    setLayer('lHeaderOverlay', cp(`Header Overlay ${faction}`));
    setLayer('lMainFrame',     cp('Main Frame'));
    setLayer('lSetSlash',      cp('Set Slash'));
    if (config.hasHeaderMask) setLayer('lHeaderMask', cp('Header Mask'));
    if (typeKey === 'Battle - Upgrade') {
      const upgradeType = g('upgradeType')?.value || 'Attack';
      setLayer('lGradient', cp(`${upgradeType} BG`));
    }
  }

  else if (folder === 'stratagem') {
    // Map stratagem components to available layer slots (DOM order = bottom→top)
    setLayer('lGradient',      cp('Black Background'));            // darkens card
    setLayer('lHeaderBg',      cp('Header'));                      // grey header bar
    setLayer('lHeaderLines',   cp('Header Grid Black'));           // Cybertronix lines
    setLayer('lHeaderOverlay', cp('Header Overlay Background'));   // subtitle band bg
    setLayer('lMainFrame',     cp(`Header Overlay ${faction}`));  // faction subtitle band
    setLayer('lFactionFrame',  cp('Border Regular'));              // card border
    setLayer('lFactionIcon',   cp('Header Corner'));               // corner decoration
    setLayer('lTrait1',        cp('Textbox'));                     // grey text area
    setLayer('lTrait2',        cp('Textbox Overlay Background'));  // STRATAGEM badge bg
    setLayer('lTrait3',        cp(`Textbox Overlay ${faction}`)); // STRATAGEM badge
    setLayer('lTrait4',        cp('Art Border'));                  // art area border
    setLayer('lStarSep',       cp('Header Line'));                 // header separator line
    setLayer('lTextbox',       cp('Border Bottom'));               // bottom border trim
    setLayer('lSetSlash',      cp('Set Slash'));
  }

  // ── Trait layers — horizontal row, left to right, scaled to card coordinate space ──
  if (folder !== 'stratagem') {
    const SCALE = 0.48; // ~29px tall
    const BAR_H = Math.round(60 * SCALE); // ~29px
    const maxT = folder === 'battle' ? 2 : 4;
    for (let i = 1; i <= 4; i++) {
      const el = g(`lTrait${i}`);
      if (el) { el.style.cssText = ''; el.style.display = 'none'; }
    }
    if (config.hasTraits && config.traitBarTop) {
      const traitTopPx = parseFloat(config.traitBarTop) / 100 * 530;
      let offsetRight = 380;
      const GAP = -26;
      for (let slot = 1; slot <= maxT; slot++) {
        const size = g(`traitSize${slot}`)?.value || 'Short';
        const nw = size === 'Long' ? 393 : 270;
        const displayW = Math.round(nw * SCALE);
        offsetRight -= displayW + GAP;
        const el = g(`lTrait${slot}`);
        if (!el) continue;
        const hasValue = !!g(`traitType${slot}`)?.value;
        if (hasValue) {
          const src = folder === 'battle'
            ? cc('battle', `Battle - Trait ${slot} ${size}.png`)
            : cp(`Trait ${slot} ${size}`);
          const xAdj = parseInt(g(`traitOffX${slot}`)?.value) || 0;
          el.src = src;
          el.style.cssText = `position:absolute; display:block; pointer-events:none; top:${traitTopPx}px; left:${offsetRight + (TRAIT_X_BASE[slot]||0) + xAdj}px; width:${displayW}px; height:${BAR_H}px; object-fit:fill;`;
        } else {
          el.style.display = 'none';
        }
      }
    }
  }

  // ── Artwork ──
  const artEl = g('lArt');
  if (artworkSrc) {
    artEl.src = artworkSrc;
    artEl.style.display = '';
    const posY  = parseInt(g('artPosY').value)  || 0;
    const scale = parseInt(g('artScale').value) || 100;
    const baseTop = parseFloat(config.artTop) || 16;
    artEl.style.top    = (baseTop + posY * 0.4) + '%';
    artEl.style.height = scale + '%';
    artEl.style.width  = '100%';
    artEl.style.objectFit      = 'cover';
    artEl.style.objectPosition = 'center top';
  } else {
    artEl.src = ''; artEl.style.display = 'none';
  }

  // ── Text overlays ──

  // Name
  g('tName').textContent = (g('cardName').value || 'CARD NAME').toUpperCase();

  // Subtitle: normal for character/battle; faction-banner centred for stratagem
  const subtitle = (g('cardSubtitle').value || '').toUpperCase();
  if (config.isStratagem) {
    g('tSubtitle').style.display = 'none';
    g('tStratagemSubtitle').style.display = '';
    g('tStratagemSubtitle').textContent = g('cardSubtitle').value || '';
  } else {
    g('tSubtitle').style.display = '';
    g('tSubtitle').textContent = subtitle;
    g('tStratagemSubtitle').style.display = 'none';
  }

  // Positions from sliders
  const posAbilityBox = parseFloat(g('posAbilityBox')?.value) ?? 14;
  g('abilityBox').style.bottom     = posAbilityBox + '%';
  g('abilityBoxWide').style.bottom = posAbilityBox + '%';
  g('statsBar').style.bottom       = '27.7%';
  g('tModeLabel').style.bottom     = '26.6%';
  g('altModePanel').style.bottom   = '17%';
  g('altModePanel').style.right    = '8.1%';

  // Stats bar (Character only)
  g('statsBar').style.display = config.hasStats ? 'flex' : 'none';
  if (config.hasStats) {
    g('tAtk').textContent = g('statAtk').value || '0';
    g('tHp').textContent  = g('statHp').value  || '0';
    g('tDef').textContent = g('statDef').value || '0';
    g('tModeLabel').textContent = 'BOT MODE';
  }

  // Alt mode stats panel (inside mode box component)
  const modeBoxVal = g('modeBox').value;
  const showAltMode = config.hasModeBox && modeBoxVal &&
                      modeBoxVal !== 'One Mode' && modeBoxVal !== '1 Mode' &&
                      modeBoxVal !== 'Choose One';
  g('altModePanel').style.display = showAltMode ? '' : 'none';
  if (showAltMode) {
    g('tAltModeLabel').textContent = 'ALT';
    g('tAltAtk').textContent = g('altAtk').value || '0';
    g('tAltDef').textContent = g('altDef').value || '0';
  }

  // Trait text overlay — each item absolutely positioned to match its PNG layer exactly
  const traitBarEl = g('tTraitBar');
  const T_SCALE = 0.48;
  const T_BAR_H = Math.round(60 * T_SCALE);
  const T_GAP   = -26;
  const T_maxT  = folder === 'battle' ? 2 : 4;
  if (config.hasTraits && config.traitBarTop) {
    const traitTopPx = parseFloat(config.traitBarTop) / 100 * 530;
    traitBarEl.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;display:block;';
    traitBarEl.innerHTML = '';
    let offsetRight = 380;
    for (let slot = 1; slot <= T_maxT; slot++) {
      const size     = g(`traitSize${slot}`)?.value || 'Short';
      const nw       = size === 'Long' ? 393 : 270;
      const displayW = Math.round(nw * T_SCALE);
      offsetRight   -= displayW + T_GAP;
      const traitName = g(`traitType${slot}`)?.value || '';
      if (!traitName) continue;
      const xAdj = parseInt(g(`traitOffX${slot}`)?.value) || 0;
      const leftPx = offsetRight + (TRAIT_X_BASE[slot]||0) + xAdj + 21;
      const item = document.createElement('div');
      item.style.cssText = `position:absolute;top:${traitTopPx}px;left:${leftPx}px;width:${displayW}px;height:${T_BAR_H}px;display:flex;align-items:center;gap:8px;padding:0 6px;overflow:hidden;`;
      item.innerHTML =
        `<img src="${cc('traits','Trait - '+traitName+'.png')}" style="width:17px;height:17px;object-fit:contain;flex-shrink:0;position:relative;top:3px;">` +
        `<span style="font-size:8px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:0.5px;font-family:'OpenSansSemiBold',sans-serif;white-space:nowrap;">${traitName.toUpperCase()}</span>`;
      traitBarEl.appendChild(item);
    }
  } else {
    traitBarEl.style.display = 'none';
  }

  // Ability text: narrow (with mode box) for Character; wide + centred for Battle/Stratagem
  const useWide = !config.hasStats;
  const aFontSize = parseFloat(g('abilityFontSize')?.value) || 7.5;
  g('abilityBox').style.display     = useWide ? 'none' : '';
  g('abilityBox').style.fontSize    = aFontSize + 'px';
  g('abilityBoxWide').style.display = useWide ? '' : 'none';
  g('abilityBoxWide').style.fontSize = aFontSize + 'px';

  const aBody  = g('abilityBody').value;

  if (useWide) {
    g('tAbilityBodyWide').innerHTML  = formatAbilityText(aBody);
    g('tAbilityParenWide').textContent = '';
  } else {
    g('tAbilityName').textContent  = '';
    g('tAbilityParen').textContent = '';
    g('tAbilityBody').innerHTML  = formatAbilityText(aBody);
  }

  // Stars — always hidden on front card, shown on back only
  g('tStarsFooter').style.display = 'none';
  g('tStarsFooter').innerHTML = '';

  // Footer text
  g('tWave').textContent  = g('cardWave').value;
  g('tWave').style.left   = '10.9%';
  g('tId').textContent    = g('cardId').value;
  g('tId').style.left     = '24.2%';
  g('tCredit').innerHTML  = g('cardCredit').value || '';
  g('tCredit').style.bottom = '4.6%';
  g('tCredit').style.right  = '22.2%';

  saveToStorage();
  renderBack();
}

/* ── Artwork loader ── */
function loadArt(input, mode) {
  const file = input.files[0];
  if (!file) return;
  const isAlt     = mode === 'alt';
  const warnId    = isAlt ? 'altArtSizeWarning' : 'artSizeWarning';
  const warnEl    = g(warnId);
  if (warnEl) warnEl.style.display = file.size > 5 * 1024 * 1024 ? '' : 'none';
  const reader = new FileReader();
  reader.onload = e => {
    if (isAlt) {
      altArtworkSrc = e.target.result;
      artStore.set('alt', altArtworkSrc).catch(() => {});
      renderBack();
    } else {
      artworkSrc = e.target.result;
      artStore.set('bot', artworkSrc).catch(() => {});
      render();
    }
  };
  reader.readAsDataURL(file);
}

/* ── Zoom ── */
function applyZoom() {
  const z = zoomLevel === 1 ? '' : String(zoomLevel);
  g('cardsDisplay').style.zoom = z;
  g('zoomDisplay').textContent = Math.round(zoomLevel * 100) + '%';
}
function zoom(delta) {
  zoomLevel = Math.max(0.3, Math.min(2.5, zoomLevel + delta));
  applyZoom();
}
function resetZoom() {
  zoomLevel = 1;
  applyZoom();
}

/* ── Section toggle ── */
function toggleSec(name) {
  g('sec-' + name).classList.toggle('collapsed');
  const collapsed = ['type','identity','traits','stats','ability','art','info']
    .filter(n => g('sec-'+n)?.classList.contains('collapsed'));
  try { localStorage.setItem('tfSectionState', JSON.stringify(collapsed)); } catch(e) {}
}

function restoreSections() {
  try {
    const collapsed = JSON.parse(localStorage.getItem('tfSectionState') || '[]');
    collapsed.forEach(n => g('sec-'+n)?.classList.add('collapsed'));
  } catch(e) {}
}

/* ── JSON save/load ── */
function getState() {
  const traits = [];
  for (let i = 1; i <= 4; i++) {
    traits.push({
      type:       g(`traitType${i}`)?.value  || '',
      size:       g(`traitSize${i}`)?.value  || 'Short',
      xOffset: parseInt(g(`traitOffX${i}`)?.value) || 0,
    });
  }
  return {
    cardType: g('cardType').value,
    faction: g('faction').value,
    dualFaction: g('dualFaction')?.checked || false,
    upgradeType: g('upgradeType')?.value || 'Attack',
    faction2:    g('faction2')?.value    || '',
    cardName: g('cardName').value,
    cardSubtitle: g('cardSubtitle').value,
    starCount: g('starCount').value,
    starsUse5:  g('starsUse5')?.checked  || false,
    starsUse10: g('starsUse10')?.checked || false,
    modeBox: g('modeBox').value,
    statAtk: g('statAtk').value,
    statHp: g('statHp').value,
    statDef: g('statDef').value,
    altAtk: g('altAtk').value,
    altDef: g('altDef').value,
    traits,
    altTraits: [1,2,3,4].map(i => ({ type: g(`altTraitType${i}`)?.value || '', size: g(`altTraitSize${i}`)?.value || 'Short' })),
    abilityFontSize: g('abilityFontSize').value,
    altAbilityFontSize: g('altAbilityFontSize').value,
    posAbilityBox: g('posAbilityBox').value,
    posAltAbilityBox: g('posAltAbilityBox').value,
    abilityBody: g('abilityBody').value,
    altAbilityBody: g('altAbilityBody').value,
    artPosY: g('artPosY').value,
    artScale: g('artScale').value,
    altArtPosY: g('altArtPosY')?.value || '0',
    altArtScale: g('altArtScale')?.value || '100',
    cardWave: g('cardWave').value,
    cardId: g('cardId').value,
    cardCredit: g('cardCredit').value,
  };
}

function applyState(s) {
  const set = (id, val) => { if (val !== undefined && g(id)) g(id).value = val; };
  set('cardType',    s.cardType);
  set('faction',     s.faction);
  set('cardName',    s.cardName);
  set('cardSubtitle',s.cardSubtitle);
  set('starCount',   s.starCount);
  if (g('starsUse5'))  g('starsUse5').checked  = s.starsUse5  || false;
  if (g('starsUse10')) g('starsUse10').checked = s.starsUse10 || false;
  set('statAtk',     s.statAtk);
  set('statHp',      s.statHp);
  set('statDef',     s.statDef);
  set('altAtk',      s.altAtk);
  set('altDef',      s.altDef);
  set('abilityFontSize',    s.abilityFontSize);
  set('altAbilityFontSize', s.altAbilityFontSize);
  set('posAbilityBox',    s.posAbilityBox);
  set('posAltAbilityBox', s.posAltAbilityBox);
  ['posAbilityBox','posAltAbilityBox'].forEach(id => {
    const el = g(id); if (el) { const lbl = g(id+'Val'); if (lbl) lbl.textContent = el.value + '%'; }
  });
  set('abilityBody',        s.abilityBody);
  set('altAbilityBody', s.altAbilityBody);
  set('artPosY',     s.artPosY);
  set('artScale',    s.artScale);
  set('altArtPosY',  s.altArtPosY);
  set('altArtScale', s.altArtScale);
  set('cardWave',    s.cardWave);
  set('cardId',      s.cardId);
  set('cardCredit',  s.cardCredit);
  if (g('dualFaction') && s.dualFaction !== undefined) g('dualFaction').checked = s.dualFaction;
  if (g('upgradeType') && s.upgradeType) g('upgradeType').value = s.upgradeType;
  if (g('faction2')    && s.faction2    !== undefined) g('faction2').value = s.faction2;
  onTypeChange(); // rebuilds mode box options + trait rows
  set('modeBox', s.modeBox);
  if (s.traits) {
    s.traits.forEach((t, i) => {
      const ti = g(`traitType${i+1}`);
      const si = g(`traitSize${i+1}`);
      const xi = g(`traitOffX${i+1}`);
      const xv = g(`traitOffXVal${i+1}`);
      if (ti) ti.value = t.type || '';
      if (si) si.value = t.size || 'Long';
      const xVal = t.xOffset !== undefined ? t.xOffset : (TRAIT_X_DEFAULTS[i+1] ?? 0);
      if (xi) { xi.value = xVal; }
      if (xv) { xv.textContent = xVal; }
    });
  }
  if (s.altTraits) {
    s.altTraits.forEach((t, i) => {
      const ti = g(`altTraitType${i+1}`);
      if (ti) ti.value = t.type || '';
      const si = g(`altTraitSize${i+1}`);
      if (si) si.value = t.size || 'Long';
    });
  }
  render();
}

/* ── Persistence ── */
// State JSON → localStorage (small, sync-friendly)
// Artwork images → IndexedDB (large, no quota issues)
let _saveTimer = null;
function saveToStorage() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    try { localStorage.setItem('tfCardState', JSON.stringify(getState())); } catch(e) {}
  }, 300);
}

// State flush on unload (artworks already persisted to IndexedDB on upload)
window.addEventListener('beforeunload', () => {
  try { localStorage.setItem('tfCardState', JSON.stringify(getState())); } catch(e) {}
});

async function loadFromStorage() {
  // 1. Restore card state (sync)
  try {
    const raw = localStorage.getItem('tfCardState');
    if (raw) applyState(JSON.parse(raw));
  } catch(e) {}

  // 2. Restore bot artwork
  try {
    const art = await artStore.get('bot');
    if (art) { artworkSrc = art; render(); }
  } catch(e) {}

  // 3. Restore alt artwork
  try {
    const altArt = await artStore.get('alt');
    if (altArt) { altArtworkSrc = altArt; renderBack(); }
  } catch(e) {}
}

function copyJSON() {
  navigator.clipboard.writeText(JSON.stringify(getState(), null, 2))
    .then(() => alert('Card JSON copied to clipboard!'))
    .catch(() => { const t = document.createElement('textarea'); t.value = JSON.stringify(getState(),null,2); document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t); alert('Copied!'); });
}

function resetToDefaults() {
  if (!confirm('Reset everything to defaults? This will clear all card data and cannot be undone.')) return;
  try { localStorage.removeItem('tfCardState'); } catch(e) {}
  // Also clear any old localStorage artwork keys from previous versions
  try { localStorage.removeItem('tfCardArt'); } catch(e) {}
  try { localStorage.removeItem('tfCardAltArt'); } catch(e) {}
  artStore.del('bot').catch(() => {});
  artStore.del('alt').catch(() => {});
  artworkSrc = null;
  altArtworkSrc = null;
  // Reset all inputs to their default values
  g('cardType').value    = 'Character - Standard';
  g('faction').value     = 'Autobot';
  if (g('faction2'))     g('faction2').value = '';
  g('cardName').value    = 'CARD NAME';
  g('cardSubtitle').value = '';
  g('starCount').value   = '0';
  if (g('starsUse5'))  g('starsUse5').checked  = false;
  if (g('starsUse10')) g('starsUse10').checked = false;
  g('statAtk').value  = '0';
  g('statHp').value   = '0';
  g('statDef').value  = '0';
  g('altAtk').value   = '0';
  g('altDef').value   = '0';
  g('abilityBody').value    = '';
  g('altAbilityBody').value = '';
  g('abilityFontSize').value    = '7.5';
  g('altAbilityFontSize').value = '7.5';
  g('posAbilityBox').value    = '14';
  g('posAltAbilityBox').value = '14';
  g('posAbilityBoxVal').textContent    = '14%';
  g('posAltAbilityBoxVal').textContent = '14%';
  g('artPosY').value  = '0';
  g('artScale').value = '100';
  if (g('altArtPosY'))  g('altArtPosY').value  = '0';
  if (g('altArtScale')) g('altArtScale').value  = '100';
  g('cardWave').value   = '';
  g('cardId').value     = '';
  g('cardCredit').value = '';
  if (g('artUpload'))    g('artUpload').value    = '';
  if (g('altArtUpload')) g('altArtUpload').value = '';
  resetProgress();
  onTypeChange();
}

function loadJSON() {
  g('jsonInput').value = '';
  g('jsonError').textContent = '';
  g('jsonModal').classList.add('open');
  setTimeout(() => g('jsonInput').focus(), 50);
}

function closeJSONModal(e) {
  if (e && e.target !== g('jsonModal')) return; // only close on backdrop click
  g('jsonModal').classList.remove('open');
}

function confirmLoadJSON() {
  const json = g('jsonInput').value.trim();
  if (!json) return;
  try {
    applyState(JSON.parse(json));
    g('jsonModal').classList.remove('open');
  } catch(e) {
    g('jsonError').textContent = '⚠ Invalid JSON — ' + e.message;
  }
}

/* ── Filename builder ── */
function buildFilename(side) {
  // Wave number: extract digits from wave field e.g. "WAVE 8" → "8"
  const waveNum = (g('cardWave').value || '').match(/\d+/)?.[0] || '0';

  // Type letter: C / B / S
  const typeKey = g('cardType').value;
  const typeLetter = typeKey.startsWith('Character') ? 'C'
                   : typeKey.startsWith('Battle')    ? 'B'
                   : typeKey.startsWith('Stratagem') ? 'S' : 'X';

  // Card number: first T-number in the ID field e.g. "CT T02   T31" → "002"
  const idMatch = (g('cardId').value || '').match(/T(\d+)/);
  const cardNum = idMatch ? idMatch[1].padStart(3, '0') : '000';

  return `FMW${waveNum}_${typeLetter}_${cardNum}_${side}`;
}

/* ── PNG Export ── */
function updateExportBtn() {
  const hasTwoSides = g('backCardCol')?.style.display !== 'none';
  const btn = g('exportBtn');
  if (!btn) return;
  btn.textContent = hasTwoSides ? 'Export PNGs ↓' : 'Export PNG ↓';
  // Re-apply disabled state based on current progress
  updateProgress();
}

async function exportCard(cardEl, filename) {
  cardEl.style.borderRadius = '0';
  const canvas = await html2canvas(cardEl, {
    scale: 3,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#111111',
    logging: false,
  });
  cardEl.style.borderRadius = '';
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

async function exportPNG() {
  const btn = g('exportBtn');
  btn.textContent = 'Generating…';
  btn.disabled = true;
  try {
    const hasTwoSides = g('backCardCol')?.style.display !== 'none';
    if (hasTwoSides) {
      await exportCard(g('card'),   buildFilename('f') + '.png');
      await exportCard(g('b_card'), buildFilename('b') + '.png');
    } else {
      await exportCard(g('card'), buildFilename('f') + '.png');
    }
  } catch(e) {
    alert('Export failed: ' + e.message + '\n\nTip: serve via "python3 -m http.server 8080" and open localhost:8080 for best results with local images.');
  } finally {
    updateExportBtn(); // sets label and re-applies disabled state from progress
  }
}

/* ── Clone front card to create the back card DOM ── */
function buildBackCard() {
  const front = g('card');
  const back  = front.cloneNode(true);
  back.id = 'b_card';
  back.querySelectorAll('[id]').forEach(el => { el.id = 'b_' + el.id; });
  back.querySelectorAll('img').forEach(el => { el.src = ''; el.style.display = 'none'; });
  g('b_cardWrapper').appendChild(back);
}

/* ── Render the back card by mirroring layers then overriding text ── */
function renderBack() {
  if (!g('b_card')) return;
  const p = id => g('b_' + id);
  const config = CARD_CONFIGS[g('cardType').value];

  // Mirror every layer image from front → back (lArt and lStarSep handled separately below)
  const ALL_LAYERS = ['lGradient','lHeaderBg','lHeaderLines','lHeaderOverlay','lHeaderOverlay2',
    'lMainFrame','lFactionFrame','lFactionIcon','lFactionIcon2','lFactionDual',
    'lTrait1','lTrait2','lTrait3','lTrait4',
    'lModeBox','lTextbox','lHeaderMask'];
  ALL_LAYERS.forEach(id => {
    const f = g(id), b = p(id);
    if (!f || !b) return;
    b.src           = f.src;
    b.style.cssText = f.style.cssText;
  });

  // Alt artwork — independent of bot art, no fallback
  const bArtEl = p('lArt');
  if (bArtEl) {
    if (altArtworkSrc) {
      const config2 = CARD_CONFIGS[g('cardType').value];
      const posY    = parseInt(g('altArtPosY')?.value)  || 0;
      const scale   = parseInt(g('altArtScale')?.value) || 100;
      const baseTop = parseFloat(config2.artTop) || 16;
      bArtEl.src                  = altArtworkSrc;
      bArtEl.style.display        = '';
      bArtEl.style.top            = (baseTop + posY * 0.4) + '%';
      bArtEl.style.height         = scale + '%';
      bArtEl.style.width          = '100%';
      bArtEl.style.objectFit      = 'cover';
      bArtEl.style.objectPosition = 'center top';
    } else {
      bArtEl.src = ''; bArtEl.style.display = 'none';
    }
  }

  // Set Slash + Stamp — front card only
  const bSetSlash = p('lSetSlash');
  if (bSetSlash) { bSetSlash.src = ''; bSetSlash.style.display = 'none'; }
  const bStamp = p('lStamp');
  if (bStamp) bStamp.style.display = 'none';

  // Stars + star separator — alt mode card only
  const bStarSep = p('lStarSep');
  const bStarsFooter = p('tStarsFooter');
  let starCount = parseInt(g('starCount').value) || 0;
  if (starCount > 0 && bStarSep) {
    bStarSep.src = cc(config.folder, `${g('cardType').value} - Star Separator.png`);
    bStarSep.style.display = '';
  } else if (bStarSep) {
    bStarSep.src = ''; bStarSep.style.display = 'none';
  }
  if (bStarsFooter) {
    bStarsFooter.style.bottom = '5%';
    bStarsFooter.innerHTML = '';
    if (starCount > 0) {
      const use10 = g('starsUse10')?.checked;
      const use5  = g('starsUse5')?.checked;
      const imgs = [];
      if (use10) { const n = Math.floor(starCount / 10); starCount %= 10; for (let i = 0; i < n; i++) imgs.push(10); }
      if (use5)  { const n = Math.floor(starCount / 5);  starCount %= 5;  for (let i = 0; i < n; i++) imgs.push(5);  }
      for (let i = 0; i < starCount; i++) imgs.push(1);
      const useGroupGaps = !use5 && !use10;
      let runningTotal = 0;
      imgs.forEach(v => {
        if (useGroupGaps && runningTotal > 0 && runningTotal % 5 === 0) {
          const spacer = document.createElement('span');
          spacer.style.cssText = 'width:4px;flex-shrink:0;';
          bStarsFooter.appendChild(spacer);
        }
        const img = document.createElement('img');
        img.src = cc('icons', `Icon - Stars ${v}.png`);
        img.style.cssText = 'height:12px;width:auto;';
        bStarsFooter.appendChild(img);
        runningTotal += v;
      });
      bStarsFooter.style.display = 'flex';
    } else {
      bStarsFooter.style.display = 'none';
    }
  }

  // Re-render alt traits on back card using alt mode trait selects
  if (config.hasTraits && config.traitBarTop) {
    const SCALE = 0.48, GAP = -26, T_BAR_H = Math.round(60 * 0.48);
    const traitTopPx = parseFloat(config.traitBarTop) / 100 * 530;
    const maxT = config.folder === 'battle' ? 2 : 4;
    let offsetRight = 380;
    for (let slot = 1; slot <= maxT; slot++) {
      const size     = g(`altTraitSize${slot}`)?.value || g(`traitSize${slot}`)?.value || 'Short';
      const nw       = size === 'Long' ? 393 : 270;
      const displayW = Math.round(nw * SCALE);
      offsetRight   -= displayW + GAP;
      const traitEl  = p(`lTrait${slot}`);
      if (!traitEl) continue;
      const hasValue = !!g(`altTraitType${slot}`)?.value;
      if (hasValue) {
        const xAdj = parseInt(g(`traitOffX${slot}`)?.value) || 0;
        const cardTypeVal = g('cardType').value;
        const src = config.folder === 'battle'
          ? cc('battle', `Battle - Trait ${slot} ${size}.png`)
          : cc(config.folder, `${cardTypeVal} - Trait ${slot} ${size}.png`);
        traitEl.src = src;
        traitEl.style.cssText = `position:absolute;display:block;pointer-events:none;top:${traitTopPx}px;left:${offsetRight+(TRAIT_X_BASE[slot]||0)+xAdj}px;width:${displayW}px;height:${T_BAR_H}px;object-fit:fill;`;
      } else {
        traitEl.style.display = 'none';
      }
    }
    // Re-render alt trait text overlay
    const backTraitBar = p('tTraitBar');
    if (backTraitBar) {
      backTraitBar.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;display:block;';
      backTraitBar.innerHTML = '';
      let oR = 380;
      for (let slot = 1; slot <= maxT; slot++) {
        const size = g(`altTraitSize${slot}`)?.value || g(`traitSize${slot}`)?.value || 'Short';
        const nw = size === 'Long' ? 393 : 270;
        const displayW = Math.round(nw * SCALE);
        oR -= displayW + GAP;
        const traitName = g(`altTraitType${slot}`)?.value || '';
        if (!traitName) continue;
        const xAdj = parseInt(g(`traitOffX${slot}`)?.value) || 0;
        const leftPx = oR + (TRAIT_X_BASE[slot]||0) + xAdj + 21;
        const item = document.createElement('div');
        item.style.cssText = `position:absolute;top:${traitTopPx}px;left:${leftPx}px;width:${displayW}px;height:${T_BAR_H}px;display:flex;align-items:center;gap:8px;padding:0 6px;overflow:hidden;`;
        item.innerHTML =
          `<img src="card_components/traits/Trait - ${traitName}.png" style="width:17px;height:17px;object-fit:contain;flex-shrink:0;position:relative;top:3px;">` +
          `<span style="font-size:8px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:0.5px;font-family:'OpenSansSemiBold',sans-serif;white-space:nowrap;">${traitName.toUpperCase()}</span>`;
        backTraitBar.appendChild(item);
      }
    }
  }

  // Mirror stats bar visibility + structure (tTraitBar handled above)
  ['statsBar','abilityBox','abilityBoxWide','altModePanel',
   'tStratagemSubtitle','tSubtitle'].forEach(id => {
    const f = g(id), b = p(id);
    if (f && b) { b.style.cssText = f.style.cssText; b.innerHTML = f.innerHTML; }
  });

  // Mirror simple text fields
  ['tName','tCredit'].forEach(id => {
    const f = g(id), b = p(id);
    if (f && b) b.textContent = f.textContent;
  });
  const bWave = p('tWave'); if (bWave) { bWave.textContent = ''; bWave.style.display = 'none'; }
  const bId   = p('tId');   if (bId)   { bId.textContent   = ''; bId.style.display   = 'none'; }
  const bCredit = p('tCredit');
  if (bCredit) { bCredit.style.bottom = '4.6%'; bCredit.style.right = '22.2%'; }

  if (!config.hasStats) return; // Stratagem / Battle: no stat swap needed

  const bCard = g('b_card');
  const bq = id => bCard?.querySelector('#' + id);

  // Swap main stats — alt mode card shows alt ATK/DEF as primary
  const bAtk = bq('tAtk'); if (bAtk) bAtk.textContent = g('altAtk').value || '0';
  const bDef = bq('tDef'); if (bDef) bDef.textContent = g('altDef').value || '0';

  // Mode labels
  const bModeLabel = p('tModeLabel');     if (bModeLabel)    bModeLabel.textContent    = 'ALT MODE';
  const bAltModeLabel = bq('tAltModeLabel'); if (bAltModeLabel) bAltModeLabel.textContent = 'BOT';

  // Corner panel shows bot ATK/DEF on the alt mode card
  const bAltAtk = bq('tAltAtk'); if (bAltAtk) bAltAtk.textContent = g('statAtk').value || '0';
  const bAltDef = bq('tAltDef'); if (bAltDef) bAltDef.textContent = g('statDef').value || '0';

  // Alt ability text
  const aBody     = g('altAbilityBody').value  || '';
  const aFontSize = parseFloat(g('altAbilityFontSize')?.value) || 7.5;
  const useWide   = !config.hasStats;

  const bAbilityBox     = g('b_abilityBox');
  const bAbilityBoxWide = g('b_abilityBoxWide');
  const posAltAbilityBox = parseFloat(g('posAltAbilityBox')?.value) ?? 14;
  if (bAbilityBox)     { bAbilityBox.style.fontSize = aFontSize + 'px'; bAbilityBox.style.bottom = posAltAbilityBox + '%'; }
  if (bAbilityBoxWide) { bAbilityBoxWide.style.fontSize = aFontSize + 'px'; bAbilityBoxWide.style.bottom = posAltAbilityBox + '%'; }

  if (useWide) {
    const bAbWide = bq('tAbilityBodyWide'); if (bAbWide) bAbWide.innerHTML = formatAbilityText(aBody);
    const bApWide = bq('tAbilityParenWide'); if (bApWide) bApWide.textContent = '';
  } else {
    const bAbName  = bq('tAbilityName');  if (bAbName)  bAbName.textContent  = '';
    const bAbParen = bq('tAbilityParen'); if (bAbParen) bAbParen.textContent = '';
    const bAbBody  = bq('tAbilityBody');  if (bAbBody)  bAbBody.innerHTML  = formatAbilityText(aBody);
  }
}

/* ── Progress tracker ── */
const PROGRESS_STEPS = ['type','identity','traits','stats','ability','artwork','info'];

function updateProgress() {
  const total    = PROGRESS_STEPS.length;
  const done     = PROGRESS_STEPS.filter(s => g('prog_' + s)?.checked).length;
  const complete = done === total;
  const pct      = Math.round((done / total) * 100);
  const fill     = g('progressBarFill');
  const label    = g('progressLabel');
  const btn      = g('exportBtn');
  if (fill)  { fill.style.width = pct + '%'; fill.classList.toggle('complete', complete); }
  if (label) label.textContent = complete ? '✦ Complete' : `${done} / ${total} complete`;
  if (btn) {
    btn.disabled = !complete;
    btn.style.opacity = complete ? '' : '0.4';
    btn.title = complete ? '' : 'Complete all progress steps to enable export';
  }
  saveProgressToStorage();
}

function saveProgressToStorage() {
  const state = {};
  PROGRESS_STEPS.forEach(s => { state[s] = g('prog_' + s)?.checked || false; });
  try { localStorage.setItem('tfCardProgress', JSON.stringify(state)); } catch(e) {}
}

function loadProgressFromStorage() {
  try {
    const raw = localStorage.getItem('tfCardProgress');
    if (!raw) return;
    const state = JSON.parse(raw);
    PROGRESS_STEPS.forEach(s => {
      const el = g('prog_' + s);
      if (el && state[s] !== undefined) el.checked = state[s];
    });
    updateProgress();
  } catch(e) {}
}

function resetProgress() {
  PROGRESS_STEPS.forEach(s => { const el = g('prog_' + s); if (el) el.checked = false; });
  updateProgress();
}

/* ── Init ── */
buildBackCard();
buildTraitRows();
onTypeChange(); // sets mode box options etc.
loadFromStorage(); // restore saved state, falls back to render() if nothing saved
loadProgressFromStorage();
restoreSections();
