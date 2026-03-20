
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkSchema() {
    console.log("--- Schema Check ---");
    
    // We can't directly query pg_attribute without a special RPC, 
    // but we can try to insert a string into 'id' and see if it fails.
    
    try {
        const testId = "test_string_" + Date.now();
        console.log(`Trying to insert a racer with id: '${testId}'...`);
        
        const { error } = await supabase.from('racers').insert({
            id: testId,
            bib: 9999, // High bib to avoid collision
            category: 'test',
            distance: 'test',
            status: 'test'
        });
        
        // Now try to delete a real one that is causing trouble
        const realId = "1773402579490";
        console.log(`Trying to delete REAL racer with id: '${realId}'...`);
        const { data: realDeleted, error: realError } = await supabase
            .from('racers')
            .delete()
            .eq('id', realId)
            .select();
            
        if (realError) {
            console.log("REAL DELETE FAILED error:");
            console.log(JSON.stringify(realError, null, 2));
        } else {
            console.log(`REAL DELETE FINISHED. Deleted count: ${realDeleted ? realDeleted.length : 0}`);
            if (realDeleted && realDeleted.length > 0) {
                console.log("Deleted data:", JSON.stringify(realDeleted[0], null, 2));
            }
        }
    } catch (err) {
        console.error("CRITICAL ERROR:", err);
    }
}

checkSchema();
