/* =====================================================================
   aventure.js — ce qui fait vivre le monde autour du joueur :
   cycle jour/nuit, pseudos secrets.
   Chargé en dernier : utilise store, tr, sfx, achievements, getPlayer...
   ===================================================================== */

/* ---------------------------------------------------------------------
   1. CYCLE JOUR/NUIT — le ciel du site suit l'heure du visiteur
   (posé avant l'affichage par un petit script dans <head>, tenu à jour ici)
   --------------------------------------------------------------------- */
const dayCycle = (() => {
    const KEY = 'eliasPortfolio.daycycle';
    const root = document.documentElement;
    const NAMES = { dawn: tr('AUBE'), day: tr('JOUR'), dusk: tr('CRÉPUSCULE'), night: tr('NUIT') };
    const phaseAt = (d) => {
        const h = d.getHours() + d.getMinutes() / 60;
        if (h >= 5 && h < 8) return 'dawn';
        if (h >= 8 && h < 17.5) return 'day';
        if (h >= 17.5 && h < 21) return 'dusk';
        return 'night';
    };
    const enabled = () => store.get(KEY) !== 'off';

    // petite horloge à côté de "MENU", comme l'heure affichée en jeu
    let clock = null;
    const kicker = document.querySelector('.menu-kicker');
    if (kicker) {
        clock = document.createElement('span');
        clock.className = 'menu-clock';
        clock.innerHTML = '<i aria-hidden="true"></i><time></time>';
        kicker.appendChild(clock);
    }

    const update = () => {
        const now = new Date();
        const phase = enabled() ? phaseAt(now) : 'day';
        if (root.dataset.time !== phase) root.dataset.time = phase;
        if (!clock) return;
        clock.querySelector('time').textContent = now.toLocaleTimeString(LANG === 'en' ? 'en-GB' : 'fr-FR', { hour: '2-digit', minute: '2-digit' });
        clock.title = enabled() ? `${NAMES[phase]} · ${tr('le décor suit ton heure')}` : tr('Cycle jour/nuit désactivé');
    };
    update();
    // recalé sur la minute pile, puis toutes les minutes
    setTimeout(() => { update(); setInterval(update, 60e3); }, (60 - new Date().getSeconds()) * 1000 + 50);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) update(); });

    return {
        get phase() { return root.dataset.time; },
        name: (p) => NAMES[p] || p,
        enabled,
        set(on) { store.set(KEY, on ? 'on' : 'off'); update(); },
    };
})();

/* ---------------------------------------------------------------------
   2. PSEUDOS SECRETS — certains noms jouent une petite scène dans
   l'écran d'intro, puis donnent un titre (et un bonus dans les combats
   de la campagne, jamais contre le Golem).
   Pour en ajouter un : une ligne de plus dans PSEUDO_EGGS.
   --------------------------------------------------------------------- */
const PSEUDO_EGGS = [
    {
        id: 'elias', names: ['ELIAS', 'ELIAS MARUCA', 'MARUCA ELIAS', 'ELIASM4R'], fx: 'crown',
        title: 'LE CRÉATEUR', line: 'Bon retour chez toi. Ce monde, c\'est toi qui l\'as construit.',
        perk: { hp: 1.1, atk: 1.1, label: 'Créateur : +10 % de PV et d\'attaque en combat' },
    },
    {
        id: 'subaru', names: ['SUBARU', 'NATSUKI SUBARU', 'SUBARU NATSUKI'], fx: 'rewind',
        title: 'CELUI QUI REVIENT', line: 'Encore toi ? Combien de fois es-tu déjà revenu ici ?',
        perk: { revive: true, label: 'Retour par la mort : se relève une fois par combat' },
    },
    {
        id: 'noctis', names: ['NOCTIS', 'NOCT', 'NOCTIS LUCIS CAELUM'], fx: 'swords',
        title: 'ROI DE LUMIÈRE', line: 'Le roi est de retour, et ses lames avec lui.',
        perk: { atk: 1.15, label: 'Roi de lumière : +15 % de dégâts physiques' },
    },
    {
        id: 'prompto', names: ['PROMPTO', 'PROMPTO ARGENTUM'], fx: 'flash',
        title: 'PHOTOGRAPHE', line: 'Souris ! Ta visite finira dans l\'album.',
        perk: { crit: 0.1, label: 'Œil de photographe : +10 % de coups critiques' },
    },
    {
        id: 'gladio', names: ['GLADIOLUS', 'GLADIO', 'GLADIOLUS AMICITIA'], fx: 'shield',
        title: 'BOUCLIER DU ROI', line: 'Rien ne passera. Le bouclier veille.',
        perk: { hp: 1.2, label: 'Bouclier du roi : +20 % de PV' },
    },
    {
        id: 'ignis', names: ['IGNIS', 'IGNIS SCIENTIA'], fx: 'recipe',
        title: 'STRATÈGE ET CHEF', line: 'Je viens d\'avoir une idée de recette !',
        perk: { mp: 1.2, mag: 1.1, label: 'Stratège : +20 % de PM et +10 % de dégâts magiques' },
    },
];

const pseudoIdentity = (() => {
    // "élias", "Noctis !", "  gladio " : on compare sans accents, ponctuation ni casse
    const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
        .replace(/[^A-Z0-9]+/g, ' ').trim();
    const of = (name) => {
        const n = norm(name);
        return n ? PSEUDO_EGGS.find(e => e.names.includes(n)) || null : null;
    };
    const current = () => of(getPlayer());

    // le titre s'affiche sous le pseudo, dans la carte du joueur
    const renderTitle = () => {
        const egg = current();
        let el = document.getElementById('playerTitle');
        if (!el) {
            const lv = document.querySelector('#playerCard .player-lv');
            if (!lv) return;
            el = document.createElement('p');
            el.className = 'player-title';
            el.id = 'playerTitle';
            lv.after(el);
        }
        el.hidden = !egg;
        el.textContent = egg ? `◆ ${tr(egg.title)}` : '';
        el.title = egg ? tr(egg.perk.label) : '';
    };

    const recognise = () => {
        renderTitle();
        if (current()) achievements.unlock('alias');
    };
    document.addEventListener('game', (e) => { if (e.detail.type === 'player' || e.detail.type === 'reset') recognise(); });
    recognise();

    return { of, current, norm };
})();

/* La scène jouée dans l'intro (appelée par le formulaire du pseudo, script.js).
   Renvoie une promesse résolue à la fin de la scène, ou null pour un pseudo normal. */
