/* =====================================================================
   minijeux.js — Cuisine du campement, Chocobo Race, Combat (ATB)
   Chargé après jeu.js (utilise sfx, achievements, gameOn, setHubRecord,
   store, rand, reduceMotion, getPlayer, t).
   ===================================================================== */

/* petit utilitaire : un canvas net sur écran Retina, redimensionné à son conteneur */
function fitCanvas(cv) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = cv.getBoundingClientRect();
    cv.width = Math.max(1, r.width * dpr);
    cv.height = Math.max(1, r.height * dpr);
    const c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { c, W: r.width, H: r.height };
}

const cssVar = (v, d) => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || d;

/* =====================================================================
   1. CUISINE DU CAMPEMENT — jeu de rythme sur de vrais morceaux
   Chaque recette joue un extrait (~45 s) d'un morceau de la file d'attente
   du lecteur. Les ingrédients tombent sur les attaques de la musique,
   repérées à l'avance (flux spectral) : la partition est écrite ci-dessous.
   L'horloge du jeu est celle de l'audio : image et son restent calés.
   ===================================================================== */
const cooking = (() => {
    const panel = document.getElementById('game-cooking');
    if (!panel) return { reset() { } };
    const KEY = 'eliasPortfolio.cooking.v3'; // nouvelles partitions, nouveaux scores

    // du plus calme au plus dense. notes : nombre = taper ; [t, durée] = maintenir ; [t, 0] = piège
    // (temps en secondes depuis le début de l'extrait ; from = début de l'extrait dans le morceau)
    const RECIPES = [
        { id: 'fish', dish: '🐟', name: t('Poisson grillé aux herbes'), song: 'Somnus', src: 'assets/ost/Somnus (Instrumental Version).mp3', from: 6.667, len: 45,
            items: ['🐟', '🌿', '🍋'],
            notes: [2, 2.862, 3.295, 3.729, 5.463, 5.894, 6.756, 7.187, 8.911, 11.486, 13.2, 13.843, 14.057, 14.488, 14.704, 14.919, 15.135, 15.35, 15.566, 16.212, 16.428, 16.643, 16.86, 17.077, 17.293, 17.51, 17.941, 18.157, 18.372, 18.588, 18.803, 19.234, 19.449, 19.665, 19.88, 20.096, 20.311, 20.527, 20.958, 21.389, 21.604, 21.82, 22.034, 22.248, 22.677, 22.892, 23.539, 23.972, 24.406, 24.624, 24.842, 25.278, 25.494, 25.711, 25.928, 26.363, 26.581, 27.017, 27.231, 27.659, 27.874, 28.305, 29.166, 29.382, 29.597, 29.813, 30.028, 30.244, 30.675, 30.89, 31.321, 31.537, 31.752, 31.968, 32.614, 32.83, 33.045, 33.259, 33.474, 33.902, 34.118, 34.333, 34.549, 34.764, 34.978, 35.407, 35.621, 36.052, 36.483, 37.761, 37.974, 38.187, 38.402, 38.618, 38.833, 39.049, 39.482, 39.699, 39.916, 40.344, 41.201, 41.63, 41.844, 42.487] },
        { id: 'skewers', dish: '🍢', name: t('Brochettes du campement'), song: 'Calm Before the Storm', src: 'assets/ost/Calm Before The Storm (FINAL FANTASY X Original Soundtrack) 【Audio】.mp3', from: 1.115, len: 45,
            items: ['🥩', '🧅', '🫑'],
            notes: [2, 2.356, 2.712, 3.065, 3.418, 3.769, 4.12, 4.473, 4.826, 5.177, 5.528, 5.884, 6.24, 6.59, 6.941, 7.294, 7.648, 8.001, 8.354, 8.708, 9.061, 9.412, 9.763, 10.116, 10.469, 10.822, 11.176, 11.532, 11.709, 11.887, 12.238, 12.589, 12.942, 13.296, 13.649, 14.002, 14.355, 14.709, 15.06, 15.41, 15.761, 16.112, 16.465, 16.642, 16.819, 16.995, 17.172, 17.525, 17.878, 18.055, 18.408, 18.938, 20.352, 20.885, 21.063, 21.416, 21.77, 22.123, 22.653, 23.006, 23.183, 23.713, 23.89, 24.586, 24.763, 25.293, 25.471, 26.004, 26.18, 26.355, 26.706, 27.412, 27.763, 28.821, 29.527, 29.883, 30.061, 30.239, 30.945, 31.122, 31.652, 32.005, 32.359, 32.707, 33.055, 33.233, 33.767, 34.297, 34.473, 35.175, 35.352, 35.528, 35.882, 36.058, 36.412, 36.588, 36.942, 37.295, 37.472, 37.825, 38.001, 38.535, 38.713, 38.888, 39.064, 39.239, 39.415, 39.591, 39.768, 39.945, 40.121, 40.475, 40.651, 40.828, 41.354, 41.529, 41.706] },
        { id: 'stew', dish: '🍲', name: t('Ragoût de la forêt'), song: 'Noctis', src: 'assets/ost/NOCTIS.mp3', from: 194.352, len: 45,
            items: ['🥕', '🥔', '🍖', '🧄'],
            notes: [2, 2.271, 2.541, 2.812, 3.082, 3.357, 3.631, 4.18, 4.724, 5.267, 5.544, 5.821, 6.098, 6.375, 6.648, 6.921, 7.194, 7.467, 7.74, 8.014, 8.56, 8.834, 9.109, 9.657, 9.932, 10.206, 10.48, 10.755, 11.027, 11.299, 11.57, 11.842, 12.391, 12.665, 12.94, 13.21, 13.481, 13.752, 14.022, 14.292, 14.561, 15.1, 15.373, 15.646, 15.919, 16.743, 17.295, 17.57, 18.397, 18.67, 18.943, 19.49, 20.038, 20.587, 20.856, 21.126, 21.395, 21.664, 22.193, 22.458, 22.722, 22.996, 23.271, 23.819, 24.092, 24.366, 24.639, 24.912, 25.184, 25.456, 25.727, 25.999, 26.553, 26.83, 27.107, 27.382, 27.658, 27.934, 28.209, 28.753, 29.025, 29.297, 29.845, 30.12, 30.394, 30.67, 30.945, 31.221, 31.497, 31.771, 32.045, 32.32, 32.594, 33.138, 33.682, 33.954, 34.225, 34.497, 34.769, 35.305, 35.573, 35.842, 36.11, 36.378, 36.914, 37.19, 37.465, 37.741, 38.016, 38.29, 38.563, 38.836, 39.109, 39.385, 39.66, 39.936, 40.211, 40.485, 40.758, 41.304, 41.575, 41.845, 42.116, 42.386] },
        { id: 'curry', dish: '🍛', name: t('Curry du campement'), song: 'Sunset Waltz', src: 'assets/ost/Sunset Waltz.mp3', from: 1.611, len: 45,
            items: ['🍛', '🥕', '🌶️', '🍚'],
            notes: [2, 2.306, 2.459, 2.611, 2.917, 3.223, 3.528, 3.834, 3.987, 4.14, 4.446, 4.751, 5.057, 5.363, 5.668, 5.974, 6.28, 6.583, 6.886, 7.192, 7.497, 7.806, 8.114, 8.267, 8.42, 8.725, 9.033, 9.342, 9.494, 9.647, 9.8, 9.953, 10.259, 10.412, 10.564, 10.87, 11.023, 11.176, 11.484, 11.638, 11.792, 12.251, 12.404, 12.709, 13.015, 13.321, 13.473, 13.626, 13.779, 14.085, 14.238, 14.546, 14.854, 15.16, 15.465, 15.771, 15.924, 16.077, 16.383, 16.535, 16.688, 16.994, 17.3, 17.911, 18.217, 18.37, 18.522, 18.675, 19.287, 19.592, 20.053, 20.207, 20.362, 20.667, 20.973, 21.279, 21.431, 21.584, 22.201, 22.506, 22.965, 23.729, 23.882, 24.035, 24.188, 24.341, 24.493, 24.646, 24.799, 25.105, 25.258, 25.566, 25.874, 26.18, 26.333, 26.485, 26.791, 26.944, 27.708, 27.861, 28.014, 28.32, 28.936, 29.547, 29.853, 30.006, 30.464, 30.617, 31.381, 31.536, 31.69, 31.998, 32.306, 32.614, 32.92, 33.226, 33.531, 33.837, 34.296, 34.448, 34.754, 35.365, 35.671, 35.979, 36.288, 36.593, 36.746, 36.899, 37.205, 37.51, 37.819, 38.127, 38.432, 38.585, 38.738, 39.044, 39.197, 39.35, 39.501, 39.653, 39.956, 40.262, 40.567, 40.72, 40.873, 41.179, 41.487, 41.641, 41.795, 42.406] },
        { id: 'ultimate', dish: '👑', name: t('Festin du roi'), song: 'Valse di Fantastica', src: 'assets/ost/Valse di Fantastica (FINAL FANTASY XV Original Soundtrack) 【Audio】.mp3', from: 110.337, len: 45, ultimate: true,
            items: ['🍤', '🍄', '🌶️', '🥚', '🍚', '🦞'],
            notes: [2, 2.306, 2.611, 2.915, 3.218, 3.521, 3.824, 4.127, 4.279, 4.43, 4.734, 5.037, 5.338, 5.638, 5.939, 6.24, 6.54, 6.691, 6.841, 7.447, 8.054, 8.357, 8.66, 8.812, 9.266, 9.57, 9.873, 10.176, 10.631, 10.782, 10.934, 11.086, 11.389, 11.692, 11.995, 12.298, 12.45, 12.601, 12.905, 13.208, 13.511, 14.117, 14.269, 15.024, 15.325, 15.477, 15.628, 15.932, 16.083, 16.235, 16.386, 16.538, 16.841, 16.993, 17.144, 17.296, 17.447, 17.751, 17.902, 18.357, 18.509, 18.66, 18.963, 19.115, 19.267, 19.57, 19.723, 19.875, 20.181, 20.333, 20.484, 20.788, 20.939, 21.394, 21.545, 21.697, 21.849, 22, 22.303, 22.607, 22.758, 22.91, 23.516, 23.668, 23.819, 23.971, 24.123, 24.426, 24.729, 25.032, 25.487, 25.638, 25.942, 26.245, 26.548, 27.154, 27.306, 27.458, 27.761, 28.064, 28.367, 28.67, 28.822, 28.974, 29.277, 29.58, 29.883, 30.186, 30.489, 30.641, 30.793, 31.096, 31.399, 31.551, 31.702, 32.003, 32.304, 32.455, 32.607, 32.91, 33.213, 33.516, 33.819, 34.123, 34.274, 34.426, 34.729, 35.032, 35.335, 35.639, 35.942, 36.093, 36.245, 36.548, 36.851, 37.155, 37.455, 37.756, 38.062, 38.367, 38.67, 38.974, 39.279, 39.585, 39.737, 40.191, 40.492, 40.793, 41.096, 41.399, 41.551, 41.702, 42.006, 42.309] },
    ];
    const PERFECT = 0.038, GOOD = 0.085; // fenêtres de frappe (secondes) ; le niveau ultime est encore plus strict

    panel.innerHTML = `
        <div class="game-bar">
            <button class="game-back" type="button">${t('◂ Mini-jeux')}</button>
            <p class="game-title">🍳 ${t('Cuisine du campement')}</p>
        </div>
        <div class="cook-game">
            <div class="cook-stage">
                <canvas class="cook-canvas" aria-label="${t('Cuisine au feu de camp')}"></canvas>
                <div class="cook-hud">
                    <p class="cook-recipe"></p>
                    <p class="cook-score">0</p>
                    <p class="cook-combo"></p>
                    <p class="cook-judge"></p>
                </div>
                <div class="cook-overlay"></div>
            </div>
            <aside class="cook-book">
                <p class="fish-log-k">${t('CARNET DE RECETTES')}</p>
                <ul class="cook-list"></ul>
                <p class="fish-tip">${t('Appuie (clic, doigt ou Espace) quand l\'ingrédient passe dans le cercle, en rythme avec la musique. Taper à côté casse le combo. 2 étoiles débloquent la recette suivante.')}</p>
            </aside>
        </div>`;

    const $ = (sel) => panel.querySelector(sel);
    const cv = $('.cook-canvas');
    const stage = $('.cook-stage');
    const overlay = $('.cook-overlay');
    const judgeEl = $('.cook-judge');
    let c, W, H;

    const load = () => { try { return JSON.parse(store.get(KEY)) || {}; } catch { return {}; } };
    let data = load(); // { recipeId: stars }
    let current = 0;

    // une recette s'ouvre avec 2 étoiles sur celle d'avant (y compris une recette ajoutée plus tard)
    const unlocked = (i) => i === 0 || (data[RECIPES[i - 1].id] || 0) >= 2;

    /* ---------- musique : l'extrait du vrai morceau ---------- */
    let ac = null, master = null, noise = null, songSrc = null, songEl = null, songFrom = 0;
    const buffers = {};
    const audio = () => {
        ac = ac || sfx.ctx();
        if (ac && !noise) {
            noise = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
            const d = noise.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        }
        return ac;
    };
    // secours : site ouvert en fichier local (file://), où fetch est interdit → simple lecteur <audio>
    const loadElement = (r) => new Promise((ok) => {
        const el = new Audio();
        el.preload = 'auto';
        const done = (v) => { clearTimeout(timer); el.oncanplaythrough = el.onerror = null; ok(v); };
        const timer = setTimeout(() => done(el.readyState >= 2 ? { el } : null), 10000);
        el.oncanplaythrough = () => done({ el });
        el.onerror = () => done(null);
        el.src = encodeURI(r.src);
        el.load();
    });
    // le morceau est téléchargé et décodé une fois, puis gardé en mémoire
    const loadSong = (r) => buffers[r.src] || (buffers[r.src] = fetch(encodeURI(r.src))
        .then(res => { if (!res.ok) throw new Error(res.status); return res.arrayBuffer(); })
        .then(buf => new Promise((ok, ko) => ac.decodeAudioData(buf, ok, ko)))
        .catch(() => loadElement(r))
        .then(v => { if (!v) delete buffers[r.src]; return v; }));
    const songVolume = () => sfx.on ? gameVolume('cooking') * 1.2 : 0;
    const playSong = (r, buf, at) => {
        master = ac.createGain();
        master.gain.value = songVolume();
        master.connect(ac.destination);
        if (buf.el) {
            songEl = buf.el;
            songFrom = r.from;
            songEl.volume = Math.min(1, songVolume());
            songEl.currentTime = r.from;
            songEl.play().catch(() => { });
            return;
        }
        const g = ac.createGain();
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(1, at + 0.25);
        g.gain.setValueAtTime(1, at + r.len - 2.2);
        g.gain.exponentialRampToValueAtTime(0.0001, at + r.len);
        songSrc = ac.createBufferSource();
        songSrc.buffer = buf;
        songSrc.connect(g).connect(master);
        songSrc.start(at, r.from, r.len);
    };
    // frapper un ingrédient : un petit grésillement de poêle (pas de note, pour ne pas jurer avec le morceau)
    const lead = () => {
        if (!ac || !master) return;
        const at = ac.currentTime;
        const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
        s.buffer = noise;
        f.type = 'bandpass'; f.frequency.value = 5200; f.Q.value = 0.8;
        g.gain.setValueAtTime(0.09, at);
        g.gain.exponentialRampToValueAtTime(0.0001, at + 0.12);
        s.connect(f).connect(g).connect(master);
        s.start(at); s.stop(at + 0.14);
    };
    // cuisson maintenue : la poêle grésille tant qu'on tient
    const leadHold = () => {
        if (!ac || !master) return () => { };
        const at = ac.currentTime;
        const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
        s.buffer = noise; s.loop = true;
        f.type = 'highpass'; f.frequency.value = 3500;
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(0.05, at + 0.05);
        s.connect(f).connect(g).connect(master);
        s.start(at);
        return () => { const t1 = ac.currentTime; g.gain.setTargetAtTime(0.0001, t1, 0.04); s.stop(t1 + 0.3); };
    };

    const stopSong = () => {
        if (songEl) { songEl.pause(); songEl = null; }
        if (!master) return;
        const m = master, src = songSrc;
        master = null; songSrc = null;
        try { m.gain.setTargetAtTime(0, ac.currentTime, 0.08); setTimeout(() => { try { src?.stop(); } catch { } m.disconnect(); }, 500); } catch { }
    };
    document.addEventListener('gamevolume', (e) => {
        if (e.detail.id !== 'cooking') return;
        if (master) master.gain.value = songVolume();
        if (songEl) songEl.volume = Math.min(1, songVolume());
    });
    // menu pause : le lecteur de secours se fige avec le reste
    document.addEventListener('pausechange', (e) => { if (songEl) e.detail ? songEl.pause() : songEl.play().catch(() => { }); });

    // l'heure du jeu = l'heure de l'audio (moins la latence de sortie, pour coller à ce qu'on entend)
    const clock = () => songEl ? songEl.currentTime - songFrom : ac ? ac.currentTime - (ac.outputLatency || ac.baseLatency || 0) : performance.now() / 1000;

    const renderBook = () => {
        const list = $('.cook-list');
        list.innerHTML = '';
        RECIPES.forEach((r, i) => {
            const li = document.createElement('li');
            const ok = unlocked(i);
            li.className = `${ok ? '' : 'is-locked'} ${i === current ? 'is-current' : ''}`;
            li.innerHTML = '<button type="button"><span class="ck-dish"></span><span class="ck-txt"><b></b><small></small></span></button>';
            li.querySelector('.ck-dish').textContent = ok ? r.dish : '🔒';
            li.querySelector('b').textContent = ok ? `${i + 1}. ${r.name}` : `${i + 1}. ???`;
            const s = data[r.id] || 0;
            li.querySelector('small').textContent = ok ? `${'★'.repeat(s)}${'☆'.repeat(3 - s)} · ♪ ${r.song}` : t('2 étoiles sur la recette d\'avant');
            li.querySelector('button').disabled = !ok || state === 'play' || state === 'load';
            li.querySelector('button').addEventListener('click', () => { current = i; showStart(); });
            list.appendChild(li);
        });
        const total = Object.values(data).reduce((a, b) => a + b, 0);
        setHubRecord('cooking', total ? `${total} ★` : '—');
    };

    /* --- état --- */
    let state = 'menu'; // menu | load | play | end
    (window.gamePlaying ||= {}).cooking = () => state === 'play' || state === 'load';
    let notes = [], t0 = 0, now = 0, score = 0, combo = 0, maxCombo = 0, hits = 0, perfects = 0, bad = 0, spb = 0, endAt = 0;
    const particles = [];
    const pan = [];
    const HIT_X = () => W * 0.2;
    const LANE_Y = () => H * 0.78;
    const SPEED = () => W * (0.4 + current * 0.035); // plus rapide à chaque niveau

    const showStart = () => {
        stopSong();
        state = 'menu';
        const r = RECIPES[current];
        overlay.hidden = false;
        overlay.innerHTML = `
            <p class="cook-k ${r.ultimate ? 'is-ultimate' : ''}">${r.ultimate ? t('☠ NIVEAU ULTIME ☠') : `${t('NIVEAU')} ${current + 1} / ${RECIPES.length}`}</p>
            <p class="cook-big">${r.dish}</p>
            <h3></h3>
            <p class="cook-sub">♪ ${r.song} · ${t('Meilleur')} : ${'★'.repeat(data[r.id] || 0) || '—'}</p>
            ${r.notes.some(n => Array.isArray(n)) ? `<p class="cook-rules">${r.notes.some(n => Array.isArray(n) && n[1] > 0) ? `<span>🔥 ${t('Barre de cuisson : maintiens jusqu\'au bout')}</span>` : ''}${r.traps ? `<span>💀 ${t('Ingrédient pourri : le toucher = défaite')}</span>` : ''}</p>` : ''}
            <button class="btn cook-go" type="button">${t('▶ Cuisiner')}</button>`;
        overlay.querySelector('h3').textContent = r.name;
        overlay.querySelector('.cook-go').addEventListener('click', start);
        $('.cook-recipe').textContent = r.name;
        renderBook();
    };

    let loadId = 0;
    const start = async () => {
        const r = RECIPES[current];
        if (!audio()) return;
        const my = ++loadId;
        state = 'load';
        overlay.hidden = false;
        overlay.innerHTML = `<p class="cook-k">${t('LA POÊLE CHAUFFE…')}</p><p class="cook-big">${r.dish}</p><p class="cook-sub">♪ ${r.song}</p>`;
        renderBook();
        if (ac.state === 'suspended') ac.resume().catch(() => { });
        const buf = await loadSong(r);
        if (my !== loadId || state !== 'load' || !gameOn('cooking')) return;
        if (!buf) { showStart(); judge(t('Morceau introuvable'), 'is-miss'); return; }
        spb = 0.5;
        notes = r.notes.map((e, k) => {
            const tt = typeof e === 'number' ? e : e[0];
            const n = { t: tt, item: r.items[k % r.items.length], done: false, res: null, kind: 'tap' };
            if (Array.isArray(e) && e[1] > 0) { n.kind = 'hold'; n.len = e[1]; }
            if (Array.isArray(e) && e[1] === 0) { n.kind = 'trap'; n.item = r.traps[k % r.traps.length]; }
            return n;
        });
        endAt = Math.min(r.len, Math.max(...notes.map(n => n.t + (n.len || 0))) + 2);
        score = combo = maxCombo = hits = perfects = bad = 0;
        holding = null;
        poisoned = false;
        pan.length = 0;
        overlay.hidden = true;
        state = 'play';
        const at = ac.currentTime + 0.2;
        t0 = clock() + 0.2;
        playSong(r, buf, at);
        if (songEl) t0 = 0; // l'horloge est alors la position dans le morceau
        renderBook();
    };

    const judge = (text, cls) => {
        judgeEl.textContent = text;
        judgeEl.className = `cook-judge ${cls}`;
        void judgeEl.offsetWidth;
        judgeEl.classList.add('pop');
    };

    const hit = () => {
        if (state !== 'play') return;
        const tt = clock() - t0;
        let best = null, bestD = 9;
        for (const n of notes) {
            if (n.done) continue;
            const d = Math.abs(n.t - tt);
            if (d < bestD) { bestD = d; best = n; }
            if (n.t > tt + 0.3) break;
        }
        const good = RECIPES[current].ultimate ? 0.07 : GOOD, perfect = RECIPES[current].ultimate ? 0.03 : PERFECT;
        if (!best || bestD > good) { combo = 0; bad++; judge(t('Trop tôt'), 'is-miss'); return; }
        best.done = true;
        if (best.kind === 'trap') { // ingrédient pourri touché : le plat est raté, tout de suite
            best.res = 'burnt';
            judge(t('PIÈGE !'), 'is-miss');
            for (let i = 0; i < 14; i++) particles.push({ x: HIT_X() + rand(-20, 20), y: LANE_Y(), vx: rand(-90, 90), vy: rand(-160, -40), life: 0, max: rand(0.4, 0.8) });
            poisoned = true;
            finish();
            return;
        }
        if (best.kind === 'hold') { // début de cuisson : il faut maintenir jusqu'au bout
            best.res = 'holding';
            best.startPerfect = bestD < perfect;
            holding = { n: best, stop: leadHold(best) };
            judge(t('MAINTIENS !'), 'is-good');
            return;
        }
        if (bestD < perfect) { best.res = 'perfect'; score += 100 + combo * 5; perfects++; judge(t('PARFAIT'), 'is-perfect'); }
        else { best.res = 'good'; score += 50 + combo * 2; judge(t('BIEN'), 'is-good'); }
        hits++;
        combo++;
        maxCombo = Math.max(maxCombo, combo);
        lead(best);
        pan.push({ item: best.item, x: HIT_X(), y: LANE_Y(), t: 0 });
        for (let i = 0; i < 10; i++) particles.push({ x: W * 0.55 + rand(-50, 50), y: H * 0.5, vx: rand(-60, 60), vy: rand(-140, -40), life: 0, max: rand(0.4, 0.8) });
    };

    let holding = null; // note maintenue en cours
    let poisoned = false; // un ingrédient pourri a été touché
    const endHold = (ok) => {
        const h = holding;
        holding = null;
        h.stop();
        const n = h.n;
        if (ok) {
            n.res = h.n.startPerfect ? 'perfect' : 'good';
            hits++; if (h.n.startPerfect) perfects++;
            score += 150 + combo * 5; combo++; maxCombo = Math.max(maxCombo, combo);
            judge(t('CUIT À POINT !'), 'is-perfect');
            pan.push({ item: n.item, x: HIT_X(), y: LANE_Y(), t: 0 });
        } else {
            n.res = 'broken'; combo = 0;
            judge(t('LÂCHÉ TROP TÔT'), 'is-miss');
        }
    };
    const release = () => {
        if (state !== 'play' || !holding) return;
        const tt = clock() - t0;
        const end = holding.n.t + holding.n.len;
        endHold(tt >= end - 0.12); // un peu de marge pour relâcher juste à la fin
    };

    const finish = () => {
        state = 'end';
        if (holding) endHold(false);
        stopSong();
        const r = RECIPES[current];
        // les tapes dans le vide comptent contre toi
        const acc = Math.max(0, (hits + perfects * 0.25 - bad * 0.5) / (notes.length * 1.25));
        const stars = poisoned ? 0 : acc >= 0.9 ? 3 : acc >= 0.72 ? 2 : acc >= 0.5 ? 1 : 0;
        const prev = data[r.id] || 0;
        if (stars > prev) { data[r.id] = stars; store.set(KEY, JSON.stringify(data)); }
        if (stars === 3) achievements.unlock('chef');
        if (r.ultimate && stars >= 2) achievements.unlock('ultimateChef'); // débloque l'accessoire Aurore
        if (stars) sfx.fanfare(); else sfx.lose();
        overlay.hidden = false;
        overlay.innerHTML = `
            <p class="cook-k">${poisoned ? t('INGRÉDIENT POURRI : PLAT RATÉ') : stars ? (stars === 3 ? t('NOUVELLE RECETTE !') : t('PLAT RÉUSSI')) : t('LE PLAT A BRÛLÉ…')}</p>
            <p class="cook-big ${stars ? '' : 'is-burnt'}">${stars ? r.dish : '💨'}</p>
            <h3></h3>
            <p class="cook-stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</p>
            <p class="cook-sub">${t('Score')} ${score} · ${t('Combo max')} ${maxCombo} · ${t('Parfaits')} ${perfects}/${notes.length}</p>
            <div class="cook-actions">
                <button class="btn" type="button" data-act="again">${t('↺ Rejouer')}</button>
                ${current < RECIPES.length - 1 && unlocked(current + 1) ? `<button class="btn" type="button" data-act="next">${t('Recette suivante ▸')}</button>` : ''}
            </div>`;
        overlay.querySelector('h3').textContent = r.name;
        overlay.querySelector('[data-act="again"]').addEventListener('click', showStart);
        overlay.querySelector('[data-act="next"]')?.addEventListener('click', () => { current++; showStart(); });
        renderBook();
    };

    /* --- contrôles --- */
    stage.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button')) return;
        if (state === 'play') { e.preventDefault(); hit(); }
    });
    window.addEventListener('pointerup', () => { if (gameOn('cooking')) release(); });
    window.addEventListener('pointercancel', () => { if (gameOn('cooking')) release(); });
    window.addEventListener('keyup', (e) => { if ((e.code === 'Space' || e.code === 'Enter') && gameOn('cooking')) release(); });
    window.addEventListener('keydown', (e) => {
        if (!gameOn('cooking') || e.repeat) return;
        if (e.code === 'Space' || e.code === 'Enter') {
            if (e.target.closest?.('input, textarea, button')) return;
            if (state === 'play') { e.preventDefault(); hit(); }
        }
    });

    /* --- dessin --- */
    const draw = (dt) => {
        const tt = clock() - t0;
        const bg = c.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#0a0d14');
        bg.addColorStop(1, '#1a1008');
        c.fillStyle = bg; c.fillRect(0, 0, W, H);
        const fx = W * 0.55, fy = H * 0.6;
        const flick = 0.85 + Math.sin(now * 11) * 0.08 + Math.sin(now * 27) * 0.05;
        const glow = c.createRadialGradient(fx, fy, 0, fx, fy, H * 0.6);
        glow.addColorStop(0, `rgba(255, 140, 50, ${0.28 * flick})`);
        glow.addColorStop(1, 'rgba(255, 140, 50, 0)');
        c.fillStyle = glow; c.fillRect(0, 0, W, H);
        for (let i = 0; i < 7; i++) {
            const h = (24 + Math.sin(now * 8 + i * 1.7) * 8) * (i === 3 ? 1.5 : 1);
            const g = c.createLinearGradient(0, fy + 34 - h, 0, fy + 34);
            g.addColorStop(0, 'rgba(255, 230, 120, 0)');
            g.addColorStop(1, 'rgba(255, 110, 30, 0.9)');
            c.fillStyle = g;
            c.beginPath();
            c.ellipse(fx - 36 + i * 12, fy + 34 - h / 2, 7, h / 2, 0, 0, 6.283);
            c.fill();
        }
        c.fillStyle = '#1d1f24';
        c.beginPath(); c.ellipse(fx, fy, 86, 26, 0, 0, 6.283); c.fill();
        c.fillStyle = '#2e3138';
        c.beginPath(); c.ellipse(fx, fy - 4, 80, 21, 0, 0, 6.283); c.fill();
        c.fillStyle = '#1d1f24';
        c.fillRect(fx + 78, fy - 6, 70, 8);
        c.font = '26px serif';
        c.fillStyle = '#fff';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        for (let i = pan.length - 1; i >= 0; i--) {
            const p = pan[i];
            p.t += dt;
            const k = Math.min(p.t / 0.45, 1);
            const x = p.x + (fx - p.x + Math.sin(i * 2.3) * 40) * k;
            const y = p.y + (fy - 8 - p.y) * k - Math.sin(k * Math.PI) * H * 0.22;
            c.fillText(p.item, x, y + (k === 1 ? Math.sin(now * 6 + i) * 2 : 0));
        }
        while (pan.length > 14) pan.shift();
        c.fillStyle = 'rgba(255, 220, 160, 0.9)';
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.life += dt;
            if (p.life > p.max) { particles.splice(i, 1); continue; }
            p.vy += 200 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
            c.globalAlpha = 1 - p.life / p.max;
            c.fillRect(p.x, p.y, 2, 2);
        }
        c.globalAlpha = 1;

        // piste de rythme, avec une graduation à chaque temps
        const ly = LANE_Y(), hx = HIT_X();
        c.fillStyle = 'rgba(5, 7, 12, 0.75)';
        c.fillRect(0, ly - 34, W, 68);
        const cr = cssVar('--t-crystal-rgb', '143, 184, 255');
        c.strokeStyle = `rgba(${cr}, 0.25)`;
        c.beginPath(); c.moveTo(0, ly - 34); c.lineTo(W, ly - 34); c.moveTo(0, ly + 34); c.lineTo(W, ly + 34); c.stroke();
        // le cercle bat au rythme des ingrédients qui passent
        let beatPulse = 0;
        if (state === 'play') for (const n of notes) { const d = tt - n.t; if (d >= 0 && d < 0.25) beatPulse = Math.max(beatPulse, 1 - d / 0.25); if (n.t > tt) break; }
        c.strokeStyle = cssVar('--t-crystal', '#8fb8ff');
        c.lineWidth = 3;
        c.beginPath(); c.arc(hx, ly, 26 + beatPulse * 4, 0, 6.283); c.stroke();
        c.lineWidth = 1;
        if (state === 'play') {
            for (const n of notes) {
                const isHeld = holding && holding.n === n;
                if (n.done && n.res && !isHeld) continue;
                let x = hx + (n.t - tt) * SPEED();
                if (x > W + 30) break;
                if (n.kind === 'hold') {
                    // barre de cuisson : de la tête jusqu'à la fin de la note
                    const xEnd = hx + (n.t + n.len - tt) * SPEED();
                    if (xEnd < -30) continue;
                    if (isHeld) x = hx;
                    const grad = c.createLinearGradient(x, 0, xEnd, 0);
                    grad.addColorStop(0, isHeld ? 'rgba(255, 190, 90, 0.95)' : 'rgba(255, 170, 80, 0.55)');
                    grad.addColorStop(1, 'rgba(255, 120, 40, 0.25)');
                    c.fillStyle = grad;
                    c.beginPath(); c.roundRect(x, ly - 9, Math.max(0, xEnd - x), 18, 9); c.fill();
                    c.strokeStyle = isHeld ? '#ffd27a' : 'rgba(255, 200, 120, 0.7)';
                    c.lineWidth = 2;
                    c.beginPath(); c.moveTo(xEnd, ly - 14); c.lineTo(xEnd, ly + 14); c.stroke();
                    c.lineWidth = 1;
                    if (isHeld) { c.fillStyle = 'rgba(255, 210, 120, 0.35)'; c.beginPath(); c.arc(hx, ly, 30, 0, 6.283); c.fill(); }
                } else if (x < -30) continue;
                if (n.kind === 'trap') {
                    // piège : cercle rouge barré
                    c.fillStyle = 'rgba(248, 60, 60, 0.18)';
                    c.beginPath(); c.arc(x, ly, 22, 0, 6.283); c.fill();
                    c.strokeStyle = '#ff5a5a'; c.lineWidth = 2.5;
                    c.beginPath(); c.arc(x, ly, 22, 0, 6.283); c.stroke();
                    c.lineWidth = 1;
                    c.font = '24px serif';
                    c.fillStyle = '#fff';
                    c.fillText(n.item, x, ly + 1);
                    c.strokeStyle = 'rgba(255, 90, 90, 0.9)'; c.lineWidth = 3;
                    c.beginPath(); c.moveTo(x - 16, ly - 16); c.lineTo(x + 16, ly + 16); c.stroke();
                    c.lineWidth = 1;
                    continue;
                }
                c.fillStyle = 'rgba(232, 237, 245, 0.08)';
                c.beginPath(); c.arc(x, ly, 22, 0, 6.283); c.fill();
                c.font = '26px serif';
                c.fillStyle = '#fff'; // l'alpha de fillStyle s'applique aussi aux emojis
                c.fillText(n.item, x, ly + 1);
            }
        }
    };

    const update = () => {
        if (state !== 'play') return;
        const tt = clock() - t0;
        if (holding && tt >= holding.n.t + holding.n.len) endHold(true);
        for (const n of notes) {
            if (!n.done && tt - n.t > (RECIPES[current].ultimate ? 0.07 : GOOD)) {
                n.done = true;
                if (n.kind === 'trap') { n.res = 'avoided'; hits++; } // bien joué : on n'y a pas touché
                else { n.res = 'miss'; combo = 0; judge(t('RATÉ'), 'is-miss'); }
            }
        }
        $('.cook-score').textContent = score;
        $('.cook-combo').textContent = combo > 2 ? `${t('COMBO')} ×${combo}` : '';
        if (tt > endAt) finish();
    };

    let raf = 0, last = 0;
    const loop = (ms) => {
        const dt = Math.min((ms - last) / 1000, 0.05);
        last = ms;
        now = ms / 1000;
        if (!gameOn('cooking')) { if ((state === 'play' || state === 'load') && !gamePaused) showStart(); raf = 0; return; } // on quitte : la partie s'arrête (la pause, elle, la fige)
        update();
        draw(dt);
        raf = requestAnimationFrame(loop);
    };
    const run = () => {
        if (raf) return;
        ({ c, W, H } = fitCanvas(cv));
        last = performance.now();
        raf = requestAnimationFrame(loop);
    };
    document.addEventListener('gameopen', (e) => { if (e.detail === 'cooking') { run(); if (state !== 'play') showStart(); } });
    document.addEventListener('gameresume', (e) => { if (e.detail === 'cooking') run(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && (state === 'play' || state === 'load')) showStart(); });
    window.addEventListener('resize', () => { if (raf) ({ c, W, H } = fitCanvas(cv)); });

    renderBook();
    showStart();
    return {
        reset() { store.del(KEY); store.del('eliasPortfolio.cooking'); store.del('eliasPortfolio.cooking.v2'); store.del('eliasPortfolio.cookingUnlocked'); data = {}; current = 0; showStart(); }, // + ancienne clé de test
        stars: () => Object.values(load()).some(s => s === 3),
        peek: () => ({ state, tt: clock() - t0, notes, current }),
        recipes: RECIPES,
    };
})();

