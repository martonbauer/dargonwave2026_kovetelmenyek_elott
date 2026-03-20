
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkMembers() {
    console.log("--- Members Column Check ---");
    try {
        const { data, error } = await supabase.from('members').select('*').limit(1);
        if (error) {
            console.log("ERROR selecting from members:", error);
        } else if (data && data.length > 0) {
            console.log("Columns in 'members':", Object.keys(data[0]).join(', '));
        } else {
            console.log("No data in 'members' to check columns.");
        }
    } catch (err) {
        console.error("CRITICAL ERROR:", err);
    }
}

checkMembers();