window.pseudoEgg = (name, loader) => {
    const egg = pseudoIdentity.of(name);
    if (!egg || !loader) return null;
    const core = loader.querySelector('.loader-core');
    const nameEl = loader.querySelector('.loader-name');
    if (!core || !nameEl) return null;

    const card = document.createElement('div');
    card.className = 'egg-card';
    card.setAttribute('role', 'status');
    card.innerHTML = '<p class="egg-k"></p><p class="egg-title"></p><p class="egg-line"></p>';
    card.querySelector('.egg-k').textContent = tr('IDENTITÉ SECRÈTE');
    card.querySelector('.egg-title').textContent = tr(egg.title);
    card.querySelector('.egg-line').textContent = tr(egg.line);

    // la carte remplace le formulaire : on mesure le nom une fois la mise en page refaite
    loader.classList.add('is-egg');
    core.appendChild(card);
    const r = nameEl.getBoundingClientRect();
    const kick = loader.querySelector('.loader-kicker')?.getBoundingClientRect();
    const fx = document.createElement('div');
    fx.className = `egg-fx egg-fx-${egg.fx}`;
    fx.setAttribute('aria-hidden', 'true');
    fx.style.setProperty('--cx', `${r.left + r.width / 2}px`);
    fx.style.setProperty('--cy', `${r.top + r.height / 2}px`);
    fx.style.setProperty('--top', `${Math.min(r.top, kick && kick.height ? kick.top : r.top)}px`);

    const timers = [];
    const later = (ms, fn) => timers.push(setTimeout(fn, ms));
    const tone = (...a) => { if (sfx.on) sfx.tone(...a); };
    let audio = null;

    // décor propre à chaque pseudo (rien qui bouge si le mouvement est réduit)
    if (!reduceMotion) {
        switch (egg.fx) {
            case 'crown': {
                fx.innerHTML = '<div class="egg-crown"><svg viewBox="0 0 64 40"><path d="M4 37 7 9l13 13L32 3l12 19L57 9l3 28z"/><circle cx="7" cy="8" r="3"/><circle cx="32" cy="3" r="3"/><circle cx="57" cy="8" r="3"/></svg></div>'
                    + Array.from({ length: 16 }, (_, i) => `<span class="egg-mote" style="--x:${rand(5, 95).toFixed(1)}%;--d:${(i * 0.13).toFixed(2)}s;--s:${rand(3, 7).toFixed(1)}px"></span>`).join('');
                later(250, () => sfx.fanfare());
                break;
            }
            case 'rewind': {
                fx.innerHTML = '<div class="egg-clock"><i class="egg-hand-h"></i><i class="egg-hand-m"></i></div>'
                    + '<div class="egg-scan"></div><p class="egg-osd">◀◀ REW <span>00:00:00</span></p>';
                loader.classList.add('egg-gray');
                const tc = fx.querySelector('.egg-osd span');
                let left = 3 * 3600 + 27 * 60 + 41;
                const tick = setInterval(() => {
                    left = Math.max(0, left - 97);
                    const p = (n) => String(n).padStart(2, '0');
                    tc.textContent = `${p(Math.floor(left / 3600))}:${p(Math.floor(left / 60) % 60)}:${p(left % 60)}`;
                }, 60);
                timers.push(tick);
                if (sfx.on) {
                    audio = new Audio('./assets/rbd/ReturnByDeath.mp3');
                    audio.volume = 0.12;
                    audio.play().catch(() => { });
                }
                break;
            }
            case 'swords': {
                // les lames tombent du ciel et se rangent en ellipse autour du nom
                const N = 10;
                const rx = Math.min(r.width * 0.62, window.innerWidth * 0.46);
                const ry = Math.min(window.innerHeight * 0.3, 260);
                fx.innerHTML = Array.from({ length: N }, (_, i) => {
                    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
                    const x = Math.cos(a) * rx;
                    const y = Math.sin(a) * ry;
                    const deg = (a * 180) / Math.PI - 90; // pointe vers le centre
                    return `<i class="egg-blade" style="--bx:${x.toFixed(0)}px;--by:${y.toFixed(0)}px;--rot:${deg.toFixed(0)}deg;--d:${(i * 0.09).toFixed(2)}s"><b></b></i>`;
                }).join('');
                for (let i = 0; i < N; i++) later(120 + i * 90, () => tone(1600 + i * 90, 0.12, 'triangle', 0.025));
                later(1300, () => [523.3, 784, 1046.5].forEach((f, i) => tone(f, 0.5, 'sine', 0.04, i * 0.05)));
                break;
            }
            case 'flash': {
                fx.innerHTML = '<div class="egg-viewfinder"><i></i><i></i><i></i><i></i><p class="egg-rec">● REC <span>01 / 36</span></p></div><div class="egg-flash"></div>';
                const shot = (n) => {
                    tone(2600, 0.03, 'square', 0.03);
                    tone(1300, 0.06, 'square', 0.025, 0.04);
                    fx.querySelector('.egg-rec span').textContent = `${String(n).padStart(2, '0')} / 36`;
                    const f = fx.querySelector('.egg-flash');
                    f.classList.remove('is-on');
                    void f.offsetWidth;
                    f.classList.add('is-on');
                };
                later(700, () => shot(2));
                later(1500, () => shot(3));
                later(1850, () => shot(4));
                break;
            }
            case 'shield': {
                fx.innerHTML = '<div class="egg-shield"><svg viewBox="0 0 80 96"><path d="M40 3 75 15v28c0 24-15 40-35 50C20 83 5 67 5 43V15z"/><path class="egg-shield-in" d="M40 14 64 22v21c0 17-10 29-24 37-14-8-24-20-24-37V22z"/></svg></div><div class="egg-dust"></div>';
                later(420, () => {
                    loader.classList.add('egg-shake');
                    tone(82, 0.45, 'triangle', 0.09);
                    tone(55, 0.6, 'sine', 0.09, 0.02);
                });
                later(900, () => loader.classList.remove('egg-shake'));
                break;
            }
            case 'recipe': {
                fx.innerHTML = '<div class="egg-idea"><span>!</span></div>'
                    + Array.from({ length: 3 }, (_, i) => `<i class="egg-steam" style="--i:${i}"></i>`).join('');
                later(380, () => { tone(2093, 0.18, 'sine', 0.05); tone(2637, 0.3, 'sine', 0.045, 0.09); });
                break;
            }
            default:
        }
    } else {
        later(200, () => sfx.fanfare());
    }

    loader.appendChild(fx);
    achievements.unlock('alias');

    const SCENE = reduceMotion ? 2600 : 3400;
    return new Promise((resolve) => {
        later(SCENE, () => {
            card.classList.add('is-out');
            fx.classList.add('is-out');
            if (audio) {
                const v0 = audio.volume;
                const t0 = performance.now();
                const fade = () => {
                    const k = Math.min(1, (performance.now() - t0) / 700);
                    audio.volume = v0 * (1 - k);
                    if (k < 1) requestAnimationFrame(fade); else audio.pause();
                };
                fade();
            }
        });
        later(SCENE + 380, () => {
            timers.forEach(id => { clearTimeout(id); clearInterval(id); });
            loader.classList.remove('egg-gray', 'egg-shake');
            card.remove();
            fx.remove();
            resolve(egg);
        });
    });
};

/* ---------------------------------------------------------------------
   3. CHASSE AUX CRISTAUX — 7 éclats cachés dans le site, parfois dans
   un sous-menu. Les 7 réunis : arme et technique pour les combats,
   traînée « Cristal royal » et succès « Gardien des cristaux ».
   --------------------------------------------------------------------- */
