require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function inspect() {
    const { data } = await supabase.from('racers').select('id, bib, status, category, distance').limit(10);
    console.log(JSON.stringify(data, null, 2));
}

inspect();
