const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const supabase = require('./database'); // This is now the Supabase client

const app = express();
const PORT = process.env.PORT || 3001;

// --- Overflow Protection: Rate Limiting ---
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 200; // 200 requests per window

function rateLimiter(req, res, next) {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const now = Date.now();

    // Whitelist localhost for development/testing
    if (ip === '::1' || ip === '127.0.0.1' || ip.includes('localhost')) {
        return next();
    }
    
    if (!requestCounts.has(ip)) {
        requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return next();
    }

    const record = requestCounts.get(ip);
    if (now > record.resetTime) {
        record.count = 1;
        record.resetTime = now + RATE_LIMIT_WINDOW;
        return next();
    }

    record.count++;
    if (record.count > MAX_REQUESTS) {
        console.warn(`[RATE-LIMIT] Blokkolt IP: ${ip} (${record.count} kérés)`);
        return res.status(429).json({ error: 'Túl sok kérés! Kérlek várj 15 percet.' });
    }
    next();
}

// --- Overflow Protection: Input Validation Helpers ---
function validateRacerData(data) {
    const { members, email, phone, category, distance } = data;
    
    if (email && email.length > 150) return "Az email cím túl hosszú!";
    if (phone && phone.length > 30) return "A telefonszám túl hosszú!";
    if (category && category.length > 100) return "A kategória név túl hosszú!";
    if (distance && distance.length > 20) return "A táv megnevezése túl hosszú!";
    
    if (members && Array.isArray(members)) {
        if (members.length > 20) return "Túl sok csapattag!";
        for (const m of members) {
            if (m.name && m.name.length > 100) return "A név túl hosszú (max 100 karakter)!";
            if (m.otproba_id && m.otproba_id.length > 20) return "Az Ötpróba ID túl hosszú!";
        }
    }
    return null;
}

// Middleware
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'dragon2026';

const CATEGORY_GROUPS = {
    'kajak': [
        'versenykajak_noi_1', 'versenykajak_ferfi_1', 
        'turakajak_noi_1', 'turakajak_ferfi_1', 'turakajak_2_nyitott',
        'tengeri_kajak_noi_1', 'tengeri_kajak_ferfi_1',
        'surfski_noi', 'surfski_ferfi'
    ],
    'kenu': [
        'kenu_noi_1', 'kenu_ferfi_1', 'kenu_2_ferfi', 'kenu_2_vegyes',
        'kenu_3_nyitott', 'kenu_4_nyitott',
        'outrigger_noi_1', 'outrigger_ferfi_1', 'outrigger_2_nyitott'
    ],
    'sup': [
        'sup_noi_1_merev_39_alatt', 'sup_noi_1_merev_39_felett',
        'sup_ferfi_1_merev_39_alatt', 'sup_ferfi_1_merev_39_felett',
        'sup_noi_1_felfujhato_39_alatt', 'sup_noi_1_felfujhato_39_felett',
        'sup_ferfi_1_felfujhato_39_alatt', 'sup_ferfi_1_felfujhato_39_felett'
    ],
    'sarkanyhajo': ['sarkanyhajo_otproba']
};

const corsOptions = {
    origin: '*', // In production, replace with your frontend URL
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));
app.use(rateLimiter); // Apply rate limiting to all requests

// Auth Middleware
function authenticateAdmin(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        console.warn(`UNAUTHORIZED: Nincs hitelesítés az endpointon: ${req.method} ${req.url}`);
        return res.status(401).json({ error: 'Nincs hitelesítés!' });
    }
    
    const password = authHeader.replace('Bearer ', '');
    if (password === ADMIN_PASSWORD) {
        next();
    } else {
        console.warn(`FORBIDDEN: Hibás admin jelszó próbálkozás: ${req.method} ${req.url}`);
        res.status(403).json({ error: 'Hibás admin jelszó!' });
    }
}

// --- Authentication ---
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.json({ success: true, message: 'Sikeres belépés!' });
    } else {
        res.status(401).json({ error: 'Hibás admin jelszó!' });
    }
});