const crystalHunt = (() => {
    const KEY = 'eliasPortfolio.crystals';
    // l'ordre sert aux indices de Lumi (plus bas)
    const SPOTS = ['carousel', 'cv', 'maths', 'initiative', 'loup', 'esystems', 'ost'];
    const TOTAL = SPOTS.length;
    const get = () => { try { return new Set(JSON.parse(store.get(KEY) || '[]').filter(id => SPOTS.includes(id))); } catch { return new Set(); } };
    const has = (id) => get().has(id);
    const SVG = '<svg viewBox="0 0 20 26" aria-hidden="true"><path class="cs-a" d="M10 1 18 9 10 25 2 9z"/><path class="cs-b" d="M10 1 13.5 9 10 25 6.5 9z"/><path class="cs-c" d="M2 9h16L10 1z"/></svg>';

    const chime = () => [1568, 2093, 2637, 3136].forEach((f, i) => { if (sfx.on) sfx.tone(f, 0.35, 'sine', 0.035, i * 0.07); });

    const make = (id, cls) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `crystal-shard ${cls || ''}`.trim();
        b.dataset.crystal = id;
        b.setAttribute('aria-label', tr('Un cristal brille ici'));
        b.innerHTML = SVG;
        // le carrousel capte le pointeur pour tourner : le cristal garde le sien
        b.addEventListener('pointerdown', (e) => e.stopPropagation());
        b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); collect(id, b); });
        return b;
    };

    // pose le cristal dans `parent` (ou l'enlève s'il est déjà ramassé)
    const place = (id, parent, cls) => {
        if (!parent) return;
        const cur = document.querySelector(`.crystal-shard[data-crystal="${id}"]`);
        if (has(id)) { cur?.remove(); return; }
        if (cur && cur.parentElement === parent) return;
        cur?.remove();
        parent.appendChild(make(id, cls));
    };
    const remove = (id) => document.querySelector(`.crystal-shard[data-crystal="${id}"]`)?.remove();

    const collect = (id, btn) => {
        const got = get();
        if (got.has(id)) return;
        got.add(id);
        store.set(KEY, JSON.stringify([...got]));
        chime();
        // éclat qui s'envole, puis le cristal disparaît
        const r = btn.getBoundingClientRect();
        const burst = document.createElement('div');
        burst.className = 'crystal-burst';
        burst.style.left = `${r.left + r.width / 2}px`;
        burst.style.top = `${r.top + r.height / 2}px`;
        burst.innerHTML = Array.from({ length: 10 }, (_, i) => `<i style="--a:${i * 36}deg"></i>`).join('');
        document.body.appendChild(burst);
        setTimeout(() => burst.remove(), 900);
        btn.remove();
        if (typeof showToast === 'function') showToast(`◆ ${tr('CRISTAL')} ${got.size} / ${TOTAL}`);
        document.dispatchEvent(new CustomEvent('crystal', { detail: { id, count: got.size, total: TOTAL } }));
        if (got.size === TOTAL) setTimeout(finale, reduceMotion ? 300 : 900);
    };

    /* ---------- les cachettes ---------- */
    // 1. Accueil : sur le titre de la jaquette de Final Fantasy XV, seulement quand elle passe devant.
    //    Entre 917 et 1100 px le carrousel est masqué : le cristal se cache alors dans le badge du héros.
    const carouselShown = () => {
        const w = document.querySelector('.home .wrapper');
        return !!w && getComputedStyle(w).display !== 'none';
    };
    let frontTitle = '';
    const placeCarousel = () => {
        if (has('carousel')) { remove('carousel'); return; }
        if (!carouselShown()) { place('carousel', document.querySelector('.home .hero-status'), 'is-inline'); return; }
        if (/final fantasy xv$/i.test(frontTitle)) place('carousel', document.querySelector('.cover-label b'), 'is-inline');
        else remove('carousel');
    };
    document.addEventListener('coverfront', (e) => { frontTitle = e.detail || ''; placeCarousel(); });
    window.addEventListener('resize', placeCarousel);

    const placeStatic = () => {
        // 2. dans la fenêtre du CV, à côté du bouton de téléchargement
        place('cv', document.querySelector('#cvModal .cv-modal-actions'));
        // 5. Réalisations : dans le coin de l'image de la quête « Question pour un p'tit loup »
        place('loup', document.querySelector('#q-qppl .quest-media'), 'is-corner');
        // 6. Expériences : dans la fiche du stage d'observation E-SYSTEMS
        place('esystems', document.querySelector('#stage-esystems .stage-meta'), 'is-inline');
        placeCarousel();
    };

    // 3. Compétences : dans la fiche de « Modélisation Mathématique », au bout du niveau
    document.addEventListener('skillshow', (e) => {
        if (e.detail === 'maths') place('maths', document.querySelector('#statDetail .sd-level p'), 'is-inline');
    });

    // 4. Soft Skills : dans le panneau, seulement quand la sphère « Initiative » est choisie
    document.getElementById('sphereBoard')?.addEventListener('click', (e) => {
        const node = e.target.closest('.sphere-node');
        if (!node) return;
        if (node.dataset.node === 's10') place('initiative', document.querySelector('.sphere-panel'), 'is-panel');
        else remove('initiative');
    });

    // 7. dans la file d'attente du lecteur de musique
    document.addEventListener('ostlist', () => place('ost', document.getElementById('ostList'), 'is-list'));

    /* ---------- les 7 réunis ---------- */
    function finale() {
        const el = document.createElement('div');
        el.className = 'crystal-finale';
        el.setAttribute('role', 'dialog');
        el.setAttribute('aria-modal', 'true');
        el.setAttribute('aria-labelledby', 'crystalFinaleTitle');
        el.innerHTML = `
            <div class="cf-ring" aria-hidden="true">${Array.from({ length: TOTAL }, (_, i) => `<i style="--i:${i}">${SVG}</i>`).join('')}</div>
            <div class="cf-core" aria-hidden="true">${SVG}</div>
            <div class="cf-card">
                <p class="cf-k"></p>
                <h2 id="crystalFinaleTitle"></h2>
                <p class="cf-sub"></p>
                <ul class="cf-loot"></ul>
                <button class="btn cf-ok" type="button"></button>
            </div>`;
        el.querySelector('.cf-k').textContent = `◆ ${TOTAL} / ${TOTAL} ◆`;
        el.querySelector('h2').textContent = tr('Les cristaux sont réunis');
        el.querySelector('.cf-sub').textContent = tr('Le cristal te confie ses trésors :');
        [
            ['⚔️', tr('Épée des Rois'), tr('arme · à équiper dans 🎒 pour les combats')],
            ['✦', tr('Lames fantômes'), tr('technique · frappe tous les ennemis')],
            ['💠', tr('Cristal royal'), tr('traînée du curseur · 🎒 Apparence')],
        ].forEach(([icon, name, what]) => {
            const li = document.createElement('li');
            li.innerHTML = '<span></span><b></b><small></small>';
            li.querySelector('span').textContent = icon;
            li.querySelector('b').textContent = name;
            li.querySelector('small').textContent = what;
            el.querySelector('.cf-loot').appendChild(li);
        });
        const ok = el.querySelector('.cf-ok');
        ok.textContent = tr('Continuer');
        document.body.appendChild(el);
        sfx.fanfare();
        const close = () => {
            el.classList.add('is-leaving');
            document.removeEventListener('keydown', onKey);
            setTimeout(() => {
                el.remove();
                // le succès arrive une fois l'écran fermé, pour que sa notification se voie
                achievements.unlock('crystals');
            }, reduceMotion ? 0 : 400);
        };
        const onKey = (e) => { if (e.key === 'Escape') close(); };
        ok.addEventListener('click', close);
        document.addEventListener('keydown', onKey);
        setTimeout(() => ok.focus(), reduceMotion ? 50 : 2200);
    }

    document.addEventListener('game', (e) => {
        if (e.detail.type !== 'reset') return;
        store.del(KEY);
        placeStatic();
    });
    placeStatic();
    // les 7 déjà réunis mais la page fermée pendant la cinématique : le succès est quand même donné
    if (get().size === TOTAL && !achievements.has('crystals')) achievements.unlock('crystals');

    return {
        get count() { return get().size; },
        total: TOTAL,
        has,
        missing: () => SPOTS.filter(id => !has(id)),
    };
})();

/* ---------------------------------------------------------------------
   4. TEMPS DE JEU — compté seulement quand la page est visible
   --------------------------------------------------------------------- */
const playTime = (() => {
    const KEY = 'eliasPortfolio.playtime';
    let total = Number(store.get(KEY)) || 0; // en secondes
    let since = document.hidden ? 0 : performance.now();
    const flush = () => {
        if (!since) return;
        const now = performance.now();
        total += (now - since) / 1000;
        since = now;
        store.set(KEY, String(Math.floor(total)));
    };
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) { flush(); since = 0; } else since = performance.now();
    });
    window.addEventListener('pagehide', flush);
    setInterval(flush, 20000);
    document.addEventListener('game', (e) => {
        if (e.detail.type !== 'reset') return;
        total = 0;
        since = document.hidden ? 0 : performance.now();
        store.del(KEY);
    });
    const seconds = () => total + (since ? (performance.now() - since) / 1000 : 0);
    const format = (s = seconds()) => {
        s = Math.floor(s);
        const p = (n) => String(n).padStart(2, '0');
        return `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`;
    };
    return { seconds, format };
})();

/* ---------------------------------------------------------------------
   5. LUMI — un petit esprit de cristal qui vit dans le menu. Il donne
   des indices en trois temps (énigme, page, endroit exact) et lève un
   « ! » quand rien n'a avancé depuis quelques minutes.
   Pour un nouvel indice : lumi.add(id, catégorie, déjàFait, énigme, page, exact).
   --------------------------------------------------------------------- */
