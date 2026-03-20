
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkColumns() {
    console.log("--- Column Check ---");
    try {
        const { data, error } = await supabase.from('racers').select('*').limit(1);
        if (error) {
            console.log("ERROR selecting from racers:", error);
        } else if (data && data.length > 0) {
            console.log("Columns in 'racers':", Object.keys(data[0]).join(', '));
        } else {
            console.log("No data in 'racers' to check columns.");
        }
    } catch (err) {
        console.error("CRITICAL ERROR:", err);
    }
}

checkColumns();
