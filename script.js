/* ===================================================
   CUSTOM CURSOR
   =================================================== */
const cursorDot = document.querySelector('.cursor-dot');
const cursorOutline = document.querySelector('.cursor-outline');

const isTouchDevice = window.matchMedia('(hover: none), (pointer: coarse)').matches;

if (isTouchDevice) {
    if (cursorDot) cursorDot.style.display = 'none';
    if (cursorOutline) cursorOutline.style.display = 'none';
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
window.addEventListener('load', () => {
    const loader = document.getElementById('pageLoader');
    if (!loader) return;

    document.body.classList.add('is-loaded');
    setTimeout(() => {
        loader.classList.add('hide');
        setTimeout(() => loader.remove(), 700);
    }, 1700);
});

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
    nosql: 68,
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
    if (e.key === 'Escape') {
        skillModal.classList.remove('open');
        document.querySelectorAll('.stage-modal-overlay').forEach(m => m.classList.remove('active'));
        const cvModal = document.getElementById('cvModal');
        if (cvModal) cvModal.setAttribute('aria-hidden', 'true');
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

    // smooth scrolling
    $('a[href*="#"]:not(.no-scroll)').on("click", function (e) {
        e.preventDefault();
        $("html, body").animate(
            { scrollTop: $($(this).attr("href")).offset().top },
            500, "linear"
        );
    });
});

/* ===================================================
   TYPED JS
   =================================================== */
var typed = new Typed(".typing-text", {
    strings: [
        "Étudiant en 3ème année de BUT Informatique",
        "Développeur Informatique",
        "Futur ingénieur en informatique",
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
        '.home .content, .home .image, .about .row, .skills .skills-grid, .education .box, .portfolio-item, .experience .timeline .container'
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