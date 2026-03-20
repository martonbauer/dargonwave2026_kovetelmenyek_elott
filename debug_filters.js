require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testFilter() {
    console.log("Testing filters for 'sup_4km'...");
    
    // Test 1: Exact match on distance
    const { data: d1, count: c1 } = await supabase.from('racers').select('*', { count: 'exact', head: true }).eq('distance', '4km');
    console.log("Exact distance '4km' count:", c1);

    // Test 2: ilike category '%sup%'
    const { data: d2, count: c2 } = await supabase.from('racers').select('*', { count: 'exact', head: true }).ilike('category', '%sup%');
    console.log("ilike category '%sup%' count:", c2);

    // Test 3: Combined
    const { data: d3, count: c3 } = await supabase.from('racers').select('*', { count: 'exact', head: true }).ilike('category', '%sup%').eq('distance', '4km');
    console.log("Combined count:", c3);

    // Test 4: Check raw values for a known bib
    const { data: r } = await supabase.from('racers').select('*').limit(1);
    if (r && r.length > 0) {
        console.log("Raw racer data for first row:");
        console.log(JSON.stringify(r[0], null, 2));
    }
}

testFilter();
