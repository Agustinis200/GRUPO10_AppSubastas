import { supabase } from './supabaseClient';
import { apiService } from './apiService';

// Custom Base64 & Hex Conversion utilities for Bytea / Varbinary
const uint8ArrayToBase64 = (uint8Array) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  const len = uint8Array.length;
  for (let i = 0; i < len; i += 3) {
    const b1 = uint8Array[i];
    const b2 = i + 1 < len ? uint8Array[i + 1] : NaN;
    const b3 = i + 2 < len ? uint8Array[i + 2] : NaN;
    
    const enc1 = b1 >> 2;
    const enc2 = ((b1 & 3) << 4) | (isNaN(b2) ? 0 : b2 >> 4);
    const enc3 = isNaN(b2) ? 64 : ((b2 & 15) << 2) | (isNaN(b3) ? 0 : b3 >> 6);
    const enc4 = isNaN(b3) ? 64 : b3 & 63;
    
    result += chars.charAt(enc1) + chars.charAt(enc2) +
              (enc3 === 64 ? '=' : chars.charAt(enc3)) +
              (enc4 === 64 ? '=' : chars.charAt(enc4));
  }
  return result;
};

const hexToBase64 = (hexStr) => {
  if (!hexStr) return '';
  let cleanHex = hexStr;
  if (hexStr.startsWith('\\x') || hexStr.startsWith('0x')) {
    cleanHex = hexStr.slice(2);
  }
  if (!cleanHex) return '';
  const matched = cleanHex.match(/.{1,2}/g);
  if (!matched) return '';
  const bytes = new Uint8Array(matched.map(byte => parseInt(byte, 16)));
  return uint8ArrayToBase64(bytes);
};

// Helper to calculate seconds remaining until a date/time
const getSecondsRemaining = (dateStr, timeStr) => {
  try {
    const formattedDate = dateStr.includes('/') 
      ? dateStr.split('/').reverse().join('-') 
      : dateStr;
    const endDateTime = new Date(`${formattedDate}T${timeStr}`);
    const diffMs = +endDateTime - +new Date();
    return diffMs > 0 ? Math.floor(diffMs / 1000) : 0;
  } catch (e) {
    return 86400; // Default 1 day
  }
};

// Map DB record from PostgreSQL schema to UI schema
const mapDbItemToUi = (dbItem) => {
  const product = dbItem.producto || {};
  const catalog = dbItem.catalogo || {};
  const subasta = catalog.subastas || {};
  
  // Find highest bid in 'pujos'
  const bids = dbItem.pujos || [];
  const sortedBids = [...bids].sort((a, b) => b.importe - a.importe);
  const currentPrice = sortedBids.length > 0 ? Number(sortedBids[0].importe) : Number(dbItem.preciobase);
  
  // Highest bidder name from nested personas
  const highestBidderName = sortedBids.length > 0 && sortedBids[0].asistentes?.clientes?.personas
    ? sortedBids[0].asistentes.clientes.personas.nombre
    : 'Nadie';

  // Decode binary photos from photos relation
  const fotosList = product.fotos || [];
  let imageUrl = 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=600&q=80';
  if (fotosList.length > 0) {
    imageUrl = apiService.parseLegacyBytea(fotosList[0].foto) || imageUrl;
  }

  const allImages = fotosList.map(f => {
    return apiService.parseLegacyBytea(f.foto);
  }).filter(Boolean);

  // Insurance details
  const seguroObj = product.seguro || {};

  // Historical info and origin document
  const infoHistorica = product.informacion_historica || '';
  const docOrigen = product.documento_origen || null;

  // Calculate ends_at
  let endsAtStr = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  if (subasta.fecha && subasta.hora) {
    endsAtStr = new Date(`${subasta.fecha}T${subasta.hora}`).toISOString();
  }

  return {
    identificador: dbItem.identificador,
    subasta_id: subasta.identificador || null,
    fecha: subasta.fecha || '',
    hora: subasta.hora || '',
    estado: subasta.estado || 'abierta',
    en_vivo: subasta.estado === 'abierta',
    tiempo_restante_segundos: getSecondsRemaining(subasta.fecha, subasta.hora),
    precio_actual: currentPrice,
    categoria: subasta.categoria || 'comun',
    producto: {
      identificador: product.identificador,
      titulo: product.descripcioncompleta || 'Artículo sin título',
      descripcion: product.descripcioncatalogo || 'Sin descripción',
      image_url: imageUrl,
      images: allImages.length > 0 ? allImages : [imageUrl],
      seller_name: product.duenios?.personas?.nombre || 'Vendedor Anónimo',
      documento_origen: docOrigen,
      poliza: seguroObj.nropoliza ? {
        nroPoliza: seguroObj.nropoliza,
        compania: seguroObj.compania,
        polizaCombinada: seguroObj.polizacombinada,
        importe: Number(seguroObj.importe)
      } : null,
      historia: {
        artista: 'Detalle de Revisor',
        anio: 'N/A',
        contexto: infoHistorica || `Producto revisado por empleado ID ${product.revisor || 'desconocido'}`
      }
    },
    bid_count: bids.length,
    highest_bidder: highestBidderName,
    ends_at: endsAtStr
  };
};

