
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkTypes() {
    console.log("--- Type Check ---");
    try {
        // Try to insert a non-numeric string into 'id'
        const { error: error1 } = await supabase.from('racers').insert({
            id: 'NOT_A_NUMBER_' + Date.now(),
            bib: 8888,
            category: 'test',
            distance: 'test'
        });
        console.log("String ID insert error (if any):", error1 ? error1.message : "None (Success)");

        // Try to insert a very long number into 'bib'
        const { error: error2 } = await supabase.from('racers').insert({
            id: 'id_' + Date.now(),
            bib: 1773402579490,
            category: 'test',
            distance: 'test'
        });
        console.log("Long Bib insert error (if any):", error2 ? error2.message : "None (Success)");

    } catch (err) {
        console.error("CRITICAL ERROR:", err);
    }
}

checkTypes();
