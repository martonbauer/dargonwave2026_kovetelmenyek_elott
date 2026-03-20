require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;
const supabase = createClient(url, key);

async function inspect() {
    console.log("--- Categories ---");
    const { data: categories } = await supabase.from('categories').select('*');
    console.log(categories);

    console.log("\n--- Running Racers ---");
    const { data: racers } = await supabase.from('racers').select('id, bib, category, distance, status').eq('status', 'running');
    console.log(racers);

    if (categories && categories.length > 0) {
        console.log("\n--- Analysis ---");
        for (const cat of categories) {
            console.log(`Checking category key: ${cat.key}`);
            const parts = cat.key.split('_');
            const distance = parts.pop();
            const categorySlug = parts.join('_');
            console.log(`  Split: categorySlug=${categorySlug}, distance=${distance}`);
        }
    }
}

inspect();
