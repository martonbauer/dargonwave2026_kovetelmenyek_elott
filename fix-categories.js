require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function fix() {
    const { data: racers, error } = await supabase.from('racers').select('id, bib, category, status');
    if (error) { console.error(error); return; }

    console.log("--- VERSENYZŐK ELLENŐRZÉSE ---");
    for (const r of racers) {
        if (!r.category || r.category.trim() === "") {
            console.log(`Hiba: #${r.bib} (ID: ${r.id}) kategóriája üres! Status: ${r.status}`);
            // Let's try to fix it if it's obvious, or just show it.
        } else {
            console.log(`OK: #${r.bib} | ${r.category} | ${r.status}`);
        }
    }
}
fix();
