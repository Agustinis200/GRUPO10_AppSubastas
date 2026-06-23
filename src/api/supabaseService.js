import { supabase } from './supabaseClient';
import { apiService } from './apiService';

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

const parseDateSafely = (dateStr, timeStr) => {
  try {
    if (!dateStr) return new Date();
    const cleanFecha = dateStr.replace(/\s+/g, '');
    const cleanHora = (timeStr || '00:00:00').replace(/\s+/g, '');
    
    const formattedDate = cleanFecha.includes('/') 
      ? cleanFecha.split('/').reverse().join('-') 
      : cleanFecha;
      
    const parts = formattedDate.split('-');
    const timeParts = cleanHora.split(':');
    
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const hour = timeParts.length > 0 ? parseInt(timeParts[0], 10) : 0;
      const minute = timeParts.length > 1 ? parseInt(timeParts[1], 10) : 0;
      const second = timeParts.length > 2 ? parseInt(timeParts[2], 10) : 0;
      
      const d = new Date(year, month, day, hour, minute, second);
      if (!isNaN(d.getTime())) {
        return d;
      }
    }
    const fallback = new Date(`${formattedDate}T${cleanHora}`);
    if (!isNaN(fallback.getTime())) {
      return fallback;
    }
  } catch (e) {
    console.warn('[SupabaseService] parseDateSafely exception:', e);
  }
  return new Date();
};

const getSecondsRemaining = (dateStr, timeStr) => {
  try {
    const endDateTime = parseDateSafely(dateStr, timeStr);
    const diffMs = +endDateTime - +new Date();
    return diffMs > 0 ? Math.floor(diffMs / 1000) : 0;
  } catch (e) {
    return 86400; 
  }
};

export const isSubastaClosed = (dateStr, timeStr) => {
  if (!dateStr) return false;
  try {
    const startDateTime = parseDateSafely(dateStr, timeStr);
    // Cierre automático después de 24 horas
    const endDateTime = new Date(+startDateTime + 24 * 3600 * 1000);
    return +endDateTime < +new Date();
  } catch (e) {
    return false;
  }
};

export const isSubastaNotStarted = (dateStr, timeStr) => {
  if (!dateStr) return true;
  try {
    const today = new Date();
    const subastaDate = parseDateSafely(dateStr, timeStr);
    return +today < +subastaDate;
  } catch (e) {
    return true;
  }
};export const getSubastaFromItem = (item) => {
  if (!item) return null;
  let catalogo = item.catalogo;
  if (Array.isArray(catalogo)) catalogo = catalogo[0];
  if (!catalogo) return null;
  
  let subasta = catalogo.subastas;
  if (Array.isArray(subasta)) subasta = subasta[0];
  return subasta || null;
};

export const mapUiAuctions = (auctionsList) => {
  if (!auctionsList || auctionsList.length === 0) return [];
  
  // Agrupar por subasta_id
  const groups = {};
  auctionsList.forEach(item => {
    const subId = item.subasta_id || 'default';
    if (!groups[subId]) groups[subId] = [];
    groups[subId].push(item);
  });
  
  const now = new Date();
  const result = [];
  
  Object.keys(groups).forEach(subId => {
    const items = groups[subId].sort((a, b) => a.identificador - b.identificador);
    
    // Buscar primer artículo no subastado
    const activeIndex = items.findIndex(item => item.subastado === 'no');
    const hasUnsoldItems = activeIndex !== -1;
    
    items.forEach((item, idx) => {
      // Fecha de inicio
      let subastaStart = parseDateSafely(item.fecha, item.hora);

      const itemStart = new Date(+subastaStart + idx * 5 * 60 * 1000);
      const itemEnd = new Date(+subastaStart + (idx + 1) * 5 * 60 * 1000);
      
      let estado = item.estado;
      let en_vivo = false;
      let tiempo_restante_segundos = 0;
      let is_locked = false;
      let is_closed = false;
      
      // Activa si está abierta o llegó la hora
      const parentIsActive = (estado === 'abierta') || (now >= subastaStart && estado !== 'cerrada' && hasUnsoldItems);
      
      if (item.subastado === 'si') {
        estado = 'cerrada';
        is_closed = true;
      } else if (parentIsActive) {
        if (activeIndex === -1) {
          estado = 'cerrada';
          is_closed = true;
        } else if (idx === activeIndex) {
          estado = 'abierta';
          en_vivo = true;
          const remaining = Math.floor((itemEnd - now) / 1000);
          tiempo_restante_segundos = remaining > 0 ? remaining : 5 * 60;
        } else if (idx < activeIndex) {
          estado = 'cerrada';
          is_closed = true;
        } else {
          estado = 'bloqueada';
          is_locked = true;
        }
      } else {
        // Subasta no activa
        if (now < subastaStart && estado !== 'cerrada') {
          estado = 'programada';
        } else {
          estado = 'cerrada';
          is_closed = true;
        }
      }
      
      result.push({
        ...item,
        estado,
        en_vivo,
        tiempo_restante_segundos,
        ends_at: itemEnd.toISOString(),
        is_locked,
        is_closed,
        subasta_terminada: !hasUnsoldItems
      });
    });
  });
  
  return result;
};

