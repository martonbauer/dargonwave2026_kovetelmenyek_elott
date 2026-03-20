require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkRacers() {
    const bibs = [4, 6, 7, 8, 23, 24, 25, 26];
    const { data: racers, error } = await supabase
        .from('racers')
        .select('bib, status, category, distance, start_time')
        .in('bib', bibs);

    if (error) {
        console.error("DB Error:", error);
        return;
    }

    console.log(JSON.stringify(racers, null, 2));
}

checkRacers();
