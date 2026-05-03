const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({path: 'c:/Users/bauer/Desktop/dargonwave2026_kovetelmenyek_elott/.env'});
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
if (!supabaseUrl || !supabaseKey) { console.error("No key"); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data: racers, error } = await supabase.from('racers').select('*').eq('status', 'registered');
    if (error) console.error("Error:", error);
    else fs.writeFileSync('c:/Users/bauer/Desktop/dargonwave2026_kovetelmenyek_elott/racers_output.json', JSON.stringify(racers, null, 2), 'utf8');
}
main();