const mapDbItemToUi = (dbItem) => {
  const product = dbItem.producto || {};
  const catalog = dbItem.catalogo || {};
  const subasta = catalog.subastas || {};
  
  const bids = dbItem.pujos || [];
  const sortedBids = [...bids].sort((a, b) => b.importe - a.importe);
  const currentPrice = sortedBids.length > 0 ? Number(sortedBids[0].importe) : Number(dbItem.preciobase);
  
  const highestBidderName = sortedBids.length > 0 && sortedBids[0].asistentes?.clientes?.personas
    ? sortedBids[0].asistentes.clientes.personas.nombre
    : 'Nadie';

  const fotosList = product.fotos || [];
  let imageUrl = 'https://via.placeholder.com/600x400/E0E0E0/808080?text=Sin+Imagen';
  if (fotosList.length > 0) {
    imageUrl = apiService.parseLegacyBytea(fotosList[0].foto) || imageUrl;
  }

  const allImages = fotosList.map(f => {
    return apiService.parseLegacyBytea(f.foto);
  }).filter(Boolean);

  const seguroObj = product.seguro 
    ? (Array.isArray(product.seguro) ? product.seguro[0] : product.seguro) 
    : {};

  const prodDet = product.productos_detalles && product.productos_detalles.length > 0
    ? product.productos_detalles[0]
    : product.productos_detalles;
  const infoHistorica = prodDet?.informacion_historica || '';
  const docOrigen = prodDet?.documento_origen || null;
  const moneda = prodDet?.moneda || 'ARS';

  let endsAtStr = dbItem.calculated_ends_at || new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  if (!dbItem.calculated_ends_at && subasta.fecha && subasta.hora) {
    endsAtStr = parseDateSafely(subasta.fecha, subasta.hora).toISOString();
  }

  let uiEstado = subasta.estado;
  if (!uiEstado) {
    const notStarted = isSubastaNotStarted(subasta.fecha, subasta.hora);
    const isClosed = isSubastaClosed(subasta.fecha, subasta.hora);
    if (notStarted) {
      uiEstado = 'programada';
    } else if (isClosed) {
      uiEstado = 'cerrada';
    } else {
      uiEstado = 'abierta';
    }
  } else if (uiEstado === 'carrada') {
    const notStarted = isSubastaNotStarted(subasta.fecha, subasta.hora);
    uiEstado = notStarted ? 'programada' : 'cerrada';
  }

  return {
    identificador: dbItem.identificador,
    subasta_id: subasta.identificador || null,
    fecha: subasta.fecha || '',
    hora: subasta.hora || '',
    estado: uiEstado,
    en_vivo: uiEstado === 'abierta',
    tiempo_restante_segundos: getSecondsRemaining(subasta.fecha, subasta.hora),
    precio_actual: currentPrice,
    categoria: subasta.categoria || 'comun',
    moneda: moneda,
    subastado: dbItem.subastado || 'no',
    producto: {
      identificador: product.identificador,
      titulo: product.descripcioncompleta || 'Artículo sin título',
      descripcion: product.descripcioncatalogo || 'Sin descripción',
      image_url: imageUrl,
      images: allImages.length > 0 ? allImages : [imageUrl],
      seller_name: product.duenios?.personas?.nombre || 'Vendedor Anónimo',
      documento_origen: docOrigen,
      moneda: moneda,
      poliza: seguroObj.nropoliza ? {
        nroPoliza: seguroObj.nropoliza,
        compania: seguroObj.compania,
        polizaCombinada: seguroObj.polizacombinada,
        importe: Number(seguroObj.importe)
      } : null,
      historia: {
        artista: prodDet?.artista_diseniador || 'N/A',
        anio: prodDet?.anio_periodo || 'N/A',
        contexto: prodDet?.contexto_historico || infoHistorica || `Producto revisado por empleado ID ${product.revisor || 'desconocido'}`
      }
    },
    bid_count: bids.length,
    highest_bidder: highestBidderName,
    ends_at: endsAtStr
  };
};

