const supabase = require('./database');

async function test() {
    console.log("Adatbázis beszúrási teszt indítása...");
    const racerId = "TEST_" + Date.now();
    const bib = 999;

    try {
        console.log("1. 'racers' táblába beszúrás...");
        const { error: rError } = await supabase
            .from('racers')
            .insert({
                id: racerId,
                bib: bib,
                category: 'test_category',
                distance: '11km',
                is_series: 0,
                status: 'registered'
            });

        if (rError) {
            console.error("KRITIKUS: Racers beszúrási hiba:", rError);
            return;
        }
        console.log("Sikeres racers beszúrás.");

        console.log("2. 'members' táblába beszúrás...");
        const { error: mError } = await supabase
            .from('members')
            .insert({
                racer_id: racerId,
                name: "Teszt Elek",
                birth_date: "1990-01-01",
                otproba_id: "5P123456"
            });

        if (mError) {
            console.error("KRITIKUS: Members beszúrási hiba:", mError);
            return;
        }
        console.log("Sikeres members beszúrás.");

        console.log("Minden teszt sikeres!");

        // Takarítás (opcionális, de most hagyjuk meg, hogy lássuk a Supabase felületén is)
    } catch (err) {
        console.error("Hiba a teszt futtatása közben:", err);
    }
}

test();