/* =====================================================================
   2. CHOCOBO RACE — course en un bouton
   Le chocobo vient de ta planche de sprites : assets/chocobo/chocobo-run.webp
   (8 images de course côte à côte). Sans image, un coureur de cristal le remplace.
   ===================================================================== */
const chocoboRace = (() => {
    const panel = document.getElementById('game-chocobo');
    if (!panel) return { reset() { } };
    const KEY = 'eliasPortfolio.chocobo';
    const WINS_KEY = 'eliasPortfolio.chocoboWins';
    const DIST = 1000; // mètres
    // les rivaux : couleur (filtre sur l'image du chocobo) et vitesse de base selon le mode
    const RIVALS = [
        { name: 'Émeraude', filter: 'hue-rotate(70deg) saturate(1.4)', dot: '#4cc96a', speed: { normal: 12.9, expert: 14.4 } },
        { name: 'Carmin', filter: 'hue-rotate(-45deg) saturate(1.5)', dot: '#e0524a', speed: { normal: 13.5, expert: 15.0 } },
        { name: 'Azur', filter: 'hue-rotate(170deg) saturate(1.2)', dot: '#5aa0ff', speed: { normal: 14.1, expert: 15.5 } },
    ];

    panel.innerHTML = `
        <div class="game-bar">
            <button class="game-back" type="button">${t('◂ Mini-jeux')}</button>
            <p class="game-title">🏁 Chocobo Race</p>
        </div>
        <div class="race-stage">
            <canvas class="race-canvas" aria-label="${t('Course')}"></canvas>
            <div class="race-hud">
                <p class="race-time">0.00 s</p>
                <div class="race-progress"><span></span>${RIVALS.map(r => `<b style="--c:${r.dot}"></b>`).join('')}<i></i></div>
                <p class="race-best">${t('RECORD')} <b>—</b></p>
                <p class="race-pos"></p>
                <div class="race-stamina" aria-hidden="true"><span></span></div>
            </div>
            <p class="race-center"></p>
            <button class="race-sprint" type="button" aria-label="${t('Sprint')}">${t('SPRINT')}</button>
            <div class="race-overlay"></div>
        </div>
        <p class="fish-tip race-tip">${t('Saute avec clic, doigt ou Espace (maintiens pour sauter plus haut). Sprinte avec Maj ou → tant que ta jauge tient. Saute par-dessus la boue, mais pas dans les corbeaux. Les herbes rechargent la jauge.')}</p>`;

    const $ = (sel) => panel.querySelector(sel);
    const cv = $('.race-canvas');
    const stage = $('.race-stage');
    const overlay = $('.race-overlay');
    const center = $('.race-center');
    let c, W, H;

    // ton image de chocobo (si elle existe)
    const sprite = new Image();
    let spriteOk = false;
    sprite.onload = () => { spriteOk = true; };
    // chargée seulement quand on ouvre la course (pas au chargement du site)
    const loadSprite = () => { if (!sprite.src) sprite.src = 'assets/chocobo/chocobo-run.webp'; };
    const FRAMES = 8;
    let stride = 0; // avance dans le cycle de course

    // un record par mode ; l'ancien record (course solo de 800 m) n'est plus comparable
    const bestKey = (m) => (m === 'expert' ? `${KEY}.expert` : `${KEY}.v2`);
    const bestOf = (m) => Number(store.get(bestKey(m))) || 0;
    const wins = () => { try { return JSON.parse(store.get(WINS_KEY) || '{}') || {}; } catch { return {}; } };
    let mode = 'normal';
    const fmt = (s) => (s ? `${s.toFixed(2)} s` : '—');
    const renderBest = () => {
        $('.race-best b').textContent = fmt(bestOf(mode));
        setHubRecord('chocobo', fmt(bestOf('expert') || bestOf('normal')));
    };

    /* --- état --- */
    let state = 'menu'; // menu | count | run | end
    let T = 0, dist = 0, speed = 0, time = 0, boost = 0, stun = 0, countT = 0, mud = 0;
    let y = 0, vy = 0, onGround = true, holding = false, jumpHold = 0;
    let stamina = 100, sprintKey = false, sprintBtn = false;
    let obstacles = [], herbs = [], dust = [], nextSpawn = 0, rivals = [];
    const ORD = (n) => (LANG === 'en' ? `${n}${['st', 'nd', 'rd'][n - 1] || 'th'}` : `${n}${n === 1 ? 'er' : 'e'}`);
    const place = () => 1 + rivals.filter(r => (r.time ? r.time <= time : r.m > dist)).length;

    const GROUND = () => H * 0.8;
    const PX_PER_M = () => W / 22; // 22 m visibles à l'écran
    const P_X = () => W * 0.22;

    const showMenu = () => {
        state = 'menu';
        stage.classList.remove('is-running');
        const expertOpen = !!wins().normal;
        overlay.hidden = false;
        overlay.innerHTML = `
            <p class="cook-k">${t('CHOCOBO RACE')}</p>
            <h3>${DIST} m</h3>
            <p class="cook-sub">${t('Trois rivaux sur la piste. Finis premier pour l\'or.')}</p>
            <div class="cook-actions race-modes">
                <button class="btn race-go" type="button" data-mode="normal">${t('▶ Normal')}</button>
                <button class="btn race-go" type="button" data-mode="expert" ${expertOpen ? '' : 'disabled'}>${expertOpen ? t('▶ Expert') : t('🔒 Expert')}</button>
            </div>
            <p class="cook-sub race-records">${t('Records')} : ${t('Normal')} ${fmt(bestOf('normal'))} · ${t('Expert')} ${fmt(bestOf('expert'))}</p>
            ${expertOpen ? '' : `<p class="cook-sub race-lock">${t('Gagne une course en Normal pour débloquer le mode Expert.')}</p>`}`;
        overlay.querySelectorAll('.race-go').forEach(b => b.addEventListener('click', () => countdown(b.dataset.mode)));
        center.textContent = '';
        $('.race-pos').textContent = '';
    };

    const countdown = (m = mode) => {
        mode = m === 'expert' && wins().normal ? 'expert' : 'normal';
        renderBest();
        overlay.hidden = true;
        dist = time = boost = stun = mud = 0;
        speed = 0;
        y = vy = 0;
        stamina = 100;
        onGround = true;
        obstacles = []; herbs = []; dust = [];
        rivals = RIVALS.map((r, i) => ({ ...r, i, m: -1.5 - i * 1.2, v: 0, time: 0, phase: Math.random() * 6, trip: 0 }));
        nextSpawn = 30;
        countT = 3;
        state = 'count';
        stage.classList.add('is-running');
    };

    const jump = () => {
        if (state !== 'run' || !onGround) return;
        vy = -H * 1.45;
        onGround = false;
        jumpHold = 0.18;
        sfx.hover();
    };

    const finish = () => {
        state = 'end';
        stage.classList.remove('is-running');
        const pos = place();
        const best = bestOf(mode);
        const record = !best || time < best;
        if (record) store.set(bestKey(mode), String(time));
        renderBest();
        achievements.unlock('chocobo');
        let unlockedExpert = false;
        if (pos === 1) {
            const w = wins();
            unlockedExpert = mode === 'normal' && !w.normal;
            w[mode] = true;
            store.set(WINS_KEY, JSON.stringify(w));
            if (mode === 'expert') achievements.unlock('chocoboLegend');
        }
        if (pos <= 3) sfx.fanfare(); else sfx.back();
        const medal = [t('🥇 OR'), t('🥈 ARGENT'), t('🥉 BRONZE')][pos - 1] || t('Pas de médaille');
        overlay.hidden = false;
        overlay.innerHTML = `
            <p class="cook-k">${t('ARRIVÉE !')} · ${mode === 'expert' ? t('Expert') : t('Normal')}</p>
            <h3>${ORD(pos)} / ${RIVALS.length + 1}</h3>
            <p class="cook-stars">${medal}</p>
            <p class="cook-sub">${time.toFixed(2)} s</p>
            ${record ? `<p class="fish-catch-record">${t('★ NOUVEAU RECORD ★')}</p>` : ''}
            ${unlockedExpert ? `<p class="fish-catch-record">${t('Mode Expert débloqué !')}</p>` : ''}
            <div class="cook-actions">
                <button class="btn" type="button" data-act="again">${t('↺ Rejouer')}</button>
                <button class="btn" type="button" data-act="menu">${t('◂ Menu')}</button>
            </div>`;
        overlay.querySelector('[data-act="again"]').addEventListener('click', () => countdown(mode));
        overlay.querySelector('[data-act="menu"]').addEventListener('click', showMenu);
    };

    /* --- contrôles --- */
    const press = () => { holding = true; jump(); };
    stage.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button')) return;
        if (state === 'run') { e.preventDefault(); press(); }
    });
    window.addEventListener('pointerup', () => { holding = false; });
    (window.gamePlaying ||= {}).chocobo = () => state === 'count' || state === 'run';
    const SPRINT_KEYS = ['ShiftLeft', 'ShiftRight', 'ArrowRight', 'KeyD'];
    window.addEventListener('keydown', (e) => {
        if (!gameOn('chocobo') || e.target.closest?.('input, textarea')) return;
        if (SPRINT_KEYS.includes(e.code)) { if (state === 'run' || state === 'count') { e.preventDefault(); sprintKey = true; } return; }
        if (e.code !== 'Space') return;
        e.preventDefault();
        if (e.repeat) return;
        if (state === 'run') press();
        else if (state === 'end') countdown(mode);
        else if (state === 'menu') countdown('normal');
    });
    window.addEventListener('keyup', (e) => {
        if (e.code === 'Space') holding = false;
        if (SPRINT_KEYS.includes(e.code)) sprintKey = false;
    });
    window.addEventListener('blur', () => { sprintKey = sprintBtn = holding = false; });
    // bouton SPRINT (écrans tactiles) : on le maintient avec un doigt, on saute avec l'autre
    const sprintEl = $('.race-sprint');
    sprintEl.addEventListener('pointerdown', (e) => { e.preventDefault(); sprintBtn = true; sprintEl.setPointerCapture?.(e.pointerId); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => sprintEl.addEventListener(ev, () => { sprintBtn = false; }));

    /* --- logique --- */
    const update = (dt) => {
        if (state === 'count') {
            countT -= dt;
            center.textContent = countT > 0 ? String(Math.ceil(countT)) : t('GO !');
            if (countT <= 0) { state = 'run'; setTimeout(() => { if (state === 'run') center.textContent = ''; }, 600); }
            return;
        }
        if (state !== 'run') return;
        time += dt;
        // sprint : vide la jauge ; elle se recharge doucement quand on relâche
        const sprinting = (sprintKey || sprintBtn) && stamina > 0 && stun <= 0;
        stamina = Math.max(0, Math.min(100, stamina + (sprinting ? -36 : 10) * dt));
        // vitesse : 13 m/s, plus en sprint ou avec une herbe, freinée par les chocs et la boue
        const target = stun > 0 ? 4 : mud > 0 ? 7 : (boost > 0 ? 18 : sprinting ? 16 : 13);
        speed += (target - speed) * Math.min(1, dt * (stun > 0 || mud > 0 ? 6 : 1.4));
        boost = Math.max(0, boost - dt);
        stun = Math.max(0, stun - dt);
        mud = Math.max(0, mud - dt);
        dist += speed * dt;
        // rivaux : allure qui ondule, petits faux pas, et ils ne se laissent pas trop distancer
        for (const r of rivals) {
            if (r.time) { r.m += r.v * dt; continue; }
            const gap = r.m - dist;
            let tv = r.speed[mode] + Math.sin(time * 0.7 + r.phase) * 0.7 + (gap < -30 ? 1.2 : gap > 60 ? -0.4 : 0);
            if (r.trip > 0) { r.trip -= dt; tv = 5; } else if (Math.random() < dt * (mode === 'expert' ? 0.012 : 0.025)) r.trip = 0.6;
            r.v += (tv - r.v) * Math.min(1, dt * 1.5);
            r.m += r.v * dt;
            if (r.m >= DIST) r.time = time - (r.m - DIST) / Math.max(1, r.v);
        }
        stride += speed * dt * 1.1; // ≈ 14 images/s à pleine vitesse
        // saut : maintenir = monter plus haut
        if (!onGround) {
            if (holding && jumpHold > 0) { vy -= H * 3.2 * dt; jumpHold -= dt; }
            vy += H * 5.2 * dt;
            y += vy * dt;
            if (y >= 0) { y = 0; vy = 0; onGround = true; for (let i = 0; i < 6; i++) dust.push({ x: P_X(), y: GROUND(), vx: rand(-60, 10), vy: rand(-50, -10), life: 0 }); }
        }
        // apparition des obstacles et des herbes (de plus en plus serrés ; l'Expert en met plus)
        if (dist + 22 > nextSpawn && nextSpawn < DIST - 15) {
            const r = Math.random();
            const late = dist / DIST;
            if (r < 0.66) {
                const k = Math.random();
                if (k < 0.3) obstacles.push({ m: nextSpawn, kind: 'rock', hit: false });
                else if (k < 0.52) obstacles.push({ m: nextSpawn, kind: 'log', hit: false });
                else if (k < 0.7) obstacles.push({ m: nextSpawn, kind: 'mud', hit: false });
                else if (k < 0.86 && late > 0.15) obstacles.push({ m: nextSpawn, kind: 'crow', hit: false });
                else if (late > 0.3 || mode === 'expert') {
                    // double tronc : un saut long (maintenu) passe les deux
                    obstacles.push({ m: nextSpawn, kind: 'log', hit: false }, { m: nextSpawn + 2.4, kind: 'log', hit: false });
                    nextSpawn += 2.4;
                } else obstacles.push({ m: nextSpawn, kind: 'rock', hit: false });
            } else herbs.push({ m: nextSpawn, got: false, alt: Math.random() < 0.5 ? 0 : 1 });
            nextSpawn += mode === 'expert' ? rand(9, 17) - Math.min(4, dist / 200) : rand(12, 22) - Math.min(5, dist / 160);
        }
        // collisions
        const px = dist; // position du joueur, en mètres
        for (const o of obstacles) {
            if (o.hit) continue;
            // la zone de choc suit la taille dessinée de l'obstacle
            const hw = (H * OBS[o.kind].w * 0.5) / PX_PER_M() + 0.25;
            const near = Math.abs(o.m - px) < hw;
            if (o.kind === 'mud') {
                // la boue colle aux pattes tant qu'on est dedans au sol
                if (near && onGround) { mud = 0.3; if (!o.hit) { o.hit = true; sfx.back(); } }
                continue;
            }
            if (o.kind === 'crow' ? (near && -y > H * 0.06) : (near && -y < H * OBS[o.kind].h * 0.8)) {
                o.hit = true;
                stun = 0.95;
                sfx.back();
                center.textContent = t('Aïe !');
                setTimeout(() => { if (state === 'run') center.textContent = ''; }, 500);
            }
        }
        for (const h of herbs) {
            if (h.got) continue;
            const hy = h.alt ? H * 0.16 : 0;
            if (Math.abs(h.m - px) < 0.8 && Math.abs(-y - hy) < H * 0.1) {
                h.got = true;
                boost = 2.2;
                stamina = Math.min(100, stamina + 35);
                sfx.select();
            }
        }
        obstacles = obstacles.filter(o => o.m > dist - 5);
        herbs = herbs.filter(h => h.m > dist - 5);
        if (Math.random() < dt * speed * 0.8 && onGround) dust.push({ x: P_X() - 10, y: GROUND(), vx: rand(-80, -30), vy: rand(-30, -5), life: 0 });
        $('.race-time').textContent = `${time.toFixed(2)} s`;
        $('.race-progress span').style.width = `${Math.min(100, (dist / DIST) * 100)}%`;
        $('.race-progress i').style.left = `${Math.min(100, (dist / DIST) * 100)}%`;
        panel.querySelectorAll('.race-progress b').forEach((b, i) => { b.style.left = `${Math.max(0, Math.min(100, (rivals[i].m / DIST) * 100))}%`; });
        $('.race-pos').textContent = `${ORD(place())} / ${RIVALS.length + 1}`;
        const st = $('.race-stamina');
        st.style.setProperty('--s', `${stamina}%`);
        st.classList.toggle('is-low', stamina < 25);
        st.classList.toggle('is-on', sprinting);
        if (dist >= DIST) finish();
    };

    // un rival : même chocobo, teinté, un peu en retrait (couloir du fond)
    const drawRival = (r, t2, ghost = false) => {
        const x = P_X() + (r.m - dist) * PX_PER_M();
        if (x < -80 || x > W + 80) return;
        const G = GROUND();
        // passé derrière le joueur : on le redessine en transparence par-dessus pour ne pas le perdre de vue
        if (ghost) {
            if (!spriteOk || Math.abs(x - P_X()) > H * 0.2) return;
            const fw = sprite.naturalWidth / FRAMES, fh = sprite.naturalHeight;
            const h = H * 0.24, w = h * (fw / fh);
            const frame = state === 'run' && r.v > 1 ? (((Math.floor(r.m * 1.1 + r.i * 3) % FRAMES) + FRAMES) % FRAMES) : 0;
            c.save();
            c.globalAlpha = 0.45;
            c.filter = r.filter;
            c.drawImage(sprite, frame * fw, 0, fw, fh, x - w * 0.5, G - h, w, h);
            c.restore();
            return;
        }
        c.fillStyle = 'rgba(40, 20, 5, 0.22)';
        c.beginPath(); c.ellipse(x, G + 3, H * 0.05, 4, 0, 0, TAU); c.fill();
        if (spriteOk) {
            const fw = sprite.naturalWidth / FRAMES, fh = sprite.naturalHeight;
            const h = H * 0.24, w = h * (fw / fh);
            const frame = state === 'run' && r.v > 1 ? (((Math.floor(r.m * 1.1 + r.i * 3) % FRAMES) + FRAMES) % FRAMES) : 0;
            c.save();
            c.filter = r.filter;
            c.drawImage(sprite, frame * fw, 0, fw, fh, x - w * 0.5, G - h, w, h);
            c.restore();
        } else {
            c.fillStyle = r.dot;
            c.beginPath(); c.moveTo(x, G - 60); c.lineTo(x + 15, G - 34); c.lineTo(x, G - 8); c.lineTo(x - 15, G - 34); c.closePath(); c.fill();
        }
        c.font = `600 ${Math.max(10, H * 0.032)}px "JetBrains Mono", monospace`;
        c.textAlign = 'center';
        c.fillStyle = 'rgba(20, 10, 20, 0.55)';
        c.fillText(r.name, x + 1, G - H * 0.255 + 1);
        c.fillStyle = r.dot;
        c.fillText(r.name, x, G - H * 0.255);
        c.textAlign = 'start';
    };

    const drawRunner = (x, yy, t2) => {
        const bob = onGround && state === 'run' ? Math.abs(Math.sin(t2 * speed * 1.1)) * 4 : 0;
        if (spriteOk) {
            const fw = sprite.naturalWidth / FRAMES, fh = sprite.naturalHeight;
            const h = H * 0.24;
            const w = h * (fw / fh);
            // en l'air : la pose "grande foulée" ; au départ : immobile
            const frame = !onGround ? 3 : state === 'run' ? Math.floor(stride) % FRAMES : 0;
            c.save();
            if (stun > 0 && Math.floor(t2 * 20) % 2) c.globalAlpha = 0.4;
            c.drawImage(sprite, frame * fw, 0, fw, fh, x - w * 0.5, yy - h + h * 0.02, w, h);
            c.restore();
            return;
        }
        // coureur de cristal (en attendant ton image)
        const cr = cssVar('--t-crystal-rgb', '143, 184, 255');
        c.save();
        c.translate(x, yy - 34 - bob);
        if (stun > 0 && Math.floor(t2 * 20) % 2) c.globalAlpha = 0.4;
        c.shadowColor = `rgb(${cr})`;
        c.shadowBlur = 18;
        c.fillStyle = `rgba(${cr}, 0.9)`;
        c.beginPath(); c.moveTo(0, -26); c.lineTo(18, 0); c.lineTo(0, 30); c.lineTo(-18, 0); c.closePath(); c.fill();
        c.fillStyle = '#fff';
        c.beginPath(); c.moveTo(0, -18); c.lineTo(8, 0); c.lineTo(0, 16); c.lineTo(-8, 0); c.closePath(); c.fill();
        c.restore();
        // traînée lumineuse
        for (let i = 1; i < 6; i++) {
            c.fillStyle = `rgba(${cr}, ${0.15 - i * 0.025})`;
            c.beginPath(); c.arc(x - i * 10, yy - 34 - bob, 14 - i * 2, 0, 6.283); c.fill();
        }
    };

    /* --- décor : couches en parallaxe, dessinées une fois par taille d'écran --- */
    let deco = null;
    const TAU = Math.PI * 2;
    // bande qui se répète sans couture : on ne fait varier le relief qu'avec des sinus "entiers" sur la largeur
    const band = (w, h, draw) => {
        const cvs = document.createElement('canvas');
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        cvs.width = Math.ceil(w * dpr); cvs.height = Math.ceil(h * dpr);
        const g = cvs.getContext('2d');
        g.scale(dpr, dpr);
        draw(g, w, h);
        return cvs;
    };
    const ridge = (g, w, base, amp, waves, color, rough = 0.35, seed = 0) => {
        g.fillStyle = color;
        g.beginPath(); g.moveTo(0, base + amp * 3);
        for (let x = 0; x <= w; x += 4) {
            const k = (x / w) * TAU;
            const yy = base - amp * (0.55 + 0.45 * Math.sin(k * waves[0] + seed)) - amp * rough * Math.sin(k * waves[1] + seed * 2) - amp * rough * 0.5 * Math.sin(k * waves[2] + seed * 3);
            g.lineTo(x, yy);
        }
        g.lineTo(w, base + amp * 3); g.closePath(); g.fill();
    };
    const buildDeco = () => {
        const G = GROUND();
        const TW = Math.max(W, 600) * 2; // largeur d'une bande répétée
        deco = { TW };
        // ciel + soleil (fixe)
        deco.sky = band(W, G, (g, w, h) => {
            const sky = g.createLinearGradient(0, 0, 0, h);
            sky.addColorStop(0, '#1b2b55');
            sky.addColorStop(0.35, '#5a4b7c');
            sky.addColorStop(0.68, '#d9866a');
            sky.addColorStop(0.9, '#f6c27f');
            sky.addColorStop(1, '#fbe0a6');
            g.fillStyle = sky; g.fillRect(0, 0, w, h);
            // quelques étoiles qui s'effacent vers l'horizon
            for (let i = 0; i < 60; i++) {
                const sx = (i * 137.5) % w, sy = ((i * 71.3) % (h * 0.35));
                g.fillStyle = `rgba(255, 255, 255, ${0.5 - sy / (h * 0.7)})`;
                g.fillRect(sx, sy, 1.4, 1.4);
            }
            const sx = w * 0.74, sy = h * 0.62, sr = h * 0.11;
            const halo = g.createRadialGradient(sx, sy, sr * 0.6, sx, sy, sr * 6);
            halo.addColorStop(0, 'rgba(255, 228, 160, 0.75)');
            halo.addColorStop(0.3, 'rgba(255, 190, 120, 0.25)');
            halo.addColorStop(1, 'rgba(255, 170, 110, 0)');
            g.fillStyle = halo; g.fillRect(0, 0, w, h);
            const disc = g.createRadialGradient(sx, sy - sr * 0.3, 0, sx, sy, sr);
            disc.addColorStop(0, '#fffbe8'); disc.addColorStop(1, '#ffd48a');
            g.fillStyle = disc; g.beginPath(); g.arc(sx, sy, sr, 0, TAU); g.fill();
        });
        // nuages
        deco.clouds = band(TW, G * 0.6, (g, w, h) => {
            for (let i = 0; i < 9; i++) {
                const cx = (i + 0.3) * (w / 9) + Math.sin(i * 7) * 40, cy = h * (0.25 + 0.5 * ((i * 0.37) % 1)), s = 26 + (i * 13) % 30;
                const col = i % 2 ? 'rgba(255, 214, 190, 0.5)' : 'rgba(250, 200, 200, 0.38)';
                g.fillStyle = col;
                [[-1.6, 0.25, 0.9], [-0.6, -0.1, 1.2], [0.6, 0, 1.05], [1.6, 0.3, 0.8]].forEach(([dx, dy, k]) => {
                    g.beginPath(); g.ellipse(cx + dx * s, cy + dy * s, s * k, s * k * 0.55, 0, 0, TAU); g.fill();
                });
                g.fillStyle = 'rgba(120, 90, 140, 0.12)';
                g.beginPath(); g.ellipse(cx, cy + s * 0.45, s * 2.4, s * 0.25, 0, 0, TAU); g.fill();
            }
        });
        // montagnes lointaines, avec neige et brume
        deco.far = band(TW, G, (g, w, h) => {
            ridge(g, w, h * 0.5, h * 0.22, [3, 11, 23], '#7d6f9c', 0.4, 1);
            g.save(); g.globalCompositeOperation = 'source-atop';
            g.fillStyle = 'rgba(255, 255, 255, 0.55)'; g.fillRect(0, 0, w, h * 0.36);
            g.restore();
            ridge(g, w, h * 0.62, h * 0.16, [4, 9, 31], '#8f7aa0', 0.45, 4);
            const haze = g.createLinearGradient(0, h * 0.4, 0, h);
            haze.addColorStop(0, 'rgba(246, 194, 127, 0)'); haze.addColorStop(1, 'rgba(246, 194, 127, 0.55)');
            g.fillStyle = haze; g.fillRect(0, 0, w, h);
        });
        // falaises à sommet plat (mesas)
        deco.mesa = band(TW, G, (g, w, h) => {
            const n = 5;
            for (let i = 0; i < n; i++) {
                const cx = (i + 0.5) * (w / n) + Math.sin(i * 3.1) * 60;
                const top = h * (0.5 + 0.08 * Math.sin(i * 2.3)), mw = 70 + (i * 37) % 80;
                const grad = g.createLinearGradient(cx - mw, 0, cx + mw, 0);
                grad.addColorStop(0, '#8e5a55'); grad.addColorStop(0.55, '#b9765e'); grad.addColorStop(1, '#7a4a4c');
                g.fillStyle = grad;
                g.beginPath();
                g.moveTo(cx - mw * 1.6, h); g.lineTo(cx - mw, top + 14); g.lineTo(cx - mw * 0.9, top); g.lineTo(cx + mw * 0.85, top + 2);
                g.lineTo(cx + mw, top + 18); g.lineTo(cx + mw * 1.7, h); g.closePath(); g.fill();
                g.save(); g.clip(); // strates de roche, seulement dans la falaise
                g.strokeStyle = 'rgba(60, 30, 40, 0.25)'; g.lineWidth = 1;
                for (let k = 1; k < 5; k++) { g.beginPath(); g.moveTo(cx - mw * 2, top + k * 12); g.lineTo(cx + mw * 2, top + k * 12 + 3); g.stroke(); }
                g.restore();
            }
            const haze = g.createLinearGradient(0, h * 0.5, 0, h);
            haze.addColorStop(0, 'rgba(246, 194, 127, 0.05)'); haze.addColorStop(1, 'rgba(246, 194, 127, 0.4)');
            g.fillStyle = haze; g.fillRect(0, 0, w, h);
        });
        // collines boisées
        deco.hills = band(TW, G, (g, w, h) => {
            ridge(g, w, h * 0.8, h * 0.1, [5, 13, 29], '#5f7a3c', 0.3, 2);
            for (let i = 0; i < 70; i++) {
                const x = (i / 70) * w + Math.sin(i * 5.7) * 10;
                const k = (x / w) * TAU;
                const gy = h * 0.8 - h * 0.1 * (0.55 + 0.45 * Math.sin(k * 5 + 2)) - h * 0.03 * Math.sin(k * 13 + 4) + 6;
                const s = 8 + (i * 7) % 9;
                if (i % 3 === 0) { // sapin
                    g.fillStyle = '#34502a';
                    g.beginPath(); g.moveTo(x, gy - s * 2.6); g.lineTo(x + s * 0.8, gy); g.lineTo(x - s * 0.8, gy); g.closePath(); g.fill();
                } else { // arbre rond
                    g.fillStyle = '#3f5e2e';
                    g.beginPath(); g.arc(x, gy - s, s, 0, TAU); g.fill();
                    g.fillStyle = 'rgba(190, 220, 120, 0.25)';
                    g.beginPath(); g.arc(x + s * 0.3, gy - s * 1.3, s * 0.5, 0, TAU); g.fill();
                }
            }
            ridge(g, w, h * 0.92, h * 0.06, [6, 17, 37], '#6f8d43', 0.3, 5);
        });
        // prairie + barrière (juste derrière la piste)
        deco.meadow = band(TW, 46, (g, w, h) => {
            const grad = g.createLinearGradient(0, 0, 0, h);
            grad.addColorStop(0, '#86a94c'); grad.addColorStop(1, '#6a8a3a');
            g.fillStyle = grad; g.fillRect(0, 14, w, h - 14);
            for (let x = 0; x < w; x += 3) {
                const hh = 6 + ((x * 13) % 9);
                g.strokeStyle = x % 2 ? '#93b955' : '#5f7f35';
                g.beginPath(); g.moveTo(x, 16); g.lineTo(x + ((x % 5) - 2), 16 - hh); g.stroke();
            }
            for (let i = 0; i < 40; i++) { // fleurs
                g.fillStyle = ['#ffd6e8', '#fff3a8', '#cfe3ff'][i % 3];
                g.beginPath(); g.arc((i / 40) * w + 5, 22 + (i * 7) % 18, 1.8, 0, TAU); g.fill();
            }
            // barrière
            for (let x = 10; x < w; x += 90) {
                g.fillStyle = '#5a3a20'; g.fillRect(x, 4, 6, 34);
                g.fillStyle = '#8b6038'; g.fillRect(x, 4, 2, 34);
                g.fillStyle = 'rgba(0, 0, 0, 0.18)'; g.fillRect(x + 6, 10, 3, 28);
            }
            g.fillStyle = '#6e4a2a'; g.fillRect(0, 12, w, 4); g.fillRect(0, 25, w, 4);
            g.fillStyle = '#9a6d43'; g.fillRect(0, 12, w, 1.5); g.fillRect(0, 25, w, 1.5);
        });
        // piste de terre
        deco.track = band(TW, H - G, (g, w, h) => {
            const grad = g.createLinearGradient(0, 0, 0, h);
            grad.addColorStop(0, '#d6a868'); grad.addColorStop(0.5, '#c99556'); grad.addColorStop(1, '#a7763f');
            g.fillStyle = grad; g.fillRect(0, 0, w, h);
            g.fillStyle = 'rgba(80, 50, 20, 0.18)';
            g.fillRect(0, h * 0.28, w, 3); g.fillRect(0, h * 0.62, w, 4); // ornières
            for (let i = 0; i < 160; i++) { // cailloux
                const x = (i * 97.3) % w, yy = 4 + ((i * 53.1) % (h - 8));
                g.fillStyle = i % 3 ? 'rgba(120, 85, 45, 0.5)' : 'rgba(250, 225, 180, 0.45)';
                g.beginPath(); g.ellipse(x, yy, 1.5 + (i % 3), 1 + (i % 2), 0, 0, TAU); g.fill();
            }
            g.fillStyle = 'rgba(90, 120, 50, 0.9)'; // bordure d'herbe
            for (let x = 0; x < w; x += 4) g.fillRect(x, 0, 3, 2 + ((x * 7) % 4));
        });
    };

    // une bande qui défile : copiée deux fois pour boucler
    const scrollBand = (img, y, factor) => {
        if (!img) return;
        const w = deco.TW, h = img.height / (img.width / w);
        const off = ((dist * PX_PER_M() * factor) % w + w) % w;
        c.drawImage(img, -off, y, w, h);
        if (w - off < W) c.drawImage(img, w - off - 1, y, w, h); // 1 px de recouvrement : pas de ligne de raccord
    };

    // obstacles bien lisibles : contour sombre, ombre portée, reflet clair
    const OBS = { rock: { h: 0.1, w: 0.13 }, log: { h: 0.075, w: 0.2 }, mud: { h: 0, w: 0.34 }, crow: { h: 0, w: 0.12 } };
    const drawObstacle = (o, x) => {
        const G = GROUND();
        if (o.kind === 'mud') {
            const ow = H * OBS.mud.w;
            c.fillStyle = '#5a3a1e';
            c.beginPath(); c.ellipse(x, G + 6, ow * 0.55, 9, 0, 0, TAU); c.fill();
            c.fillStyle = 'rgba(140, 100, 60, 0.6)';
            c.beginPath(); c.ellipse(x - ow * 0.12, G + 4, ow * 0.3, 3.5, 0, 0, TAU); c.fill();
            c.fillStyle = 'rgba(255, 240, 210, 0.35)';
            c.beginPath(); c.ellipse(x + ow * 0.18, G + 5, ow * 0.12, 1.6, 0, 0, TAU); c.fill();
            return;
        }
        if (o.kind === 'crow') {
            // corbeau qui plane à hauteur de saut : on passe dessous en restant au sol
            const cy = G - H * 0.3 + Math.sin(T * 5 + o.m) * H * 0.012;
            const flap = Math.sin(T * 16 + o.m) * H * 0.03;
            const s = H * 0.05;
            c.fillStyle = o.hit ? '#555' : '#1b1622';
            c.beginPath();
            c.moveTo(x - s * 1.6, cy - flap); c.quadraticCurveTo(x - s * 0.6, cy - s * 0.5, x, cy);
            c.quadraticCurveTo(x + s * 0.6, cy - s * 0.5, x + s * 1.6, cy - flap);
            c.quadraticCurveTo(x + s * 0.6, cy + s * 0.15, x, cy + s * 0.35);
            c.quadraticCurveTo(x - s * 0.6, cy + s * 0.15, x - s * 1.6, cy - flap);
            c.fill();
            c.beginPath(); c.ellipse(x - s * 0.15, cy + s * 0.05, s * 0.55, s * 0.3, 0, 0, TAU); c.fill();
            c.fillStyle = '#f2b13b';
            c.beginPath(); c.moveTo(x - s * 0.7, cy); c.lineTo(x - s * 1.05, cy + s * 0.08); c.lineTo(x - s * 0.7, cy + s * 0.16); c.fill();
            c.fillStyle = '#ff5a4a';
            c.beginPath(); c.arc(x - s * 0.45, cy - s * 0.02, s * 0.07, 0, TAU); c.fill();
            return;
        }
        const oh = H * OBS[o.kind].h, ow = H * OBS[o.kind].w;
        c.fillStyle = 'rgba(40, 20, 5, 0.35)';
        c.beginPath(); c.ellipse(x + 4, G + 3, ow * 0.62, 5, 0, 0, TAU); c.fill();
        c.lineJoin = 'round';
        c.lineWidth = 2.5;
        c.strokeStyle = '#1e140c';
        if (o.kind === 'rock') {
            const grad = c.createLinearGradient(x - ow / 2, G - oh, x + ow / 2, G);
            grad.addColorStop(0, o.hit ? '#6b6b70' : '#b5b8c4');
            grad.addColorStop(1, o.hit ? '#3d3d42' : '#5b5e6b');
            c.fillStyle = grad;
            c.beginPath();
            c.moveTo(x - ow / 2, G); c.lineTo(x - ow * 0.38, G - oh * 0.55); c.lineTo(x - ow * 0.12, G - oh);
            c.lineTo(x + ow * 0.22, G - oh * 0.88); c.lineTo(x + ow / 2, G - oh * 0.35); c.lineTo(x + ow / 2, G); c.closePath();
            c.fill(); c.stroke();
            c.fillStyle = 'rgba(255, 255, 255, 0.35)'; // facette éclairée
            c.beginPath(); c.moveTo(x - ow * 0.12, G - oh + 3); c.lineTo(x + ow * 0.18, G - oh * 0.85); c.lineTo(x - ow * 0.02, G - oh * 0.5); c.lineTo(x - ow * 0.3, G - oh * 0.55); c.closePath(); c.fill();
            c.strokeStyle = 'rgba(30, 20, 15, 0.5)'; c.lineWidth = 1.2; // fissure
            c.beginPath(); c.moveTo(x + ow * 0.1, G - oh * 0.6); c.lineTo(x + ow * 0.2, G - oh * 0.3); c.lineTo(x + ow * 0.12, G); c.stroke();
        } else {
            const r = oh / 2, cy = G - r;
            c.fillStyle = o.hit ? '#3e2a17' : '#6e4524';
            c.beginPath(); c.roundRect(x - ow / 2, cy - r, ow, oh, r); c.fill(); c.stroke();
            c.strokeStyle = 'rgba(30, 15, 5, 0.6)'; c.lineWidth = 1.5; // écorce
            for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(x - ow * 0.4, cy + k * r * 0.35); c.lineTo(x + ow * 0.3, cy + k * r * 0.35 + 1); c.stroke(); }
            c.fillStyle = 'rgba(255, 220, 170, 0.25)'; c.fillRect(x - ow * 0.45, cy - r + 2, ow * 0.8, 2.5);
            c.fillStyle = '#e8c08a'; c.strokeStyle = '#1e140c'; c.lineWidth = 2.5; // bout coupé avec cernes
            c.beginPath(); c.ellipse(x + ow / 2 - r * 0.3, cy, r * 0.62, r, 0, 0, TAU); c.fill(); c.stroke();
            c.strokeStyle = 'rgba(140, 90, 40, 0.7)'; c.lineWidth = 1;
            [0.65, 0.35].forEach(k => { c.beginPath(); c.ellipse(x + ow / 2 - r * 0.3, cy, r * 0.62 * k, r * k, 0, 0, TAU); c.stroke(); });
        }
        c.lineWidth = 1;
    };

    const draw = (dt, t2) => {
        if (!deco) buildDeco();
        const G = GROUND();
        c.drawImage(deco.sky, 0, 0, W, G);
        // rayons de soleil qui tournent doucement
        c.save();
        c.globalCompositeOperation = 'lighter';
        c.translate(W * 0.74, G * 0.62);
        c.rotate(t2 * 0.03);
        c.fillStyle = 'rgba(255, 210, 150, 0.05)';
        for (let i = 0; i < 10; i++) { c.rotate(TAU / 10); c.beginPath(); c.moveTo(0, 0); c.lineTo(W, -40); c.lineTo(W, 40); c.closePath(); c.fill(); }
        c.restore();
        // les nuages avancent un peu tout seuls
        const cloudOff = ((t2 * 8 + dist * PX_PER_M() * 0.02) % deco.TW + deco.TW) % deco.TW;
        c.drawImage(deco.clouds, -cloudOff, 0, deco.TW, G * 0.6);
        c.drawImage(deco.clouds, deco.TW - cloudOff - 1, 0, deco.TW, G * 0.6);
        scrollBand(deco.far, 0, 0.04);
        scrollBand(deco.mesa, 0, 0.1);
        scrollBand(deco.hills, 0, 0.25);
        scrollBand(deco.meadow, G - 40, 0.6);
        scrollBand(deco.track, G, 1);
        // ligne d'arrivée : arche à damier
        const fxp = P_X() + (DIST - dist) * PX_PER_M();
        if (fxp < W + 60) {
            c.fillStyle = '#3b2a1a'; c.fillRect(fxp - 4, G - 110, 6, 110); c.fillRect(fxp + 40, G - 110, 6, 110);
            for (let k = 0; k < 6; k++) for (let j = 0; j < 2; j++) {
                c.fillStyle = (k + j) % 2 ? '#fff' : '#111';
                c.fillRect(fxp + 2 + k * 6.3, G - 110 + j * 7, 6.3, 7);
            }
            for (let k = 0; k < 14; k++) { c.fillStyle = k % 2 ? '#fff' : '#111'; c.fillRect(fxp + 21, G - k * 8 - 8, 8, 8); }
        }
        for (const r of rivals) drawRival(r, t2);
        for (const o of obstacles) {
            const x = P_X() + (o.m - dist) * PX_PER_M();
            if (x < -60 || x > W + 60) continue;
            drawObstacle(o, x);
        }
        for (const h of herbs) {
            if (h.got) continue;
            const x = P_X() + (h.m - dist) * PX_PER_M();
            const hy = G - 20 - (h.alt ? H * 0.16 : 0) + Math.sin(t2 * 4 + h.m) * 3;
            c.fillStyle = '#5fd35f';
            c.shadowColor = '#9cff8a'; c.shadowBlur = 14;
            for (let k = -1; k <= 1; k++) { c.beginPath(); c.ellipse(x + k * 6, hy, 4, 10, k * 0.4, 0, TAU); c.fill(); }
            c.shadowBlur = 0;
        }
        c.fillStyle = 'rgba(230, 200, 150, 0.8)';
        for (let i = dust.length - 1; i >= 0; i--) {
            const d = dust[i];
            d.life += dt;
            if (d.life > 0.5) { dust.splice(i, 1); continue; }
            d.x += d.vx * dt; d.y += d.vy * dt;
            c.globalAlpha = 1 - d.life / 0.5;
            c.beginPath(); c.arc(d.x, d.y, 3, 0, TAU); c.fill();
        }
        c.globalAlpha = 1;
        // ombre du chocobo (rétrécit quand il saute)
        const sh = Math.max(0.35, 1 + y / (H * 0.3));
        c.fillStyle = `rgba(40, 20, 5, ${0.3 * sh})`;
        c.beginPath(); c.ellipse(P_X(), G + 3, H * 0.06 * sh, 5 * sh, 0, 0, TAU); c.fill();
        if (boost > 0) {
            c.strokeStyle = 'rgba(255, 255, 255, 0.55)';
            for (let i = 0; i < 7; i++) {
                const yy = G - 20 - i * 14 + y;
                c.beginPath(); c.moveTo(P_X() - 40 - rand(0, 40), yy); c.lineTo(P_X() - 100 - rand(0, 70), yy); c.stroke();
            }
        }
        drawRunner(P_X(), G + y, t2);
        for (const r of rivals) drawRival(r, t2, true);
        // brins d'herbe au premier plan + lumière chaude
        const fOff = ((dist * PX_PER_M() * 1.4) % 40 + 40) % 40;
        c.fillStyle = 'rgba(60, 80, 30, 0.85)';
        for (let x = -fOff; x < W + 40; x += 40) {
            c.beginPath(); c.moveTo(x, H); c.lineTo(x + 6, H - 14); c.lineTo(x + 9, H); c.moveTo(x + 14, H); c.lineTo(x + 20, H - 9); c.lineTo(x + 22, H); c.fill();
        }
        const vig = c.createRadialGradient(W * 0.55, H * 0.45, Math.min(W, H) * 0.3, W * 0.5, H * 0.5, Math.max(W, H) * 0.75);
        vig.addColorStop(0, 'rgba(0, 0, 0, 0)'); vig.addColorStop(1, 'rgba(20, 8, 20, 0.35)');
        c.fillStyle = vig; c.fillRect(0, 0, W, H);
    };

    let raf = 0, last = 0;
    const loop = (ms) => {
        const dt = Math.min((ms - last) / 1000, 0.05);
        last = ms;
        T = ms / 1000;
        update(dt);
        // panneau pas encore mis en page (transition d'onglet) : on remesure et on saute l'image
        if (W < 2 || H < 2) { ({ c, W, H } = fitCanvas(cv)); deco = null; }
        if (W >= 2 && H >= 2) draw(dt, T);
        raf = gameOn('chocobo') ? requestAnimationFrame(loop) : 0;
    };
    const run = () => {
        if (raf) return;
        ({ c, W, H } = fitCanvas(cv));
        last = performance.now();
        raf = requestAnimationFrame(loop);
    };
    document.addEventListener('gameopen', (e) => { if (e.detail === 'chocobo') { loadSprite(); deco = null; run(); if (state === 'run' || state === 'count') showMenu(); } });
    document.addEventListener('gameresume', (e) => { if (e.detail === 'chocobo') run(); });
    window.addEventListener('resize', () => { deco = null; if (raf) ({ c, W, H } = fitCanvas(cv)); });

    renderBest();
    showMenu();
    return { reset() { [KEY, `${KEY}.v2`, `${KEY}.expert`, WINS_KEY].forEach(k => store.del(k)); mode = 'normal'; renderBest(); showMenu(); } };
})();

