require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testFilter() {
    console.log("--- Supabase Filter Test ---");
    
    const { count: totalRacers } = await supabase.from('racers').select('*', { count: 'exact', head: true });
    console.log("Total racers in DB:", totalRacers);

    // Test specific filters
    const { count: supCount } = await supabase.from('racers').select('*', { count: 'exact', head: true }).ilike('category', '%sup%');
    console.log("Category ilike '%sup%' count:", supCount);

    const { count: dist4kmCount } = await supabase.from('racers').select('*', { count: 'exact', head: true }).eq('distance', '4km');
    console.log("Distance eq '4km' count:", dist4kmCount);

    const { count: combinedCount } = await supabase.from('racers').select('*', { count: 'exact', head: true }).ilike('category', '%sup%').eq('distance', '4km');
    console.log("Combined (sup AND 4km) count:", combinedCount);

    // Check one racer's data
    const { data: sample } = await supabase.from('racers').select('*').limit(1);
    if (sample && sample.length > 0) {
        console.log("Sample racer:", JSON.stringify(sample[0], null, 2));
    }

    // Check Categories
    const { data: cats } = await supabase.from('categories').select('*');
    console.log("Active categories:", cats.map(c => c.key).join(', '));
}

testFilter();
