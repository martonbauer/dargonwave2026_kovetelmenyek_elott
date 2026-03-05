const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const supabase = require('./database'); // This is now the Supabase client

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

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
        (categories || []).forEach(c => categoriesObj[c.key] = c.startTime);

        res.json({ racers: racers || [], categories: categoriesObj });
    } catch (err) {
        console.error("Error in /api/data:", err);
        res.status(500).json({ error: err.message });
    }
});

// 2. Register Racer
app.post('/api/register', async (req, res) => {
    const { members, category, distance } = req.body;

    try {
        const bib = await getNextBib(distance, category);
        if (bib === null) {
            return res.status(400).json({ error: 'Nincs több szabad rajtszám ebben a kategóriában!' });
        }

        const racerId = Date.now().toString();

        // Insert Racer
        const { error: rError } = await supabase
            .from('racers')
            .insert({
                id: racerId,
                bib,
                category,
                distance,
                isSeries: 0,
                status: 'registered'
            });

        if (rError) throw rError;

        // Insert Members
        if (members && members.length > 0) {
            const memberData = members.map(m => ({
                racerId: racerId,
                name: m.name,
                birthDate: m.birthDate,
                otprobaId: m.otprobaId
            }));

            const { error: mError } = await supabase
                .from('members')
                .insert(memberData);

            if (mError) throw mError;
        }

        console.log(`Versenyző regisztrálva: Rajtszám #${bib}, kategória: ${category}`);
        res.json({ id: racerId, bib, category, distance, status: 'registered' });
    } catch (err) {
        console.error("Error in /api/register:", err);
        res.status(500).json({ error: err.message });
    }
});

// 3. Start Category
app.post('/api/start-category', async (req, res) => {
    const { categoryName, distance, groupId } = req.body;
    const now = Date.now();
    const startKey = groupId || `${categoryName}_${distance}`;

    try {
        // Check if already started
        const { data: existing } = await supabase
            .from('categories')
            .select('*')
            .eq('key', startKey)
            .single();

        if (existing) return res.status(400).json({ error: 'Már elindult ez a futam!' });

        // Insert category
        const { error: cError } = await supabase
            .from('categories')
            .insert({ key: startKey, startTime: now });

        if (cError) throw cError;

        // Build racer update query
        let query = supabase
            .from('racers')
            .update({ status: 'running', startTime: now })
            .eq('status', 'registered');

        if (groupId) {
            if (groupId === 'kajak_hosszu') query = query.or('category.ilike.%kajak%,category.ilike.%surfski%').eq('distance', '22km');
            else if (groupId === 'kajak_rovid') query = query.or('category.ilike.%kajak%,category.ilike.%surfski%').eq('distance', '11km');
            else if (groupId === 'kenu_hosszu') query = query.or('category.ilike.%kenu%,category.ilike.%outrigger%').eq('distance', '22km');
            else if (groupId === 'kenu_rovid') query = query.or('category.ilike.%kenu%,category.ilike.%outrigger%').eq('distance', '11km');
            else if (groupId === 'sup_4km') query = query.ilike('category', '%sup%').eq('distance', '4km');
            else if (groupId === 'sarkanyhajo_11km') query = query.ilike('category', '%sarkanyhajo%').eq('distance', '11km');
        } else {
            query = query.eq('category', categoryName).eq('distance', distance);
        }

        const { data: updated, error: uError, count } = await query.select();

        if (uError) throw uError;

        console.log(`START: ${startKey} elindult, ${updated?.length || 0} versenyző érintett.`);
        res.json({ success: true, startTime: now, count: updated?.length || 0 });
    } catch (err) {
        console.error("Error in /api/start-category:", err);
        res.status(500).json({ error: err.message });
    }
});

