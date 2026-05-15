/* ── card_composer_shared.js ──────────────────────────────────────────────
   Utilities shared by all card-type composers.
   Loaded once by the shell before any composer script.
   ──────────────────────────────────────────────────────────────────────── */

'use strict';

/* ── Composer registry (populated by each composer file) ── */
window.Composers = {};

/* ── DOM shorthand ── */
const g = id => document.getElementById(id);

/* ── Asset resolution ─────────────────────────────────────────────────── */
function assetUrl(key) {
  return (typeof CARD_COMPONENTS_BUNDLE !== 'undefined' && CARD_COMPONENTS_BUNDLE[key])
    ? CARD_COMPONENTS_BUNDLE[key]
    : `card_components/${key}`;
}
const cc = (folder, file) => assetUrl(`${folder}/${file}`);

function abilityImgSrc(name) {
  if (name.startsWith('Trait - ')) return assetUrl(`traits/${name}.png`);
  if (name.startsWith('Icon - '))  return assetUrl(`icons/${name}.png`);
  return null;
}

/* ── IndexedDB artwork store ──────────────────────────────────────────── */
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

/* ── Trait names (shared for icon pre-conversion) ──────────────────────── */
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

/* ── Pre-converted image caches ─────────────────────────────────────────── */
// Black versions of trait/stat icons for ability text (html2canvas ignores CSS filter)
const _blackCache = new Map();

// 4× pre-scaled trait icons — html2canvas ignores object-fit, so we hand it
// correctly-sized source images rather than letting it upscale full-size PNGs.
const _traitIconCache = new Map();

async function preconvertBlackImages() {
  const keys = [
    ...TRAIT_NAMES.map(n => `traits/Trait - ${n}.png`),
    'icons/Icon - Stat - ATK.png',
    'icons/Icon - Stat - DEF.png',
    'icons/Icon - Stat - HEALTH.png',
    'icons/Icon - Stars 1.png',
    'icons/Icon - Stars 5.png',
    'icons/Icon - Stars 10.png',
  ];
  await Promise.all(keys.map(key => new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < id.data.length; i += 4)
          if (id.data[i + 3] > 0) { id.data[i] = id.data[i+1] = id.data[i+2] = 0; }
        ctx.putImageData(id, 0, 0);
        _blackCache.set(key, canvas.toDataURL('image/png'));
      } catch(e) {}
      resolve();
    };
    img.onerror = resolve;
    img.crossOrigin = 'anonymous';
    img.src = assetUrl(key);
  })));
}

async function preconvertTraitIcons() {
  const CSS_SIZE    = 17;
  const RENDER_SIZE = CSS_SIZE * 4; // 4× so html2canvas scale:3 export stays crisp
  await Promise.all(TRAIT_NAMES.map(name => new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = RENDER_SIZE;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        const scale = Math.min(RENDER_SIZE / img.naturalWidth, RENDER_SIZE / img.naturalHeight);
        const w = img.naturalWidth  * scale;
        const h = img.naturalHeight * scale;
        ctx.drawImage(img, (RENDER_SIZE - w) / 2, (RENDER_SIZE - h) / 2, w, h);
        _traitIconCache.set(name, canvas.toDataURL('image/png'));
      } catch(e) {}
      resolve();
    };
    img.onerror = resolve;
    img.crossOrigin = 'anonymous';
    img.src = assetUrl(`traits/Trait - ${name}.png`);
  })));
}

/* ── Font injection ──────────────────────────────────────────────────────
   Called once by the shell on page load. Each composer's fonts are
   declared here so the @font-face rules outlive any single composer.   */
function injectBundledFonts() {
  const FONTS = [
    { family: 'BayformersName',     file: 'fonts/Font - Card Name - Bayformers TFTCGName Regular.ttf',               fmt: 'truetype' },
    { family: 'GothamNarrow',       file: 'fonts/Font - Ability Text - Gotham Narrow-Book.ttf',                      fmt: 'truetype' },
    { family: 'GothamNarrowMedium', file: 'fonts/Font - Keywords - Gotham Narrow-Medium.otf',                        fmt: 'opentype' },
    { family: 'GothamNarrowItalic', file: 'fonts/Font - Explanatio Text - Gotham Narrow-Book Italic.otf',            fmt: 'opentype' },
    { family: 'ArmadaCondensed',    file: 'fonts/Font - Stats - Armada Condensed Bold.otf',                          fmt: 'opentype' },
    { family: 'OpenSansSCBold',     file: 'fonts/Font - Character Mode - OpenSans SemiCondensed Bold.ttf',           fmt: 'truetype' },
    { family: 'OpenSansSemiBold',   file: 'fonts/Font - Traits - OpenSans SemiBold.ttf',                             fmt: 'truetype' },
    { family: 'OpenSansBold',       file: 'fonts/Font - Wave, Credits - OpenSans Bold.ttf',                          fmt: 'truetype' },
    { family: 'OpenSansSCMedItal',  file: 'fonts/Font - Stratagem Target - OpenSans SemiCondensed MediumItalic.ttf', fmt: 'truetype' },
    { family: 'CybertonicFont',     file: 'fonts/Font - Cybertonian - Giedi Ancient Autobot.ttf',                    fmt: 'truetype' },
    { family: 'BattleCardType',     file: 'fonts/Font - Battle Card Type - Source Sans Pro Bold It.otf',              fmt: 'opentype' },
  ];
  const hasBundle = typeof CARD_COMPONENTS_BUNDLE !== 'undefined';
  const css = FONTS.map(({ family, file, fmt }) => {
    const src = hasBundle && CARD_COMPONENTS_BUNDLE[file]
      ? `url('${CARD_COMPONENTS_BUNDLE[file]}') format('${fmt}')`
      : `url('card_components/${file}') format('${fmt}')`;
    return `@font-face { font-family: '${family}'; src: ${src}; }`;
  }).join('\n');
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
}