// --- Health Check ---
app.get('/api/health', async (req, res) => {
    try {
        const { data, error } = await supabase.from('racers').select('id').limit(1);
        if (error) throw error;
        res.json({ status: 'ok', database: 'connected' });
    } catch (err) {
        console.error("Health check failed:", err);
        res.status(500).json({ status: 'error', database: 'disconnected', error: err.message });
    }
});

// --- Bib Logic ---
async function getNextBib(distance, category) {
    let min = 1, max = 999;
    const cat = category.toLowerCase();

    if (cat.includes('kajak') || cat.includes('surfski')) {
        min = 1; max = 49;
    } else if (cat.includes('kenu') || cat.includes('outrigger')) {
        min = 50; max = 99;
    } else if (cat.includes('sup')) {
        min = 100; max = 199;
    } else if (cat.includes('sarkanyhajo')) {
        min = 200; max = 999;
    }

    const { data: results, error } = await supabase
        .from('racers')
        .select('bib')
        .gte('bib', min)
        .lte('bib', max);

    if (error) {
        console.error("Hiba a rajtszám lekérésekor:", error);
        throw error;
    }

    const usedBibs = (results || []).map(r => r.bib);
    let bib = min;
    while (usedBibs.includes(bib) && bib <= max) {
        bib++;
    }
    return bib <= max ? bib : null;
}

// --- Group Logic Helpers ---
function getGroupQuery(query, batchKey) {
    console.log(`[getGroupQuery] batchKey: ${batchKey}`);
    // 1. Tömegrajt
    if (batchKey === 'MASS_START_ALL') return query;
    
    // 2. Távolság Rajt
    if (batchKey.startsWith('DISTANCE_')) {
        const dist = batchKey.split('_')[1];
        return query.eq('distance', dist);
    }



    // 3. Predefined Groups
    if (batchKey === 'kajak_hosszu') return query.or('category.ilike.%kajak%,category.ilike.%surfski%').eq('distance', '22km');
    if (batchKey === 'kajak_rovid') return query.or('category.ilike.%kajak%,category.ilike.%surfski%').eq('distance', '11km');
    if (batchKey === 'kenu_hosszu') return query.or('category.ilike.%kenu%,category.ilike.%outrigger%').eq('distance', '22km');
    if (batchKey === 'kenu_rovid') return query.or('category.ilike.%kenu%,category.ilike.%outrigger%').eq('distance', '11km');
    if (batchKey === 'sup_4km') return query.like('category', '%sup%').eq('distance', '4km');
    if (batchKey === 'sarkanyhajo_11km') return query.or('category.ilike.%sárkányhajó%,category.ilike.%sarkanyhajo%').eq('distance', '11km');
    
    // 4. Individual Category/Distance Pair (Slug or Name based)
    if (batchKey.includes('_')) {
        const parts = batchKey.split('_');
        const distance = parts.pop();
        const categorySlug = parts.join('_');
        console.log(`[getGroupQuery] Split into categorySlug: ${categorySlug}, distance: ${distance}`);
        return query.eq('category', categorySlug).eq('distance', distance);
    }

    console.warn(`[getGroupQuery] No matching group for batchKey: ${batchKey}`);
    return query;
}
async function checkAndStopEmptyBatchTimers() {
    try {
        const { data: activeTimers, error: tError } = await supabase.from('categories').select('*');
        if (tError) throw tError;
        if (!activeTimers || activeTimers.length === 0) return;

        console.log(`[TimerCheck] Aktív futamok: ${activeTimers.map(t => t.key).join(', ')}`);

        for (const timer of activeTimers) {
            const batchKey = timer.key;
            console.log(`[TimerCheck] Ellenőrzés: ${batchKey}`);
            
            // Build query to find ANY racer in this batch that is STILL RUNNING or REGISTERED
            let query = supabase
                .from('racers')
                .select('id, status', { count: 'exact' });
            
            query = getGroupQuery(query, batchKey);

            const { data: participants, count, error: qError } = await query;
            
            if (qError) {
                console.error(`[TimerCheck] Hiba a(z) ${batchKey} lekérdezésekor:`, qError);
                continue;
            }

            const runningCount = (participants || []).filter(p => p.status === 'running').length;
            const registeredCount = (participants || []).filter(p => p.status === 'registered').length;
            const finishedCount = (participants || []).filter(p => p.status === 'finished').length;

            console.log(`[TimerCheck] Batch: ${batchKey} -> Összes: ${count}, Fut: ${runningCount}, Reg: ${registeredCount}, Beért: ${finishedCount}`);

            // Stop if there are no more racers who need to finish (0 running AND 0 registered)
            // AND there was at least someone in this batch who finished (finishedCount > 0)
            if (runningCount === 0 && registeredCount === 0 && finishedCount > 0) {
                console.log(`[AUTO-STOP] >>> LEÁLLÍTÁS: ${batchKey} (mindenki beért).`);
                const { error: delError } = await supabase.from('categories').delete().eq('key', batchKey);
                if (delError) console.error(`[AUTO-STOP] Törlési hiba (${batchKey}):`, delError);
            } else if (count === 0) {
                console.log(`[TimerCheck] ${batchKey} üres, nem állítjuk le.`);
            }
        }
    } catch (err) {
        console.error("[TimerCheck] Kritikus hiba:", err);
    }
}

