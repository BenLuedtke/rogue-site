import { initGame } from './game.js';

const canvas = document.getElementById('game-canvas');
const logEl = document.getElementById('log');
const statsEl = document.getElementById('stats');
const cheatBtn = document.getElementById('cheat-btn');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayLink = document.getElementById('overlay-link');
const deathOverlay = document.getElementById('death-overlay');
const reviveBtn = document.getElementById('revive-btn');
const mobileLinksOverlay = document.getElementById('mobile-links-overlay');
const mobileLinksList = document.getElementById('mobile-links-list');

const isMobile = 'ontouchstart' in window;

let currentLink = null;
let game = null;
let camOffX = 0, camOffY = 0;

// -- Camera --

function updateCamera() {
    if (!game) return;
    const { player } = game.getState();
    const playerPxX = (player.col + 0.5) * game.CELL_W;
    const playerPxY = (player.row + 0.5) * game.CELL_H;
    const wrapper = canvas.parentElement;
    camOffX = Math.max(0, Math.min(playerPxX - wrapper.clientWidth / 2, canvas.width - wrapper.clientWidth));
    camOffY = Math.max(0, Math.min(playerPxY - wrapper.clientHeight / 2, canvas.height - wrapper.clientHeight));
    canvas.style.transform = `translate(${-camOffX}px, ${-camOffY}px)`;
}

// -- Callbacks --

function onLog(msg) { logEl.textContent = msg; }
function onStatsUpdate(stats) { statsEl.textContent = stats; }

function onLinkFound(link) {
    currentLink = link;
    showLinkOverlay(link);
}

function onDeath() {
    deathOverlay.style.display = 'flex';
}

// -- Overlays --

function showLinkOverlay(link) {
    overlayTitle.textContent = link.label;
    overlayLink.textContent = link.url.startsWith('http') ? link.url.replace(/^https?:\/\//, '') : link.url;
    overlayLink.href = link.url;
    overlay.style.display = 'flex';
}

function showMobileLinks() {
    mobileLinksList.innerHTML = '';
    for (const link of game.linkItems) {
        const item = document.createElement('div');
        item.className = 'mobile-link-item';
        const a = document.createElement('a');
        a.href = link.url;
        a.textContent = link.label;
        if (link.url.startsWith('http')) a.target = '_blank';
        item.appendChild(a);
        mobileLinksList.appendChild(item);
    }
    mobileLinksOverlay.style.display = 'flex';
}

document.getElementById('overlay-close').addEventListener('click', () => {
    overlay.style.display = 'none';
});
overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.style.display = 'none';
});

document.getElementById('mobile-links-close').addEventListener('click', () => {
    mobileLinksOverlay.style.display = 'none';
});
mobileLinksOverlay.addEventListener('click', (e) => {
    if (e.target === mobileLinksOverlay) mobileLinksOverlay.style.display = 'none';
});

reviveBtn.addEventListener('click', () => {
    deathOverlay.style.display = 'none';
    game.revive();
    updateCamera();
});

// -- Game init --

function startGame() {
    game = initGame(canvas, window.SITE_LINKS, onLog, onStatsUpdate, onLinkFound, onDeath);

    cheatBtn.addEventListener('click', () => {
        if (isMobile) {
            showMobileLinks();
        } else {
            game.activateCheat();
            updateCamera();
        }
    });

    updateCamera();
}

// -- Keyboard --

const DIRS = {
    ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
    w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
    k: [0, -1], j: [0, 1], h: [-1, 0], l: [1, 0],
    y: [-1, -1], u: [1, -1], b: [-1, 1], n: [1, 1],
};

document.addEventListener('keydown', (e) => {
    if (deathOverlay.style.display === 'flex') {
        if (e.key === 'Enter' || e.key === ' ') reviveBtn.click();
        return;
    }
    if (overlay.style.display === 'flex') {
        if (e.key === 'Enter' || e.key === ' ') overlay.style.display = 'none';
        return;
    }
    if (mobileLinksOverlay.style.display === 'flex') {
        if (e.key === 'Enter' || e.key === 'Escape') mobileLinksOverlay.style.display = 'none';
        return;
    }
    if (e.key === 'Enter' && currentLink) {
        showLinkOverlay(currentLink);
        return;
    }
    const dir = DIRS[e.key];
    if (dir && game) {
        e.preventDefault();
        game.movePlayer(dir[0], dir[1]);
        updateCamera();
    }
});

// -- Desktop click --

canvas.addEventListener('click', (e) => {
    if (!game || isMobile) return;
    const rect = canvas.getBoundingClientRect();
    const tc = Math.floor((e.clientX - rect.left) / game.CELL_W);
    const tr = Math.floor((e.clientY - rect.top) / game.CELL_H);

    for (const link of game.linkItems) {
        if (link.col === tc && link.row === tr) { showLinkOverlay(link); return; }
    }

    const { player } = game.getState();
    const dc = Math.sign(tc - player.col);
    const dr = Math.sign(tr - player.row);
    if (dc !== 0 || dr !== 0) { game.movePlayer(dc, dr); updateCamera(); }
});

// -- Touch / swipe --

let touchStartX = 0, touchStartY = 0;
const MIN_SWIPE = 30;

canvas.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    if (!game) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;

    if (Math.abs(dx) < MIN_SWIPE && Math.abs(dy) < MIN_SWIPE) {
        // Tap — check for link, otherwise step toward tapped cell
        const rect = canvas.getBoundingClientRect();
        const tc = Math.floor((touch.clientX - rect.left) / game.CELL_W);
        const tr = Math.floor((touch.clientY - rect.top) / game.CELL_H);

        for (const link of game.linkItems) {
            if (link.col === tc && link.row === tr) { showLinkOverlay(link); return; }
        }

        const { player } = game.getState();
        const dc = Math.sign(tc - player.col);
        const dr = Math.sign(tr - player.row);
        if (dc !== 0 || dr !== 0) { game.movePlayer(dc, dr); updateCamera(); }
    } else {
        // Swipe — move in dominant direction
        if (Math.abs(dx) > Math.abs(dy)) {
            game.movePlayer(dx > 0 ? 1 : -1, 0);
        } else {
            game.movePlayer(0, dy > 0 ? 1 : -1);
        }
        updateCamera();
    }
    e.preventDefault();
}, { passive: false });

window.addEventListener('load', startGame);