let mockAuctions = [
  {
    identificador: 4,
    subasta_id: 1,
    fecha: '2026-06-08',
    hora: '18:00:00',
    estado: 'abierta',
    en_vivo: true,
    tiempo_restante_segundos: getSecondsRemaining('2026-06-08', '18:00:00'),
    precio_actual: 45000,
    categoria: 'oro',
    producto: {
      identificador: 104,
      titulo: 'Reloj Omega Seamaster Vintage 1965',
      descripcion: 'Omega Seamaster Vintage 1965. Caja de acero inoxidable, dial plateado con manecillas doradas, correa de cuero negro. Movimiento automático calibre 562 en excelente estado de funcionamiento.',
      image_url: 'https://via.placeholder.com/600x400/E0E0E0/808080?text=Sin+Imagen',
      duenio_id: 3,
      seller_name: 'Anticuario Madrid',
      historia: {
        artista: 'Omega',
        anio: '1965',
        contexto: 'Movimiento automático calibre 562, fabricado en Suiza, con calendario original.'
      }
    },
    bid_count: 28,
    highest_bidder: 'Usuario Postor', 
    ends_at: new Date(Date.now() + (2 * 3600 + 15 * 60) * 1000).toISOString() 
  },
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
      image_url: 'https://via.placeholder.com/600x400/E0E0E0/808080?text=Sin+Imagen',
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
    moneda: 'USD',
    producto: {
      identificador: 102,
      titulo: 'Rolex Submariner Date Gold',
      descripcion: 'Oyster, 41 mm, yellow gold. Blue dial and Cerachrom bezel. Excellent condition, includes certificate of authenticity and box.',
      image_url: 'https://via.placeholder.com/600x400/E0E0E0/808080?text=Sin+Imagen',
      duenio_id: 12,
      seller_name: 'Gems & Time LLC',
      moneda: 'USD',
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
      image_url: 'https://via.placeholder.com/600x400/E0E0E0/808080?text=Sin+Imagen',
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
  mockAuctions, 
  getConfigStatus() {
    const configured = isSupabaseConfigured();
    return {
      configured,
      url: process.env.EXPO_PUBLIC_SUPABASE_URL || 'Not Set',
    };
  },

  async getAuctions() {
    return this.getActiveAuctions();
  },

  async getActiveAuctions() {
    if (!isSupabaseConfigured()) {
      return { data: mapUiAuctions(mockAuctions), error: null };
    }

    try {
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
            duenio,
            duenios (
              personas (
                nombre
              )
            ),
            seguro:seguros (
              nropoliza,
              compania,
              polizacombinada,
              importe
            ),
            productos_detalles (
              informacion_historica,
              documento_origen,
              moneda,
              artista_diseniador,
              anio_periodo,
              contexto_historico
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
        return { data: [], error: error };
      }

      const openItems = (data || []).filter(item => {
        const subasta = getSubastaFromItem(item) || {};
        return subasta.estado !== 'cerrada' && subasta.estado !== 'carrada';
      });

      if (openItems.length === 0) {
        console.log('[SupabaseService] No items found in active auctions. Returning empty list.');
        return { data: [], error: null };
      }

      // Finalizar artículos expirados
      const nowVal = new Date();
      const subastaGroups = {};
      openItems.forEach(item => {
        const subId = getSubastaFromItem(item)?.identificador || 'default';
        if (!subastaGroups[subId]) subastaGroups[subId] = [];
        subastaGroups[subId].push(item);
      });

      let needRequery = false;
      for (const subId of Object.keys(subastaGroups)) {
        const itemsGroup = subastaGroups[subId].sort((a, b) => a.identificador - b.identificador);
        const activeIdx = itemsGroup.findIndex(item => item.subastado === 'no');
        
        let subastaStart = new Date();
        if (itemsGroup.length > 0) {
          const firstItem = itemsGroup[0];
          let subRef = getSubastaFromItem(firstItem);
          
          if (subRef?.fecha && subRef?.hora) {
            subastaStart = parseDateSafely(subRef.fecha, subRef.hora);
          }
        }

        itemsGroup.forEach((item, index) => {
          const itemEnd = new Date(+subastaStart + (index + 1) * 5 * 60 * 1000);
          item.calculated_ends_at = itemEnd.toISOString();
        });

        if (activeIdx !== -1) {
          const activeItem = itemsGroup[activeIdx];
          const itemEnd = new Date(activeItem.calculated_ends_at);
          if (nowVal >= itemEnd) {
            console.log(`[SupabaseService] Auto-finalizing expired item ${activeItem.identificador} (time limit 5 minutes elapsed)`);
            await supabaseService.autoFinalizeItem(
              activeItem.identificador,
              getSubastaFromItem(activeItem)?.identificador,
              activeItem.producto?.duenio,
              activeItem.producto?.identificador
            );
            needRequery = true;
          }
        }
      }

      if (needRequery) {
        return supabaseService.getActiveAuctions();
      }

      const productIds = openItems.map(item => item.producto?.identificador).filter(Boolean);
      const uniqueProductIds = [...new Set(productIds)];
      const firstPhotos = {};
      
      if (uniqueProductIds.length > 0) {
        try {
          // Obtener fotos
          const { data: allIds, error: idsErr } = await supabase
            .from('fotos')
            .select('identificador, producto')
            .in('producto', uniqueProductIds)
            .order('identificador', { ascending: true });

          if (!idsErr && allIds && allIds.length > 0) {
            const firstIds = [];
            const seenProds = new Set();
            for (const row of allIds) {
              if (!seenProds.has(row.producto)) {
                firstIds.push(row.identificador);
                seenProds.add(row.producto);
              }
            }

            if (firstIds.length > 0) {
              const { data: photosData, error: photosErr } = await supabase
                .from('fotos')
                .select('producto, foto')
                .in('identificador', firstIds);
              
              if (!photosErr && photosData) {
                for (const item of photosData) {
                  if (!firstPhotos[item.producto]) {
                    firstPhotos[item.producto] = [];
                  }
                  firstPhotos[item.producto].push(item);
                }
              }
            }
          }
        } catch (photoErr) {
          console.warn('[SupabaseService] Error fetching photos:', photoErr.message);
        }
      }

      const mappedData = openItems.map(item => {
        const prodId = item.producto?.identificador;
        const photos = prodId ? firstPhotos[prodId] : [];
        const itemWithPhotos = {
          ...item,
          producto: item.producto ? {
            ...item.producto,
            fotos: photos || []
          } : null
        };
        return mapDbItemToUi(itemWithPhotos);
      });
      return { data: mapUiAuctions(mappedData), error: null };
    } catch (err) {
      console.error('[SupabaseService] Connection error:', err);
      return { data: [], error: err };
    }
  },

  async getProductPhotos(productId) {
    if (!isSupabaseConfigured()) {
      return { data: [], error: null };
    }
    try {
      // Cargar fotos
      const { data: phData, error: phErr } = await supabase
        .from('fotos')
        .select('identificador, foto')
        .eq('producto', productId)
        .order('identificador', { ascending: true });
      
      if (phErr) throw phErr;

      const images = [];
      if (phData) {
        for (const row of phData) {
          if (row.foto) {
            const parsed = apiService.parseLegacyBytea(row.foto);
            if (parsed) images.push(parsed);
          }
        }
      }

      return { data: images, error: null };
    } catch (e) {
      console.warn('[SupabaseService] Error fetching product photos ids:', e.message);
      return { data: [], error: e };
    }
  },

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
          pujos_detalles (
            fechahora
          ),
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

      const mappedBids = (data || []).map(b => {
        const det = b.pujos_detalles && b.pujos_detalles.length > 0
          ? b.pujos_detalles[0]
          : b.pujos_detalles;
        return {
          identificador: b.identificador,
          importe: Number(b.importe),
          bidder: b.asistentes?.clientes?.personas?.nombre || 'Postor Anónimo',
          created_at: det?.fechahora || new Date().toISOString()
        };
      });

      return { data: mappedBids, error: null };
    } catch (err) {
      return { data: mockBidHistory[itemId.toString()] || [], error: null };
    }
  },

  async placeBid(itemId, amount, bidderName = 'Usuario Postor') {
    let targetItem;

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

    // Verificar medios de pago y multas
    try {
      const [paymentMethods, fines] = await Promise.all([
        apiService.getPaymentMethods(clienteId),
        apiService.getUserFines(clienteId)
      ]);

      if (!paymentMethods || paymentMethods.length === 0) {
        return { error: 'No puedes ofertar sin un medio de pago registrado. Agrégalo en tu Perfil.' };
      }

      const pendingFines = fines.filter(f => f.estado === 'pendiente');
      if (pendingFines.length > 0) {
        return { error: 'Tu cuenta está bloqueada temporalmente por tener multas pendientes de pago.' };
      }
    } catch (err) {
      return { error: 'Error al verificar tu cuenta. Intenta nuevamente.' };
    }

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
        auctionCategory = getSubastaFromItem(dbItem)?.categoria || 'comun';
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
      const subastaId = getSubastaFromItem(dbItem)?.identificador;

      console.log('[placeBid] Buscando asistente...', { clienteId, subastaId });
      const { data: assistantData, error: assistantErr } = await supabase
        .from('asistentes')
        .select('identificador')
        .eq('cliente', clienteId)
        .eq('subasta', subastaId);

      let asistenteId;
      if (!assistantErr && assistantData && assistantData.length > 0) {
        asistenteId = assistantData[0].identificador;
      } else {
        console.log('[placeBid] Creando asistente...');
        const { data: newAsistente, error: createAsistenteErr } = await supabase
          .from('asistentes')
          .insert({
            numeropostor: Math.floor(Math.random() * 1000) + 1,
            cliente: clienteId,
            subasta: subastaId
          })
          .select()
          .single();

        if (createAsistenteErr) {
          console.error('[placeBid] Error createAsistente:', createAsistenteErr);
          throw createAsistenteErr;
        }
        if (!newAsistente) throw new Error("newAsistente es null");
        asistenteId = newAsistente.identificador;
      }

      console.log('[placeBid] Insertando pujo...', { asistenteId, itemId, amount });
      const { data: newBid, error: insertBidErr } = await supabase
        .from('pujos')
        .insert({
          asistente: asistenteId,
          item: itemId,
          importe: amount,
          ganador: 'no'
        })
        .select()
        .single();

      if (insertBidErr) {
        console.error('[placeBid] Error insertBid:', insertBidErr);
        throw insertBidErr;
      }
      if (!newBid) throw new Error("newBid es null");

      console.log('[placeBid] Insertando pujos_detalles...', newBid.identificador);
      const { error: insertDetErr } = await supabase
        .from('pujos_detalles')
        .insert({
          identificador: newBid.identificador
        });

      if (insertDetErr) {
        console.error('[placeBid] Error insertDet:', insertDetErr);
        // Revertir si falla
        await supabase.from('pujos').delete().eq('identificador', newBid.identificador);
        throw insertDetErr;
      }

      console.log('[placeBid] Buscando updatedDbItems...');
      const { data: updatedDbItems, error: updateErr } = await supabase
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
            seguro:seguros (
              nropoliza,
              compania,
              polizacombinada,
              importe
            ),

            productos_detalles (
              moneda,
              informacion_historica,
              documento_origen
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

      if (updateErr) {
        console.error('[placeBid] Error fetching updatedDbItems:', updateErr);
        throw updateErr;
      }
      if (!updatedDbItems || updatedDbItems.length === 0) {
        throw new Error("No se pudo obtener el estado actualizado de la subasta.");
      }

      const updatedUiItem = mapDbItemToUi(updatedDbItems[0]);

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
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'itemscatalogo' }, (payload) => {
          callback({ isRefreshRequired: true, source: 'itemscatalogo' });
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'subastas' }, (payload) => {
          callback({ isRefreshRequired: true, source: 'subastas' });
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

  subscribeToNotifications(userId, callback) {
    if (!isSupabaseConfigured() || !userId) {
      return () => {};
    }
    
    console.log('[SupabaseService] Subscribing to notifications for user:', userId);
    const subscription = supabase
      .channel(`public:notificaciones:cliente:${userId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notificaciones', 
          filter: `cliente=eq.${userId}` 
        },
        (payload) => {
          console.log('[SupabaseService] Realtime notification received:', payload);
          if (payload.new) {
            callback(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('[SupabaseService] Unsubscribing from notifications for user:', userId);
      supabase.removeChannel(subscription);
    };
  },

  _notifyListeners(payload) {
    bidListeners.forEach(callback => callback(payload));
  },

  async autoFinalizeItem(catalogItemId, subastaId, productDuenioId, productId) {
    if (!isSupabaseConfigured()) return { success: true };
    
    // Evitar ejecuciones duplicadas
    if (global.finalizingItems && global.finalizingItems.has(catalogItemId)) {
      return { success: true, alreadyFinalized: true };
    }
    global.finalizingItems = global.finalizingItems || new Set();
    global.finalizingItems.add(catalogItemId);

    try {
      const checkAndCloseSubasta = async (subId) => {
        try {
          const { data: subCatalogs } = await supabase
            .from('catalogos')
            .select('identificador')
            .eq('subasta', subId);

          if (subCatalogs && subCatalogs.length > 0) {
            const subCatIds = subCatalogs.map(c => c.identificador);
            const { data: unsoldSiblingItems } = await supabase
              .from('itemscatalogo')
              .select('identificador')
              .in('catalogo', subCatIds)
              .eq('subastado', 'no')
              .neq('identificador', catalogItemId);

            if (!unsoldSiblingItems || unsoldSiblingItems.length === 0) {
              console.log(`[SupabaseService] All items in subasta ${subId} are subastado. Closing subasta.`);
              await supabase
                .from('subastas')
                .update({ estado: 'carrada' })
                .eq('identificador', subId);
            }
          }
        } catch (e) {
          console.warn('[SupabaseService] checkAndCloseSubasta error:', e.message);
        }
      };

      const { data: itemData, error: fetchErr } = await supabase
        .from('itemscatalogo')
        .select('subastado')
        .eq('identificador', catalogItemId)
        .single();
      
      if (fetchErr || !itemData || itemData.subastado === 'si') {
        return { success: true, alreadyFinalized: true };
      }

      const { data: bids, error: bidErr } = await supabase
        .from('pujos')
        .select(`
          identificador,
          importe,
          asistente,
          asistentes (
            cliente,
            clientes (
              personas (
                nombre
              )
            )
          )
        `)
        .eq('item', catalogItemId)
        .order('importe', { ascending: false });

      if (bidErr) throw bidErr;

      if (!bids || bids.length === 0) {
        await supabase
          .from('itemscatalogo')
          .update({ subastado: 'si' })
          .eq('identificador', catalogItemId);
        await checkAndCloseSubasta(subastaId);
        return { success: true, unsold: true };
      }

      const winner = bids[0];

      await supabase
        .from('pujos')
        .update({ ganador: 'si' })
        .eq('identificador', winner.identificador);

      if (bids.length > 1) {
        const otherIds = bids.slice(1).map(b => b.identificador);
        await supabase
          .from('pujos')
          .update({ ganador: 'no' })
          .in('identificador', otherIds);
      }

      await supabase
        .from('itemscatalogo')
        .update({ subastado: 'si' })
        .eq('identificador', catalogItemId);

      await checkAndCloseSubasta(subastaId);

      const { data: catItem } = await supabase
        .from('itemscatalogo')
        .select('comision')
        .eq('identificador', catalogItemId)
        .single();

      const commissionAmt = (winner.importe * (catItem?.comision || 10)) / 100;

      await supabase
        .from('registrodesubasta')
        .insert({
          subasta: subastaId,
          duenio: productDuenioId,
          producto: productId,
          cliente: winner.asistentes.cliente,
          importe: winner.importe,
          comision: commissionAmt
        });

      let subLocation = 'nuestro depósito central';
      try {
        const { data: subData } = await supabase
          .from('subastas')
          .select('ubicacion')
          .eq('identificador', subastaId)
          .single();
        if (subData?.ubicacion) {
          subLocation = subData.ubicacion;
        }
      } catch (subErr) {
        console.warn('[autoFinalizeItem] Could not fetch subasta location:', subErr.message);
      }

      const { data: pms, error: pmErr } = await supabase
        .from('mediosdepago')
        .select('*')
        .eq('cliente', winner.asistentes.cliente)
        .eq('estado', 'activo');

      if (!pmErr && pms && pms.length > 0) {
        const pm = pms.find(p => p.predeterminado === true) || pms[0];
        const currentLimit = Number(pm.monto || 0);
        const bidAmount = winner.importe;

        if (currentLimit >= bidAmount) {
          const newMonto = Math.max(0, currentLimit - bidAmount);
          await supabase
            .from('mediosdepago')
            .update({ monto: newMonto })
            .eq('identificador', pm.identificador);

          await supabase
            .from('notificaciones')
            .insert({
              cliente: winner.asistentes.cliente,
              titulo: '¡Artículo a tu nombre!',
              mensaje: `¡Felicidades! Has resultado ganador de la subasta con tu oferta de $${bidAmount.toLocaleString('es-AR')}. El artículo ha pasado a estar a tu nombre y se debitó el monto de tu medio de pago predeterminado. Puedes pasar a retirarlo por: ${subLocation}. O si lo prefieres, realiza el pago del envío y te lo llevamos a tu domicilio.`,
              leido: 'no',
              fechacreacion: new Date().toISOString()
            });
        } else {
          const fineAmt = bidAmount * 0.10;

          await supabase
            .from('multas')
            .insert({
              cliente: winner.asistentes.cliente,
              monto: fineAmt,
              descripcion: `Multa penalización 10% por ofertar por encima del límite ($${bidAmount} vs Límite $${currentLimit})`,
              estado: 'pendiente',
              fechacreacion: new Date().toISOString()
            });

          await supabase
            .from('multas')
            .insert({
              cliente: winner.asistentes.cliente,
              monto: bidAmount,
              descripcion: `Monto total de adjudicación pendiente de pago - Artículo #${catalogItemId}`,
              estado: 'pendiente',
              fechacreacion: new Date().toISOString()
            });

          await supabase
            .from('notificaciones')
            .insert({
              cliente: winner.asistentes.cliente,
              titulo: '¡Artículo adjudicado!',
              mensaje: `¡Felicidades! Ganaste el artículo con tu oferta de $${bidAmount.toLocaleString('es-AR')}. Debido a que superó tu límite disponible de $${currentLimit.toLocaleString('es-AR')}, se aplicó una multa del 10% ($${fineAmt.toLocaleString('es-AR')}). El artículo ya está a tu nombre. Para retirarlo por ${subLocation} (o solicitar envío a domicilio pagando la entrega), primero debes regularizar el pago de la adjudicación y la multa desde tu Perfil.`,
              leido: 'no',
              fechacreacion: new Date().toISOString()
            });
        }
      }
      return { success: true };
    } catch (err) {
      console.error('[SupabaseService] autoFinalizeItem error:', err.message);
      return { error: err.message };
    } finally {
      global.finalizingItems.delete(catalogItemId);
    }
  },

  async getUserWonCount(userId) {
    if (!isSupabaseConfigured()) {
      return 0;
    }
    try {
      const { data: attendees, error: attErr } = await supabase
        .from('asistentes')
        .select('identificador')
        .eq('cliente', userId);

      if (attErr || !attendees || attendees.length === 0) {
        return 0;
      }

      const attendeeIds = attendees.map(a => a.identificador);

      const { count, error: bidErr } = await supabase
        .from('pujos')
        .select('*', { count: 'exact', head: true })
        .eq('ganador', 'si')
        .in('asistente', attendeeIds);

      if (bidErr) throw bidErr;
      return count || 0;
    } catch (e) {
      console.warn('[SupabaseService] getUserWonCount error:', e.message);
      return 0;
    }
  },

  async getUserWonAuctions(userId) {
    if (!isSupabaseConfigured()) {
      return { data: [], error: null };
    }
    try {
      const { data: attendees, error: attErr } = await supabase
        .from('asistentes')
        .select('identificador')
        .eq('cliente', userId);

      if (attErr) throw attErr;
      if (!attendees || attendees.length === 0) {
        return { data: [], error: null };
      }

      const attendeeIds = attendees.map(a => a.identificador);

      const { data: wonBids, error: bidErr } = await supabase
        .from('pujos')
        .select('item')
        .eq('ganador', 'si')
        .in('asistente', attendeeIds);

      if (bidErr) throw bidErr;
      if (!wonBids || wonBids.length === 0) {
        return { data: [], error: null };
      }

      const wonItemIds = wonBids.map(b => b.item).filter(Boolean);
      if (wonItemIds.length === 0) {
        return { data: [], error: null };
      }

      const { data: items, error: itemsErr } = await supabase
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
            duenio,
            duenios (
              personas (
                nombre
              )
            ),
            seguro:seguros (
              nropoliza,
              compania,
              polizacombinada,
              importe
            ),
            productos_detalles (
              informacion_historica,
              documento_origen,
              moneda,
              artista_diseniador,
              anio_periodo,
              contexto_historico
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
        .in('identificador', wonItemIds);

      if (itemsErr) throw itemsErr;

      const productIds = (items || []).map(item => item.producto?.identificador).filter(Boolean);
      const firstPhotos = {};
      if (productIds.length > 0) {
        try {
          // Obtener fotos
          const { data: allIds, error: idsErr } = await supabase
            .from('fotos')
            .select('identificador, producto')
            .in('producto', productIds)
            .order('identificador', { ascending: true });

          if (!idsErr && allIds && allIds.length > 0) {
            const firstIds = [];
            const seenProds = new Set();
            for (const row of allIds) {
              if (!seenProds.has(row.producto)) {
                firstIds.push(row.identificador);
                seenProds.add(row.producto);
              }
            }

            if (firstIds.length > 0) {
              const { data: photosData, error: photosErr } = await supabase
                .from('fotos')
                .select('producto, foto')
                .in('identificador', firstIds);
              
              if (!photosErr && photosData) {
                for (const item of photosData) {
                  if (!firstPhotos[item.producto]) {
                    firstPhotos[item.producto] = [];
                  }
                  firstPhotos[item.producto].push(item);
                }
              }
            }
          }
        } catch (photoErr) {
          console.warn('[SupabaseService] getUserWonAuctions photos error:', photoErr.message);
        }
      }

      const mappedData = (items || []).map(item => {
        const prodId = item.producto?.identificador;
        const photos = prodId ? firstPhotos[prodId] : [];
        const itemWithPhotos = {
          ...item,
          producto: item.producto ? {
            ...item.producto,
            fotos: photos || []
          } : null
        };
        return mapDbItemToUi(itemWithPhotos);
      });

      return { data: mappedData, error: null };
    } catch (err) {
      console.warn('[SupabaseService] getUserWonAuctions error:', err.message);
      return { data: [], error: err };
    }
  }
};
