const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware de Autenticación Básico
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({
      error: "No Authorization token found",
      message: "Please provide a Bearer token in the Authorization header."
    });
  }
  req.token = authHeader.split(' ')[1];
  req.userId = 1; // HARDCODED para simplificar la simulación del Postman
  next();
};

// ==========================================
// AUTH & USERS
// ==========================================
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.from('personas_credenciales')
    .select('*').eq('email', email).eq('passwordhash', password);
  if (error || !data || data.length === 0) return res.status(401).json({ error: "Credenciales inválidas" });
  res.json({ token: "mock-jwt-token-for-postman" });
});

app.post('/users/pre-register', async (req, res) => {
  res.status(201).json({ message: "Solicitud de registro creada" });
});

app.post('/users/complete-registration', async (req, res) => {
  res.status(200).json({ message: "Registro completado" });
});

app.get('/users/me', authMiddleware, async (req, res) => {
  const { data, error } = await supabase.from('personas').select('*').limit(1).single();
  if (error || !data) return res.status(404).json({ error: "User not found" });
  res.json({
    identificador: data.identificador,
    documento: data.documento,
    nombre: data.nombre,
    direccion: data.direccion,
    estado: data.estado
  });
});

app.get('/users/me/stats', authMiddleware, async (req, res) => {
  res.json({ subastas_activas: 2, subastas_ganadas: 1, categoria_actual: "comun" });
});

// ==========================================
// PAYMENT METHODS
// ==========================================
app.get('/payment-methods', authMiddleware, async (req, res) => {
  const { data, error } = await supabase.from('mediosdepago').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(pm => ({
    id: pm.identificador, type: pm.tipo, provider: pm.proveedor,
    last4: pm.mascara, is_default: pm.predeterminado, estado: pm.estado, moneda: pm.moneda
  })));
});

app.post('/payment-methods', authMiddleware, async (req, res) => {
  const { tipo, moneda, numero, banco, monto_garantia } = req.body;
  const { data, error } = await supabase.from('mediosdepago').insert([{
    cliente: req.userId, tipo: tipo === 'cuenta_bancaria' ? 'cuenta' : (tipo === 'cheque_certificado' ? 'cheque' : tipo),
    proveedor: banco || 'Proveedor Desconocido', mascara: numero ? numero.slice(-4) : '0000', moneda, monto: monto_garantia || 0
  }]).select('*').single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ identificador: data.identificador, tipo: data.tipo, moneda: data.moneda, verificado: false, monto_garantia: data.monto });
});

app.delete('/payment-methods/:id', authMiddleware, async (req, res) => {
  const { error } = await supabase.from('mediosdepago').delete().eq('identificador', req.params.id);
  if (error) return res.status(404).json({ error: "Medio de pago no encontrado" });
  res.json({ message: "Medio de pago eliminado" });
});

// ==========================================
// AUCTIONS
// ==========================================
app.get('/auctions', async (req, res) => {
  const { data, error } = await supabase.from('subastas').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(s => ({
    identificador: s.identificador, fecha: s.fecha, hora: s.hora, estado: s.estado,
    en_vivo: s.estado === 'abierta', tiempo_restante_segundos: 3600, precio_actual: 0, categoria: s.categoria
  })));
});

app.get('/auctions/:id', async (req, res) => {
  const { data, error } = await supabase.from('subastas').select('*').eq('identificador', req.params.id).single();
  if (error || !data) return res.status(404).json({ error: "Subasta no encontrada" });
  res.json({
    identificador: data.identificador, fecha: data.fecha, hora: data.hora, estado: data.estado, categoria: data.categoria, items: []
  });
});

app.post('/auctions/:id/join', authMiddleware, async (req, res) => {
  const { data, error } = await supabase.from('asistentes').insert([{ cliente: req.userId, subasta: req.params.id, numeropostor: Math.floor(Math.random() * 100) }]).select('*').single();
  if (error) return res.status(403).json({ error: error.message });
  res.json({ identificador: data.identificador, numero_postor: data.numeropostor, cliente_id: data.cliente, subasta_id: data.subasta });
});

app.post('/auctions/:id/leave', authMiddleware, async (req, res) => {
  await supabase.from('asistentes').delete().eq('subasta', req.params.id).eq('cliente', req.userId);
  res.json({ message: "Usuario salió de la subasta" });
});

// ==========================================
// ITEMS
// ==========================================
app.get('/items/:id', async (req, res) => {
  const { data, error } = await supabase.from('itemscatalogo').select('*, productos(*)').eq('identificador', req.params.id).single();
  if (error || !data) return res.status(404).json({ error: "Item no encontrado" });
  res.json({
    producto: {
      identificador: data.productos.identificador, titulo: data.productos.descripcioncompleta,
      descripcion: data.productos.descripcioncatalogo, duenio_id: data.productos.duenio
    }
  });
});

app.get('/items/:id/bids', async (req, res) => {
  const { data, error } = await supabase.from('pujos').select('*').eq('item', req.params.id).order('importe', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(b => ({ identificador: b.identificador, asistente_id: b.asistente, item_catalogo_id: b.item, importe: b.importe, ganador: b.ganador })));
});

app.get('/items/:id/current-bid', async (req, res) => {
  const { data, error } = await supabase.from('pujos').select('*').eq('item', req.params.id).order('importe', { ascending: false }).limit(1).single();
  if (error || !data) return res.status(200).json({});
  res.json({ identificador: data.identificador, asistente_id: data.asistente, item_catalogo_id: data.item, importe: data.importe, ganador: data.ganador });
});

