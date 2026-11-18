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
