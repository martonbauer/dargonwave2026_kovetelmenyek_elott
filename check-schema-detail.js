const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkSchema() {
    console.log("--- Supabase Schema Detail ---");
    
    // We can use a trick to get column names if we don't have RPC:
    // query a single row and look at the keys.
    const tables = ['racers', 'members', 'categories'];
    
    for (const table of tables) {
        console.log(`\nChecking table: ${table}`);
        const { data, error } = await supabase
            .from(table)
            .select('*')
            .limit(1);
            
        if (error) {
            console.error(`  Error: ${error.message}`);
            // If it's a 404, maybe the table doesn't exist?
        } else if (data && data.length > 0) {
            console.log(`  Columns: ${Object.keys(data[0]).join(', ')}`);
            console.log(`  Sample data: ${JSON.stringify(data[0])}`);
        } else {
            console.log("  Table is empty, cannot infer columns easily.");
            // Try to insert a dummy row to see what happens
            const { error: insError } = await supabase.from(table).insert({}).select();
            if (insError) {
                console.log(`  Insert error (expected if columns required): ${insError.message}`);
                if (insError.details) console.log(`  Details: ${insError.details}`);
            }
        }
    }
}

checkSchema();
