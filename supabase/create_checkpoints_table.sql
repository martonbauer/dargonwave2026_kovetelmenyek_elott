-- SQL parancs a checkpoints tábla létrehozására
-- Mivel az Admin felületen hiba lépett fel, ezt a kódot másold be a Supabase SQL Editorjába és futtasd le!

CREATE TABLE IF NOT EXISTS checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    racer_bib BIGINT NOT NULL,
    checkpoint_name VARCHAR(255) NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS (Sor szintű biztonság engedélyezése)
ALTER TABLE checkpoints ENABLE ROW LEVEL SECURITY;

-- Csekkoljuk és töröljük a policy-t ha már létezik, hogy többször is futtatható legyen a script
DROP POLICY IF EXISTS "Public Access" ON checkpoints;

-- Public Access Policies (Publikus hozzáférés engedélyezése a backend számára)
CREATE POLICY "Public Access" ON checkpoints FOR ALL USING (true) WITH CHECK (true);

