/* ===================================================
   CUSTOM CURSOR
   =================================================== */
const cursorDot = document.querySelector('.cursor-dot');
const cursorOutline = document.querySelector('.cursor-outline');

const touchQuery = window.matchMedia('(hover: none), (pointer: coarse)');
let isTouchDevice = touchQuery.matches;

function applyTouchModeUI() {
    isTouchDevice = touchQuery.matches;
    if (cursorDot) cursorDot.style.display = isTouchDevice ? 'none' : '';
    if (cursorOutline) cursorOutline.style.display = isTouchDevice ? 'none' : '';
}

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

window.addEventListener('mousemove', (e) => {
    if (isTouchDevice || !cursorDot || !cursorOutline) return;
    cursorDot.style.left = e.clientX + 'px';
    cursorDot.style.top = e.clientY + 'px';
    // Slight lag for outline
    setTimeout(() => {
        cursorOutline.style.left = e.clientX + 'px';
        cursorOutline.style.top = e.clientY + 'px';
    }, 60);
});

document.querySelectorAll('a, button, .skill-td, .experience-stage').forEach(el => {
    el.addEventListener('mouseenter', () => {
        if (isTouchDevice || !cursorDot || !cursorOutline) return;
        cursorDot.style.width = '14px';
        cursorDot.style.height = '14px';
        cursorOutline.style.width = '52px';
        cursorOutline.style.height = '52px';
        cursorOutline.style.opacity = '0.9';
    });
    el.addEventListener('mouseleave', () => {
        if (isTouchDevice || !cursorDot || !cursorOutline) return;
        cursorDot.style.width = '10px';
        cursorDot.style.height = '10px';
        cursorOutline.style.width = '36px';
        cursorOutline.style.height = '36px';
        cursorOutline.style.opacity = '0.6';
    });
});

/* ===================================================
   PAGE LOADER
   =================================================== */
