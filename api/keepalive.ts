import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  // Configurar headers para evitar caché
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // Solo permitir solicitudes GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({
      ok: false,
      error: 'Missing Supabase environment variables VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY',
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Consulta simple e inocua (traer solo la columna id de 1 elemento de inventario)
    const { data, error } = await supabase
      .from('inventory')
      .select('id')
      .limit(1);

    if (error) {
      throw error;
    }

    return res.status(200).json({
      ok: true,
      message: 'Supabase ping successful',
      timestamp: new Date().toISOString(),
      details: {
        pingTarget: 'inventory',
        hasConnection: Array.isArray(data)
      }
    });
  } catch (error: any) {
    console.error('Keep-alive error pinging Supabase:', error);
    return res.status(500).json({
      ok: false,
      error: error.message || 'Internal Server Error',
      timestamp: new Date().toISOString()
    });
  }
}