// --- API Routes ---

// 1. Get All Data
app.get('/api/data', async (req, res) => {
    try {
        // Get racers with their members in one query!
        const { data: racers, error: rError } = await supabase
            .from('racers')
            .select('*, members(*)');

        if (rError) throw rError;

        // Get categories
        const { data: categories, error: cError } = await supabase
            .from('categories')
            .select('*');

        if (cError) throw cError;

        const categoriesObj = {};
        (categories || []).forEach(c => categoriesObj[c.key] = c.start_time);

        res.json({ 
            racers: racers || [], 
            categories: categoriesObj,
            serverNow: Date.now() 
        });
    } catch (err) {
        console.error("Error in /api/data:", err);
        res.status(500).json({ error: err.message });
    }
});

// 2. Register Racer
app.post('/api/register', async (req, res) => {
    const { members, category: rawCategory, distance, is_series, email, phone } = req.body;
    const category = normalizeCategoryToSlug(rawCategory); // Ensure we save slug
    console.log("--- ÚJ REGISZTRÁCIÓ ---");
    
    // Validation
    const validationError = validateRacerData(req.body);
    if (validationError) {
        console.warn(`[VALIDATION-ERROR] ${validationError}`);
        return res.status(400).json({ error: validationError });
    }

    console.log("Adatok:", { category, distance, is_series, email, phone, memberCount: members ? members.length : 0 });

    try {
        const bib = await getNextBib(distance, category);
        if (bib === null) {
            console.error("Hiba: Nincs szabad rajtszám.");
            return res.status(400).json({ error: 'Nincs több szabad rajtszám ebben a kategóriában!' });
        }
        console.log("Kiosztott rajtszám:", bib);

        const racerId = Date.now().toString();

        // Manual Insert (racer + members)
        const { error: rError } = await supabase
            .from('racers')
            .insert({
                id: racerId,
                bib: bib,
                category: category,
                distance: distance,
                is_series: is_series ? 1 : 0,
                email: email,
                phone: phone,
                status: 'registered'
            });

        if (rError) {
            console.error("Supabase Racer Insertion Error:", rError);
            if (rError.code === 'PGRST204') {
                return res.status(500).json({ 
                    error: 'Adatbázis séma hiba: Az email vagy phone oszlop hiányzik! Kérlek futtasd a SQL javítást.',
                    details: rError.message 
                });
            }
            throw rError;
        }

        if (members && members.length > 0) {
            const membersToInsert = members.map(m => ({
                racer_id: racerId,
                name: m.name,
                birth_date: m.birth_date,
                otproba_id: m.otproba_id
            }));
            const { error: mError } = await supabase.from('members').insert(membersToInsert);
            if (mError) {
                console.error("Supabase Members Insertion Error:", mError);
                throw mError;
            }
        }

        console.log(`SIKER: Versenyző regisztrálva: Rajtszám #${bib}`);
        res.json({ id: racerId, bib, category, distance, status: 'registered' });
    } catch (err) {
        console.error("KRITIKUS HIBA a regisztráció során:", err);
        res.status(500).json({ error: err.message || 'Szerveroldali hiba történt.' });
    }
});