// Premium Mock Data for fallback
let mockAuctions = [
  {
    identificador: 1,
    subasta_id: 1,
    fecha: '2026-06-05',
    hora: '14:30:00',
    estado: 'abierta',
    en_vivo: true,
    tiempo_restante_segundos: getSecondsRemaining('2026-06-05', '14:30:00'),
    precio_actual: 2850,
    categoria: 'oro',
    producto: {
      identificador: 101,
      titulo: 'MacBook Pro 16" M3 Max',
      descripcion: '16-inch MacBook Pro, M3 Max chip with 16‑core CPU and 40‑core GPU, 48GB Unified Memory, 1TB SSD. Space Black. Like new in box.',
      image_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80',
      duenio_id: 8,
      seller_name: 'Alex Tech Inc.',
      historia: {
        artista: 'Apple Design Team',
        anio: '2024',
        contexto: 'Edición limitada Space Black firmada digitalmente'
      }
    },
    bid_count: 8,
    highest_bidder: 'Lucas M.',
    ends_at: new Date(Date.now() + 3 * 3600 * 1000).toISOString()
  },
  {
    identificador: 2,
    subasta_id: 2,
    fecha: '2026-06-12',
    hora: '10:00:00',
    estado: 'abierta',
    en_vivo: true,
    tiempo_restante_segundos: getSecondsRemaining('2026-06-12', '10:00:00'),
    precio_actual: 14200,
    categoria: 'comun',
    producto: {
      identificador: 102,
      titulo: 'Rolex Submariner Date Gold',
      descripcion: 'Oyster, 41 mm, yellow gold. Blue dial and Cerachrom bezel. Excellent condition, includes certificate of authenticity and box.',
      image_url: 'https://images.unsplash.com/photo-1547996160-81dfa63595aa?auto=format&fit=crop&w=600&q=80',
      duenio_id: 12,
      seller_name: 'Gems & Time LLC',
      historia: {
        artista: 'Rolex Geneve',
        anio: '2022',
        contexto: 'Calibre 3235 manufacturado Rolex'
      }
    },
    bid_count: 14,
    highest_bidder: 'Sophia K.',
    ends_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
  },
  {
    identificador: 3,
    subasta_id: 3,
    fecha: '2026-06-20',
    hora: '18:00:00',
    estado: 'abierta',
    en_vivo: true,
    tiempo_restante_segundos: getSecondsRemaining('2026-06-20', '18:00:00'),
    precio_actual: 480,
    categoria: 'platino',
    producto: {
      identificador: 103,
      titulo: 'Porsche 911 GT3 RS (Scale 1:8)',
      descripcion: 'Lego Technic Porsche 911 GT3 RS. Fully assembled with original box, manuals, and spare parts. Pristine collection item.',
      image_url: 'https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?auto=format&fit=crop&w=600&q=80',
      duenio_id: 3,
      seller_name: 'BlockCollector',
      historia: {
        artista: 'Lego Technic / Porsche AG',
        anio: '2016',
        contexto: 'Juego de construcción de 2,704 piezas descatalogado'
      }
    },
    bid_count: 5,
    highest_bidder: 'Marcus D.',
    ends_at: new Date(Date.now() + 1.5 * 3600 * 1000).toISOString()
  }
];

