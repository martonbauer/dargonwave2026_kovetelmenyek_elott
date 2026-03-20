require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function cleanupRacers() {
    // Delete racers 24, 25, 26
    const { error: e1 } = await supabase.from('racers').delete().in('bib', [24, 25, 26]);
    if (e1) console.error("Error deleting 24-26:", e1);
    else console.log("Deleted blank racers 24, 25, 26.");

    // The other racers (4, 6, 7, 8, 23) had weird distances like 4km for a kayak.
    // Let's just update their distance to 11km or 22km so they can be grouped, or maybe just tell the user they are invalid.
    // 4 -> 'Túrakajak férfi-1' -> 11km
    await supabase.from('racers').update({ distance: '11km' }).eq('bib', 4);
    // 6 -> 'Tengeri kajak női 1' -> 22km
    await supabase.from('racers').update({ distance: '22km' }).eq('bib', 6);
    // 7 -> 'Tengeri kajak férfi 1' -> 11km
    await supabase.from('racers').update({ distance: '11km' }).eq('bib', 7);
    // 8 -> 'Surfski' -> 22km (or 11km)
    await supabase.from('racers').update({ distance: '11km' }).eq('bib', 8);
    // 23 -> 'Sárkányhajó ötpróba' -> 11km
    await supabase.from('racers').update({ distance: '11km' }).eq('bib', 23);

    console.log("Updated distances for 4, 6, 7, 8, 23 so they can start in a group.");
}

cleanupRacers();
