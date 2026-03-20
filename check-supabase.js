require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;

console.log("URL:", url);
console.log("Key hossza:", key ? key.length : 0);
console.log("Key eleje:", key ? key.substring(0, 15) : "Nincs");

const supabase = createClient(url, key);

async function check() {
    console.log("Csatlakozási teszt...");
    try {
        // Próbáljunk lekérdezni egy nem létező táblát is, hogy lássuk a hibaüzenetet
        const { data, error } = await supabase.from('racers').select('count', { count: 'exact' });

        if (error) {
            console.error("Hiba történt:", error);
            if (error.code === 'PGRST204') {
                console.log("TIPP: A 'racers' tábla hiányzik az adatbázisból!");
            }
        } else {
            console.log("Sikeres lekérdezés! Sorok száma:", data);
        }
    } catch (err) {
        console.error("Kritikus hiba:", err);
    }
}

check();
