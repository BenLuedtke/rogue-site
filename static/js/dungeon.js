// Seeded PRNG (mulberry32)
function makePRNG(seed) {
    let s = seed >>> 0;
    return function() {
        s |= 0; s = s + 0x6D2B79F5 | 0;
        let t = Math.imul(s ^ s >>> 15, 1 | s);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

const TILE = { WALL: 0, FLOOR: 1, CORRIDOR: 2, DOOR: 3 };
const CELL_W = 12;
const CELL_H = 18;

function generateDungeon(seed, cols, rows) {
    const rng = makePRNG(seed);
    const grid = Array.from({length: rows}, () => new Array(cols).fill(TILE.WALL));
    const rooms = [];

    const numRooms = 8 + Math.floor(rng() * 5);

    function placeRoom(attempt) {
        const w = 5 + Math.floor(rng() * 10);
        const h = 4 + Math.floor(rng() * 7);
        const x = 1 + Math.floor(rng() * (cols - w - 2));
        const y = 1 + Math.floor(rng() * (rows - h - 2));

        for (const r of rooms) {
            if (x < r.x + r.w + 2 && x + w + 2 > r.x &&
                y < r.y + r.h + 2 && y + h + 2 > r.y) return null;
        }
        return { x, y, w, h };
    }

    for (let i = 0; i < numRooms * 5 && rooms.length < numRooms; i++) {
        const room = placeRoom();
        if (room) {
            rooms.push(room);
            for (let ry = room.y; ry < room.y + room.h; ry++)
                for (let rx = room.x; rx < room.x + room.w; rx++)
                    grid[ry][rx] = TILE.FLOOR;
        }
    }

    // Connect rooms with corridors
    for (let i = 1; i < rooms.length; i++) {
        const a = rooms[i - 1];
        const b = rooms[i];
        let ax = Math.floor(a.x + a.w / 2);
        let ay = Math.floor(a.y + a.h / 2);
        let bx = Math.floor(b.x + b.w / 2);
        let by = Math.floor(b.y + b.h / 2);

        while (ax !== bx) {
            if (grid[ay][ax] === TILE.WALL) grid[ay][ax] = TILE.CORRIDOR;
            ax += ax < bx ? 1 : -1;
        }
        while (ay !== by) {
            if (grid[ay][ax] === TILE.WALL) grid[ay][ax] = TILE.CORRIDOR;
            ay += ay < by ? 1 : -1;
        }
    }

    // Add doors at room entrances
    for (const room of rooms) {
        const edges = [];
        for (let rx = room.x; rx < room.x + room.w; rx++) {
            if (room.y > 0 && grid[room.y - 1][rx] === TILE.CORRIDOR) edges.push([rx, room.y]);
            if (room.y + room.h < rows && grid[room.y + room.h][rx] === TILE.CORRIDOR) edges.push([rx, room.y + room.h - 1]);
        }
        for (let ry = room.y; ry < room.y + room.h; ry++) {
            if (room.x > 0 && grid[ry][room.x - 1] === TILE.CORRIDOR) edges.push([room.x, ry]);
            if (room.x + room.w < cols && grid[ry][room.x + room.w] === TILE.CORRIDOR) edges.push([room.x + room.w - 1, ry]);
        }
        for (const [dx, dy] of edges) {
            if (rng() < 0.6) grid[dy][dx] = TILE.DOOR;
        }
    }

    return { grid, rooms, rng };
}

function placeLinks(rooms, links, rng) {
    const shuffled = [...rooms].sort(() => rng() - 0.5);
    return links.map((link, i) => {
        const room = shuffled[i % shuffled.length];
        return {
            ...link,
            col: room.x + 1 + Math.floor(rng() * (room.w - 2)),
            row: room.y + 1 + Math.floor(rng() * (room.h - 2)),
        };
    });
}

function placeEnemies(rooms, rng, count) {
    const enemies = [];
    const types = [
        { glyph: 'k', name: 'kobold', hp: 5, maxHp: 5, atk: 2, color: '#8a8' },
        { glyph: 'o', name: 'orc', hp: 10, maxHp: 10, atk: 3, color: '#6b4' },
        { glyph: 'T', name: 'troll', hp: 20, maxHp: 20, atk: 6, color: '#5a5' },
        { glyph: 'D', name: 'dragon', hp: 30, maxHp: 30, atk: 10, color: '#f44' },
    ];
    const skipFirst = rooms[0];
    const validRooms = rooms.slice(1);
    for (let i = 0; i < count; i++) {
        const room = validRooms[Math.floor(rng() * validRooms.length)];
        const type = types[Math.floor(rng() * types.length)];
        enemies.push({
            ...JSON.parse(JSON.stringify(type)),
            col: room.x + 1 + Math.floor(rng() * (room.w - 2)),
            row: room.y + 1 + Math.floor(rng() * (room.h - 2)),
            id: i,
            alive: true,
        });
    }
    return enemies;
}

function placePotions(rooms, rng, count) {
    const potions = [];
    const types = [
        { name: 'healing potion', effect: 'heal', amount: 10, color: '#f4f', glyph: '!' },
        { name: 'strength potion', effect: 'strength', amount: 2, color: '#f80', glyph: '!' },
    ];
    for (let i = 0; i < count; i++) {
        const room = rooms[Math.floor(rng() * rooms.length)];
        const type = types[Math.floor(rng() * types.length)];
        potions.push({
            ...type,
            col: room.x + 1 + Math.floor(rng() * (room.w - 2)),
            row: room.y + 1 + Math.floor(rng() * (room.h - 2)),
            id: i,
            picked: false,
        });
    }
    return potions;
}

export { generateDungeon, placeLinks, placeEnemies, placePotions, TILE, CELL_W, CELL_H, makePRNG };
