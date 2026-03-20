require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
    const { data: racers, error } = await supabase.from('racers').select('*');
    if (error) { console.error(error); return; }
    console.log("--- MINTA ADATOK ---");
    console.log(JSON.stringify(racers, null, 2));
}
check();
