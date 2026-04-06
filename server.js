const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const supabase = require('./database');
const fs = require('fs');

// --- 0. ELŐZMÉNYEK KEZELÉSE (HISTORY MANAGEMENT) ---
const HISTORY_FILE = path.join(__dirname, 'history', 'bib_history.json');

function ensureHistoryDir() {
    const dir = path.dirname(HISTORY_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(HISTORY_FILE)) fs.writeFileSync(HISTORY_FILE, JSON.stringify([]));
}

function getBibHistory() {
    ensureHistoryDir();
    try { return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8')); }
    catch (e) { return []; }
}

function addBibHistoryEntry(entry) {
    const history = getBibHistory();
    history.unshift({ id: Date.now(), timestamp: new Date().toISOString(), ...entry });
    ensureHistoryDir();
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history.slice(0, 100), null, 2));
}

// --- 1. STRUKTURÁLIS RÉTEGEK: MIDDLEWARE-EK IMPORTÁLÁSA ---
const { rateLimiter } = require('./backend/middleware/rate-limiter');
const { ADMIN_PASSWORD, authenticateAdmin } = require('./backend/middleware/auth');

// --- 2. STRUKTURÁLIS RÉTEGEK: SZOLGÁLTATÁSOK (BUSINESS LOGIC) IMPORTÁLÁSA ---
const { getNextBib } = require('./backend/services/bib-service');
const { getGroupQuery, checkAndStopEmptyBatchTimers } = require('./backend/services/batch-service');

// --- 3. STRUKTURÁLIS RÉTEGEK: SEGÉDFUNKCIÓK (UTILITIES) IMPORTÁLÁSA ---
const { validateRacerData, normalizeCategoryToSlug } = require('./backend/utils/validation');

const app = express();
const PORT = process.env.PORT || 3001;

// --- 4. ALAPVETŐ SZERVER KONFIGURÁCIÓK ÉS MIDDLEWARE-EK ---
const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));
app.use(rateLimiter);

// --- 5. HITELESÍTÉS (AUTHENTICATION) ---
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.json({ success: true, message: 'Sikeres belépés!' });
    } else {
        res.status(401).json({ error: 'Hibás admin jelszó!' });
    }
});

// --- 6. RENDSZERÁLLAPOT ELLENŐRZÉS (HEALTH CHECK) ---
app.get('/api/health', async (req, res) => {
    try {
        const { data, error } = await supabase.from('racers').select('id').limit(1);
        if (error) throw error;
        res.json({ status: 'ok', database: 'connected' });
    } catch (err) {
        res.status(500).json({ status: 'error', database: 'disconnected', error: err.message });
    }
});

