/* ===================================================
   CUSTOM CURSOR
   =================================================== */
const cursorDot = document.querySelector('.cursor-dot');
const cursorTrail = document.querySelector('.cursor-trail');
const trailCtx = cursorTrail && cursorTrail.getContext('2d');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let trailRaf = 0;

const touchQuery = window.matchMedia('(hover: none), (pointer: coarse)');
let isTouchDevice = touchQuery.matches;

function applyTouchModeUI() {
    isTouchDevice = touchQuery.matches;
    if (cursorDot) cursorDot.style.display = isTouchDevice ? 'none' : '';
    if (cursorTrail) cursorTrail.style.display = isTouchDevice ? 'none' : '';
}

function sizeTrail() {
    if (!trailCtx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cursorTrail.width = window.innerWidth * dpr;
    cursorTrail.height = window.innerHeight * dpr;
    trailCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/* Traînée : une courte liste de points récents, redessinée proprement à chaque image
   (effacement complet -> aucune trace ni "poussière" qui reste). Chaque bout de trait
   pâlit et s'affine selon son âge, donc les mouvements rapides restent nets. */
const TRAIL_LIFE_MS = 160;
const trailPts = [];
// couleurs de la traînée : changées par l'équipement (minijeux.js)
window.trailTint = { glow: '143, 184, 255', core: '232, 240, 255', rainbow: false };

function trailFrame() {
    const now = performance.now();
    while (trailPts.length && now - trailPts[0].t > TRAIL_LIFE_MS) trailPts.shift();
    trailCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    trailCtx.lineCap = 'round';
    const tint = window.trailTint;
    trailCtx.shadowColor = `rgba(${tint.glow}, 0.9)`;
    trailCtx.shadowBlur = 10;
    for (let i = 1; i < trailPts.length; i++) {
        const a = trailPts[i - 1];
        const b = trailPts[i];
        if (b.cut) continue; // pause (souris sortie de la page, jeu ouvert...) : on ne relie pas
        const k = 1 - (now - b.t) / TRAIL_LIFE_MS;
        trailCtx.beginPath();
        trailCtx.moveTo(a.x, a.y);
        trailCtx.lineTo(b.x, b.y);
        trailCtx.lineWidth = 0.5 + 2.8 * k;
        if (tint.rainbow) {
            const hue = (now / 6 + i * 9) % 360;
            trailCtx.strokeStyle = `hsla(${hue}, 100%, 75%, ${k})`;
            trailCtx.shadowColor = `hsla(${hue}, 100%, 60%, 0.9)`;
        } else trailCtx.strokeStyle = `rgba(${tint.core}, ${k})`;
        trailCtx.stroke();
    }
    trailCtx.shadowBlur = 0;
    trailRaf = trailPts.length ? requestAnimationFrame(trailFrame) : 0;
}

function addTrailPoint(x, y) {
    const t = performance.now();
    const last = trailPts[trailPts.length - 1];
    if (last && Math.abs(last.x - x) + Math.abs(last.y - y) < 2) return;
    trailPts.push({ x, y, t, cut: !last || t - last.t > 80 });
    if (trailPts.length > 80) trailPts.shift();
    if (!trailRaf) trailRaf = requestAnimationFrame(trailFrame);
}

sizeTrail();
window.addEventListener('resize', sizeTrail);

applyTouchModeUI();

if (typeof touchQuery.addEventListener === 'function') {
    touchQuery.addEventListener('change', applyTouchModeUI);
} else if (typeof touchQuery.addListener === 'function') {
    touchQuery.addListener(applyTouchModeUI);
}

/* ===================================================
   NEKO MODE (official oneko.js)
   =================================================== */
const nekoToggle = document.getElementById('nekoToggle');
const logoWrap = document.querySelector('.logo-wrap');

function positionNekoToggle() {
    if (!nekoToggle || !logoWrap || isTouchDevice) return;

    const rect = logoWrap.getBoundingClientRect();
    const isCompact = window.innerWidth <= 768;
    const left = rect.right + (isCompact ? 6 : 10);

    document.documentElement.style.setProperty('--neko-toggle-left', `${left}px`);
}

function revealOnekoAtToggle() {
    const oneko = document.getElementById('oneko');
    if (!oneko || !nekoToggle) return;

    const rect = nekoToggle.getBoundingClientRect();
    oneko.style.left = `${rect.left}px`;
    oneko.style.top = `${rect.top}px`;
    oneko.style.display = 'block';
}

if (nekoToggle && isTouchDevice) {
    nekoToggle.style.display = 'none';
}

if (nekoToggle) {
    const updateNekoToggleVisibility = () => {
        if (isTouchDevice) {
            nekoToggle.style.display = 'none';
        } else {
            nekoToggle.style.display = '';
            positionNekoToggle();
        }
    };

    updateNekoToggleVisibility();

    const oneko = document.getElementById('oneko');
    if (oneko) oneko.style.display = 'none';

    nekoToggle.addEventListener('click', () => {
        revealOnekoAtToggle();
        nekoToggle.style.display = 'none';
    });

    window.addEventListener('resize', positionNekoToggle);

    if (typeof touchQuery.addEventListener === 'function') {
        touchQuery.addEventListener('change', updateNekoToggleVisibility);
    } else if (typeof touchQuery.addListener === 'function') {
        touchQuery.addListener(updateNekoToggleVisibility);
    }
}

window.addEventListener('pointermove', (e) => {
    if (isTouchDevice || !cursorDot || e.pointerType === 'touch') return;
    cursorDot.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
    if (!trailCtx || reduceMotion) return;
    // Les positions intermédiaires (souris rapide) évitent les grands traits droits
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    (events.length ? events : [e]).forEach(ev => addTrailPoint(ev.clientX, ev.clientY));
}, { passive: true });

document.querySelectorAll('a, button, .skill-td, .experience-stage').forEach(el => {
    el.addEventListener('mouseenter', () => cursorDot && cursorDot.classList.add('is-hover'));
    el.addEventListener('mouseleave', () => cursorDot && cursorDot.classList.remove('is-hover'));
});

/* ===================================================
   INTRO FLASH OVERLAY (secret trigger: double-click logo)
   =================================================== */
(function initIntroFlash() {
    const flash = document.getElementById('introFlash');
    const logoTrigger = document.querySelector('.logo');
    if (!flash || !logoTrigger) return;

    const GIF_URL = 'https://giffiles.alphacoders.com/124/12499.gif';
    const flashAudio = new Audio('./assets/fnaf/springtrap.mp3');
    flashAudio.volume = 0.02;

    logoTrigger.addEventListener('click', () => {
        flash.classList.remove('active');
        // force reflow so the CSS fade animation restarts if clicked again
        void flash.offsetWidth;

        // Recharge le GIF depuis le début : sinon le navigateur le garde
        // affiché sur sa dernière frame car l'image ne se "rejoue" pas
        // juste en togglant display:none/block, il faut changer l'URL.
        flash.style.backgroundImage = `url('${GIF_URL}?_=${Date.now()}')`;

        flash.classList.add('active');

        // Joue l'audio en même temps que le GIF apparaît
        flashAudio.currentTime = 0;
        flashAudio.play().catch(() => console.warn('Audio bloqué (interaction requise).'));
    });

    flash.addEventListener('animationend', () => {
        flash.classList.remove('active');
    });
})();

/* ===================================================
   PAGE LOADER
   =================================================== */
const rand = (a, b) => a + Math.random() * (b - a);

/* Fait voler en éclats l'image `snap` (un canvas) dessinée sur `ctx`.
   Utilisé par l'écran de chargement et par le Return by Death.
   opts : { W, H, dpr, cx, cy, crackMs, flyMs, toward (true = les éclats viennent vers l'écran), edge } */
function shatterCanvas(ctx, snap, opts, onDone) {
    const { W, H, dpr } = opts;
    const cx = opts.cx ?? W / 2;
    const cy = opts.cy ?? H / 2;
    const crackMs = opts.crackMs ?? 140;
    const flyS = (opts.flyMs ?? 1100) / 1000;
    const edge = opts.edge || 'rgba(201, 220, 255, 0.85)';
    const cols = W < 700 ? 5 : 8;
    const rows = W < 700 ? 8 : 5;

    // Grille déformée -> triangles
    const pts = [];
    for (let j = 0; j <= rows; j++) {
        pts[j] = [];
        for (let i = 0; i <= cols; i++) {
            const inner = i > 0 && i < cols && j > 0 && j < rows;
            pts[j][i] = {
                x: (i / cols) * W + (inner ? rand(-0.38, 0.38) * (W / cols) : 0),
                y: (j / rows) * H + (inner ? rand(-0.38, 0.38) * (H / rows) : 0),
            };
        }
    }
    const maxDist = Math.hypot(W, H) / 2;
    const shards = [];
    const addTri = (a, b, c) => {
        const mx = (a.x + b.x + c.x) / 3;
        const my = (a.y + b.y + c.y) / 3;
        const dx = mx - cx;
        const dy = my - cy;
        const dist = Math.hypot(dx, dy) || 1;
        const near = 1 - dist / maxDist; // les éclats proches de l'impact partent plus vite
        const speed = rand(260, 520) * (0.6 + near);
        const minX = Math.min(a.x, b.x, c.x), minY = Math.min(a.y, b.y, c.y);
        shards.push({
            tri: [a, b, c], mx, my,
            vx: (dx / dist) * speed,
            vy: (dy / dist) * speed - rand(40, 160),
            vr: rand(-3.2, 3.2),
            delay: (dist / maxDist) * 0.14,
            bx: Math.max(0, minX - 2), by: Math.max(0, minY - 2),
            bw: Math.max(a.x, b.x, c.x) - minX + 4, bh: Math.max(a.y, b.y, c.y) - minY + 4,
        });
    };
    for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
            const a = pts[j][i], b = pts[j][i + 1], c = pts[j + 1][i + 1], d = pts[j + 1][i];
            if (Math.random() < 0.5) { addTri(a, b, c); addTri(a, c, d); } else { addTri(a, b, d); addTri(b, c, d); }
        }
    }

    const tracePath = (tri) => {
        ctx.beginPath();
        ctx.moveTo(tri[0].x, tri[0].y);
        ctx.lineTo(tri[1].x, tri[1].y);
        ctx.lineTo(tri[2].x, tri[2].y);
        ctx.closePath();
    };

    const t0 = performance.now();
    function step(now) {
        const ms = now - t0;
        ctx.clearRect(0, 0, W, H);

        // 1) Fissures : l'image tient encore, les arêtes s'allument
        if (ms < crackMs) {
            ctx.drawImage(snap, 0, 0, W, H);
            ctx.strokeStyle = edge;
            ctx.globalAlpha = ms / crackMs;
            ctx.lineWidth = 1.2;
            shards.forEach(s => { tracePath(s.tri); ctx.stroke(); });
            ctx.globalAlpha = 1;
            requestAnimationFrame(step);
            return;
        }

        // 2) Les éclats s'envolent
        const t = (ms - crackMs) / 1000;
        let alive = false;
        for (const s of shards) {
            const lt = Math.max(0, t - s.delay);
            const p = lt / flyS;
            if (p >= 1) continue;
            alive = true;
            const scale = opts.toward ? 1 + 1.4 * p * p : 1 - 0.35 * p;
            const fade = p < 0.35 ? 1 : 1 - (p - 0.35) / 0.65;
            ctx.save();
            ctx.globalAlpha = Math.max(0, fade);
            ctx.translate(s.mx + s.vx * lt, s.my + s.vy * lt + 0.5 * 900 * lt * lt * (opts.toward ? 0.2 : 1));
            ctx.rotate(s.vr * lt);
            ctx.scale(scale, scale);
            ctx.translate(-s.mx, -s.my);
            tracePath(s.tri);
            ctx.save();
            ctx.clip();
            // on ne copie que la zone du triangle : beaucoup plus léger
            ctx.drawImage(snap, s.bx * dpr, s.by * dpr, s.bw * dpr, s.bh * dpr, s.bx, s.by, s.bw, s.bh);
            ctx.restore();
            ctx.strokeStyle = edge;
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
        }
        if (alive) requestAnimationFrame(step);
        else { ctx.clearRect(0, 0, W, H); onDone(); }
    }
    requestAnimationFrame(step);
}

