require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
    console.log("--- BATCH TIMERS (Categories) ---");
    const { data: cats, error: e1 } = await supabase.from('categories').select('*');
    if (e1) console.error(e1);
    else console.table(cats);

    console.log("--- RUNNING RACERS ---");
    const { data: racers, error: e2 } = await supabase.from('racers').select('bib, category, distance, status').eq('status', 'running');
    if (e2) console.error(e2);
    else console.table(racers);

    console.log("--- ALL RACERS (Last 5) ---");
    const { data: allRacers, error: e3 } = await supabase.from('racers').select('bib, category, distance, status').order('created_at', { ascending: false }).limit(5);
    if (e3) console.error(e3);
    else console.table(allRacers);
}

check();
