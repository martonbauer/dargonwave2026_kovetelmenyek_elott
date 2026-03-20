-- DragonWave 2026 - Atomic Registration RPC
-- Ez a függvény biztosítja, hogy a versenyző és a csapattagok egyszerre, 
-- egyetlen tranzakcióban kerüljenek rögzítésre.

CREATE OR REPLACE FUNCTION register_racer_with_members(
    p_racer_id TEXT,
    p_bib INTEGER,
    p_category TEXT,
    p_distance TEXT,
    p_is_series INTEGER,
    p_members JSONB
) RETURNS JSONB AS $$
DECLARE
    v_racer_count INTEGER;
BEGIN
    -- 1. Beszúrjuk a versenyzőt
    INSERT INTO racers (id, bib, category, distance, is_series, status)
    VALUES (p_racer_id, p_bib, p_category, p_distance, p_is_series, 'registered');

    -- 2. Beszúrjuk a tagokat a JSONB tömbből
    IF p_members IS NOT NULL AND jsonb_array_length(p_members) > 0 THEN
        INSERT INTO members (racer_id, name, birth_date, otproba_id)
        SELECT p_racer_id, 
               (m->>'name')::TEXT, 
               (m->>'birth_date')::TEXT, 
               (m->>'otproba_id')::TEXT
        FROM jsonb_array_elements(p_members) AS m;
    END IF;

    RETURN jsonb_build_object('success', true, 'id', p_racer_id, 'bib', p_bib);
EXCEPTION WHEN OTHERS THEN
    -- A PostgreSQL automatikusan visszagörgeti a tranzakciót hiba esetén
    RAISE EXCEPTION 'Hiba a regisztráció során: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;