/* =====================================================================
   3. COMBAT — ATB contre le Golem de cristal (monstre original)
   ===================================================================== */
const battle = (() => {
    const panel = document.getElementById('game-battle');
    if (!panel) return { reset() { } };
    const KEY = 'eliasPortfolio.battle';

    panel.innerHTML = `
        <div class="game-bar">
            <button class="game-back" type="button">${t('◂ Mini-jeux')}</button>
            <p class="game-title">⚔️ ${t('Combat')}</p>
        </div>
        <div class="bt-stage">
            <canvas class="bt-canvas" aria-label="${t('Champ de bataille')}"></canvas>
            <div class="bt-enemy">
                <p class="bt-name">${t('Golem de cristal')}</p>
                <div class="bt-bar bt-hp"><span></span></div>
                <p class="bt-tag"></p>
            </div>
            <p class="bt-log" aria-live="polite"></p>
            <div class="bt-overlay"></div>
        </div>
        <div class="bt-ui">
            <ul class="bt-menu" role="menu"></ul>
            <div class="bt-party">
                <div class="bt-hero"><span class="player-gem"></span><b class="bt-hero-name"></b><span class="bt-guard" hidden>🛡 ${t('EN GARDE')}</span></div>
                <div class="bt-stat"><span>HP</span><div class="bt-bar bt-php"><span></span></div><b class="bt-php-n"></b></div>
                <div class="bt-stat"><span>MP</span><div class="bt-bar bt-pmp"><span></span></div><b class="bt-pmp-n"></b></div>
                <div class="bt-stat"><span>ATB</span><div class="bt-bar bt-atb"><span></span></div><b class="bt-atb-n"></b></div>
                <p class="bt-inv"></p>
            </div>
        </div>`;

    const $ = (sel) => panel.querySelector(sel);
    const cv = $('.bt-canvas');
    const overlay = $('.bt-overlay');
    const menu = $('.bt-menu');
    const logEl = $('.bt-log');
    let c, W, H;

    const ELEMENTS = [
        { id: 'fire', name: t('Feu'), icon: '🔥', color: '#ff7a3a' },
        { id: 'ice', name: t('Glace'), icon: '❄️', color: '#9fe6ff' },
        { id: 'thunder', name: t('Foudre'), icon: '⚡', color: '#ffe36b' },
    ];

    const load = () => { try { return JSON.parse(store.get(KEY)) || { wins: 0, bestTurns: 0 }; } catch { return { wins: 0, bestTurns: 0 }; } };
    let rec = load();
    const renderRecord = () => setHubRecord('battle', rec.wins ? `${rec.bestTurns} ${t('tours')}` : '—');

    /* --- état du combat --- */
    let s = null;
    const fresh = () => ({
        php: 320, pmax: 320, pmp: 60, mpmax: 60, atb: 0, guard: false,
        ehp: 1500, emax: 1500, eatb: 0, charging: false, enraged: false,
        weak: ELEMENTS[Math.floor(Math.random() * 3)].id, known: {},
        potions: 3, ethers: 2, turns: 0, busy: false, over: false, sub: null,
    });

    const say = (txt) => { logEl.textContent = txt; logEl.classList.remove('pop'); void logEl.offsetWidth; logEl.classList.add('pop'); };

    /* effets visuels */
    const fx = [];      // particules
    const nums = [];    // dégâts flottants
    let shake = 0, flash = 0, lunge = 0, shatterSnap = null;
    const enemyPos = () => ({ x: W * 0.5, y: H * 0.52 });
    const heroPos = () => ({ x: W * 0.88, y: H * 0.8 });

    const popNum = (txt, x, y, color) => nums.push({ txt, x, y, t: 0, color });
    const burst = (el, x, y) => {
        const col = ELEMENTS.find(e => e.id === el)?.color || '#fff';
        for (let i = 0; i < 40; i++) fx.push({ x, y, vx: rand(-220, 220), vy: rand(-260, 120), life: 0, max: rand(0.4, 0.9), col, kind: el });
    };

    /* --- menu --- */
    const MAIN = [
        { id: 'attack', label: t('Attaque') },
        { id: 'magic', label: t('Magie ▸') },
        { id: 'item', label: t('Objet ▸') },
        { id: 'guard', label: t('Défense') },
        { id: 'flee', label: t('Fuir') },
    ];
    const renderMenu = () => {
        menu.innerHTML = '';
        const ready = s && s.atb >= 1 && !s.busy && !s.over;
        let items = MAIN;
        let title = t('COMMANDES');
        if (s && s.sub === 'magic') {
            title = t('MAGIE');
            items = [...ELEMENTS.map(e => ({ id: `m-${e.id}`, label: `${e.icon} ${e.name}`, cost: 8 })), { id: 'm-cure', label: `✚ ${t('Soin')}`, cost: 12 }, { id: 'back', label: t('◂ Retour') }];
        } else if (s && s.sub === 'item') {
            title = t('OBJETS');
            items = [{ id: 'i-potion', label: `${t('Potion')} ×${s.potions}`, n: s.potions }, { id: 'i-ether', label: `${t('Éther')} ×${s.ethers}`, n: s.ethers }, { id: 'back', label: t('◂ Retour') }];
        }
        const head = document.createElement('li');
        head.className = 'bt-menu-k';
        head.innerHTML = '<span></span><em></em>';
        head.querySelector('span').textContent = title;
        head.querySelector('em').textContent = !s ? '' : s.over ? '' : ready ? t('À toi !') : t('ATB en charge…');
        head.classList.toggle('is-ready', !!ready);
        menu.appendChild(head);
        items.forEach(it => {
            const li = document.createElement('li');
            const b = document.createElement('button');
            b.type = 'button';
            const lb = document.createElement('span');
            lb.textContent = it.label;
            b.appendChild(lb);
            if (it.cost) { const m = document.createElement('small'); m.textContent = `${it.cost} MP`; b.appendChild(m); }
            b.disabled = !ready || (it.cost && s.pmp < it.cost) || (it.n === 0);
            b.addEventListener('click', () => act(it.id));
            li.appendChild(b);
            menu.appendChild(li);
        });
        const first = menu.querySelector('button:not(:disabled)');
        if (ready && first && document.activeElement?.closest('.bt-menu') == null && gameOn('battle')) first.focus({ preventScroll: true });
    };

    const renderBars = () => {
        $('.bt-hp span').style.width = `${(s.ehp / s.emax) * 100}%`;
        $('.bt-php span').style.width = `${(s.php / s.pmax) * 100}%`;
        $('.bt-pmp span').style.width = `${(s.pmp / s.mpmax) * 100}%`;
        $('.bt-atb span').style.width = `${Math.min(1, s.atb) * 100}%`;
        $('.bt-php-n').textContent = `${Math.max(0, Math.round(s.php))}/${s.pmax}`;
        $('.bt-pmp-n').textContent = `${s.pmp}/${s.mpmax}`;
        $('.bt-atb-n').textContent = s.atb >= 1 ? t('PRÊT') : `${Math.floor(s.atb * 100)}%`;
        $('.bt-guard').hidden = !s.guard;
        $('.bt-inv').textContent = `🧪 ${t('Potion')} ×${s.potions}   💧 ${t('Éther')} ×${s.ethers}`;
        $('.bt-atb').classList.toggle('is-full', s.atb >= 1);
        $('.bt-php').classList.toggle('is-low', s.php < s.pmax * 0.3);
        const known = Object.entries(s.known).map(([k, v]) => `${ELEMENTS.find(e => e.id === k).icon} ${v}`).join('  ');
        $('.bt-tag').textContent = `${s.enraged ? t('ENRAGÉ') + ' · ' : ''}${known}`;
    };

    /* --- actions du joueur --- */
    const act = (id) => {
        if (!s || s.busy || s.over) return;
        if (id === 'magic' || id === 'item') { s.sub = id; renderMenu(); return; }
        if (id === 'back') { s.sub = null; renderMenu(); return; }
        s.sub = null;
        s.busy = true;
        s.atb = 0;
        s.turns++;
        const ep = enemyPos();
        if (id === 'attack') {
            lunge = 1;
            setTimeout(() => {
                const crit = Math.random() < 0.12;
                const dmg = Math.round(rand(55, 80) * (crit ? 2 : 1));
                hurtEnemy(dmg, crit ? t('CRITIQUE !') : null, '#fff');
                say(crit ? t('Coup critique !') : t('Attaque !'));
                done();
            }, 260);
        } else if (id.startsWith('m-')) {
            const el = id.slice(2);
            if (el === 'cure') {
                s.pmp -= 12;
                const heal = Math.round(rand(110, 140));
                s.php = Math.min(s.pmax, s.php + heal);
                const hp = heroPos();
                for (let i = 0; i < 30; i++) fx.push({ x: hp.x + rand(-30, 30), y: hp.y, vx: rand(-20, 20), vy: rand(-140, -60), life: 0, max: rand(0.6, 1), col: '#9cff8a', kind: 'cure' });
                popNum(`+${heal}`, hp.x, hp.y - 40, '#9cff8a');
                say(t('Soin !'));
                sfx.fanfare();
                done(500);
                return;
            }
            s.pmp -= 8;
            const e = ELEMENTS.find(x => x.id === el);
            burst(el, ep.x, ep.y);
            if (el === 'thunder') flash = 1;
            let mult = 1, tag = null;
            if (el === s.weak) { mult = 1.6; tag = t('FAIBLESSE !'); s.known[el] = t('faible'); }
            else if (ELEMENTS.findIndex(x => x.id === el) === (ELEMENTS.findIndex(x => x.id === s.weak) + 1) % 3) { mult = 0.5; tag = t('RÉSISTE'); s.known[el] = t('résiste'); }
            else s.known[el] = t('normal');
            setTimeout(() => {
                hurtEnemy(Math.round(rand(95, 125) * mult), tag, e.color);
                say(`${e.name} !`);
                done();
            }, 350);
        } else if (id === 'i-potion') {
            s.potions--;
            s.php = Math.min(s.pmax, s.php + 120);
            popNum('+120', heroPos().x, heroPos().y - 40, '#9cff8a');
            say(t('Potion : +120 HP'));
            done(400);
        } else if (id === 'i-ether') {
            s.ethers--;
            s.pmp = Math.min(s.mpmax, s.pmp + 30);
            popNum('+30 MP', heroPos().x, heroPos().y - 40, '#8fb8ff');
            say(t('Éther : +30 MP'));
            done(400);
        } else if (id === 'guard') {
            s.guard = true;
            say(t('Tu te mets en garde.'));
            done(300);
        } else if (id === 'flee') {
            if (Math.random() < 0.45) {
                say(t('Tu prends la fuite…'));
                s.over = true;
                setTimeout(showStart, 900);
            } else {
                say(t('Impossible de fuir !'));
                done(400);
            }
        }
        renderMenu();
    };

    const done = (ms = 500) => setTimeout(() => { s.busy = false; renderBars(); renderMenu(); }, ms);
    (window.gamePlaying ||= {}).battle = () => !!s && !s.over;

    const hurtEnemy = (dmg, tag, color) => {
        s.ehp = Math.max(0, s.ehp - dmg);
        const ep = enemyPos();
        popNum(String(dmg), ep.x + rand(-30, 30), ep.y - 60, color);
        if (tag) popNum(tag, ep.x, ep.y - 100, cssVar('--t-gold', '#e3b341'));
        shake = 0.3;
        flash = Math.max(flash, 0.5);
        sfx.select();
        if (!s.enraged && s.ehp < s.emax * 0.4) { s.enraged = true; say(t('Le golem entre en rage !')); }
        renderBars();
        if (s.ehp <= 0) win();
    };

    /* --- tour du monstre --- */
    const enemyTurn = () => {
        s.eatb = 0;
        if (s.charging) {
            s.charging = false;
            const dmg = Math.round(rand(150, 190) * (s.guard ? 0.4 : 1));
            hurtHero(dmg, t('Rayon prismatique !'), true);
            return;
        }
        const r = Math.random();
        if (r < (s.enraged ? 0.35 : 0.2)) {
            s.charging = true;
            say(t('Le golem concentre son énergie… (mets-toi en Défense !)'));
            return;
        }
        if (r < 0.6) hurtHero(Math.round(rand(38, 58) * (s.guard ? 0.5 : 1)), t('Poing de cristal'));
        else {
            hurtHero(Math.round(rand(28, 40) * (s.guard ? 0.5 : 1)), t('Pluie d\'éclats'));
            s.pmp = Math.max(0, s.pmp - 6);
        }
    };

    const hurtHero = (dmg, name, big) => {
        lunge = -1;
        say(name);
        setTimeout(() => {
            s.php = Math.max(0, s.php - dmg);
            const hp = heroPos();
            popNum(String(dmg), hp.x, hp.y - 40, '#ff6b6b');
            shake = big ? 0.6 : 0.3;
            s.guard = false;
            sfx.back();
            renderBars();
            if (s.php <= 0) lose();
        }, 300);
    };

    /* --- fin du combat --- */
    const win = () => {
        s.over = true;
        // le golem vole en éclats (même effet que l'écran de chargement)
        setTimeout(() => {
            shatterSnap = snapshotCanvas(cv);
            sfx.fanfare();
            const dpr = cv.width / W;
            const sc = cv.getContext('2d');
            shatterCanvas(sc, shatterSnap, { W, H, dpr, cx: enemyPos().x, cy: enemyPos().y, crackMs: 200, flyMs: 1000 }, () => { shatterSnap = null; });
        }, 400);
        const first = !rec.wins;
        rec.wins++;
        rec.bestTurns = rec.bestTurns ? Math.min(rec.bestTurns, s.turns) : s.turns;
        store.set(KEY, JSON.stringify(rec));
        renderRecord();
        achievements.unlock('battle');
        setTimeout(() => {
            overlay.hidden = false;
            overlay.innerHTML = `
                <p class="cook-k">${t('VICTOIRE !')}</p>
                <h3>${t('Golem de cristal vaincu')}</h3>
                <p class="cook-sub">${s.turns} ${t('tours')} · ${t('Record')} : ${rec.bestTurns} ${t('tours')}${first ? ' · ' + t('Première victoire !') : ''}</p>
                <div class="cook-actions"><button class="btn" type="button">${t('↺ Nouveau combat')}</button></div>`;
            overlay.querySelector('button').addEventListener('click', begin);
        }, 1700);
    };

    const lose = () => {
        s.over = true;
        setTimeout(() => {
            if (window.gameOver) window.gameOver({ sub: t('Le Golem de cristal a eu raison de toi.'), onContinue: begin });
            else begin();
        }, 600);
    };

    const showStart = () => {
        s = null;
        overlay.hidden = false;
        overlay.innerHTML = `
            <p class="cook-k">${t('UN MONSTRE APPARAÎT !')}</p>
            <h3>${t('Golem de cristal')}</h3>
            <p class="cook-sub">${t('Trouve sa faiblesse élémentaire, et défends-toi quand il concentre son énergie.')}</p>
            <div class="cook-actions"><button class="btn" type="button">${t('▶ Combattre')}</button></div>`;
        overlay.querySelector('button').addEventListener('click', begin);
        menu.innerHTML = '';
    };

    const begin = () => {
        overlay.hidden = true;
        s = fresh();
        $('.bt-hero-name').textContent = getPlayer() || 'PLAYER 1';
        say(t('Le Golem de cristal barre la route !'));
        renderBars();
        renderMenu();
    };

    /* --- dessin --- */
    const drawGolem = (t2) => {
        const ep = enemyPos();
        const cr = s && s.enraged ? '248, 81, 73' : cssVar('--t-crystal-rgb', '143, 184, 255');
        const bob = Math.sin(t2 * 1.8) * 8;
        const lx = lunge > 0 ? 0 : lunge < 0 ? (-lunge) * 60 : 0;
        c.save();
        c.translate(ep.x + lx + (shake ? rand(-6, 6) * shake * 3 : 0), ep.y + bob);
        const sc = Math.min(W, H) / 420;
        c.scale(sc, sc);
        // aura
        const aura = c.createRadialGradient(0, 0, 10, 0, 0, 170);
        aura.addColorStop(0, `rgba(${cr}, ${0.25 + (s && s.charging ? 0.25 * Math.abs(Math.sin(t2 * 10)) : 0)})`);
        aura.addColorStop(1, `rgba(${cr}, 0)`);
        c.fillStyle = aura;
        c.fillRect(-180, -180, 360, 360);
        const shard = (pts, fill) => {
            c.beginPath();
            c.moveTo(pts[0][0], pts[0][1]);
            pts.slice(1).forEach(p => c.lineTo(p[0], p[1]));
            c.closePath();
            c.fillStyle = fill;
            c.fill();
            c.strokeStyle = `rgba(${cr}, 0.9)`;
            c.lineWidth = 1.5;
            c.stroke();
        };
        const body = `rgba(${cr}, 0.22)`;
        const light = `rgba(255, 255, 255, 0.18)`;
        // bras flottants
        const arm = Math.sin(t2 * 2.2) * 10;
        shard([[-120, -20 + arm], [-90, -50 + arm], [-70, 10 + arm], [-100, 60 + arm]], body);
        shard([[120, -20 - arm], [90, -50 - arm], [70, 10 - arm], [100, 60 - arm]], body);
        // torse
        shard([[0, -90], [62, -30], [44, 70], [0, 100], [-44, 70], [-62, -30]], body);
        shard([[0, -90], [62, -30], [0, -10]], light);
        // tête
        shard([[0, -150], [30, -115], [0, -92], [-30, -115]], body);
        // yeux
        c.fillStyle = s && s.enraged ? '#ff5a5a' : '#ffffff';
        c.shadowColor = c.fillStyle;
        c.shadowBlur = 12;
        c.fillRect(-14, -122, 9, 4);
        c.fillRect(5, -122, 9, 4);
        // cœur lumineux
        const pulse = 0.6 + 0.4 * Math.sin(t2 * 4);
        c.fillStyle = `rgba(${cr}, ${pulse})`;
        c.beginPath(); c.moveTo(0, -20); c.lineTo(16, 10); c.lineTo(0, 40); c.lineTo(-16, 10); c.closePath(); c.fill();
        c.shadowBlur = 0;
        c.restore();
    };

    const draw = (dt, t2) => {
        // fond : grotte de cristal
        const bg = c.createRadialGradient(W / 2, H * 0.5, 0, W / 2, H * 0.5, Math.max(W, H) * 0.7);
        bg.addColorStop(0, '#16213a');
        bg.addColorStop(1, '#05070c');
        c.fillStyle = bg;
        c.fillRect(0, 0, W, H);
        // sol
        c.fillStyle = 'rgba(143, 184, 255, 0.06)';
        c.beginPath(); c.ellipse(W / 2, H * 0.86, W * 0.45, H * 0.07, 0, 0, 6.283); c.fill();
        // cristaux décoratifs
        for (let i = 0; i < 9; i++) {
            const x = (i / 8) * W, h = 30 + (i * 37) % 60;
            c.fillStyle = 'rgba(143, 184, 255, 0.08)';
            c.beginPath(); c.moveTo(x - 14, H); c.lineTo(x, H - h); c.lineTo(x + 14, H); c.fill();
        }
        if (!shatterSnap && (!s || s.ehp > 0)) drawGolem(t2);
        // particules d'éléments
        for (let i = fx.length - 1; i >= 0; i--) {
            const p = fx[i];
            p.life += dt;
            if (p.life > p.max) { fx.splice(i, 1); continue; }
            p.vy += (p.kind === 'cure' ? -40 : 300) * dt;
            p.x += p.vx * dt; p.y += p.vy * dt;
            c.globalAlpha = 1 - p.life / p.max;
            c.fillStyle = p.col;
            if (p.kind === 'ice') { c.save(); c.translate(p.x, p.y); c.rotate(p.life * 6); c.fillRect(-3, -6, 6, 12); c.restore(); }
            else { c.beginPath(); c.arc(p.x, p.y, p.kind === 'fire' ? 5 : 3, 0, 6.283); c.fill(); }
        }
        c.globalAlpha = 1;
        // éclair
        if (flash > 0.6) {
            const ep = enemyPos();
            c.strokeStyle = '#fff6b0';
            c.lineWidth = 3;
            c.beginPath();
            let x = ep.x + rand(-20, 20), y2 = 0;
            c.moveTo(x, y2);
            while (y2 < ep.y) { x += rand(-25, 25); y2 += rand(20, 40); c.lineTo(x, y2); }
            c.stroke();
        }
        // dégâts flottants
        c.textAlign = 'center';
        for (let i = nums.length - 1; i >= 0; i--) {
            const n = nums[i];
            n.t += dt;
            if (n.t > 1.1) { nums.splice(i, 1); continue; }
            c.globalAlpha = 1 - Math.max(0, n.t - 0.6) / 0.5;
            c.font = `700 ${n.txt.length > 6 ? 18 : 28}px "JetBrains Mono", monospace`;
            c.lineWidth = 4;
            c.strokeStyle = 'rgba(0, 0, 0, 0.8)';
            c.strokeText(n.txt, n.x, n.y - n.t * 40);
            c.fillStyle = n.color;
            c.fillText(n.txt, n.x, n.y - n.t * 40);
        }
        c.globalAlpha = 1;
        // flash blanc
        if (flash > 0) {
            c.fillStyle = `rgba(255, 255, 255, ${flash * 0.35})`;
            c.fillRect(0, 0, W, H);
        }
    };

    const update = (dt) => {
        shake = Math.max(0, shake - dt);
        flash = Math.max(0, flash - dt * 2.5);
        lunge *= Math.pow(0.02, dt);
        if (Math.abs(lunge) < 0.02) lunge = 0;
        if (!s || s.over) return;
        // mode "attente" : le temps se fige pendant que tu choisis dans un sous-menu
        if (s.busy || s.sub) return;
        const was = s.atb;
        s.atb = Math.min(1, s.atb + dt / 2.4);
        if (was < 1 && s.atb >= 1) { renderMenu(); sfx.hover(); }
        if (s.atb < 1) {
            s.eatb += dt / (s.enraged ? 2.6 : 3.4);
            if (s.eatb >= 1) { s.busy = true; enemyTurn(); setTimeout(() => { if (s && !s.over) { s.busy = false; renderMenu(); } }, 800); }
        }
        renderBars();
    };

    let raf = 0, last = 0;
    const loop = (ms) => {
        const dt = Math.min((ms - last) / 1000, 0.05);
        last = ms;
        update(dt);
        if (!shatterSnap) draw(dt, ms / 1000);
        raf = gameOn('battle') ? requestAnimationFrame(loop) : 0;
    };
    const run = () => {
        if (raf) return;
        ({ c, W, H } = fitCanvas(cv));
        last = performance.now();
        raf = requestAnimationFrame(loop);
    };
    document.addEventListener('gameopen', (e) => { if (e.detail === 'battle') run(); });
    document.addEventListener('gameresume', (e) => { if (e.detail === 'battle') run(); });
    window.addEventListener('resize', () => { if (raf) ({ c, W, H } = fitCanvas(cv)); });

    renderRecord();
    showStart();
    $('.bt-hero-name').textContent = getPlayer() || 'PLAYER 1';
    return { reset() { store.del(KEY); rec = load(); renderRecord(); showStart(); } };
})();

