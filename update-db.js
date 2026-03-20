
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function updateDatabase() {
    console.log("--- Database Schema Update ---");
    
    // NOTE: Supabase JS client cannot easily run ALTER TABLE directly 
    // unless an RPC is specifically created for it. 
    // Usually, this is done via the SQL Editor in Supabase UI.
    
    console.log("Checking if 'email' column exists...");
    const { data, error } = await supabase.from('racers').select('*').limit(1);
    
    if (error) {
        console.error("Error checking racers table:", error.message);
        return;
    }
    
    const columns = data.length > 0 ? Object.keys(data[0]) : [];
    
    if (!columns.includes('email')) {
        console.log("MISSING: 'email' and 'phone' columns.");
        console.log("IMPORTANT: Please run the following SQL in your Supabase SQL Editor:");
        console.log(`
            ALTER TABLE racers ADD COLUMN IF NOT EXISTS email TEXT;
            ALTER TABLE racers ADD COLUMN IF NOT EXISTS phone TEXT;
        `);
    } else {
        console.log("Columns 'email' and 'phone' already exist.");
    }
    
    // We can also try to fix the "integer out of range" by ensuring we use ID correctly.
    console.log("Verifying ID types...");
    // If the error persists, the user might need to change the column type to BIGINT or TEXT.
    console.log("If deletion still fails with 'integer out of range', run:");
    console.log(`
        ALTER TABLE racers ALTER COLUMN id TYPE TEXT;
        ALTER TABLE members ALTER COLUMN racer_id TYPE TEXT;
    `);
}

updateDatabase();
