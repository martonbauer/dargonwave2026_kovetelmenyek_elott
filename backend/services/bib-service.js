/**
 * --- ÜZLETI LOGIKA RÉTEG (SERVICE LAYER) ---
 * Rajtszámkezelő szolgáltatás és logika.
 */

const supabase = require('../../database');

/**
 * Következő szabad rajtszám lekérése kategória és táv alapján
 */
async function getNextBib(distance, category) {
    let min = 1, max = 999;
    const cat = category.toLowerCase();

    if (cat.includes('kajak') || cat.includes('surfski')) {
        min = 1; max = 49;
    } else if (cat.includes('kenu') || cat.includes('outrigger')) {
        min = 50; max = 99;
    } else if (cat.includes('sup')) {
        min = 100; max = 199;
    } else if (cat.includes('sarkanyhajo')) {
        min = 200; max = 999;
    }

    const { data: results, error } = await supabase
        .from('racers')
        .select('bib')
        .gte('bib', min)
        .lte('bib', max);

    if (error) {
        console.error("Hiba a rajtszám lekérésekor:", error);
        throw error;
    }

    const usedBibs = (results || []).map(r => r.bib);
    let bib = min;
    while (usedBibs.includes(bib) && bib <= max) {
        bib++;
    }
    return bib <= max ? bib : null;
}

module.exports = {
    getNextBib
};