/* Copie l'état actuel d'un canvas (pour le découper ensuite) */
function snapshotCanvas(canvas) {
    const snap = document.createElement('canvas');
    snap.width = canvas.width;
    snap.height = canvas.height;
    snap.getContext('2d').drawImage(canvas, 0, 0);
    return snap;
}

/* ===================================================
   JOUEUR : pseudo du visiteur + zones explorées (XP)
   =================================================== */
const store = {
    // le stockage peut être bloqué (navigation privée...) : le site marche quand même, sans mémoire
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { } },
    del(k) { try { localStorage.removeItem(k); } catch { } },
};
const emit = (type, detail = {}) => document.dispatchEvent(new CustomEvent('game', { detail: { type, ...detail } }));

const PLAYER_KEY = 'eliasPortfolio.player';
const VISITED_KEY = 'eliasPortfolio.visited';
// La pêche est un bonus : elle ne compte pas dans les zones à explorer
const BONUS_ZONES = ['games', 'fishing']; // 'fishing' : ancien onglet, encore présent dans certaines sauvegardes
const TOTAL_ZONES = [...document.querySelectorAll('.navbar a[href^="#"]')]
    .filter(a => !BONUS_ZONES.includes(a.getAttribute('href').slice(1))).length;

function getPlayer() {
    return store.get(PLAYER_KEY);
}

function renderPlayer() {
    const name = getPlayer();
    document.querySelectorAll('[data-player]').forEach(el => {
        el.textContent = name || el.dataset.fallback || 'PLAYER 1';
    });
}

function setPlayer(raw) {
    const name = raw.trim().replace(/\s+/g, ' ').slice(0, 16) || 'VOYAGEUR';
    store.set(PLAYER_KEY, name);
    renderPlayer();
    emit('player');
}

function getVisited() {
    try {
        return new Set(JSON.parse(store.get(VISITED_KEY) || '[]').filter(id => !BONUS_ZONES.includes(id)));
    } catch { return new Set(); }
}

function renderXp(levelUp) {
    const n = Math.max(1, getVisited().size);
    const lv = document.getElementById('playerLv');
    const bar = document.getElementById('playerXp');
    const txt = document.getElementById('playerXpTxt');
    if (lv) lv.textContent = n === TOTAL_ZONES ? 'MAX' : n;
    if (bar) bar.style.width = `${(n / TOTAL_ZONES) * 100}%`;
    if (txt) txt.textContent = `${n} / ${TOTAL_ZONES}`;
    const card = document.getElementById('playerCard');
    const toast = document.getElementById('playerToast');
    if (levelUp && card && toast) {
        showToast(n === TOTAL_ZONES ? tr('NIVEAU MAX !') : tr('LEVEL UP !'));
    }
}

function showToast(text) {
    const card = document.getElementById('playerCard');
    const toast = document.getElementById('playerToast');
    if (!card || !toast) return;
    toast.textContent = text;
    card.classList.remove('lvl-up');
    void card.offsetWidth;
    card.classList.add('lvl-up');
}

/* Objets secrets : les jeux cachés dans les pages */
const SECRETS_KEY = 'eliasPortfolio.secrets';
const TOTAL_SECRETS = new Set([...document.querySelectorAll('[data-secret]')].map(el => el.dataset.secret)).size;

function getFound() {
    try { return new Set(JSON.parse(store.get(SECRETS_KEY) || '[]')); } catch { return new Set(); }
}

function renderSecrets() {
    const found = getFound();
    const count = document.getElementById('secretCount');
    const total = document.getElementById('secretTotal');
    if (count) count.textContent = found.size;
    if (total) total.textContent = TOTAL_SECRETS;
    document.querySelectorAll('[data-secret]').forEach(el => el.classList.toggle('is-found', found.has(el.dataset.secret)));
}

function findSecret(key) {
    const found = getFound();
    if (!key || found.has(key)) return;
    found.add(key);
    store.set(SECRETS_KEY, JSON.stringify([...found]));
    renderSecrets();
    showToast(found.size === TOTAL_SECRETS ? tr('TOUS LES SECRETS !') : tr('OBJET SECRET TROUVÉ !'));
    emit('secret', { count: found.size, total: TOTAL_SECRETS });
}

function visitZone(id) {
    if (BONUS_ZONES.includes(id)) return;
    const visited = getVisited();
    if (visited.has(id)) return;
    visited.add(id);
    store.set(VISITED_KEY, JSON.stringify([...visited]));
    renderXp(visited.size > 1);
    emit('visit', { count: visited.size, total: TOTAL_ZONES });
}

function resetPlayer() {
    store.del(PLAYER_KEY);
    store.del(VISITED_KEY);
    store.del(SECRETS_KEY);
    renderPlayer();
    renderXp(false);
    renderSecrets();
    emit('reset');
}

renderPlayer();
renderXp(false);
renderSecrets();

let replayIntro = null; // relance l'écran d'intro (après "Reset votre progression")