/* =====================================================================
   3 bis. CAMPAGNE DE COMBAT — la carte « Combat » ouvre cette campagne.
   Combat 1 = le Golem de cristal d'origine (module battle, inchangé).
   Combats 2 à 5 : plusieurs ennemis, puis un boss final géant.
   Le sac 🎒 : armes et accessoires gagnés avec les succès du site,
   techniques apprises en explorant, objets. Et un chat qui peut
   rejoindre l'équipe si on le laisse dormir au bon endroit.
   ===================================================================== */
/* =====================================================================
   RELIQUES ROYALES — 5 bonus permanents cachés dans les pages du site.
   Presque invisibles (comme les coffres) ; une fois trouvées, elles
   renforcent le héros dans les combats de l'arène, surtout contre le boss.
   ===================================================================== */
const relics = (() => {
    const KEY = 'eliasPortfolio.relics';
    const LIST = [
        { id: 'vigor', icon: '❤', page: 'about', x: '96%', y: '90%', name: t('Relique de vigueur'), what: t('+60 HP') },
        { id: 'aether', icon: '❖', page: 'softskills', x: '4%', y: '94%', name: t('Relique d\'éther'), what: t('+20 MP') },
        { id: 'might', icon: '⚔', page: 'education', x: '95%', y: '62%', name: t('Relique de force'), what: t('+12 % de dégâts') },
        { id: 'starbane', icon: '✶', page: 'work', x: '2.5%', y: '82%', name: t('Fléau des étoiles'), what: t('+30 % de dégâts contre le Dévoreur') },
        { id: 'moonward', icon: '☾', page: 'experience', x: '97%', y: '42%', name: t('Égide lunaire'), what: t('-25 % de dégâts reçus du Dévoreur') },
        { id: 'swift', icon: '➹', page: 'skills', x: '97%', y: '95%', name: t('Plume du vent'), what: t('jauge ATB 15 % plus rapide') },
        { id: 'phoenix', icon: '♨', page: 'home', x: '3%', y: '93%', name: t('Plume de phénix'), what: t('une fois par combat, te relève avec 40 % des HP') },
    ];
    const ON_KEY = 'eliasPortfolio.relicsOn';
    const load = () => { try { return new Set(JSON.parse(store.get(KEY) || '[]')); } catch { return new Set(); } };
    let got = load();
    const has = (id) => got.has(id);
    // équipées : toutes celles trouvées par défaut ; on peut en retirer dans le sac du combat
    const loadOn = () => { try { const v = JSON.parse(store.get(ON_KEY)); return v ? new Set(v) : null; } catch { return null; } };
    let on = loadOn();
    const worn = (id) => has(id) && (on ? on.has(id) : true);
    const toggle = (id) => {
        if (!has(id)) return;
        if (!on) on = new Set(got);
        on.has(id) ? on.delete(id) : on.add(id);
        store.set(ON_KEY, JSON.stringify([...on]));
    };
    LIST.forEach((r) => {
        const sec = document.getElementById(r.page);
        if (!sec) return;
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'relic';
        b.dataset.relic = r.id;
        b.setAttribute('aria-label', t('Relique cachée'));
        b.style.setProperty('--x', r.x);
        b.style.setProperty('--y', r.y);
        b.textContent = r.icon;
        b.classList.toggle('is-taken', has(r.id));
        b.addEventListener('click', () => {
            if (has(r.id)) return;
            got.add(r.id);
            store.set(KEY, JSON.stringify([...got]));
            if (on) { on.add(r.id); store.set(ON_KEY, JSON.stringify([...on])); }
            b.classList.add('is-taken');
            sfx.fanfare?.();
            if (typeof showToast === 'function') showToast(`${r.icon} ${r.name} : ${r.what} · ${t('à équiper dans le sac du combat')}`);
            document.dispatchEvent(new CustomEvent('relic', { detail: r.id }));
        });
        sec.appendChild(b);
    });
    document.addEventListener('game', (e) => {
        if (e.detail.type !== 'reset') return;
        store.del(KEY);
        store.del(ON_KEY);
        got = new Set();
        on = null;
        document.querySelectorAll('.relic').forEach(b => b.classList.remove('is-taken'));
    });
    // bonus appliqués en combat
    const bonus = () => ({
        hp: worn('vigor') ? 60 : 0,
        mp: worn('aether') ? 20 : 0,
        dmg: worn('might') ? 1.12 : 1,
        bossDmg: worn('starbane') ? 1.3 : 1,
        bossTaken: worn('moonward') ? 0.75 : 1,
        haste: worn('swift') ? 1.15 : 1,
        phoenix: worn('phoenix'),
    });
    return { LIST, has, worn, toggle, bonus, count: () => got.size };
})();