let lumiSvgCount = 0;
function lumiSvg() {
    const id = `lumiGrad${++lumiSvgCount}`;
    return `<svg class="lumi-svg" viewBox="0 0 40 46" aria-hidden="true" focusable="false">
        <defs><linearGradient id="${id}" x1="0.2" y1="0" x2="0.6" y2="1"><stop class="lumi-stop-a" offset="0"/><stop class="lumi-stop-b" offset="1"/></linearGradient></defs>
        <g class="lumi-orbit"><circle cx="36" cy="12" r="1.4"/></g>
        <g class="lumi-float">
            <path class="lumi-body" fill="url(#${id})" d="M20 3 33.5 19 20 43 6.5 19z"/>
            <path class="lumi-facet" d="M20 3 6.5 19 20 24z"/>
            <path class="lumi-shine" d="M16.5 9.5 12.5 15"/>
            <g class="lumi-eyes"><ellipse cx="15.8" cy="21.5" rx="1.6" ry="2.1"/><ellipse cx="24.2" cy="21.5" rx="1.6" ry="2.1"/></g>
            <ellipse class="lumi-cheek" cx="12.8" cy="25.4" rx="1.7" ry="0.9"/>
            <ellipse class="lumi-cheek" cx="27.2" cy="25.4" rx="1.7" ry="0.9"/>
        </g>
    </svg>`;
}

