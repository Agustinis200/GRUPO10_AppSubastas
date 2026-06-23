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

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({
      error: "No Authorization token found",
      message: "Please provide a Bearer token in the Authorization header."
    });
  }
  req.token = authHeader.split(' ')[1];
  try {
    const decoded = JSON.parse(Buffer.from(req.token, 'base64').toString('utf8'));
    if (decoded && decoded.userId) {
      req.userId = decoded.userId;
      next();
    } else {
      throw new Error('Invalid token');
    }
  } catch(e) {
    return res.status(401).json({ error: "Invalid or malformed token" });
  }
};

// ==========================================
// AUTH & USERS
// ==========================================
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.from('personas_credenciales')
    .select('*').eq('email', email).eq('passwordhash', password);
  if (error || !data || data.length === 0) return res.status(401).json({ error: "Credenciales inválidas" });
  
  const token = Buffer.from(JSON.stringify({ userId: data[0].identificador })).toString('base64');
  res.json({ token });
});

app.post('/users/pre-register', async (req, res) => {
  const { documento, nombre, direccion, pais_id, mail } = req.body;
  const { data: persona, error: errP } = await supabase.from('personas').insert([{
    documento, nombre, direccion, estado: 'incativo'
  }]).select('*').single();
  if (errP) return res.status(400).json({ error: errP.message });

  const { error: errC } = await supabase.from('personas_credenciales').insert([{
    identificador: persona.identificador, email: mail, numeropais: pais_id
  }]);
  if (errC) return res.status(400).json({ error: errC.message });

  // No insertamos en la tabla clientes aquí. Se inserta cuando se admite (ya sea por panel o por completar registro).

  res.status(201).json({ message: "Usuario creado pendiente de admisión", persona_id: persona.identificador });
});

app.post('/users/complete-registration', async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.from('personas_credenciales').update({ passwordhash: password }).eq('email', email).select();
  if (error) return res.status(400).json({ error: error.message });
  if (!data || data.length === 0) return res.status(404).json({ error: "Usuario no encontrado para completar registro" });
  
  // Admitir automáticamente al usuario sin pasar por el panel de Admin
  const userId = data[0].identificador;
  await supabase.from('personas').update({ estado: 'activo' }).eq('identificador', userId);
  
  // El frontend espera que el cliente se inserte recién al ser admitido. Usamos upsert por seguridad.
  await supabase.from('clientes').upsert([{ 
    identificador: userId, 
    numeropais: data[0].numeropais || 32, 
    admitido: 'si', 
    categoria: 'comun', 
    verificador: 1 
  }]);

  res.status(200).json({ message: "Registro completado y usuario admitido automáticamente" });
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

// Endpoint extra para que puedas Admitir usuarios simulando ser el Administrador desde Postman
app.post('/admin/users/:id/admit', async (req, res) => {
  const userId = req.params.id;
  
  // 1. Marcar persona como activa
  const { error: err1 } = await supabase.from('personas').update({ estado: 'activo' }).eq('identificador', userId);
  if (err1) return res.status(400).json({ error: err1.message });
  
  // 2. Marcar cliente como admitido
  const { error: err2 } = await supabase.from('clientes').update({ admitido: 'si' }).eq('identificador', userId);
  if (err2) return res.status(400).json({ error: err2.message });
  
  res.json({ message: "Usuario admitido correctamente por el Administrador" });
});

// Endpoint extra para eliminar a un usuario y todos sus datos asociados (limpieza)
app.delete('/admin/users/:id', async (req, res) => {
  const userId = req.params.id;
  // Al borrar de la tabla 'personas', la base de datos de Supabase borrará automáticamente en cascada
  // al usuario de las tablas 'clientes', 'personas_credenciales', 'duenios', 'asistentes', etc.
  const { error } = await supabase.from('personas').delete().eq('identificador', userId);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: "Usuario y todos sus datos relacionados eliminados correctamente" });
});