const arena = (() => {
    const panel = document.getElementById('game-arena');
    if (!panel) return { reset() { } };
    const KEY = 'eliasPortfolio.arena';
    const GEAR_KEY = 'eliasPortfolio.arenaGear';

    const ELEMENTS = [
        { id: 'fire', name: t('Feu'), icon: '🔥', color: '#ff7a3a' },
        { id: 'ice', name: t('Glace'), icon: '❄️', color: '#9fe6ff' },
        { id: 'thunder', name: t('Foudre'), icon: '⚡', color: '#ffe36b' },
    ];
    const FOES = {
        wolf: { name: t('Loup des cendres'), hp: 680, speed: 2.6, weak: 'ice', resist: 'fire', size: 0.95 },
        toad: { name: t('Crapaud colossal'), hp: 1250, speed: 3.2, weak: 'thunder', resist: 'ice', size: 1.05 },
        wisp: { name: t('Feu follet'), hp: 480, speed: 2.7, weak: 'ice', resist: 'fire', size: 0.75 },
        sentinel: { name: t('Sentinelle de fer'), hp: 880, speed: 3.0, weak: 'thunder', resist: 'ice', size: 0.95 },
        drone: { name: t('Drone réparateur'), hp: 420, speed: 2.5, weak: 'thunder', resist: 'fire', size: 0.55 },
        devourer: { name: t('Dévoreur d\'étoiles'), hp: 1900, /* par phase : il en a deux */ speed: 3.2, weak: 'fire', resist: 'thunder', size: 0.72 },
        shard: { name: t('Éclat du néant'), hp: 280, speed: 2.6, weak: 'fire', resist: 'ice', size: 0.5 },
    };
    const FIGHTS = [
        { id: 'golem', icon: '💎', name: t('Golem de cristal'), sub: t('Le premier combat'), golem: true },
        { id: 'wolves', icon: '🐺', name: t('Loups des cendres'), sub: t('1 contre 2'), foes: ['wolf', 'wolf'], bg: ['#2a1410', '#080404'] },
        { id: 'swamp', icon: '🐸', name: t('Marais maudit'), sub: t('Le feu follet soigne son crapaud'), foes: ['toad', 'wisp'], bg: ['#13261c', '#040806'] },
        { id: 'iron', icon: '🛡️', name: t('Sentinelles de fer'), sub: t('1 contre 3, avec un drone réparateur'), foes: ['sentinel', 'drone', 'sentinel'], bg: ['#1c2028', '#05060a'] },
        { id: 'boss', icon: '🌑', name: t('Le Dévoreur d\'étoiles'), sub: t('Boss final'), foes: ['devourer'], bg: ['#1a0d2e', '#020104'], boss: true },
    ];
    const WEAPONS = [
        { id: 'travel', icon: '🗡️', name: t('Épée de voyage'), atk: 1, how: t('Équipée au départ') },
        { id: 'crystal', icon: '🔷', name: t('Lame de cristal'), atk: 1.2, mp: 10, req: 'battle', how: t('Vaincre le Golem de cristal') },
        { id: 'kings', icon: '⚔️', name: t('Épée des Rois'), atk: 1.5, crit: 0.12, req: 'crystals', how: t('Réunir les 7 cristaux') },
    ];
    const ACCS = [
        { id: 'none', icon: '·', name: t('Aucun accessoire'), how: '' },
        { id: 'scale', icon: '🐟', name: t('Écaille du roi du lac'), hp: 60, req: 'fishBig', how: t('Succès « Le roi du lac »'), what: t('+60 HP') },
        { id: 'apron', icon: '🍳', name: t('Tablier du chef'), potion: 1.6, potions: 1, req: 'ultimateChef', how: t('Succès « Chef légendaire »'), what: t('potions +60 %, une potion de plus') },
        { id: 'feather', icon: '🪶', name: t('Plume de chocobo'), haste: 1.25, req: 'chocoboLegend', how: t('Succès « Légende de la piste »'), what: t('jauge ATB 25 % plus rapide') },
        { id: 'keys', icon: '🔑', name: t('Clés de la Regalia'), hp: 100, guard: 0.35, req: 'roadLegend', how: t('Succès « Roi de la route »'), what: t('+100 HP, meilleure défense') },
    ];
    const TECHS = [
        { id: 'cleave', icon: '✕', name: t('Taille croisée'), mp: 10, req: 'secretAll', how: t('Trouver tous les objets secrets'), what: t('frappe 2 ennemis') },
        { id: 'warp', icon: '➶', name: t('Téléfrappe'), mp: 12, req: 'explorer', how: t('Visiter toutes les pages'), what: t('gros coup sur une cible') },
        { id: 'phantom', icon: '✦', name: t('Lames fantômes'), mp: 16, req: 'crystals', how: t('Réunir les 7 cristaux'), what: t('frappe tous les ennemis') },
        { id: 'blaze', icon: '🔥', name: t('Brasier'), mp: 18, req: 'sphere', how: t('Compléter le sphérier'), what: t('feu sur tous les ennemis') },
    ];
    const has = (it) => !it.req || achievements.has(it.req);

    const load = () => { try { return JSON.parse(store.get(KEY)) || {}; } catch { return {}; } };
    let rec = load(); // { won: { wolves: true, ... }, cat: true }
    rec.won = rec.won || {};
    const save = () => store.set(KEY, JSON.stringify(rec));
    const gear = () => {
        let g = {};
        try { g = JSON.parse(store.get(GEAR_KEY) || '{}') || {}; } catch { }
        const w = WEAPONS.find(x => x.id === g.w && has(x)) || WEAPONS[0];
        const a = ACCS.find(x => x.id === g.a && has(x)) || ACCS[0];
        return { w, a };
    };
    const setGear = (k, id) => { const g = gear(); store.set(GEAR_KEY, JSON.stringify({ w: g.w.id, a: g.a.id, [k]: id })); };
    const isWon = (f) => (f.golem ? achievements.has('battle') : !!rec.won[f.id]);
    const isOpen = (i) => i === 0 || isWon(FIGHTS[i - 1]);
    const renderHub = () => setHubRecord('arena', `${FIGHTS.filter(isWon).length} / ${FIGHTS.length}`);

    panel.innerHTML = `
        <div class="game-bar">
            <button class="game-back" type="button">${t('◂ Mini-jeux')}</button>
            <p class="game-title">⚔️ ${t('Combat')}</p>
        </div>
        <div class="ar-camp">
            <div class="ar-map">
                <p class="ar-k">${t('CAMPAGNE')}</p>
                <ol class="ar-fights"></ol>
            </div>
            <div class="ar-bag">
                <p class="ar-k">🎒 ${t('SAC')}</p>
                <p class="ar-sub">${t('Arme')}</p><ul class="ar-pick ar-weapons"></ul>
                <p class="ar-sub">${t('Accessoire')}</p><ul class="ar-pick ar-accs"></ul>
                <p class="ar-sub">${t('Reliques royales')} <small class="ar-relics-n"></small></p><ul class="ar-pick ar-relics"></ul>
                <p class="ar-sub">${t('Techniques')}</p><ul class="ar-techs"></ul>
                <p class="ar-sub">${t('Objets')}</p><p class="ar-items"></p>
                <p class="ar-ally"></p>

                <span class="ar-paw" aria-hidden="true">🐾</span>
            </div>
        </div>
        <div class="ar-fight" hidden>
            <div class="bt-stage ar-stage">
                <canvas class="bt-canvas" aria-label="${t('Champ de bataille')}"></canvas>
                <ul class="ar-foes"></ul>
                <p class="bt-log" aria-live="polite"></p>
                <div class="bt-overlay"></div>
            </div>
            <div class="bt-ui">
                <ul class="bt-menu" role="menu"></ul>
                <div class="bt-party">
                    <div class="bt-hero"><span class="player-gem"></span><b class="bt-hero-name"></b><span class="bt-guard" hidden>🛡 ${t('EN GARDE')}</span></div>
                    <div class="bt-stat"><span>HP</span><div class="bt-bar bt-php"><span></span></div><b class="bt-php-n"></b></div>
                    <div class="bt-stat"><span>MP</span><div class="bt-bar bt-pmp"><span></span></div><b class="bt-pmp-n"></b></div>
                    <div class="bt-stat"><span>ATB</span><div class="bt-bar bt-atb"><span></span></div><b class="bt-atb-n"></b></div>
                    <p class="bt-inv"></p>
                </div>
            </div>
        </div>`;

    const $ = (sel) => panel.querySelector(sel);
    const $$ = (sel) => panel.querySelectorAll(sel);
    const camp = $('.ar-camp');
    const fightBox = $('.ar-fight');
    const cv = $('.bt-canvas');
    const overlay = $('.bt-overlay');
    const menu = $('.bt-menu');
    const logEl = $('.bt-log');
    let c, W, H;

    /* ---------------- écran de campagne ---------------- */
    const pickList = (ul, items, cur, key) => {
        ul.innerHTML = '';
        items.forEach(it => {
            const ok = has(it);
            const li = document.createElement('li');
            const b = document.createElement('button');
            b.type = 'button';
            b.className = it.id === cur.id ? 'is-on' : '';
            b.disabled = !ok;
            b.innerHTML = '<span></span><b></b><small></small>';
            b.querySelector('span').textContent = ok ? it.icon : '?';
            b.querySelector('b').textContent = ok ? it.name : '???';
            b.querySelector('small').textContent = ok ? (it.what || (it.atk ? `${t('Attaque')} ×${it.atk}` : '')) : it.how;
            b.addEventListener('click', () => { setGear(key, it.id); sfx.select(); renderCamp(); });
            li.appendChild(b);
            ul.appendChild(li);
        });
    };
    const renderCamp = () => {
        const list = $('.ar-fights');
        list.innerHTML = '';
        FIGHTS.forEach((f, i) => {
            const li = document.createElement('li');
            const b = document.createElement('button');
            b.type = 'button';
            const open = isOpen(i);
            b.className = `ar-fight-card ${isWon(f) ? 'is-won' : ''} ${f.boss ? 'is-boss' : ''}`;
            b.disabled = !open;
            b.innerHTML = '<span class="ar-n"></span><span class="ar-ic"></span><span class="ar-t"><b></b><small></small></span><em></em>';
            b.querySelector('.ar-n').textContent = String(i + 1);
            b.querySelector('.ar-ic').textContent = open ? f.icon : '🔒';
            b.querySelector('b').textContent = open ? f.name : '???';
            b.querySelector('small').textContent = open ? f.sub : t('Gagne le combat précédent');
            b.querySelector('em').textContent = isWon(f) ? t('VAINCU') : '';
            b.addEventListener('click', () => start(i));
            li.appendChild(b);
            list.appendChild(li);
        });
        const g = gear();
        pickList($('.ar-weapons'), WEAPONS, g.w, 'w');
        pickList($('.ar-accs'), ACCS, g.a, 'a');
        const techs = $('.ar-techs');
        techs.innerHTML = '';
        TECHS.forEach(tc => {
            const li = document.createElement('li');
            const ok = has(tc);
            li.className = ok ? 'is-got' : '';
            li.innerHTML = '<span></span><b></b><small></small>';
            li.querySelector('span').textContent = ok ? tc.icon : '?';
            li.querySelector('b').textContent = ok ? `${tc.name} · ${tc.mp} MP` : '???';
            li.querySelector('small').textContent = ok ? tc.what : tc.how;
            techs.appendChild(li);
        });
        const inv = items();
        $('.ar-items').textContent = `🧪 ${t('Potion')} ×${inv.potions}   💧 ${t('Éther')} ×${inv.ethers}   ✨ ${t('Élixir')} ×${inv.elixirs}${inv.elixirs ? '' : ` (${t('trouve un objet secret')})`}`;
        $('.ar-ally').textContent = rec.cat ? `🐈 ${t('Le chat errant combat à tes côtés.')}` : '';
        // reliques : plusieurs à la fois, chacune s'équipe / se retire d'un clic
        const rl = $('.ar-relics');
        rl.innerHTML = '';
        $('.ar-relics-n').textContent = `${relics.count()} / ${relics.LIST.length} · ${t('toutes équipables en même temps')}`;
        relics.LIST.forEach(r => {
            const ok = relics.has(r.id);
            const li = document.createElement('li');
            const b = document.createElement('button');
            b.type = 'button';
            b.className = ok && relics.worn(r.id) ? 'is-on' : '';
            b.disabled = !ok;
            b.setAttribute('aria-pressed', String(ok && relics.worn(r.id)));
            b.innerHTML = '<span></span><b></b><small></small>';
            b.querySelector('span').textContent = ok ? r.icon : '?';
            b.querySelector('b').textContent = ok ? r.name : '???';
            b.querySelector('small').textContent = ok ? r.what : t('Cachée quelque part sur le site…');
            b.addEventListener('click', () => { relics.toggle(r.id); sfx.select(); renderCamp(); });
            li.appendChild(b);
            rl.appendChild(li);
        });
        $('.ar-paw').classList.toggle('is-taken', !!rec.cat);
        renderHub();
    };
    const items = () => {
        const a = gear().a;
        return { potions: 2 + (a.potions || 0), ethers: 1, elixirs: achievements.has('secret1') ? 1 : 0 };
    };

    /* ---------------- le chat : il faut qu'il s'endorme sur la trace de patte ---------------- */
    let catT = 0, catLast = {};
    setInterval(() => {
        document.documentElement.classList.toggle('cat-in-battle', !!(s && s.cat && openGame === 'arena' && document.getElementById('games')?.classList.contains('is-active')));
        if (rec.cat || openGame !== 'arena' || camp.hidden || !gameOn('arena')) { catT = 0; return; }
        const neko = document.getElementById('oneko');
        const paw = $('.ar-paw');
        if (!neko || !paw) return;
        const n = neko.getBoundingClientRect(), p = paw.getBoundingClientRect();
        const cx = n.left + n.width / 2, cy = n.top + n.height / 2;
        // le chat s'arrête à ~48 px du curseur : il « dort sur la trace » s'il est tout près et immobile
        const still = Math.abs(cx - (catLast.x || 0)) < 2 && Math.abs(cy - (catLast.y || 0)) < 2;
        catLast = { x: cx, y: cy };
        const on = still && Math.hypot(cx - (p.left + p.width / 2), cy - (p.top + p.height / 2)) < 70;
        catT = on ? catT + 0.5 : 0;
        if (catT >= 2) {
            rec.cat = true;
            save();
            sfx.fanfare();
            if (typeof showToast === 'function') showToast(`🐈 ${t('Le chat errant rejoint ton équipe !')}`);
            achievements.unlock('catAlly');
            renderCamp();
        }
    }, 500);
    const catImg = new Image();
    let catOk = false;
    catImg.onload = () => { catOk = true; };

    /* ---------------- combat ---------------- */
    let s = null, fight = null;
    const say = (txt) => { logEl.textContent = txt; logEl.classList.remove('pop'); void logEl.offsetWidth; logEl.classList.add('pop'); };
    const fx = [], nums = [];
    let shake = 0, flash = 0, lunge = 0;
    const heroPos = () => ({ x: W * 0.88, y: H * 0.8 });
    const catPos = () => ({ x: W * 0.74, y: H * 0.86 });
    const alive = () => s.foes.filter(f => f.hp > 0);
    const foePos = (f) => {
        if (f.kind === 'devourer') return { x: W * 0.5, y: H * 0.62 };
        const list = s.foes.filter(x => x.kind !== 'devourer');
        const i = list.indexOf(f), n = list.length;
        if (s.foes.some(x => x.kind === 'devourer')) return { x: W * (i ? 0.84 : 0.16), y: H * 0.6 };
        return { x: W * (n === 1 ? 0.5 : 0.2 + (0.6 * i) / (n - 1)), y: H * (0.52 + (i % 2) * 0.04) };
    };
    const popNum = (txt, x, y, color) => nums.push({ txt, x, y, t: 0, color });
    const burst = (el, x, y) => {
        const col = ELEMENTS.find(e => e.id === el)?.color || '#fff';
        for (let i = 0; i < 34; i++) fx.push({ x, y, vx: rand(-220, 220), vy: rand(-260, 120), life: 0, max: rand(0.4, 0.9), col, kind: el });
    };

    // réglage de chaque combat (vie des ennemis, force de leurs coups), calé avec un joueur automatique :
    // gagnable avec un bon équipement, serré, et perdu si on joue mal
    const TUNE = {speed: 0.92, heal: 70, healChance: 0.4, wolves: {hp: 1.25, dmg: 1.15}, swamp: {hp: 1.15, dmg: 1.0}, iron: {hp: 0.85, dmg: 0.62}, boss: {hp: 0.8, dmg: 0.9}};
    const HARD = { speed: TUNE.speed };
    const makeFoe = (kind) => { const d = FOES[kind], hp = Math.round(d.hp * (TUNE[fight?.id]?.hp || 1)); return { kind, ...d, hp, max: hp, speed: d.speed * HARD.speed, eatb: Math.random() * 0.4, charging: false, fury: false, known: {} }; };

    const start = (i) => {
        const f = FIGHTS[i];
        if (!isOpen(i)) return;
        if (f.golem) { window.gamesHub?.open('battle'); return; }
        fight = f;
        const g = gear();
        const inv = items();
        const rb = relics.bonus();
        const hpMax = 340 + (g.a.hp || 0) + rb.hp;
        const mpMax = 60 + (g.w.mp || 0) + rb.mp;
        s = {
            php: hpMax, pmax: hpMax, pmp: mpMax, mpmax: mpMax, atb: 0.3, guard: false,
            ...inv, foes: f.foes.map(makeFoe), w: g.w, a: g.a,
            turns: 0, busy: false, over: false, sub: null, pending: null,
            cat: rec.cat ? { t: 0 } : null, phase: 1, summoned: false, rb,
        };
        camp.hidden = true;
        fightBox.hidden = false;
        overlay.hidden = true;
        $('.bt-hero-name').textContent = getPlayer() || 'PLAYER 1';
        if (rec.cat && !catImg.src) catImg.src = 'assets/cat%20cursor/oneko.gif';
        ({ c, W, H } = fitCanvas(cv));
        say(f.boss ? t('Le ciel se déchire… Le Dévoreur d\'étoiles descend sur toi !') : `${f.name} !`);
        renderFoes(); renderBars(); renderMenu();
        run();
        window.scrollTo({ top: panel.getBoundingClientRect().top + window.scrollY - (window.innerWidth <= 916 ? 90 : 20), behavior: 'instant' });
    };
    const backToCamp = () => {
        s = null;
        document.documentElement.classList.remove('cat-in-battle');
        fightBox.hidden = true;
        camp.hidden = false;
        renderCamp();
    };

    /* --- HUD des ennemis --- */
    const renderFoes = () => {
        const ul = $('.ar-foes');
        ul.innerHTML = '';
        ul.classList.toggle('is-boss', !!fight?.boss);
        s.foes.forEach(f => {
            const li = document.createElement('li');
            li.className = f.hp <= 0 ? 'is-dead' : '';
            li.innerHTML = '<p class="bt-name"></p><div class="bt-bar bt-hp"><span></span></div><div class="bt-bar bt-eatb" title="ATB"><span></span></div><p class="bt-tag"></p>';
            li.querySelector('.bt-name').textContent = f.name;
            li.querySelector('.bt-hp span').style.width = `${(f.hp / f.max) * 100}%`;
            const known = Object.entries(f.known).map(([k, v]) => `${ELEMENTS.find(e => e.id === k).icon} ${v}`).join('  ');
            li.querySelector('.bt-tag').textContent = `${f.charging ? t('⚠ CHARGE') + ' · ' : ''}${f.fury ? t('FURIE') + ' · ' : ''}${known}`;
            ul.appendChild(li);
        });
    };
    const renderBars = () => {
        $('.bt-php span').style.width = `${(s.php / s.pmax) * 100}%`;
        $('.bt-pmp span').style.width = `${(s.pmp / s.mpmax) * 100}%`;
        $('.bt-atb span').style.width = `${Math.min(1, s.atb) * 100}%`;
        $('.bt-php-n').textContent = `${Math.max(0, Math.round(s.php))}/${s.pmax}`;
        $('.bt-pmp-n').textContent = `${s.pmp}/${s.mpmax}`;
        $('.bt-atb-n').textContent = s.atb >= 1 ? t('PRÊT') : `${Math.floor(s.atb * 100)}%`;
        $('.bt-guard').hidden = !s.guard;
        $('.bt-inv').textContent = `🧪 ×${s.potions}   💧 ×${s.ethers}   ✨ ×${s.elixirs}${s.cat ? '   🐈' : ''}`;
        $('.bt-atb').classList.toggle('is-full', s.atb >= 1);
        $('.bt-php').classList.toggle('is-low', s.php < s.pmax * 0.3);
        // jauge ATB de chaque ennemi : pleine = il attaque
        $$('.ar-foes .bt-eatb').forEach((el, i) => {
            const f = s.foes[i];
            if (!f) return;
            el.firstChild.style.width = `${f.hp > 0 ? Math.min(1, f.eatb) * 100 : 0}%`;
            el.classList.toggle('is-near', f.hp > 0 && f.eatb > 0.8);
        });
    };

    /* --- menu --- */
    const SINGLE = new Set(['attack', 'warp', 'cleave', 'm-fire', 'm-ice', 'm-thunder']);
    const renderMenu = () => {
        menu.innerHTML = '';
        if (!s) return;
        const ready = s.atb >= 1 && !s.busy && !s.over;
        let title = t('COMMANDES');
        let list;
        const techs = TECHS.filter(has);
        if (s.sub === 'tech') {
            title = t('TECHNIQUES');
            list = [...techs.map(tc => ({ id: tc.id, label: `${tc.icon} ${tc.name}`, cost: tc.mp })), { id: 'back', label: t('◂ Retour') }];
        } else if (s.sub === 'magic') {
            title = t('MAGIE');
            list = [...ELEMENTS.map(e => ({ id: `m-${e.id}`, label: `${e.icon} ${e.name}`, cost: 8 })), { id: 'm-cure', label: `✚ ${t('Soin')}`, cost: 12 }, { id: 'back', label: t('◂ Retour') }];
        } else if (s.sub === 'item') {
            title = t('OBJETS');
            list = [{ id: 'i-potion', label: `${t('Potion')} ×${s.potions}`, n: s.potions }, { id: 'i-ether', label: `${t('Éther')} ×${s.ethers}`, n: s.ethers }, { id: 'i-elixir', label: `${t('Élixir')} ×${s.elixirs}`, n: s.elixirs }, { id: 'back', label: t('◂ Retour') }];
        } else if (s.sub === 'target') {
            title = t('CIBLE');
            list = [...s.foes.map((f, i) => ({ id: `t-${i}`, label: `🎯 ${f.name} · ${Math.ceil((f.hp / f.max) * 100)} %`, n: f.hp > 0 ? 1 : 0 })), { id: 'back', label: t('◂ Retour') }];
        } else {
            list = [
                { id: 'attack', label: t('Attaque') },
                ...(techs.length ? [{ id: 'tech', label: t('Techniques ▸') }] : []),
                { id: 'magic', label: t('Magie ▸') },
                { id: 'item', label: t('Objet ▸') },
                { id: 'guard', label: t('Défense') },
                { id: 'flee', label: t('Fuir') },
            ];
        }
        const head = document.createElement('li');
        head.className = 'bt-menu-k';
        head.innerHTML = '<span></span><em></em>';
        head.querySelector('span').textContent = title;
        head.querySelector('em').textContent = s.over ? '' : ready ? t('À toi !') : t('ATB en charge…');
        head.classList.toggle('is-ready', ready);
        menu.appendChild(head);
        list.forEach(it => {
            const li = document.createElement('li');
            const b = document.createElement('button');
            b.type = 'button';
            const lb = document.createElement('span');
            lb.textContent = it.label;
            b.appendChild(lb);
            if (it.cost) { const m = document.createElement('small'); m.textContent = `${it.cost} MP`; b.appendChild(m); }
            b.disabled = !ready || (it.cost && s.pmp < it.cost) || it.n === 0;
            b.addEventListener('click', () => choose(it.id));
            if (it.id === 'guard' && alive().some(f => f.charging)) b.classList.add('is-urge');
            li.appendChild(b);
            menu.appendChild(li);
        });
        const first = menu.querySelector('button:not(:disabled)');
        if (ready && first && document.activeElement?.closest('.bt-menu') == null && gameOn('arena')) first.focus({ preventScroll: true });
    };

    const choose = (id) => {
        if (!s || s.busy || s.over) return;
        if (id === 'tech' || id === 'magic' || id === 'item') { s.sub = id; renderMenu(); return; }
        if (id === 'back') { s.sub = s.sub === 'target' && s.pending ? s.back : null; s.pending = null; renderMenu(); return; }
        if (id.startsWith('t-')) { const p = s.pending; s.pending = null; s.sub = null; act(p, Number(id.slice(2))); return; }
        if (SINGLE.has(id) && alive().length > 1) { s.back = s.sub; s.pending = id; s.sub = 'target'; renderMenu(); return; }
        s.sub = null;
        act(id, s.foes.indexOf(alive()[0]));
    };

    const weaponHit = (lo, hi) => {
        const crit = Math.random() < 0.12 + (s.w.crit || 0);
        return { dmg: Math.round(rand(lo, hi) * s.w.atk * (crit ? 2 : 1)), crit };
    };
    const elemMult = (f, el) => {
        if (el === f.weak) { f.known[el] = t('faible'); return [1.6, t('FAIBLESSE !')]; }
        if (el === f.resist) { f.known[el] = t('résiste'); return [0.5, t('RÉSISTE')]; }
        f.known[el] = t('normal');
        return [1, null];
    };

    const act = (id, ti) => {
        s.busy = true;
        s.guard = false; // la défense dure jusqu'à ton tour suivant (tous les coups reçus entre-temps)
        s.dealt = 0;
        s.atb = 0;
        s.turns++;
        const target = s.foes[ti]?.hp > 0 ? s.foes[ti] : alive()[0];
        s.lastTarget = target; // le chat vise le même ennemi
        const tech = TECHS.find(x => x.id === id);
        if (tech) s.pmp -= tech.mp;
        if (id === 'attack') {
            lunge = 1;
            setTimeout(() => { const h = weaponHit(55, 80); hurtFoe(target, h.dmg, h.crit ? t('CRITIQUE !') : null, '#fff'); say(h.crit ? t('Coup critique !') : t('Attaque !')); done(); }, 260);
        } else if (id === 'cleave') {
            lunge = 1;
            const second = alive().find(f => f !== target);
            setTimeout(() => {
                [target, second].filter(Boolean).forEach((f, k) => setTimeout(() => { const h = weaponHit(50, 65); hurtFoe(f, h.dmg, k ? null : t('TAILLE CROISÉE'), '#fff'); }, k * 180));
                say(t('Taille croisée !'));
                done(700);
            }, 260);
        } else if (id === 'warp') {
            lunge = 1;
            flash = 0.6;
            setTimeout(() => { const h = weaponHit(105, 125); hurtFoe(target, h.dmg, t('TÉLÉFRAPPE'), '#bfe0ff'); say(t('Téléfrappe !')); done(); }, 300);
        } else if (id === 'phantom') {
            flash = 0.8;
            say(t('Lames fantômes !'));
            alive().forEach((f, k) => setTimeout(() => {
                const p = foePos(f);
                for (let i = 0; i < 14; i++) fx.push({ x: p.x + rand(-60, 60), y: p.y - 140, vx: rand(-30, 30), vy: rand(260, 420), life: 0, max: 0.5, col: '#bcd8ff', kind: 'blade' });
                const h = weaponHit(45, 60);
                hurtFoe(f, h.dmg, null, '#bcd8ff');
            }, 200 + k * 160));
            done(900);
        } else if (id === 'blaze') {
            say(t('Brasier !'));
            alive().forEach((f, k) => setTimeout(() => {
                const p = foePos(f);
                burst('fire', p.x, p.y);
                const [m, tag] = elemMult(f, 'fire');
                hurtFoe(f, Math.round(rand(55, 70) * m), tag, '#ff7a3a');
            }, 250 + k * 140));
            done(900);
        } else if (id.startsWith('m-')) {
            const el = id.slice(2);
            if (el === 'cure') {
                s.pmp -= 12;
                const heal = Math.round(rand(120, 150));
                s.php = Math.min(s.pmax, s.php + heal);
                const hp = heroPos();
                for (let i = 0; i < 30; i++) fx.push({ x: hp.x + rand(-30, 30), y: hp.y, vx: rand(-20, 20), vy: rand(-140, -60), life: 0, max: rand(0.6, 1), col: '#9cff8a', kind: 'cure' });
                popNum(`+${heal}`, hp.x, hp.y - 40, '#9cff8a');
                say(t('Soin !'));
                sfx.fanfare();
                done(500);
                return;
            }
            s.pmp -= 8;
            const e = ELEMENTS.find(x => x.id === el);
            const p = foePos(target);
            burst(el, p.x, p.y);
            if (el === 'thunder') flash = 1;
            const [m, tag] = elemMult(target, el);
            setTimeout(() => { hurtFoe(target, Math.round(rand(80, 100) * m), tag, e.color); say(`${e.name} !`); done(); }, 350);
        } else if (id === 'i-potion') {
            s.potions--;
            const heal = Math.round(120 * (s.a.potion || 1));
            s.php = Math.min(s.pmax, s.php + heal);
            popNum(`+${heal}`, heroPos().x, heroPos().y - 40, '#9cff8a');
            say(`${t('Potion')} : +${heal} HP`);
            done(400);
        } else if (id === 'i-ether') {
            s.ethers--;
            s.pmp = Math.min(s.mpmax, s.pmp + 30);
            popNum('+30 MP', heroPos().x, heroPos().y - 40, '#8fb8ff');
            say(t('Éther : +30 MP'));
            done(400);
        } else if (id === 'i-elixir') {
            s.elixirs--;
            s.php = s.pmax; s.pmp = s.mpmax;
            popNum(t('MAX'), heroPos().x, heroPos().y - 40, '#ffe08a');
            say(t('Élixir : HP et MP au maximum !'));
            sfx.fanfare();
            done(500);
        } else if (id === 'guard') {
            s.guard = true;
            say(t('Tu te mets en garde.'));
            done(300);
        } else if (id === 'flee') {
            if (!fight.boss && Math.random() < 0.45) {
                say(t('Tu prends la fuite…'));
                s.over = true;
                setTimeout(backToCamp, 900);
            } else {
                say(fight.boss ? t('Impossible de fuir le Dévoreur !') : t('Impossible de fuir !'));
                done(400);
            }
        }
        renderMenu();
    };
    const done = (ms = 500) => setTimeout(() => {
        if (!s) return;
        const dealt = s.dealt || 0;
        s.dealt = 0;
        if (s.cat && dealt > 0 && !s.over && alive().length) {
            catTurn(Math.max(1, Math.round(dealt * 0.15)));
            setTimeout(() => { if (!s) return; s.busy = false; renderBars(); renderFoes(); renderMenu(); }, 450);
            return;
        }
        s.busy = false; renderBars(); renderFoes(); renderMenu();
    }, ms);
    (window.gamePlaying ||= {}).arena = () => !!s && !s.over;

    const hurtFoe = (f, dmg, tag, color) => {
        if (!s || f.hp <= 0) return;
        // reliques : plus de dégâts, encore plus contre le Dévoreur et ses éclats
        if (s.rb) dmg = Math.round(dmg * s.rb.dmg * (f.kind === 'devourer' || f.kind === 'shard' ? s.rb.bossDmg : 1));
        if (!s.catHit) s.dealt = (s.dealt || 0) + Math.min(f.hp, dmg);
        f.hp = Math.max(0, f.hp - dmg);
        const p = foePos(f);
        popNum(String(dmg), p.x + rand(-30, 30), p.y - 60 * f.size, color);
        if (tag) popNum(tag, p.x, p.y - 100 * f.size, cssVar('--t-gold', '#e3b341'));
        f.shake = 0.3;
        shake = Math.max(shake, 0.2);
        sfx.select();
        // le Dévoreur « meurt »… et renaît en phase 2 (sans prévenir) : nouvelle faiblesse, renforts,
        // et le héros récupère ses HP et MP pour ce second round
        if (f.kind === 'devourer' && s.phase === 1 && f.hp <= 0) {
            s.phase = 2;
            f.hp = f.max;
            f.charging = false;
            f.weak = 'ice'; f.resist = 'fire'; f.known = {}; f.speed = 2.4 * HARD.speed; f.eatb = 0;
            for (let i = 0; i < 40; i++) fx.push({ x: p.x, y: p.y, vx: rand(-260, 260), vy: rand(-300, 80), life: 0, max: rand(0.6, 1.2), col: '#b48cff', kind: 'dust' });
            flash = 1;
            shake = 0.9;
            say(t('Le Dévoreur d\'étoiles est vaincu !'));
            s.reviving = true;
            setTimeout(() => {
                if (!s || s.over) return;
                s.reviving = false;
                s.php = s.pmax; s.pmp = s.mpmax;
                flash = 1;
                shake = 0.8;
                popNum(t('MAX'), heroPos().x, heroPos().y - 40, '#ffe08a');
                say(t('… Il renaît de ses cendres ! Sa faiblesse a changé. Tes forces reviennent !'));
                if (!s.summoned) { s.summoned = true; s.foes.push(makeFoe('shard'), makeFoe('shard')); }
                renderFoes();
                renderBars();
            }, 1400);
            renderFoes();
            renderBars();
            return;
        }
        if (f.hp <= 0) {
            f.charging = false;
            for (let i = 0; i < 30; i++) fx.push({ x: p.x, y: p.y, vx: rand(-200, 200), vy: rand(-240, 60), life: 0, max: rand(0.5, 1), col: '#cfd8ff', kind: 'dust' });
            say(`${f.name} ${t('est vaincu !')}`);
            // sans leur drone réparateur, les sentinelles perdent leur rythme : jauge ATB vidée de moitié, et plus lente
            if (f.kind === 'drone') {
                s.foes.filter(q => q.kind === 'sentinel' && q.hp > 0).forEach(q => { q.eatb *= 0.5; q.speed *= 1.35; });
                setTimeout(() => { if (s && !s.over) say(t('Sans leur drone, les sentinelles ralentissent !')); }, 900);
            }
        }
        renderFoes();
        renderBars();
        if (!alive().length) win();
    };

    /* --- tour des ennemis --- */
    const hit = (dmg, name, big) => {
        lunge = -1;
        dmg *= (TUNE[fight.id]?.dmg || 1) * (fight.boss && s.rb ? s.rb.bossTaken : 1);
        say(name);
        setTimeout(() => {
            if (!s || s.over) return;
            const guardK = big ? 0.4 : 0.5;
            const real = Math.round(dmg * (s.guard ? guardK * (1 - (s.a.guard || 0)) : 1));
            s.php = Math.max(0, s.php - real);
            const hp = heroPos();
            popNum(String(real), hp.x, hp.y - 40, '#ff6b6b');
            shake = big ? 0.6 : 0.3;
            sfx.back();
            renderBars();
            if (s.php <= 0 && s.rb?.phoenix && !s.phoenixUsed) {
                // plume de phénix : on se relève une fois
                s.phoenixUsed = true;
                s.php = Math.round(s.pmax * 0.4);
                flash = 1;
                popNum(`+${s.php}`, hp.x, hp.y - 70, '#ffb36b');
                say(t('La plume de phénix s\'embrase : tu te relèves !'));
                renderBars();
            }
            if (s.php <= 0) lose();
        }, 300);
    };
    const charge = (f, msg) => { f.charging = true; say(`${msg} ${t('(mets-toi en Défense !)')}`); renderFoes(); renderMenu(); shake = 0.25; };
    const healFoe = (by, f, n) => {
        f.hp = Math.min(f.max, f.hp + n);
        const p = foePos(f);
        popNum(`+${n}`, p.x, p.y - 60 * f.size, '#9cff8a');
        say(`${by.name} : ${t('soigne')} ${f.name}`);
        renderFoes();
    };
    const foeTurn = (f) => {
        f.eatb = 0;
        const r = Math.random();
        const furyK = f.fury ? 1.5 : 1;
        f.fury = false;
        if (f.charging) {
            f.charging = false;
            const big = { toad: [120, 150, t('Plat ventre !')], sentinel: [130, 160, t('Charge de lance !')], devourer: [240, 270, t('SUPERNOVA !')] }[f.kind] || [100, 130, t('Coup puissant !')];
            if (f.kind === 'devourer') flash = 1;
            hit(rand(big[0], big[1]), big[2], true);
            renderFoes();
            return;
        }
        const others = alive().filter(x => x !== f);
        switch (f.kind) {
            case 'wolf':
                if (r < 0.28 && others.length) { others.concat(f).forEach(x => { x.fury = true; }); say(t('Hurlement ! La meute s\'enrage.')); renderFoes(); }
                else hit(rand(30, 45) * furyK, t('Morsure'));
                break;
            case 'toad':
                if (r < 0.15) charge(f, t('Le crapaud gonfle son ventre…'));
                else if (r < 0.4) { s.pmp = Math.max(0, s.pmp - 10); hit(rand(18, 26), t('Croassement ! (-10 MP)')); }
                else hit(rand(42, 58), t('Coup de langue'));
                break;
            case 'wisp': {
                const toad = others.find(x => x.kind === 'toad' && x.hp < x.max * 0.65);
                if (toad && r < 0.5) healFoe(f, toad, 140);
                else hit(rand(34, 48), t('Flamme follette'));
                break;
            }
            case 'sentinel':
                if (r < 0.22) charge(f, t('La sentinelle abaisse sa lance…'));
                else hit(rand(40, 55), t('Coup de bouclier'));
                break;
            case 'drone': {
                const hurt = others.filter(x => x.hp < x.max * 0.55).sort((p, q) => p.hp / p.max - q.hp / q.max)[0];
                if (hurt && r < TUNE.healChance) healFoe(f, hurt, TUNE.heal);
                else hit(rand(22, 30), t('Décharge'));
                break;
            }
            case 'devourer':
                if (s.phase === 2 && r < 0.18) {
                    const n = Math.round(s.php * 0.2);
                    hit(n, t('Trou noir ! Il dévore ta vie.'));
                    healFoe(f, f, 150);
                } else if (r < (s.phase === 2 ? 0.34 : 0.26)) charge(f, t('Le Dévoreur aspire la lumière des étoiles…'));
                else if (r < 0.6) { s.pmp = Math.max(0, s.pmp - 8); hit(rand(35, 50), t('Pluie d\'étoiles')); }
                else hit(rand(50, 70), t('Griffe du néant'));
                break;
            default:
                hit(rand(22, 32), t('Éclat tranchant'));
        }
    };

    // le chat frappe juste après toi, à hauteur de 15 % de tes dégâts
    const catTurn = (dmg) => {
        const list = alive();
        if (!list.length) return;
        // le chat griffe l'ennemi que tu viens d'attaquer (s'il tient encore debout)
        const f = s.lastTarget && s.lastTarget.hp > 0 ? s.lastTarget : list[Math.floor(Math.random() * list.length)];
        const p = catPos();
        for (let i = 0; i < 8; i++) fx.push({ x: p.x, y: p.y - 20, vx: rand(-60, 60), vy: rand(-80, -20), life: 0, max: 0.5, col: '#fff', kind: 'dust' });
        say(t('Le chat griffe ! Miaou !'));
        s.catHit = true;
        hurtFoe(f, dmg, null, '#ffd0e8');
        s.catHit = false;
    };

    /* --- fin du combat --- */
    const win = () => {
        if (s.over) return;
        s.over = true;
        const first = !rec.won[fight.id];
        rec.won[fight.id] = true;
        save();
        sfx.fanfare();
        if (fight.boss) achievements.unlock('arenaAll');
        const next = FIGHTS[FIGHTS.indexOf(fight) + 1];
        setTimeout(() => {
            if (!s) return;
            overlay.hidden = false;
            overlay.innerHTML = `
                <p class="cook-k">${t('VICTOIRE !')}</p>
                <h3>${fight.boss ? t('Le Dévoreur d\'étoiles est vaincu !') : fight.name}</h3>
                <p class="cook-sub">${s.turns} ${t('tours')}${first && next ? ` · ${t('Nouveau combat débloqué :')} ${next.name}` : ''}${fight.boss ? ` · ${t('L\'aube se lève sur le royaume.')}` : ''}</p>
                <div class="cook-actions"><button class="btn" type="button">${t('◂ Campagne')}</button></div>`;
            overlay.querySelector('button').addEventListener('click', backToCamp);
            renderMenu();
        }, 1200);
    };
    const lose = () => {
        s.over = true;
        const again = FIGHTS.indexOf(fight);
        setTimeout(() => {
            if (window.gameOver) window.gameOver({ sub: `${fight.name} : ${t('tu es tombé au combat.')}`, onContinue: () => start(again), onQuit: backToCamp });
            else backToCamp();
        }, 600);
    };

    /* --- dessin des ennemis : formes ombrées, reflets, lueurs et parties animées --- */
    const lin = (x0, y0, x1, y1, stops) => { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
    const rad = (x, y, r0, r1, stops) => { const g = c.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
    const glowDot = (x, y, r, col, blur = 16) => { c.save(); c.fillStyle = col; c.shadowColor = col; c.shadowBlur = blur; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.restore(); };
    const path = (pts, close = true) => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); if (close) c.closePath(); };
    // œil : globe, iris, pupille fendue, reflet, avec clignement
    const eyeBall = (x, y, r, iris, t2, seed = 0, slit = true) => {
        const blink = (Math.sin(t2 * 0.9 + seed * 3) > 0.985) ? 0.12 : 1;
        c.save();
        c.translate(x, y); c.scale(1, blink);
        c.fillStyle = rad(0, 0, 0, r, [[0, '#fff8d8'], [1, '#c9b77a']]);
        c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
        c.fillStyle = iris; c.shadowColor = iris; c.shadowBlur = 10;
        c.beginPath(); c.arc(0, 0, r * 0.72, 0, TAU); c.fill();
        c.shadowBlur = 0;
        c.fillStyle = '#0a0806';
        c.beginPath(); if (slit) c.ellipse(0, 0, r * 0.16, r * 0.62, 0, 0, TAU); else c.arc(0, 0, r * 0.35, 0, TAU); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.85)';
        c.beginPath(); c.arc(-r * 0.3, -r * 0.35, r * 0.18, 0, TAU); c.fill();
        c.restore();
    };

    const drawWolf = (f, t2) => {
        const br = Math.sin(t2 * 2.4) * 2.5; // respiration
        const step = Math.sin(t2 * 3) * 3;
        // fumée qui monte du dos
        for (let i = 0; i < 6; i++) {
            const k = (t2 * 0.6 + i / 6) % 1;
            c.fillStyle = `rgba(60, 50, 50, ${0.25 * (1 - k)})`;
            c.beginPath(); c.arc(-50 + i * 18 + Math.sin(t2 + i) * 6, -50 - k * 90, 8 + k * 16, 0, TAU); c.fill();
        }
        // pattes arrière (côté loin, plus sombres)
        c.fillStyle = '#1a1210';
        path([[-62, 10], [-70, 44 - step], [-80, 66 - step], [-66, 68 - step], [-56, 44], [-44, 14]]); c.fill();
        path([[40, 6], [46, 40 + step], [40, 66 + step], [54, 68 + step], [58, 40], [56, 4]]); c.fill();
        // queue en flammes
        c.save();
        c.translate(-100, -12);
        c.rotate(Math.sin(t2 * 2) * 0.15);
        c.fillStyle = lin(0, 0, -60, -20, [[0, '#2a1d1a'], [1, '#1a1210']]);
        c.beginPath(); c.moveTo(10, 0); c.quadraticCurveTo(-30, -6, -62, -34); c.quadraticCurveTo(-36, 6, 6, 14); c.closePath(); c.fill();
        for (let i = 0; i < 5; i++) glowDot(-60 + Math.sin(t2 * 6 + i) * 4, -34 - i * 5, 5 - i * 0.7, i < 2 ? '#ffb347' : '#ff6a2a', 14);
        c.restore();
        // corps
        c.fillStyle = lin(0, -50, 0, 30, [[0, '#3a2a26'], [0.55, '#241917'], [1, '#120c0b']]);
        c.beginPath();
        c.moveTo(-104, -6);
        c.bezierCurveTo(-96, -48 - br, -40, -52 - br, 8, -44 - br);
        c.bezierCurveTo(36, -42, 52, -52, 64, -58);
        c.lineTo(98, -46); c.lineTo(112, -30); c.lineTo(96, -20);
        c.bezierCurveTo(70, -12, 62, 4, 58, 18);
        c.bezierCurveTo(30, 28 + br, -40, 30 + br, -70, 20);
        c.closePath(); c.fill();
        // fourrure en pointes le long du dos
        c.fillStyle = '#2e211e';
        for (let i = 0; i < 12; i++) {
            const x = -92 + i * 13, y = -44 - br - Math.sin(i * 0.5) * 6;
            path([[x, y + 6], [x + 5, y - 10 - (i % 3) * 3], [x + 10, y + 6]]); c.fill();
        }
        // fissures de braise
        c.save();
        c.strokeStyle = '#ff8a3a'; c.shadowColor = '#ff6a1a'; c.shadowBlur = 10 + Math.sin(t2 * 4) * 4; c.lineWidth = 2.2; c.lineCap = 'round';
        [[[-80, -20], [-60, -26], [-48, -14], [-30, -22]], [[-20, -6], [-2, -16], [14, -8]], [[24, -30], [38, -22], [48, -32]], [[-50, 8], [-34, 2], [-16, 12]]].forEach(seg => { path(seg, false); c.stroke(); });
        c.restore();
        // pattes avant (côté proche)
        c.fillStyle = lin(0, 0, 0, 70, [[0, '#2c201d'], [1, '#140e0c']]);
        path([[-36, 14], [-42, 44 + step], [-52, 68 + step], [-36, 70 + step], [-26, 44], [-18, 16]]); c.fill();
        path([[50, 0], [62, 36 - step], [58, 68 - step], [74, 70 - step], [76, 36], [68, -2]]); c.fill();
        c.fillStyle = '#0c0807';
        [[-44, 70 + step], [66, 70 - step]].forEach(([x, y]) => { c.beginPath(); c.ellipse(x, y, 11, 4, 0, 0, TAU); c.fill(); });
        // tête
        c.fillStyle = lin(60, -90, 120, -20, [[0, '#3c2c28'], [1, '#1c1412']]);
        c.beginPath();
        c.moveTo(56, -56); c.lineTo(66, -96); c.lineTo(80, -70); c.lineTo(92, -94); c.lineTo(98, -64);
        c.bezierCurveTo(116, -56, 132, -44, 138, -34);
        c.lineTo(126, -26); c.lineTo(104, -22); c.bezierCurveTo(90, -24, 74, -30, 64, -40); c.closePath(); c.fill();
        // gueule entrouverte et crocs
        c.fillStyle = '#5a1410';
        path([[104, -24], [134, -32], [128, -18], [106, -16]]); c.fill();
        c.fillStyle = '#efe6d2';
        [[110, -24], [118, -26], [126, -28]].forEach(([x, y]) => { path([[x, y], [x + 3, y + 7], [x + 6, y - 1]]); c.fill(); });
        // truffe et œil
        c.fillStyle = '#0a0606'; c.beginPath(); c.arc(136, -36, 4, 0, TAU); c.fill();
        c.save(); c.translate(96, -58); c.rotate(-0.25);
        c.fillStyle = '#ffcf6a'; c.shadowColor = '#ff8a2a'; c.shadowBlur = 16;
        c.beginPath(); c.ellipse(0, 0, 7, 3.2, 0, 0, TAU); c.fill();
        c.restore();
        // contour éclairé par les braises
        c.strokeStyle = 'rgba(255, 140, 70, 0.35)'; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(-104, -6); c.bezierCurveTo(-96, -48 - br, -40, -52 - br, 8, -44 - br); c.stroke();
    };

    const drawToad = (f, t2) => {
        const puff = f.charging ? 0.14 + Math.sin(t2 * 8) * 0.03 : 0;
        const br = 1 + Math.sin(t2 * 1.8) * 0.03;
        // ondes de l'eau
        for (let i = 0; i < 3; i++) {
            const k = (t2 * 0.4 + i / 3) % 1;
            c.strokeStyle = `rgba(150, 210, 170, ${0.3 * (1 - k)})`; c.lineWidth = 2;
            c.beginPath(); c.ellipse(0, 70, 110 + k * 70, 14 + k * 8, 0, 0, TAU); c.stroke();
        }
        c.save();
        c.scale(br + puff, br + puff * 0.6);
        // pattes arrière
        c.fillStyle = '#2e5530';
        c.beginPath(); c.ellipse(-92, 46, 40, 22, -0.3, 0, TAU); c.fill();
        c.beginPath(); c.ellipse(92, 46, 40, 22, 0.3, 0, TAU); c.fill();
        // corps : vert mousse, ombré par en dessous
        c.fillStyle = rad(-30, -40, 10, 150, [[0, '#7fae5a'], [0.5, '#4d7f3c'], [1, '#22401f']]);
        c.beginPath(); c.ellipse(0, 10, 122, 76, 0, 0, TAU); c.fill();
        // ventre clair, rayé
        c.save();
        c.beginPath(); c.ellipse(0, 40, 82, 42, 0, 0, TAU); c.clip();
        c.fillStyle = lin(0, 0, 0, 80, [[0, '#d9d79a'], [1, '#9fa66a']]); c.fillRect(-90, 0, 180, 90);
        c.strokeStyle = 'rgba(110, 120, 60, 0.45)'; c.lineWidth = 2;
        for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(-90, 18 + i * 10); c.quadraticCurveTo(0, 26 + i * 10, 90, 18 + i * 10); c.stroke(); }
        c.restore();
        // sac vocal (gonfle quand il charge)
        if (puff > 0) { c.fillStyle = `rgba(230, 200, 140, ${0.7})`; c.beginPath(); c.ellipse(0, 28, 50 + puff * 200, 30 + puff * 120, 0, 0, TAU); c.fill(); }
        // pustules avec reflet
        [[-70, -20, 9], [-40, -46, 7], [10, -50, 8], [52, -36, 10], [80, -6, 7], [-92, 6, 6], [30, -14, 5]].forEach(([x, y, r]) => {
            c.fillStyle = '#365f2e'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
            c.fillStyle = 'rgba(220, 255, 180, 0.45)'; c.beginPath(); c.arc(x - r * 0.3, y - r * 0.35, r * 0.35, 0, TAU); c.fill();
        });
        // reflet humide
        c.fillStyle = 'rgba(255, 255, 255, 0.18)'; c.beginPath(); c.ellipse(-46, -40, 34, 10, -0.4, 0, TAU); c.fill();
        // bouche
        c.strokeStyle = '#1b2e18'; c.lineWidth = 4; c.lineCap = 'round';
        c.beginPath(); c.moveTo(-86, -2); c.bezierCurveTo(-40, 14, 40, 14, 86, -2); c.stroke();
        // pattes avant
        c.fillStyle = '#3d6b35';
        [[-60, 66], [60, 66]].forEach(([x, y]) => { c.beginPath(); c.ellipse(x, y, 22, 10, 0, 0, TAU); c.fill(); for (let k = -1; k <= 1; k++) { c.beginPath(); c.arc(x + k * 11, y + 6, 5, 0, TAU); c.fill(); } });
        // yeux sur le dessus de la tête
        [[-50, -60], [50, -60]].forEach(([x, y], i) => {
            c.fillStyle = rad(x, y - 6, 4, 34, [[0, '#6f9e4f'], [1, '#2c4f26']]);
            c.beginPath(); c.arc(x, y, 30, 0, TAU); c.fill();
            eyeBall(x, y - 4, 18, '#e6b520', t2, i);
        });
        c.restore();
        // gouttes qui tombent
        for (let i = 0; i < 2; i++) {
            const k = (t2 * 0.8 + i * 0.5) % 1;
            c.fillStyle = `rgba(170, 220, 190, ${1 - k})`;
            c.beginPath(); c.ellipse(-30 + i * 70, 40 + k * 40, 3, 5, 0, 0, TAU); c.fill();
        }
    };

    const drawWisp = (f, t2) => {
        // halo
        c.fillStyle = rad(0, -10, 10, 140, [[0, 'rgba(140, 220, 255, 0.45)'], [1, 'rgba(140, 220, 255, 0)']]);
        c.fillRect(-150, -160, 300, 300);
        // traînées sous la flamme
        for (let i = 0; i < 4; i++) {
            c.strokeStyle = `rgba(150, 220, 255, ${0.35 - i * 0.07})`; c.lineWidth = 6 - i;
            c.beginPath(); c.moveTo(-10 + i * 7, 40);
            c.bezierCurveTo(-30 + Math.sin(t2 * 3 + i) * 20, 80, 20 + Math.cos(t2 * 2 + i) * 20, 100, Math.sin(t2 * 2 + i) * 30, 130 - i * 8);
            c.stroke();
        }
        // flamme : couches en goutte qui ondulent
        const layer = (s, col, wob) => {
            c.fillStyle = col;
            c.beginPath();
            c.moveTo(0, -120 * s + Math.sin(t2 * 7) * wob);
            c.bezierCurveTo(60 * s + Math.sin(t2 * 5) * wob, -60 * s, 70 * s, 20 * s, 0, 50 * s);
            c.bezierCurveTo(-70 * s, 20 * s, -60 * s + Math.cos(t2 * 6) * wob, -60 * s, 0, -120 * s + Math.sin(t2 * 7) * wob);
            c.fill();
        };
        c.save(); c.shadowColor = '#7fd6ff'; c.shadowBlur = 30;
        layer(1, 'rgba(70, 150, 255, 0.55)', 10);
        c.restore();
        layer(0.8, 'rgba(110, 200, 255, 0.75)', 8);
        layer(0.58, 'rgba(190, 240, 255, 0.9)', 6);
        layer(0.34, '#ffffff', 4);
        // visage creux
        c.fillStyle = 'rgba(20, 40, 90, 0.85)';
        c.beginPath(); c.ellipse(-16, -14, 8, 12, 0.2, 0, TAU); c.fill();
        c.beginPath(); c.ellipse(16, -14, 8, 12, -0.2, 0, TAU); c.fill();
        c.beginPath(); c.ellipse(0, 14, 10, 5 + Math.abs(Math.sin(t2 * 3)) * 4, 0, 0, TAU); c.fill();
        // étincelles en orbite
        for (let i = 0; i < 7; i++) {
            const a = t2 * 1.6 + (i / 7) * TAU;
            glowDot(Math.cos(a) * 80, -20 + Math.sin(a) * 30, 3, i % 2 ? '#bfefff' : '#ffffff', 12);
        }
    };

    const drawSentinel = (f, t2) => {
        const sway = Math.sin(t2 * 1.4) * 2;
        // cape qui ondule derrière
        c.fillStyle = lin(0, -90, 0, 90, [[0, '#5a1420'], [1, '#2a070d']]);
        c.beginPath(); c.moveTo(-46, -86);
        c.lineTo(46, -86);
        c.bezierCurveTo(60, 0, 70 + Math.sin(t2 * 2) * 8, 60, 58, 96);
        for (let i = 0; i <= 6; i++) c.lineTo(58 - i * 20, 96 + (i % 2 ? 10 : 0) + Math.sin(t2 * 3 + i) * 4);
        c.bezierCurveTo(-70 + Math.cos(t2 * 2) * 8, 60, -60, 0, -46, -86); c.fill();
        const steel = (x0, x1) => lin(x0, 0, x1, 0, [[0, '#3a404c'], [0.35, '#9aa3b4'], [0.5, '#e4e8f0'], [0.65, '#8a93a4'], [1, '#2c313b']]);
        // jambes
        c.fillStyle = steel(-40, -6); c.fillRect(-40, 40, 30, 58);
        c.fillStyle = steel(6, 40); c.fillRect(6, 40, 30, 58);
        c.fillStyle = '#2a2f38'; c.fillRect(-44, 94, 38, 10); c.fillRect(2, 94, 38, 10);
        // torse en plaques
        c.fillStyle = steel(-58, 58);
        c.beginPath(); c.moveTo(-56, -80); c.lineTo(56, -80); c.lineTo(46, 0); c.lineTo(36, 46); c.lineTo(-36, 46); c.lineTo(-46, 0); c.closePath(); c.fill();
        c.strokeStyle = 'rgba(20, 22, 28, 0.6)'; c.lineWidth = 2;
        [[-46, -30, 46, -30], [-42, 0, 42, 0], [0, -80, 0, 46]].forEach(([a, b, d, e]) => { c.beginPath(); c.moveTo(a, b); c.lineTo(d, e); c.stroke(); });
        // emblème rouge
        c.fillStyle = '#c02a3a'; c.shadowColor = '#ff3a4a'; c.shadowBlur = 8;
        path([[0, -66], [12, -46], [0, -24], [-12, -46]]); c.fill(); c.shadowBlur = 0;
        // rivets
        c.fillStyle = '#f2f4f8';
        for (const [x, y] of [[-48, -74], [48, -74], [-40, 40], [40, 40], [-44, -6], [44, -6]]) { c.beginPath(); c.arc(x, y, 2.2, 0, TAU); c.fill(); }
        // bras : épaule → coude → main (gauche derrière le bouclier, droite sur la lance)
        const spearRot = -0.1 + (f.charging ? -0.5 : 0);
        const grip = [70 + 40 * Math.sin(spearRot), 30 - 40 * Math.cos(spearRot)];
        const limb = (pts, w) => {
            c.lineCap = 'round'; c.lineJoin = 'round';
            c.strokeStyle = '#23272f'; c.lineWidth = w + 4;
            c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(([x, y]) => c.lineTo(x, y)); c.stroke();
            c.strokeStyle = steel(pts[0][0] - w, pts[0][0] + w); c.lineWidth = w;
            c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(([x, y]) => c.lineTo(x, y)); c.stroke();
            // coude en rotule
            c.fillStyle = '#c9cfdb'; c.beginPath(); c.arc(pts[1][0], pts[1][1], w * 0.42, 0, TAU); c.fill();
        };
        limb([[-60, -70], [-80, -30 + sway * 0.5], [-78, -10 + sway]], 18);
        limb([[60, -70], [80, -34], [grip[0] - 4, grip[1]]], 18);
        // épaulières
        [-1, 1].forEach(sd => {
            c.fillStyle = steel(sd * 50 - 26, sd * 50 + 26);
            c.beginPath(); c.ellipse(sd * 58, -76, 30, 20, sd * 0.3, Math.PI, TAU); c.fill();
            c.fillRect(sd > 0 ? 30 : -86, -78, 56, 10);
        });
        // casque
        c.fillStyle = steel(-34, 34);
        c.beginPath(); c.moveTo(-32, -96); c.quadraticCurveTo(-34, -146, 0, -152); c.quadraticCurveTo(34, -146, 32, -96); c.lineTo(22, -84); c.lineTo(-22, -84); c.closePath(); c.fill();
        // crête
        c.fillStyle = '#8a1424'; path([[-4, -152], [4, -152], [10, -176 + sway], [-2, -170 + sway]]); c.fill();
        // visière en T qui brille
        c.fillStyle = '#0c0d12'; c.fillRect(-24, -126, 48, 9); c.fillRect(-5, -126, 10, 30);
        const pulse = 0.6 + 0.4 * Math.sin(t2 * 3);
        c.save(); c.fillStyle = `rgba(255, 70, 70, ${pulse})`; c.shadowColor = '#ff2a2a'; c.shadowBlur = 18;
        c.fillRect(-22, -124, 44, 5); c.fillRect(-3, -124, 6, 24); c.restore();
        // bouclier
        c.save(); c.translate(-82, -6 + sway);
        c.fillStyle = steel(-34, 34);
        c.beginPath(); c.moveTo(-32, -66); c.lineTo(32, -66); c.lineTo(32, 20); c.quadraticCurveTo(0, 74, -32, 20); c.closePath(); c.fill();
        c.strokeStyle = '#d9b45a'; c.lineWidth = 4; c.stroke();
        c.fillStyle = '#7a1020'; c.beginPath(); c.moveTo(0, -52); c.lineTo(18, -20); c.lineTo(0, 30); c.lineTo(-18, -20); c.closePath(); c.fill();
        c.restore();
        // lance avec fanion
        c.save(); c.translate(70, 30); c.rotate(spearRot);
        c.fillStyle = lin(-3, 0, 3, 0, [[0, '#5a4630'], [1, '#2c2218']]); c.fillRect(-3, -200, 6, 220);
        c.fillStyle = steel(-9, 9); path([[0, -236], [10, -200], [-10, -200]]); c.fill();
        c.fillStyle = '#b02030'; c.beginPath(); c.moveTo(3, -196);
        c.quadraticCurveTo(26, -190 + Math.sin(t2 * 4) * 6, 46, -186 + Math.sin(t2 * 4 + 1) * 8); c.lineTo(3, -172); c.closePath(); c.fill();
        c.restore();
        // gantelet refermé sur la lance
        c.fillStyle = steel(grip[0] - 12, grip[0] + 12);
        c.beginPath(); c.roundRect(grip[0] - 11, grip[1] - 9, 22, 18, 6); c.fill();
        c.strokeStyle = 'rgba(20, 22, 28, 0.7)'; c.lineWidth = 1.5;
        for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(grip[0] - 9, grip[1] + k * 5); c.lineTo(grip[0] + 9, grip[1] + k * 5); c.stroke(); }
    };

    const drawDrone = (f, t2) => {
        // flamme de poussée sous le drone
        c.fillStyle = rad(0, 64, 2, 40, [[0, 'rgba(160, 255, 210, 0.8)'], [1, 'rgba(160, 255, 210, 0)']]);
        c.beginPath(); c.ellipse(0, 70, 22, 34 + Math.sin(t2 * 20) * 6, 0, 0, TAU); c.fill();
        // bras porte-rotors
        c.strokeStyle = '#4a5262'; c.lineWidth = 7; c.lineCap = 'round';
        c.beginPath(); c.moveTo(-40, -20); c.lineTo(-86, -46); c.moveTo(40, -20); c.lineTo(86, -46); c.stroke();
        // rotors : disques flous
        [-86, 86].forEach(x => {
            c.fillStyle = 'rgba(200, 220, 240, 0.18)';
            c.beginPath(); c.ellipse(x, -50, 40, 7, 0, 0, TAU); c.fill();
            c.strokeStyle = 'rgba(230, 240, 255, 0.6)'; c.lineWidth = 2;
            const a = t2 * 40;
            c.beginPath(); c.moveTo(x - Math.cos(a) * 38, -50 - Math.sin(a) * 3); c.lineTo(x + Math.cos(a) * 38, -50 + Math.sin(a) * 3); c.stroke();
            c.fillStyle = '#2a2f38'; c.beginPath(); c.arc(x, -50, 5, 0, TAU); c.fill();
        });
        // coque sphérique métallique
        c.fillStyle = rad(-16, -18, 4, 60, [[0, '#e8ecf4'], [0.35, '#8c95a8'], [1, '#2a2f3a']]);
        c.beginPath(); c.arc(0, 0, 50, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(20, 24, 32, 0.6)'; c.lineWidth = 1.5;
        c.beginPath(); c.ellipse(0, 0, 50, 16, 0, 0, TAU); c.stroke();
        c.beginPath(); c.moveTo(0, -50); c.lineTo(0, 50); c.stroke();
        // anneau tournant
        c.save(); c.rotate(t2 * 0.8);
        c.strokeStyle = '#d9b45a'; c.lineWidth = 3; c.setLineDash([10, 8]);
        c.beginPath(); c.arc(0, 0, 60, 0, TAU); c.stroke(); c.setLineDash([]);
        c.restore();
        // œil-objectif qui balaie
        const look = Math.sin(t2 * 1.3) * 12;
        c.fillStyle = '#10141c'; c.beginPath(); c.arc(look, 4, 20, 0, TAU); c.fill();
        c.fillStyle = rad(look, 4, 0, 16, [[0, '#ffffff'], [0.3, '#9ff2c4'], [1, '#1f7a52']]);
        c.save(); c.shadowColor = '#9ff2c4'; c.shadowBlur = 20; c.beginPath(); c.arc(look, 4, 14, 0, TAU); c.fill(); c.restore();
        // rayon de scan
        c.fillStyle = 'rgba(160, 255, 210, 0.08)';
        c.beginPath(); c.moveTo(look, 18); c.lineTo(look - 50, 150); c.lineTo(look + 50, 150); c.closePath(); c.fill();
        // bras de réparation avec clé
        c.strokeStyle = '#6a7384'; c.lineWidth = 5;
        c.beginPath(); c.moveTo(30, 34); c.lineTo(50, 60 + Math.sin(t2 * 3) * 6); c.lineTo(66, 54); c.stroke();
        c.fillStyle = '#c9ced8'; c.beginPath(); c.arc(68, 54, 6, 0, TAU); c.fill();
    };

    const drawShard = (f, t2) => {
        c.fillStyle = rad(0, 0, 4, 110, [[0, 'rgba(170, 110, 255, 0.4)'], [1, 'rgba(170, 110, 255, 0)']]);
        c.fillRect(-120, -120, 240, 240);
        c.save(); c.rotate(Math.sin(t2 * 1.5) * 0.12);
        const facets = [
            [[0, -110], [26, -20], [0, 10], [-18, -30]],
            [[26, -20], [46, 20], [0, 90], [0, 10]],
            [[-18, -30], [0, 10], [0, 90], [-44, 24]],
            [[-44, 24], [-70, -40], [-18, -30]],
            [[46, 20], [72, -30], [26, -20]],
        ];
        const shades = ['#c9a2ff', '#7a3ad8', '#5a24b0', '#9a6af0', '#b080ff'];
        facets.forEach((pts, i) => { c.fillStyle = shades[i]; path(pts); c.fill(); c.strokeStyle = 'rgba(240, 220, 255, 0.7)'; c.lineWidth = 1.2; c.stroke(); });
        c.restore();
        glowDot(0, -6, 7 + Math.sin(t2 * 5) * 2, '#f6eaff', 22);
        for (let i = 0; i < 4; i++) {
            const a = t2 * 2 + (i / 4) * TAU;
            c.fillStyle = '#b080ff';
            c.save(); c.translate(Math.cos(a) * 70, Math.sin(a) * 26); c.rotate(a);
            path([[0, -10], [6, 0], [0, 10], [-6, 0]]); c.fill(); c.restore();
        }
    };

    const drawDevourer = (f, t2, k) => {
        const R = Math.min(W, H) / k;
        const ph2 = s.phase === 2;
        const col = ph2 ? '220, 60, 90' : '130, 90, 240';
        // aura immense
        c.fillStyle = rad(0, -20, R * 0.05, R * 0.75, [[0, `rgba(${col}, 0.5)`], [1, `rgba(${col}, 0)`]]);
        c.fillRect(-R, -R, R * 2, R * 2);
        // débris en orbite
        for (let i = 0; i < 14; i++) {
            const a = t2 * (0.3 + (i % 3) * 0.1) + i;
            const rr = 230 + (i % 4) * 30;
            c.fillStyle = `rgba(${col}, 0.6)`;
            c.save(); c.translate(Math.cos(a) * rr, -30 + Math.sin(a) * rr * 0.35); c.rotate(a * 2);
            path([[0, -7], [5, 0], [0, 7], [-5, 0]]); c.fill(); c.restore();
        }
        // bras d'ombre : bandes effilées
        for (let i = 0; i < 6; i++) {
            const sd = i % 2 ? 1 : -1, n = Math.floor(i / 2);
            const wav = Math.sin(t2 * 1.4 + i) * 34;
            const x0 = sd * 70, y0 = 10 + n * 40;
            const x3 = sd * (360 + n * 20), y3 = 40 + n * 70 + wav;
            c.fillStyle = lin(x0, y0, x3, y3, [[0, '#0a0614'], [0.7, `rgba(${col}, 0.55)`], [1, `rgba(${col}, 0)`]]);
            c.beginPath();
            c.moveTo(x0, y0 - 18 + n * 2);
            c.bezierCurveTo(sd * (190 + n * 40), -70 + wav, sd * (270 + n * 30), 110 + wav, x3, y3);
            c.bezierCurveTo(sd * (260 + n * 30), 130 + wav, sd * (180 + n * 40), -30 + wav, x0, y0 + 18 - n * 2);
            c.fill();
        }
        // corps : manteau découpé, avec une nébuleuse étoilée à l'intérieur
        c.save();
        c.beginPath();
        c.moveTo(0, -250); c.lineTo(46, -200); c.lineTo(86, -232); c.lineTo(100, -150);
        c.quadraticCurveTo(190, -40, 150, 170);
        for (let i = 0; i <= 8; i++) c.lineTo(150 - i * 37.5, 170 + (i % 2 ? 26 : 0) + Math.sin(t2 * 2 + i) * 6);
        c.quadraticCurveTo(-190, -40, -100, -150); c.lineTo(-86, -232); c.lineTo(-46, -200); c.closePath();
        c.fillStyle = '#06030c'; c.fill();
        c.clip();
        c.fillStyle = rad(30, 40, 10, 260, [[0, `rgba(${col}, 0.55)`], [0.5, 'rgba(40, 20, 90, 0.35)'], [1, 'rgba(0, 0, 0, 0)']]);
        c.fillRect(-200, -260, 400, 460);
        for (let i = 0; i < 70; i++) {
            const tw = 0.4 + 0.6 * Math.abs(Math.sin(t2 * 2 + i));
            c.fillStyle = `rgba(255, 255, 255, ${tw})`;
            c.fillRect(((i * 73) % 300) - 150, ((i * 131) % 420) - 240, 1.6, 1.6);
        }
        c.restore();
        c.strokeStyle = `rgba(${col}, 0.95)`; c.lineWidth = 3;
        c.save(); c.shadowColor = `rgb(${col})`; c.shadowBlur = 20;
        c.beginPath(); c.moveTo(0, -250); c.lineTo(46, -200); c.lineTo(86, -232); c.lineTo(100, -150); c.quadraticCurveTo(190, -40, 150, 170); c.stroke();
        c.beginPath(); c.moveTo(0, -250); c.lineTo(-46, -200); c.lineTo(-86, -232); c.lineTo(-100, -150); c.quadraticCurveTo(-190, -40, -150, 170); c.stroke();
        c.restore();
        // couronne : pointes et étoiles
        for (let i = 0; i < 9; i++) {
            const a = -Math.PI / 2 + (i - 4) * 0.27;
            const x = Math.cos(a) * 200, y = -70 + Math.sin(a) * 200;
            c.fillStyle = '#120a20';
            path([[x * 0.82, y * 0.82 - 10], [x, y], [x * 0.86 + 8, y * 0.86]]); c.fill();
            glowDot(x, y, 3.5 + (i % 2) * 2 + Math.sin(t2 * 3 + i), '#fff3c8', 18);
        }
        // masque pâle
        c.fillStyle = lin(0, -200, 0, -110, [[0, '#f2ecf8'], [1, '#a89cc0']]);
        c.beginPath(); c.moveTo(0, -205); c.quadraticCurveTo(44, -196, 40, -150); c.quadraticCurveTo(28, -112, 0, -104); c.quadraticCurveTo(-28, -112, -40, -150); c.quadraticCurveTo(-44, -196, 0, -205); c.fill();
        c.fillStyle = '#0a0612';
        c.beginPath(); c.ellipse(-17, -160, 11, 7, 0.3, 0, TAU); c.fill();
        c.beginPath(); c.ellipse(17, -160, 11, 7, -0.3, 0, TAU); c.fill();
        glowDot(-17, -160, 3.5, ph2 ? '#ff4a6a' : '#e2c8ff', 20);
        glowDot(17, -160, 3.5, ph2 ? '#ff4a6a' : '#e2c8ff', 20);
        c.strokeStyle = 'rgba(40, 20, 60, 0.6)'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(0, -140); c.lineTo(0, -112); c.stroke();
        // cœur de néant avec disque d'accrétion qui tourne
        const pulse = 34 + Math.sin(t2 * 3) * 5 + (f.charging ? 22 : 0);
        c.save(); c.translate(0, -10);
        for (let i = 0; i < 3; i++) {
            c.save(); c.rotate(t2 * (0.6 + i * 0.3) * (i % 2 ? -1 : 1));
            c.strokeStyle = `rgba(${i === 1 ? '255, 220, 160' : col}, ${0.7 - i * 0.15})`; c.lineWidth = 4 - i;
            c.beginPath(); c.ellipse(0, 0, pulse * (2 + i * 0.5), pulse * (0.55 + i * 0.12), 0.2 * i, 0, TAU); c.stroke();
            c.restore();
        }
        c.fillStyle = rad(0, 0, 0, pulse * 1.6, [[0, '#000'], [0.55, '#000'], [0.75, `rgba(${col}, 0.95)`], [1, `rgba(${col}, 0)`]]);
        c.beginPath(); c.arc(0, 0, pulse * 1.6, 0, TAU); c.fill();
        c.restore();
    };

    const drawFoe = (f, t2) => {
        const p = foePos(f);
        const k = (Math.min(W, H) / 420) * f.size;
        const sh = f.shake > 0 ? rand(-6, 6) * f.shake * 3 : 0;
        // ombre au sol
        if (f.kind !== 'devourer') {
            c.fillStyle = 'rgba(0, 0, 0, 0.45)';
            c.beginPath(); c.ellipse(p.x, p.y + 80 * k, 110 * k, 16 * k, 0, 0, TAU); c.fill();
        }
        c.save();
        const hover = f.kind === 'wisp' || f.kind === 'drone' || f.kind === 'shard' ? Math.sin(t2 * 2 + p.x) * 10 : Math.sin(t2 * 1.8 + p.x) * 2;
        c.translate(p.x + sh, p.y + hover);
        c.scale(k, k);
        // coup reçu : flash blanc
        if (f.shake > 0.15) c.filter = 'brightness(2.2)';
        ({ wolf: drawWolf, toad: drawToad, wisp: drawWisp, sentinel: drawSentinel, drone: drawDrone, shard: drawShard, devourer: drawDevourer })[f.kind]?.(f, t2, k);
        c.filter = 'none';
        c.restore();
    };

    // attaque chargée : il faut se défendre — alerte bien visible
    const drawWarning = (t2) => {
        const f = alive().find(x => x.charging);
        if (!f) return;
        const p = foePos(f);
        const pulse = 0.5 + 0.5 * Math.sin(t2 * 9);
        // vignette rouge qui bat
        c.fillStyle = rad(W / 2, H / 2, Math.min(W, H) * 0.3, Math.max(W, H) * 0.75, [[0, 'rgba(255, 0, 0, 0)'], [1, `rgba(200, 10, 30, ${0.25 + pulse * 0.25})`]]);
        c.fillRect(0, 0, W, H);
        // énergie aspirée vers l'ennemi
        for (let i = 0; i < 18; i++) {
            const a = (i / 18) * TAU + t2 * 0.7;
            const k = (t2 * 1.2 + i * 0.13) % 1;
            const r = (1 - k) * Math.max(W, H) * 0.45;
            c.fillStyle = `rgba(255, ${120 + i * 6}, 120, ${k})`;
            c.beginPath(); c.arc(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r * 0.6, 2 + k * 3, 0, TAU); c.fill();
        }
        // anneau de compte à rebours qui se resserre
        const ring = 1 - Math.min(1, f.eatb);
        c.strokeStyle = `rgba(255, 80, 80, ${0.5 + pulse * 0.5})`; c.lineWidth = 4;
        c.beginPath(); c.arc(p.x, p.y, 40 + ring * Math.min(W, H) * 0.35, 0, TAU); c.stroke();
        // bandeau
        const txt = t('⚠ ATTAQUE CHARGÉE · DÉFENDS-TOI !');
        c.font = `800 ${Math.max(14, Math.min(26, W * 0.03))}px "JetBrains Mono", monospace`;
        c.textAlign = 'center';
        const y = H * 0.3;
        const w = c.measureText(txt).width + 40;
        c.fillStyle = `rgba(30, 0, 6, ${0.7 + pulse * 0.2})`;
        c.fillRect(W / 2 - w / 2, y - 26, w, 40);
        c.strokeStyle = '#ff4a5a'; c.lineWidth = 2; c.strokeRect(W / 2 - w / 2, y - 26, w, 40);
        c.fillStyle = pulse > 0.5 ? '#ffffff' : '#ffb0b0';
        c.fillText(txt, W / 2, y + 2);
    };

    const TAU = Math.PI * 2;
    const draw = (dt, t2) => {
        const bgc = fight?.bg || ['#16213a', '#05070c'];
        const bg = c.createRadialGradient(W / 2, H * 0.5, 0, W / 2, H * 0.5, Math.max(W, H) * 0.7);
        bg.addColorStop(0, bgc[0]); bg.addColorStop(1, bgc[1]);
        c.fillStyle = bg; c.fillRect(0, 0, W, H);
        if (fight?.boss) {
            for (let i = 0; i < 80; i++) {
                c.fillStyle = `rgba(255, 255, 255, ${0.2 + 0.5 * Math.abs(Math.sin(t2 + i))})`;
                c.fillRect((i * 97.3) % W, (i * 53.7) % (H * 0.7), 1.5, 1.5);
            }
        }
        c.fillStyle = 'rgba(255, 255, 255, 0.05)';
        c.beginPath(); c.ellipse(W / 2, H * 0.86, W * 0.45, H * 0.07, 0, 0, TAU); c.fill();
        c.save();
        if (shake > 0) c.translate(rand(-1, 1) * shake * 10, rand(-1, 1) * shake * 6);
        if (s) {
            s.foes.forEach(f => { f.shake = Math.max(0, (f.shake || 0) - dt); if (f.hp > 0) drawFoe(f, t2); });
            if (s.cat && catOk) {
                const p = catPos();
                c.imageSmoothingEnabled = false;
                const fr = Math.floor(t2 * 3) % 2 ? [3, 3] : [3, 3];
                c.drawImage(catImg, fr[0] * 32, fr[1] * 32, 32, 32, p.x - 32, p.y - 64, 64, 64);
                c.imageSmoothingEnabled = true;
            }
        }
        for (let i = fx.length - 1; i >= 0; i--) {
            const p = fx[i];
            p.life += dt;
            if (p.life > p.max) { fx.splice(i, 1); continue; }
            p.vy += (p.kind === 'cure' ? -40 : p.kind === 'blade' ? 0 : 300) * dt;
            p.x += p.vx * dt; p.y += p.vy * dt;
            c.globalAlpha = 1 - p.life / p.max;
            c.fillStyle = p.col;
            if (p.kind === 'blade') { c.save(); c.translate(p.x, p.y); c.rotate(0.15); c.fillRect(-2, -26, 4, 40); c.restore(); }
            else if (p.kind === 'ice') { c.save(); c.translate(p.x, p.y); c.rotate(p.life * 6); c.fillRect(-3, -6, 6, 12); c.restore(); }
            else { c.beginPath(); c.arc(p.x, p.y, p.kind === 'fire' ? 5 : 3, 0, TAU); c.fill(); }
        }
        c.globalAlpha = 1;
        c.restore();
        if (s && !s.over) drawWarning(t2);
        c.textAlign = 'center';
        for (let i = nums.length - 1; i >= 0; i--) {
            const n = nums[i];
            n.t += dt;
            if (n.t > 1.1) { nums.splice(i, 1); continue; }
            c.globalAlpha = 1 - Math.max(0, n.t - 0.6) / 0.5;
            c.font = `700 ${n.txt.length > 6 ? 18 : 28}px "JetBrains Mono", monospace`;
            c.lineWidth = 4;
            c.strokeStyle = 'rgba(0, 0, 0, 0.8)';
            c.strokeText(n.txt, n.x, n.y - n.t * 40);
            c.fillStyle = n.color;
            c.fillText(n.txt, n.x, n.y - n.t * 40);
        }
        c.globalAlpha = 1;
        if (flash > 0) { c.fillStyle = `rgba(255, 255, 255, ${flash * 0.3})`; c.fillRect(0, 0, W, H); }
    };

    const update = (dt) => {
        shake = Math.max(0, shake - dt);
        flash = Math.max(0, flash - dt * 2.5);
        lunge *= Math.pow(0.02, dt);
        if (!s || s.over || s.busy || s.sub || s.reviving) return;
        const was = s.atb;
        s.atb = Math.min(1, s.atb + (dt / 2.4) * (s.a.haste || 1) * (s.rb?.haste || 1));
        if (was < 1 && s.atb >= 1) { renderMenu(); sfx.hover(); }
        if (s.atb < 1) {
            for (const f of alive()) {
                f.eatb += dt / f.speed;
                if (f.eatb >= 1) {
                    s.busy = true;
                    foeTurn(f);
                    setTimeout(() => { if (s && !s.over) { s.busy = false; renderMenu(); } }, 800);
                    break;
                }
            }
        }
        renderBars();
    };

    let raf = 0, last = 0;
    const loop = (ms) => {
        const dt = Math.min((ms - last) / 1000, 0.05);
        last = ms;
        if (s && (W < 2 || H < 2)) ({ c, W, H } = fitCanvas(cv));
        if (s) { update(dt); if (W >= 2 && H >= 2) draw(dt, ms / 1000); }
        raf = gameOn('arena') && s ? requestAnimationFrame(loop) : 0;
    };
    const run = () => {
        if (raf || !s) return;
        ({ c, W, H } = fitCanvas(cv));
        last = performance.now();
        raf = requestAnimationFrame(loop);
    };
    document.addEventListener('gameopen', (e) => { if (e.detail === 'arena') { if (!s) renderCamp(); run(); } });
    document.addEventListener('gameresume', (e) => { if (e.detail === 'arena') run(); });
    window.addEventListener('resize', () => { if (raf) ({ c, W, H } = fitCanvas(cv)); });
    document.addEventListener('trophy', () => { if (!s) renderCamp(); });
    document.addEventListener('relic', () => { if (!s) renderCamp(); });

    renderCamp();
    return {
        reset() { store.del(KEY); store.del(GEAR_KEY); rec = { won: {} }; s = null; fightBox.hidden = true; camp.hidden = false; renderCamp(); },
        start,
        state: () => s,
        choose: (id) => choose(id), // tests
    };
})();