const lumi = (() => {
    const kicker = document.querySelector('.menu-kicker');
    if (!kicker) return null;
    const MET_KEY = 'eliasPortfolio.lumi';
    const STUCK_MS = 3 * 60 * 1000;

    const PAGES = { home: 'Accueil', about: 'Présentation', skills: 'Compétences', softskills: 'Soft Skills', education: 'Parcours', work: 'Réalisations', experience: 'Expériences', games: 'Mini-jeux' };
    const lookIn = (id) => tr('Regarde du côté de la page « %s ».').replace('%s', tr(PAGES[id] || id));
    const ach = (id) => achievements.has(id);
    const chestOpen = (id) => { try { return JSON.parse(store.get('eliasPortfolio.chests') || '[]').includes(id); } catch { return false; } };
    const secret = (id) => getFound().has(id);
    const crystal = (id) => crystalHunt.has(id);

    const CAT = { end: tr('FIN CACHÉE'), secret: tr('OBJET SECRET'), crystal: tr('CRISTAL'), chest: tr('COFFRE'), trophy: tr('SUCCÈS') };
    const topics = [];
    // un sujet = une catégorie, une condition « déjà fait », puis 3 phrases de plus en plus claires
    const add = (id, cat, done, riddle, where, exact) => topics.push({ id, cat: CAT[cat] || cat, done, lines: [riddle, where, exact] });

    /* --- d'abord le chemin vers la vraie fin --- */
    add('explorer', 'end', () => ach('explorer'), tr('Un vrai héros visite chaque recoin du royaume.'), tr('La barre sous ton pseudo montre les zones déjà vues.'), tr('Ouvre chacune des 7 pages du menu pour atteindre le niveau MAX.'));
    add('sonic', 'secret', () => secret('sonic'), tr('Quelque chose de très rapide traverse l\'accueil sans jamais s\'arrêter.'), lookIn('home'), tr('Clique sur le petit personnage qui court tout en bas de l\'accueil.'));
    add('cuphead', 'secret', () => secret('cuphead'), tr('Une tasse attend dans un coin, là où les statistiques s\'arrêtent.'), lookIn('skills'), tr('Coin en bas à droite de la page Compétences.'));
    add('pvz', 'secret', () => secret('pvz'), tr('Une plante a poussé au pied du sphérier.'), lookIn('softskills'), tr('En bas à gauche du sphérier, sous les sphères.'));
    add('mario', 'secret', () => secret('mario'), tr('Un plombier s\'est caché dans la marge du parcours.'), lookIn('education'), tr('Sur le bord gauche de la page Parcours, à mi-hauteur.'));
    add('fnf', 'secret', () => secret('fnf'), tr('Quelqu\'un attend au-dessus des quêtes, micro à la main.'), lookIn('work'), tr('Tout en haut à droite de la page Réalisations.'));
    add('hk', 'secret', () => secret('hk'), tr('Un petit chevalier veille sur le journal.'), lookIn('experience'), tr('Sur le bord gauche de la page Expériences, vers le haut.'));
    add('sphere', 'end', () => ach('sphere'), tr('Le sphérier n\'est pas encore entièrement illuminé.'), lookIn('softskills'), tr('Clique sur chacune des 11 sphères du sphérier.'));
    add('recruit', 'end', () => ach('recruit'), tr('Elias attend une réponse à sa question.'), lookIn('experience'), tr('Tout en bas de la page Expériences, réponds « Oui » à Elias.'));
    add('fish1', 'end', () => ach('fish1'), tr('Le lac attend un pêcheur patient.'), lookIn('games'), tr('Mini-jeux, Pêche : attrape un poisson.'));
    add('chef', 'end', () => ach('chef'), tr('Un bon aventurier sait aussi cuisiner.'), lookIn('games'), tr('Mini-jeux, Cuisine : obtiens 3 étoiles sur une recette.'));
    add('chocobo', 'end', () => ach('chocobo'), tr('Les chocobos t\'attendent sur la piste.'), lookIn('games'), tr('Mini-jeux, Chocobo Race : termine une course.'));
    add('battle', 'end', () => ach('battle'), tr('Un golem de cristal garde le dernier passage.'), lookIn('games'), tr('Mini-jeux, Combat : bats le Golem de cristal.'));
    add('trueEnd', 'end', () => ach('trueEnd'), tr('Quand tout est accompli, une dernière porte s\'ouvre…'), tr('Les 8 conditions de la fin cachée sont listées tout en bas de la page Expériences.'), tr('Remplis les 8 conditions, puis lance la fin cachée tout en bas de la page Expériences.'));
    /* --- les cristaux --- */
    add('c-carousel', 'crystal', () => crystal('carousel'), tr('Un cristal suit le roi quand il passe au premier rang.'), lookIn('home'), tr('Fais tourner le carrousel jusqu\'à Final Fantasy XV : le cristal brille à côté du titre.'));
    add('c-cv', 'crystal', () => crystal('cv'), tr('Un cristal dort entre les pages de mon histoire.'), lookIn('about'), tr('Ouvre le CV : il est à côté du bouton de téléchargement.'));
    add('c-maths', 'crystal', () => crystal('maths'), tr('Un cristal adore les équations.'), lookIn('skills'), tr('Choisis « Modélisation Math. » : il brille au bout du niveau.'));
    add('c-initiative', 'crystal', () => crystal('initiative'), tr('Un cristal récompense ceux qui prennent les devants.'), lookIn('softskills'), tr('Active la sphère « Initiative » : il apparaît dans le panneau.'));
    add('c-loup', 'crystal', () => crystal('loup'), tr('Un cristal s\'est caché chez un petit loup.'), lookIn('work'), tr('Ouvre la quête « Question pour un p\'tit loup » : coin de l\'image.'));
    add('c-esystems', 'crystal', () => crystal('esystems'), tr('Un cristal se souvient de mon tout premier stage.'), lookIn('experience'), tr('Ouvre la fiche du stage E-SYSTEMS : juste à côté de la date.'));
    add('c-ost', 'crystal', () => crystal('ost'), tr('Un cristal fredonne au milieu de la musique.'), tr('Il n\'est sur aucune page : cherche dans la carte du joueur.'), tr('Allume la musique 🎧 puis ouvre la file d\'attente.'));
    /* --- les coffres --- */
    add('k-prism', 'chest', () => chestOpen('prism'), tr('Un coffre se cache dans la marge de ma présentation.'), lookIn('about'), tr('Sur le bord gauche de la page Présentation, à mi-hauteur.'));
    add('k-emerald', 'chest', () => chestOpen('emerald'), tr('Un coffre vert attend près des diplômes.'), lookIn('education'), tr('En haut à droite de la page Parcours.'));
    add('k-sakura', 'chest', () => chestOpen('sakura'), tr('Des pétales tombent quelque part dans le journal.'), lookIn('experience'), tr('Tout en haut à gauche de la page Expériences.'));
    /* --- les succès les plus cachés --- */
    add('alias', 'trophy', () => ach('alias'), tr('Certains noms réveillent des souvenirs : un prince, ses trois amis, ou un garçon qui revient de la mort.'), tr('Le pseudo se choisit au tout début… ou après un reset.'), tr('Reset ta progression et prends Noctis, Prompto, Gladio, Ignis, Subaru… ou Elias comme pseudo.'));
    add('konami', 'trophy', () => ach('konami'), tr('Un vieux code de triche réveille quelqu\'un de très sombre.'), tr('Il se tape au clavier, sur n\'importe quelle page.'), tr('Tape ↑ ↑ ↓ ↓ ← → ← → B A.'));
    add('campfire', 'trophy', () => ach('campfire'), tr('Même les héros ont besoin de repos.'), tr('Pose la souris et ne touche plus à rien…'), tr('Ne touche à rien pendant une minute.'));
    add('stubborn', 'trophy', () => ach('stubborn'), tr('Et si tu disais non, pour voir ?'), lookIn('experience'), tr('Réponds « Non » à la question d\'Elias.'));
    add('fishBig', 'trophy', () => ach('fishBig'), tr('Le roi du lac mesure plus d\'un mètre.'), lookIn('games'), tr('Pêche : attrape un poisson de plus de 100 cm (4 ou 5 étoiles).'));
    add('nightMonster', 'trophy', () => ach('nightMonster'), tr('Un monstre ne mord qu\'à la nuit tombée.'), tr('Reviens pêcher tard le soir.'), tr('Pêche entre 22 h et 4 h pour croiser le Mummy Bass.'));
    add('ultimateChef', 'trophy', () => ach('ultimateChef'), tr('Le dernier banquet est réservé aux chefs les plus rapides.'), lookIn('games'), tr('Cuisine : obtiens 2 étoiles au Banquet ultime.'));
    add('nightOwl', 'trophy', () => ach('nightOwl'), tr('Les hiboux voient des choses que les autres ne voient pas.'), tr('Tout dépend de l\'heure de ta visite.'), tr('Reviens entre 3 h et 4 h du matin.'));

    let cur = null;
    const levels = {}; // niveau d'indice atteint pour chaque sujet (0, 1 ou 2)
    const pending = () => topics.filter(t => !t.done());
    const currentTopic = () => {
        const t = topics.find(x => x.id === cur);
        return t && !t.done() ? t : pending()[0] || null;
    };
    const nextTopic = () => {
        const n = topics.length;
        const start = Math.max(0, topics.findIndex(t => t.id === cur));
        for (let k = 1; k <= n; k++) {
            const t = topics[(start + k) % n];
            if (!t.done()) return t;
        }
        return null;
    };

    /* ---------- Lumi dans le menu ---------- */
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lumi';
    btn.innerHTML = `${lumiSvg()}<span class="lumi-alert" aria-hidden="true">!</span>`;
    kicker.insertBefore(btn, kicker.querySelector('.menu-clock'));
    const menuBtn = document.getElementById('menu');

    /* ---------- la boîte de dialogue ---------- */
    const box = document.createElement('div');
    box.className = 'lumi-dialog';
    box.hidden = true;
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-labelledby', 'lumiName');
    box.innerHTML = `
        <div class="ld-portrait">${lumiSvg()}</div>
        <div class="ld-body">
            <p class="ld-head"><b id="lumiName">LUMI</b><span class="ld-cat"></span><span class="ld-steps" aria-hidden="true"><i></i><i></i><i></i></span></p>
            <p class="ld-text"><span class="ld-typed" aria-hidden="true"></span><span class="sr-only ld-full" aria-live="polite"></span></p>
            <div class="ld-actions">
                <button type="button" class="ld-btn ld-more"></button>
                <button type="button" class="ld-btn ld-next"></button>
                <button type="button" class="ld-btn ld-close"></button>
            </div>
        </div>`;
    document.body.appendChild(box);
    const $ = (s) => box.querySelector(s);
    const catEl = $('.ld-cat'), typed = $('.ld-typed'), full = $('.ld-full');
    const dots = [...box.querySelectorAll('.ld-steps i')];
    const more = $('.ld-more'), next = $('.ld-next'), closeBtn = $('.ld-close');
    more.textContent = tr('Plus clair');
    next.textContent = tr('Autre indice');
    closeBtn.textContent = tr('Merci !');

    // le texte s'écrit lettre par lettre (un clic l'affiche d'un coup)
    let typing = 0;
    const type = (text) => {
        clearInterval(typing);
        full.textContent = text;
        if (reduceMotion) { typed.textContent = text; return; }
        let i = 0;
        typed.textContent = '';
        typing = setInterval(() => {
            i += 2;
            typed.textContent = text.slice(0, i);
            if (i >= text.length) clearInterval(typing);
            else if (sfx.on && i % 8 === 0) sfx.tone(1400 + Math.random() * 400, 0.03, 'triangle', 0.01);
        }, 24);
    };
    $('.ld-text').addEventListener('click', () => { clearInterval(typing); typed.textContent = full.textContent; });

    const render = (greet = '') => {
        const t = currentTopic();
        if (!t) {
            cur = null;
            catEl.textContent = '';
            dots.forEach(d => d.classList.add('is-on'));
            more.hidden = next.hidden = true;
            type(`${greet} ${tr('Tu as tout trouvé ! Je n\'ai plus rien à t\'apprendre… sauf peut-être que la touche Échap ouvre le menu pause.')}`.trim());
            return;
        }
        cur = t.id;
        const lv = levels[cur] || 0;
        catEl.textContent = t.cat;
        dots.forEach((d, i) => d.classList.toggle('is-on', i <= lv));
        more.hidden = next.hidden = false;
        more.disabled = lv >= 2;
        next.disabled = pending().length < 2;
        type(`${greet} ${t.lines[lv]}`.trim());
    };

    let lastFocus = null;
    const open = () => {
        // menu mobile ouvert : on le referme pour laisser la place au dialogue
        if (menuBtn?.classList.contains('fa-times')) menuBtn.click();
        lastFocus = document.activeElement;
        const met = store.get(MET_KEY) === '1';
        const greet = !met
            ? tr('Moi, c\'est Lumi, l\'esprit du cristal de ce menu. Je connais tous les secrets du site !')
            : calling ? tr('Rien n\'a bougé depuis un moment… Tiens, un indice :') : tr('Psst !');
        store.set(MET_KEY, '1');
        setCalling(false);
        lastProgress = Date.now();
        box.hidden = false;
        render(greet);
        setTimeout(() => (more.hidden || more.disabled ? closeBtn : more).focus(), 30);
    };
    const close = () => {
        if (box.hidden) return;
        clearInterval(typing);
        box.hidden = true;
        if (lastFocus && document.contains(lastFocus) && lastFocus.offsetParent !== null) lastFocus.focus();
    };
    more.addEventListener('click', () => { levels[cur] = Math.min(2, (levels[cur] || 0) + 1); render(); });
    next.addEventListener('click', () => { const t = nextTopic(); if (t) cur = t.id; render(); });
    closeBtn.addEventListener('click', close);
    btn.addEventListener('click', () => (box.hidden ? open() : close()));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !box.hidden) close(); });

    /* ---------- « ! » : le joueur est bloqué ---------- */
    let lastProgress = Date.now(), calling = false, hiddenAt = 0;
    function setCalling(on) {
        if (calling === on) return;
        calling = on;
        btn.classList.toggle('is-calling', on);
        menuBtn?.classList.toggle('has-lumi', on);
        btn.setAttribute('aria-label', on ? tr('Lumi a un indice pour toi') : tr('Lumi : demander un indice'));
        btn.title = on ? tr('Lumi a un indice pour toi') : tr('Lumi : besoin d\'un indice ?');
        if (on && sfx.on) { sfx.tone(2093, 0.18, 'sine', 0.025); sfx.tone(2637, 0.24, 'sine', 0.02, 0.12); }
    }
    btn.setAttribute('aria-label', tr('Lumi : demander un indice'));
    btn.title = tr('Lumi : besoin d\'un indice ?');
    const progress = () => { lastProgress = Date.now(); setCalling(false); };
    document.addEventListener('game', (e) => { if (e.detail.type !== 'reset') progress(); });
    document.addEventListener('trophy', progress);
    document.addEventListener('crystal', progress);
    // le temps passé sur un autre onglet ne compte pas
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) hiddenAt = Date.now();
        else if (hiddenAt) { lastProgress += Date.now() - hiddenAt; hiddenAt = 0; }
    });
    setInterval(() => {
        if (document.hidden || calling || !box.hidden || !document.body.classList.contains('is-loaded')) return;
        if (Date.now() - lastProgress > STUCK_MS && currentTopic()) setCalling(true);
    }, 10000);

    return {
        add,
        open,
        close,
        get isOpen() { return !box.hidden; },
        // l'indice du moment, pour le menu pause
        peek: () => { const t = currentTopic(); return t ? { cat: t.cat, text: t.lines[levels[t.id] || 0] } : null; },
    };
})();

