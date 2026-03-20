require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function fixDistances() {
    const { data: racers, error } = await supabase.from('racers').select('id, distance');
    if (error) {
        console.error("DB Error:", error);
        return;
    }

    let fixed = 0;
    for (const r of racers) {
        if (r.distance && !r.distance.endsWith('km')) {
            const newDist = r.distance + 'km';
            await supabase.from('racers').update({ distance: newDist }).eq('id', r.id);
            fixed++;
        }
    }
    console.log(`Fixed ${fixed} racers' distances.`);
}

fixDistances();