/* =====================================================================
   2 bis. ROUTE ROYALE — la Regalia de nuit, vue de dessus, sur une
   route droite à 3 voies. La circulation roule à des vitesses
   différentes et certaines voitures changent de voie (clignotant),
   des barrières de travaux bloquent une voie, les flaques d'huile
   font déraper. La vitesse grimpe vite, l'essence part vite.
   ===================================================================== */
const roadTrip = (() => {
    const panel = document.getElementById('game-road');
    if (!panel) return { reset() { } };
    const KEY = 'eliasPortfolio.road.v2'; // la route a changé : nouveaux records

    panel.innerHTML = `
        <div class="game-bar">
            <button class="game-back" type="button">${t('◂ Mini-jeux')}</button>
            <p class="game-title">🚗 Route Royale</p>
        </div>
        <div class="race-stage road-stage">
            <canvas class="race-canvas" aria-label="${t('Route de nuit')}"></canvas>
            <div class="race-hud road-hud">
                <p class="race-time road-dist">0.00 km</p>
                <p class="road-speed">0 km/h</p>
                <p class="race-best">${t('RECORD')} <b>—</b></p>
                <p class="road-hp" aria-label="${t('Carrosserie')}"></p>
                <div class="road-fuel"><i class="fas fa-gas-pump" aria-hidden="true"></i><span><b></b></span></div>
            </div>
            <p class="race-center"></p>
            <div class="race-overlay"></div>
        </div>
        <p class="fish-tip race-tip">${t('Change de voie avec ← → (ou A / D), ou touche la gauche / la droite de la route. Attention aux clignotants, aux barrières et aux flaques d\'huile. Ramasse les jerricans avant la panne sèche.')}</p>`;

    const $ = (sel) => panel.querySelector(sel);
    const cv = $('canvas');
    const stage = $('.road-stage');
    const overlay = $('.race-overlay');
    const center = $('.race-center');
    let c, W, H;
    const TAU = Math.PI * 2;

    let best = Number(store.get(KEY)) || 0; // en mètres
    const km = (m) => `${(m / 1000).toFixed(2)} km`;
    const renderBest = () => {
        $('.race-best b').textContent = best ? km(best) : '—';
        setHubRecord('road', best ? km(best) : '—');
    };

    let state = 'menu'; // menu | count | run | end
    let T = 0, dist = 0, speed = 0, fuel = 100, hp = 3, inv = 0, shake = 0, countT = 0, slide = 0, lock = 0;
    let lane = 1, laneX = 1, things = [], nextRow = 0, cause = '';
    (window.gamePlaying ||= {}).road = () => state === 'count' || state === 'run';

    /* --- géométrie (recalculée à chaque taille d'écran) --- */
    let G = null;
    const geo = () => {
        const roadW = Math.min(W * 0.56, Math.max(240, H * 0.62));
        const laneW = roadW / 3;
        const carW = laneW * 0.42, carL = carW * 2;
        G = { roadW, laneW, x0: W / 2 - roadW / 2, carW, carL, carY: H * 0.8, ppm: H / 78 };
    };
    const laneCenter = (l) => G.x0 + G.laneW * (l + 0.5);
    const yOf = (m) => G.carY - (m - dist) * G.ppm;

    const showMenu = () => {
        state = 'menu';
        stage.classList.remove('is-running');
        overlay.hidden = false;
        overlay.innerHTML = `
            <p class="cook-k">${t('ROUTE ROYALE')}</p>
            <h3>${t('Road trip de nuit')}</h3>
            <p class="cook-sub">${t('Va le plus loin possible. La route accélère, l\'essence baisse.')}</p>
            <p class="cook-sub">${t('Record')} : ${best ? km(best) : '—'}</p>
            <button class="btn road-go" type="button">${t('▶ En voiture')}</button>`;
        overlay.querySelector('.road-go').addEventListener('click', start);
        center.textContent = '';
    };

    const start = () => {
        overlay.hidden = true;
        dist = 0; speed = 0; fuel = 100; hp = 3; inv = 0; shake = 0; slide = 0; lock = 0;
        lane = 1; laneX = 1;
        things = [];
        nextRow = 40;
        countT = 3;
        state = 'count';
        stage.classList.add('is-running');
        renderHud();
    };

    const end = () => {
        state = 'end';
        stage.classList.remove('is-running');
        const record = dist > best;
        if (record) { best = dist; store.set(KEY, String(Math.round(best))); }
        renderBest();
        sfx.back();
        overlay.hidden = false;
        overlay.innerHTML = `
            <p class="cook-k">${cause === 'fuel' ? t('PANNE SÈCHE') : t('LA REGALIA EST CABOSSÉE')}</p>
            <h3>${km(dist)}</h3>
            <p class="cook-sub">${cause === 'fuel' ? t('Plus une goutte d\'essence. Ignis va devoir pousser.') : t('Trois chocs, c\'est trop. Cid ne va pas être content.')}</p>
            ${record ? `<p class="fish-catch-record">${t('★ NOUVEAU RECORD ★')}</p>` : ''}
            <div class="cook-actions"><button class="btn" type="button">${t('↺ Reprendre la route')}</button></div>`;
        overlay.querySelector('button').addEventListener('click', start);
    };

    const steer = (dir) => {
        if ((state !== 'run' && state !== 'count') || lock > 0) return;
        const n = Math.max(0, Math.min(2, lane + dir));
        if (n !== lane) { lane = n; sfx.hover(); }
    };

    /* --- contrôles --- */
    window.addEventListener('keydown', (e) => {
        if (!gameOn('road') || e.target.closest?.('input, textarea')) return;
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') { e.preventDefault(); steer(-1); }
        else if (e.code === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); steer(1); }
        else if (e.code === 'Space' && !e.repeat) {
            e.preventDefault();
            if (state === 'menu' || state === 'end') start();
        }
    });
    stage.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button') || (state !== 'run' && state !== 'count')) return;
        e.preventDefault();
        const r = stage.getBoundingClientRect();
        steer(e.clientX - r.left < r.width / 2 ? -1 : 1);
    });

    /* --- logique --- */
    const CAR_COLORS = [205, 0, 45, 130, 280, 30, 190, 340];
    const isSolid = (o) => o.kind !== 'can' && !o.hit;
    const hitLen = (o) => o.kind === 'truck' ? G.carL * 1.7 : o.kind === 'oil' ? G.carL * 0.6 : o.kind === 'can' ? G.carW * 0.6 : o.kind === 'barrier' ? G.carW * 0.5 : G.carL;
    // Simule les prochaines secondes : peut-on encore passer ? (voitures à vitesse constante,
    // une voiture qui clignote occupe ses deux voies, un changement de voie prend ~0,25 s)
    const passable = (list) => {
        if (!G) return true;
        const STEP = 0.05, MOVE = 5, v = Math.max(speed, 20);
        const obs = list.filter(isSolid).map(o => {
            const lanes = [Math.round(o.laneX)];
            if (o.turn && o.turn.dir) lanes.push(o.lane, o.lane + o.turn.dir);
            const reach = ((G.carL + hitLen(o)) * 0.4) / G.ppm * 1.25 + 1; // mètres, avec marge
            // une voiture rattrape celle de devant puis la suit : on prend la plus lente des deux
            const ahead = list.filter(q => q !== o && isSolid(q) && q.kind !== 'oil' && Math.round(q.laneX) === Math.round(o.laneX) && q.m > o.m && q.m - o.m < 40);
            const ov = Math.min(o.v || 0, ...ahead.map(q => q.v || 0));
            return { lanes, d: o.m - dist, rel: v - ov, reach };
        });
        const last = obs.reduce((m, o) => Math.max(m, (o.d + o.reach) / Math.max(1, o.rel)), 0);
        const steps = Math.min(140, Math.ceil(last / STEP) + 2);
        const busy = []; // busy[k][l] : voie l occupée au pas k
        for (let k = 0; k <= steps; k++) {
            const row = [false, false, false];
            for (const o of obs) {
                const d = o.d - o.rel * k * STEP;
                if (Math.abs(d) < o.reach) for (const l of o.lanes) if (l >= 0 && l <= 2) row[l] = true;
            }
            busy.push(row);
        }
        // atteignable[k][l]
        let cur = [false, false, false];
        cur[lane] = !busy[0][lane];
        const lockSteps = Math.ceil(lock / STEP);
        const reach = [cur];
        for (let k = 0; k < steps; k++) {
            const nxt = reach[k + 1] || (reach[k + 1] = [false, false, false]);
            for (let l = 0; l < 3; l++) {
                if (!reach[k][l]) continue;
                if (!busy[k + 1][l]) nxt[l] = true;
                if (k < lockSteps) continue;
                for (const n of [l - 1, l + 1]) {
                    if (n < 0 || n > 2 || k + MOVE > steps) continue;
                    let ok = true;
                    for (let j = k + 1; j <= k + MOVE && ok; j++) if (busy[j][l] || busy[j][n]) ok = false;
                    if (ok) (reach[k + MOVE] || (reach[k + MOVE] = [false, false, false]))[n] = true;
                }
            }
        }
        return (reach[steps] || []).some(Boolean);
    };
    const free = (l, m, span) => !things.some(o => o.kind !== 'can' && Math.round(o.lane) === l && Math.abs(o.m - m) < span);
    const spawnRow = () => {
        const far = dist + 68; // juste au-dessus de l'écran
        const before = things.length;
        const lanes = [0, 1, 2].sort(() => Math.random() - 0.5);
        const late = Math.min(1, dist / 6000);
        const blocked = dist > 600 && Math.random() < 0.15 + late * 0.3 ? 2 : 1;
        const clear = (l) => free(l, far, 26) && !things.some(o => o.turn && o.turn.dir && Math.round(o.lane + o.turn.dir) === l);
        for (let i = 0; i < blocked; i++) {
            const l = lanes[i];
            if (!free(l, far, 14)) continue;
            // la dernière voie dégagée ne doit jamais être fermée
            if (![0, 1, 2].some(k => k !== l && !lanes.slice(0, i).includes(k) && clear(k))) break;
            const r = Math.random();
            if (r < 0.12 + late * 0.1 && dist > 400) things.push({ kind: 'barrier', lane: l, laneX: l, m: far, v: 0 });
            else {
                const truck = Math.random() < 0.22;
                const v = speed * rand(0.38, 0.6);
                // certains changent de voie en cours de route (avec clignotant)
                const turner = dist > 300 && Math.random() < 0.18 + late * 0.25;
                things.push({ kind: truck ? 'truck' : 'car', lane: l, laneX: l, m: far, v, hue: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)], turn: turner ? { at: rand(36, 54), dir: 0, t: 0 } : null });
            }
        }
        // la rangée ne doit jamais fermer la route : on retire des obstacles tant qu'aucun chemin n'existe
        while (things.length > before && !passable(things)) {
            const mine = things.slice(before);
            things.splice(things.indexOf(mine[Math.floor(Math.random() * mine.length)]), 1);
        }
        const tryAdd = (o) => { things.push(o); if (!passable(things)) things.pop(); };
        // flaque d'huile dans une voie libre, parfois
        if (dist > 900 && blocked === 1 && Math.random() < 0.12 + late * 0.12 && free(lanes[1], far + 18, 20)) tryAdd({ kind: 'oil', lane: lanes[1], laneX: lanes[1], m: far + 18, v: 0 });
        // jerrican : plus rare qu'avant, et pas toujours dans la voie libre
        if (Math.random() < (fuel < 40 ? 0.42 : 0.2)) { const cl = lanes[Math.random() < 0.7 ? 2 : 1]; things.push({ kind: 'can', lane: cl, laneX: cl, m: far + 8, v: 0 }); }
        nextRow = dist + Math.max(30, speed) * Math.max(0.62, 1.05 - dist / 14000) + rand(0, 10);
    };

    const update = (dt) => {
        lock = Math.max(0, lock - dt);
        slide = Math.max(0, slide - dt);
        laneX += (lane - laneX) * Math.min(1, dt * (slide > 0 ? 4 : 16));
        if (state === 'count') {
            countT -= dt;
            center.textContent = countT > 0 ? String(Math.ceil(countT)) : t('GO !');
            if (countT <= 0) { state = 'run'; setTimeout(() => { if (state === 'run') center.textContent = ''; }, 600); }
            return;
        }
        if (state !== 'run') return;
        // vitesse : de 100 à ~270 km/h, ça monte vite ; à sec, la voiture s'arrête
        const target = fuel > 0 ? 48 + Math.min(44, dist / 90) : 0;
        speed += (target - speed) * Math.min(1, dt * (fuel > 0 ? 0.7 : 0.9));
        dist += speed * dt;
        fuel = Math.max(0, fuel - dt * (2.2 + speed / 36));
        inv = Math.max(0, inv - dt);
        shake = Math.max(0, shake - dt);
        if (dist >= nextRow) spawnRow();
        for (const o of things) {
            if (o.kind === 'car' || o.kind === 'truck') {
                // pas de carambolage entre eux : on suit la voiture de devant
                const ahead = things.find(q => q !== o && (q.kind === 'car' || q.kind === 'truck' || q.kind === 'barrier') && Math.round(q.laneX) === Math.round(o.laneX) && q.m > o.m && q.m - o.m < 9);
                const v = ahead ? Math.min(o.v, ahead.v) : o.v;
                o.m += v * dt;
                // changement de voie annoncé
                if (o.turn && o.turn.dir === 0 && o.m - dist < o.turn.at) {
                    const busy = things.some(q => q !== o && q.turn && q.turn.dir);
                    const opts = busy ? [] : [o.lane - 1, o.lane + 1].filter(l => l >= 0 && l <= 2 && free(l, o.m, 22));
                    if (opts.length) {
                        o.turn.dir = opts[Math.floor(Math.random() * opts.length)] - o.lane; o.turn.t = 0;
                        if (!passable(things)) o.turn = null;
                    } else o.turn = null;
                }
                if (o.turn && o.turn.dir) {
                    o.turn.t += dt;
                    if (o.turn.t > 1.1) { o.laneX += o.turn.dir * dt * 1.4; if (Math.abs(o.laneX - o.lane) >= 1) { o.lane += o.turn.dir; o.laneX = o.lane; o.turn = null; } }
                }
            }
            const dy = Math.abs((o.m - dist) * G.ppm);
            const len = hitLen(o);
            if (o.hit || dy > (G.carL + len) * (o.kind === 'can' ? 0.5 : 0.4)) continue;
            if (Math.abs(laneX - o.laneX) > (o.kind === 'can' ? 0.5 : 0.55)) continue;
            o.hit = true;
            if (o.kind === 'can') { fuel = Math.min(100, fuel + 28); sfx.select(); }
            else if (o.kind === 'oil') {
                // dérapage : la voiture part sur une voie voisine et ne répond plus un instant
                const dir = lane === 0 ? 1 : lane === 2 ? -1 : (Math.random() < 0.5 ? -1 : 1);
                lane += dir; slide = 0.8; lock = 0.6; shake = 0.2;
                sfx.back();
                center.textContent = t('Dérapage !');
                setTimeout(() => { if (state === 'run') center.textContent = ''; }, 600);
            } else if (inv <= 0) {
                hp -= 1;
                inv = 1.5;
                shake = 0.45;
                speed *= 0.5;
                sfx.back();
                center.textContent = t('Bang !');
                setTimeout(() => { if (state === 'run') center.textContent = ''; }, 600);
            }
        }
        things = things.filter(o => o.m - dist > -20 && o.m - dist < 120 && !(o.kind === 'can' && o.hit));
        if (dist >= 2000) achievements.unlock('roadTrip');
        if (dist >= 10000) achievements.unlock('roadLegend');
        renderHud();
        if (hp <= 0) { cause = 'crash'; end(); }
        else if (fuel <= 0 && speed < 0.6) { cause = 'fuel'; end(); }
    };

    const renderHud = () => {
        $('.road-dist').textContent = km(dist);
        $('.road-speed').textContent = `${Math.round(speed * 3.6)} km/h`;
        $('.road-hp').textContent = '◆'.repeat(Math.max(0, hp)) + '◇'.repeat(Math.max(0, 3 - hp));
        const f = $('.road-fuel');
        f.style.setProperty('--f', `${fuel}%`);
        f.classList.toggle('is-low', fuel < 25);
    };

    /* --- dessin, vue de dessus --- */
    const hash = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

    // une voiture vue de dessus, avant vers le haut
    const drawCarTop = (x, y, w, l, body, opts = {}) => {
        c.save();
        c.translate(x, y);
        c.fillStyle = 'rgba(0, 0, 0, 0.45)';
        c.beginPath(); c.roundRect(-w / 2 + 3, -l / 2 + 5, w, l, w * 0.3); c.fill();
        // roues
        c.fillStyle = '#0b0b0e';
        [[-1, -0.3], [1, -0.3], [-1, 0.3], [1, 0.3]].forEach(([sx, sy]) => c.fillRect(sx * w / 2 - (sx > 0 ? w * 0.08 : w * 0.02), sy * l - l * 0.08, w * 0.1, l * 0.16));
        // carrosserie
        c.fillStyle = body;
        c.beginPath(); c.roundRect(-w / 2, -l / 2, w, l, [w * 0.38, w * 0.38, w * 0.22, w * 0.22]); c.fill();
        // reflet sur le capot
        c.fillStyle = 'rgba(255, 255, 255, 0.16)';
        c.beginPath(); c.roundRect(-w * 0.3, -l * 0.46, w * 0.18, l * 0.3, w * 0.08); c.fill();
        if (opts.regalia) {
            // capote baissée : habitacle ouvert, quatre amis vus d'en haut
            c.fillStyle = '#1c1714';
            c.beginPath(); c.roundRect(-w * 0.38, -l * 0.1, w * 0.76, l * 0.42, w * 0.12); c.fill();
            c.fillStyle = 'rgba(160, 200, 255, 0.35)';
            c.beginPath(); c.roundRect(-w * 0.38, -l * 0.2, w * 0.76, l * 0.08, 3); c.fill();
            [[-0.18, 0.02], [0.18, 0.02], [-0.18, 0.22], [0.18, 0.22]].forEach(([sx, sy], i) => {
                c.fillStyle = ['#151018', '#c9a86a', '#3a2a22', '#151018'][i];
                c.beginPath(); c.arc(sx * w, sy * l, w * 0.12, 0, TAU); c.fill();
            });
            // filets chromés
            c.strokeStyle = 'rgba(220, 225, 240, 0.7)'; c.lineWidth = 1.2;
            c.beginPath(); c.moveTo(-w * 0.44, -l * 0.42); c.lineTo(-w * 0.44, l * 0.44); c.moveTo(w * 0.44, -l * 0.42); c.lineTo(w * 0.44, l * 0.44); c.stroke();
        } else {
            // toit et vitres
            c.fillStyle = 'rgba(15, 20, 30, 0.85)';
            c.beginPath(); c.roundRect(-w * 0.36, -l * 0.18, w * 0.72, l * 0.46, w * 0.14); c.fill();
            c.fillStyle = opts.roof || body;
            c.beginPath(); c.roundRect(-w * 0.3, -l * 0.08, w * 0.6, l * 0.26, w * 0.1); c.fill();
        }
        // phares (devant) et feux (derrière)
        c.save();
        c.shadowBlur = 12;
        c.shadowColor = '#fff2c0'; c.fillStyle = '#fff6d8';
        c.fillRect(-w * 0.42, -l / 2, w * 0.2, l * 0.04); c.fillRect(w * 0.22, -l / 2, w * 0.2, l * 0.04);
        c.shadowColor = '#ff2a2a'; c.fillStyle = '#ff3a3a';
        c.fillRect(-w * 0.44, l / 2 - l * 0.04, w * 0.22, l * 0.04); c.fillRect(w * 0.22, l / 2 - l * 0.04, w * 0.22, l * 0.04);
        // clignotant
        if (opts.blink && Math.floor(T * 6) % 2) {
            c.shadowColor = '#ffae2a'; c.fillStyle = '#ffbe3a';
            const sx = opts.blink > 0 ? w / 2 - w * 0.08 : -w / 2;
            c.fillRect(sx, -l / 2 + 2, w * 0.08, l * 0.08); c.fillRect(sx, l / 2 - l * 0.1, w * 0.08, l * 0.08);
        }
        c.restore();
        c.restore();
    };

    const draw = () => {
        if (!G) geo();
        const { roadW, laneW, x0, carW, carL, carY, ppm } = G;
        const off = (dist * ppm) % 4000;
        c.save();
        if (shake > 0) c.translate(rand(-1, 1) * shake * 12, rand(-1, 1) * shake * 8);
        // désert de nuit
        c.fillStyle = '#3a2a2a'; c.fillRect(0, 0, W, H);
        // grain de sable qui défile
        for (let i = 0; i < 90; i++) {
            const x = hash(i) * W;
            const y = ((hash(i + 50) * H * 2 + off) % (H + 40)) - 20;
            if (x > x0 - 30 && x < x0 + roadW + 30) continue;
            c.fillStyle = i % 3 ? 'rgba(120, 90, 80, 0.5)' : 'rgba(30, 20, 20, 0.5)';
            c.fillRect(x, y, 3, 2);
        }
        // décor : rochers, cactus et lampadaires, tous les 12 m
        const seg = 12;
        const first = Math.floor((dist - 20) / seg);
        for (let k = first; k < first + Math.ceil(H / ppm / seg) + 4; k++) {
            const y = yOf(k * seg);
            [-1, 1].forEach(side => {
                const r = hash(k * 2 + (side > 0 ? 1 : 0));
                const x = side < 0 ? x0 - 30 - r * Math.max(10, x0 - 50) : x0 + roadW + 30 + r * Math.max(10, W - x0 - roadW - 50);
                if (r < 0.35) { // cactus vu de dessus
                    c.fillStyle = '#2f4a2c'; c.beginPath(); c.arc(x, y, 9, 0, TAU); c.fill();
                    c.fillStyle = '#3f6a38'; c.beginPath(); c.arc(x - 9, y + 2, 5, 0, TAU); c.arc(x + 9, y - 3, 5, 0, TAU); c.fill();
                } else if (r < 0.6) {
                    c.fillStyle = '#4a3a36'; c.beginPath(); c.ellipse(x, y, 12, 8, r * 3, 0, TAU); c.fill();
                    c.fillStyle = 'rgba(255, 255, 255, 0.08)'; c.beginPath(); c.ellipse(x - 3, y - 2, 5, 3, 0, 0, TAU); c.fill();
                }
            });
            if (k % 4 === 0) { // lampadaires au bord de la route
                [x0 - 14, x0 + roadW + 14].forEach((lx, i) => {
                    c.fillStyle = 'rgba(255, 210, 120, 0.12)';
                    c.beginPath(); c.arc(lx + (i ? -30 : 30), y, 60, 0, TAU); c.fill();
                    c.fillStyle = '#1a1620'; c.fillRect(lx - 3, y - 3, 6, 6);
                    c.fillStyle = '#ffe6a8'; c.beginPath(); c.arc(lx + (i ? -16 : 16), y, 4, 0, TAU); c.fill();
                });
            }
        }
        // bas-côtés et bordures rouge/blanc
        c.fillStyle = '#4a3a34'; c.fillRect(x0 - 16, 0, 16, H); c.fillRect(x0 + roadW, 0, 16, H);
        const stripe = 20;
        for (let y = -stripe * 2 + (dist * ppm) % (stripe * 2); y < H; y += stripe * 2) {
            c.fillStyle = '#d8d2c8'; c.fillRect(x0 - 8, y, 8, stripe); c.fillRect(x0 + roadW, y, 8, stripe);
            c.fillStyle = '#b33a3a'; c.fillRect(x0 - 8, y + stripe, 8, stripe); c.fillRect(x0 + roadW, y + stripe, 8, stripe);
        }
        // asphalte
        c.fillStyle = lin2(x0, x0 + roadW);
        c.fillRect(x0, 0, roadW, H);
        // pointillés
        c.fillStyle = 'rgba(240, 230, 190, 0.8)';
        const dash = 34;
        for (let y = -dash * 2 + (dist * ppm) % (dash * 2); y < H; y += dash * 2) {
            c.fillRect(x0 + laneW - 2, y, 4, dash);
            c.fillRect(x0 + laneW * 2 - 2, y, 4, dash);
        }
        // objets
        for (const o of things) {
            const y = yOf(o.m);
            if (y < -120 || y > H + 120) continue;
            const x = G.x0 + G.laneW * (o.laneX + 0.5);
            if (o.kind === 'can') {
                if (o.hit) continue;
                const s = carW * 0.55;
                c.save(); c.shadowColor = '#ffcf5a'; c.shadowBlur = 18 + Math.sin(T * 6) * 6;
                c.fillStyle = '#c92a2a'; c.beginPath(); c.roundRect(x - s / 2, y - s * 0.6, s, s * 1.2, 4); c.fill(); c.restore();
                c.strokeStyle = '#ffd36b'; c.lineWidth = 2;
                c.beginPath(); c.moveTo(x - s * 0.3, y - s * 0.4); c.lineTo(x + s * 0.3, y + s * 0.4); c.moveTo(x + s * 0.3, y - s * 0.4); c.lineTo(x - s * 0.3, y + s * 0.4); c.stroke();
            } else if (o.kind === 'oil') {
                const s = laneW * 0.4;
                c.fillStyle = '#07070a';
                c.beginPath(); c.ellipse(x, y, s, s * 0.7, 0.3, 0, TAU); c.ellipse(x + s * 0.5, y + s * 0.3, s * 0.5, s * 0.35, 0, 0, TAU); c.fill();
                c.strokeStyle = `hsla(${(T * 80) % 360}, 80%, 65%, 0.35)`; c.lineWidth = 2;
                c.beginPath(); c.ellipse(x - s * 0.2, y - s * 0.1, s * 0.5, s * 0.3, 0.3, 0, TAU); c.stroke();
            } else if (o.kind === 'barrier') {
                const w = laneW * 0.86, h = carW * 0.45;
                c.fillStyle = 'rgba(0, 0, 0, 0.4)'; c.fillRect(x - w / 2 + 3, y - h / 2 + 4, w, h);
                c.save(); c.beginPath(); c.rect(x - w / 2, y - h / 2, w, h); c.clip();
                for (let i = -2; i < 12; i++) { c.fillStyle = i % 2 ? '#f4f0e8' : '#ff7a1a'; c.beginPath(); c.moveTo(x - w / 2 + i * 14, y - h / 2); c.lineTo(x - w / 2 + i * 14 + 14, y - h / 2); c.lineTo(x - w / 2 + i * 14, y + h / 2); c.lineTo(x - w / 2 + i * 14 - 14, y + h / 2); c.fill(); }
                c.restore();
                if (Math.floor(T * 4) % 2) [-1, 1].forEach(sd => { c.save(); c.fillStyle = '#ffbe3a'; c.shadowColor = '#ffae2a'; c.shadowBlur = 16; c.beginPath(); c.arc(x + sd * w * 0.42, y, 4, 0, TAU); c.fill(); c.restore(); });
            } else {
                const truck = o.kind === 'truck';
                const w = carW * (truck ? 1.12 : 0.96), l = truck ? carL * 1.7 : carL * 0.95;
                drawCarTop(x, y, w, l, `hsl(${o.hue}, ${truck ? 20 : 55}%, ${truck ? 40 : 42}%)`, { roof: truck ? '#c9ccd4' : null, blink: o.turn && o.turn.dir ? o.turn.dir : 0 });
            }
        }
        // la Regalia et ses phares
        const px = G.x0 + G.laneW * (laneX + 0.5);
        const tilt = (lane - laneX) * 0.25;
        c.save();
        c.globalCompositeOperation = 'lighter';
        const beam = c.createLinearGradient(0, carY - carL / 2, 0, carY - carL / 2 - H * 0.5);
        beam.addColorStop(0, 'rgba(255, 240, 200, 0.22)'); beam.addColorStop(1, 'rgba(255, 240, 200, 0)');
        c.fillStyle = beam;
        c.beginPath(); c.moveTo(px - carW * 0.4, carY - carL / 2); c.lineTo(px - carW * 1.6, carY - carL / 2 - H * 0.5); c.lineTo(px + carW * 1.6, carY - carL / 2 - H * 0.5); c.lineTo(px + carW * 0.4, carY - carL / 2); c.closePath(); c.fill();
        c.restore();
        if (!(inv > 0 && Math.floor(T * 14) % 2)) {
            c.save(); c.translate(px, carY); c.rotate(tilt + (slide > 0 ? Math.sin(T * 30) * 0.15 : 0)); c.translate(-px, -carY);
            drawCarTop(px, carY, carW, carL, lin3(px, carW), { regalia: true });
            c.restore();
        }
        // nuit : tout s'assombrit un peu sur les bords
        const vig = c.createRadialGradient(W / 2, carY - H * 0.3, H * 0.2, W / 2, H / 2, Math.max(W, H) * 0.8);
        vig.addColorStop(0, 'rgba(5, 8, 20, 0)'); vig.addColorStop(1, 'rgba(5, 8, 20, 0.6)');
        c.fillStyle = vig; c.fillRect(0, 0, W, H);
        // lignes de vitesse
        if (speed > 45 && state === 'run') {
            c.strokeStyle = `rgba(255, 255, 255, ${Math.min(0.3, (speed - 45) / 90)})`; c.lineWidth = 1.5;
            for (let i = 0; i < 14; i++) {
                const x = hash(i + 7) * W;
                const y = ((hash(i + 90) * H + T * speed * 30) % (H + 80)) - 40;
                c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 40 + speed * 0.6); c.stroke();
            }
        }
        c.restore();
    };
    const lin2 = (a, b) => { const g = c.createLinearGradient(a, 0, b, 0); g.addColorStop(0, '#24242c'); g.addColorStop(0.5, '#2e2e38'); g.addColorStop(1, '#24242c'); return g; };
    const lin3 = (x, w) => { const g = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0); g.addColorStop(0, '#08080b'); g.addColorStop(0.45, '#3a3d48'); g.addColorStop(0.55, '#2a2c34'); g.addColorStop(1, '#08080b'); return g; };

    let raf = 0, last = 0;
    const loop = (ms) => {
        const dt = Math.min((ms - last) / 1000, 0.05);
        last = ms;
        T = ms / 1000;
        if (W < 2 || H < 2) { ({ c, W, H } = fitCanvas(cv)); G = null; }
        if (W >= 2 && H >= 2) {
            if (!G) geo();
            update(dt);
            draw();
        }
        raf = gameOn('road') ? requestAnimationFrame(loop) : 0;
    };
    const run = () => {
        if (raf) return;
        ({ c, W, H } = fitCanvas(cv));
        G = null;
        last = performance.now();
        raf = requestAnimationFrame(loop);
    };
    document.addEventListener('gameopen', (e) => { if (e.detail === 'road') { run(); if (state === 'run' || state === 'count') showMenu(); } });
    document.addEventListener('gameresume', (e) => { if (e.detail === 'road') run(); });
    window.addEventListener('resize', () => { G = null; if (raf) ({ c, W, H } = fitCanvas(cv)); });

    renderBest();
    showMenu();
    return { reset() { store.del(KEY); store.del('eliasPortfolio.road'); best = 0; renderBest(); showMenu(); }, peek: () => ({ lane, dist, hp, fuel, speed, state, things }), steer, canPass: (l) => { const o = lane; lane = l; const r = passable(things); lane = o; return r; } };
})();

