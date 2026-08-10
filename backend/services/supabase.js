const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // <-- Modifié pour correspondre à votre .env

if (!supabaseUrl || !supabaseKey) {
  console.error("⚠️ Attention : Les variables d'environnement Supabase sont manquantes dans le .env !");
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});

module.exports = supabase;