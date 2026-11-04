/* =====================================================================
   jeu.js — tout ce qui fait du portfolio un "jeu" :
   sons de menu, thème Ardyn (Konami), succès, Game Over, pêche.
   Chargé après script.js (utilise store, rand, reduceMotion, showTab, showToast).
   ===================================================================== */

/* ---------------------------------------------------------------------
   SONS DE MENU (générés en direct : aucun fichier audio à charger)
   --------------------------------------------------------------------- */
const SOUND_KEY = 'eliasPortfolio.sound';
const sfx = (() => {
    let ctx = null;
    let on = store.get(SOUND_KEY) !== 'off';
    let lastHover = 0;

    const audio = () => {
        if (!ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            ctx = new AC();
        }
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    };

    // une note courte : fréquence, durée, type d'onde, volume, décalage
    const note = (freq, dur, type = 'sine', vol = 0.05, delay = 0) => {
        const a = audio();
        if (!a || !on) return;
        const t = a.currentTime + delay;
        const osc = a.createOscillator();
        const g = a.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(g).connect(a.destination);
        osc.start(t);
        osc.stop(t + dur + 0.02);
    };

    const api = {
        get on() { return on; },
        ctx: audio, // partagé avec la musique des mini-jeux
        toggle() {
            on = !on;
            store.set(SOUND_KEY, on ? 'on' : 'off');
            if (on) api.select();
            return on;
        },
        hover() {
            const now = performance.now();
            if (now - lastHover < 45) return;
            lastHover = now;
            note(1760, 0.045, 'triangle', 0.025);
        },
        select() {
            note(1318.5, 0.16, 'sine', 0.05);
            note(1975.5, 0.22, 'sine', 0.035, 0.05);
        },
        back() {
            note(880, 0.1, 'triangle', 0.04);
            note(660, 0.14, 'triangle', 0.03, 0.06);
        },
        fanfare() {
            [1046.5, 1318.5, 1568, 2093].forEach((f, i) => note(f, 0.28, 'triangle', 0.045, i * 0.09));
        },
        bite() {
            note(1568, 0.08, 'square', 0.03);
            note(2093, 0.12, 'square', 0.03, 0.08);
        },
        lose() {
            [523, 440, 349, 262].forEach((f, i) => note(f, 0.3, 'triangle', 0.045, i * 0.16));
        },
        dark() {
            [196, 185, 147, 98].forEach((f, i) => note(f, 0.6, 'sawtooth', 0.02, i * 0.18));
        },
    };
    return api;
})();

(function initMenuSounds() {
    const SEL = '.navbar a, .quest-tab, .sphere-node, .btn, .recruit-choice, .player-btn, .menu-reset, .lang-toggle, .game-card, .game-back, .reset-btn, '
        + '.gameover button, .skill-td, .experience-stage, .trophies-close, .loader-gate button, .footer-secret-btn';
    // survol : un petit "tic" (souris uniquement)
    document.addEventListener('pointerover', (e) => {
        if (e.pointerType !== 'mouse') return;
        const el = e.target.closest(SEL);
        if (!el || (e.relatedTarget && el.contains(e.relatedTarget))) return;
        sfx.hover();
    });
    // clic : un "cling" de cristal
    document.addEventListener('click', (e) => {
        if (e.target.closest(SEL) && !e.target.closest('#soundToggle')) sfx.select();
    });

    const btn = document.getElementById('soundToggle');
    if (!btn) return;
    const render = () => {
        btn.classList.toggle('is-off', !sfx.on);
        btn.setAttribute('aria-pressed', sfx.on ? 'true' : 'false');
        btn.setAttribute('aria-label', sfx.on ? tr('Couper les sons du menu') : tr('Activer les sons du menu'));
        btn.textContent = sfx.on ? '♪' : '♪̸';
    };
    btn.addEventListener('click', () => { sfx.toggle(); render(); });
    render();
})();

/* ---------------------------------------------------------------------
   THÈME ARDYN (Konami code)
   --------------------------------------------------------------------- */
const ARDYN_KEY = 'eliasPortfolio.ardyn';

function applyArdyn(on) {
    document.documentElement.classList.toggle('theme-ardyn', on);
}

function toggleArdyn() {
    const on = !document.documentElement.classList.contains('theme-ardyn');
    store.set(ARDYN_KEY, on ? 'on' : 'off');
    // vague de miasme qui recouvre l'écran pendant le changement de couleurs
    const wave = document.createElement('div');
    wave.className = `ardyn-wave${on ? '' : ' is-light'}`;
    wave.innerHTML = `<p>${on ? tr('LE MIASME SE RÉPAND') : tr('LA LUMIÈRE REVIENT')}</p>`;
    document.body.appendChild(wave);
    if (on) sfx.dark(); else sfx.fanfare();
    setTimeout(() => applyArdyn(on), reduceMotion ? 0 : 650);
    setTimeout(() => wave.remove(), reduceMotion ? 600 : 2200);
    if (on) achievements.unlock('konami');
}

applyArdyn(store.get(ARDYN_KEY) === 'on');

/* ---------------------------------------------------------------------
   SUCCÈS
   --------------------------------------------------------------------- */
const achievements = (() => {
    const KEY = 'eliasPortfolio.trophies';
    const LIST = [
        { id: 'start', icon: '◆', name: tr('Nouvelle partie'), desc: tr('Choisir un pseudo.') },
        { id: 'curious', icon: '🧭', name: tr('Curieux'), desc: tr('Visiter 4 pages du portfolio.') },
        { id: 'explorer', icon: '🗺️', name: tr('Explorateur'), desc: tr('Visiter toutes les pages (LV MAX).') },
        { id: 'secret1', icon: '✦', name: tr('Chasseur de trésors'), desc: tr('Trouver un objet secret.') },
        { id: 'secretAll', icon: '👑', name: tr('Archéologue'), desc: tr('Trouver tous les objets secrets.') },
        { id: 'sphere', icon: '🔮', name: tr('Sphérier complet'), desc: tr('Débloquer les 11 aptitudes.') },
        { id: 'recruit', icon: '🤝', name: tr('Recruteur avisé'), desc: tr('Recruter Elias.') },
        { id: 'stubborn', icon: '🙅', name: tr('Mauvaise réponse'), desc: tr('Dire Non à Elias.'), hidden: true },
        { id: 'fish1', icon: '🎣', name: tr('Première prise'), desc: tr('Attraper un poisson.') },
        { id: 'fishBig', icon: '🐟', name: tr('Le roi du lac'), desc: tr('Attraper un poisson de plus d\'un mètre.') },
        { id: 'konami', icon: '🩸', name: tr('Réveil d\'Ardyn'), desc: tr('↑ ↑ ↓ ↓ ← → ← → B A'), hidden: true },
        { id: 'reset', icon: '↺', name: tr('Retour par la mort'), desc: tr('Réinitialiser sa progression.'), hidden: true },
        { id: 'chef', icon: '🍳', name: tr('Nouvelle recette !'), desc: tr('Réussir une recette avec 3 étoiles.') },
        { id: 'ultimateChef', icon: '👑', name: tr('Chef légendaire'), desc: tr('Obtenir 2 étoiles au Banquet ultime en Cuisine.') },
        { id: 'chocobo', icon: '🏁', name: tr('Champion de course'), desc: tr('Terminer une Chocobo Race.') },
        { id: 'battle', icon: '⚔️', name: tr('Golem vaincu'), desc: tr('Gagner le combat contre le Golem de cristal.') },
        { id: 'chest', icon: '🗝️', name: tr('Fouineur'), desc: tr('Ouvrir un coffre caché.') },
        { id: 'campfire', icon: '🔥', name: tr('Pause au campement'), desc: tr('Rester une minute sans rien toucher.'), hidden: true },
        { id: 'nightOwl', icon: '🦉', name: tr('Oiseau de nuit'), desc: tr('Visiter le site entre 3 h et 4 h du matin.'), hidden: true },
        { id: 'nightMonster', icon: '🌙', name: tr('Monstre de la nuit'), desc: tr('Pêcher le Mummy Bass.'), hidden: true },
        { id: 'trueEnd', icon: '🎬', name: tr('La vraie fin'), desc: tr('Voir la fin cachée du portfolio.'), hidden: true },
    ];
    const get = () => { try { return new Set(JSON.parse(store.get(KEY) || '[]')); } catch { return new Set(); } };
    const save = (set) => store.set(KEY, JSON.stringify([...set]));

    const toasts = document.getElementById('trophyToasts');
    const listEl = document.getElementById('trophiesList');
    const box = document.getElementById('trophies');

    const render = () => {
        const got = get();
        ['trophyCount', 'trophyCount2'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = got.size; });
        ['trophyTotal', 'trophyTotal2'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = LIST.length; });
        if (!listEl) return;
        listEl.innerHTML = '';
        LIST.forEach(t => {
            const ok = got.has(t.id);
            const li = document.createElement('li');
            li.className = ok ? 'is-got' : '';
            const masked = !ok && t.hidden;
            li.innerHTML = `<span class="t-icon"></span><span class="t-txt"><b></b><small></small></span>`;
            li.querySelector('.t-icon').textContent = masked ? '?' : t.icon;
            li.querySelector('b').textContent = masked ? '???' : t.name;
            li.querySelector('small').textContent = masked ? tr('Succès secret') : t.desc;
            listEl.appendChild(li);
        });
    };

    const toast = (t) => {
        if (!toasts) return;
        const el = document.createElement('div');
        el.className = 'trophy-toast';
        el.innerHTML = `<span class="t-icon"></span><span class="t-txt"><em>${tr('SUCCÈS DÉBLOQUÉ')}</em><b></b><small></small></span>`;
        el.querySelector('.t-icon').textContent = t.icon;
        el.querySelector('b').textContent = t.name;
        el.querySelector('small').textContent = t.desc;
        toasts.appendChild(el);
        setTimeout(() => el.classList.add('is-out'), 4200);
        setTimeout(() => el.remove(), 4800);
    };

    const unlock = (id) => {
        const got = get();
        if (got.has(id)) return;
        const t = LIST.find(x => x.id === id);
        if (!t) return;
        got.add(id);
        save(got);
        render();
        document.dispatchEvent(new CustomEvent('trophy', { detail: id }));
        sfx.fanfare();
        // petit délai : laisse passer les autres animations (level up, objet trouvé...)
        setTimeout(() => toast(t), 350);
    };

    const open = () => { render(); box.hidden = false; box.querySelector('.trophies-close').focus(); };
    const close = () => { box.hidden = true; };
    document.getElementById('openTrophies')?.addEventListener('click', open);
    box?.querySelector('.trophies-close').addEventListener('click', close);
    box?.addEventListener('click', (e) => { if (e.target === box) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && box && !box.hidden) close(); });

    return { unlock, render, has: (id) => get().has(id), clear: () => { store.del(KEY); render(); } };
})();