/* Menus de combat : ils gardent leur plus grande hauteur, sinon la page
   remonte à chaque fois qu'un sous-menu plus court s'affiche */
(function keepBattleMenuHeight() {
    if (!window.ResizeObserver) return;
    const ro = new ResizeObserver((entries) => entries.forEach(({ target: m }) => {
        const h = m.offsetHeight;
        if (h > (m._maxH || 0)) { m._maxH = h; m.style.minHeight = `${h}px`; }
    }));
    document.querySelectorAll('.bt-menu').forEach(m => ro.observe(m));
    window.addEventListener('resize', () => document.querySelectorAll('.bt-menu').forEach(m => { m._maxH = 0; m.style.minHeight = ''; }));
})();

/* le "Reset votre progression" efface aussi les mini-jeux */
document.addEventListener('game', (e) => {
    if (e.detail.type === 'reset') { cooking.reset(); chocoboRace.reset(); roadTrip.reset(); battle.reset(); arena.reset(); }
});

/* =====================================================================
   4. ÉQUIPEMENT — accessoires débloqués par les succès et les coffres
   cachés. Change la couleur du cristal du joueur et de la traînée.
   ===================================================================== */
const equipment = (() => {
    const KEY = 'eliasPortfolio.equip';
    const CHEST_KEY = 'eliasPortfolio.chests';
    const ITEMS = [
        { id: 'crystal', look: t('Traînée bleu cristal'), icon: '💎', name: t('Cristal'), how: t('Équipé au départ'), glow: '143, 184, 255', core: '232, 240, 255' },
        { id: 'flame', look: t('Traînée orange braise'), icon: '🔥', name: t('Braise du campement'), how: t('Succès « Nouvelle recette ! »'), glow: '255, 140, 60', core: '255, 226, 190', req: 'chef' },
        { id: 'feather', look: t('Traînée dorée'), icon: '🪶', name: t('Plume dorée'), how: t('Succès « Champion de course »'), glow: '227, 179, 65', core: '255, 243, 200', req: 'chocobo' },
        { id: 'golem', look: t('Traînée violette'), icon: '🔮', name: t('Cœur du golem'), how: t('Succès « Golem vaincu »'), glow: '176, 120, 255', core: '236, 222, 255', req: 'battle' },
        { id: 'moon', look: t('Traînée argentée'), icon: '🌙', name: t('Écaille lunaire'), how: t('Succès secret'), glow: '200, 215, 235', core: '255, 255, 255', req: 'nightMonster' },
        { id: 'emerald', look: t('Traînée verte'), icon: '🟢', name: t('Émeraude'), how: t('Coffre caché'), glow: '80, 220, 140', core: '220, 255, 230', chest: 'emerald' },
        { id: 'sakura', look: t('Traînée rose'), icon: '🌸', name: t('Pétale de cerisier'), how: t('Coffre caché'), glow: '255, 130, 190', core: '255, 225, 240', chest: 'sakura' },
        { id: 'aurora', look: t('Traînée aurore multicolore'), icon: '🌌', name: t('Aurore légendaire'), how: t('Succès « Chef légendaire »'), glow: '160, 120, 255', core: '255, 255, 255', req: 'ultimateChef', rainbow: 'aurora' },
        { id: 'prism', look: t('Traînée arc-en-ciel'), icon: '🌈', name: t('Prisme'), how: t('Coffre caché'), glow: '255, 255, 255', core: '255, 255, 255', chest: 'prism', rainbow: true },
        { id: 'royal', look: t('Traînée cristal et or'), icon: '💠', name: t('Cristal royal'), how: t('Succès « Gardien des cristaux »'), glow: '120, 180, 255', core: '255, 255, 255', req: 'crystals', rainbow: 'royal' },
    ];
    const box = document.getElementById('equip');
    const list = document.getElementById('equipList');
    const chests = () => { try { return new Set(JSON.parse(store.get(CHEST_KEY) || '[]')); } catch { return new Set(); } };
    const owned = (it) => !it.req && !it.chest || (it.req && achievements.has(it.req)) || (it.chest && chests().has(it.chest));

    const apply = () => {
        let it = ITEMS.find(x => x.id === store.get(KEY));
        if (!it || !owned(it)) it = ITEMS[0];
        window.trailTint = { glow: it.glow, core: it.core, rainbow: it.rainbow || false };
        const root = document.documentElement;
        // toujours posé, même pour le Cristal : sa couleur reste bleue en mode Ardyn
        root.dataset.equip = it.id;
        root.style.setProperty('--eq-rgb', it.glow);
        return it;
    };

    const render = () => {
        if (!list) return;
        const cur = apply();
        list.innerHTML = '';
        let n = 0;
        ITEMS.forEach(it => {
            const ok = owned(it);
            if (ok) n++;
            const li = document.createElement('li');
            li.className = `${ok ? 'is-got' : ''} ${it.id === cur.id ? 'is-equipped' : ''}`;
            li.innerHTML = '<button type="button"><span class="t-icon"></span><span class="t-txt"><b></b><small></small></span><i class="eq-swatch" aria-hidden="true"></i></button>';
            li.querySelector('.t-icon').textContent = ok ? it.icon : '?';
            // aperçu de la couleur de la traînée
            const sw = li.querySelector('.eq-swatch');
            if (!ok) sw.remove();
            else if (it.rainbow) sw.classList.add(it.rainbow === 'aurora' ? 'is-aurora' : 'is-rainbow');
            else sw.style.setProperty('--sw', it.glow);
            li.querySelector('b').textContent = ok ? it.name : '???';
            li.querySelector('small').textContent = it.id === cur.id ? `${t('▶ Équipé')} · ${it.look}` : ok ? it.look : it.how;
            const b = li.querySelector('button');
            b.disabled = !ok;
            b.addEventListener('click', () => { store.set(KEY, it.id); sfx.select(); render(); });
            list.appendChild(li);
        });
        document.getElementById('equipCount').textContent = n;
        document.getElementById('equipTotal').textContent = ITEMS.length;
    };

    // coffres cachés dans les pages
    const renderChests = () => {
        const got = chests();
        // un coffre ouvert disparaît de la page (il revient après un reset)
        document.querySelectorAll('.chest').forEach(c => { c.hidden = got.has(c.dataset.chest); c.classList.remove('is-opening'); });
    };
    document.querySelectorAll('.chest').forEach(c => c.addEventListener('click', () => {
        const got = chests();
        if (got.has(c.dataset.chest)) return;
        got.add(c.dataset.chest);
        store.set(CHEST_KEY, JSON.stringify([...got]));
        c.classList.add('is-opening'); // le couvercle s'ouvre, une lueur sort, puis le coffre s'efface
        setTimeout(() => { c.hidden = true; c.classList.remove('is-opening'); }, reduceMotion ? 300 : 1300);
        const it = ITEMS.find(x => x.chest === c.dataset.chest);
        if (typeof showToast === 'function') showToast(`${it.icon} ${t('COFFRE OUVERT !')}`);
        achievements.unlock('chest');
        render();
    }));

    const open = () => { render(); box.hidden = false; box.querySelector('.trophies-close').focus(); };
    const close = () => { box.hidden = true; };
    document.getElementById('openEquip')?.addEventListener('click', open);
    box?.querySelector('.trophies-close').addEventListener('click', close);
    box?.addEventListener('click', (e) => { if (e.target === box) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && box && !box.hidden) close(); });
    document.addEventListener('trophy', render);

    renderChests();
    render();
    return { reset() { store.del(KEY); store.del(CHEST_KEY); renderChests(); render(); } };
})();

