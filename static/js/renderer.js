import { TILE, CELL_W, CELL_H } from './dungeon.js';

export function createRenderer(canvas, cols, rows) {
    const ctx = canvas.getContext('2d');
    canvas.width = cols * CELL_W;
    canvas.height = rows * CELL_H;

    function drawGlyph(col, row, glyph, color) {
        ctx.fillStyle = color;
        ctx.font = `${CELL_H - 2}px "Courier New", monospace`;
        ctx.textBaseline = 'top';
        ctx.fillText(glyph, col * CELL_W + 1, row * CELL_H + 1);
    }

    function isWall(grid, c, r, gc, gr) {
        if (c < 0 || r < 0 || c >= gc || r >= gr) return true;
        return grid[r][c] === TILE.WALL;
    }

    function render(state) {
        const { grid, rows: gr, cols: gc, visible, seen, player, enemies, potions, linkItems, cheatMode } = state;

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let r = 0; r < gr; r++) {
            for (let c = 0; c < gc; c++) {
                const key = `${c},${r}`;
                const isVis = cheatMode || visible.has(key);
                const wasSeen = seen.has(key);
                const tile = grid[r][c];

                if (!isVis && !wasSeen) continue;

                const dim = !isVis;
                const x = c * CELL_W, y = r * CELL_H;

                if (tile === TILE.WALL) {
                    ctx.fillStyle = dim ? '#0a0a0a' : '#101010';
                    ctx.fillRect(x, y, CELL_W, CELL_H);
                } else {
                    // Floor / corridor / door — subtle fill
                    ctx.fillStyle = dim ? '#060606' : '#0d0d0d';
                    ctx.fillRect(x, y, CELL_W, CELL_H);

                    // Draw clean border lines at wall edges
                    ctx.strokeStyle = dim ? '#262626' : '#484848';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    if (isWall(grid, c, r - 1, gc, gr)) {
                        ctx.moveTo(x, y + 0.5);
                        ctx.lineTo(x + CELL_W, y + 0.5);
                    }
                    if (isWall(grid, c, r + 1, gc, gr)) {
                        ctx.moveTo(x, y + CELL_H - 0.5);
                        ctx.lineTo(x + CELL_W, y + CELL_H - 0.5);
                    }
                    if (isWall(grid, c - 1, r, gc, gr)) {
                        ctx.moveTo(x + 0.5, y);
                        ctx.lineTo(x + 0.5, y + CELL_H);
                    }
                    if (isWall(grid, c + 1, r, gc, gr)) {
                        ctx.moveTo(x + CELL_W - 0.5, y);
                        ctx.lineTo(x + CELL_W - 0.5, y + CELL_H);
                    }
                    ctx.stroke();

                    if (tile === TILE.DOOR) {
                        drawGlyph(c, r, '+', dim ? '#664422' : '#cc8844');
                    }
                }
            }
        }

        // Potions
        for (const p of potions) {
            if (p.picked) continue;
            const key = `${p.col},${p.row}`;
            const isVis = cheatMode || visible.has(key);
            if (!isVis && !seen.has(key)) continue;
            drawGlyph(p.col, p.row, '!', isVis ? p.color : '#444');
        }

        // Link items
        for (const link of linkItems) {
            const key = `${link.col},${link.row}`;
            const isVis = cheatMode || visible.has(key);
            if (!isVis && !seen.has(key)) continue;
            drawGlyph(link.col, link.row, link.symbol, isVis ? '#00cccc' : '#055');
        }

        // Enemies
        for (const e of enemies) {
            if (!e.alive) continue;
            const key = `${e.col},${e.row}`;
            if (!cheatMode && !visible.has(key)) continue;
            drawGlyph(e.col, e.row, e.glyph, e.color);
        }

        // Player
        drawGlyph(player.col, player.row, '@', '#ffdd00');
    }

    return { render, canvas, ctx, CELL_W, CELL_H };
}