// --- 7. ADAT LEKÉRDEZÉSI VÉGPONT (DATA ACCESS) ---
app.get('/api/data', async (req, res) => {
    try {
        const { data: racers, error: rError } = await supabase.from('racers').select('*, members(*)');
        if (rError) throw rError;
        const { data: categories, error: cError } = await supabase.from('categories').select('*');
        if (cError) throw cError;

        const categoriesObj = {};
        (categories || []).forEach(c => categoriesObj[c.key] = c.start_time);

        res.json({ racers: racers || [], categories: categoriesObj, serverNow: Date.now() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 8. VERSENYZŐ REGISZTRÁCIÓ (REGISTRATION) ---
app.post('/api/register', async (req, res) => {
    const { members, category: rawCategory, distance, is_series, email, phone } = req.body;
    const category = normalizeCategoryToSlug(rawCategory);
    
    const validationError = validateRacerData(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    try {
        const bib = await getNextBib(distance, category);
        if (bib === null) return res.status(400).json({ error: 'Nincs több szabad rajtszám!' });

        const racerId = Date.now().toString();
        const { error: rError } = await supabase.from('racers').insert({
            id: racerId, bib, category, distance, 
            is_series: is_series ? 1 : 0, 
            email, phone, status: 'registered'
        });
        if (rError) throw rError;

        if (members && members.length > 0) {
            const membersToInsert = members.map(m => ({
                racer_id: racerId, name: m.name, birth_date: m.birth_date, otproba_id: m.otproba_id
            }));
            const { error: mError } = await supabase.from('members').insert(membersToInsert);
            if (mError) {
                // ROLLBACK: Töröljük a már beszúrt versenyzőt, ha a tagok felvétele sikertelen
                await supabase.from('racers').delete().eq('id', racerId);
                throw mError;
            }
        }
        res.json({ id: racerId, bib, category, distance, status: 'registered' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 9. VERSENY VEZÉRLÉS: RAJT (RACE CONTROL: START) ---
app.post('/api/start-category', authenticateAdmin, async (req, res) => {
    const { categoryName, distance, groupId } = req.body;
    const now = Date.now();
    const startKey = groupId || `${categoryName}_${distance}`;

    try {
        await supabase.from('categories').insert({ key: startKey, start_time: now });
        let query = supabase.from('racers').update({ status: 'running', start_time: now }).eq('status', 'registered');
        query = groupId ? getGroupQuery(query, groupId) : query.eq('category', categoryName).eq('distance', distance);
        const { data: updated } = await query.select();
        res.json({ success: true, start_time: now, count: updated?.length || 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/start-mass', authenticateAdmin, async (req, res) => {
    const now = Date.now();
    const startKey = 'MASS_START_ALL';
    try {
        await supabase.from('categories').insert({ key: startKey, start_time: now });
        const { data } = await supabase.from('racers').update({ status: 'running', start_time: now }).eq('status', 'registered').select();
        res.json({ success: true, start_time: now, count: data?.length || 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/start-distance', authenticateAdmin, async (req, res) => {
    const { distance } = req.body;
    const now = Date.now();
    const startKey = `DISTANCE_${distance}`;
    try {
        await supabase.from('categories').insert({ key: startKey, start_time: now });
        const { data } = await supabase.from('racers').update({ status: 'running', start_time: now }).eq('status', 'registered').eq('distance', distance).select();
        res.json({ success: true, start_time: now, count: data?.length || 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/start-individual', authenticateAdmin, async (req, res) => {
    const { bib } = req.body;
    const now = Date.now();
    try {
        const { data: racer } = await supabase.from('racers').select('*').eq('bib', bib).maybeSingle();
        if (!racer) return res.status(404).json({ error: 'Nincs ilyen rajtszám!' });
        await supabase.from('racers').update({ status: 'running', start_time: now }).eq('id', racer.id);
        res.json({ success: true, bib, start_time: now });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 10. VERSENY VEZÉRLÉS: CÉL ÉS RESET (RACE CONTROL: STOP/RESET) ---
app.post('/api/stop-category', authenticateAdmin, async (req, res) => {
    const { categoryName, distance, groupId } = req.body;
    const now = Date.now();
    const startKey = groupId || `${categoryName}_${distance}`;
    try {
        let query = supabase.from('racers').select('*').eq('status', 'running');
        query = groupId ? getGroupQuery(query, groupId) : query.eq('category', categoryName).eq('distance', distance);
        const { data: runningRacers } = await query;
        
        if (runningRacers && runningRacers.length > 0) {
            await Promise.all(runningRacers.map(r => 
                supabase.from('racers').update({ 
                    status: 'finished', 
                    finish_time: now, 
                    total_time: now - r.start_time 
                }).eq('id', r.id)
            ));
        }
        await supabase.from('categories').delete().eq('key', startKey);
        res.json({ success: true, count: runningRacers?.length || 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/reset-category', authenticateAdmin, async (req, res) => {
    const { categoryName, distance, groupId } = req.body;
    const startKey = groupId || `${categoryName}_${distance}`;
    try {
        await supabase.from('categories').delete().eq('key', startKey);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/stop-racer', authenticateAdmin, async (req, res) => {
    const { bib } = req.body;
    const now = Date.now();
    try {
        const { data: racer } = await supabase.from('racers').select('*').eq('bib', bib).single();
        if (!racer) return res.status(404).json({ error: 'Nincs ilyen rajtszám!' });
        const total_time = now - racer.start_time;
        await supabase.from('racers').update({ status: 'finished', finish_time: now, total_time }).eq('bib', bib);
        const { data: members } = await supabase.from('members').select('name').eq('racer_id', racer.id);
        const names = (members || []).map(m => m.name).join(', ');
        await checkAndStopEmptyBatchTimers();
        res.json({ success: true, racer: { name: names, total_time } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 11. VERSENYZŐ KEZELÉS: CRUD (MANAGEMENT) ---
app.delete('/api/racer/:idOrBib', authenticateAdmin, async (req, res) => {
    const param = req.params.idOrBib;
    try {
        const { data: idData } = await supabase.from('racers').delete().eq('id', String(param)).select();
        if (idData?.length > 0) {
            await checkAndStopEmptyBatchTimers();
            return res.json({ success: true });
        }
        if (/^\d+$/.test(param)) {
            const { data: bibData } = await supabase.from('racers').delete().eq('bib', parseInt(param)).select();
            if (bibData?.length > 0) {
                await checkAndStopEmptyBatchTimers();
                return res.json({ success: true });
            }
        }
        res.status(404).json({ error: 'Nem található!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/racer/:id', authenticateAdmin, async (req, res) => {
    const id = req.params.id;
    const { bib, category, distance, is_series, status, email, phone, members } = req.body;
    try {
        if (bib) {
            const { data: existing } = await supabase.from('racers').select('id').eq('bib', bib).neq('id', id).maybeSingle();
            if (existing) return res.status(400).json({ error: `A #${bib} rajtszám már foglalt egy másik versenyzőnél!` });
        }
        await supabase.from('racers').update({ bib, category, distance, is_series: is_series ? 1 : 0, status, email, phone }).eq('id', id);
        if (members) {
            await supabase.from('members').delete().eq('racer_id', id);
            await supabase.from('members').insert(members.map(m => ({ racer_id: id, ...m })));
        }
        await checkAndStopEmptyBatchTimers();
        
        // Előzmény rögzítése ha rajtszám módosítás történt
        if (req.body.oldBib && bib && req.body.oldBib != bib) {
            addBibHistoryEntry({
                racerName: req.body.racerName || 'Ismeretlen',
                oldBib: req.body.oldBib,
                newBib: bib
            });
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 11.5 RAJTSZÁM ELŐZMÉNYEK (BIB HISTORY API) ---
app.get('/api/bib-history', authenticateAdmin, (req, res) => {
    res.json(getBibHistory());
});

app.delete('/api/bib-history', authenticateAdmin, (req, res) => {
    ensureHistoryDir();
    fs.writeFileSync(HISTORY_FILE, JSON.stringify([]));
    res.json({ success: true });
});

// --- 12. ADATKARBANTARTÁS (MAINTENANCE) ---
app.post('/api/reset', authenticateAdmin, async (req, res) => {
    try {
        await supabase.from('members').delete().not('racer_id', 'is', null);
        await supabase.from('racers').delete().not('id', 'is', null);
        await supabase.from('categories').delete().not('key', 'is', null);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/reset-times', authenticateAdmin, async (req, res) => {
    try {
        await supabase.from('racers').update({ status: 'registered', total_time: null, start_time: null, finish_time: null }).not('id', 'is', null);
        await supabase.from('categories').delete().not('key', 'is', null);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 13. CSV IMPORTÁLÁS (DATA IMPORT) ---
app.post('/api/upload-csv', authenticateAdmin, async (req, res) => {
    const { csvData } = req.body;
    const lines = csvData.trim().split('\n');
    let added = 0;
    try {
        // Párhuzamos feldolgozás indítása minden sorra (kivéve a fejlécet)
        const importPromises = lines.slice(1).map(async (line) => {
            const fields = line.split(';').map(s => s.trim());
            if (fields.length >= 8) {
                const category = normalizeCategoryToSlug(fields[7]);
                const dist = (fields[12] || '11km').replace(/\s+/g, '').toLowerCase();
                let bib = parseInt(fields[0]);
                if (isNaN(bib)) bib = await getNextBib(dist, category);
                
                if (bib) {
                    const { data: existing } = await supabase.from('racers')
                        .select('id')
                        .eq('bib', bib)
                        .eq('distance', dist)
                        .maybeSingle();

                    if (existing) return 0;

                    const racerId = Date.now().toString() + "_" + Math.floor(Math.random() * 1000);
                    const { error: rError } = await supabase.from('racers').insert({ 
                        id: racerId, bib, category, distance: dist, 
                        email: fields[5] || 'csv@imported.hu', 
                        phone: fields[6] || '0000', 
                        status: 'registered' 
                    });
                    
                    if (!rError) {
                        const members = [];
                        for(let j=0; j<4; j++) if(fields[j+1]) members.push({ racer_id: racerId, name: fields[j+1], birth_date: fields[j+8] || '', otproba_id: fields[j+13] || '' });
                        
                        const { error: mError } = await supabase.from('members').insert(members);
                        if (mError) {
                            await supabase.from('racers').delete().eq('id', racerId);
                            return 0;
                        }
                        return 1; // Sikerült hozzáadni
                    }
                }
            }
            return 0;
        });

        const results = await Promise.all(importPromises);
        const added = results.reduce((acc, curr) => acc + curr, 0);
        
        res.json({ success: true, importedCount: added });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`DragonWave Server running at http://localhost:${PORT}`);
});