document.addEventListener('game', (e) => { if (e.detail.type === 'reset') equipment.reset(); });

/* =====================================================================
   5. LA VRAIE FIN — générique de fin avec la musique de l'ending
   Débloquée quand le visiteur a tout fait sur le site.
   ===================================================================== */
const trueEnding = (() => {
    const NEEDS = ['explorer', 'secretAll', 'sphere', 'recruit', 'fish1', 'chef', 'chocobo', 'battle'];
    // nom du succès + où le faire (affichés dans la liste sous le cadenas)
    const STEPS = {
        explorer: [t('Explorateur'), t('visiter les 7 pages du menu')],
        secretAll: [t('Archéologue'), t('trouver les 6 objets secrets')],
        sphere: [t('Sphérier complet'), t('débloquer les 11 sphères (Soft Skills)')],
        recruit: [t('Recruteur avisé'), t('dire Oui à Elias (Expériences)')],
        fish1: [t('Première prise'), t('attraper un poisson (Pêche)')],
        chef: [t('Nouvelle recette !'), t('3 étoiles sur une recette (Cuisine)')],
        chocobo: [t('Champion de course'), t('terminer une Chocobo Race')],
        battle: [t('Golem vaincu'), t('battre le Golem de cristal (Combat)')],
    };
    const toggle = document.querySelector('.true-end-toggle');
    const list = document.getElementById('trueEndList');
    toggle?.addEventListener('click', () => {
        const open = list.hidden;
        list.hidden = !open;
        toggle.setAttribute('aria-expanded', String(open));
    });
    const renderList = () => {
        if (!list) return;
        list.innerHTML = '';
        NEEDS.forEach(id => {
            const ok = achievements.has(id);
            const li = document.createElement('li');
            li.className = ok ? 'is-done' : '';
            li.innerHTML = '<span class="te-mark" aria-hidden="true"></span><b></b><small></small>';
            li.querySelector('.te-mark').textContent = ok ? '✓' : '○';
            li.querySelector('b').textContent = STEPS[id][0];
            li.querySelector('small').textContent = STEPS[id][1];
            list.appendChild(li);
        });
    };
    const SONG = encodeURI('assets/ending ost/Florence + The Machine - Stand By Me.mp3');
    const btn = document.getElementById('trueEndBtn');
    const lock = document.getElementById('trueEndLock');
    let wasReady = null;

    const count = () => NEEDS.filter(id => achievements.has(id)).length;
    const render = () => {
        const n = count();
        const ready = n === NEEDS.length;
        if (btn) btn.hidden = !ready;
        if (lock) { lock.hidden = ready; document.getElementById('trueEndCount').textContent = n; }
        renderList();
        if (wasReady === false && ready && typeof showToast === 'function') showToast(t('FIN CACHÉE DÉBLOQUÉE !'));
        wasReady = ready;
    };

    const credits = () => {
        if (document.querySelector('.credits')) return;
        const best = (() => { try { return JSON.parse(store.get('eliasPortfolio.fishing'))?.best; } catch { return null; } })();
        const J = (k) => { try { return JSON.parse(store.get(k)); } catch { return null; } };
        const arenaWon = Object.keys(J('eliasPortfolio.arena')?.won || {}).length + (achievements.has('battle') ? 1 : 0);
        const roadBest = Number(store.get('eliasPortfolio.road.v2')) || 0;
        const ME = 'Elias Maruca';
        // le générique, section par section (façon FF15 : un bloc de texte, une photo, et on alterne)
        const SECTIONS = [
            [t('Réalisation'), [
                [t('Développement'), ME], [t('Design et direction artistique'), ME], [t('Écriture'), ME],
                [t('Intégration'), ME], [t('Tests et débogage'), ME], [t('Traduction anglaise'), ME]]],
            [t('Avec'), [
                [t('Le joueur'), getPlayer() || 'PLAYER 1'], [t('L\'esprit du cristal'), 'Lumi'], [t('Le chat'), 'Neko']]],
            [t('Les zones'), [
                ['Spawn', t('Accueil')], [t('Profil du joueur'), t('À propos')], [t('Statistiques'), t('Compétences')],
                [t('Aptitudes'), t('Savoir-être')], [t('Origines'), t('Formation')], [t('Quêtes'), t('Projets')],
                [t('Journal de quêtes'), t('Expériences')], ['Bonus', t('Mini-jeux')]]],
            [t('Quêtes accomplies'), [
                [t('Quête principale'), 'WondersBeyondRecomp'], [t('Quête annexe'), 'TOTK Recomp Mod Manager'],
                [t('Quête annexe'), '3arbiChat'], [t('Quête annexe'), 'Intellib'], [t('Quête annexe'), 'Legend of War'],
                [t('Quête annexe'), t('Site Internet pour Covoiturage')], [t('Quête annexe'), 'Question pour un p\'tit loup']]],
            [t('Compagnons de route'), [
                ['ADEO', 'Lille'], ['GEONATIVE', 'Lille'], ['E-SYSTEMS', 'Lille'], [t('IUT de Lille'), 'Villeneuve-d\'Ascq'],
                [t('Centre de loisirs'), 'Roubaix'], [t('Lycée Saint Rémi'), 'Roubaix']]],
            [t('Mini-jeux'), [
                [t('Pêche'), t('Un lac de nuit et 17 poissons')], [t('Cuisine du campement'), t('Rythme et recettes')],
                ['Chocobo Race', t('Trois rivaux, 1000 m')], [t('Route Royale'), t('La Regalia de nuit')], [t('Combat'), t('Une campagne de 5 combats')]]],
            [t('Bestiaire'), [
                [t('Gardien'), t('Golem de cristal')], [t('Meute'), t('Loup des cendres')], [t('Marais'), t('Crapaud colossal')],
                [t('Marais'), t('Feu follet')], [t('Garnison'), t('Sentinelle de fer')], [t('Garnison'), t('Drone réparateur')],
                [t('Boss final'), t('Dévoreur d\'étoiles')], [t('Ses enfants'), t('Éclat du néant')]]],
            [t('Musique'), [
                ['Somnus', 'Final Fantasy XV'], ['Valse di Fantastica', 'Final Fantasy XV'], ['Noctis', 'Final Fantasy XV'],
                ['Stand Your Ground', 'Final Fantasy XV'], ['Crystalline Chill', 'Final Fantasy XV'], ['Reel Rumble', 'Final Fantasy XV'],
                ['Flying R', 'Final Fantasy XV'], ['Calm Before the Storm', 'Final Fantasy X'], [t('Thème des Chocobos'), 'Final Fantasy VII'],
                ['Sunset Waltz', 'Final Fantasy XV'], [t('Générique de fin'), '« Stand By Me » — Florence + The Machine']]],
            [t('Technique'), [
                [t('Langages'), 'HTML · CSS · JavaScript'], [t('Mini-jeux'), 'Canvas 2D'], [t('Sauvegarde'), 'localStorage'],
                [t('Polices'), 'Cinzel · Inter · JetBrains Mono'], [t('Bibliothèques'), 'jQuery · Typed.js · VanillaTilt'],
                [t('Icônes'), 'Font Awesome'], [t('Photos de voyage'), 'html-to-image'], [t('Chat curseur'), 'oneko.js'],
                [t('Hébergement'), 'GitHub Pages']]],
            [t('Ton aventure'), [
                [t('Zones visitées'), `${getVisited().size} / ${TOTAL_ZONES}`], [t('Objets secrets'), `${getFound().size} / ${TOTAL_SECRETS}`],
                [t('Succès'), String(document.getElementById('trophyCount')?.textContent || 0)],
                [t('Plus gros poisson'), best ? `${best.name || ''} ${best.size} cm`.trim() : '—'],
                [t('Combats gagnés'), `${Math.min(5, arenaWon)} / 5`], [t('Route Royale'), roadBest ? `${(roadBest / 1000).toFixed(2)} km` : '—']]],
            [t('Inspiration'), [
                ['Final Fantasy XV', 'Square Enix'], [t('L\'équipe'), 'Noctis · Prompto · Gladiolus · Ignis'], [t('Les photos'), t('L\'appareil de Prompto')]]],
            [t('Remerciements'), [
                [t('Merci à'), t('toi, d\'être venu jusqu\'ici')], [t('Et à'), t('tous ceux qui liront ce portfolio')]]],
        ];
        const el = document.createElement('div');
        el.className = 'credits';
        el.setAttribute('role', 'dialog');
        el.setAttribute('aria-label', t('Générique de fin'));
        el.innerHTML = `
            <button class="credits-skip" type="button">${t('Passer ▸▸')}</button>
            <div class="credits-roll">
                <p class="credits-k">${t('UN PORTFOLIO DE')}</p>
                <h2>ELIAS MARUCA</h2>
                <div class="credits-rows"></div>
                <p class="credits-thanks">${t('Merci d\'avoir joué jusqu\'au bout.')}</p>
                <p class="credits-fin">FIN</p>
            </div>`;
        // les photos prises pendant la visite (aventure.js), façon Prompto : juste l'image
        const photos = typeof photoAlbum !== 'undefined' ? photoAlbum.list() : [];
        const photoEl = (ph) => {
            const img = document.createElement('img');
            img.className = 'credits-photo';
            img.src = ph.src;
            img.alt = ph.caption || '';
            return img;
        };
        // une photo par section tant qu'il y en a ; s'il y en a plus que de sections, les premières en prennent deux
        const rows = el.querySelector('.credits-rows');
        let pi = 0;
        SECTIONS.forEach(([title, list], i) => {
            const row = document.createElement('section');
            const block = document.createElement('div');
            block.className = 'credits-block';
            const h = document.createElement('p');
            h.className = 'credits-k';
            h.textContent = title.toUpperCase();
            const dl = document.createElement('dl');
            list.forEach(([k, v]) => {
                const dt = document.createElement('dt'); dt.textContent = k;
                const dd = document.createElement('dd'); dd.textContent = v;
                dl.append(dt, dd);
            });
            block.append(h, dl);
            const take = photos.length - pi > SECTIONS.length - i ? 2 : 1;
            const mine = photos.slice(pi, pi + take);
            pi += mine.length;
            row.className = `credits-row ${mine.length ? (i % 2 ? 'photo-left' : 'photo-right') : 'no-photo'}`;
            row.appendChild(block);
            if (mine.length) {
                const side = document.createElement('div');
                side.className = 'credits-side';
                mine.forEach(ph => side.appendChild(photoEl(ph)));
                row.appendChild(side);
            }
            rows.appendChild(row);
        });
        document.body.appendChild(el);
        document.body.classList.add('credits-open');

        const audio = new Audio(SONG);
        audio.volume = 0.8;
        window.ost?.hold('credits');
        audio.play().catch(() => { });

        const roll = el.querySelector('.credits-roll');
        let done = false;
        const finish = () => {
            if (done) return;
            done = true;
            achievements.unlock('trueEnd');
        };
        // le texte défile à vitesse constante ; une fois « FIN » arrivé, le générique se ferme
        // (sans attendre la fin de la chanson). Mouvement réduit : générique fixe, qu'on ferme soi-même.
        let timer = 0;
        if (reduceMotion) timer = setTimeout(finish, 3000);
        // les photos décodées d'abord : la hauteur du générique est alors connue
        else Promise.all([...el.querySelectorAll('img')].map(i => i.decode().catch(() => { }))).then(() => requestAnimationFrame(() => {
            if (!el.isConnected) return;
            // le défilement s'arrête pile quand « FIN » est au centre de l'écran
            const fin = el.querySelector('.credits-fin').getBoundingClientRect();
            const dist = Math.max(0, fin.top + fin.height / 2 - window.innerHeight / 2);
            // lent, comme un vrai générique
            const dur = Math.max(90000, (dist / 50) * 1000);
            roll.style.transition = `transform ${dur}ms linear`;
            roll.style.transform = `translateY(${-dist}px)`;
            // « FIN » reste affiché, la chanson s'éteint en fondu, puis le générique se ferme
            timer = setTimeout(() => {
                finish();
                fadeSong(5000);
                timer = setTimeout(close, 6000);
            }, dur + 1500);
        }));

        // fondu de la musique (le dernier fondu demandé l'emporte)
        let fadeId = 0;
        function fadeSong(ms) {
            const id = ++fadeId;
            const v0 = audio.volume;
            const t0 = performance.now();
            const step = () => {
                if (id !== fadeId) return;
                const k = Math.min(1, (performance.now() - t0) / ms);
                audio.volume = v0 * (1 - k) * (1 - k);
                if (k < 1) requestAnimationFrame(step); else audio.pause();
            };
            step();
        }
        const close = () => {
            clearTimeout(timer);
            if (!done && performance.now() - opened > 15000) finish();
            el.classList.add('is-leaving');
            fadeSong(900);
            setTimeout(() => { el.remove(); document.body.classList.remove('credits-open'); window.ost?.release('credits'); }, 900);
            document.removeEventListener('keydown', onKey);
        };
        const opened = performance.now();
        const onKey = (e) => { if (e.key === 'Escape') close(); };
        el.querySelector('.credits-skip').addEventListener('click', close);
        document.addEventListener('keydown', onKey);
        el.querySelector('.credits-skip').focus();
    };

    btn?.addEventListener('click', credits);
    document.addEventListener('trophy', render);
    document.addEventListener('game', (e) => { if (e.detail.type === 'reset') { wasReady = null; setTimeout(render, 50); } });
    render();
    return { play: credits, progress: () => [count(), NEEDS.length] };
})();