/* ---------------------------------------------------------------------
   6. MENU PAUSE (Échap) — le site se fige derrière un voile flouté :
   reprendre, statistiques, options, succès, retour au Spawn.
   --------------------------------------------------------------------- */
const pauseMenu = (() => {
    const ITEMS = [
        { id: 'resume', label: tr('Reprendre') },
        { id: 'stats', label: tr('Statistiques') },
        { id: 'options', label: tr('Options') },
        { id: 'trophies', label: tr('Succès') },
        { id: 'home', label: tr('Retour au Spawn') },
    ];
    const PAGES = { home: 'Accueil', about: 'Présentation', skills: 'Compétences', softskills: 'Soft Skills', education: 'Parcours', work: 'Réalisations', experience: 'Expériences', games: 'Mini-jeux' };
    let el = null, sel = 0, lastFocus = null, ticker = 0, inerted = [];

    // une autre fenêtre est ouverte : Échap la ferme elle, pas de pause
    const blocked = () => {
        if (!document.body.classList.contains('is-loaded')) return true;
        if (document.body.classList.contains('games-modal-open')) return true;
        if (document.getElementById('cvModal')?.getAttribute('aria-hidden') === 'false') return true;
        if (['trophies', 'equip', 'gameOver'].some(id => { const b = document.getElementById(id); return b && !b.hidden; })) return true;
        if (document.querySelector('.navbar.nav-toggle')) return true;
        return !!document.querySelector('.confirm:not([hidden]), .credits, .crystal-finale, .rbd, .campfire, .stage-modal-overlay.active, .stat-detail.is-sheet:not([hidden]), .lumi-dialog:not([hidden])');
    };

    const count = (key) => { try { return JSON.parse(store.get(key) || '[]').length; } catch { return 0; } };
    const progressRows = () => {
        const end = trueEnding.progress?.() || [0, 8];
        return [
            [tr('Zones explorées'), getVisited().size, TOTAL_ZONES],
            [tr('Objets secrets'), getFound().size, TOTAL_SECRETS],
            [tr('Cristaux'), crystalHunt.count, crystalHunt.total],
            [tr('Coffres'), count('eliasPortfolio.chests'), document.querySelectorAll('.chest').length],
            [tr('Sphérier'), count('eliasPortfolio.sphere'), document.querySelectorAll('.sphere-skill').length],
            [tr('Succès'), achievements.count(), achievements.total()],
            [tr('Fin cachée'), end[0], end[1]],
        ];
    };
    const completion = () => {
        const rows = progressRows();
        const got = rows.reduce((a, r) => a + Math.min(r[1], r[2]), 0);
        const all = rows.reduce((a, r) => a + r[2], 0);
        return all ? Math.round((got / all) * 100) : 0;
    };
    const where = () => tr(PAGES[document.querySelector('body > section.is-active')?.id] || 'Accueil');

    /* ---------- les panneaux de droite ---------- */
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const panels = {
        resume() {
            const title = document.getElementById('playerTitle')?.textContent || '';
            const lv = document.getElementById('playerLv')?.textContent || '1';
            const hint = lumi?.peek();
            const now = new Date();
            const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            return `
                <div class="pz-hero">
                    <span class="pz-gem" aria-hidden="true"></span>
                    <p class="pz-name">${esc(getPlayer() || 'PLAYER 1')}</p>
                    <p class="pz-sub">${title ? `${esc(title)} · ` : ''}LV ${esc(lv)}</p>
                </div>
                <dl class="pz-facts">
                    <div><dt>${tr('LIEU')}</dt><dd>${esc(where())}</dd></div>
                    <div><dt>${tr('TEMPS DE JEU')}</dt><dd class="pz-time">${playTime.format()}</dd></div>
                    <div><dt>${tr('HEURE')}</dt><dd>${hhmm} · ${esc(dayCycle.name(dayCycle.phase))}</dd></div>
                    <div><dt>${tr('COMPLÉTION')}</dt><dd>${completion()} %</dd></div>
                </dl>
                ${hint ? `<div class="pz-lumi">
                    <span class="pz-lumi-face">${lumiSvg()}</span>
                    <p><b>LUMI · ${esc(hint.cat)}</b>« ${esc(hint.text)} »</p>
                    <button type="button" class="pz-ask">${tr('Demander à Lumi')}</button>
                </div>` : ''}`;
        },
        stats() {
            const rows = progressRows().map(([label, got, all]) => {
                const v = all ? Math.min(100, Math.round((got / all) * 100)) : 0;
                return `<li class="${got >= all && all ? 'is-full' : ''}"><span>${esc(label)}</span><b>${got} / ${all}</b><i style="--v:${v}%"></i></li>`;
            }).join('');
            const records = [['Fishing', tr('Pêche')], ['Cooking', tr('Cuisine')], ['Chocobo', 'Chocobo Race'], ['Battle', tr('Combat')]]
                .map(([id, label]) => [label, document.getElementById(`hub${id}`)?.textContent.trim() || '—'])
                .map(([label, val]) => `<li><span>${esc(label)}</span><b>${esc(val)}</b></li>`).join('');
            return `
                <p class="pz-k">${tr('PROGRESSION')}<b>${completion()} %</b></p>
                <ul class="pz-bars">${rows}</ul>
                <p class="pz-k">${tr('RECORDS')}</p>
                <ul class="pz-records">${records}</ul>`;
        },
        options() {
            const sw = (id, on, label) => `<li><span id="pz-l-${id}">${label}</span><button type="button" class="pz-switch" role="switch" data-opt="${id}" aria-checked="${on}" aria-labelledby="pz-l-${id}"><i></i></button></li>`;
            const vol = Math.round((window.ost?.volume ?? 0.3) * 100);
            return `
                <p class="pz-k">${tr('OPTIONS')}</p>
                <ul class="pz-opts">
                    ${sw('sound', sfx.on, tr('Sons du menu'))}
                    ${sw('music', !!window.ost?.on, tr('Musique (OST)'))}
                    <li><span id="pz-l-vol">${tr('Volume de la musique')}</span><input type="range" class="pz-range" data-opt="volume" min="0" max="100" step="5" value="${vol}" style="--v:${vol}%" aria-labelledby="pz-l-vol"></li>
                    ${sw('daycycle', dayCycle.enabled(), tr('Ciel qui suit l\'heure'))}
                    <li><span>${tr('Langue')}</span><span class="pz-seg"><button type="button" data-lang="fr" aria-pressed="${LANG !== 'en'}">FR</button><button type="button" data-lang="en" aria-pressed="${LANG === 'en'}">EN</button></span></li>
                </ul>`;
        },
        trophies() {
            const recent = achievements.recent(4).map(t => `<li><span>${esc(t.icon)}</span>${esc(t.name)}</li>`).join('');
            return `
                <p class="pz-k">${tr('SUCCÈS')}</p>
                <p class="pz-big">${achievements.count()}<small> / ${achievements.total()}</small></p>
                ${recent ? `<p class="pz-k">${tr('DERNIERS DÉBLOQUÉS')}</p><ul class="pz-recent">${recent}</ul>` : ''}
                <p class="pz-hint">${tr('Valide pour ouvrir la liste complète.')}</p>`;
        },
        home() {
            return `
                <p class="pz-k">${tr('RETOUR AU SPAWN')}</p>
                <p class="pz-text">${tr('Retourne à l\'accueil. Ta progression est sauvegardée à chaque pas : rien ne se perd.')}</p>`;
        },
    };

    const renderPanel = () => {
        const panel = el.querySelector('.pz-panel');
        panel.innerHTML = panels[ITEMS[sel].id]();
        panel.classList.remove('is-in');
        void panel.offsetWidth;
        panel.classList.add('is-in');
    };
    const select = (i, focus = true) => {
        sel = (i + ITEMS.length) % ITEMS.length;
        el.querySelectorAll('.pz-item').forEach((b, k) => {
            b.classList.toggle('is-sel', k === sel);
            b.tabIndex = k === sel ? 0 : -1;
        });
        if (focus) el.querySelectorAll('.pz-item')[sel].focus();
        renderPanel();
    };

    const activate = (id) => {
        if (id === 'resume') close();
        else if (id === 'options') el.querySelector('.pz-panel .pz-switch')?.focus();
        else if (id === 'trophies') { close(); document.getElementById('openTrophies')?.click(); }
        else if (id === 'home') { close(); if (typeof showTab === 'function') showTab('home'); }
    };

    const onPanelClick = (e) => {
        const ask = e.target.closest('.pz-ask');
        if (ask) { close(); setTimeout(() => lumi?.open(), 60); return; }
        const sw = e.target.closest('.pz-switch');
        if (sw) {
            const opt = sw.dataset.opt;
            if (opt === 'sound') document.getElementById('soundToggle')?.click();
            else if (opt === 'music') window.ost?.setOn(!window.ost.on, { focus: false });
            else if (opt === 'daycycle') dayCycle.set(!dayCycle.enabled());
            const on = opt === 'sound' ? sfx.on : opt === 'music' ? !!window.ost?.on : dayCycle.enabled();
            sw.setAttribute('aria-checked', String(on));
            sw.focus();
            return;
        }
        const lang = e.target.closest('[data-lang]');
        if (lang && lang.dataset.lang !== (LANG === 'en' ? 'en' : 'fr')) document.getElementById('langToggle')?.click();
    };

    const onKey = (e) => {
        e.stopPropagation(); // rien n'arrive aux jeux ni aux autres raccourcis pendant la pause
        const inMenu = e.target.closest?.('.pz-item');
        if (e.key === 'Escape') {
            e.preventDefault();
            if (!inMenu && el.contains(e.target) && e.target !== el) select(sel); // depuis le panneau : retour à la liste
            else close();
        } else if (inMenu && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            select(sel + (e.key === 'ArrowDown' ? 1 : -1));
            sfx.hover();
        } else if (inMenu && (e.key === 'Home' || e.key === 'End')) {
            e.preventDefault();
            select(e.key === 'Home' ? 0 : ITEMS.length - 1);
        } else if (inMenu && e.key === 'ArrowRight') {
            e.preventDefault();
            el.querySelector('.pz-panel button, .pz-panel input')?.focus();
        } else if (!inMenu && e.key === 'ArrowLeft' && !e.target.matches?.('input[type="range"]')) {
            e.preventDefault();
            select(sel);
        }
    };

    function open() {
        if (el) return;
        lastFocus = document.activeElement;
        gamePaused = true;
        document.dispatchEvent(new CustomEvent('pausechange', { detail: true }));
        sfx.freeze?.(true);
        window.ost?.duck(true);
        if (sfx.on) { sfx.tone(988, 0.12, 'square', 0.018); sfx.tone(740, 0.18, 'square', 0.016, 0.08); }
        document.documentElement.classList.add('is-paused');

        el = document.createElement('div');
        el.className = 'pause';
        el.setAttribute('role', 'dialog');
        el.setAttribute('aria-modal', 'true');
        el.setAttribute('aria-labelledby', 'pauseTitle');
        el.innerHTML = `
            <div class="pz-veil"></div>
            <div class="pz-frame">
                <div class="pz-top">
                    <h2 class="pz-title" id="pauseTitle">${tr('PAUSE')}</h2>
                    <p class="pz-meta"><span>${esc(where())}</span><span class="pz-time">${playTime.format()}</span></p>
                </div>
                <ul class="pz-menu">${ITEMS.map((it, i) => `<li style="--i:${i}"><button type="button" class="pz-item" data-i="${i}">${esc(it.label)}</button></li>`).join('')}</ul>
                <div class="pz-panel"></div>
                <div class="pz-keys" aria-hidden="true">
                    <span><kbd>↑</kbd><kbd>↓</kbd> ${tr('Choisir')}</span>
                    <span><kbd>${tr('Entrée')}</kbd> ${tr('Valider')}</span>
                    <span><kbd>${tr('Échap')}</kbd> ${tr('Reprendre')}</span>
                </div>
            </div>`;
        document.body.appendChild(el);
        // le reste de la page devient inerte (le focus reste dans la pause)
        inerted = [...document.body.children].filter(c => c !== el && !c.inert);
        inerted.forEach(c => { c.inert = true; });

        el.querySelector('.pz-veil').addEventListener('click', close);
        el.querySelectorAll('.pz-item').forEach((b, i) => {
            b.addEventListener('click', () => { select(i); activate(ITEMS[i].id); });
            b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && sel !== i) select(i, false); });
        });
        const panel = el.querySelector('.pz-panel');
        panel.addEventListener('click', onPanelClick);
        panel.addEventListener('input', (e) => {
            const r = e.target.closest('.pz-range');
            if (!r) return;
            r.style.setProperty('--v', `${r.value}%`);
            window.ost?.setVolume(Number(r.value) / 100);
        });
        select(0);
        // le temps de jeu continue de tourner à l'écran
        ticker = setInterval(() => el?.querySelectorAll('.pz-time').forEach(t => { t.textContent = playTime.format(); }), 1000);
    }

    function close() {
        if (!el) return;
        const leaving = el;
        el = null;
        clearInterval(ticker);
        inerted.forEach(c => { c.inert = false; });
        inerted = [];
        leaving.classList.add('is-leaving');
        setTimeout(() => leaving.remove(), reduceMotion ? 0 : 220);
        document.documentElement.classList.remove('is-paused');
        gamePaused = false;
        document.dispatchEvent(new CustomEvent('pausechange', { detail: false }));
        sfx.freeze?.(false);
        window.ost?.duck(false);
        if (sfx.on) { sfx.tone(740, 0.1, 'square', 0.016); sfx.tone(988, 0.16, 'square', 0.018, 0.07); }
        if (lastFocus && document.contains(lastFocus) && lastFocus.offsetParent !== null) lastFocus.focus({ preventScroll: true });
        // le jeu ouvert reprend là où il s'était arrêté
        if (openGame && gameOn(openGame)) document.dispatchEvent(new CustomEvent('gameresume', { detail: openGame }));
    }

    window.addEventListener('keydown', (e) => {
        if (el) { onKey(e); return; }
        if (e.key !== 'Escape' || e.repeat) return;
        if (e.target.closest?.('input:not([type="range"]):not([type="checkbox"]), textarea, select, [contenteditable="true"]')) return;
        if (blocked()) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        open();
    }, true);

    return { open, close, get isOpen() { return !!el; } };
})();

