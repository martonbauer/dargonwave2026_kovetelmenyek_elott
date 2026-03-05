const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;
const DB_FILE = path.join(__dirname, 'db.json');

// --- Database Logic ---
function readDB() {
    if (!fs.existsSync(DB_FILE)) {
        const initialDB = {
            racers: [],
            categories: {} // Track start times: { "kayak_11km": timestamp }
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 2));
        return initialDB;
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// --- Bib Logic ---
const BIB_RANGES = {
    '22km': { min: 1, max: 74 },
    '11km': { min: 75, max: 119 },
    '4km': { min: 120, max: 170 },
    'sarkanyhajo_otproba': { min: 200, max: 205 }
};

function getNextBib(distance, category, existingRacers) {
    let range;
    if (category === 'sarkanyhajo_otproba') {
        range = BIB_RANGES['sarkanyhajo_otproba'];
    } else {
        range = BIB_RANGES[distance] || { min: 300, max: 999 };
    }

    const usedBibs = existingRacers.map(r => r.bib);
    let bib = range.min;
    while (usedBibs.includes(bib) && bib <= range.max) {
        bib++;
    }

    return bib <= range.max ? bib : null;
}

// --- Logging ---
function logBackendEvent(msg) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${msg}`);
}

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // --- API Routes ---

    // 1. Get All Data
    if (pathname === '/api/data' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(readDB()));
        return;
    }

    // 2. Register Racer
    if (pathname === '/api/register' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const { members, category, distance } = JSON.parse(body);
                const db = readDB();

                const bib = getNextBib(distance, category, db.racers);
                if (bib === null) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Nincs több szabad rajtszám ebben a kategóriában!' }));
                }

                const newRacer = {
                    id: Date.now().toString(),
                    bib,
                    members, // Array of { name, birthDate, otprobaId }
                    category,
                    distance,
                    status: 'registered',
                    startTime: null,
                    finishTime: null,
                    totalTime: null
                };

                db.racers.push(newRacer);
                writeDB(db);
                logBackendEvent(`Registered unit #${bib} (${category}) with ${members.length} members.`);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(newRacer));
            } catch (err) {
                console.error(err);
                res.writeHead(500);
                res.end();
            }
        });
        return;
    }

    // 3. Start Category
    if (pathname === '/api/start-category' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const { categoryName, distance, groupId } = JSON.parse(body);
            const db = readDB();
            const now = Date.now();
            const startKey = groupId || `${categoryName}_${distance}`;

            if (db.categories[startKey]) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Már elindult ez a futam!' }));
                return;
            }

            db.categories[startKey] = now;
            let startedCount = 0;

            const isInCategory = (racer, cat, dist, group) => {
                if (group) {
                    if (group === 'kajak_hosszu') return (racer.category.includes('kajak') || racer.category.includes('surfski')) && racer.distance === '22km';
                    if (group === 'kajak_rovid') return (racer.category.includes('kajak') || racer.category.includes('surfski')) && racer.distance === '11km';
                    if (group === 'kenu_hosszu') return (racer.category.includes('kenu') || racer.category.includes('outrigger')) && racer.distance === '22km';
                    if (group === 'kenu_rovid') return (racer.category.includes('kenu') || racer.category.includes('outrigger')) && racer.distance === '11km';
                    if (group === 'sup_4km') return racer.category.includes('sup') && racer.distance === '4km';
                    if (group === 'sarkanyhajo_11km') return racer.category === 'sarkanyhajo_otproba' && racer.distance === '11km';
                }
                return racer.category === cat && racer.distance === dist;
            };

            db.racers.forEach(r => {
                if (isInCategory(r, categoryName, distance, groupId) && r.status === 'registered') {
                    r.status = 'racing';
                    r.startTime = now;
                    startedCount++;
                }
            });

            writeDB(db);
            logBackendEvent(`Started ${startKey}: ${startedCount} racers.`);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, startTime: now, count: startedCount }));
        });
        return;
    }

    // 4. Stop Category
    if (pathname === '/api/stop-category' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const { categoryName, distance, groupId } = JSON.parse(body);
            const db = readDB();
            const now = Date.now();
            const startKey = groupId || `${categoryName}_${distance}`;

            if (!db.categories[startKey]) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Ez a futam még nem indult el!' }));
                return;
            }

            let stoppedCount = 0;
            const isInCategory = (racer, cat, dist, group) => {
                if (group) {
                    if (group === 'kajak_hosszu') return (racer.category.includes('kajak') || racer.category.includes('surfski')) && racer.distance === '22km';
                    if (group === 'kajak_rovid') return (racer.category.includes('kajak') || racer.category.includes('surfski')) && racer.distance === '11km';
                    if (group === 'kenu_hosszu') return (racer.category.includes('kenu') || racer.category.includes('outrigger')) && racer.distance === '22km';
                    if (group === 'kenu_rovid') return (racer.category.includes('kenu') || racer.category.includes('outrigger')) && racer.distance === '11km';
                    if (group === 'sup_4km') return racer.category.includes('sup') && racer.distance === '4km';
                    if (group === 'sarkanyhajo_11km') return racer.category === 'sarkanyhajo_otproba' && racer.distance === '11km';
                }
                return racer.category === cat && racer.distance === dist;
            };

            db.racers.forEach(r => {
                if (isInCategory(r, categoryName, distance, groupId) && r.status === 'racing') {
                    r.status = 'finished';
                    r.finishTime = now;
                    r.totalTime = r.finishTime - r.startTime;
                    stoppedCount++;
                }
            });

            // Keep the start time in case we need it, but the race is functionally "stopped" for these racers
            // Actually, usually stop-category might clear the start time to allow a restart, 
            // but here we mark racers as finished.

            writeDB(db);
            logBackendEvent(`Stopped ${startKey}: ${stoppedCount} racers finished.`);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, finishTime: now, count: stoppedCount }));
        });
        return;
    }

    // 5. Finish Racer (Manual Bib)
    if (pathname === '/api/finish-racer' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const { bib } = JSON.parse(body);
            const db = readDB();
            const now = Date.now();

            const racer = db.racers.find(r => r.bib === parseInt(bib));
            if (!racer) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Nincs ilyen rajtszámú versenyző!' }));
                return;
            }

            if (racer.status !== 'racing') {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Ez a versenyző nincs versenyben!' }));
                return;
            }

            racer.status = 'finished';
            racer.finishTime = now;
            racer.totalTime = racer.finishTime - racer.startTime;

            writeDB(db);
            logBackendEvent(`Racer #${bib} (${racer.name}) finished.`);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(racer));
        });
        return;
    }

    // 6. Delete Racer
    if (pathname === '/api/delete-racer' && req.method === 'DELETE') {
        const bib = parseInt(parsedUrl.query.bib);
        const db = readDB();
        const initialCount = db.racers.length;
        db.racers = db.racers.filter(r => r.bib !== bib);

        if (db.racers.length === initialCount) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Nincs ilyen rajtszám!' }));
            return;
        }

        writeDB(db);
        logBackendEvent(`Deleted racer #${bib}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        return;
    }

    // 7. Reset All Data
    if (pathname === '/api/reset' && req.method === 'DELETE') {
        const initialDB = { racers: [], categories: {} };
        writeDB(initialDB);
        logBackendEvent(`Database reset.`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        return;
    }

    // 8. Upload CSV
    if (pathname === '/api/upload-csv' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const { csvData } = JSON.parse(body);
                const db = readDB();
                const lines = csvData.trim().split('\n');
                let added = 0;

                lines.forEach(line => {
                    const [name, category, birthDate, distance, otprobaId] = line.split(',').map(s => s.trim());
                    if (name && category) {
                        const bib = getNextBib(distance, category, db.racers);
                        if (bib) {
                            db.racers.push({
                                id: Date.now().toString() + Math.random(),
                                bib, name, category, birthDate, distance, otprobaId,
                                status: 'registered',
                                startTime: null, finishTime: null, totalTime: null
                            });
                            added++;
                        }
                    }
                });

                writeDB(db);
                logBackendEvent(`Imported ${added} racers via CSV.`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, count: added }));
            } catch (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Invalid CSV data' }));
            }
        });
        return;
    }

    // Static File Server Fallback (minimal)
    res.writeHead(404);
    res.end();
});

server.listen(PORT, () => {
    console.log(`DragonWave Standalone Server running at http://localhost:${PORT}`);
});
