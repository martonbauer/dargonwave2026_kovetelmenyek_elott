require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
    const { data: racers, error } = await supabase.from('racers').select('bib, status, category, distance, members(name)');
    if (error) { console.error(error); return; }
    console.log("--- RACERS & MEMBERS ---");
    racers.forEach(r => {
        const names = r.members.map(m => m.name).join(', ');
        console.log(`#${r.bib} | ${r.status} | ${names} | ${r.category} | ${r.distance}`);
    });

    const { data: cat } = await supabase.from('categories').select('*');
    console.log("--- CATEGORIES ---");
    cat.forEach(c => console.log(`${c.key} | ${c.start_time}`));
}
check();
