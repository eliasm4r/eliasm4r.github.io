/* =====================================================================
   ost.js — lecteur de musique façon appli de streaming, éteint par défaut.
   Les morceaux viennent de assets/ost/playlist.js (window.OST_PLAYLIST).

   Les autres sons du site le mettent en pause le temps de jouer :
   ost.hold('raison') puis ost.release('raison') (cuisine, générique de fin,
   Return by Death, jeux secrets). ost.duck(true) baisse le volume (pause).
   ===================================================================== */
const ost = (() => {
    const KEY = 'eliasPortfolio.ost';
    const TRACKS = (Array.isArray(window.OST_PLAYLIST) ? window.OST_PLAYLIST : []).filter(x => x && x.src);
    // pas de jaquette : une pochette générée au nom du jeu (champ artist), jamais l'image d'un autre jeu
    const coverCache = {};
    const coverOf = (t) => {
        if (!t) return '';
        if (t.cover) return t.cover;
        const name = String(t.artist || t.title || 'OST').trim();
        if (coverCache[name]) return coverCache[name];
        let h = 0;
        for (const ch of name) h = (h * 31 + ch.codePointAt(0)) % 360;
        const ff = name.match(/^final fantasy\s+(.+)$/i);
        const big = (ff ? ff[1] : name).toUpperCase().replace(/[&<>"']/g, '');
        const small = ff ? 'FINAL FANTASY' : 'ORIGINAL SOUNDTRACK';
        const size = Math.max(9, Math.min(26, Math.floor(100 / (big.length * 0.62))));
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h},45%,32%)"/><stop offset="1" stop-color="hsl(${(h + 40) % 360},50%,9%)"/></linearGradient></defs><rect width="120" height="120" fill="url(#g)"/><path d="M60 14 74 34 60 70 46 34z" fill="hsla(${h},80%,85%,.18)" stroke="hsla(${h},80%,88%,.7)" stroke-width="1.5"/><text x="60" y="92" text-anchor="middle" font-family="Georgia,serif" font-size="${size}" font-weight="700" fill="#fff">${big}</text><text x="60" y="108" text-anchor="middle" font-family="Arial,sans-serif" font-size="7" letter-spacing="1.5" fill="hsla(${h},70%,85%,.85)">${small}</text></svg>`;
        return (coverCache[name] = `data:image/svg+xml,${encodeURIComponent(svg)}`);
    };

    const st = { on: false, i: 0, vol: 0.6, muted: false, shuffle: false, repeat: 'all', mini: false };
    try { Object.assign(st, JSON.parse(store.get(KEY) || '{}')); } catch { }
    if (!(st.i >= 0 && st.i < TRACKS.length)) st.i = 0;
    const save = () => store.set(KEY, JSON.stringify(st));

    const audio = new Audio();
    audio.preload = 'none';
    const holds = new Set();
    let resumeAfterHold = false; // la musique jouait quand quelque chose l'a mise en pause
    let ducked = false;
    let loadedIndex = -1;
    let failures = 0;
    let dragging = false;
    let order = [];

    const card = document.getElementById('playerCard');
    const openBtn = document.getElementById('openOst');

    /* ---------- interface ---------- */
    // un <div> et pas une <section> : les sections sont les onglets du site (masquées hors de leur onglet)
    const el = document.createElement('div');
    el.className = 'ost';
    el.id = 'ost';
    el.hidden = true;
    el.setAttribute('role', 'region');
    el.setAttribute('aria-label', tr('Lecteur de musique'));
    el.innerHTML = `
        <div class="ost-main">
            <button class="ost-cover" type="button"><img alt="" draggable="false"></button>
            <div class="ost-meta">
                <p class="ost-title"><span class="ost-eq" aria-hidden="true"><i></i><i></i><i></i></span><span class="ost-name"></span></p>
                <p class="ost-artist"></p>
            </div>
            <button class="ost-btn ost-mini-play" type="button"><i class="fas fa-play" aria-hidden="true"></i></button>
            <button class="ost-btn ost-size" type="button"><i class="fas fa-chevron-down" aria-hidden="true"></i></button>
            <button class="ost-btn ost-off" type="button"><i class="fas fa-times" aria-hidden="true"></i></button>
        </div>
        <div class="ost-seek">
            <span class="ost-t ost-cur">0:00</span>
            <input class="ost-range ost-progress" type="range" min="0" max="1000" step="1" value="0">
            <span class="ost-t ost-dur">–:––</span>
        </div>
        <div class="ost-controls">
            <button class="ost-btn ost-shuffle" type="button" aria-pressed="false"><i class="fas fa-random" aria-hidden="true"></i></button>
            <button class="ost-btn ost-prev" type="button"><i class="fas fa-step-backward" aria-hidden="true"></i></button>
            <button class="ost-btn ost-play" type="button"><i class="fas fa-play" aria-hidden="true"></i></button>
            <button class="ost-btn ost-next" type="button"><i class="fas fa-step-forward" aria-hidden="true"></i></button>
            <button class="ost-btn ost-repeat" type="button"><i class="fas fa-redo" aria-hidden="true"></i><b aria-hidden="true">1</b></button>
        </div>
        <div class="ost-bottom">
            <button class="ost-btn ost-mute" type="button"><i class="fas fa-volume-up" aria-hidden="true"></i></button>
            <input class="ost-range ost-volume" type="range" min="0" max="100" step="1">
            <button class="ost-btn ost-list-btn" type="button" aria-expanded="false" aria-controls="ostList"><i class="fas fa-list-ul" aria-hidden="true"></i></button>
        </div>
        <div class="ost-list" id="ostList" hidden>
            <p class="ost-list-k"></p>
            <ol></ol>
        </div>
        <p class="ost-msg" role="status"></p>`;
    document.body.appendChild(el);

    const $ = (s) => el.querySelector(s);
    const coverBtn = $('.ost-cover');
    const coverImg = $('.ost-cover img');
    const nameEl = $('.ost-name');
    const artistEl = $('.ost-artist');
    const playBtn = $('.ost-play');
    const miniPlay = $('.ost-mini-play');
    const sizeBtn = $('.ost-size');
    const offBtn = $('.ost-off');
    const progress = $('.ost-progress');
    const curEl = $('.ost-cur');
    const durEl = $('.ost-dur');
    const shuffleBtn = $('.ost-shuffle');
    const repeatBtn = $('.ost-repeat');
    const muteBtn = $('.ost-mute');
    const volume = $('.ost-volume');
    const listBtn = $('.ost-list-btn');
    const listBox = $('.ost-list');
    const listEl = $('.ost-list ol');
    const msg = $('.ost-msg');

    $('.ost-prev').setAttribute('aria-label', tr('Morceau précédent'));
    $('.ost-next').setAttribute('aria-label', tr('Morceau suivant'));
    shuffleBtn.setAttribute('aria-label', tr('Lecture aléatoire'));
    offBtn.setAttribute('aria-label', tr('Éteindre la musique'));
    listBtn.setAttribute('aria-label', tr('File d\'attente'));
    progress.setAttribute('aria-label', tr('Position dans le morceau'));
    volume.setAttribute('aria-label', tr('Volume'));
    $('.ost-list-k').textContent = tr('FILE D\'ATTENTE');

    const fmt = (s) => (Number.isFinite(s) && s >= 0 ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00');
    const track = () => TRACKS[st.i];
    const playing = () => !audio.paused && !audio.ended;

    /* ---------- ordre de lecture ---------- */
    const buildOrder = () => {
        order = TRACKS.map((_, i) => i);
        if (st.shuffle) {
            for (let i = order.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [order[i], order[j]] = [order[j], order[i]];
            }
            // le morceau en cours reste en tête
            order.splice(order.indexOf(st.i), 1);
            order.unshift(st.i);
        }
    };
    buildOrder();

    /* ---------- lecture ---------- */
    const targetVolume = () => (st.muted ? 0 : st.vol * (ducked ? 0.3 : 1));
    let fadeRaf = 0;
    const fadeTo = (v, ms = 300) => {
        cancelAnimationFrame(fadeRaf);
        const v0 = audio.volume;
        const t0 = performance.now();
        const step = () => {
            const k = Math.min(1, (performance.now() - t0) / ms);
            audio.volume = Math.max(0, Math.min(1, v0 + (v - v0) * k));
            if (k < 1) fadeRaf = requestAnimationFrame(step);
        };
        step();
    };

    const loadTrack = (i) => {
        st.i = i;
        const t = track();
        if (!t) return;
        if (loadedIndex !== i) {
            audio.src = encodeURI(t.src);
            loadedIndex = i;
            // durée inconnue tant que le fichier n'est pas chargé
            durEl.textContent = '–:––';
            curEl.textContent = '0:00';
            progress.value = 0;
            progress.style.setProperty('--p', '0%');
            el.style.setProperty('--p', '0%');
        }
        msg.textContent = '';
        save();
        render();
        setSession();
    };

    function play() {
        if (!TRACKS.length) return;
        if (loadedIndex !== st.i) loadTrack(st.i);
        // un autre son occupe la place : on jouera après lui
        if (holds.size) { resumeAfterHold = true; render(); return; }
        audio.volume = targetVolume();
        audio.play().catch(() => render());
    }

    function pause() {
        resumeAfterHold = false;
        audio.pause();
    }

    const toggle = () => (playing() || resumeAfterHold ? pause() : play());

    const step = (dir) => {
        if (!TRACKS.length) return;
        const pos = order.indexOf(st.i);
        let next = pos + dir;
        if (next >= order.length) {
            if (st.repeat === 'off' && dir > 0) { pause(); audio.currentTime = 0; return; }
            if (st.shuffle) buildOrder();
            next = 0;
        }
        if (next < 0) next = order.length - 1;
        const wasPlaying = playing() || resumeAfterHold;
        loadTrack(order[next]);
        if (wasPlaying) play();
    };
    const next = () => step(1);
    const prev = () => {
        // comme partout : au-delà de 3 s, "précédent" revient au début du morceau
        if (audio.currentTime > 3) { audio.currentTime = 0; return; }
        step(-1);
    };

    audio.addEventListener('ended', () => {
        if (st.repeat === 'one') { audio.currentTime = 0; play(); return; }
        const last = order.indexOf(st.i) === order.length - 1;
        if (last && st.repeat === 'off') { render(); return; }
        step(1);
        play();
    });
    audio.addEventListener('playing', () => { failures = 0; render(); });
    audio.addEventListener('pause', render);
    audio.addEventListener('loadedmetadata', () => { durEl.textContent = fmt(audio.duration); renderList(); });
    audio.addEventListener('timeupdate', () => {
        if (dragging) return;
        const d = audio.duration;
        const p = d ? (audio.currentTime / d) * 1000 : 0;
        progress.value = p;
        progress.style.setProperty('--p', `${p / 10}%`);
        el.style.setProperty('--p', `${p / 10}%`);
        curEl.textContent = fmt(audio.currentTime);
    });
    // fichier absent ou illisible : on le signale et on passe au suivant
    audio.addEventListener('error', () => {
        if (!audio.getAttribute('src')) return;
        failures++;
        msg.textContent = `${tr('Morceau introuvable')} : ${track()?.title || ''}`;
        loadedIndex = -1;
        if (failures < TRACKS.length) setTimeout(() => { step(1); play(); }, 1200);
        else render();
    });

    /* ---------- pauses imposées par le reste du site ---------- */
    const hold = (why) => {
        holds.add(why);
        if (playing()) { resumeAfterHold = true; audio.pause(); }
        render();
    };
    const release = (why) => {
        if (!holds.delete(why)) return;
        if (!holds.size && resumeAfterHold && st.on) { resumeAfterHold = false; play(); }
        render();
    };
    const duck = (on) => {
        ducked = !!on;
        if (playing()) fadeTo(targetVolume(), 350);
    };

    /* ---------- affichage ---------- */
    const renderList = () => {
        listEl.innerHTML = '';
        TRACKS.forEach((t, i) => {
            const li = document.createElement('li');
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'ost-track';
            if (i === st.i) b.setAttribute('aria-current', 'true');
            b.innerHTML = '<span class="ost-n"></span><span class="ost-tt"><b></b><small></small></span><span class="ost-eq" aria-hidden="true"><i></i><i></i><i></i></span>';
            b.querySelector('.ost-n').textContent = String(i + 1).padStart(2, '0');
            b.querySelector('b').textContent = t.title || t.src.split('/').pop();
            b.querySelector('small').textContent = t.artist || '';
            b.addEventListener('click', () => {
                if (i === st.i) { toggle(); return; }
                loadTrack(i);
                if (st.shuffle) buildOrder();
                play();
            });
            li.appendChild(b);
            listEl.appendChild(li);
        });
    };

    function render() {
        const t = track();
        const isOn = playing() || resumeAfterHold;
        el.hidden = !st.on;
        el.classList.toggle('is-mini', st.mini);
        el.classList.toggle('is-playing', playing());
        el.classList.toggle('is-held', !!holds.size && resumeAfterHold);
        if (openBtn) {
            openBtn.setAttribute('aria-pressed', st.on ? 'true' : 'false');
            openBtn.classList.toggle('is-on', st.on);
            openBtn.classList.toggle('is-playing', playing());
        }
        nameEl.textContent = t ? t.title || t.src.split('/').pop() : tr('Aucun morceau');
        artistEl.textContent = t ? t.artist || '' : '';
        const cover = coverOf(t);
        if (coverImg.getAttribute('src') !== cover) coverImg.src = cover;
        // en attente pendant la cuisine, le générique... : on le dit plutôt que de laisser croire à une panne
        const heldText = tr("En pause le temps d'un autre son");
        if (holds.size && resumeAfterHold) msg.textContent = heldText;
        else if (msg.textContent === heldText) msg.textContent = '';
        [playBtn, miniPlay].forEach(b => {
            b.querySelector('i').className = `fas fa-${isOn ? 'pause' : 'play'}`;
            b.setAttribute('aria-label', isOn ? tr('Pause') : tr('Lecture'));
        });
        sizeBtn.setAttribute('aria-label', st.mini ? tr('Agrandir le lecteur') : tr('Réduire le lecteur'));
        sizeBtn.querySelector('i').className = `fas fa-chevron-${st.mini ? 'up' : 'down'}`;
        coverBtn.setAttribute('aria-label', st.mini ? tr('Agrandir le lecteur') : tr('Réduire le lecteur'));
        shuffleBtn.setAttribute('aria-pressed', st.shuffle ? 'true' : 'false');
        repeatBtn.dataset.mode = st.repeat;
        repeatBtn.setAttribute('aria-pressed', st.repeat === 'off' ? 'false' : 'true');
        repeatBtn.setAttribute('aria-label', { off: tr('Répéter : non'), all: tr('Répéter : toute la liste'), one: tr('Répéter : ce morceau') }[st.repeat]);
        muteBtn.querySelector('i').className = `fas fa-volume-${st.muted || st.vol === 0 ? 'mute' : st.vol < 0.5 ? 'down' : 'up'}`;
        muteBtn.setAttribute('aria-label', st.muted ? tr('Remettre le son') : tr('Couper le son'));
        volume.value = Math.round(st.vol * 100);
        volume.style.setProperty('--p', `${st.muted ? 0 : st.vol * 100}%`);
        listEl.querySelectorAll('.ost-track').forEach((b, i) => {
            if (i === st.i) b.setAttribute('aria-current', 'true');
            else b.removeAttribute('aria-current');
        });
        if (navigator.mediaSession) navigator.mediaSession.playbackState = playing() ? 'playing' : 'paused';
    }

    // touches multimédia du clavier / écran verrouillé du téléphone
    const setSession = () => {
        const ms = navigator.mediaSession;
        const t = track();
        if (!ms || !t || typeof MediaMetadata === 'undefined') return;
        const cover = new URL(coverOf(t), location.href).href;
        ms.metadata = new MediaMetadata({ title: t.title || '', artist: t.artist || '', album: 'Portfolio · Elias Maruca', artwork: [{ src: cover }] });
    };
    if (navigator.mediaSession) {
        const ms = navigator.mediaSession;
        const on = (action, fn) => { try { ms.setActionHandler(action, fn); } catch { } };
        on('play', play);
        on('pause', pause);
        on('previoustrack', prev);
        on('nexttrack', next);
        on('seekto', (d) => { if (d && Number.isFinite(d.seekTime)) audio.currentTime = d.seekTime; });
    }

    /* ---------- commandes ---------- */
    const setOn = (on, { focus = true } = {}) => {
        st.on = on;
        save();
        if (on) {
            render();
            play();
            if (focus) setTimeout(() => (st.mini ? miniPlay : playBtn).focus(), 50);
        } else {
            pause();
            listBox.hidden = true;
            listBtn.setAttribute('aria-expanded', 'false');
            render();
            if (focus) openBtn?.focus();
        }
    };
    openBtn?.addEventListener('click', () => setOn(!st.on));
    offBtn.addEventListener('click', () => setOn(false));
    playBtn.addEventListener('click', toggle);
    miniPlay.addEventListener('click', toggle);
    $('.ost-prev').addEventListener('click', prev);
    $('.ost-next').addEventListener('click', next);
    const resize = () => { st.mini = !st.mini; save(); render(); };
    sizeBtn.addEventListener('click', resize);
    coverBtn.addEventListener('click', resize);
    shuffleBtn.addEventListener('click', () => { st.shuffle = !st.shuffle; buildOrder(); save(); render(); });
    repeatBtn.addEventListener('click', () => { st.repeat = { off: 'all', all: 'one', one: 'off' }[st.repeat] || 'all'; save(); render(); });
    muteBtn.addEventListener('click', () => {
        st.muted = !st.muted;
        if (!st.muted && st.vol === 0) st.vol = 0.5;
        audio.volume = targetVolume();
        save();
        render();
    });
    volume.addEventListener('input', () => {
        st.vol = Number(volume.value) / 100;
        st.muted = false;
        audio.volume = targetVolume();
        save();
        render();
    });
    progress.addEventListener('input', () => {
        dragging = true;
        progress.style.setProperty('--p', `${progress.value / 10}%`);
        curEl.textContent = fmt((audio.duration || 0) * progress.value / 1000);
    });
    progress.addEventListener('change', () => {
        if (audio.duration) audio.currentTime = audio.duration * progress.value / 1000;
        dragging = false;
    });
    listBtn.addEventListener('click', () => {
        const open = listBox.hidden;
        listBox.hidden = !open;
        listBtn.setAttribute('aria-expanded', String(open));
        listBtn.classList.toggle('is-on', open);
        if (open) document.dispatchEvent(new CustomEvent('ostlist'));
    });

    // la cuisine a sa propre musique : le lecteur se tait tant que son panneau est ouvert
    document.addEventListener('gameopen', (e) => (e.detail === 'cooking' ? hold('cooking') : release('cooking')));
    document.addEventListener('gameclose', () => release('cooking'));
    document.addEventListener('tabshow', (e) => {
        if (e.detail !== 'games') release('cooking');
        else if (typeof gameOn === 'function' && gameOn('cooking')) hold('cooking');
    });

    renderList();
    if (TRACKS.length) loadTrack(st.i);
    render();

    return {
        hold, release, duck, play, pause, next, prev,
        get on() { return st.on; },
        get playing() { return playing(); },
        get track() { return track(); },
        setOn,
        get volume() { return st.muted ? 0 : st.vol; },
        setVolume(v) {
            st.vol = Math.max(0, Math.min(1, v));
            st.muted = false;
            audio.volume = targetVolume();
            save();
            render();
        },
        el,
    };
})();
window.ost = ost;