(function initPageLoader() {
    const loader = document.getElementById('pageLoader');
    if (!loader) return;

    const canvas = document.getElementById('loaderCanvas');
    const ctx = canvas.getContext('2d');
    const nameEl = document.getElementById('loaderName');
    const barFill = document.getElementById('loaderBarFill');
    const percent = document.getElementById('loaderPercent');
    const gate = document.getElementById('loaderGate');
    const nameInput = document.getElementById('playerName');
    const MIN_DISPLAY_MS = 2000; // laisse le temps au nom de s'écrire en lumière
    const startTime = performance.now();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let W = 0, H = 0, raf = 0, progress = 0, started = false;

    // Chaque lettre apparaît l'une après l'autre (voir .loader-name .ch dans noctis.css)
    const title = nameEl.textContent;
    const writeTitle = () => {
        nameEl.innerHTML = [...title]
            .map((c, i) => `<span class="ch" style="--i:${i}">${c === ' ' ? '&nbsp;' : c}</span>`)
            .join('');
    };
    writeTitle();

    const resize = () => {
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // Éclats de cristal qui montent lentement + poussière lumineuse
    const newCrystal = (anywhere) => ({
        x: rand(0, W), y: anywhere ? rand(0, H) : H + rand(30, 140),
        s: rand(6, 24), h: rand(1.8, 3.2), r: rand(-0.6, 0.6), vr: rand(-0.25, 0.25),
        vy: rand(10, 30), a: rand(0.3, 0.85), tw: rand(0, 6.28),
    });
    const crystals = Array.from({ length: W < 700 ? 14 : 26 }, () => newCrystal(true));
    const dust = Array.from({ length: W < 700 ? 40 : 80 }, () => ({ x: rand(0, W), y: rand(0, H), r: rand(0.4, 1.4), vy: rand(4, 16), a: rand(0.15, 0.7) }));

    const drawCrystal = (c, t) => {
        const s = c.s, h = s * c.h;
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.r);
        ctx.globalAlpha = c.a * (0.55 + 0.45 * Math.sin(t * 2 + c.tw));
        ctx.beginPath();
        ctx.moveTo(0, -h);
        ctx.lineTo(s * 0.55, 0);
        ctx.lineTo(0, h * 0.6);
        ctx.lineTo(-s * 0.55, 0);
        ctx.closePath();
        const g = ctx.createLinearGradient(-s, -h, s, h);
        g.addColorStop(0, 'rgba(201, 220, 255, 0.6)');
        g.addColorStop(0.5, 'rgba(91, 140, 232, 0.2)');
        g.addColorStop(1, 'rgba(30, 58, 102, 0.05)');
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = 'rgba(201, 220, 255, 0.75)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -h);
        ctx.lineTo(0, h * 0.6);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.stroke();
        ctx.restore();
    };

    let last = performance.now();
    const frame = (now) => {
        const dt = Math.min((now - last) / 1000, 0.05);
        const t = now / 1000;
        last = now;
        const bg = ctx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, Math.max(W, H) * 0.75);
        bg.addColorStop(0, '#15223e');
        bg.addColorStop(0.55, '#0c1120');
        bg.addColorStop(1, '#0a0d14');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);
        // rayon de lumière venant d'en haut
        const beam = ctx.createLinearGradient(W / 2, 0, W / 2, H * 0.7);
        beam.addColorStop(0, `rgba(143, 184, 255, ${0.10 + 0.03 * Math.sin(t * 1.3)})`);
        beam.addColorStop(1, 'rgba(143, 184, 255, 0)');
        ctx.fillStyle = beam;
        ctx.beginPath();
        ctx.moveTo(W * 0.42, 0);
        ctx.lineTo(W * 0.58, 0);
        ctx.lineTo(W * 0.75, H * 0.7);
        ctx.lineTo(W * 0.25, H * 0.7);
        ctx.fill();
        ctx.fillStyle = 'rgb(201, 220, 255)';
        for (const d of dust) {
            d.y -= d.vy * dt;
            if (d.y < -4) { d.y = H + 4; d.x = rand(0, W); }
            ctx.globalAlpha = d.a;
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.r, 0, 6.283);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        for (const c of crystals) {
            c.y -= c.vy * dt;
            c.r += c.vr * dt;
            if (c.y < -80) Object.assign(c, newCrystal(false));
            drawCrystal(c, t);
        }
        raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    // Le texte (HTML) est recopié dans le canvas pour partir en éclats avec le décor
    const bakeText = () => {
        const els = [loader.querySelector('.loader-kicker'), ...nameEl.querySelectorAll('.ch'),
            loader.querySelector('.loader-class'), percent, gate.querySelector('label'), nameInput];
        ctx.textBaseline = 'middle';
        for (const el of els) {
            const cs = getComputedStyle(el);
            const r = el.getBoundingClientRect();
            if (!r.width) continue; // élément caché (barre pendant la saisie du pseudo, etc.)
            const text = el === nameInput ? el.value : el.textContent;
            ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
            if ('letterSpacing' in ctx) ctx.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
            ctx.fillStyle = el.classList.contains('ch') ? '#ffffff' : cs.color;
            ctx.shadowColor = 'rgba(143, 184, 255, 0.9)';
            ctx.shadowBlur = el.classList.contains('ch') ? 22 : 0;
            const x = el === nameInput ? r.left + (r.width - ctx.measureText(text).width) / 2 : r.left;
            ctx.fillText(text, x, r.top + r.height / 2);
        }
        ctx.shadowBlur = 0;
        if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
        const br = loader.querySelector('.loader-bar').getBoundingClientRect();
        ctx.fillStyle = '#c9dcff';
        if (br.width) ctx.fillRect(br.left, br.top, br.width, 2);
        // le trait de lumière, pour qu'il devienne une vraie fissure
        ctx.save();
        ctx.translate(W / 2, H / 2);
        ctx.rotate((-14 * Math.PI) / 180);
        ctx.shadowColor = '#8fb8ff';
        ctx.shadowBlur = 24;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-W * 0.6, -1.5, W * 1.2, 3);
        ctx.restore();
    };

    // L'intro n'est pas supprimée : elle reviendra après un "Reset votre progression"
    const finish = () => {
        cancelAnimationFrame(raf);
        raf = 0;
        loader.classList.remove('warp', 'shattering', 'hide', 'ask-name', 'replay');
        loader.classList.add('is-off');
        loader.setAttribute('aria-hidden', 'true');
        leaving = false;
    };

    let leaving = false;
    const leave = () => {
        if (leaving) return;
        leaving = true;
        if (reduceMotion) {
            document.body.classList.add('is-loaded');
            loader.classList.add('hide');
            setTimeout(finish, 450);
            return;
        }
        loader.classList.add('warp');
        setTimeout(() => {
            cancelAnimationFrame(raf);
            bakeText();
            const snap = snapshotCanvas(canvas);
            loader.classList.add('shattering');
            document.body.classList.add('is-loaded');
            shatterCanvas(ctx, snap, { W, H, dpr, crackMs: 160, flyMs: 1150 }, finish);
        }, 380);
    };

    // "Entrez votre nom, voyageur"
    const askName = () => {
        loader.classList.add('ask-name');
        loader.setAttribute('aria-hidden', 'false');
        nameInput.value = '';
        setTimeout(() => nameInput.focus(), 350);
    };

    gate.addEventListener('submit', (e) => {
        e.preventDefault();
        if (leaving) return;
        setPlayer(nameInput.value);
        nameInput.blur();
        leave();
    });

    replayIntro = () => {
        loader.classList.remove('is-off', 'warp', 'shattering', 'hide');
        loader.classList.add('replay');
        document.body.classList.remove('is-loaded');
        writeTitle();
        last = performance.now();
        if (!raf) raf = requestAnimationFrame(frame);
        askName();
    };

    const setProgress = (p) => {
        progress = p;
        if (barFill) {
            barFill.style.width = `${p}%`;
            barFill.style.setProperty('--p', `${p}%`);
        }
        if (percent) percent.textContent = `${Math.round(p)}%`;
    };

    // Progression simulée pendant l'attente du vrai chargement
    const fakeInterval = setInterval(() => setProgress(Math.min(progress + Math.random() * 12, 90)), 150);

    // 100 % -> trait de lumière -> l'écran éclate en cristaux et révèle le site
    const start = () => {
        if (started) return;
        started = true;
        clearInterval(fakeInterval);
        setProgress(100);
        // Premier passage : on demande le pseudo. Ensuite on le reconnaît et on entre directement.
        setTimeout(() => (getPlayer() ? leave() : askName()), 350);
    };

    const finishLoading = () => {
        setTimeout(start, Math.max(MIN_DISPLAY_MS - (performance.now() - startTime), 0));
    };

    // Clic ou touche = on passe direct, comme "Press Start"
    loader.addEventListener('click', (e) => { if (!gate.contains(e.target)) start(); });
    window.addEventListener('keydown', start, { once: true });

    if (document.readyState === 'complete') {
        finishLoading();
    } else {
        window.addEventListener('load', finishLoading);
    }
})();