/* Les événements envoyés par script.js -> succès */
document.addEventListener('game', (e) => {
    const d = e.detail;
    switch (d.type) {
        case 'player': achievements.unlock('start'); break;
        case 'visit':
            if (d.count >= 4) achievements.unlock('curious');
            if (d.count >= d.total) achievements.unlock('explorer');
            break;
        case 'secret':
            achievements.unlock('secret1');
            if (d.count >= d.total) achievements.unlock('secretAll');
            break;
        case 'sphere': achievements.unlock('sphere'); break;
        case 'recruit': achievements.unlock('recruit'); break;
        case 'stubborn': achievements.unlock('stubborn'); break;
        case 'reset':
            achievements.clear();
            fishing.reset();
            achievements.unlock('reset');
            break;
        default:
    }
});

/* ---------------------------------------------------------------------
   GAME OVER (pêche ratée, refus de recruter... et la page 404 a le sien)
   --------------------------------------------------------------------- */
window.gameOver = (function initGameOver() {
    const el = document.getElementById('gameOver');
    if (!el) return null;
    const sub = document.getElementById('gameOverSub');
    const yes = el.querySelector('.gameover-yes');
    const no = el.querySelector('.gameover-no');
    const reply = el.querySelector('.gameover-reply');
    let onContinue = null;

    const close = () => {
        el.classList.add('is-leaving');
        setTimeout(() => {
            el.hidden = true;
            el.classList.remove('is-leaving');
            const fn = onContinue;
            onContinue = null;
            if (fn) fn();
        }, reduceMotion ? 0 : 500);
    };

    yes.addEventListener('click', close);
    no.addEventListener('click', () => {
        // "Non" n'est pas vraiment une option...
        reply.textContent = tr('Le destin en a décidé autrement.');
        no.disabled = true;
        setTimeout(close, 1300);
    });

    return ({ sub: text = '', onContinue: fn = null } = {}) => {
        onContinue = fn;
        sub.textContent = text;
        reply.textContent = '';
        no.disabled = false;
        el.hidden = false;
        sfx.lose();
        setTimeout(() => yes.focus(), 400);
    };
})();

/* ---------------------------------------------------------------------
   MINI-JEUX : écran de sélection + un panneau par jeu
   --------------------------------------------------------------------- */
const GAMES = ['fishing', 'cooking', 'chocobo', 'battle'];
let openGame = null;

// Un jeu ne tourne que si son panneau est ouvert ET que l'onglet Mini-jeux est affiché
function gameOn(id) {
    return openGame === id && !!document.getElementById('games')?.classList.contains('is-active');
}

function setHubRecord(id, text) {
    const el = document.getElementById(`hub${id[0].toUpperCase()}${id.slice(1)}`);
    if (el) el.textContent = text;
}

const isNight = () => { const h = new Date().getHours(); return h >= 22 || h < 4; };

(function initHub() {
    const hub = document.getElementById('gamesHub');
    const section = document.getElementById('games');
    if (!hub || !section) return;
    const open = (id) => {
        hub.hidden = true;
        GAMES.forEach(gm => {
            const p = document.getElementById(`game-${gm}`);
            if (!p) return;
            p.hidden = gm !== id;
            p.classList.toggle('is-active', gm === id);
        });
        openGame = id;
        window.scrollTo({ top: 0, behavior: 'instant' });
        document.dispatchEvent(new CustomEvent('gameopen', { detail: id }));
    };
    const close = () => {
        const was = openGame;
        hub.hidden = false;
        GAMES.forEach(gm => {
            const p = document.getElementById(`game-${gm}`);
            if (p) { p.hidden = true; p.classList.remove('is-active'); }
        });
        openGame = null;
        document.dispatchEvent(new CustomEvent('gameclose', { detail: was }));
    };
    hub.addEventListener('click', (e) => {
        const b = e.target.closest('[data-game-open]');
        if (b) open(b.dataset.gameOpen);
    });
    section.addEventListener('click', (e) => { if (e.target.closest('.game-back')) close(); });
    // revenir sur l'onglet relance le jeu ouvert
    document.addEventListener('tabshow', (e) => {
        if (e.detail === 'games' && openGame) document.dispatchEvent(new CustomEvent('gameopen', { detail: openGame }));
    });
    window.gamesHub = { open, close };
})();

/* ---------------------------------------------------------------------
   PÊCHE
   --------------------------------------------------------------------- */
