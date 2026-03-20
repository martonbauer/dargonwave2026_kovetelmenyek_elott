require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function cleanCategories() {
    await supabase.from('categories').delete().neq('key', '0');
    console.log("Deleted all active categories so user can restart them properly on the UI.");
}
cleanCategories();
