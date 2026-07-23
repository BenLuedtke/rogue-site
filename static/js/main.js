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

let currentLink = null;
let game = null;

function onLog(msg) { logEl.textContent = msg; }
function onStatsUpdate(stats) { statsEl.textContent = stats; }

function onLinkFound(link) {
    currentLink = link;
    showLinkOverlay(link);
}

function onDeath() {
    deathOverlay.style.display = 'flex';
}

function showLinkOverlay(link) {
    overlayTitle.textContent = link.label;
    overlayLink.textContent = link.url.startsWith('http') ? link.url.replace(/^https?:\/\//, '') : link.url;
    overlayLink.href = link.url;
    overlay.style.display = 'flex';
}

document.getElementById('overlay-close').addEventListener('click', () => {
    overlay.style.display = 'none';
});
overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.style.display = 'none';
});

reviveBtn.addEventListener('click', () => {
    deathOverlay.style.display = 'none';
    game.revive();
});

function startGame() {
    game = initGame(canvas, window.SITE_LINKS, onLog, onStatsUpdate, onLinkFound, onDeath);
    cheatBtn.addEventListener('click', () => game.activateCheat());
}

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
    if (e.key === 'Enter' && currentLink) {
        showLinkOverlay(currentLink);
        return;
    }
    const dir = DIRS[e.key];
    if (dir && game) {
        e.preventDefault();
        game.movePlayer(dir[0], dir[1]);
    }
});

canvas.addEventListener('click', (e) => {
    if (!game) return;
    const rect = canvas.getBoundingClientRect();
    const tc = Math.floor((e.clientX - rect.left) / game.CELL_W);
    const tr = Math.floor((e.clientY - rect.top) / game.CELL_H);

    for (const link of game.linkItems) {
        if (link.col === tc && link.row === tr) { showLinkOverlay(link); return; }
    }

    const { player } = game.getState();
    const dc = Math.sign(tc - player.col);
    const dr = Math.sign(tr - player.row);
    if (dc !== 0 || dr !== 0) game.movePlayer(dc, dr);
});

window.addEventListener('load', startGame);
