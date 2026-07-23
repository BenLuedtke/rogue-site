// Recursive shadowcasting FOV
export function computeFOV(grid, col, row, radius, rows, cols) {
    const visible = new Set();
    visible.add(`${col},${row}`);

    function isBlocking(c, r) {
        if (c < 0 || r < 0 || c >= cols || r >= rows) return true;
        return grid[r][c] === 0; // WALL
    }

    function castLight(cx, cy, row_, start, end, xx, xy, yx, yy) {
        if (start < end) return;
        let newStart = 0;
        let blocked = false;

        for (let dist = row_; dist <= radius && !blocked; dist++) {
            const dy = -dist;
            for (let dx = -dist; dx <= 0; dx++) {
                const lSlope = (dx - 0.5) / (dy + 0.5);
                const rSlope = (dx + 0.5) / (dy - 0.5);
                if (start < rSlope) continue;
                if (end > lSlope) break;

                const sax = dx * xx + dy * xy;
                const say = dx * yx + dy * yy;
                if ((sax < 0 && Math.abs(sax) > cx) || (say < 0 && Math.abs(say) > cy)) continue;

                const tc = cx + sax;
                const tr = cy + say;
                if (tc < cols && tr < rows && tc >= 0 && tr >= 0) {
                    const radius2 = radius * radius;
                    if (dx * dx + dy * dy < radius2) visible.add(`${tc},${tr}`);
                }

                if (blocked) {
                    if (isBlocking(tc, tr)) newStart = rSlope;
                    else {
                        blocked = false;
                        start = newStart;
                    }
                } else if (isBlocking(tc, tr) && dist < radius) {
                    blocked = true;
                    castLight(cx, cy, dist + 1, start, lSlope, xx, xy, yx, yy);
                    newStart = rSlope;
                }
            }
        }
    }

    const mult = [
        [1, 0, 0, -1, -1, 0, 0, 1],
        [0, 1, -1, 0, 0, -1, 1, 0],
        [0, 1, 1, 0, 0, -1, -1, 0],
        [1, 0, 0, 1, -1, 0, 0, -1],
    ];

    for (let oct = 0; oct < 8; oct++) {
        castLight(col, row, 1, 1.0, 0.0,
            mult[0][oct], mult[1][oct],
            mult[2][oct], mult[3][oct]);
    }

    return visible;
}