/* ===================================================
   SKILL DATA
   =================================================== */
const skillData = {
    javascript: {
        title: tr('JavaScript'),
        img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg',
        desc: tr('JavaScript est le langage du web côté client. Utilisé pour rendre les pages interactives, gérer les événements et communiquer avec des API. Base indispensable avant d\'aborder TypeScript, Vue.js ou React.')
    },
    vuejs: {
        title: tr('Vue.js'),
        img: './assets/vuejs.png',
        desc: tr('Framework JavaScript progressif pour créer des interfaces réactives en composants. Utilisé en stage chez GEONATIVE pour développer des composants réutilisables avec shadcn.')
    },
    html: {
        title: tr('HTML / CSS'),
        img: './assets/html.png',
        desc: tr('Fondations du développement web. Maîtrisés dès le lycée et approfondis tout au long du BUT, utilisés pour structurer et mettre en forme des pages accessibles et esthétiques.')
    },
    java: {
        title: tr('Java'),
        img: './assets/java.svg',
        desc: tr('Langage principal de ma formation. Applications desktop avec JavaFX, serveurs web avec Tomcat et Servlets, API REST avec Spring Boot. Solide base en programmation orientée objet et design patterns.')
    },
    python: {
        title: tr('Python'),
        img: './assets/python.png',
        desc: tr('Utilisé pour la modélisation mathématique et l\'automatisation. Maîtrise de NumPy pour le calcul numérique et la résolution de problèmes d\'optimisation.')
    },
    psql: {
        title: tr('PostgreSQL'),
        img: './assets/PSQL.png',
        desc: tr('Système de gestion de bases de données relationnelles. Conception de schémas, requêtes SQL complexes (jointures, agrégats), gestion des transactions et optimisation par index.')
    },
    typescript: {
        title: tr('TypeScript'),
        img: './assets/ts.png',
        desc: tr('Surcouche typée de JavaScript qui améliore la robustesse et la maintenabilité du code. Utilisé en stage avec Vue.js pour détecter les erreurs à la compilation et mieux documenter les interfaces.')
    },
    github: {
        title: tr('GitHub'),
        img: './assets/github.png',
        desc: tr('Plateforme de gestion de versions utilisée sur tous mes projets. Maîtrise des branches, pull requests, issues et actions CI/CD pour le travail en équipe et la traçabilité des projets.')
    },
    bash: {
        title: tr('Bash'),
        img: './assets/bash.png',
        desc: tr('Langage de script shell pour automatiser des tâches sur Linux : compilation, déploiement, gestion de fichiers et configuration d\'environnements de développement.')
    },
    c: {
        title: tr('Langage C'),
        img: './assets/C_Logo.png',
        desc: tr('Initiation à la programmation bas niveau : gestion de la mémoire avec les pointeurs, structures de données et algorithmique. Base solide pour comprendre le fonctionnement des systèmes.')
    },
    gitlab: {
        title: tr('GitLab'),
        img: './assets/gitlab.png',
        desc: tr('Utilisé pour la gestion de projets collaboratifs avec intégration continue (CI/CD). Configuration de pipelines automatisés pour tester et déployer des applications.')
    },
    springboot: {
        title: tr('Spring Boot'),
        img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/spring/spring-original.svg',
        desc: tr('Framework Java pour créer des API REST et applications web. Architecture en couches (Controller, Service, Repository), injection de dépendances et endpoints sécurisés avec Spring Security.')
    },
    nosql: {
        title: tr('NoSQL (MongoDB)'),
        img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg',
        desc: tr('Bases de données orientées document pour des besoins de flexibilité et scalabilité. Étude du modèle document, collections sans schéma rigide et requêtes d\'agrégation avec MongoDB.')
    },
    react: {
        title: tr('React'),
        img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg',
        desc: tr('Bibliothèque JavaScript de Meta pour créer des interfaces composables. Composants fonctionnels, hooks (useState, useEffect), communication avec des API REST et principes du SPA.')
    },
    flutter: {
        title: tr('Flutter'),
        img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/flutter/flutter-original.svg',
        desc: tr('Framework UI de Google pour développer des applications multiplateformes. Découvert et pratiqué en contexte professionnel pour contribuer à une application mobile utilisée en production.')
    },
    go: {
        title: tr('Go'),
        img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original-wordmark.svg',
        desc: tr('Langage compilé orienté performance et simplicité. Utilisé en stage pour intervenir sur des services backend, avec une attention portée à la lisibilité, à la concurrence et à la robustesse.')
    },
    maths: {
        title: tr('Modélisation Mathématique'),
        img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/matlab/matlab-original.svg',
        desc: tr('Formalisation de problèmes complexes via l\'algèbre linéaire et les statistiques. En Python avec NumPy, résolution de problèmes d\'optimisation et simulations numériques.')
    }
};

const skillLevels = {
    html: 90,
    javascript: 86,
    java: 84,
    github: 83,
    python: 78,
    psql: 76,
    vuejs: 74,
    gitlab: 73,
    typescript: 72,
    springboot: 71,
    bash: 70,
    react: 69,
    flutter: 68,
    nosql: 68,
    go: 67,
    c: 67,
    maths: 66,
};

// Barre de niveau façon "stats de RPG" sous chaque compétence
document.querySelectorAll('.skill-td').forEach(td => {
    const lv = skillLevels[td.dataset.skill];
    const inner = td.querySelector('.skill-td-inner');
    if (!lv || !inner) return;
    inner.insertAdjacentHTML('beforeend',
        `<div class="skill-lv" aria-label="${tr('Niveau')} ${lv} / 100"><span class="skill-lv-track"><span class="skill-lv-fill" style="width:${lv}%"></span></span><b>${lv}</b></div>`);
});

/* ===================================================
   SKILL MODAL LOGIC
   =================================================== */
const skillModal = document.getElementById('skillModal');
const skillModalClose = document.getElementById('skillModalClose');
const skillModalLevelBar = document.getElementById('skillModalLevelBar');
const skillModalLevelLabel = document.getElementById('skillModalLevelLabel');

document.querySelectorAll('.skill-td').forEach(td => {
    td.addEventListener('click', () => {
        const key = td.dataset.skill;
        const data = skillData[key];
        if (!data) return;
        document.getElementById('skillModalTitle').textContent = data.title;
        document.getElementById('skillModalDesc').textContent = data.desc;
        document.getElementById('skillModalImg').src = data.img;
        document.getElementById('skillModalImg').alt = data.title;
        const level = skillLevels[key] || 65;
        if (skillModalLevelBar && skillModalLevelLabel) {
            skillModalLevelBar.style.width = `${level}%`;
            skillModalLevelLabel.textContent = `${level}`;
        }
        skillModal.classList.add('open');
    });
});

skillModalClose.addEventListener('click', () => skillModal.classList.remove('open'));
skillModal.addEventListener('click', (e) => {
    if (e.target === skillModal) skillModal.classList.remove('open');
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key.toLowerCase() === 'x') {
        skillModal.classList.remove('open');
        document.querySelectorAll('.stage-modal-overlay').forEach(m => m.classList.remove('active'));
        const cvModal = document.getElementById('cvModal');
        if (cvModal) cvModal.setAttribute('aria-hidden', 'true');
        const gamesModal = document.getElementById('gamesModal');
        if (gamesModal) closeGameModal();
    }
});

/* ===================================================
   STAGE MODAL LOGIC
   =================================================== */
function toggleStageModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.toggle('active');
}

function closeStageModal(e, id) {
    if (e.target === document.getElementById(id)) {
        document.getElementById(id).classList.remove('active');
    }
}

/* ===================================================
   CV MODAL LOGIC
   =================================================== */
const openCvModal = document.getElementById('openCvModal');
const cvModal = document.getElementById('cvModal');
const cvModalClose = document.getElementById('cvModalClose');

if (openCvModal && cvModal) {
    openCvModal.addEventListener('click', (e) => {
        e.preventDefault();
        cvModal.classList.add('active');
        cvModal.setAttribute('aria-hidden', 'false');
    });
}

if (cvModalClose && cvModal) {
    cvModalClose.addEventListener('click', () => {
        cvModal.classList.remove('active');
        cvModal.setAttribute('aria-hidden', 'true');
    });
}

if (cvModal) {
    cvModal.addEventListener('click', (e) => {
        if (e.target === cvModal) {
            cvModal.classList.remove('active');
            cvModal.setAttribute('aria-hidden', 'true');
        }
    });
}

/* ===================================================
   GAMES SECRET MODAL LOGIC — UNIVERSAL
   Pour ajouter un jeu : créer un lien .softskill-secret-games
   avec data-game="games/nomDuJeu.html", c'est tout.
   =================================================== */