/* ---------------------------------------------------------------------
   7. MUSIQUE DES MINI-JEUX — chaque jeu peut avoir son morceau
   (OST_GAMES dans assets/ost/playlist.js). Il ne joue que pendant ce
   jeu : il s'arrête en quittant le jeu ou l'onglet, se tait pendant la
   pause, et le lecteur de musique attend la fin de la partie.
   Le bouton ♪ coupe aussi cette musique ; le volume est celui du lecteur.
   --------------------------------------------------------------------- */
const gameMusic = (() => {
    const TRACKS = window.OST_GAMES || {};
    if (!Object.keys(TRACKS).length) return null;
    const audio = new Audio();
    audio.loop = true;
    audio.preload = 'none';
    let current = null, fadeId = 0;

    // le curseur du jeu règle sa musique (0.5 par défaut -> assez bas)
    const level = () => (current ? gameVolume(current) : 0.5) * 0.5;
    const fade = (to, ms, done) => {
        const id = ++fadeId;
        const from = audio.volume, t0 = performance.now();
        const step = () => {
            if (id !== fadeId) return; // un autre fondu a pris la main
            const k = Math.min(1, (performance.now() - t0) / ms);
            audio.volume = Math.max(0, Math.min(1, from + (to - from) * k));
            if (k < 1) requestAnimationFrame(step); else done?.();
        };
        step();
    };

    // le jeu dont la musique doit jouer en ce moment (ou aucun)
    const wanted = () => {
        if (!sfx.on || document.hidden || document.body.classList.contains('games-modal-open')) return null;
        if (!openGame || !TRACKS[openGame]) return null;
        // en pause, gameOn() est faux : la musique du jeu continue, mais plus bas
        const on = gamePaused ? !!document.getElementById('games')?.classList.contains('is-active') : gameOn(openGame);
        return on ? openGame : null;
    };

    const stop = (rewind) => {
        if (audio.paused) {
            if (rewind) audio.currentTime = 0;
            window.ost?.release('game');
            return;
        }
        fade(0, 400, () => {
            audio.pause();
            if (rewind) audio.currentTime = 0;
            window.ost?.release('game');
        });
    };

    const sync = () => {
        const id = wanted();
        if (!id) { stop(false); return; }
        if (current !== id) {
            current = id;
            audio.src = encodeURI(TRACKS[id]);
        }
        window.ost?.hold('game');
        const target = level() * (gamePaused ? 0.3 : 1);
        if (!audio.paused) { fade(target, 300); return; }
        audio.volume = 0;
        const p = audio.play();
        if (p) p.then(() => fade(target, 700)).catch(() => window.ost?.release('game'));
    };
    const later = () => setTimeout(sync, 0); // après la mise à jour des onglets

    document.addEventListener('gameopen', later);
    document.addEventListener('gameresume', later);
    document.addEventListener('pausechange', later);
    document.addEventListener('tabshow', later);
    document.addEventListener('visibilitychange', later);
    // retour à la liste des jeux : le morceau repartira du début à la prochaine partie
    document.addEventListener('gameclose', () => stop(true));
    document.getElementById('soundToggle')?.addEventListener('click', later);
    document.addEventListener('gamevolume', (e) => { if (e.detail.id === current && !audio.paused) fade(level() * (gamePaused ? 0.3 : 1), 150); });
    audio.addEventListener('error', () => window.ost?.release('game'));

    return { sync, get playing() { return !audio.paused; }, get track() { return current; } };
})();

