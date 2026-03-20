require('dotenv').config();
const supabase = require('./database');

async function debugState() {
    console.log("--- RÉSZLETES ÁLLAPOT ELLENŐRZÉSE ---");

    // Versenyzők lekérése
    const { data: racers, error: rError } = await supabase
        .from('racers')
        .select('*, members(name)');

    if (rError) {
        console.error("Hiba a racers lekérésekor:", rError);
        return;
    }

    console.log(`\nVersenyzők száma: ${racers.length}`);
    racers.sort((a, b) => a.bib - b.bib).forEach(r => {
        const names = r.members.map(m => m.name).join(', ');
        console.log(`[#${r.bib.toString().padStart(3, '0')}] Státusz: ${r.status.padEnd(10)} | Név: ${names.padEnd(20)} | Kategória: ${r.category}`);
    });

    // Aktív futamok
    const { data: categories, error: cError } = await supabase
        .from('categories')
        .select('*');

    if (cError) {
        console.error("Hiba a categories lekérésekor:", cError);
    } else {
        console.log(`\nAktív futamok (óra jár): ${categories.length}`);
        categories.forEach(c => {
            console.log(`- Kulcs: ${c.key.padEnd(20)} | Rajtidő: ${new Date(c.start_time).toLocaleTimeString('hu-HU')}`);
        });
    }
}

debugState();
