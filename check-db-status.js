const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkStatus() {
    console.log("--- Supabase Status Check ---");
    
    const tables = ['racers', 'members', 'categories'];
    
    for (const table of tables) {
        const { data, count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
            
        if (error) {
            console.error(`Error checking table '${table}':`, error.message);
        } else {
            console.log(`Table '${table}': ${count} rows`);
        }
    }
    
    // Check one sample racer to see the schema
    const { data: sampleRacer, error: racerError } = await supabase
        .from('racers')
        .select('*')
        .limit(1);
        
    if (racerError) {
        console.error("Error fetching sample racer:", racerError.message);
    } else if (sampleRacer && sampleRacer.length > 0) {
        console.log("Sample Racer:", JSON.stringify(sampleRacer[0], null, 2));
    } else {
        console.log("No racers found.");
    }
}

checkStatus();