const fishing = (() => {
    const KEY = 'eliasPortfolio.fishing';
    const section = document.getElementById('game-fishing');
    const canvas = document.getElementById('fishCanvas');
    const noop = { reset() { } };
    if (!section || !canvas) return noop;

    const $ = (id) => document.getElementById(id);
    const ctx = canvas.getContext('2d');
    const stage = $('fishStage');
    const msg = $('fishMsg');
    const btn = $('fishBtn');
    const powerBox = $('fishPower');
    const powerFill = $('fishPowerFill');
    const meter = $('fishMeter');
    const zoneEl = $('fishZone');
    const iconEl = $('fishIcon');
    const progEl = $('fishProgress');
    const streakEl = $('fishStreak');
    const catchBox = $('fishCatch');
    const hiScore = $('hiScore');

    /* --- les espèces : couleurs, motif, taille, rareté (w), difficulté --- */
    // Poissons de Final Fantasy XV (noms officiels de la version anglaise).
    // h = hauteur du corps, w = fréquence, diff = difficulté, stars = rareté
    const FISH = [
        { id: 'horned-bluegill', name: 'Horned Bluegill', min: 12, max: 20, w: 30, diff: 0.15, stars: 1, h: 0.5,
            top: '#3d6b6e', belly: '#d7e3a0', fin: '#2e4f57', pattern: 'bars' },
        { id: 'duscaen-dace', name: 'Duscaen Dace', min: 10, max: 18, w: 28, diff: 0.12, stars: 1, h: 0.24,
            top: '#7d8b97', belly: '#eef1f4', fin: '#9aa6b0', pattern: 'lateral' },
        { id: 'chipped-bluegill', name: 'Chipped Bluegill', min: 14, max: 24, w: 22, diff: 0.2, stars: 1, h: 0.48,
            top: '#4d7a5a', belly: '#f0c87a', fin: '#c46a3a', pattern: 'bars' },
        { id: 'mud-dace', name: 'Mud Dace', min: 12, max: 22, w: 20, diff: 0.2, stars: 1, h: 0.24,
            top: '#5b5341', belly: '#c9bc94', fin: '#6b5f45', pattern: 'lateral' },
        { id: 'alstor-bass', name: 'Alstor Bass', min: 25, max: 48, w: 18, diff: 0.32, stars: 2, h: 0.34,
            top: '#4f6b32', belly: '#e3e4b6', fin: '#556d3a', pattern: 'lateral' },
        { id: 'rainbow-trout', name: 'Rainbow Trout', min: 25, max: 55, w: 16, diff: 0.35, stars: 2, h: 0.28,
            top: '#5d7f8f', belly: '#eef2f2', fin: '#9fb6be', pattern: 'stripe' },
        { id: 'redeye-bass', name: 'Redeye Bass', min: 28, max: 50, w: 13, diff: 0.4, stars: 2, h: 0.34,
            top: '#6b5a2c', belly: '#e9d99b', fin: '#b2452c', pattern: 'mottled', eye: '#e0302a' },
        { id: 'spiked-alstor-bass', name: 'Spiked Alstor Bass', min: 32, max: 55, w: 11, diff: 0.45, stars: 2, h: 0.36,
            top: '#2f5a3e', belly: '#d5dfb0', fin: '#1f3b29', pattern: 'lateral', spikes: true },
        { id: 'lambent-trout', name: 'Lambent Trout', min: 35, max: 60, w: 9, diff: 0.5, stars: 3, h: 0.28,
            top: '#8e7a4a', belly: '#fff6d8', fin: '#d8b45a', pattern: 'stripe', shine: true },
        { id: 'snakehead', name: 'Snakehead', min: 40, max: 85, w: 9, diff: 0.55, stars: 3, h: 0.2,
            top: '#3b3a2a', belly: '#b5ae86', fin: '#2e2d21', pattern: 'mottled' },
        { id: 'lucian-catfish', name: 'Lucian Catfish', min: 50, max: 100, w: 8, diff: 0.55, stars: 3, h: 0.24,
            top: '#3a3f47', belly: '#9fa39b', fin: '#2c3036', pattern: 'whiskers' },
        { id: 'phantom-snakehead', name: 'Phantom Snakehead', min: 60, max: 95, w: 5, diff: 0.68, stars: 4, h: 0.2,
            top: '#2a2f4a', belly: '#9aa4d6', fin: '#1d2138', pattern: 'mottled', shine: true },
        { id: 'golden-catfish', name: 'Golden Catfish', min: 70, max: 130, w: 4, diff: 0.72, stars: 4, h: 0.24,
            top: '#9a7420', belly: '#ffe08a', fin: '#7a5a14', pattern: 'whiskers', shine: true },
        { id: 'vesper-gar', name: 'Vesper Gar', min: 90, max: 160, w: 3, diff: 0.8, stars: 4, h: 0.13,
            top: '#556a4a', belly: '#d9d8b0', fin: '#3f4f36', pattern: 'spots', snout: true },
        { id: 'noble-arapaima', name: 'Noble Arapaima', min: 150, max: 230, w: 1.6, diff: 0.88, stars: 5, h: 0.2,
            top: '#3d4a3a', belly: '#c8c39a', fin: '#b2352c', pattern: 'redtail' },
        { id: 'giant-catfish', name: 'Giant Catfish', min: 180, max: 260, w: 1, diff: 0.95, stars: 5, h: 0.26,
            top: 'crystal', belly: '#ffffff', fin: 'crystal', pattern: 'whiskers', legend: true },
        // le monstre de la nuit : ne mord qu'entre 22 h et 4 h (heure du visiteur)
        { id: 'mummy-bass', name: 'Mummy Bass', min: 140, max: 210, w: 1.4, diff: 0.97, stars: 5, h: 0.36,
            top: '#3c4a46', belly: '#d8d2b4', fin: '#2a3330', pattern: 'mottled', eye: '#9cff8a', legend: true, night: true },
    ];

    const css = (v, d) => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || d;
    const crystalRgb = () => css('--t-crystal-rgb', '143, 184, 255');

    /* --- dessin d'un poisson (réutilisé : eau, prise, bestiaire) --- */
    function drawFish(c, x, y, len, sp, angle = 0, alpha = 1, silhouette = false, t = 0) {
        const h = len * sp.h;
        const cr = crystalRgb();
        const col = (v) => (v === 'crystal' ? `rgb(${cr})` : v);
        c.save();
        c.globalAlpha = alpha;
        c.translate(x, y);
        c.rotate(angle);
        const wag = Math.sin(t * 10) * 0.12;
        // queue
        c.fillStyle = silhouette ? '#000' : col(sp.fin);
        c.beginPath();
        c.moveTo(-len * 0.3, 0);
        c.lineTo(-len * 0.52, -h * 0.75 + wag * len * 0.3);
        c.quadraticCurveTo(-len * 0.42, 0, -len * 0.52, h * 0.75 + wag * len * 0.3);
        c.closePath();
        c.fill();
        // nageoire dorsale
        c.beginPath();
        c.moveTo(len * 0.12, -h * 0.82);
        c.quadraticCurveTo(-len * 0.02, -h * 1.35, -len * 0.16, -h * 0.62);
        c.closePath();
        c.fill();
        // corps
        if (silhouette) c.fillStyle = '#000';
        else {
            const g = c.createLinearGradient(0, -h, 0, h);
            g.addColorStop(0, col(sp.top));
            g.addColorStop(0.55, col(sp.top));
            g.addColorStop(1, sp.belly);
            c.fillStyle = g;
        }
        c.beginPath();
        c.moveTo(len * 0.5, 0);
        c.quadraticCurveTo(len * 0.3, -h, -len * 0.05, -h * 0.9);
        c.quadraticCurveTo(-len * 0.28, -h * 0.6, -len * 0.32, 0);
        c.quadraticCurveTo(-len * 0.28, h * 0.6, -len * 0.05, h * 0.9);
        c.quadraticCurveTo(len * 0.3, h, len * 0.5, 0);
        c.fill();
        if (!silhouette) {
            c.save();
            c.clip();
            c.globalAlpha = alpha * 0.55;
            if (sp.pattern === 'bars') {
                c.fillStyle = '#1f2a14';
                for (let i = 0; i < 5; i++) c.fillRect(len * (0.25 - i * 0.12), -h, len * 0.04, h * 1.2);
            } else if (sp.pattern === 'stripe') {
                c.fillStyle = '#e46a8a';
                c.fillRect(-len * 0.32, -h * 0.12, len * 0.82, h * 0.22);
                c.fillStyle = '#20303a';
                for (let i = 0; i < 18; i++) c.fillRect(len * (0.4 - (i % 9) * 0.08), -h * (0.7 - Math.floor(i / 9) * 0.35), 2, 2);
            } else if (sp.pattern === 'scales') {
                c.strokeStyle = '#ffe2a0';
                for (let i = 0; i < 4; i++) {
                    c.beginPath();
                    c.arc(len * (0.15 - i * 0.12), -h * 0.15, h * 0.22, 0, Math.PI * 2);
                    c.stroke();
                }
            } else if (sp.pattern === 'spots') {
                c.fillStyle = '#e9e7b8';
                for (let i = 0; i < 16; i++) {
                    c.beginPath();
                    c.ellipse(len * (0.35 - (i % 8) * 0.08), -h * (0.55 - Math.floor(i / 8) * 0.5), len * 0.02, h * 0.1, 0, 0, Math.PI * 2);
                    c.fill();
                }
            } else if (sp.pattern === 'lateral') {
                c.fillStyle = 'rgba(20, 24, 18, 0.9)';
                c.fillRect(-len * 0.3, -h * 0.08, len * 0.75, h * 0.16);
            } else if (sp.pattern === 'mottled') {
                c.fillStyle = 'rgba(15, 15, 10, 0.9)';
                for (let i = 0; i < 14; i++) {
                    c.beginPath();
                    c.ellipse(len * (0.38 - (i % 7) * 0.1), -h * (0.5 - Math.floor(i / 7) * 0.55), len * 0.035, h * 0.16, 0.4, 0, Math.PI * 2);
                    c.fill();
                }
            } else if (sp.pattern === 'redtail') {
                const g3 = c.createLinearGradient(-len * 0.3, 0, len * 0.1, 0);
                g3.addColorStop(0, '#c2382c');
                g3.addColorStop(1, 'rgba(194,56,44,0)');
                c.fillStyle = g3;
                c.fillRect(-len * 0.32, -h, len * 0.45, h * 2);
            } else if (sp.pattern === 'glow') {
                const g2 = c.createRadialGradient(len * 0.1, -h * 0.2, 0, len * 0.1, 0, len * 0.5);
                g2.addColorStop(0, 'rgba(255,255,255,0.9)');
                g2.addColorStop(1, `rgba(${cr},0)`);
                c.fillStyle = g2;
                c.fillRect(-len, -h, len * 2, h * 2);
            }
            c.restore();
            if (sp.shine) {
                const g4 = c.createLinearGradient(0, -h, 0, h);
                g4.addColorStop(0, 'rgba(255,255,255,0)');
                g4.addColorStop(0.45, 'rgba(255,255,255,0.35)');
                g4.addColorStop(0.55, 'rgba(255,255,255,0)');
                c.fillStyle = g4;
                c.beginPath();
                c.ellipse(len * 0.05, 0, len * 0.4, h * 0.85, 0, 0, Math.PI * 2);
                c.fill();
            }
            if (sp.spikes) {
                c.fillStyle = col(sp.fin);
                for (let i = 0; i < 5; i++) {
                    c.beginPath();
                    c.moveTo(len * (0.18 - i * 0.07), -h * 0.85);
                    c.lineTo(len * (0.15 - i * 0.07), -h * 1.45);
                    c.lineTo(len * (0.12 - i * 0.07), -h * 0.8);
                    c.fill();
                }
            }
            if (sp.snout) {
                // long bec du gar
                c.fillStyle = col(sp.top);
                c.beginPath();
                c.moveTo(len * 0.45, -h * 0.25);
                c.lineTo(len * 0.72, -h * 0.05);
                c.lineTo(len * 0.72, h * 0.05);
                c.lineTo(len * 0.45, h * 0.25);
                c.fill();
            }
            // moustaches des poissons-chats
            if (sp.pattern === 'whiskers') {
                c.strokeStyle = sp.legend ? `rgb(${cr})` : sp.belly;
                c.lineWidth = Math.max(1, len * 0.01);
                [-1, 1].forEach(s => {
                    c.beginPath();
                    c.moveTo(len * 0.47, h * 0.1 * s);
                    c.quadraticCurveTo(len * 0.62, h * 0.6 * s, len * 0.55, h * 1.1 * s);
                    c.stroke();
                });
            }
            // œil
            c.fillStyle = '#fff';
            c.beginPath();
            c.arc(len * 0.36, -h * 0.18, Math.max(1.5, h * 0.14), 0, Math.PI * 2);
            c.fill();
            c.fillStyle = sp.eye || '#111';
            c.beginPath();
            c.arc(len * 0.375, -h * 0.18, Math.max(1, h * 0.08), 0, Math.PI * 2);
            c.fill();
            if (sp.legend) {
                c.shadowColor = `rgb(${cr})`;
                c.shadowBlur = len * 0.25;
                c.strokeStyle = `rgba(${cr},0.9)`;
                c.lineWidth = 1.5;
                c.beginPath();
                c.moveTo(len * 0.5, 0);
                c.quadraticCurveTo(len * 0.3, -h, -len * 0.05, -h * 0.9);
                c.stroke();
            }
        }
        c.restore();
    }

    /* --- sauvegarde --- */
    const fresh = () => ({ best: null, count: 0, bestSeries: 0, dex: {} });
    const load = () => { try { return { ...fresh(), ...JSON.parse(store.get(KEY)) }; } catch { return fresh(); } };
    let data = load();
    data.dex = Object.fromEntries(Object.entries(data.dex).filter(([id]) => FISH.some(f => f.id === id)));
    let misses = 0;
    let series = 0;

    /* --- bestiaire --- */
    const dexEl = $('fishDex');
    const renderDex = () => {
        dexEl.innerHTML = '';
        FISH.forEach(sp => {
            const rec = data.dex[sp.id];
            const li = document.createElement('li');
            li.className = rec ? 'is-known' : '';
            if (sp.legend) li.classList.add('is-legend');
            const cv = document.createElement('canvas');
            cv.width = 120; cv.height = 60;
            drawFish(cv.getContext('2d'), 60, 32, 92, sp, 0, rec ? 1 : 0.85, !rec);
            li.appendChild(cv);
            const txt = document.createElement('span');
            txt.innerHTML = '<b></b><small></small>';
            txt.querySelector('b').textContent = rec ? sp.name : '???';
            txt.querySelector('small').textContent = rec ? `max ${rec.size} cm · ${'★'.repeat(sp.stars)}`
                : (sp.night ? tr('Ne mord que la nuit…') : tr('Pas encore pêché'));
            li.appendChild(txt);
            dexEl.appendChild(li);
        });
        $('fishDexCount').textContent = `${Object.keys(data.dex).length} / ${FISH.length}`;
    };

    const render = () => {
        $('fishBest').textContent = data.best ? `${data.best.size} cm · ${data.best.name}` : '—';
        $('fishCount').textContent = data.count;
        $('fishSeries').textContent = series;
        $('fishBestSeries').textContent = data.bestSeries;
        $('fishMiss').textContent = misses;
        const hi = data.best ? `${data.best.size} CM` : '0';
        if (hiScore) hiScore.textContent = hi;
        $('fishHi').textContent = hi;
        setHubRecord('fishing', data.best ? `${data.best.size} cm` : '—');
        streakEl.hidden = series < 2;
        streakEl.textContent = `${tr('SÉRIE')} ×${series}`;
        renderDex();
    };

    /* --- état --- */
    let state = 'idle'; // idle | charge | cast | wait | bite | reel | jump | card
    let stateT = 0;
    let power = 0, perfect = false;
    let fish = null, fishSize = 0;
    let waitFor = 0, nibbles = [];
    let holding = false;
    let zoneY = 0.5, zoneV = 0, fishY = 0.5, fishTarget = 0.5, progress = 0.3, dash = 0;
    let bob = { x: 0, y: 0 };
    let W = 0, H = 0, raf = 0, last = 0, T = 0;
    const particles = [];
    const ripples = [];

    const tipPos = () => ({ x: W * 0.42, y: H * 0.36 });
    const horizon = () => H * 0.52;

    const say = (t) => { msg.textContent = t; };
    const setState = (s) => {
        state = s;
        stateT = 0;
        meter.hidden = s !== 'reel';
        powerBox.hidden = s !== 'charge';
        btn.hidden = s === 'card' || s === 'jump';
        btn.disabled = s === 'cast' || s === 'reel';
        btn.textContent = ({ idle: tr('▶ Maintenir pour lancer'), charge: tr('Relâcher pour lancer'), wait: tr('Ferrer'), bite: tr('! FERRER !') })[s] || '…';
        section.classList.toggle('is-biting', s === 'bite');
        section.classList.toggle('is-reeling', s === 'reel');
    };

    const splash = (x, y, n = 14, power2 = 1) => {
        for (let i = 0; i < n; i++) {
            particles.push({ x, y, vx: rand(-60, 60) * power2, vy: rand(-170, -60) * power2, life: 0, max: rand(0.5, 0.9), r: rand(1, 2.6) });
        }
        ripples.push({ x, y, t: 0 });
    };

    /* --- 1. charger le lancer --- */
    const startCharge = () => {
        if (state !== 'idle') return;
        setState('charge');
        say(tr('Relâche dans la zone dorée pour un lancer parfait.'));
    };
    const releaseCharge = () => {
        if (state !== 'charge') return;
        perfect = power > 0.86;
        // un lancer loin et parfait rend les gros poissons plus probables
        const boost = 1 + power * 0.8 + (perfect ? 0.8 : 0);
        const pool = FISH.map(f => ({ f, w: f.night && !isNight() ? 0 : f.w * (f.stars >= 3 ? boost : 1) }));
        let r = Math.random() * pool.reduce((s, p) => s + p.w, 0);
        fish = pool.find(p => (r -= p.w) <= 0).f;
        const hz = horizon();
        bob = { x: W * (0.5 + power * 0.4), y: hz + (H - hz) * (0.7 - power * 0.5) };
        waitFor = rand(1.6, 4.4);
        // 0 à 2 "touches" pour tester la patience (ferrer dessus = raté)
        nibbles = Array.from({ length: Math.floor(rand(0, 3)) }, () => rand(0.6, waitFor - 0.4)).sort((a, b) => a - b);
        setState('cast');
        say(perfect ? tr('✦ LANCER PARFAIT ! ✦') : tr('Lancer...'));
        sfx.select();
    };

    /* --- 2. ferrer --- */
    const hook = () => {
        if (state === 'wait') { miss(tr('Trop tôt ! Ce n\'était qu\'une touche.')); return; }
        if (state !== 'bite') return;
        zoneY = 0.5; zoneV = 0; fishY = 0.5; fishTarget = 0.5; progress = 0.3; dash = 0;
        zoneEl.style.height = `${(zoneSize() * 100).toFixed(1)}%`;
        iconEl.className = `fish-icon is-${fish.id}`;
        setState('reel');
        say(tr('Ça mord ! Garde le poisson dans la zone.'));
        splash(bob.x, bob.y, 18, 1.2);
    };
    // équilibrage : même les légendaires restent attrapables (≈ 2 essais sur 3 pour un joueur correct)
    const zoneSize = () => 0.42 - fish.diff * 0.16;

    const miss = (text) => {
        misses++;
        series = 0;
        sfx.lose();
        splash(bob.x, bob.y, 10, 0.7);
        setState('idle');
        say(text);
        render();
    };

    /* --- 3. la prise : le poisson saute hors de l'eau, puis la carte --- */
    const landFish = () => {
        fishSize = Math.round(rand(fish.min, fish.max));
        setState('jump');
        say('');
        splash(bob.x, bob.y, 26, 1.5);
        sfx.fanfare();
    };

    const showCard = () => {
        const record = !data.best || fishSize > data.best.size;
        const firstOfKind = !data.dex[fish.id];
        data.count++;
        series++;
        misses = 0;
        data.bestSeries = Math.max(data.bestSeries, series);
        if (record) data.best = { name: fish.name, size: fishSize };
        if (!data.dex[fish.id] || data.dex[fish.id].size < fishSize) data.dex[fish.id] = { size: fishSize };
        store.set(KEY, JSON.stringify(data));
        render();

        $('fishCatchK').textContent = fish.legend ? tr('★ PRISE LÉGENDAIRE ★') : (firstOfKind ? tr('NOUVELLE ESPÈCE !') : tr('PRISE !'));
        $('fishCatchName').textContent = fish.name;
        $('fishCatchSize').textContent = `${fishSize} cm`;
        $('fishCatchStars').textContent = '★'.repeat(fish.stars) + '☆'.repeat(5 - fish.stars);
        $('fishCatchRecord').hidden = !record;
        catchBox.classList.toggle('is-legend', !!fish.legend);
        const cc = $('fishCatchCanvas').getContext('2d');
        cc.clearRect(0, 0, 420, 200);
        drawFish(cc, 210, 104, 320, fish, -0.08);
        setState('card');
        catchBox.hidden = false;
        $('fishCatchOk').focus();

        achievements.unlock('fish1');
        if (fishSize >= 100) achievements.unlock('fishBig');
        if (fish.night) achievements.unlock('nightMonster');
    };

    $('fishCatchOk').addEventListener('click', () => {
        catchBox.hidden = true;
        setState('idle');
        say(series >= 2 ? tr('Série de {n} ! On relance ?').replace('{n}', series) : tr('Maintiens « Lancer » pour recommencer.'));
    });

    /* --- contrôles : bouton, scène, Espace --- */
    btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (state === 'idle') startCharge();
        else if (state === 'wait' || state === 'bite') hook();
    });
    stage.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button')) return;
        if (state === 'reel') { e.preventDefault(); holding = true; }
        else if (state === 'bite' || state === 'wait') hook();
    });
    window.addEventListener('pointerup', () => { holding = false; releaseCharge(); });
    window.addEventListener('pointercancel', () => { holding = false; releaseCharge(); });
    window.addEventListener('keydown', (e) => {
        if (e.code !== 'Space' || !gameOn('fishing')) return;
        if (e.target.closest('input, textarea')) return;
        e.preventDefault();
        if (e.repeat) return;
        if (state === 'reel') holding = true;
        else if (state === 'idle') startCharge();
        else if (state === 'bite' || state === 'wait') hook();
        else if (state === 'card') $('fishCatchOk').click();
    });
    window.addEventListener('keyup', (e) => {
        if (e.code !== 'Space') return;
        holding = false;
        releaseCharge();
    });

    /* --- décor --- */
    const stars = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random() * 0.48, r: rand(0.4, 1.5), t: rand(0, 6) }));
    const flies = Array.from({ length: 14 }, () => ({ x: rand(0, 0.35), y: rand(0.45, 0.85), p: rand(0, 6), s: rand(0.3, 0.8) }));
    const shadows = Array.from({ length: 6 }, () => ({ x: Math.random(), y: rand(0.15, 0.9), v: rand(0.015, 0.04) * (Math.random() < 0.5 ? -1 : 1), len: rand(28, 60), p: rand(0, 6) }));
    let shooting = null;

    const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const r = canvas.getBoundingClientRect();
        W = r.width; H = r.height;
        canvas.width = W * dpr; canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const drawScene = (t, dt) => {
        const cr = crystalRgb();
        const hz = horizon();
        // ciel
        const sky = ctx.createLinearGradient(0, 0, 0, hz);
        sky.addColorStop(0, '#03050a');
        sky.addColorStop(0.7, '#0a1222');
        sky.addColorStop(1, `rgba(${cr}, 0.22)`);
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, hz);
        ctx.fillStyle = '#fff';
        for (const s of stars) {
            ctx.globalAlpha = 0.35 + 0.45 * Math.sin(t * 1.4 + s.t);
            ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, 6.283); ctx.fill();
        }
        ctx.globalAlpha = 1;
        // étoile filante de temps en temps
        if (!shooting && Math.random() < dt * 0.08) shooting = { x: rand(0.2, 0.9) * W, y: rand(0.05, 0.25) * H, t: 0 };
        if (shooting) {
            shooting.t += dt;
            const p = shooting.t / 0.9;
            const sx = shooting.x - p * W * 0.25, sy = shooting.y + p * H * 0.12;
            const g = ctx.createLinearGradient(sx, sy, sx + 60, sy - 28);
            g.addColorStop(0, `rgba(255,255,255,${1 - p})`);
            g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.strokeStyle = g; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 60, sy - 28); ctx.stroke();
            if (p >= 1) shooting = null;
        }
        // lune
        const mx = W * 0.78, my = H * 0.17, mr = Math.min(W, H) * 0.055;
        const halo = ctx.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 5);
        halo.addColorStop(0, `rgba(${cr}, 0.35)`);
        halo.addColorStop(1, `rgba(${cr}, 0)`);
        ctx.fillStyle = halo; ctx.fillRect(mx - mr * 5, my - mr * 5, mr * 10, mr * 10);
        ctx.fillStyle = '#eef2f8';
        ctx.beginPath(); ctx.arc(mx, my, mr, 0, 6.283); ctx.fill();
        ctx.fillStyle = 'rgba(160,170,190,0.35)';
        [[-0.3, -0.2, 0.22], [0.25, 0.15, 0.16], [0.05, 0.4, 0.12]].forEach(([a, b, r]) => {
            ctx.beginPath(); ctx.arc(mx + a * mr, my + b * mr, r * mr, 0, 6.283); ctx.fill();
        });
        // montagnes (2 plans)
        const mountains = (pts, color) => {
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.moveTo(0, hz);
            pts.forEach(([x, y]) => ctx.lineTo(x * W, y * H));
            ctx.lineTo(W, hz); ctx.closePath(); ctx.fill();
        };
        mountains([[0, 0.38], [0.12, 0.3], [0.26, 0.4], [0.4, 0.26], [0.55, 0.38], [0.68, 0.29], [0.84, 0.4], [1, 0.33]], '#0b1120');
        mountains([[0, 0.46], [0.15, 0.4], [0.3, 0.47], [0.47, 0.41], [0.62, 0.48], [0.8, 0.42], [1, 0.47]], '#070b15');
        // eau
        const water = ctx.createLinearGradient(0, hz, 0, H);
        water.addColorStop(0, `rgba(${cr}, 0.06)`);
        water.addColorStop(0.18, '#070c16');
        water.addColorStop(1, '#02040a');
        ctx.fillStyle = water;
        ctx.fillRect(0, hz, W, H - hz);
        // reflet de la lune qui scintille
        for (let i = 0; i < 18; i++) {
            const y = hz + 6 + i * ((H - hz) / 20);
            const wob = Math.sin(t * 1.2 + i * 0.7) * (6 + i);
            const half = (14 + i * 4) * (0.6 + 0.4 * Math.sin(t * 2 + i));
            ctx.globalAlpha = 0.5 * (1 - i / 18);
            ctx.strokeStyle = '#dfe8ff';
            ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.moveTo(mx + wob - half, y); ctx.lineTo(mx + wob + half, y); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        // brume au ras de l'eau
        const mist = ctx.createLinearGradient(0, hz - 20, 0, hz + 40);
        mist.addColorStop(0, `rgba(${cr}, 0)`);
        mist.addColorStop(0.5, `rgba(${cr}, ${0.04 + 0.02 * Math.sin(t * 0.5)})`);
        mist.addColorStop(1, `rgba(${cr}, 0)`);
        ctx.fillStyle = mist; ctx.fillRect(0, hz - 20, W, 60);
        // ombres de poissons sous l'eau
        for (const s of shadows) {
            s.x += s.v * dt;
            if (s.x > 1.1) s.x = -0.1; if (s.x < -0.1) s.x = 1.1;
            let sx = s.x * W, sy = hz + 20 + s.y * (H - hz - 40) + Math.sin(t + s.p) * 6;
            const ang = s.v > 0 ? 0 : Math.PI;
            ctx.globalAlpha = 0.18;
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.ellipse(sx, sy, s.len * 0.5, s.len * 0.16, ang, 0, 6.283); ctx.fill();
            ctx.beginPath();
            const tx = sx - Math.cos(ang) * s.len * 0.5;
            ctx.moveTo(tx, sy); ctx.lineTo(tx - Math.cos(ang) * 10, sy - 7); ctx.lineTo(tx - Math.cos(ang) * 10, sy + 7); ctx.fill();
        }
        ctx.globalAlpha = 1;
        // roseaux (à droite)
        ctx.strokeStyle = '#0b1220';
        ctx.lineWidth = 2;
        for (let i = 0; i < 14; i++) {
            const rx = W * (0.86 + i * 0.011), sway = Math.sin(t * 1.3 + i) * 4;
            ctx.beginPath(); ctx.moveTo(rx, H); ctx.quadraticCurveTo(rx + sway, H * 0.85, rx + sway * 2, H * (0.66 + (i % 3) * 0.05)); ctx.stroke();
        }
        drawPier(t);
        // lucioles
        for (const f of flies) {
            const fx = (f.x + Math.sin(t * f.s + f.p) * 0.02) * W;
            const fy = (f.y + Math.cos(t * f.s * 1.3 + f.p) * 0.03) * H;
            const a = 0.4 + 0.6 * Math.max(0, Math.sin(t * 2 + f.p));
            const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, 7);
            g.addColorStop(0, `rgba(255, 236, 160, ${a})`);
            g.addColorStop(1, 'rgba(255, 236, 160, 0)');
            ctx.fillStyle = g; ctx.fillRect(fx - 7, fy - 7, 14, 14);
        }
    };

    /* Le ponton en bois, avec sa lanterne et un seau */
    const DECK = () => ({ y: H * 0.74, h: H * 0.04, end: W * 0.3 });
    const drawPier = (t) => {
        const d = DECK();
        const cr = crystalRgb();
        const topAt = (x) => d.y - H * 0.025 * (1 - x / d.end); // le ponton descend légèrement vers le lac
        // poteaux dans l'eau + leur reflet
        [0.025, 0.11, 0.2, 0.285].forEach((px, i) => {
            const x = px * W;
            const pw = Math.max(5, W * 0.013);
            const g = ctx.createLinearGradient(x, 0, x + pw, 0);
            g.addColorStop(0, '#3a2a1c'); g.addColorStop(1, '#1c140d');
            ctx.fillStyle = g;
            ctx.fillRect(x, topAt(x) + d.h, pw, H * 0.12);
            ctx.globalAlpha = 0.25;
            for (let k = 0; k < 5; k++) {
                const yy = topAt(x) + d.h + H * 0.12 + k * 5;
                ctx.fillRect(x + Math.sin(t * 2 + k + i) * 2, yy, pw, 2);
            }
            ctx.globalAlpha = 1;
        });
        // planches : dessus
        const wood = ctx.createLinearGradient(0, d.y - H * 0.03, 0, d.y + d.h);
        wood.addColorStop(0, '#7a5435');
        wood.addColorStop(1, '#4a3221');
        ctx.fillStyle = wood;
        ctx.beginPath();
        ctx.moveTo(0, topAt(0) - H * 0.012);
        ctx.lineTo(d.end, topAt(d.end) - H * 0.012);
        ctx.lineTo(d.end, topAt(d.end) + d.h * 0.45);
        ctx.lineTo(0, topAt(0) + d.h * 0.45);
        ctx.closePath();
        ctx.fill();
        // face avant (plus sombre)
        ctx.fillStyle = '#2c1e14';
        ctx.beginPath();
        ctx.moveTo(0, topAt(0) + d.h * 0.45);
        ctx.lineTo(d.end, topAt(d.end) + d.h * 0.45);
        ctx.lineTo(d.end, topAt(d.end) + d.h);
        ctx.lineTo(0, topAt(0) + d.h);
        ctx.closePath();
        ctx.fill();
        // joints des planches
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 1;
        for (let i = 1; i < 14; i++) {
            const x = (i / 14) * d.end;
            ctx.beginPath(); ctx.moveTo(x, topAt(x) - H * 0.012); ctx.lineTo(x, topAt(x) + d.h * 0.45); ctx.stroke();
        }
        // reflet de lune sur le bord
        ctx.strokeStyle = `rgba(${cr}, 0.35)`;
        ctx.beginPath(); ctx.moveTo(0, topAt(0) - H * 0.012); ctx.lineTo(d.end, topAt(d.end) - H * 0.012); ctx.stroke();
        // lanterne sur un poteau
        const lx = W * 0.045, ly = topAt(lx) - H * 0.17;
        ctx.fillStyle = '#2a1f17';
        ctx.fillRect(lx - 2, ly, 4, topAt(lx) - ly);
        const flick = 0.85 + Math.sin(t * 9) * 0.06 + Math.sin(t * 23) * 0.04;
        const glow = ctx.createRadialGradient(lx, ly - 6, 0, lx, ly - 6, H * 0.18);
        glow.addColorStop(0, `rgba(255, 196, 110, ${0.45 * flick})`);
        glow.addColorStop(1, 'rgba(255, 196, 110, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(lx - H * 0.18, ly - 6 - H * 0.18, H * 0.36, H * 0.36);
        ctx.fillStyle = '#1b1510';
        ctx.fillRect(lx - 7, ly - 18, 14, 3);
        ctx.fillStyle = `rgba(255, 210, 130, ${flick})`;
        ctx.fillRect(lx - 5, ly - 15, 10, 13);
        ctx.fillStyle = '#1b1510';
        ctx.fillRect(lx - 7, ly - 2, 14, 3);
        // seau
        const bx = W * 0.14, by = topAt(bx) - H * 0.012;
        ctx.fillStyle = '#5d6673';
        ctx.beginPath();
        ctx.moveTo(bx - 10, by - 20); ctx.lineTo(bx + 10, by - 20); ctx.lineTo(bx + 7, by); ctx.lineTo(bx - 7, by);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#8b95a7';
        ctx.beginPath(); ctx.arc(bx, by - 20, 10, Math.PI, 0); ctx.stroke();
    };

    /* La canne, plantée dans un support au bout du ponton */
    const drawRodAndLine = (t) => {
        const d = DECK();
        const base = { x: d.end - W * 0.035, y: d.y - H * 0.02 };
        const tip0 = tipPos();
        // la canne plie quand ça tire
        const pull = state === 'reel' ? (holding ? 0.38 : 0.22) + Math.sin(t * 14) * 0.03 : (state === 'bite' ? 0.18 : 0);
        const tip = { x: tip0.x + pull * W * 0.04, y: tip0.y + pull * H * 0.2 };
        const dx = tip0.x - base.x, dy = tip0.y - base.y;
        const L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L; // direction de la canne
        const nx = -uy, ny = ux;                                   // perpendiculaire
        // support
        ctx.strokeStyle = '#1c140d'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(base.x + 6, d.y); ctx.lineTo(base.x + 6, base.y - 6); ctx.stroke();
        // poignée en liège
        const hEnd = { x: base.x + ux * L * 0.17, y: base.y + uy * L * 0.17 };
        ctx.strokeStyle = '#a8713f'; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(hEnd.x, hEnd.y); ctx.stroke();
        ctx.strokeStyle = '#1c1f26'; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.moveTo(base.x - ux * 3, base.y - uy * 3); ctx.lineTo(base.x + ux * 2, base.y + uy * 2); ctx.stroke();
        // blank : effilé, courbé par la tension
        const ctrl = { x: hEnd.x + (tip.x - hEnd.x) * 0.55 + nx * pull * 40, y: hEnd.y + (tip.y - hEnd.y) * 0.55 + Math.abs(ny) * pull * 60 };
        const at = (k) => ({
            x: (1 - k) * (1 - k) * hEnd.x + 2 * (1 - k) * k * ctrl.x + k * k * tip.x,
            y: (1 - k) * (1 - k) * hEnd.y + 2 * (1 - k) * k * ctrl.y + k * k * tip.y,
        });
        const SEG = 14;
        for (let i = 0; i < SEG; i++) {
            const p1 = at(i / SEG), p2 = at((i + 1) / SEG);
            ctx.strokeStyle = '#262c38';
            ctx.lineWidth = 4.2 - (i / SEG) * 3;
            ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
            ctx.strokeStyle = 'rgba(180, 190, 210, 0.45)';
            ctx.lineWidth = 0.8;
            ctx.beginPath(); ctx.moveTo(p1.x - 1, p1.y - 1); ctx.lineTo(p2.x - 1, p2.y - 1); ctx.stroke();
        }
        // anneaux de guidage
        ctx.strokeStyle = '#c9ced8'; ctx.lineWidth = 1;
        [0.3, 0.55, 0.78, 0.95].forEach(k => {
            const p = at(k);
            ctx.beginPath(); ctx.arc(p.x + nx * 3, p.y + Math.abs(ny) * 3, 2.2 - k, 0, 6.283); ctx.stroke();
        });
        // moulinet sous la poignée, sa manivelle tourne quand on remonte
        const rc = { x: base.x + ux * L * 0.12 + Math.abs(nx) * 10, y: base.y + uy * L * 0.12 + Math.abs(ny) * 10 };
        ctx.fillStyle = '#9aa3b4';
        ctx.beginPath(); ctx.arc(rc.x, rc.y, 8, 0, 6.283); ctx.fill();
        ctx.fillStyle = '#3a414e';
        ctx.beginPath(); ctx.arc(rc.x, rc.y, 4, 0, 6.283); ctx.fill();
        const crank = state === 'reel' && holding ? t * 18 : 0.8;
        ctx.strokeStyle = '#c9ced8'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(rc.x, rc.y);
        ctx.lineTo(rc.x + Math.cos(crank) * 10, rc.y + Math.sin(crank) * 10); ctx.stroke();
        ctx.fillStyle = '#e8edf5';
        ctx.beginPath(); ctx.arc(rc.x + Math.cos(crank) * 10, rc.y + Math.sin(crank) * 10, 2.5, 0, 6.283); ctx.fill();

        if (state === 'idle' || state === 'charge') return;
        let bx = bob.x, by = bob.y;
        if (state === 'cast') {
            const p = Math.min(stateT / 0.75, 1);
            bx = tip.x + (bob.x - tip.x) * p;
            by = tip.y + (bob.y - tip.y) * p - Math.sin(p * Math.PI) * H * 0.3;
        } else if (state === 'wait') {
            by += Math.sin(t * 2.5) * 1.5;
            const n = nibbles.find(k => stateT > k && stateT < k + 0.25);
            if (n) by += 3;
        } else if (state === 'bite') {
            by += 6 + Math.sin(t * 45) * 4;
        } else if (state === 'reel') {
            bx += Math.sin(t * 7) * 10 * (1 + dash);
            by += Math.cos(t * 9) * 4;
        }
        // tension : le fil rougit quand la progression baisse
        const tension = state === 'reel' ? Math.max(0, 0.5 - progress) * 2 : 0;
        ctx.strokeStyle = tension > 0.3 ? `rgba(255, ${Math.round(220 - tension * 160)}, ${Math.round(220 - tension * 160)}, 0.9)` : 'rgba(232, 237, 245, 0.55)';
        ctx.lineWidth = state === 'reel' ? 1.4 : 1;
        ctx.beginPath();
        ctx.moveTo(tip.x, tip.y);
        const sag = state === 'reel' ? 4 : 30;
        ctx.quadraticCurveTo((tip.x + bx) / 2, Math.max(tip.y, by) + sag, bx, by);
        ctx.stroke();
        if (state === 'jump') return;
        // bouchon
        ctx.fillStyle = state === 'bite' ? '#f85149' : '#f2f4f8';
        ctx.beginPath(); ctx.arc(bx, by, 5, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#f85149';
        ctx.beginPath(); ctx.arc(bx, by, 5, 0, Math.PI); ctx.fill();
        if (state === 'bite') {
            const s = 1 + Math.sin(t * 20) * 0.15;
            ctx.save();
            ctx.translate(bx, by - 30);
            ctx.scale(s, s);
            ctx.font = '700 30px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = css('--t-gold', '#e3b341');
            ctx.shadowColor = css('--t-gold', '#e3b341');
            ctx.shadowBlur = 16;
            ctx.fillText('!', 0, 0);
            ctx.restore();
        }
    };

    const drawFx = (dt) => {
        // ronds dans l'eau
        for (let i = ripples.length - 1; i >= 0; i--) {
            const r = ripples[i];
            r.t += dt;
            const p = r.t / 1.4;
            if (p >= 1) { ripples.splice(i, 1); continue; }
            ctx.strokeStyle = `rgba(${crystalRgb()}, ${0.6 * (1 - p)})`;
            ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.ellipse(r.x, r.y + 4, 6 + p * 46, 2 + p * 13, 0, 0, 6.283); ctx.stroke();
        }
        // gouttes
        ctx.fillStyle = '#dfe8ff';
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.life += dt;
            if (p.life > p.max) { particles.splice(i, 1); continue; }
            p.vy += 420 * dt;
            p.x += p.vx * dt; p.y += p.vy * dt;
            ctx.globalAlpha = 1 - p.life / p.max;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
        }
        ctx.globalAlpha = 1;
    };

    const drawJump = (t) => {
        // le poisson jaillit de l'eau et retombe vers le ponton
        const p = Math.min(stateT / 1.0, 1);
        const tip = tipPos();
        const x = bob.x + (tip.x + W * 0.05 - bob.x) * p;
        const y = bob.y - Math.sin(p * Math.PI) * H * 0.38 + p * (H * 0.3 - bob.y + bob.y * 0.4) * 0.3;
        const len = Math.min(W * 0.18, 40 + fishSize * 0.9);
        drawFish(ctx, x, y, len, fish, -0.5 + p * 1.2 + Math.sin(t * 18) * 0.15, 1, false, t);
        // étincelles
        for (let i = 0; i < 2; i++) particles.push({ x, y, vx: rand(-40, 40), vy: rand(-80, 20), life: 0, max: 0.5, r: rand(0.8, 1.8) });
    };

    const update = (dt) => {
        stateT += dt;
        if (state === 'charge') {
            // la jauge monte et descend en boucle
            power = 0.5 - 0.5 * Math.cos(stateT * 4.2);
            powerFill.style.height = `${(power * 100).toFixed(1)}%`;
            powerBox.classList.toggle('is-perfect', power > 0.86);
        } else if (state === 'cast' && stateT > 0.75) {
            splash(bob.x, bob.y, 12, 0.9);
            setState('wait');
            say(tr('Patience... attends le « ! »'));
        } else if (state === 'wait') {
            const n = nibbles.find(k => stateT > k && stateT - dt <= k);
            if (n !== undefined) { ripples.push({ x: bob.x, y: bob.y, t: 0.6 }); say(tr('Une touche... pas encore !')); }
            if (stateT > waitFor) {
                setState('bite');
                say(tr('! ÇA MORD, FERRE !'));
                splash(bob.x, bob.y, 10, 0.8);
                sfx.bite();
            }
        } else if (state === 'bite' && stateT > 0.95) {
            miss(tr('Trop tard... le poisson a filé.'));
        } else if (state === 'reel') {
            // zone : monte vite quand on maintient, retombe sinon (réactive)
            zoneV += (holding ? -7.5 : 6) * dt;
            zoneV *= Math.pow(0.04, dt); // amortissement
            zoneY += zoneV * dt;
            const half = zoneSize() / 2;
            if (zoneY < half) { zoneY = half; zoneV = Math.max(0, zoneV); }
            if (zoneY > 1 - half) { zoneY = 1 - half; zoneV = Math.min(0, zoneV); }
            // le poisson : change de cap, et parfois fonce
            if (Math.random() < dt * (0.6 + fish.diff * 1.9)) fishTarget = rand(0.06, 0.94);
            if (dash <= 0 && Math.random() < dt * fish.diff * 0.45) { dash = 0.6; fishTarget = Math.random() < 0.5 ? 0.05 : 0.95; say(tr('Il fonce !')); }
            dash = Math.max(0, dash - dt);
            fishY += (fishTarget - fishY) * Math.min(1, dt * (1.3 + fish.diff * 2.3 + dash * 5));
            // sauts hors de l'eau pour les poissons nerveux
            if (Math.random() < dt * fish.diff * 0.35) { splash(bob.x, bob.y, 16, 1.1); say(tr('Il saute !')); }
            const inside = Math.abs(fishY - zoneY) < half;
            progress += (inside ? 0.3 : -(0.13 + fish.diff * 0.1)) * dt;
            zoneEl.style.top = `${((zoneY - half) * 100).toFixed(2)}%`;
            zoneEl.classList.toggle('is-on', inside);
            iconEl.style.top = `${(fishY * 100).toFixed(2)}%`;
            progEl.style.width = `${(Math.min(1, Math.max(0, progress)) * 100).toFixed(1)}%`;
            progEl.parentElement.classList.toggle('is-danger', progress < 0.2);
            if (progress >= 1) landFish();
            else if (progress <= 0) miss(tr('Le fil a cassé... le poisson s\'est échappé.'));
        } else if (state === 'jump' && stateT > 1.05) {
            showCard();
        }
    };

    const loop = (now) => {
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        T = now / 1000;
        update(dt);
        drawScene(T, dt);
        drawRodAndLine(T);
        if (state === 'jump') drawJump(T);
        drawFx(dt);
        raf = gameOn('fishing') ? requestAnimationFrame(loop) : 0;
    };
    const start = () => {
        if (raf) return;
        resize();
        last = performance.now();
        raf = requestAnimationFrame(loop);
    };

    render();
    document.addEventListener('gameopen', (e) => { if (e.detail === 'fishing') start(); });
    window.addEventListener('resize', () => { if (raf) resize(); });

    return {
        reset() {
            store.del(KEY);
            data = load();
            misses = 0;
            series = 0;
            catchBox.hidden = true;
            setState('idle');
            say(tr('Maintiens « Lancer » pour charger ton lancer.'));
            render();
        },
    };
})();