(function initPageLoader() {
    const loader = document.getElementById('pageLoader');
    if (!loader) return;

    const barFill = document.getElementById('loaderBarFill');
    const MIN_DISPLAY_MS = 600;
    const startTime = performance.now();

    // Progression simulée pendant l'attente du vrai chargement
    let fakeProgress = 0;
    const fakeInterval = setInterval(() => {
        fakeProgress = Math.min(fakeProgress + Math.random() * 18, 85);
        if (barFill) barFill.style.width = `${fakeProgress}%`;
    }, 150);

    const finishLoading = () => {
        clearInterval(fakeInterval);
        const elapsed = performance.now() - startTime;
        const remaining = Math.max(MIN_DISPLAY_MS - elapsed, 0);

        if (barFill) barFill.style.width = '100%';

        setTimeout(() => {
            document.body.classList.add('is-loaded');
            setTimeout(() => {
                loader.classList.add('hide');
                setTimeout(() => loader.remove(), 700);
            }, 250);
        }, remaining);
    };

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
        title: 'JavaScript',
        img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg',
        desc: 'JavaScript est le langage du web côté client. Utilisé pour rendre les pages interactives, gérer les événements et communiquer avec des API. Base indispensable avant d\'aborder TypeScript, Vue.js ou React.'
    },
    vuejs: {
        title: 'Vue.js',
        img: './assets/vuejs.png',
        desc: 'Framework JavaScript progressif pour créer des interfaces réactives en composants. Utilisé en stage chez GEONATIVE pour développer des composants réutilisables avec shadcn.'
    },
    html: {
        title: 'HTML / CSS',
        img: './assets/html.png',
        desc: 'Fondations du développement web. Maîtrisés dès le lycée et approfondis tout au long du BUT, utilisés pour structurer et mettre en forme des pages accessibles et esthétiques.'
    },
    java: {
        title: 'Java',
        img: './assets/java.svg',
        desc: 'Langage principal de ma formation. Applications desktop avec JavaFX, serveurs web avec Tomcat et Servlets, API REST avec Spring Boot. Solide base en programmation orientée objet et design patterns.'
    },
    python: {
        title: 'Python',
        img: './assets/python.png',
        desc: 'Utilisé pour la modélisation mathématique et l\'automatisation. Maîtrise de NumPy pour le calcul numérique et la résolution de problèmes d\'optimisation.'
    },
    psql: {
        title: 'PostgreSQL',
        img: './assets/PSQL.png',
        desc: 'Système de gestion de bases de données relationnelles. Conception de schémas, requêtes SQL complexes (jointures, agrégats), gestion des transactions et optimisation par index.'
    },
    typescript: {
        title: 'TypeScript',
        img: './assets/ts.png',
        desc: 'Surcouche typée de JavaScript qui améliore la robustesse et la maintenabilité du code. Utilisé en stage avec Vue.js pour détecter les erreurs à la compilation et mieux documenter les interfaces.'
    },
    github: {
        title: 'GitHub',
        img: './assets/github.png',
        desc: 'Plateforme de gestion de versions utilisée sur tous mes projets. Maîtrise des branches, pull requests, issues et actions CI/CD pour le travail en équipe et la traçabilité des projets.'
    },
    bash: {
        title: 'Bash',
        img: './assets/bash.png',
        desc: 'Langage de script shell pour automatiser des tâches sur Linux : compilation, déploiement, gestion de fichiers et configuration d\'environnements de développement.'
    },
    c: {
        title: 'Langage C',
        img: './assets/C_Logo.png',
        desc: 'Initiation à la programmation bas niveau : gestion de la mémoire avec les pointeurs, structures de données et algorithmique. Base solide pour comprendre le fonctionnement des systèmes.'
    },
    gitlab: {
        title: 'GitLab',
        img: './assets/gitlab.png',
        desc: 'Utilisé pour la gestion de projets collaboratifs avec intégration continue (CI/CD). Configuration de pipelines automatisés pour tester et déployer des applications.'
    },
    springboot: {
        title: 'Spring Boot',
        img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/spring/spring-original.svg',
        desc: 'Framework Java pour créer des API REST et applications web. Architecture en couches (Controller, Service, Repository), injection de dépendances et endpoints sécurisés avec Spring Security.'
    },
    nosql: {
        title: 'NoSQL (MongoDB)',
        img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg',
        desc: 'Bases de données orientées document pour des besoins de flexibilité et scalabilité. Étude du modèle document, collections sans schéma rigide et requêtes d\'agrégation avec MongoDB.'
    },
    react: {
        title: 'React',
        img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg',
        desc: 'Bibliothèque JavaScript de Meta pour créer des interfaces composables. Composants fonctionnels, hooks (useState, useEffect), communication avec des API REST et principes du SPA.'
    },
    flutter: {
        title: 'Flutter',
        img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/flutter/flutter-original.svg',
        desc: 'Framework UI de Google pour développer des applications multiplateformes. Découvert et pratiqué en contexte professionnel pour contribuer à une application mobile utilisée en production.'
    },
    go: {
        title: 'Go',
        img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original-wordmark.svg',
        desc: 'Langage compilé orienté performance et simplicité. Utilisé en stage pour intervenir sur des services backend, avec une attention portée à la lisibilité, à la concurrence et à la robustesse.'
    },
    maths: {
        title: 'Modélisation Mathématique',
        img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/matlab/matlab-original.svg',
        desc: 'Formalisation de problèmes complexes via l\'algèbre linéaire et les statistiques. En Python avec NumPy, résolution de problèmes d\'optimisation et simulations numériques.'
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
    gamesModalFullscreen.setAttribute('aria-label', isFakeFullscreen ? 'Quitter le plein écran' : 'Plein écran');
}

// Attache le listener sur tous les liens secrets (présents et futurs via delegation)
document.addEventListener('click', (e) => {
    const trigger = e.target.closest('.softskill-secret-games');
    if (trigger) {
        e.preventDefault();
        const gameSrc = trigger.dataset.game;
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

        if (window.scrollY > 60) {
            document.querySelector("#scroll-top").classList.add("active");
        } else {
            document.querySelector("#scroll-top").classList.remove("active");
        }

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
        "Développeur Full-Stack",
        "Diplômé du BUT Informatique",
        "Challenger sur League of Legends (faux..)"
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
   SCROLL REVEAL
   =================================================== */
const srtop = ScrollReveal({
    origin: "top",
    distance: "48px",
    duration: 1000,
    reset: false,
    mobile: true,
    viewFactor: 0.1,
});

if (window.matchMedia('(max-width: 768px)').matches) {
    ScrollReveal().destroy();
    document.querySelectorAll(
        '.home .content, .home .image, .about .row, .skills .skills-grid, .softskills .softskill-bloc, .softskills .softskill-reflexive, .education .box, .portfolio-item, .experience .timeline .container'
    ).forEach((el) => {
        el.style.opacity = '1';
        el.style.visibility = 'visible';
        el.style.transform = 'none';
    });
}

/* SCROLL HOME */
srtop.reveal(".home .content h3", { delay: 200 });
srtop.reveal(".home .content p", { delay: 200 });
srtop.reveal(".home .content .btn", { delay: 200 });
srtop.reveal(".home .image", { delay: 400 });
srtop.reveal(".home .linkedin", { interval: 600 });
srtop.reveal(".home .github", { interval: 800 });
srtop.reveal(".home .twitter", { interval: 1000 });
srtop.reveal(".home .telegram", { interval: 600 });
srtop.reveal(".home .instagram", { interval: 600 });
srtop.reveal(".home .dev", { interval: 600 });

/* SCROLL ABOUT */
srtop.reveal(".about .content h3", { delay: 200 });
srtop.reveal(".about .content .tag", { delay: 200 });
srtop.reveal(".about .content p", { delay: 200 });
srtop.reveal(".about .content .box-container", { delay: 200 });
srtop.reveal(".about .content .resumebtn", { delay: 200 });

/* SCROLL SKILLS */
srtop.reveal(".skills .skills-grid", { interval: 200 });
srtop.reveal(".skills .skills-grid .skill-td", { interval: 100 });

/* SCROLL SOFT SKILLS */
srtop.reveal(".softskills .skills-subtitle", { delay: 120 });
srtop.reveal(".softskills .softskill-bloc", { interval: 140 });
srtop.reveal(".softskills .softskill-card", { interval: 90 });
srtop.reveal(".softskills .softskill-reflexive", { delay: 180 });

/* SCROLL EDUCATION */
srtop.reveal(".education .box", { interval: 200 });

/* SCROLL PROJECTS */
srtop.reveal(".work .box", { interval: 200 });
srtop.reveal(".portfolios .portfolio-item", { interval: 150 });

/* SCROLL EXPERIENCE */
srtop.reveal(".experience .timeline", { delay: 400 });
srtop.reveal(".experience .timeline .container", { interval: 400 });

/* SCROLL CONTACT */
srtop.reveal(".contact .container", { delay: 400 });
srtop.reveal(".contact .container .form-group", { delay: 400 });

const rbdButton = document.querySelector('.btn-class-name');

if (rbdButton) {
    const rbdSettings = {
        glitchDurationMs: 1200,
        audioLeadMs: 240,
        flashHoldMs: 700,
        flashFadeMs: 1600,
        reviveDurationMs: 900,
        audioVolume: 0.1,
    };

    rbdButton.addEventListener('click', () => {
        if (document.getElementById('rtz-style')) return;

        const style = document.createElement('style');
        style.id = 'rtz-style';
        style.textContent = `
        .rtz-glitch-r,
        .rtz-glitch-b {
            position: fixed;
            inset: 0;
            z-index: 99999;
            pointer-events: none;
            mix-blend-mode: screen;
            opacity: 0;
        }
        .rtz-glitch-r {
            background: rgba(255, 0, 0, 0.35);
            animation: rtz-glitch-r 0.85s steps(2) forwards;
        }
        .rtz-glitch-b {
            background: rgba(0, 80, 255, 0.3);
            animation: rtz-glitch-b 0.85s steps(2) forwards;
        }
        @keyframes rtz-glitch-r {
            0%   { opacity: 0; transform: translate(0, 0); }
            10%  { opacity: 1; transform: translate(-6px, 2px); }
            25%  { opacity: 1; transform: translate(5px, -3px); }
            40%  { opacity: 1; transform: translate(-8px, 0px); }
            55%  { opacity: 1; transform: translate(4px, 4px); }
            70%  { opacity: 0.8; transform: translate(-3px, -2px); }
            85%  { opacity: 0; }
            100% { opacity: 0; }
        }
        @keyframes rtz-glitch-b {
            0%   { opacity: 0; transform: translate(0, 0); }
            10%  { opacity: 1; transform: translate(6px, -2px); }
            25%  { opacity: 1; transform: translate(-5px, 3px); }
            40%  { opacity: 1; transform: translate(8px, 0px); }
            55%  { opacity: 1; transform: translate(-4px, -4px); }
            70%  { opacity: 0.8; transform: translate(3px, 2px); }
            85%  { opacity: 0; }
            100% { opacity: 0; }
        }

        .rtz-scanlines {
            position: fixed;
            inset: 0;
            z-index: 100000;
            pointer-events: none;
            background: repeating-linear-gradient(
                to bottom,
                transparent 0px,
                transparent 3px,
                rgba(0, 0, 0, 0.4) 3px,
                rgba(0, 0, 0, 0.4) 4px
            );
            opacity: 0;
            animation: rtz-scan 1s ease-in forwards;
        }
        @keyframes rtz-scan {
            0%   { opacity: 0; }
            20%  { opacity: 1; }
            80%  { opacity: 1; }
            100% { opacity: 0; }
        }

        .rtz-shatter {
            position: fixed;
            left: 0;
            width: 100%;
            z-index: 100001;
            pointer-events: none;
            background: #000;
            opacity: 0;
        }
        @keyframes rtz-shatter-anim {
            0%   { opacity: 0; transform: translateX(0); }
            30%  { opacity: 1; transform: translateX(var(--dx)); }
            70%  { opacity: 1; transform: translateX(calc(var(--dx) * -0.5)); }
            100% { opacity: 1; transform: translateX(0); }
        }

        /* Noir permanent — pas d'animation, on le retire manuellement */
        .rtz-blackout {
            position: fixed;
            inset: 0;
            z-index: 100002;
            pointer-events: none;
            background: #000;
            opacity: 0;
            animation: rtz-blackout-anim 1.1s ease-in forwards;
        }
        @keyframes rtz-blackout-anim {
            0%   { opacity: 0; }
            50%  { opacity: 0.2; }
            85%  { opacity: 0.9; }
            100% { opacity: 1; }
        }

        /* Blanc qui apparait sur le noir, AVANT le scroll */
        .rtz-whiteflash {
            position: fixed;
            inset: 0;
            z-index: 100003;
            pointer-events: none;
            background: #fff;
            opacity: 1;
        }
        .rtz-whiteflash.fade-out {
            animation: rtz-white-out ${rbdSettings.flashFadeMs}ms ease-out forwards;
        }
        @keyframes rtz-white-out {
            0%   { opacity: 1; }
            100% { opacity: 0; }
        }

        .rtz-dying {
            animation: rtz-die 1s ease-in forwards !important;
            transform-origin: center center;
        }
        @keyframes rtz-die {
            0%   { filter: none; transform: none; }
            15%  { filter: saturate(4) contrast(1.5); transform: skewX(-1.5deg); }
            30%  { filter: hue-rotate(90deg) saturate(6) contrast(2); transform: skewX(2deg) scaleY(1.01); }
            50%  { filter: hue-rotate(200deg) saturate(3) brightness(2); transform: skewX(-2.5deg) scaleX(1.01); }
            70%  { filter: grayscale(1) brightness(4) contrast(3); transform: skewX(1deg); }
            88%  { filter: invert(1) brightness(3); transform: scale(1.015); }
            100% { filter: brightness(0); transform: scale(1); }
        }

        .rtz-revive {
            animation: rtz-appear 0.7s ease-out forwards !important;
        }
        @keyframes rtz-appear {
            0%   { filter: brightness(0) saturate(0); }
            50%  { filter: brightness(0.6) saturate(0.4); }
            100% { filter: none; }
        }
    `;
        document.head.appendChild(style);

        const glitchR = document.createElement('div');
        glitchR.className = 'rtz-glitch-r';
        document.body.appendChild(glitchR);

        const glitchB = document.createElement('div');
        glitchB.className = 'rtz-glitch-b';
        document.body.appendChild(glitchB);

        const scanlines = document.createElement('div');
        scanlines.className = 'rtz-scanlines';
        document.body.appendChild(scanlines);

        const bandCount = 8;
        const bands = [];
        for (let i = 0; i < bandCount; i++) {
            const band = document.createElement('div');
            band.className = 'rtz-shatter';
            const h = 100 / bandCount;
            band.style.top = `${i * h}vh`;
            band.style.height = `${h}vh`;
            const dx = (Math.random() - 0.5) * 40;
            band.style.setProperty('--dx', `${dx}px`);
            const delay = 0.3 + i * 0.04;
            band.style.animation = `rtz-shatter-anim 0.6s steps(2) ${delay}s forwards`;
            document.body.appendChild(band);
            bands.push(band);
        }

        const blackout = document.createElement('div');
        blackout.className = 'rtz-blackout';
        document.body.appendChild(blackout);

        document.body.classList.add('rtz-dying');

        const audio = new Audio('./assets/rbd/ReturnByDeath.mp3');
        audio.volume = rbdSettings.audioVolume;

        const cleanupSequence = (whiteFlash) => {
            document.body.classList.remove('rtz-revive');
            whiteFlash?.remove();
            document.getElementById('rtz-style')?.remove();
        };

        // Étape 1 — noir total atteint (1200ms)
        setTimeout(() => {
            glitchR.remove();
            glitchB.remove();
            scanlines.remove();
            bands.forEach(b => b.remove());
            document.body.classList.remove('rtz-dying');
            audio.play().catch(() => console.warn('Audio bloqué.'));

            setTimeout(() => {
                const whiteFlash = document.createElement('div');
                whiteFlash.className = 'rtz-whiteflash';
                document.body.appendChild(whiteFlash);

                window.scrollTo({ top: 0, behavior: 'auto' });
                blackout.remove();

                setTimeout(() => {
                    whiteFlash.classList.add('fade-out');
                    document.body.classList.add('rtz-revive');

                    setTimeout(() => {
                        cleanupSequence(whiteFlash);
                    }, Math.max(rbdSettings.flashFadeMs, rbdSettings.reviveDurationMs));
                }, rbdSettings.flashHoldMs);
            }, rbdSettings.audioLeadMs);

        }, rbdSettings.glitchDurationMs);
    });
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
            if (emailLabel) emailLabel.textContent = 'Copié !';
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
   KONAMI CODE (placeholder de test)
   =================================================== */
const konamiSequence = [
    'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
    'b', 'a'
];
let konamiProgress = 0;

function triggerKonamiEffect() {
    // Assets attendus (à fournir toi-même dans le dossier assets/ff7/, non générables ici pour raison de droits) :
    //  - ./assets/ff7/cloud.gif    (sprite animé de Cloud)
    //  - ./assets/ff7/victory.mp3  (jingle de victoire, ~9s)

    const overlay = document.createElement('div');
    overlay.className = 'ff7-victory-overlay';
    overlay.innerHTML = `
        <div class="ff7-sprites">
            <img src="./assets/ff7/cloud.gif" alt="Cloud" class="ff7-sprite">
        </div>
    `;
    document.body.appendChild(overlay);

    const victoryAudio = new Audio('./assets/ff7/victory.mp3');
    victoryAudio.volume = 0.1;
    victoryAudio.play().catch(() => console.warn('Audio bloqué (interaction requise).'));

    // Pluie de gil (pas besoin d'asset externe : simple pièce dorée dessinée en CSS/emoji)
    const gilInterval = setInterval(() => spawnGil(overlay), 90);
    setTimeout(() => clearInterval(gilInterval), 9200);

    setTimeout(() => {
        overlay.classList.add('fade-out');
        setTimeout(() => {
            victoryAudio.pause();
            overlay.remove();
        }, 800);
    }, 10000);
}

function spawnGil(container) {
    const gil = document.createElement('span');
    gil.className = 'ff7-gil';
    gil.textContent = '🪙';
    gil.style.left = `${Math.random() * 100}%`;
    gil.style.animationDuration = `${1.6 + Math.random() * 1.4}s`;
    gil.style.fontSize = `${1.4 + Math.random() * 1.2}rem`;
    container.appendChild(gil);
    setTimeout(() => gil.remove(), 3200);
}

window.addEventListener('keydown', (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    const expected = konamiSequence[konamiProgress];

    if (key === expected) {
        konamiProgress++;
        if (konamiProgress === konamiSequence.length) {
            konamiProgress = 0;
            triggerKonamiEffect();
        }
    } else {
        konamiProgress = (key === konamiSequence[0]) ? 1 : 0;
    }
});