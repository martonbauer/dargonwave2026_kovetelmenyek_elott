require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
    console.log("--- ADATBÁZIS ÁLLAPOT ELLENŐRZÉSE ---");
    const { data: racers, error } = await supabase
        .from('racers')
        .select('*, members(name)');

    if (error) {
        console.error("Hiba:", error);
        return;
    }

    console.log(`Összesen ${racers.length} versenyző található.`);
    racers.forEach(r => {
        const names = r.members.map(m => m.name).join(', ');
        console.log(`[BIB #${r.bib}] ${names} - Status: ${r.status}, ID: ${r.id}`);
    });

    const { data: categories } = await supabase.from('categories').select('*');
    console.log("\nAktív futamok (categories tábla):", categories);
}

check();