/* Rattrape ce qui s'est passé avant le chargement de ce fichier (pages déjà vues, etc.) */
(function syncAchievements() {
    achievements.render();
    if (getPlayer()) achievements.unlock('start');
    const visited = getVisited().size;
    if (visited >= 4) achievements.unlock('curious');
    if (visited >= TOTAL_ZONES) achievements.unlock('explorer');
    const found = getFound().size;
    if (found >= 1) achievements.unlock('secret1');
    if (found >= TOTAL_SECRETS) achievements.unlock('secretAll');
})();

/* ---------------------------------------------------------------------
   OISEAU DE NUIT : visite entre 3 h et 4 h du matin
   --------------------------------------------------------------------- */
(function initNightOwl() {
    const check = () => { if (new Date().getHours() === 3) achievements.unlock('nightOwl'); };
    check();
    setInterval(check, 60000);
})();

/* ---------------------------------------------------------------------
   PAUSE AU CAMPEMENT : 1 minute sans bouger -> feu de camp + récap
   --------------------------------------------------------------------- */
(function initCampfire() {
    const IDLE_MS = 60000;
    let timer = 0, open = false, el = null, raf = 0, shownAt = 0;

    const busy = () => !document.body.classList.contains('is-loaded')
        || !document.getElementById('gameOver')?.hidden
        || document.querySelector('.rbd, .credits')
        || (openGame && gameOn(openGame))
        // jeu secret (ou CV) ouvert : il tourne dans une iframe, ses touches et clics n'arrivent pas jusqu'ici
        || document.querySelector('.stage-modal-overlay.active');

    const recap = () => {
        const best = (() => { try { return JSON.parse(store.get('eliasPortfolio.fishing'))?.best; } catch { return null; } })();
        const rows = [
            [tr('Zones explorées'), `${getVisited().size} / ${TOTAL_ZONES}`],
            [tr('Objets secrets'), `${getFound().size} / ${TOTAL_SECRETS}`],
            [tr('Succès'), `${document.getElementById('trophyCount')?.textContent || 0} / ${document.getElementById('trophyTotal')?.textContent || 0}`],
            [tr('Record de pêche'), best ? `${best.size} cm` : '—'],
        ];
        return rows.map(([k, v]) => `<li><span>${k}</span><b>${v}</b></li>`).join('');
    };

    const show = () => {
        if (open || busy()) { arm(); return; }
        open = true;
        shownAt = performance.now();
        el = document.createElement('div');
        el.className = 'campfire';
        el.setAttribute('role', 'dialog');
        el.innerHTML = `
            <canvas></canvas>
            <div class="campfire-box">
                <p class="campfire-k">${tr('PAUSE AU CAMPEMENT')}</p>
                <h3>${tr('Bien joué aujourd\'hui,')} <span></span>.</h3>
                <ul>${recap()}</ul>
                <p class="campfire-hint">${tr('Bouge la souris ou touche l\'écran pour reprendre la route')}</p>
            </div>`;
        el.querySelector('h3 span').textContent = getPlayer() || tr('voyageur');
        document.body.appendChild(el);
        achievements.unlock('campfire');
        fire(el.querySelector('canvas'));
    };

    // feu de camp en particules
    function fire(cv) {
        const c = cv.getContext('2d');
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const W = cv.clientWidth, H = cv.clientHeight;
        cv.width = W * dpr; cv.height = H * dpr; c.setTransform(dpr, 0, 0, dpr, 0, 0);
        const parts = [];
        const embers = [];
        const loop = () => {
            if (!open) return;
            c.globalCompositeOperation = 'source-over';
            c.fillStyle = 'rgba(6, 4, 3, 0.35)';
            c.fillRect(0, 0, W, H);
            const fx = W / 2, fy = H * 0.72;
            // lueur au sol
            const glow = c.createRadialGradient(fx, fy, 0, fx, fy, H * 0.45);
            glow.addColorStop(0, `rgba(255, 140, 50, ${0.18 + Math.random() * 0.04})`);
            glow.addColorStop(1, 'rgba(255, 140, 50, 0)');
            c.fillStyle = glow; c.fillRect(0, 0, W, H);
            // bûches
            c.fillStyle = '#2b1a10';
            c.save(); c.translate(fx, fy + 10); c.rotate(0.25); c.fillRect(-60, -7, 120, 14); c.restore();
            c.save(); c.translate(fx, fy + 10); c.rotate(-0.25); c.fillRect(-60, -7, 120, 14); c.restore();
            // flammes
            for (let i = 0; i < 6; i++) parts.push({ x: fx + rand(-26, 26), y: fy, vx: rand(-12, 12), vy: rand(-90, -150), life: 0, max: rand(0.6, 1.1), r: rand(10, 20) });
            if (Math.random() < 0.3) embers.push({ x: fx + rand(-20, 20), y: fy - 20, vx: rand(-25, 25), vy: rand(-60, -120), life: 0, max: rand(1.5, 3) });
            c.globalCompositeOperation = 'lighter';
            for (let i = parts.length - 1; i >= 0; i--) {
                const p = parts[i];
                p.life += 1 / 60;
                if (p.life > p.max) { parts.splice(i, 1); continue; }
                p.x += p.vx / 60; p.y += p.vy / 60;
                const k = 1 - p.life / p.max;
                const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * k + 1);
                g.addColorStop(0, `rgba(255, ${Math.round(200 * k + 40)}, 80, ${0.5 * k})`);
                g.addColorStop(1, 'rgba(255, 60, 0, 0)');
                c.fillStyle = g;
                c.beginPath(); c.arc(p.x, p.y, p.r * k + 1, 0, 6.283); c.fill();
            }
            c.fillStyle = 'rgba(255, 190, 110, 0.9)';
            for (let i = embers.length - 1; i >= 0; i--) {
                const e = embers[i];
                e.life += 1 / 60;
                if (e.life > e.max) { embers.splice(i, 1); continue; }
                e.x += (e.vx + Math.sin(e.life * 4) * 20) / 60; e.y += e.vy / 60;
                c.globalAlpha = 1 - e.life / e.max;
                c.fillRect(e.x, e.y, 2, 2);
            }
            c.globalAlpha = 1;
            raf = requestAnimationFrame(loop);
        };
        loop();
    }

    const hide = () => {
        if (!open || performance.now() - shownAt < 600) return;
        open = false;
        cancelAnimationFrame(raf);
        el.classList.add('is-leaving');
        const old = el;
        setTimeout(() => old.remove(), 500);
        el = null;
    };

    const arm = () => { clearTimeout(timer); timer = setTimeout(show, IDLE_MS); };
    ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach(ev =>
        window.addEventListener(ev, () => { hide(); arm(); }, { passive: true }));
    arm();
})();
