require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('WARNING: SUPABASE_URL vagy SUPABASE_KEY hiányzik a .env fájlból!');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