const gamesModal = document.getElementById('gamesModal');
const gamesModalFrame = document.getElementById('gamesModalFrame');
const gamesModalClose = document.getElementById('gamesModalClose');
const gamesModalFullscreen = document.getElementById('gamesModalFullscreen');

function openGameModal(gameSrc) {
    if (!gamesModal || !gamesModalFrame) return;
    gamesModalFrame.src = gameSrc;
    gamesModal.classList.add('active');
    gamesModal.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('games-modal-open');
    document.body.classList.add('games-modal-open');
}

function closeGameModal() {
    if (!gamesModal) return;
    // Quitter le faux fullscreen si actif
    const box = document.querySelector('.games-modal-box');
    if (box && isFakeFullscreen) {
        box.classList.remove('games-modal-box--fullscreen');
        isFakeFullscreen = false;
        if (gamesModalFullscreen) {
            gamesModalFullscreen.querySelector('i').className = 'fas fa-expand';
        }
    }
    gamesModal.classList.remove('active');
    gamesModal.setAttribute('aria-hidden', 'true');
    if (gamesModalFrame) gamesModalFrame.src = 'about:blank';
    document.documentElement.classList.remove('games-modal-open');
    document.body.classList.remove('games-modal-open');
}

let isFakeFullscreen = false;

function toggleFullscreen() {
    const box = document.querySelector('.games-modal-box');
    if (!box || !gamesModalFullscreen) return;
    const icon = gamesModalFullscreen.querySelector('i');
    isFakeFullscreen = !isFakeFullscreen;
    box.classList.toggle('games-modal-box--fullscreen', isFakeFullscreen);
    icon.className = isFakeFullscreen ? 'fas fa-compress' : 'fas fa-expand';
    gamesModalFullscreen.setAttribute('aria-label', isFakeFullscreen ? tr('Quitter le plein écran') : tr('Plein écran'));
}

// Attache le listener sur tous les liens secrets (présents et futurs via delegation)
document.addEventListener('click', (e) => {
    const trigger = e.target.closest('.softskill-secret-games, .secret-item');
    if (trigger) {
        e.preventDefault();
        const gameSrc = trigger.dataset.game;
        findSecret(trigger.dataset.secret);
        if (gameSrc) openGameModal(gameSrc);
    }
});

if (gamesModalClose) {
    gamesModalClose.addEventListener('click', closeGameModal);
}

if (gamesModalFullscreen) {
    gamesModalFullscreen.addEventListener('click', toggleFullscreen);
}

if (gamesModal) {
    gamesModal.addEventListener('click', (e) => {
        if (e.target === gamesModal) closeGameModal();
    });
}

/* ===================================================
   NAVBAR & SCROLL
   =================================================== */
$(document).ready(function () {
    $("#menu").click(function () {
        $(this).toggleClass("fa-times");
        $(".navbar").toggleClass("nav-toggle");
    });

    $(window).on("scroll load", function () {
        $("#menu").removeClass("fa-times");
        $(".navbar").removeClass("nav-toggle");

        if (document.body.classList.contains('tabs-mode')) return;
        $("section").each(function () {
            let height = $(this).height();
            let offset = $(this).offset().top - 200;
            let top = $(window).scrollTop();
            let id = $(this).attr("id");

            if (top > offset && top < offset + height) {
                $(".navbar ul li a").removeClass("active");
                $(".navbar").find(`[href="#${id}"]`).addClass("active");
            }
        });
    });

    // Smooth scrolling with stable easing + precise navbar offset
    $('a[href^="#"]:not(.no-scroll)').on("click", function (e) {
        const hash = this.getAttribute("href");
        if (hash.length < 2) return; // lien "#" (objets secrets, CV...) : jQuery planterait sur $("#")
        const $target = $(hash);
        if (!$target.length) return;

        e.preventDefault();

        const headerHeight = $("header").outerHeight() || 0;
        // Positive breathing space so section titles never appear too high under the fixed header.
        const targetTop = Math.max(0, $target.offset().top - headerHeight + 8);

        window.scrollTo({
            top: targetTop,
            behavior: "smooth",
        });
    });
});

/* ===================================================
   TYPED JS
   =================================================== */
var typed = new Typed(".typing-text", {
    strings: [
        tr("Développeur Full-Stack"),
        tr("Diplômé du BUT Informatique"),
        tr("Challenger sur League of Legends (faux..)")
    ],
    loop: true,
    typeSpeed: 50,
    backSpeed: 25,
    backDelay: 500,
});

/* ===================================================
   CONTACT FORM
   =================================================== */
async function submitForm(event) {
    event.preventDefault();
    const form = document.getElementById("contact-form");
    if (!form) return;
    const formData = new FormData(form);
    const statusMessage = document.getElementById("status-message");

    try {
        const response = await fetch("/api/sendEmail", {
            method: "POST",
            body: JSON.stringify({
                name: formData.get("name"),
                email: formData.get("email"),
                message: formData.get("message"),
            }),
            headers: { "Content-Type": "application/json" },
        });
        const result = await response.json();
        if (response.ok) {
            statusMessage.textContent = "Message envoyé avec succès !";
            statusMessage.style.color = "green";
            form.reset();
        } else {
            statusMessage.textContent = `Erreur : ${result.error}`;
            statusMessage.style.color = "red";
        }
    } catch (error) {
        statusMessage.textContent = `Erreur : ${error.message}`;
        statusMessage.style.color = "red";
    }
}

const contactForm = document.getElementById("contact-form");
if (contactForm) contactForm.addEventListener("submit", (e) => submitForm(e));

/* ===================================================
   VANILLA TILT
   =================================================== */
if (typeof VanillaTilt !== 'undefined') {
    VanillaTilt.init(document.querySelectorAll(".tilt"), { max: 15 });
}

/* ===================================================
   DISABLE DEV TOOLS
   =================================================== */
document.onkeydown = function (e) {
    if (e.keyCode === 123) return false;
    if (e.ctrlKey && e.shiftKey && e.keyCode === 'I'.charCodeAt(0)) return false;
    if (e.ctrlKey && e.shiftKey && e.keyCode === 'C'.charCodeAt(0)) return false;
    if (e.ctrlKey && e.shiftKey && e.keyCode === 'J'.charCodeAt(0)) return false;
    if (e.ctrlKey && e.keyCode === 'U'.charCodeAt(0)) return false;
};

/* ===================================================
   MENU DE PAUSE : une section à la fois, comme un menu de RPG
   (remplace l'ancien défilement + ScrollReveal)
   =================================================== */
const showTab = (function initTabs() {
    const sections = [...document.querySelectorAll('body > section:not(.footer)')];
    const footer = document.querySelector('body > section.footer');
    const links = [...document.querySelectorAll('.navbar a[href^="#"]')];
    const ids = sections.map(s => s.id);
    let current = null;

    // Trait de lumière qui balaie l'écran à chaque changement d'onglet
    const sweep = document.createElement('div');
    sweep.className = 'tab-sweep';
    sweep.setAttribute('aria-hidden', 'true');
    document.body.appendChild(sweep);

    // Losange de cristal qui glisse jusqu'à l'entrée choisie du menu
    const gem = document.querySelector('.menu-gem');
    const placeGem = () => {
        const a = links.find(l => l.classList.contains('active'));
        if (!gem || !a || !a.offsetParent) return;
        const nav = gem.parentElement;
        const y = a.getBoundingClientRect().top - nav.getBoundingClientRect().top + nav.scrollTop + a.offsetHeight / 2;
        gem.style.transform = `translateY(${y}px)`;
    };
    window.addEventListener('resize', placeGem);

    const lockIfFits = (sec) => {
        const fits = sec.id === 'home' || (sec.id === 'skills' && sec.scrollHeight <= window.innerHeight + 1);
        document.body.classList.toggle('lock-scroll', fits);
    };
    window.addEventListener('resize', () => {
        const sec = sections.find(s => s.classList.contains('is-active'));
        if (sec) lockIfFits(sec);
    });

    function show(id, instant) {
        if (!ids.includes(id)) id = ids[0];
        if (id === current) return;
        const next = sections[ids.indexOf(id)];
        sections.forEach(s => s.classList.toggle('is-active', s === next));
        if (footer) footer.classList.toggle('is-active', id === 'experience');
        links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${id}`));
        next.classList.remove('tab-enter');
        sweep.classList.remove('run');
        if (!instant && !reduceMotion) {
            void next.offsetWidth; // relance l'animation
            next.classList.add('tab-enter');
            sweep.classList.add('run');
        }
        window.scrollTo({ top: 0, behavior: 'instant' });
        history.replaceState(null, '', `#${id}`);
        current = id;
        // L'accueil tient sur un écran (Sonic court en bas) : pas de défilement.
        // Compétences non plus, si la grille tient dans l'écran.
        document.body.classList.toggle('on-home', id === ids[0]);
        lockIfFits(next);
        visitZone(id);
        placeGem();
        document.dispatchEvent(new CustomEvent('tabshow', { detail: id }));
        document.querySelector('.navbar')?.classList.remove('nav-toggle');
        document.getElementById('menu')?.classList.remove('fa-times');
    }

    // En phase de capture : passe avant l'ancien défilement doux de jQuery
    document.addEventListener('click', (e) => {
        const a = e.target.closest('a[href^="#"]');
        if (!a) return;
        const id = a.getAttribute('href').slice(1);
        if (!ids.includes(id)) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        show(id);
    }, true);

    document.body.classList.add('tabs-mode');
    show(location.hash.slice(1), true);
    // le menu mobile s'ouvre plus tard : on replace le losange à ce moment-là
    document.getElementById('menu')?.addEventListener('click', () => setTimeout(placeGem, 50));
    return show;
})();