/* ---------------------------------------------------------------------
   8. ALBUM PHOTO — comme Prompto, le site prend des photos de ta visite :
   la 1re fois qu'on découvre une page, et à chaque exploit dans un
   mini-jeu. Elles défilent dans le générique de la vraie fin.
   Capture des pages : html-to-image (chargé seulement quand il sert,
   sur ordinateur). Les mini-jeux sont des <canvas> : copie directe.
   --------------------------------------------------------------------- */
const photoAlbum = (() => {
    const KEY = 'eliasPortfolio.album';
    const MAX = 14;
    const LIB = 'https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js';
    const PAGES = { home: 'Accueil', about: 'Présentation', skills: 'Compétences', softskills: 'Soft Skills', education: 'Parcours', work: 'Réalisations', experience: 'Expériences', games: 'Mini-jeux' };
    const SHOTS = { fish1: 'Première prise !', fishBig: 'Le roi du lac', chef: 'Recette trois étoiles', ultimateChef: 'Chef légendaire', chocobo: 'Ligne d\'arrivée', chocoboLegend: 'Légende de la piste', battle: 'Golem vaincu', nightMonster: 'Le monstre de la nuit' };

    const list = () => { try { return JSON.parse(store.get(KEY) || '[]'); } catch { return []; } };
    const save = (all) => {
        // le stockage du navigateur est limité : si c'est plein, on retire les plus anciennes
        while (all.length) {
            try { localStorage.setItem(KEY, JSON.stringify(all)); return; } catch { all.shift(); }
        }
    };
    const add = (src, caption, id) => {
        const all = list().filter(p => !id || p.id !== id);
        all.push({ id, src, caption, at: Date.now() });
        while (all.length > MAX) {
            // on garde la toute première photo, on enlève la plus ancienne après elle
            all.splice(1, 1);
        }
        save(all);
    };
    const has = (id) => list().some(p => p.id === id);

    // réduit une image (canvas) en petite photo JPEG
    const shrink = (canvas, w = 360) => {
        const k = w / canvas.width;
        const out = document.createElement('canvas');
        out.width = w;
        out.height = Math.round(canvas.height * k);
        out.getContext('2d').drawImage(canvas, 0, 0, out.width, out.height);
        return out.toDataURL('image/jpeg', 0.72);
    };

    let lib = null;
    const loadLib = () => lib || (lib = new Promise((res, rej) => {
        if (window.htmlToImage) { res(window.htmlToImage); return; }
        const s = document.createElement('script');
        s.src = LIB;
        s.onload = () => res(window.htmlToImage);
        s.onerror = () => { lib = null; rej(); };
        document.head.appendChild(s);
    }));
    // capture des pages : seulement sur ordinateur (lourd sur mobile), et quand le navigateur est libre
    const canSnapPages = matchMedia('(pointer: fine) and (min-width: 917px)').matches && !navigator.connection?.saveData;
    const idle = (fn) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 4000 }) : setTimeout(fn, 1200));
    let busy = false;
    const snapPage = (id) => {
        if (!canSnapPages || busy || has(`page-${id}`)) return;
        setTimeout(() => idle(async () => {
            const sec = document.getElementById(id);
            if (!sec?.classList.contains('is-active') || document.hidden || gamePaused) return;
            busy = true;
            try {
                const htmlToImage = await loadLib();
                const src = await htmlToImage.toJpeg(sec, {
                    quality: 0.72, pixelRatio: 0.35, height: window.innerHeight, backgroundColor: '#0a0d14',
                    filter: (n) => !n.matches?.('iframe, marquee, .secret-item, .chest, .crystal-shard'),
                });
                add(src, tr(PAGES[id] || id), `page-${id}`);
            } catch { /* image d'un autre site, réseau... : pas de photo, tant pis */ }
            busy = false;
        }), 2600);
    };

    // la page affichée au moment d'une 1re visite
    document.addEventListener('tabshow', (e) => snapPage(e.detail));
    document.addEventListener('game', (e) => { if (e.detail.type === 'visit') snapPage(document.querySelector('body > section.is-active')?.id); });

    // un exploit dans un mini-jeu : on photographie le jeu
    document.addEventListener('trophy', (e) => {
        const caption = SHOTS[e.detail];
        if (!caption) return;
        setTimeout(() => {
            const cv = document.querySelector('.game-panel.is-active canvas');
            if (!cv || !cv.width) return;
            try { add(shrink(cv), tr(caption), `game-${e.detail}`); } catch { }
        }, 350);
    });

    document.addEventListener('game', (e) => { if (e.detail.type === 'reset') store.del(KEY); });

    return { list, add };
})();
