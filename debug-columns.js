require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function getColumns() {
    console.log("Oszlopok lekérdezése a 'racers' táblából...");
    try {
        // Egy üres keresés, hátha a metadata-ban benne van
        const { data, error } = await supabase.from('racers').select('*').limit(0);
        if (error) {
            console.error("Hiba:", error);
            return;
        }

        // Trükk: lekérdezzük az information_schema-t RPC-vel, ha elérhető, 
        // de egyszerűbb ha csak csinálunk egy insertet ami biztosan elbukik a rossz oszlop miatt
        console.log("Próbálkozás egy üres beszúrással...");
        const { error: iError } = await supabase.from('racers').insert({ id: 'DEBUG_TEST' });
        console.log("Hibaüzenet (itt látszódnia kell az elvárt oszlopoknak):", iError ? iError.message : "Siker (??)");
    } catch (err) {
        console.error("Hiba:", err);
    }
}

getColumns();