app.get('/users/me/stats', authMiddleware, async (req, res) => {
  // Subastas activas (abiertas en las que es asistente)
  const { data: asist } = await supabase.from('asistentes').select('subasta, subastas(estado)').eq('cliente', req.userId);
  const activas = asist ? asist.filter(a => a.subastas && a.subastas.estado === 'abierta').length : 0;
  
  // Subastas ganadas
  const { data: pujos } = await supabase.from('pujos').select('*, asistentes!inner(cliente)').eq('asistentes.cliente', req.userId).eq('ganador', 'si');
  const ganadas = pujos ? pujos.length : 0;
  
  // Categoria
  const { data: cliente } = await supabase.from('clientes').select('categoria').eq('identificador', req.userId).single();
  
  res.json({ subastas_activas: activas, subastas_ganadas: ganadas, categoria_actual: cliente ? cliente.categoria : 'comun' });
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

app.get('/items/:id/bids', authMiddleware, async (req, res) => {
  const { data, error } = await supabase.from('pujos').select('*').eq('item', req.params.id).order('importe', { ascending: false });
  if (error) return res.status(400).json({ error: error.message });
  const mapped = (data || []).map(b => ({
    identificador: b.identificador,
    asistente_id: b.asistente,
    item_catalogo_id: b.item,
    importe: typeof b.importe === 'string' ? parseFloat(b.importe.replace(/[^0-9.-]+/g,"")) : b.importe,
    ganador: b.ganador
  }));
  res.json(mapped);
});

app.get('/items/:id/current-bid', authMiddleware, async (req, res) => {
  const { data, error } = await supabase.from('pujos').select('*').eq('item', req.params.id).order('importe', { ascending: false }).limit(1).single();
  if (error) {
    if (error.code === 'PGRST116') return res.status(404).json({ error: "No hay pujas" }); // No rows returned
    return res.status(400).json({ error: error.message });
  }
  if (!data) return res.status(404).json({ error: "No hay pujas" });
  
  res.json({
    identificador: data.identificador,
    asistente_id: data.asistente,
    item_catalogo_id: data.item,
    importe: typeof data.importe === 'string' ? parseFloat(data.importe.replace(/[^0-9.-]+/g,"")) : data.importe,
    ganador: data.ganador
  });
});

app.get('/items/:id/location', async (req, res) => {
  const { data: item } = await supabase.from('itemscatalogo').select('catalogo, catalogos(subasta, subastas(ubicacion, tienedeposito))').eq('identificador', req.params.id).single();
  if (!item || !item.catalogos || !item.catalogos.subastas) return res.status(404).json({ error: "Ubicación no encontrada" });
  
  const subasta = item.catalogos.subastas;
  res.json({ deposito: subasta.tienedeposito === 'si' ? "Depósito Central" : "Ubicación Externa", direccion: subasta.ubicacion });
});

app.get('/items/:id/insurance', async (req, res) => {
  const { data: item } = await supabase.from('itemscatalogo').select('producto, productos(seguro)').eq('identificador', req.params.id).single();
  if (!item || !item.productos || !item.productos.seguro) return res.status(404).json({ error: "Seguro no encontrado" });
  
  const { data: seguro } = await supabase.from('seguros').select('*').eq('nropoliza', item.productos.seguro).single();
  if (!seguro) return res.status(404).json({ error: "Poliza no encontrada" });
  
  res.json({ identificador: req.params.id, nro_poliza: seguro.nropoliza, compania: seguro.compania, importe: seguro.importe });
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
  res.json(data.map(b => ({ 
    identificador: b.identificador, 
    asistente_id: b.asistente, 
    item_catalogo_id: b.item, 
    importe: typeof b.importe === 'string' ? parseFloat(b.importe.replace(/[^0-9.-]+/g,"")) : b.importe, 
    ganador: b.ganador 
  })));
});

// Endpoint extra para ver las pujas de CUALQUIER usuario (Administrativo)
app.get('/admin/users/:id/bids', async (req, res) => {
  const { data, error } = await supabase.from('pujos').select('*, asistentes!inner(cliente)').eq('asistentes.cliente', req.params.id).order('importe', { ascending: false });
  if (error) return res.status(400).json({ error: error.message });
  res.json((data || []).map(b => ({ 
    identificador: b.identificador, 
    asistente_id: b.asistente, 
    item_catalogo_id: b.item, 
    importe: typeof b.importe === 'string' ? parseFloat(b.importe.replace(/[^0-9.-]+/g,"")) : b.importe, 
    ganador: b.ganador 
  })));
});

// ==========================================
// PAYMENTS & PENALTIES
// ==========================================
app.post('/payments', authMiddleware, async (req, res) => {
  const { item_id, importe } = req.body;
  // Simulamos la creación de un registro en multas para el pago
  const { data, error } = await supabase.from('multas').insert([{ cliente: req.userId, descripcion: 'Pago por artículo', monto: importe || 10000, estado: 'pendiente' }]).select('*').single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ identificador: data.identificador, importe: data.monto, estado: data.estado });
});

app.post('/payments/:id/confirm', authMiddleware, async (req, res) => {
  await supabase.from('multas').update({ estado: 'pagada' }).eq('identificador', req.params.id);
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
  const body = Array.isArray(req.body) ? req.body[0] : req.body;
  const { titulo_articulo, descripcion, valor_estimado, moneda } = body;
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