/* ===================================================
   RÉALISATIONS : liste de quêtes + panneau de détail
   =================================================== */
(function initQuests() {
    const tabs = [...document.querySelectorAll('.quest-tab')];
    tabs.forEach(tab => tab.addEventListener('click', () => {
        tabs.forEach(t => {
            const on = t === tab;
            const panel = document.getElementById(t.getAttribute('aria-controls'));
            t.classList.toggle('is-active', on);
            t.setAttribute('aria-selected', on ? 'true' : 'false');
            panel.hidden = !on;
            panel.classList.toggle('is-active', on);
        });
        // sur téléphone le panneau est sous la liste : on l'amène à l'écran
        if (window.matchMedia('(max-width: 900px)').matches) {
            document.getElementById(tab.getAttribute('aria-controls')).scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }));
})();

/* ===================================================
   "VOULEZ-VOUS RECRUTER ELIAS ?"
   =================================================== */
(function initRecruit() {
    const box = document.getElementById('recruit');
    if (!box) return;
    const dialog = box.querySelector('.recruit-dialog');
    const win = box.querySelector('.recruit-win');
    const q = document.getElementById('recruitQ');
    const yes = box.querySelector('.recruit-yes');
    const no = box.querySelector('.recruit-no');
    let typed = false;

    // La question s'écrit lettre par lettre quand on arrive dessus, comme une boîte de dialogue
    const full = q.dataset.text;
    const typeQuestion = () => {
        if (typed || reduceMotion) return;
        typed = true;
        let i = 0;
        q.textContent = '';
        q.classList.add('is-typing');
        const tick = () => {
            q.textContent = full.slice(0, ++i);
            if (i < full.length) setTimeout(tick, 22);
            else q.classList.remove('is-typing');
        };
        tick();
    };
    new IntersectionObserver((entries, obs) => {
        if (entries[0].isIntersecting) { typeQuestion(); obs.disconnect(); }
    }, { threshold: 0.6 }).observe(q);

    const recruit = () => {
        emit('recruit');
        dialog.hidden = true;
        win.hidden = false;
        box.classList.add('is-won');
        burst(box);
    };
    yes.addEventListener('click', recruit);

    // NON : Game Over, puis la question revient
    no.addEventListener('click', () => {
        emit('stubborn');
        if (window.gameOver) window.gameOver({ sub: tr('Refuser Elias n\'était pas une option.'), onContinue: () => yes.focus() });
    });

    // Gerbe d'éclats de cristal
    function burst(host) {
        if (reduceMotion) return;
        const r = host.getBoundingClientRect();
        for (let i = 0; i < 26; i++) {
            const p = document.createElement('span');
            p.className = 'recruit-shard';
            const a = rand(0, Math.PI * 2);
            const d = rand(90, Math.max(r.width, r.height) * 0.55);
            p.style.setProperty('--dx', `${Math.cos(a) * d}px`);
            p.style.setProperty('--dy', `${Math.sin(a) * d}px`);
            p.style.setProperty('--r', `${rand(-360, 360)}deg`);
            p.style.animationDelay = `${rand(0, 0.12)}s`;
            if (i % 4 === 0) p.classList.add('gold');
            host.appendChild(p);
            setTimeout(() => p.remove(), 1500);
        }
    }

    // Reset de la progression : la question revient
    document.querySelectorAll('[data-reset]').forEach(btn => btn.addEventListener('click', () => {
        setTimeout(() => {
            dialog.hidden = false;
            win.hidden = true;
            box.classList.remove('is-won');
            typed = false;
            q.textContent = full;
        }, 7000);
    }));
})();

/* ===================================================
   SOFT SKILLS : sphérier
   =================================================== */
(function initSphere() {
    const board = document.getElementById('sphereBoard');
    if (!board) return;
    const nodes = [...board.querySelectorAll('.sphere-node')];
    const skills = nodes.filter(n => n.classList.contains('sphere-skill'));
    const cat = document.getElementById('spherePanelCat');
    const title = document.getElementById('spherePanelTitle');
    const text = document.getElementById('spherePanelText');
    const count = document.getElementById('sphereCount');
    const bar = document.getElementById('sphereBar');
    const panel = board.parentElement.querySelector('.sphere-panel');
    const intro = { cat: cat.textContent, title: title.textContent, text: text.innerHTML };
    const unlocked = new Set();

    const light = (key, on) => board.querySelectorAll(`[data-link="${key}"]`).forEach(l => l.classList.toggle('is-lit', on));

    const select = (node) => {
        nodes.forEach(n => n.classList.toggle('is-selected', n === node));
        panel.classList.remove('flash');
        void panel.offsetWidth;
        panel.classList.add('flash');
        if (node.classList.contains('sphere-skill')) {
            unlocked.add(node.dataset.node);
            node.classList.add('is-on');
            light(node.dataset.node, true);
            light(node.dataset.parent, true);
            board.querySelector(`[data-node="${node.dataset.parent}"]`).classList.add('is-on');
            cat.textContent = node.dataset.cat.toUpperCase();
            title.textContent = node.dataset.title;
            text.textContent = node.querySelector('.node-text').textContent;
        } else if (node.classList.contains('sphere-cat')) {
            const kids = skills.filter(s => s.dataset.parent === node.dataset.node);
            cat.textContent = 'BRANCHE';
            title.textContent = node.dataset.cat;
            text.textContent = kids.map(k => k.dataset.title).join(' · ');
        } else {
            cat.textContent = intro.cat;
            title.textContent = intro.title;
            text.innerHTML = intro.text;
        }
        count.textContent = unlocked.size;
        bar.style.width = `${(unlocked.size / skills.length) * 100}%`;
        panel.classList.toggle('is-complete', unlocked.size === skills.length);
        if (unlocked.size === skills.length) emit('sphere');
        if (window.matchMedia('(max-width: 900px)').matches && node.classList.contains('sphere-skill')) {
            panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    };
    nodes.forEach(n => n.addEventListener('click', () => select(n)));
})();

/* ===================================================
   PRÉSENTATION : les chapitres apparaissent un par un
   =================================================== */
(function initBio() {
    const items = document.querySelectorAll('.bio-chapter, .bio-facts li');
    if (!items.length || reduceMotion || !('IntersectionObserver' in window)) return;
    document.body.classList.add('bio-anim');
    const io = new IntersectionObserver((entries) => {
        entries.forEach(en => {
            if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
        });
    }, { threshold: 0.25 });
    items.forEach(el => io.observe(el));
})();

/* ===================================================
   ACCUEIL : jaquettes de jeux dans le carrousel
   Mets tes images dans assets/covers/ puis ajoute leurs noms ici (dans l'ordre voulu).
   Liste vide = les cartes de couleur d'origine.
   =================================================== */
const HOME_COVERS = [
    { src: 'assets/covers/ff15.jpg', title: 'Final Fantasy XV' },
    { src: 'assets/covers/silksong.jpg', title: 'Hollow Knight: Silksong' },
    { src: 'assets/covers/mh wilds.jpg', title: 'Monster Hunter Wilds' },
    { src: 'assets/covers/celeste.jpg', title: 'Celeste' },
    { src: 'assets/covers/shadowofthecollosus.jpg', title: 'Shadow of the Colossus' },
    { src: 'assets/covers/ff16.jpg', title: 'Final Fantasy XVI' },
    { src: 'assets/covers/pokemonX.jpg', title: 'Pokémon X' },
    { src: 'assets/covers/Kirby epic yarn.jpg', title: tr('Kirby : Au fil de l\'aventure') },
    { src: 'assets/covers/mh world.jpg', title: 'Monster Hunter: World' },
    { src: 'assets/covers/pokepark2.jpg', title: 'PokéPark 2' },
];

(function initCovers() {
    const wrap = document.querySelector('.home .wrapper');
    const inner = wrap && wrap.querySelector('.inner');
    if (!inner) return;
    const cards = [...inner.querySelectorAll('.card')];
    if (HOME_COVERS.length) {
        cards.forEach((card, i) => {
            const cover = HOME_COVERS[i % HOME_COVERS.length];
            const img = card.querySelector('.img');
            if (!img) return;
            img.style.backgroundImage = `url("${encodeURI(cover.src)}")`;
            card.classList.add('has-cover');
            card.dataset.title = cover.title;
        });
    }

    /* Carrousel interactif : on le fait tourner à la souris ou au doigt, avec de l'inertie.
       Clic sur une carte = elle vient devant. Sans interaction, il reprend sa rotation douce. */
    const STEP = 360 / cards.length;
    const AUTO = reduceMotion ? 0 : 18; // degrés par seconde
    let snapPending = false;
    let angle = 0, vel = AUTO, dragging = false, moved = 0, lastX = 0, lastT = 0, idle = 99, target = null, raf = 0, prev = 0;
    inner.style.animation = 'none';
    wrap.classList.add('is-interactive');

    const label = document.createElement('p');
    label.className = 'cover-label';
    label.innerHTML = `<b></b><span>${tr('◂ glisse pour faire tourner ▸')}</span>`;
    wrap.appendChild(label);
    const labelTitle = label.querySelector('b');

    const frontIndex = () => {
        // la carte i est devant quand i * STEP + angle ≡ 0 (mod 360)
        let best = 0, bestD = 999;
        cards.forEach((_, i) => {
            const d = Math.abs((((i * STEP + angle) % 360) + 540) % 360 - 180); // écart à 0°, entre 0 et 180
            if (d < bestD) { bestD = d; best = i; }
        });
        return best;
    };

    let lastFront = -1;
    const frame = (now) => {
        const dt = Math.min((now - prev) / 1000, 0.05);
        prev = now;
        if (!dragging) {
            idle += dt;
            if (target !== null) {
                const diff = target - angle;
                angle += diff * Math.min(1, dt * 6);
                if (Math.abs(diff) < 0.2) { angle = target; target = null; vel = 0; idle = 0; snapPending = false; }
            } else {
                // inertie ; quand l'élan retombe, la carte la plus proche se cale devant
                const goal = idle > 2.4 ? AUTO : 0;
                vel += (goal - vel) * Math.min(1, dt * (idle > 2.4 ? 0.8 : 2.2));
                angle += vel * dt;
                if (snapPending && idle < 2.4 && Math.abs(vel) < 25) {
                    snapPending = false;
                    const t = Math.round(angle / STEP) * STEP;
                    target = t;
                }
            }
        }
        inner.style.transform = `perspective(var(--perspective)) rotateX(var(--rotateX)) rotateY(${angle}deg)`;
        const f = frontIndex();
        if (f !== lastFront) {
            lastFront = f;
            cards.forEach((c, i) => c.classList.toggle('is-front', i === f));
            if (cards[f].dataset.title) labelTitle.textContent = cards[f].dataset.title;
        }
        const homeOn = document.getElementById('home')?.classList.contains('is-active')
            && !document.body.classList.contains('games-modal-open');
        raf = homeOn ? requestAnimationFrame(frame) : 0;
    };
    const start = () => { if (!raf) { prev = performance.now(); raf = requestAnimationFrame(frame); } };
    document.addEventListener('tabshow', (e) => { if (e.detail === 'home') start(); });
    start();

    wrap.addEventListener('pointerdown', (e) => {
        dragging = true; moved = 0; target = null;
        lastX = e.clientX; lastT = performance.now();
        wrap.setPointerCapture(e.pointerId);
        wrap.classList.add('is-dragging');
    });
    wrap.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const now = performance.now();
        const dx = e.clientX - lastX;
        const d = dx * 0.35;
        angle += d;
        moved += Math.abs(dx);
        vel = d / Math.max((now - lastT) / 1000, 0.008);
        vel = Math.max(-720, Math.min(720, vel));
        lastX = e.clientX; lastT = now;
    });
    const end = (e) => {
        if (!dragging) return;
        dragging = false;
        idle = 0;
        wrap.classList.remove('is-dragging');
        if (performance.now() - lastT > 120) vel = 0; // relâché sans élan
        snapPending = true;
        // un simple clic (sans glisser) sur une carte : elle vient devant
        if (moved < 6) {
            const card = document.elementsFromPoint(e.clientX, e.clientY).map(el => el.closest('.card')).find(Boolean);
            if (card) {
                const i = cards.indexOf(card);
                let t = -i * STEP;
                t += Math.round((angle - t) / 360) * 360; // le chemin le plus court
                target = t;
            }
        }
    };
    wrap.addEventListener('pointerup', end);
    wrap.addEventListener('pointercancel', end);
})();

