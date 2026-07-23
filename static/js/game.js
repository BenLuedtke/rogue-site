import { generateDungeon, placeLinks, placeEnemies, placePotions, TILE, CELL_W, CELL_H, makePRNG } from './dungeon.js';
import { computeFOV } from './fov.js';
import { createRenderer } from './renderer.js';

const FOV_RADIUS = 8;

export function initGame(canvas, links, onLog, onStatsUpdate, onLinkFound, onDeath) {
    const seed = Math.floor(Math.random() * 999999);
    const cols = Math.floor(canvas.parentElement.clientWidth / CELL_W);
    const rows = Math.floor(canvas.parentElement.clientHeight / CELL_H);

    const { grid, rooms, rng } = generateDungeon(seed, cols, rows);
    const linkItems = placeLinks(rooms, links, rng);
    const enemies = placeEnemies(rooms, rng, 10 + Math.floor(rng() * 8));
    const potions = placePotions(rooms, rng, 6 + Math.floor(rng() * 4));

    const startRoom = rooms[0];
    const startCol = Math.floor(startRoom.x + startRoom.w / 2);
    const startRow = Math.floor(startRoom.y + startRoom.h / 2);
    const player = {
        col: startCol,
        row: startRow,
        hp: 30,
        maxHp: 30,
        atk: 5,
        bonusAtk: 0,
        alive: true,
    };

    const seen = new Set();
    let visible = new Set();
    let cheatMode = false;

    const renderer = createRenderer(canvas, cols, rows);

    function getState() {
        return { grid, rows, cols, visible, seen, player, enemies, potions, linkItems, cheatMode };
    }

    function updateFOV() {
        visible = computeFOV(grid, player.col, player.row, FOV_RADIUS, rows, cols);
        for (const k of visible) seen.add(k);
    }

    function render() {
        renderer.render(getState());
    }

    function log(msg) { onLog(msg); }

    function statsUpdate() {
        onStatsUpdate(`HP: ${player.hp}/${player.maxHp}  ATK: ${player.atk + player.bonusAtk}`);
    }

    function isWalkable(c, r) {
        if (c < 0 || r < 0 || c >= cols || r >= rows) return false;
        return grid[r][c] !== TILE.WALL;
    }

    function enemyAt(c, r) {
        return enemies.find(e => e.alive && e.col === c && e.row === r);
    }

    function attackEnemy(e) {
        const dmg = player.atk + player.bonusAtk + Math.floor(Math.random() * 3);
        e.hp -= dmg;
        if (e.hp <= 0) {
            e.alive = false;
            log(`The ${e.name} is dead.`);
        } else {
            log(`${e.name[0].toUpperCase() + e.name.slice(1)}: ${e.hp}/${e.maxHp} HP.`);
        }
    }

    function enemyTurn() {
        for (const e of enemies) {
            if (!e.alive) continue;
            const dist = Math.abs(e.col - player.col) + Math.abs(e.row - player.row);
            const key = `${e.col},${e.row}`;
            if (!visible.has(key)) continue;

            if (dist === 1) {
                // Attack player
                const dmg = Math.max(1, e.atk - Math.floor(Math.random() * 3));
                player.hp -= dmg;
                log(`The ${e.name} deals ${dmg} damage.`);
                if (player.hp <= 0) {
                    player.hp = 0;
                    player.alive = false;
                    statsUpdate();
                    render();
                    if (onDeath) onDeath();
                    return;
                }
            } else if (dist <= FOV_RADIUS) {
                // Move toward player (simple)
                const dc = Math.sign(player.col - e.col);
                const dr = Math.sign(player.row - e.row);
                const nc = e.col + dc;
                const nr = e.row + dr;
                if (isWalkable(nc, nr) && !enemyAt(nc, nr)) {
                    e.col = nc; e.row = nr;
                } else if (isWalkable(e.col + dc, e.row) && !enemyAt(e.col + dc, e.row)) {
                    e.col += dc;
                } else if (isWalkable(e.col, e.row + dr) && !enemyAt(e.col, e.row + dr)) {
                    e.row += dr;
                }
            }
        }
    }

    function checkPickups() {
        // Potions
        for (const p of potions) {
            if (!p.picked && p.col === player.col && p.row === player.row) {
                p.picked = true;
                if (p.effect === 'heal') {
                    player.hp = Math.min(player.maxHp, player.hp + p.amount);
                    log(`HP restored to ${player.hp}.`);
                } else if (p.effect === 'strength') {
                    player.bonusAtk += p.amount;
                    log(`ATK +${p.amount}.`);
                }
            }
        }
        // Links
        for (const link of linkItems) {
            if (link.col === player.col && link.row === player.row) {
                player.hp = player.maxHp;
                onLinkFound(link);
                log(`Found: ${link.label}. HP restored.`);
            }
        }
    }

    function movePlayer(dc, dr) {
        if (!player.alive) return;
        const nc = player.col + dc;
        const nr = player.row + dr;

        const enemy = enemyAt(nc, nr);
        if (enemy) {
            attackEnemy(enemy);
            enemyTurn();
            statsUpdate();
            updateFOV();
            render();
            return;
        }

        if (!isWalkable(nc, nr)) return;

        player.col = nc;
        player.row = nr;
        checkPickups();
        enemyTurn();
        statsUpdate();
        updateFOV();
        render();
    }

    function activateCheat() {
        cheatMode = !cheatMode;
        render();
    }

    function revive() {
        player.col = startCol;
        player.row = startRow;
        player.hp = player.maxHp;
        player.bonusAtk = 0;
        player.alive = true;
        log('Revived.');
        statsUpdate();
        updateFOV();
        render();
    }

    updateFOV();
    statsUpdate();
    render();

    return { movePlayer, activateCheat, revive, getState, canvas, CELL_W, CELL_H, linkItems };
}