// 3. Start Category
app.post('/api/start-category', authenticateAdmin, async (req, res) => {
    const { categoryName, distance, groupId } = req.body;
    const now = Date.now();
    let startKey = groupId || `${categoryName}_${distance}`;
    
    // Safety: ensure it's ASCII if possible, but for categories we keep them as is
    // as they come from the category list
    console.log(`[START-CATEGORY] Req: ${categoryName}, ${distance}, ${groupId} -> Key: ${startKey}`);

    try {
        // ...
        const { data: existing } = await supabase
            .from('categories')
            .select('*')
            .eq('key', startKey)
            .single();

        if (existing) return res.status(400).json({ error: 'Már elindult ez a futam!' });

        // Insert category
        const { error: cError } = await supabase
            .from('categories')
            .insert({ key: startKey, start_time: now });

        if (cError) throw cError;

        // Build racer update query
        let query = supabase
            .from('racers')
            .update({ status: 'running', start_time: now })
            .eq('status', 'registered');

        if (groupId) {
            query = getGroupQuery(query, groupId);
        } else {
            query = query.eq('category', categoryName).eq('distance', distance);
        }

        const { data: updated, error: uError } = await query.select();

        if (uError) throw uError;
        res.json({ success: true, start_time: now, count: updated?.length || 0 });
    } catch (err) {
        console.error("Error in /api/start-category:", err);
        res.status(500).json({ error: err.message });
    }
});

// ... (start-individual omitted)