/* ===================================================
   RETURN BY DEATH (bouton rouge du footer)
   1. des ombres surgissent des bords et engloutissent l'écran
   2. l'écran se fissure et vole en éclats
   3. "RETURN BY DEATH"
   4. rembobinage VHS : le site défile à l'envers jusqu'en haut
   5. flash blanc -> on revient au début
   =================================================== */
const resetButtons = document.querySelectorAll('[data-reset]');

if (resetButtons.length) {
    let rbdRunning = false;

    let rewinding = false;
    const runReset = () => {
        if (rbdRunning) return;
        rbdRunning = true;
        rewinding = true;

        const audio = new Audio('./assets/rbd/ReturnByDeath.mp3');
        audio.volume = 0.1;

        const root = document.createElement('div');
        root.className = 'rbd';
        root.innerHTML = `
            <canvas class="rbd-canvas"></canvas>
            <div class="rbd-black"></div>
            <div class="rbd-title" data-text="RETURN BY DEATH">RETURN BY DEATH</div>
            <div class="rbd-vhs">
                <span class="rbd-osd rbd-osd-mode">◀◀ REW</span>
                <span class="rbd-osd rbd-osd-time">00:00:00</span>
            </div>
            <div class="rbd-white"></div>`;
        document.body.appendChild(root);

        const canvas = root.querySelector('.rbd-canvas');
        const ctx = canvas.getContext('2d');
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        const W = window.innerWidth;
        const H = window.innerHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const later = (ms, fn) => setTimeout(fn, ms);
        const html = document.documentElement;

        if (reduceMotion) {
            root.classList.add('is-white');
            restartGame();
            audio.play().catch(() => { });
            later(900, () => { root.remove(); rbdRunning = false; });
            return;
        }

        /* ---------- 1. Ombres ---------- */
        const SEG = 42;
        const cx = W / 2, cy = H / 2;
        const edgePoint = () => {
            const side = Math.floor(Math.random() * 4);
            if (side === 0) return { x: rand(0, W), y: -10 };
            if (side === 1) return { x: W + 10, y: rand(0, H) };
            if (side === 2) return { x: rand(0, W), y: H + 10 };
            return { x: -10, y: rand(0, H) };
        };
        const tendrils = Array.from({ length: W < 700 ? 20 : 36 }, () => {
            const p = edgePoint();
            let ang = Math.atan2(cy - p.y, cx - p.x) + rand(-0.5, 0.5);
            const len = Math.hypot(cx - p.x, cy - p.y) * rand(0.55, 0.95);
            const pts = [{ x: p.x, y: p.y }];
            let x = p.x, y = p.y;
            const bend = rand(-0.05, 0.05);
            for (let i = 1; i <= SEG; i++) {
                ang += bend + rand(-0.12, 0.12);
                x += Math.cos(ang) * (len / SEG);
                y += Math.sin(ang) * (len / SEG);
                pts.push({ x, y });
            }
            return { pts, width: rand(18, 46), phase: rand(0, 6.28), delay: rand(0, 0.35), end: ang };
        });

        const drawTendril = (td, grow, t) => {
            const n = Math.floor(grow * SEG);
            if (n < 1) return;
            const pts = td.pts.map((p, i) => {
                const k = i / SEG;
                const w = Math.sin(t * 4 + td.phase + i * 0.35) * 10 * k; // ondulation
                return { x: p.x + Math.cos(td.end + 1.57) * w, y: p.y + Math.sin(td.end + 1.57) * w };
            });
            for (const pass of [0, 1]) {
                // fine aura violette, puis le corps de l'ombre, effilé vers la pointe
                ctx.strokeStyle = pass === 0 ? 'rgba(140, 70, 240, 0.32)' : '#040107';
                for (let i = 0; i < n; i++) {
                    const k = i / SEG;
                    ctx.lineWidth = td.width * Math.pow(1 - k, 1.3) + (pass === 0 ? 6 : 0.6);
                    ctx.beginPath();
                    ctx.moveTo(pts[i].x, pts[i].y);
                    ctx.lineTo(pts[i + 1].x, pts[i + 1].y);
                    ctx.stroke();
                }
            }
            // la pointe s'ouvre en "doigts" quand l'ombre a presque fini de pousser
            if (grow > 0.8) {
                const tip = pts[n];
                const f = (grow - 0.8) / 0.2;
                ctx.strokeStyle = '#050208';
                ctx.lineWidth = 3;
                for (const da of [-0.55, -0.18, 0.2, 0.55]) {
                    ctx.beginPath();
                    ctx.moveTo(tip.x, tip.y);
                    const a = td.end + da + Math.sin(t * 6 + da * 5) * 0.15;
                    ctx.quadraticCurveTo(
                        tip.x + Math.cos(a) * 18 * f, tip.y + Math.sin(a) * 18 * f,
                        tip.x + Math.cos(a + 0.3) * 34 * f, tip.y + Math.sin(a + 0.3) * 34 * f);
                    ctx.stroke();
                }
            }
        };

        ctx.lineCap = 'round';
        document.body.classList.add('rbd-dying');
        const SHADOW_MS = 1700;
        const t0 = performance.now();
        let shadowRaf = 0;
        const shadows = (now) => {
            const t = (now - t0) / 1000;
            const p = Math.min((now - t0) / SHADOW_MS, 1);
            ctx.clearRect(0, 0, W, H);
            // l'obscurité se referme depuis les bords
            const v = ctx.createRadialGradient(cx, cy, Math.max(W, H) * (0.75 - 0.7 * p), cx, cy, Math.max(W, H) * 0.8);
            v.addColorStop(0, 'rgba(5, 2, 8, 0)');
            v.addColorStop(1, `rgba(5, 2, 8, ${0.35 + 0.65 * p})`);
            ctx.fillStyle = v;
            ctx.fillRect(0, 0, W, H);
            for (const td of tendrils) {
                const g = Math.min(Math.max((p - td.delay) / (1 - td.delay), 0), 1);
                drawTendril(td, 1 - Math.pow(1 - g, 2.2), t);
            }
            if (p >= 0.92) {
                ctx.fillStyle = `rgba(5, 2, 8, ${(p - 0.92) / 0.08 * 0.85})`;
                ctx.fillRect(0, 0, W, H);
            }
            if (p < 1) shadowRaf = requestAnimationFrame(shadows);
        };
        shadowRaf = requestAnimationFrame(shadows);

        /* ---------- 2. Fissures + éclats ---------- */
        later(SHADOW_MS, () => {
            cancelAnimationFrame(shadowRaf);
            document.body.classList.remove('rbd-dying');
            root.classList.add('is-black');
            audio.play().catch(() => console.warn('Audio bloqué.'));
            // fissures blanches/violettes qui partent du centre
            ctx.save();
            ctx.shadowColor = '#b18cff';
            ctx.shadowBlur = 14;
            ctx.strokeStyle = 'rgba(235, 225, 255, 0.95)';
            for (let k = 0; k < 9; k++) {
                let x = cx, y = cy, a = (k / 9) * 6.283 + rand(-0.3, 0.3);
                ctx.lineWidth = 2.2;
                ctx.beginPath();
                ctx.moveTo(x, y);
                for (let i = 0; i < 9; i++) {
                    a += rand(-0.45, 0.45);
                    x += Math.cos(a) * rand(30, 90);
                    y += Math.sin(a) * rand(30, 90);
                    ctx.lineTo(x, y);
                }
                ctx.stroke();
            }
            ctx.restore();
            const snap = snapshotCanvas(canvas);
            shatterCanvas(ctx, snap, { W, H, dpr, crackMs: 260, flyMs: 900, toward: true, edge: 'rgba(177, 140, 255, 0.9)' }, () => { });
        });

        /* ---------- 3. Titre ---------- */
        later(SHADOW_MS + 700, () => root.classList.add('show-title'));

        /* ---------- 4. Rembobinage VHS ---------- */
        const REWIND_AT = SHADOW_MS + 2600;
        const REWIND_MS = 1700;
        later(REWIND_AT, () => {
            root.classList.remove('show-title', 'is-black');
            root.classList.add('is-rewind');
            document.body.classList.add('rbd-rewind');
            html.style.scrollBehavior = 'auto'; // sinon le "smooth" du CSS se bat avec l'animation
            const from = window.scrollY;
            const timeEl = root.querySelector('.rbd-osd-time');
            const tabLinks = [...document.querySelectorAll('.navbar a[href^="#"]')];
            const startTab = Math.max(0, tabLinks.findIndex(a => a.classList.contains('active')));
            const r0 = performance.now();
            const rewind = (now) => {
                if (!rewinding) return; // la partie a déjà été relancée
                const p = Math.min((now - r0) / REWIND_MS, 1);
                const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
                let y;
                if (startTab === 0) {
                    y = from * (1 - e);
                } else {
                    // les onglets défilent à l'envers (du bas vers le haut), du courant jusqu'à l'accueil
                    const pos = startTab * (1 - e);
                    const tab = Math.max(0, Math.ceil(pos));
                    if (showTab && tabLinks[tab]) showTab(tabLinks[tab].getAttribute('href').slice(1), true);
                    const maxY = document.documentElement.scrollHeight - window.innerHeight;
                    y = maxY * Math.min(1, pos - (tab - 1));
                }
                window.scrollTo(0, p < 1 ? y + rand(-6, 6) : 0);
                const secs = Math.round((1 - p) * 754);
                timeEl.textContent = `00:${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
                if (p < 1) requestAnimationFrame(rewind);
            };
            requestAnimationFrame(rewind);
        });

        /* ---------- 5. Flash blanc -> PLAY ---------- */
        later(REWIND_AT + REWIND_MS, () => {
            rewinding = false;
            restartGame();
            window.scrollTo(0, 0);
            html.style.scrollBehavior = '';
            document.body.classList.remove('rbd-rewind');
            root.classList.remove('is-rewind', 'is-black');
            root.classList.add('is-white');
            root.querySelector('.rbd-osd-mode').textContent = tr('▶ NOUVELLE PARTIE');
        });
        later(REWIND_AT + REWIND_MS + 1400, () => {
            root.remove();
            rbdRunning = false;
        });
    };

    // Retour à zéro : progression effacée, accueil, et l'intro redemande le pseudo
    function restartGame() {
        resetPlayer();
        if (showTab) showTab('home', true);
        visitZone('home');
        if (replayIntro) replayIntro();
    }

    resetButtons.forEach(btn => btn.addEventListener('click', () => {
        document.querySelector('.navbar')?.classList.remove('nav-toggle');
        document.getElementById('menu')?.classList.remove('fa-times');
        runReset();
    }));
}

/* ===================================================
   COPIER L'EMAIL
   =================================================== */
const emailCopyBox = document.getElementById('emailCopyBox');

if (emailCopyBox) {
    const emailAddress = 'maruca.elias0702@gmail.com';
    const emailLabel = emailCopyBox.querySelector('.email-copy-label');
    const defaultLabel = emailLabel ? emailLabel.textContent : 'Copier';
    let resetTimeout = null;

    const copyEmail = () => {
        const showCopied = () => {
            emailCopyBox.classList.add('copied');
            if (emailLabel) emailLabel.textContent = tr('Copié !');
            clearTimeout(resetTimeout);
            resetTimeout = setTimeout(() => {
                emailCopyBox.classList.remove('copied');
                if (emailLabel) emailLabel.textContent = defaultLabel;
            }, 2000);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(emailAddress).then(showCopied).catch(() => {
                fallbackCopy(emailAddress);
                showCopied();
            });
        } else {
            fallbackCopy(emailAddress);
            showCopied();
        }
    };

    function fallbackCopy(text) {
        const tempInput = document.createElement('textarea');
        tempInput.value = text;
        tempInput.style.position = 'fixed';
        tempInput.style.opacity = '0';
        document.body.appendChild(tempInput);
        tempInput.select();
        try {
            document.execCommand('copy');
        } catch (err) {
            console.warn('Copie impossible.', err);
        }
        document.body.removeChild(tempInput);
    }

    emailCopyBox.addEventListener('click', copyEmail);
    emailCopyBox.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            copyEmail();
        }
    });
}

/* ===================================================
   KONAMI CODE : ↑↑↓↓←→←→ B A -> thème Ardyn
   =================================================== */
const konamiSequence = [
    'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
    'b', 'a'
];
let konamiProgress = 0;

window.addEventListener('keydown', (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    const expected = konamiSequence[konamiProgress];

    if (key === expected) {
        konamiProgress++;
        if (konamiProgress === konamiSequence.length) {
            konamiProgress = 0;
            toggleArdyn();
        }
    } else {
        konamiProgress = (key === konamiSequence[0]) ? 1 : 0;
    }
});