/* ── Ability text formatter ──────────────────────────────────────────────
   Shared markup → HTML parser used by all composers.                    */
function formatAbilityText(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/--&gt;/g, '<span style="font-family:\'GothamNarrowMedium\',sans-serif;font-size:1.4em;vertical-align:-0.15em;">→</span>')
    .replace(/\*\*(.+?)\*\*/g, '<span style="font-family:\'GothamNarrowMedium\',sans-serif;">$1</span>')
    .replace(/\*([^*]+?)\*/g, '<span style="font-family:\'GothamNarrowItalic\',sans-serif;">$1</span>')
    .replace(/\[([^\]]+)\]/g, (_, name) => {
      let src = abilityImgSrc(name);
      const needsBlack = name.startsWith('Trait - ') || name.startsWith('Icon - Stat - ') || name.startsWith('Icon - Stars');
      if (needsBlack) {
        const key = name.startsWith('Trait - ') ? `traits/${name}.png` : `icons/${name}.png`;
        const black = _blackCache.get(key);
        if (black) {
          src = black;
        } else {
          const height = name.startsWith('Icon - Small ') ? '1.11em' : name.startsWith('Icon - Stars') ? '0.9em' : '1.3em';
          const vAlign = name.startsWith('Icon - Stars') ? 'vertical-align:middle;transform:translateY(-2px);' : 'vertical-align:middle;';
          return src ? `<img src="${src}" style="height:${height};width:auto;${vAlign}filter:brightness(0);">` : `[${name}]`;
        }
      }
      const height = name.startsWith('Icon - Small ') ? '1.11em' : name.startsWith('Icon - Stars') ? '0.9em' : '1.3em';
      const vAlign = name.startsWith('Icon - Stars') ? 'vertical-align:middle;transform:translateY(-2px);' : 'vertical-align:middle;';
      return src ? `<img src="${src}" style="height:${height};width:auto;${vAlign}">` : `[${name}]`;
    })
    .replace(/\n/g, '<span style="display:block;height:0.2em;"></span>');
}

/* ── Layer helper ────────────────────────────────────────────────────────
   Sets or clears a card layer <img> element.                            */
function setLayer(id, src) {
  const el = g(id);
  if (!el) return;
  if (src) { el.src = src; el.style.display = ''; }
  else      { el.src = ''; el.style.display = 'none'; }
}

/* ── PNG Export ──────────────────────────────────────────────────────────
   shiftMap:   { elementId: pixelsUp } — composer-specific corrections.
   iconNudge:  extra px to nudge trait icon <img width="17"> elements down.
   scale:      html2canvas render scale (default 3).
   exportW/H:  if provided, resize canvas to exactly this output size.    */
async function exportCard(cardEl, filename, { shiftMap = {}, leftShiftMap = {}, iconNudge = 0, scale = 3, exportW, exportH } = {}) {
  await document.fonts.ready;
  const savedRadius = cardEl.style.borderRadius;
  cardEl.style.borderRadius = '0';
  try {
    let canvas = await html2canvas(cardEl, {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#111111',
      logging: false,
      onclone: (_doc, clonedCard) => {
        clonedCard.style.boxShadow = 'none';
        const cardRect = cardEl.getBoundingClientRect();
        const zoomY    = cardRect.height / cardEl.offsetHeight;
        clonedCard.querySelectorAll('.card-text').forEach(el => {
          if (!el.id) return;
          const baseId = el.id.replace(/^b_/, '');
          const shift  = shiftMap[baseId] ?? 2;
          const orig   = cardEl.querySelector('[id="' + el.id + '"]');
          if (!orig) return;
          const relTop = (orig.getBoundingClientRect().top - cardRect.top) / zoomY;
          el.style.top    = (relTop - shift) + 'px';
          el.style.bottom = '';
          const leftShift = leftShiftMap[baseId];
          if (leftShift !== undefined) {
            const origLeft = parseFloat(orig.style.left) || 0;
            el.style.left = (origLeft + leftShift) + 'px';
          }
        });
        if (iconNudge !== 0) {
          clonedCard.querySelectorAll('img[width="17"]').forEach(img => {
            img.style.top = ((parseFloat(img.style.top) || 3) + iconNudge) + 'px';
          });
        }
      },
    });
    // Resize to exact output dimensions if specified
    if (exportW && exportH && (canvas.width !== exportW || canvas.height !== exportH)) {
      const resized = document.createElement('canvas');
      resized.width  = exportW;
      resized.height = exportH;
      resized.getContext('2d').drawImage(canvas, 0, 0, exportW, exportH);
      canvas = resized;
    }
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } finally {
    cardEl.style.borderRadius = savedRadius;
  }
}