let mockBidHistory = {};

const isSupabaseConfigured = () => {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  return url && key && url !== 'https://your-supabase-project.supabase.co' && key !== 'your-supabase-anon-key-here' && url !== '' && key !== '';
};

const bidListeners = new Set();

export const supabaseService = {
  mockAuctions, // Expose mockAuctions for offline uploads consistency
  getConfigStatus() {
    const configured = isSupabaseConfigured();
    return {
      configured,
      url: process.env.EXPO_PUBLIC_SUPABASE_URL || 'Not Set',
    };
  },

  // Get active items in current open auctions
  async getAuctions() {
    if (!isSupabaseConfigured()) {
      mockAuctions.forEach(a => {
        a.tiempo_restante_segundos = getSecondsRemaining(a.fecha, a.hora);
      });
      return { data: mockAuctions, error: null };
    }

    try {
      // Query itemsCatalogo joining productos, catalogos, subastas, and pujos
      // Using PostgREST syntax representing the user's PostgreSQL database schema
      // All column names mapped to PostgreSQL folded lowercase equivalents
      const { data, error } = await supabase
        .from('itemscatalogo')
        .select(`
          identificador,
          preciobase,
          comision,
          subastado,
          producto:productos (
            identificador,
            descripcioncompleta,
            descripcioncatalogo,
            revisor,
            informacion_historica,
            documento_origen,
            seguro:seguros (
              nropoliza,
              compania,
              polizacombinada,
              importe
            ),
            duenios (
              personas (
                nombre
              )
            ),
            fotos (
              foto
            )
          ),
          catalogo:catalogos (
            subastas (
              identificador,
              fecha,
              hora,
              estado,
              categoria
            )
          ),
          pujos (
            identificador,
            importe,
            asistentes (
              clientes (
                personas (
                  nombre
                )
              )
            )
          )
        `);

      if (error) {
        console.warn('[SupabaseService] Error querying itemsCatalogo:', error.message);
        return { data: mockAuctions, error: null };
      }

      // Filter for items belonging to open auctions
      const openItems = (data || []).filter(item => {
        const subasta = item.catalogo?.subastas || {};
        return subasta.estado === 'abierta';
      });

      if (openItems.length === 0) {
        console.log('[SupabaseService] No items found in active auctions. Showing mock items.');
        return { data: mockAuctions, error: null };
      }

      const mappedData = openItems.map(mapDbItemToUi);
      return { data: mappedData, error: null };
    } catch (err) {
      console.error('[SupabaseService] Connection error:', err);
      return { data: mockAuctions, error: null };
    }
  },

  // Fetch all bids for a catalog item
  async getBidHistory(itemId) {
    if (!isSupabaseConfigured()) {
      return { data: mockBidHistory[itemId.toString()] || [], error: null };
    }

    try {
      const { data, error } = await supabase
        .from('pujos')
        .select(`
          identificador,
          importe,
          fechahora,
          asistentes (
            clientes (
              personas (
                nombre
              )
            )
          )
        `)
        .eq('item', itemId)
        .order('importe', { ascending: false });

      if (error) {
        console.warn('[SupabaseService] Error fetching bids:', error.message);
        return { data: mockBidHistory[itemId.toString()] || [], error: null };
      }

      const mappedBids = (data || []).map(b => ({
        identificador: b.identificador,
        importe: Number(b.importe),
        bidder: b.asistentes?.clientes?.personas?.nombre || 'Postor Anónimo',
        created_at: b.fechahora || new Date().toISOString()
      }));

      return { data: mappedBids, error: null };
    } catch (err) {
      return { data: mockBidHistory[itemId.toString()] || [], error: null };
    }
  },

  // Place a bid on a catalog item
  async placeBid(itemId, amount, bidderName = 'Usuario Postor') {
    let targetItem;

    // 1. Fetch user profile and perform validation rules (methods of payment, fines, categories)
    let profile;
    try {
      profile = await apiService.getProfile();
    } catch (e) {
      return { error: 'Inicia sesión para poder realizar una oferta.' };
    }

    if (!profile) {
      return { error: 'Inicia sesión para poder realizar una oferta.' };
    }

    const clienteId = profile.identificador;

    // A. Verify client has active payment methods
    try {
      const paymentMethods = await apiService.getPaymentMethods(clienteId);
      if (!paymentMethods || paymentMethods.length === 0) {
        return { error: 'No puedes ofertar sin un medio de pago registrado. Agrégalo en tu Perfil.' };
      }
    } catch (err) {
      return { error: 'Error al verificar medios de pago.' };
    }

    // B. Verify client has no outstanding/pending fines
    try {
      const fines = await apiService.getUserFines(clienteId);
      const pendingFines = fines.filter(f => f.estado === 'pendiente');
      if (pendingFines.length > 0) {
        return { error: 'Tu cuenta está bloqueada temporalmente por tener multas pendientes de pago.' };
      }
    } catch (err) {
      return { error: 'Error al verificar multas.' };
    }

    // C. Verify client category matches auction category (tier hierarchy check)
    let auctionCategory = 'comun';
    if (!isSupabaseConfigured()) {
      targetItem = mockAuctions.find(a => a.identificador === itemId);
      if (!targetItem) return { error: 'Artículo no encontrado' };
      auctionCategory = targetItem.categoria || 'comun';
    } else {
      try {
        const { data: dbItems, error: fetchErr } = await supabase
          .from('itemscatalogo')
          .select(`
            identificador,
            catalogo:catalogos (
              subastas (
                categoria
              )
            )
          `)
          .eq('identificador', itemId);

        if (fetchErr || !dbItems || dbItems.length === 0) {
          return { error: 'No se pudo encontrar el artículo de catálogo.' };
        }
        const dbItem = dbItems[0];
        auctionCategory = dbItem.catalogo?.subastas?.categoria || 'comun';
      } catch (err) {
        return { error: 'Error al verificar la categoría de la subasta.' };
      }
    }

    const clientCategory = profile.categoria || 'comun';
    const TIER_HIERARCHY = {
      'comun': 1,
      'especial': 2,
      'plata': 3,
      'oro': 4,
      'platino': 5
    };

    if ((TIER_HIERARCHY[clientCategory] || 1) < (TIER_HIERARCHY[auctionCategory] || 1)) {
      return { error: `Esta subasta requiere categoría ${auctionCategory.toUpperCase()} o superior. Tu nivel actual es ${clientCategory.toUpperCase()}.` };
    }

    // 2. Perform bid placement logic
    if (!isSupabaseConfigured()) {
      targetItem = mockAuctions.find(a => a.identificador === itemId);
      if (!targetItem) return { error: 'Artículo no encontrado' };

      targetItem.precio_actual = amount;
      targetItem.bid_count += 1;
      targetItem.highest_bidder = bidderName;

      const newBid = {
        identificador: Math.floor(Math.random() * 10000),
        importe: amount,
        bidder: bidderName,
        created_at: new Date().toISOString()
      };

      const key = itemId.toString();
      if (!mockBidHistory[key]) mockBidHistory[key] = [];
      mockBidHistory[key] = [newBid, ...mockBidHistory[key]];

      this._notifyListeners({
        auctionId: itemId,
        precio_actual: amount,
        bid_count: targetItem.bid_count,
        highest_bidder: bidderName,
        newBid
      });

      return { success: true, auction: targetItem };
    }

    try {
      // 1. Fetch catalog item info
      const { data: dbItems, error: fetchErr } = await supabase
        .from('itemscatalogo')
        .select(`
          identificador,
          preciobase,
          catalogo:catalogos (
            subastas (
              identificador,
              categoria
            )
          )
        `)
        .eq('identificador', itemId);

      if (fetchErr || !dbItems || dbItems.length === 0) {
        throw new Error('No se pudo encontrar el artículo de catálogo.');
      }

      const dbItem = dbItems[0];
      const subastaId = dbItem.catalogo?.subastas?.identificador;

      const { data: assistantData, error: assistantErr } = await supabase
        .from('asistentes')
        .select('identificador')
        .eq('cliente', clienteId)
        .eq('subasta', subastaId);

      let asistenteId;
      if (!assistantErr && assistantData && assistantData.length > 0) {
        asistenteId = assistantData[0].identificador;
      } else {
        // Register the user as an assistant for this subasta
        const { data: newAsistente, error: createAsistenteErr } = await supabase
          .from('asistentes')
          .insert({
            numeropostor: 25,
            cliente: clienteId,
            subasta: subastaId
          })
          .select()
          .single();

        if (createAsistenteErr) throw createAsistenteErr;
        asistenteId = newAsistente.identificador;
      }

      // 3. Insert bid (pujo) record
      const { error: insertBidErr } = await supabase
        .from('pujos')
        .insert({
          asistente: asistenteId,
          item: itemId,
          importe: amount,
          ganador: 'no'
        });

      if (insertBidErr) throw insertBidErr;

      // 4. Fetch updated item state to return
      const { data: updatedDbItems } = await supabase
        .from('itemscatalogo')
        .select(`
          identificador,
          preciobase,
          comision,
          subastado,
          producto:productos (
            identificador,
            descripcioncompleta,
            descripcioncatalogo,
            revisor,
            duenios (
              personas (
                nombre
              )
            ),
            fotos (
              foto
            )
          ),
          catalogo:catalogos (
            subastas (
              identificador,
              fecha,
              hora,
              estado,
              categoria
            )
          ),
          pujos (
            identificador,
            importe,
            asistentes (
              clientes (
                personas (
                  nombre
                )
              )
            )
          )
        `)
        .eq('identificador', itemId);

      const updatedUiItem = mapDbItemToUi(updatedDbItems[0]);

      // Notify realtime listeners
      this._notifyListeners({
        auctionId: itemId,
        precio_actual: amount,
        bid_count: updatedUiItem.bid_count,
        highest_bidder: bidderName
      });

      return { success: true, auction: updatedUiItem };
    } catch (err) {
      console.error('[SupabaseService] Error placing bid:', err.message);
      return { error: err.message };
    }
  },

  subscribeToBids(callback) {
    bidListeners.add(callback);
    
    let supabaseSubscription = null;
    if (isSupabaseConfigured()) {
      supabaseSubscription = supabase
        .channel('public:pujos')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pujos' }, async (payload) => {
          // Fetch the updated item status when a new bid is inserted
          try {
            const { data } = await supabase
              .from('itemscatalogo')
              .select(`
                identificador,
                preciobase,
                pujos (
                  importe,
                  asistentes (
                    clientes (
                      personas (
                        nombre
                      )
                    )
                  )
                )
              `)
              .eq('identificador', payload.new.item)
              .single();

            if (data) {
              const bids = data.pujos || [];
              const sortedBids = [...bids].sort((a, b) => b.importe - a.importe);
              const currentPrice = sortedBids.length > 0 ? Number(sortedBids[0].importe) : Number(data.preciobase);
              const highestBidderName = sortedBids.length > 0 ? sortedBids[0].asistentes?.clientes?.personas?.nombre : 'Nadie';

              callback({
                auctionId: payload.new.item,
                precio_actual: currentPrice,
                bid_count: bids.length,
                highest_bidder: highestBidderName,
                isRealtime: true
              });
            }
          } catch (e) {
            console.error('[SupabaseService] Realtime parsing failed:', e);
          }
        })
        .subscribe();
    }

    return () => {
      bidListeners.delete(callback);
      if (supabaseSubscription) {
        supabase.removeChannel(supabaseSubscription);
      }
    };
  },

  _notifyListeners(payload) {
    bidListeners.forEach(callback => callback(payload));
  }
};