// 3c. Start Mass (Everyone)
app.post('/api/start-mass', authenticateAdmin, async (req, res) => {
    const now = Date.now();
    const startKey = 'MASS_START_ALL';

    try {
        await supabase.from('categories').upsert({ key: startKey, start_time: now });

        const { data, error } = await supabase
            .from('racers')
            .update({ status: 'running', start_time: now })
            .eq('status', 'registered')
            .select();

        if (error) throw error;
        res.json({ success: true, start_time: now, count: data?.length || 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3d. Start Distance (Specific Distance)
app.post('/api/start-distance', authenticateAdmin, async (req, res) => {
    const { distance } = req.body;
    const now = Date.now();
    const startKey = `DISTANCE_${distance}`;

    if (!distance) return res.status(400).json({ error: 'Távolság megadása kötelező!' });

    try {
        await supabase.from('categories').upsert({ key: startKey, start_time: now });

        const { data, error } = await supabase
            .from('racers')
            .update({ status: 'running', start_time: now })
            .eq('status', 'registered')
            .eq('distance', distance)
            .select();

        if (error) throw error;
        res.json({ success: true, start_time: now, count: data?.length || 0, distance });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// 4. Stop Category
app.post('/api/stop-category', authenticateAdmin, async (req, res) => {
    const { categoryName, distance, groupId } = req.body;
    const now = Date.now();
    const startKey = groupId || `${categoryName}_${distance}`;

    try {
        const { data: activeBatch } = await supabase
            .from('categories')
            .select('*')
            .eq('key', startKey)
            .single();

        if (!activeBatch) {
            return res.status(400).json({ error: `Ez a futam (${startKey}) még nem indult el!` });
        }

        // We need to calculate totalTime. Since SQL update can't easily do (now - startTime) across rows without complex logic in Supabase JS, 
        // we might need to fetch the racers first OR use an RPC. 
        // For simplicity, let's fetch IDs and startTimes of running racers in this batch.

        let query = supabase
            .from('racers')
            .select('*')
            .eq('status', 'running');

        if (groupId) {
            query = getGroupQuery(query, groupId);
        } else {
            query = query.eq('category', categoryName).eq('distance', distance);
        }

        const { data: runningRacers, error: fError } = await query;
        if (fError) throw fError;

        if (runningRacers && runningRacers.length > 0) {
            const updates = runningRacers.map(racer => ({
                ...racer,
                status: 'finished',
                finish_time: now,
                total_time: now - racer.start_time
            }));

            const { error: uError } = await supabase
                .from('racers')
                .upsert(updates);
            
            if (uError) throw uError;
        }


        // Delete from categories
        await supabase.from('categories').delete().eq('key', startKey);

        const stopCount = runningRacers?.length || 0;
        console.log(`STOP: ${startKey} leállítva, ${stopCount} versenyző érkezett be célba.`);
        res.json({ success: true, finish_time: now, count: stopCount });
    } catch (err) {
        console.error("Error in /api/stop-category:", err);
        res.status(500).json({ error: err.message });
    }
});

// 4b. Reset Category (Delete timer without finishing racers)
app.post('/api/reset-category', authenticateAdmin, async (req, res) => {
    const { categoryName, distance, groupId } = req.body;
    const startKey = groupId || `${categoryName}_${distance}`;

    try {
        await supabase.from('categories').delete().eq('key', startKey);
        console.log(`RESET: ${startKey} időmérője törölve.`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Stop Racer (Manual Bib)
app.post('/api/stop-racer', authenticateAdmin, async (req, res) => {
    const { bib } = req.body;
    const now = Date.now();

    try {
        const { data: racer, error: fError } = await supabase
            .from('racers')
            .select('*')
            .eq('bib', bib)
            .single();

        if (!racer) return res.status(404).json({ error: 'Nincs ilyen rajtszámú versenyző!' });
        if (racer.status !== 'running') return res.status(400).json({ error: 'Ez a versenyző nincs versenyben!' });

        const total_time = now - racer.start_time;
        const { error: uError } = await supabase
            .from('racers')
            .update({ status: 'finished', finish_time: now, total_time })
            .eq('bib', bib);

        if (uError) throw uError;

        const { data: members } = await supabase
            .from('members')
            .select('name')
            .eq('racer_id', racer.id);

        const names = (members || []).map(m => m.name).join(', ');
        
        // Check if timers should be stopped
        await checkAndStopEmptyBatchTimers();
        
        res.json({ success: true, racer: { name: names, total_time } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. Delete Racer (Robust Version)
app.delete('/api/racer/:idOrBib', authenticateAdmin, async (req, res) => {
    const param = req.params.idOrBib;
    console.log(`[DELETE] Request for: ${param}`);
    
    try {
        // 1. Primary Attempt: Delete by TEXT ID
        // We use select() to verify if it worked
        const { data: idData, error: idError } = await supabase
            .from('racers')
            .delete()
            .eq('id', String(param))
            .select();

        if (idError) {
            console.warn("[DELETE] ID attempt failed:", idError.message);
        } else if (idData && idData.length > 0) {
            console.log(`[DELETE] Success by ID: ${param}`);
            await checkAndStopEmptyBatchTimers();
            return res.json({ success: true, method: 'id', count: idData.length });
        }

        // 2. Secondary Attempt: Delete by INTEGER Bib
        // Only if numeric AND within Postgres INTEGER range (max ~2.1 billion)
        if (/^\d+$/.test(param)) {
            const bibNum = parseInt(param, 10);
            if (bibNum > 0 && bibNum < 2147483647) {
                console.log(`[DELETE] ID not found, trying Bib: ${bibNum}`);
                const { data: bibData, error: bibError } = await supabase
                    .from('racers')
                    .delete()
                    .eq('bib', bibNum)
                    .select();
                
                if (bibError) {
                    console.error("[DELETE] Bib error:", bibError.message);
                } else if (bibData && bibData.length > 0) {
                    console.log(`[DELETE] Success by Bib: ${bibNum}`);
                    await checkAndStopEmptyBatchTimers();
                    return res.json({ success: true, method: 'bib', count: bibData.length });
                }
            }
        }

        // 3. Not found anywhere
        console.warn(`[DELETE] Not found: ${param}`);
        res.status(404).json({ error: 'Versenyző nem található (Rajtszám/ID hiba).' });

    } catch (err) {
        console.error("[DELETE] Critical failure:", err);
        res.status(500).json({ error: err.message });
    }
});

// 7. Update Racer
app.put('/api/racer/:id', authenticateAdmin, async (req, res) => {
    const id = req.params.id;
    const { bib, category, distance, is_series, status, email, phone, members } = req.body;
    console.log(`[UPDATE] Request for racer ID: ${id}`);

    // Validation
    const validationError = validateRacerData(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    try {
        // 1. Update Racer Table
        const { error: rError } = await supabase
            .from('racers')
            .update({
                bib: bib,
                category: category,
                distance: distance,
                is_series: is_series ? 1 : 0,
                status: status,
                email: email,
                phone: phone
            })
            .eq('id', id);

        if (rError) {
            console.error("[UPDATE] Racer update error:", rError);
            throw rError;
        }

        // 2. Update Members (Delete & Re-insert is safest for variable team sizes)
        if (members && Array.isArray(members)) {
            // Delete existing
            const { error: dError } = await supabase
                .from('members')
                .delete()
                .eq('racer_id', id);
            
            if (dError) {
                console.error("[UPDATE] Member deletion error:", dError);
                throw dError;
            }

            // Insert new
            const membersToInsert = members.map(m => ({
                racer_id: id,
                name: m.name,
                birth_date: m.birth_date,
                otproba_id: m.otproba_id
            }));

            if (membersToInsert.length > 0) {
                const { error: iError } = await supabase.from('members').insert(membersToInsert);
                if (iError) {
                    console.error("[UPDATE] Member insertion error:", iError);
                    throw iError;
                }
            }
        }

        console.log(`[UPDATE] Success for racer ID: ${id}`);
        await checkAndStopEmptyBatchTimers();
        res.json({ success: true });
    } catch (err) {
        console.error("[UPDATE] Critical failure:", err);
        res.status(500).json({ error: err.message });
    }
});

// 7. Reset All Data
app.post('/api/reset', authenticateAdmin, async (req, res) => {
    try {
        // In Supabase, we delete all rows. Foreign keys handle memberships.
        await supabase.from('members').delete().not('id', 'is', null);
        await supabase.from('racers').delete().not('id', 'is', null);
        await supabase.from('categories').delete().not('key', 'is', null);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 8. Reset Times Only
app.post('/api/reset-times', authenticateAdmin, async (req, res) => {
    try {
        // Reset all racers to 'registered' and clear total_time
        const { error: rError } = await supabase
            .from('racers')
            .update({ status: 'registered', total_time: null })
            .not('id', 'is', null);

        // Clear all category start times
        const { error: cError } = await supabase
            .from('categories')
            .delete()
            .not('key', 'is', null);

        if (rError || cError) throw new Error("Adatbázis hiba az idők törlésekor.");

        res.json({ success: true });
    } catch (err) {
        console.error("[RESET-TIMES] Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Helper for CSV normalization
function normalizeCategoryToSlug(categoryName) {
    if (!categoryName) return '';
    const name = categoryName.toLowerCase();
    if (name.includes('versenykajak') && name.includes('női')) return 'versenykajak_noi_1';
    if (name.includes('versenykajak') && name.includes('férfi')) return 'versenykajak_ferfi_1';
    if (name.includes('túrakajak') && name.includes('női') && name.includes('1')) return 'turakajak_noi_1';
    if (name.includes('túrakajak') && name.includes('férfi') && name.includes('1')) return 'turakajak_ferfi_1';
    if (name.includes('túrakajak') && name.includes('2')) return 'turakajak_2_nyitott';
    if (name.includes('tengeri') && name.includes('női')) return 'tengeri_kajak_noi_1';
    if (name.includes('tengeri') && name.includes('férfi')) return 'tengeri_kajak_ferfi_1';
    if (name.includes('surfski') && name.includes('női')) return 'surfski_noi';
    if (name.includes('surfski') && name.includes('férfi')) return 'surfski_ferfi';
    if (name.includes('kenu') && name.includes('női') && name.includes('1')) return 'kenu_noi_1';
    if (name.includes('kenu') && name.includes('férfi') && name.includes('1')) return 'kenu_ferfi_1';
    if (name.includes('kenu') && name.includes('2') && name.includes('férfi')) return 'kenu_2_ferfi';
    if (name.includes('kenu') && name.includes('2') && name.includes('vegyes')) return 'kenu_2_vegyes';
    if (name.includes('kenu') && name.includes('3')) return 'kenu_3_nyitott';
    if (name.includes('kenu') && name.includes('4')) return 'kenu_4_nyitott';
    if (name.includes('outrigger') && name.includes('női')) return 'outrigger_noi_1';
    if (name.includes('outrigger') && name.includes('férfi')) return 'outrigger_ferfi_1';
    if (name.includes('outrigger') && name.includes('2')) return 'outrigger_2_nyitott';
    if (name.includes('sup') && name.includes('női') && name.includes('merev') && name.includes('alatt')) return 'sup_noi_1_merev_39_alatt';
    if (name.includes('sup') && name.includes('női') && name.includes('merev') && (name.includes('felett') || name.includes('fölött'))) return 'sup_noi_1_merev_39_felett';
    if (name.includes('sup') && name.includes('férfi') && name.includes('merev') && name.includes('alatt')) return 'sup_ferfi_1_merev_39_alatt';
    if (name.includes('sup') && name.includes('férfi') && name.includes('merev') && (name.includes('felett') || name.includes('fölött'))) return 'sup_ferfi_1_merev_39_felett';
    if (name.includes('sup') && name.includes('női') && name.includes('felfújható') && name.includes('alatt')) return 'sup_noi_1_felfujhato_39_alatt';
    if (name.includes('sup') && name.includes('női') && name.includes('felfújható') && (name.includes('felett') || name.includes('fölött'))) return 'sup_noi_1_felfujhato_39_felett';
    if (name.includes('sup') && name.includes('férfi') && name.includes('felfújható') && name.includes('alatt')) return 'sup_ferfi_1_felfujhato_39_alatt';
    if (name.includes('sup') && name.includes('férfi') && name.includes('felfújható') && (name.includes('felett') || name.includes('fölött'))) return 'sup_ferfi_1_felfujhato_39_felett';
    if (name.includes('sárkányhajó') || name.includes('sarkanyhajo')) return 'sarkanyhajo_otproba';
    return categoryName; // Fallback
}

// 8. Upload CSV (Format: srsz;Név 1..4;Kategória;Szül.idő 1..4;Táv;Ötpróba 1..4)
app.post('/api/upload-csv', authenticateAdmin, async (req, res) => {
    const { csvData } = req.body;
    if (!csvData || csvData.length > 500000) { // ~500KB limit for CSV text
        return res.status(400).json({ error: 'A CSV fájl túl nagy vagy üres!' });
    }

    const lines = csvData.trim().split('\n');
    if (lines.length > 500) {
        return res.status(400).json({ error: 'Egyszerre maximum 500 sort tölthetsz fel!' });
    }

    console.log(`[CSV-UPLOAD] Összes sor az adatokban: ${lines.length}`);
    let added = 0;

    try {
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) {
                console.log(`[CSV-UPLOAD] Üres sor átugorva a(z) ${i}. sorban.`);
                continue;
            }
 
            const fields = line.split(';').map(s => s.trim());
            console.log(`[CSV-UPLOAD] ${i}. sor feldolgozása: ${fields.length} mező.`);

            if (fields.length >= 8) { 
                const csvBib = fields[0];
                const rawCategory = fields[7] ? fields[7].trim() : '';
                const category = normalizeCategoryToSlug(rawCategory);
                const distanceField = fields[12] ? fields[12].trim() : '';
                const emailField = fields[5] ? fields[5].trim() : 'csv@imported.hu';
                const phoneField = fields[6] ? fields[6].trim() : '00000000';
 
                const names = [fields[1], fields[2], fields[3], fields[4]];
                
                if (!names[0] || names[0].trim() === '') {
                    console.warn(`[CSV-UPLOAD] HIBA: Hiányzó név az ${i}. sorban: "${line}"`);
                    continue;
                }
                
                if (!category) {
                    console.warn(`[CSV-UPLOAD] HIBA: Ismeretlen kategória az ${i}. sorban: "${rawCategory}"`);
                    continue;
                }
 
                const birth_dates = [fields[8], fields[9], fields[10], fields[11]];
                const otproba_ids = [fields[13], fields[14], fields[15], fields[16]];
 
                let dist = (distanceField || '11km').replace(/\s+/g, '').toLowerCase();
                if (!dist.endsWith('km')) dist += 'km';

                let bib = parseInt(csvBib);
                if (isNaN(bib)) {
                    bib = await getNextBib(dist, category);
                    console.log(`[CSV-UPLOAD] Rajtszám generálva: ${bib}`);
                }
 
                if (bib) {
                    const racerId = Date.now().toString() + "_" + Math.floor(Math.random() * 1000);
                    const membersArr = [];
                    for (let j = 0; j < 4; j++) {
                        const name = names[j];
                        if (name) {
                            let oid = otproba_ids[j] ? otproba_ids[j].trim() : '';
                            if (oid && /^\d{6}$/.test(oid)) oid = '5P' + oid;
                            membersArr.push({
                                name: name,
                                birth_date: birth_dates[j] || '',
                                otproba_id: oid
                            });
                        }
                    }

                    console.log(`[CSV-UPLOAD] Beszúrás: #${bib}, Név: ${membersArr[0].name}, Kategória: ${category}`);

                    const { error: rError } = await supabase.from('racers').insert({
                        id: racerId,
                        bib: bib,
                        category: category,
                        distance: dist,
                        is_series: 0,
                        email: emailField,
                        phone: phoneField,
                        status: 'registered'
                    });

                    if (rError) {
                        console.error(`[CSV-UPLOAD] HIBA a racers beszúrásakor (#${bib}):`, rError.message);
                        if (rError.code === 'PGRST204') {
                            return res.status(500).json({ 
                                error: 'CSV Import hiba: Az email vagy phone oszlop hiányzik az adatbázisból!',
                                details: rError.message 
                            });
                        }
                        continue;
                    }

                    if (membersArr.length > 0) {
                        const membersToInsert = membersArr.map(m => ({
                            racer_id: racerId,
                            name: m.name,
                            birth_date: m.birth_date,
                            otproba_id: m.otproba_id
                        }));
                        const { error: mError } = await supabase.from('members').insert(membersToInsert);
                        if (mError) {
                            console.error(`[CSV-UPLOAD] HIBA a tagok beszúrásakor (#${bib}):`, mError.message);
                        }
                    }

                    added++;
                } else {
                    console.warn(`[CSV-UPLOAD] HIBA: Nem sikerült rajtszámot kiosztani az ${i}. sorhoz.`);
                }
            } else {
                console.warn(`[CSV-UPLOAD] HIBA: Túl kevés mező (${fields.length}) az ${i}. sorban: "${line}"`);
            }
        }
        
        res.json({ success: true, importedCount: added });
    } catch (err) {
        console.error("CSV Upload error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`DragonWave Supabase Server running at http://localhost:${PORT}`);
});
