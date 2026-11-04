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
   1. CUISINE DU CAMPEMENT — jeu de rythme en musique
   La musique est composée en direct (WebAudio) : batterie, basse, accords.
   Chaque ingrédient tombe sur un temps de la musique, et le frapper joue
   la mélodie. L'horloge du jeu est celle de l'audio : image et son restent calés.
   ===================================================================== */
const cooking = (() => {
    const panel = document.getElementById('game-cooking');
    if (!panel) return { reset() { } };
    const KEY = 'eliasPortfolio.cooking';

    // accords (notes MIDI) : une mesure par accord, en boucle
    const PROG = {
        pop: [[60, 64, 67], [67, 71, 74], [69, 72, 76], [65, 69, 72]],    // I V vi IV
        folk: [[69, 72, 76], [65, 69, 72], [60, 64, 67], [67, 71, 74]],   // vi IV I V
        epic: [[57, 60, 64], [65, 69, 72], [60, 64, 67], [67, 71, 74]],   // i VI III VII
        dark: [[57, 60, 64], [62, 65, 69], [55, 59, 62], [64, 68, 71]],   // i iv VII V
        boss: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 56, 59]],   // Am F G E : thème de boss
    };
    // motifs rythmiques : position des ingrédients dans la mesure (en temps)
    const RECIPES = [
        { id: 'skewers', dish: '🍢', name: t('Brochettes du campement'), bpm: 90, bars: 8, prog: 'pop', key: 0,
            pat: [[0, 1, 2, 3]], items: ['🥩', '🧅', '🫑'] },
        { id: 'stew', dish: '🍲', name: t('Ragoût de la forêt'), bpm: 100, bars: 8, prog: 'folk', key: 2,
            pat: [[0, 1, 2, 3], [0, 1, 2, 2.5, 3]], items: ['🥕', '🥔', '🍖', '🧄'] },
        { id: 'fish', dish: '🐟', name: t('Poisson grillé aux herbes'), bpm: 110, bars: 10, prog: 'pop', key: 5,
            pat: [[0, 1, 1.5, 2, 3], [0, 0.5, 1, 2, 3]], items: ['🐟', '🌿', '🍋'] },
        { id: 'curry', dish: '🍛', name: t('Curry du campement'), bpm: 118, bars: 10, prog: 'epic', key: 0,
            pat: [[0, 1, 1.5, 2, 3, 3.5], [0, 0.75, 1.5, 2, 3]], items: ['🍛', '🥕', '🌶️', '🍚'] },
        { id: 'omelette', dish: '🍳', name: t('Omelette du chasseur'), bpm: 126, bars: 12, prog: 'folk', key: -3,
            pat: [[0, 0.5, 1, 1.5, 2, 3], [0, 1, 1.5, 2, 2.5, 3, 3.5]], items: ['🥚', '🧀', '🍄', '🥓'] },
        { id: 'soup', dish: '🥣', name: t('Soupe aux champignons'), bpm: 132, bars: 12, prog: 'dark', key: 2,
            pat: [[0, 0.5, 1, 2, 2.25, 2.5, 3], [0, 0.75, 1.5, 2, 2.5, 3, 3.5]], items: ['🍄', '🧅', '🥛', '🌿'] },
        { id: 'spicy', dish: '🌶️', name: t('Brochettes épicées'), bpm: 140, bars: 12, prog: 'epic', key: 3,
            pat: [[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], [0, 0.25, 0.5, 1.5, 2, 2.75, 3.5]], items: ['🌶️', '🍖', '🧄', '🫑'] },
        { id: 'feast', dish: '🍱', name: t('Festin du roi'), bpm: 150, bars: 14, prog: 'dark', key: 5,
            pat: [[0, 0.25, 0.5, 1, 1.5, 2, 2.25, 2.5, 3, 3.5], [0, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 3.25, 3.5]], items: ['🍤', '🍄', '🌶️', '🥚', '🍚'] },
        // NIVEAU ULTIME : rythmes variés + 2 mécaniques
        //   { b, h }  = ingrédient à maintenir pendant h temps (barre de cuisson)
        //   { b, x }  = ingrédient piégé : surtout ne pas taper
        // (aucun piège juste après la fin d'une barre de cuisson : au moins 1 temps d'écart)
        { id: 'ultimate', dish: '👑', name: t('Banquet ultime'), bpm: 156, bars: 16, prog: 'boss', key: 0, ultimate: true,
            // mélodie écrite (une ligne par accord) : chaque ingrédient touché joue la note suivante
            melody: [[69, 72, 76, 74, 72, 71, 69, 72], [65, 69, 72, 71, 69, 67, 65, 69], [67, 71, 74, 72, 71, 69, 67, 71], [68, 71, 76, 74, 71, 68, 64, 71]],
            pat: [
                [0, 0.5, { b: 1, h: 1 }, 3, { b: 3.5, x: 1 }],
                [0, { b: 0.75, x: 1 }, 1, 1.5, 2, { b: 2.5, h: 1 }],
                [{ b: 0.5, h: 1.5 }, 3, 3.25, { b: 3.5, x: 1 }],
                [0, 0.25, 0.5, { b: 1, x: 1 }, { b: 1.5, x: 1 }, 2, { b: 2.5, h: 1 }],
                [0.5, 0.75, 1, { b: 1.5, h: 1.5 }, 3.25],
                [{ b: 0, x: 1 }, 0.5, 1, { b: 2, h: 1 }, 3.5],
            ], items: ['🦞', '🥩', '🍣', '🧀', '🍄', '🍋'], traps: ['💀', '🦠'] },
    ];
    const PERFECT = 0.045, GOOD = 0.1; // fenêtres de frappe (secondes)

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

    /* ---------- musique ---------- */
    let ac = null, master = null, noise = null;
    const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
    const audio = () => {
        ac = ac || sfx.ctx();
        if (ac && !noise) {
            noise = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
            const d = noise.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        }
        return ac;
    };
    const tone = (freq, at, dur, type, vol, dest = master) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, at);
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(vol, at + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
        o.connect(g).connect(dest);
        o.start(at); o.stop(at + dur + 0.05);
    };
    const kick = (at) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.frequency.setValueAtTime(150, at);
        o.frequency.exponentialRampToValueAtTime(45, at + 0.12);
        g.gain.setValueAtTime(0.5, at);
        g.gain.exponentialRampToValueAtTime(0.0001, at + 0.25);
        o.connect(g).connect(master);
        o.start(at); o.stop(at + 0.3);
    };
    const hiss = (at, dur, cut, vol) => {
        const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
        s.buffer = noise;
        f.type = 'highpass'; f.frequency.value = cut;
        g.gain.setValueAtTime(vol, at);
        g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
        s.connect(f).connect(g).connect(master);
        s.start(at); s.stop(at + dur + 0.02);
    };
    const snare = (at) => { hiss(at, 0.16, 1200, 0.22); tone(190, at, 0.1, 'triangle', 0.12); };

    // compose et programme toute la chanson d'un coup (≤ 40 s)
    const playSong = (r, startAt, countBars) => {
        master = ac.createGain();
        master.gain.value = sfx.on ? 0.55 : 0;
        master.connect(ac.destination);
        const spb = 60 / r.bpm;
        const prog = PROG[r.prog];
        const total = countBars + r.bars + 1;
        for (let bar = 0; bar < total; bar++) {
            const b0 = startAt + bar * 4 * spb;
            if (bar < countBars) { // décompte : 4 coups de baguettes
                for (let k = 0; k < 4; k++) hiss(b0 + k * spb, 0.05, 4000, k === 0 ? 0.3 : 0.18);
                continue;
            }
            const last = bar === total - 1;
            const ch = prog[(bar - countBars) % prog.length].map(n => n + r.key);
            kick(b0);
            if (last) { ch.forEach(n => tone(midi(n), b0, 1.6, 'triangle', 0.05)); tone(midi(ch[0] - 24), b0, 1.6, 'sawtooth', 0.05); break; }
            kick(b0 + 2 * spb);
            if (bar % 2) kick(b0 + 2.5 * spb);
            snare(b0 + spb); snare(b0 + 3 * spb);
            const sub = r.bpm >= 126 ? 0.25 : 0.5; // charleston en croches ou doubles
            for (let k = 0; k < 4; k += sub) hiss(b0 + k * spb, 0.035, 7000, k % 1 ? 0.04 : 0.07);
            // basse
            [0, 1.5, 2, 3.5].forEach((k, i) => tone(midi(ch[0] - 24 + (i === 3 ? 12 : 0)), b0 + k * spb, spb * 0.9, 'sawtooth', 0.045));
            // nappe d'accords
            ch.forEach(n => tone(midi(n - 12), b0, 4 * spb * 0.95, 'triangle', 0.018));
            if (r.ultimate) for (let k = 0; k < 8; k++) tone(midi(ch[[0, 1, 2, 1][k % 4]] + (k >= 4 ? 12 : 0)), b0 + k * 0.5 * spb, spb * 0.4, 'triangle', 0.016);
        }
    };
    // la mélodie : jouée seulement quand on touche l'ingrédient
    const lead = (n) => {
        if (!ac || !master) return;
        const at = ac.currentTime;
        tone(midi(n.pitch), at, 0.22, 'square', 0.035);
        tone(midi(n.pitch + 12), at, 0.16, 'triangle', 0.03);
    };
    // note tenue : le son dure tant qu'on maintient
    const leadHold = (n) => {
        if (!ac || !master) return () => { };
        const at = ac.currentTime;
        const lp = ac.createBiquadFilter(), g = ac.createGain();
        lp.type = 'lowpass'; lp.frequency.value = 2200; lp.Q.value = 0.5;
        // même instrument que les notes simples (carré + triangle à l'octave), juste tenu et un peu plus doux
        const sq = ac.createOscillator(), tri = ac.createOscillator(), triG = ac.createGain();
        sq.type = 'square'; sq.frequency.setValueAtTime(midi(n.pitch), at);
        tri.type = 'triangle'; tri.frequency.setValueAtTime(midi(n.pitch + 12), at);
        triG.gain.value = 0.8;
        sq.connect(lp); tri.connect(triG).connect(lp);
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(0.03, at + 0.01);
        g.gain.setTargetAtTime(0.018, at + 0.12, 0.2);
        lp.connect(g).connect(master);
        sq.start(at); tri.start(at);
        return () => {
            const t1 = ac.currentTime;
            g.gain.cancelScheduledValues(t1);
            g.gain.setTargetAtTime(0.0001, t1, 0.04);
            sq.stop(t1 + 0.3); tri.stop(t1 + 0.3);
        };
    };

    const stopSong = () => {
        if (!master) return;
        const m = master;
        master = null;
        try { m.gain.setTargetAtTime(0, ac.currentTime, 0.05); setTimeout(() => m.disconnect(), 300); } catch { }
    };

    // l'heure du jeu = l'heure de l'audio (moins la latence de sortie, pour coller à ce qu'on entend)
    const clock = () => ac ? ac.currentTime - (ac.outputLatency || ac.baseLatency || 0) : performance.now() / 1000;

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
            li.querySelector('small').textContent = ok ? `${'★'.repeat(s)}${'☆'.repeat(3 - s)} · ${r.bpm} BPM` : t('2 étoiles sur la recette d\'avant');
            li.querySelector('button').disabled = !ok || state === 'play';
            li.querySelector('button').addEventListener('click', () => { current = i; showStart(); });
            list.appendChild(li);
        });
        const total = Object.values(data).reduce((a, b) => a + b, 0);
        setHubRecord('cooking', total ? `${total} ★` : '—');
    };

    /* --- état --- */
    let state = 'menu'; // menu | play | end
    let notes = [], t0 = 0, now = 0, score = 0, combo = 0, maxCombo = 0, hits = 0, perfects = 0, bad = 0, spb = 0, endAt = 0;
    const particles = [];
    const pan = [];
    const HIT_X = () => W * 0.2;
    const LANE_Y = () => H * 0.78;
    const SPEED = () => W * (0.4 + Math.min(current, 7) * 0.035); // plus rapide à chaque niveau (l'ultime garde la vitesse du niveau 8)

    const showStart = () => {
        stopSong();
        state = 'menu';
        const r = RECIPES[current];
        overlay.hidden = false;
        overlay.innerHTML = `
            <p class="cook-k ${r.ultimate ? 'is-ultimate' : ''}">${r.ultimate ? t('☠ NIVEAU ULTIME ☠') : `${t('NIVEAU')} ${current + 1} / ${RECIPES.length}`}</p>
            <p class="cook-big">${r.dish}</p>
            <h3></h3>
            <p class="cook-sub">${r.bpm} BPM · ${t('Meilleur')} : ${'★'.repeat(data[r.id] || 0) || '—'}</p>
            ${r.ultimate ? `<p class="cook-rules"><span>🔥 ${t('Barre de cuisson : maintiens jusqu\'au bout')}</span><span>💀 ${t('Ingrédient piégé : surtout ne touche pas')}</span></p>` : ''}
            <button class="btn cook-go" type="button">${t('▶ Cuisiner')}</button>`;
        overlay.querySelector('h3').textContent = r.name;
        overlay.querySelector('.cook-go').addEventListener('click', start);
        $('.cook-recipe').textContent = r.name;
        renderBook();
    };

    const start = () => {
        const r = RECIPES[current];
        audio();
        spb = 60 / r.bpm;
        const countBars = Math.max(1, Math.ceil(2.2 / (4 * spb))); // le temps que les 1ers ingrédients arrivent
        const lead0 = countBars * 4 * spb;
        notes = [];
        for (let bar = 0; bar < r.bars; bar++) {
            const ch = PROG[r.prog][bar % 4].map(n => n + r.key);
            const beats = bar === r.bars - 1 ? [0, 1, 2] : r.pat[bar % r.pat.length];
            beats.forEach((e, k) => {
                const b = typeof e === 'number' ? e : e.b;
                const mel = r.melody?.[bar % 4];
                const pitch = mel ? mel[k % mel.length] : ch[(k + bar) % 3] + (k % 4 >= 2 ? 12 : 0);
                const n = { t: lead0 + (bar * 4 + b) * spb, item: r.items[(bar + k) % r.items.length], pitch, done: false, res: null, kind: 'tap' };
                if (e.h) { n.kind = 'hold'; n.len = e.h * spb; }
                if (e.x) { n.kind = 'trap'; n.item = r.traps[(bar + k) % r.traps.length]; }
                notes.push(n);
            });
        }
        endAt = Math.max(...notes.map(n => n.t + (n.len || 0))) + 1.6;
        score = combo = maxCombo = hits = perfects = bad = 0;
        holding = null;
        pan.length = 0;
        overlay.hidden = true;
        state = 'play';
        t0 = clock() + 0.15;
        if (ac) playSong(r, ac.currentTime + 0.15, countBars);
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
        const good = RECIPES[current].ultimate ? 0.075 : GOOD, perfect = RECIPES[current].ultimate ? 0.035 : PERFECT;
        if (!best || bestD > good) { combo = 0; bad++; judge(t('Trop tôt'), 'is-miss'); return; }
        best.done = true;
        if (best.kind === 'trap') { // ingrédient piégé touché
            best.res = 'burnt'; combo = 0; bad += 3; score = Math.max(0, score - 100);
            judge(t('PIÈGE !'), 'is-miss'); sfx.back();
            for (let i = 0; i < 14; i++) particles.push({ x: HIT_X() + rand(-20, 20), y: LANE_Y(), vx: rand(-90, 90), vy: rand(-160, -40), life: 0, max: rand(0.4, 0.8) });
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
        const stars = acc >= 0.9 ? 3 : acc >= 0.72 ? 2 : acc >= 0.5 ? 1 : 0;
        const prev = data[r.id] || 0;
        if (stars > prev) { data[r.id] = stars; store.set(KEY, JSON.stringify(data)); }
        if (stars === 3) achievements.unlock('chef');
        if (r.ultimate && stars >= 2) achievements.unlock('ultimateChef'); // débloque l'accessoire Aurore
        if (stars) sfx.fanfare(); else sfx.lose();
        overlay.hidden = false;
        overlay.innerHTML = `
            <p class="cook-k">${stars ? (stars === 3 ? t('NOUVELLE RECETTE !') : t('PLAT RÉUSSI')) : t('LE PLAT A BRÛLÉ…')}</p>
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
        if (state === 'play') {
            const firstBeat = Math.ceil((tt - 1) / spb);
            for (let b = firstBeat; ; b++) {
                const x = hx + (b * spb - tt) * SPEED();
                if (x > W) break;
                c.strokeStyle = `rgba(${cr}, ${b % 4 === 0 ? 0.3 : 0.1})`;
                c.beginPath(); c.moveTo(x, ly - 34); c.lineTo(x, ly + 34); c.stroke();
            }
        }
        const beatPulse = state === 'play' ? Math.max(0, 1 - (((tt % spb) + spb) % spb) / spb * 3) : 0;
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
            if (!n.done && tt - n.t > (RECIPES[current].ultimate ? 0.075 : GOOD)) {
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
        if (!gameOn('cooking')) { if (state === 'play') showStart(); raf = 0; return; } // on quitte : la partie s'arrête
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
    document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play') showStart(); });
    window.addEventListener('resize', () => { if (raf) ({ c, W, H } = fitCanvas(cv)); });

    renderBook();
    showStart();
    return {
        reset() { store.del(KEY); store.del('eliasPortfolio.cookingUnlocked'); data = {}; current = 0; showStart(); }, // + ancienne clé de test
        stars: () => Object.values(load()).some(s => s === 3),
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
    const DIST = 800; // mètres

    panel.innerHTML = `
        <div class="game-bar">
            <button class="game-back" type="button">${t('◂ Mini-jeux')}</button>
            <p class="game-title">🏁 Chocobo Race</p>
        </div>
        <div class="race-stage">
            <canvas class="race-canvas" aria-label="${t('Course')}"></canvas>
            <div class="race-hud">
                <p class="race-time">0.00 s</p>
                <div class="race-progress"><span></span><i></i></div>
                <p class="race-best">${t('RECORD')} <b>—</b></p>
            </div>
            <p class="race-center"></p>
            <div class="race-overlay"></div>
        </div>
        <p class="fish-tip race-tip">${t('Appuie (clic, doigt ou Espace) pour sauter, maintiens pour sauter plus haut. Les herbes donnent un coup de boost, les obstacles te ralentissent.')}</p>`;

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

    let best = Number(store.get(KEY)) || 0;
    const renderBest = () => {
        $('.race-best b').textContent = best ? `${best.toFixed(2)} s` : '—';
        setHubRecord('chocobo', best ? `${best.toFixed(2)} s` : '—');
    };

    /* --- état --- */
    let state = 'menu'; // menu | count | run | end
    let T = 0, dist = 0, speed = 0, time = 0, boost = 0, stun = 0, countT = 0;
    let y = 0, vy = 0, onGround = true, holding = false, jumpHold = 0;
    let obstacles = [], herbs = [], dust = [], nextSpawn = 0;

    const GROUND = () => H * 0.8;
    const PX_PER_M = () => W / 22; // 22 m visibles à l'écran
    const P_X = () => W * 0.22;

    const showMenu = () => {
        state = 'menu';
        overlay.hidden = false;
        overlay.innerHTML = `
            <p class="cook-k">${t('CHOCOBO RACE')}</p>
            <h3>${DIST} m</h3>
            <p class="cook-sub">${t('Meilleur temps')} : ${best ? `${best.toFixed(2)} s` : '—'}</p>
            <button class="btn race-go" type="button">${t('▶ Départ')}</button>`;
        overlay.querySelector('.race-go').addEventListener('click', countdown);
        center.textContent = '';
    };

    const countdown = () => {
        overlay.hidden = true;
        dist = time = boost = stun = 0;
        speed = 0;
        y = vy = 0;
        onGround = true;
        obstacles = []; herbs = []; dust = [];
        nextSpawn = 30;
        countT = 3;
        state = 'count';
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
        const record = !best || time < best;
        if (record) { best = time; store.set(KEY, String(best)); }
        renderBest();
        achievements.unlock('chocobo');
        sfx.fanfare();
        const medal = time < 70 ? t('🥇 OR') : time < 80 ? t('🥈 ARGENT') : t('🥉 BRONZE');
        overlay.hidden = false;
        overlay.innerHTML = `
            <p class="cook-k">${t('ARRIVÉE !')}</p>
            <h3>${time.toFixed(2)} s</h3>
            <p class="cook-stars">${medal}</p>
            ${record ? `<p class="fish-catch-record">${t('★ NOUVEAU RECORD ★')}</p>` : ''}
            <div class="cook-actions"><button class="btn" type="button">${t('↺ Rejouer')}</button></div>`;
        overlay.querySelector('button').addEventListener('click', countdown);
    };

    /* --- contrôles --- */
    const press = () => { holding = true; jump(); };
    stage.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button')) return;
        if (state === 'run') { e.preventDefault(); press(); }
    });
    window.addEventListener('pointerup', () => { holding = false; });
    window.addEventListener('keydown', (e) => {
        if (!gameOn('chocobo') || e.code !== 'Space' || e.target.closest?.('input, textarea')) return;
        e.preventDefault();
        if (e.repeat) return;
        if (state === 'run') press();
        else if (state === 'menu' || state === 'end') countdown();
    });
    window.addEventListener('keyup', (e) => { if (e.code === 'Space') holding = false; });

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
        // vitesse : accélère jusqu'à 13 m/s, boostée par les herbes, freinée par les chocs
        const target = stun > 0 ? 4 : (boost > 0 ? 17 : 13);
        speed += (target - speed) * Math.min(1, dt * (stun > 0 ? 6 : 1.4));
        boost = Math.max(0, boost - dt);
        stun = Math.max(0, stun - dt);
        dist += speed * dt;
        stride += speed * dt * 1.1; // ≈ 14 images/s à pleine vitesse
        // saut : maintenir = monter plus haut
        if (!onGround) {
            if (holding && jumpHold > 0) { vy -= H * 3.2 * dt; jumpHold -= dt; }
            vy += H * 5.2 * dt;
            y += vy * dt;
            if (y >= 0) { y = 0; vy = 0; onGround = true; for (let i = 0; i < 6; i++) dust.push({ x: P_X(), y: GROUND(), vx: rand(-60, 10), vy: rand(-50, -10), life: 0 }); }
        }
        // apparition des obstacles et des herbes
        if (dist + 22 > nextSpawn && nextSpawn < DIST - 15) {
            const r = Math.random();
            if (r < 0.7) obstacles.push({ m: nextSpawn, kind: Math.random() < 0.5 ? 'rock' : 'log', hit: false });
            else herbs.push({ m: nextSpawn, got: false, alt: Math.random() < 0.5 ? 0 : 1 });
            nextSpawn += rand(14, 30) - Math.min(8, dist / 120);
        }
        // collisions
        const px = dist; // position du joueur, en mètres
        for (const o of obstacles) {
            if (o.hit) continue;
            // la zone de choc suit la taille dessinée de l'obstacle
            const hw = (H * OBS[o.kind].w * 0.5) / PX_PER_M() + 0.25;
            if (Math.abs(o.m - px) < hw && -y < H * OBS[o.kind].h * 0.8) {
                o.hit = true;
                stun = 0.7;
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
                sfx.select();
            }
        }
        obstacles = obstacles.filter(o => o.m > dist - 5);
        herbs = herbs.filter(h => h.m > dist - 5);
        if (Math.random() < dt * speed * 0.8 && onGround) dust.push({ x: P_X() - 10, y: GROUND(), vx: rand(-80, -30), vy: rand(-30, -5), life: 0 });
        $('.race-time').textContent = `${time.toFixed(2)} s`;
        $('.race-progress span').style.width = `${Math.min(100, (dist / DIST) * 100)}%`;
        $('.race-progress i').style.left = `${Math.min(100, (dist / DIST) * 100)}%`;
        if (dist >= DIST) finish();
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
    const OBS = { rock: { h: 0.1, w: 0.13 }, log: { h: 0.075, w: 0.2 } };
    const drawObstacle = (o, x) => {
        const G = GROUND();
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
        draw(dt, T);
        raf = gameOn('chocobo') ? requestAnimationFrame(loop) : 0;
    };
    const run = () => {
        if (raf) return;
        ({ c, W, H } = fitCanvas(cv));
        last = performance.now();
        raf = requestAnimationFrame(loop);
    };
    document.addEventListener('gameopen', (e) => { if (e.detail === 'chocobo') { loadSprite(); deco = null; run(); if (state === 'run' || state === 'count') showMenu(); } });
    window.addEventListener('resize', () => { deco = null; if (raf) ({ c, W, H } = fitCanvas(cv)); });

    renderBest();
    showMenu();
    return { reset() { store.del(KEY); best = 0; renderBest(); showMenu(); } };
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
    window.addEventListener('resize', () => { if (raf) ({ c, W, H } = fitCanvas(cv)); });

    renderRecord();
    showStart();
    $('.bt-hero-name').textContent = getPlayer() || 'PLAYER 1';
    return { reset() { store.del(KEY); rec = load(); renderRecord(); showStart(); } };
})();

/* le "Reset votre progression" efface aussi les mini-jeux */
document.addEventListener('game', (e) => {
    if (e.detail.type === 'reset') { cooking.reset(); chocoboRace.reset(); battle.reset(); }
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
        const ROLES = [
            [t('Développement'), 'Elias Maruca'],
            [t('Design et direction artistique'), 'Elias Maruca'],
            [t('Joueur'), getPlayer() || 'PLAYER 1'],
            [t('Inspiration'), 'Final Fantasy XV — Square Enix'],
            [t('Musique'), '« Stand By Me » — Florence + The Machine'],
            [t('Polices'), 'Cinzel · Inter · JetBrains Mono'],
            [t('Bibliothèques'), 'jQuery · Typed.js · VanillaTilt · Font Awesome'],
            [t('Ton aventure'), `${getVisited().size} / ${TOTAL_ZONES} ${t('zones')} · ${getFound().size} / ${TOTAL_SECRETS} ${t('objets secrets')} · ${document.getElementById('trophyCount')?.textContent || 0} ${t('succès')}`],
            [t('Plus gros poisson'), best ? `${best.name || ''} ${best.size} cm`.trim() : '—'],
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
                <dl></dl>
                <p class="credits-thanks">${t('Merci d\'avoir joué jusqu\'au bout.')}</p>
                <p class="credits-fin">FIN</p>
            </div>`;
        const dl = el.querySelector('dl');
        ROLES.forEach(([k, v]) => {
            const dt = document.createElement('dt'); dt.textContent = k;
            const dd = document.createElement('dd'); dd.textContent = v;
            dl.append(dt, dd);
        });
        document.body.appendChild(el);
        document.body.classList.add('credits-open');

        const audio = new Audio(SONG);
        audio.volume = 0.8;
        audio.play().catch(() => { });

        const roll = el.querySelector('.credits-roll');
        let done = false;
        const finish = () => {
            if (done) return;
            done = true;
            achievements.unlock('trueEnd');
        };
        // le texte défile, puis "FIN" reste à l'écran tant que la musique joue
        const dur = reduceMotion ? 3000 : 60000; // mouvement réduit : générique fixe, qu'on peut faire défiler
        if (!reduceMotion) requestAnimationFrame(() => {
            const dist = roll.offsetHeight - window.innerHeight * 0.5;
            roll.style.transition = `transform ${dur}ms linear`;
            roll.style.transform = `translateY(${-Math.max(0, dist)}px)`;
        });
        const timer = setTimeout(finish, dur + 500);

        const close = () => {
            clearTimeout(timer);
            if (!done && performance.now() - opened > 15000) finish();
            el.classList.add('is-leaving');
            // fondu de la musique
            const v0 = audio.volume;
            const t0 = performance.now();
            const fade = () => {
                const k = Math.min(1, (performance.now() - t0) / 900);
                audio.volume = v0 * (1 - k);
                if (k < 1) requestAnimationFrame(fade); else audio.pause();
            };
            fade();
            setTimeout(() => { el.remove(); document.body.classList.remove('credits-open'); }, 900);
            document.removeEventListener('keydown', onKey);
        };
        const opened = performance.now();
        const onKey = (e) => { if (e.key === 'Escape') close(); };
        el.querySelector('.credits-skip').addEventListener('click', close);
        document.addEventListener('keydown', onKey);
        audio.addEventListener('ended', close);
        el.querySelector('.credits-skip').focus();
    };

    btn?.addEventListener('click', credits);
    document.addEventListener('trophy', render);
    document.addEventListener('game', (e) => { if (e.detail.type === 'reset') { wasReady = null; setTimeout(render, 50); } });
    render();
    return { play: credits };
})();