app.get('/items/:id/location', async (req, res) => {
  res.json({ producto_id: req.params.id, deposito: "Depósito Central", direccion: "Av. San Martín 2500" });
});

app.get('/items/:id/insurance', async (req, res) => {
  res.json({ identificador: 1, nro_poliza: "POL-123", compania: "Seguros Arg", importe: 10000 });
});

// ==========================================
// BIDS
// ==========================================
app.post('/bids', authMiddleware, async (req, res) => {
  const { asistente_id, item_catalogo_id, importe } = req.body;
  const { data, error } = await supabase.from('pujos').insert([{ asistente: asistente_id, item: item_catalogo_id, importe: importe }]).select('*').single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ identificador: data.identificador, asistente_id: data.asistente, item_catalogo_id: data.item, importe: data.importe, ganador: data.ganador });
});

app.get('/users/me/bids', authMiddleware, async (req, res) => {
  const { data, error } = await supabase.from('pujos').select('*, asistentes!inner(cliente)').eq('asistentes.cliente', req.userId).order('importe', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(b => ({ identificador: b.identificador, asistente_id: b.asistente, item_catalogo_id: b.item, importe: b.importe, ganador: b.ganador })));
});

// ==========================================
// PAYMENTS & PENALTIES
// ==========================================
app.post('/payments', authMiddleware, async (req, res) => {
  res.status(201).json({ identificador: 1, importe: 15000, estado: "confirmado" });
});

app.post('/payments/:id/confirm', authMiddleware, async (req, res) => {
  res.json({ message: "Pago confirmado" });
});

app.get('/penalties', authMiddleware, async (req, res) => {
  const { data, error } = await supabase.from('multas').select('*').eq('cliente', req.userId);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(m => ({ identificador: m.identificador, importe: m.monto, estado: m.estado })));
});

app.post('/penalties/:id/pay', authMiddleware, async (req, res) => {
  await supabase.from('multas').update({ estado: 'pagada' }).eq('identificador', req.params.id);
  res.json({ message: "Multa pagada" });
});

// ==========================================
// SELL REQUESTS
// ==========================================
app.get('/sell-requests', authMiddleware, async (req, res) => {
  const { data, error } = await supabase.from('productos').select('*, productos_detalles(*)');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(p => ({ identificador: p.identificador, producto: p, estado: p.productos_detalles[0]?.propuesta_estado || 'pendiente' })));
});

app.post('/sell-requests', authMiddleware, async (req, res) => {
  const { titulo_articulo, descripcion, valor_estimado, moneda } = req.body;
  const { data: prod, error: err1 } = await supabase.from('productos').insert([{
    descripcioncompleta: titulo_articulo,
    descripcioncatalogo: descripcion,
    disponible: 'no',
    revisor: 1, // Empleado mock
    duenio: req.userId
  }]).select('*').single();
  if (err1) return res.status(400).json({ error: err1.message });

  await supabase.from('productos_detalles').insert([{
    identificador: prod.identificador,
    moneda: moneda,
    precio_base_propuesto: valor_estimado,
    propuesta_estado: 'en_revision'
  }]);
  res.status(201).json({ identificador: prod.identificador, estado: "en_revision" });
});

app.get('/sell-requests/:id', authMiddleware, async (req, res) => {
  const { data, error } = await supabase.from('productos').select('*, productos_detalles(*)').eq('identificador', req.params.id).single();
  if (error || !data) return res.status(404).json({ error: "Solicitud no encontrada" });
  res.json({ identificador: data.identificador, producto: data, estado: data.productos_detalles[0]?.propuesta_estado || 'pendiente' });
});

app.get('/users/me/sell-requests', authMiddleware, async (req, res) => {
  const { data, error } = await supabase.from('productos').select('*, productos_detalles(*)').eq('duenio', req.userId);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(p => ({ identificador: p.identificador, producto: p, estado: p.productos_detalles[0]?.propuesta_estado || 'pendiente' })));
});

app.post('/sell-requests/:id/accept-terms', authMiddleware, async (req, res) => {
  const { error } = await supabase.from('productos_detalles').update({ propuesta_estado: 'aceptada' }).eq('identificador', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: "Condiciones aceptadas" });
});

app.post('/sell-requests/:id/reject-terms', authMiddleware, async (req, res) => {
  const { error } = await supabase.from('productos_detalles').update({ propuesta_estado: 'rechazada' }).eq('identificador', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: "Condiciones rechazadas" });
});

// ==========================================
// NOTIFICATIONS
// ==========================================
app.get('/notifications', authMiddleware, async (req, res) => {
  const { data, error } = await supabase.from('notificaciones').select('*').eq('cliente', req.userId);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(n => ({ identificador: n.identificador, titulo: n.titulo, mensaje: n.mensaje, leida: n.leido === 'si' })));
});

app.patch('/notifications/:id/read', authMiddleware, async (req, res) => {
  await supabase.from('notificaciones').update({ leido: 'si' }).eq('identificador', req.params.id);
  res.json({ message: "Notificación marcada como leída" });
});

// ==========================================
// CATCH ALL (Fallback)
// ==========================================
app.use((req, res) => {
  console.log(`[Mock] Unhandled Route: ${req.method} ${req.url}`);
  if (req.method === 'GET') return res.status(200).json(req.path.endsWith('s') ? [] : {});
  if (req.method === 'POST') return res.status(201).json({ message: "Mock Success" });
  res.status(200).json({ message: "Mock Success" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor completo escuchando en http://localhost:${PORT}`);
});