// 4. Stop Category
app.post('/api/stop-category', async (req, res) => {
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
            .select('id, startTime')
            .eq('status', 'running');

        if (groupId) {
            if (groupId === 'kajak_hosszu') query = query.or('category.ilike.%kajak%,category.ilike.%surfski%').eq('distance', '22km');
            else if (groupId === 'kajak_rovid') query = query.or('category.ilike.%kajak%,category.ilike.%surfski%').eq('distance', '11km');
            else if (groupId === 'kenu_hosszu') query = query.or('category.ilike.%kenu%,category.ilike.%outrigger%').eq('distance', '22km');
            else if (groupId === 'kenu_rovid') query = query.or('category.ilike.%kenu%,category.ilike.%outrigger%').eq('distance', '11km');
            else if (groupId === 'sup_4km') query = query.ilike('category', '%sup%').eq('distance', '4km');
            else if (groupId === 'sarkanyhajo_11km') query = query.ilike('category', '%sarkanyhajo%').eq('distance', '11km');
        } else {
            query = query.eq('category', categoryName).eq('distance', distance);
        }

        const { data: runningRacers, error: fError } = await query;
        if (fError) throw fError;

        let stopCount = 0;
        if (runningRacers && runningRacers.length > 0) {
            // Update each racer (Supabase JS doesn't support expressions like totalTime = now - startTime in bulk update)
            for (const racer of runningRacers) {
                const totalTime = now - racer.startTime;
                await supabase
                    .from('racers')
                    .update({ status: 'finished', finishTime: now, totalTime })
                    .eq('id', racer.id);
                stopCount++;
            }
        }

        // Delete from categories
        await supabase.from('categories').delete().eq('key', startKey);

        console.log(`STOP: ${startKey} leállítva, ${stopCount} versenyző érkezett be célba.`);
        res.json({ success: true, finishTime: now, count: stopCount });
    } catch (err) {
        console.error("Error in /api/stop-category:", err);
        res.status(500).json({ error: err.message });
    }
});

// 4b. Reset Category (Delete timer without finishing racers)
app.post('/api/reset-category', async (req, res) => {
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
app.post('/api/stop-racer', async (req, res) => {
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

        const totalTime = now - racer.startTime;
        const { error: uError } = await supabase
            .from('racers')
            .update({ status: 'finished', finishTime: now, totalTime })
            .eq('bib', bib);

        if (uError) throw uError;

        const { data: members } = await supabase
            .from('members')
            .select('name')
            .eq('racerId', racer.id);

        const names = (members || []).map(m => m.name).join(', ');
        res.json({ success: true, racer: { name: names, totalTime } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. Delete Racer
app.delete('/api/racer/:bib', async (req, res) => {
    const bib = req.params.bib;
    try {
        const { error, count } = await supabase
            .from('racers')
            .delete()
            .eq('bib', bib);

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 7. Reset All Data
app.post('/api/reset', async (req, res) => {
    try {
        // In Supabase, we delete all rows. Foreign keys handle memberships.
        await supabase.from('members').delete().neq('id', 0);
        await supabase.from('racers').delete().neq('id', '0');
        await supabase.from('categories').delete().neq('key', '0');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 8. Upload CSV (Format: Rajtszám;Név;Kategória;Születési dátum;táv;Ötpróba azonositó)
app.post('/api/upload-csv', async (req, res) => {
    const { csvData } = req.body;
    const lines = csvData.trim().split('\n');
    let added = 0;

    try {
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const fields = line.split(';').map(s => s.trim());
            if (fields.length >= 3) {
                const [csvBib, name, category, birthDate, distance, otprobaId] = fields;
                let dist = (distance || '11km').replace(/\s+/g, '').toLowerCase();
                const finalOtprobaId = otprobaId || '';

                let bib = parseInt(csvBib);
                if (isNaN(bib)) {
                    bib = await getNextBib(dist, category);
                }

                if (bib) {
                    const racerId = Date.now().toString() + Math.random();

                    const { error: rError } = await supabase.from('racers').insert({
                        id: racerId,
                        bib,
                        category,
                        distance: dist,
                        status: 'registered'
                    });

                    if (!rError) {
                        const { error: mError } = await supabase.from('members').insert({
                            racerId,
                            name,
                            birthDate: birthDate || '',
                            otprobaId: finalOtprobaId
                        });
                        if (!mError) added++;
                    }
                }
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
