import { supabase } from './supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

// In-memory profile cache to avoid repeated DB calls within the same session
let _profileCache = null;
let _profileCacheToken = null;

let mockUsers = [
  {
    email: 'juan@mail.com',
    password: '123456',
    profile: {
      identificador: 3,
      documento: '33333333',
      nombre: 'Usuario Postor',
      direccion: 'Av. Corrientes 789',
      estado: 'activo',
      admitido: 'si',
      categoria: 'comun',
      cargo: 'Postor',
      foto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
    }
  },
  {
    email: 'revisor@subastas.com',
    password: '123456',
    profile: {
      identificador: 1,
      documento: '11111111',
      nombre: 'Empleado Revisor',
      direccion: 'Calle Falsa 123',
      estado: 'activo',
      admitido: 'si',
      categoria: 'comun',
      cargo: 'Revisor Técnico',
      foto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
    }
  }
];

let preRegisteredEmails = new Set(['juan@mail.com']);

let mockMyProducts = [
  {
    identificador: 201,
    titulo: 'Reloj Omega Seamaster Vintage 1965',
    descripcion: 'Omega Seamaster Vintage 1965, correa de cuero negro, caja de acero.',
    fecha: '2026-06-08',
    disponible: 'si',
    subastado: 'no',
    foto: 'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&w=600&q=80',
    location: 'Av. Corrientes 1234, Piso 5',
    seguro: {
      nroPoliza: 'POL-2026-A3-0045',
      compania: 'Seguros Internacionales S.A.',
      direccion: 'Av. Libertador 2590, CABA',
      telefono: '+54 11 5555-1234'
    }
  }
];

let mockPaymentMethods = [
  { identificador: 1, cliente: 3, tipo: 'tarjeta', proveedor: 'Visa', mascara: '**** **** **** 4242', monto: 75000000, estado: 'activo', moneda: 'ARS', predeterminado: true },
  { identificador: 2, cliente: 3, tipo: 'cuenta', proveedor: 'Banco Santander', mascara: 'Cuenta **** 8356', monto: 75000000, estado: 'activo', moneda: 'ARS', predeterminado: false },
  { identificador: 3, cliente: 3, tipo: 'cheque', proveedor: 'Cheque Certificado', mascara: 'Banco Central - Pre-aprobado', monto: 100000, estado: 'activo', moneda: 'ARS', predeterminado: false }
];

let mockFines = [
  { identificador: 1, cliente: 3, descripcion: 'Falta de pago en Subasta Rolex', monto: 1500, estado: 'pendiente', fechacreacion: new Date().toISOString() }
];

let mockNotifications = [
  { identificador: 1, cliente: 3, titulo: 'Bienvenido', mensaje: '¡Bienvenido a PujaYa! Tu cuenta ha sido creada y verificada.', leido: 'no', fechacreacion: new Date().toISOString() }
];

let mockChatMessages = [
  { identificador: 1, remitente: 1, destinatario: 3, mensaje: 'Hola! Vi tu reloj Omega Seamaster, ¿tienes algún certificado físico original?', fechacreacion: new Date(Date.now() - 3600000).toISOString(), leido: 'no' },
  { identificador: 2, remitente: 3, destinatario: 1, mensaje: 'Hola, sí! Tengo la tarjeta de garantía original de compra de 1965 y la factura original.', fechacreacion: new Date(Date.now() - 1800000).toISOString(), leido: 'no' }
];

let mockPaises = [
  { numero: 32, nombre: 'Argentina', nombreCorto: 'ARG', capital: 'Buenos Aires', nacionalidad: 'Argentina', idiomas: 'Español' },
  { numero: 76, nombre: 'Brasil', nombreCorto: 'BRA', capital: 'Brasilia', nacionalidad: 'Brasileña', idiomas: 'Portugués' },
  { numero: 152, nombre: 'Chile', nombreCorto: 'CHL', capital: 'Santiago', nacionalidad: 'Chilena', idiomas: 'Español' },
  { numero: 170, nombre: 'Colombia', nombreCorto: 'COL', capital: 'Bogotá', nacionalidad: 'Colombiana', idiomas: 'Español' },
  { numero: 858, nombre: 'Uruguay', nombreCorto: 'URY', capital: 'Montevideo', nacionalidad: 'Uruguaya', idiomas: 'Español' },
  { numero: 604, nombre: 'Perú', nombreCorto: 'PER', capital: 'Lima', nacionalidad: 'Peruana', idiomas: 'Español' },
  { numero: 840, nombre: 'Estados Unidos', nombreCorto: 'USA', capital: 'Washington D.C.', nacionalidad: 'Estadounidense', idiomas: 'Inglés' }
];

const uint8ArrayToBase64 = (uint8Array) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const len = uint8Array.length;
  const parts = [];
  let chunk = '';
  
  for (let i = 0; i < len; i += 3) {
    const b1 = uint8Array[i];
    const b2 = i + 1 < len ? uint8Array[i + 1] : NaN;
    const b3 = i + 2 < len ? uint8Array[i + 2] : NaN;
    
    const enc1 = b1 >> 2;
    const enc2 = ((b1 & 3) << 4) | (isNaN(b2) ? 0 : b2 >> 4);
    const enc3 = isNaN(b2) ? 64 : ((b2 & 15) << 2) | (isNaN(b3) ? 0 : b3 >> 6);
    const enc4 = isNaN(b3) ? 64 : b3 & 63;
    
    chunk += chars.charAt(enc1) + chars.charAt(enc2) +
             (enc3 === 64 ? '=' : chars.charAt(enc3)) +
             (enc4 === 64 ? '=' : chars.charAt(enc4));
             
    if (chunk.length > 8192) {
      parts.push(chunk);
      chunk = '';
    }
  }
  if (chunk) {
    parts.push(chunk);
  }
  return parts.join('');
};

const hexToBase64 = (hexStr) => {
  if (!hexStr) return '';
  let cleanHex = hexStr;
  if (hexStr.startsWith('\\x') || hexStr.startsWith('0x')) {
    cleanHex = hexStr.slice(2);
  }
  if (!cleanHex) return '';
  
  const len = cleanHex.length;
  const bytes = new Uint8Array(len / 2);
  
  const hexLookup = {
    '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    'a': 10, 'b': 11, 'c': 12, 'd': 13, 'e': 14, 'f': 15,
    'A': 10, 'B': 11, 'C': 12, 'D': 13, 'E': 14, 'F': 15
  };
  
  for (let i = 0; i < len; i += 2) {
    const high = hexLookup[cleanHex[i]] || 0;
    const low = hexLookup[cleanHex[i + 1]] || 0;
    bytes[i >> 1] = (high << 4) | low;
  }
  
  return uint8ArrayToBase64(bytes);
};

const base64ToHexStr = (base64) => {
  if (!base64) return null;
  const arrayBuffer = base64ToArrayBuffer(base64);
  const bytes = new Uint8Array(arrayBuffer);
  let hex = '\\x';
  for (let i = 0; i < bytes.length; i++) {
    const val = bytes[i].toString(16);
    hex += val.length === 1 ? '0' + val : val;
  }
  return hex;
};

const hexToUtf8 = (hexStr) => {
  if (!hexStr) return '';
  let cleanHex = hexStr;
  if (hexStr.startsWith('\\x') || hexStr.startsWith('0x')) {
    cleanHex = hexStr.slice(2);
  }
  let str = '';
  for (let i = 0; i < cleanHex.length; i += 2) {
    str += String.fromCharCode(parseInt(cleanHex.substr(i, 2), 16));
  }
  return str;
};

const parseLegacyBytea = (rawPhoto) => {
  if (!rawPhoto || typeof rawPhoto !== 'string') return null;
  
  let trimmed = rawPhoto.trim();
  let cleanHex = trimmed;
  let isHex = false;
  
  if (trimmed.startsWith('\\x') || trimmed.startsWith('0x')) {
    cleanHex = trimmed.slice(2);
    isHex = true;
  }
  
  if (isHex) {
    // Check if it is a decoded URL string (starts with 'http' -> hex 68747470, or 'data:image' -> hex 64617461)
    const lowerHex = cleanHex.toLowerCase();
    if (lowerHex.startsWith('68747470') || lowerHex.startsWith('64617461')) {
      return hexToUtf8(trimmed);
    }

    // A JSON object in hex must start with '{' (hex 7b/7B) and end with '}' (hex 7d/7D)
    const len = cleanHex.length;
    if (len >= 4 && 
        (cleanHex.startsWith('7b') || cleanHex.startsWith('7B')) && 
        (cleanHex.endsWith('7d') || cleanHex.endsWith('7D'))) {
      try {
        const decodedText = hexToUtf8(trimmed);
        if (decodedText.startsWith('{') && decodedText.endsWith('}')) {
          const obj = JSON.parse(decodedText);
          
          if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
            let asciiString = '';
            for (let i = 0; i < obj.data.length; i++) {
              asciiString += String.fromCharCode(obj.data[i]);
            }
            if (asciiString.startsWith('{') && asciiString.endsWith('}')) {
              const byteObj = JSON.parse(asciiString);
              const keys = Object.keys(byteObj).map(Number).sort((a, b) => a - b);
              const bytes = new Uint8Array(keys.length);
              for (let i = 0; i < keys.length; i++) {
                bytes[i] = byteObj[keys[i]];
              }
              return 'data:image/jpeg;base64,' + uint8ArrayToBase64(bytes);
            }
          }
          
          if (obj['0'] !== undefined) {
            const keys = Object.keys(obj).map(Number).sort((a, b) => a - b);
            const bytes = new Uint8Array(keys.length);
            for (let i = 0; i < keys.length; i++) {
              bytes[i] = obj[keys[i]];
            }
            return 'data:image/jpeg;base64,' + uint8ArrayToBase64(bytes);
          }
        }
      } catch (e) {
        console.warn('[ApiService] Failed to parse legacy bytea JSON:', e.message);
      }
    }
    
    return 'data:image/jpeg;base64,' + hexToBase64(trimmed);
  }
  
  if (trimmed.startsWith('http') || trimmed.startsWith('data:image')) {
    return trimmed;
  }
  
  return 'data:image/jpeg;base64,' + hexToBase64(trimmed);
};

const isSupabaseConfigured = () => {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  return url && key && url !== 'https://your-supabase-project.supabase.co' && key !== 'your-supabase-anon-key-here' && url !== '' && key !== '';
};

const base64ToArrayBuffer = (base64) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }

  let bufferLength = base64.length * 0.75;
  let len = base64.length;
  let i;
  let p = 0;
  let encoded1, encoded2, encoded3, encoded4;

  if (base64[base64.length - 1] === '=') {
    bufferLength--;
    if (base64[base64.length - 2] === '=') {
      bufferLength--;
    }
  }

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const bytes = new Uint8Array(arrayBuffer);

  for (i = 0; i < len; i += 4) {
    encoded1 = lookup[base64.charCodeAt(i)];
    encoded2 = lookup[base64.charCodeAt(i + 1)];
    encoded3 = lookup[base64.charCodeAt(i + 2)];
    encoded4 = lookup[base64.charCodeAt(i + 3)];

    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    if (encoded3 !== 64 && p < bufferLength) {
      bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    }
    if (encoded4 !== 64 && p < bufferLength) {
      bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
    }
  }

  return arrayBuffer;
};

const uploadDniPhoto = async (base64Data, subfolder, fileName) => {
  try {
    const arrayBuffer = base64ToArrayBuffer(base64Data);
    const filePath = `${subfolder}/${Date.now()}_${fileName}`;

    const { data, error } = await supabase.storage
      .from('dni-photos')
      .upload(filePath, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('dni-photos')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (err) {
    console.error('[Supabase Storage] Upload error:', err.message);
    throw new Error('No se pudo subir la foto del DNI: ' + err.message);
  }
};

const hashPassword = (ascii) => {
  if (!ascii) return '';
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }
  
  var mathPow = Math.pow;
  var maxWord = mathPow(2, 32);
  var lengthProperty = 'length';
  var i, j;
  var result = '';

  var words = [];
  var asciiLength = ascii[lengthProperty];
  
  var hash = [];
  var k = [];
  var primeCounter = 0;

  var isComposite = {};
  for (var candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = 1;
      }
      hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }
  
  ascii += '\x80';
  while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return ''; 
    words[i >> 2] |= j << ((3 - i % 4) * 8);
  }
  words[words[lengthProperty]] = ((asciiLength * 8) / maxWord) | 0;
  words[words[lengthProperty]] = (asciiLength * 8) | 0;
  
  for (j = 0; j < words[lengthProperty]; ) {
    var w = words.slice(j, j += 16);
    var oldHash = hash;
    hash = hash.slice(0, 8);
    
    for (i = 0; i < 64; i++) {
      var w15 = w[i - 15], w2 = w[i - 2];
      
      var s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      var s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      var ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      var maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      
      var temp1 = hash[7] + (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) + ch + k[i] + (w[i] = (i < 16 ? w[i] : (w[i - 16] + s0 + w[i - 7] + s1) | 0));
      var temp2 = (rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) + maj;
      
      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }
    
    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }
  
  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      var b = (hash[i] >> (j * 8)) & 255;
      result += ((b < 16) ? '0' : '') + b.toString(16);
    }
  }
  return result;
};

export const apiService = {
  parseLegacyBytea,
  getConfigStatus() {
    return {
      configured: isSupabaseConfigured(),
      url: process.env.EXPO_PUBLIC_SUPABASE_URL || 'Not Set',
    };
  },

  async login(email, password) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const hashedPassword = hashPassword(cleanPassword);

    if (!isSupabaseConfigured()) {
      console.log('[ApiService] Running Mock login.');
      const user = mockUsers.find(u => u.email === cleanEmail && (u.password === cleanPassword || u.password === hashedPassword));
      if (user) {
        const token = 'mock-jwt-token-for-' + cleanEmail;
        await AsyncStorage.setItem('userToken', token);
        return { token };
      }
      throw new Error('Credenciales inválidas (Simulación Offline)');
    }

    try {
      // Query credentials from personas_credenciales, joining personas and clientes
      const { data: cred, error: credError } = await supabase
        .from('personas_credenciales')
        .select(`
          identificador,
          email,
          passwordhash,
          personas:personas (
            identificador,
            documento,
            nombre,
            direccion,
            estado,
            clientes (
              admitido,
              categoria
            )
          )
        `)
        .eq('email', cleanEmail)
        .single();

      if (credError || !cred || !cred.personas) {
        if (credError) {
          console.warn('[ApiService] Error querying credentials from DB during login:', credError.message, credError);
        }
        throw new Error('El correo electrónico ingresado no está registrado.');
      }

      const person = {
        identificador: cred.personas.identificador,
        documento: cred.personas.documento,
        nombre: cred.personas.nombre,
        direccion: cred.personas.direccion,
        estado: cred.personas.estado === 'incativo' ? 'inactivo' : cred.personas.estado, // map db incativo to app inactivo
        email: cred.email,
        passwordhash: cred.passwordhash,
        clientes: cred.personas.clientes
      };

      const clientInfo = person.clientes && person.clientes.length > 0 ? person.clientes[0] : person.clientes;
      const isApproved = person.estado === 'activo' && clientInfo?.admitido === 'si';
      
      const { data: employee } = await supabase
        .from('empleados')
        .select('cargo')
        .eq('identificador', person.identificador)
        .single();

      if (!isApproved && !employee) {
        throw new Error('Tu cuenta se encuentra bajo revisión de nuestro equipo técnico.');
      }

      if (!person.passwordhash || (person.passwordhash !== cleanPassword && person.passwordhash !== hashedPassword)) {
        throw new Error('Contraseña incorrecta.');
      }

      const sessionToken = 'session-token-for-' + person.identificador;
      await AsyncStorage.setItem('userToken', sessionToken);
      return { token: sessionToken };
    } catch (error) {
      console.error('[ApiService] Login processing failed:', error.message);
      throw new Error(error.message || 'Error al iniciar sesión');
    }
  },

  async preRegister(userData) {
    const cleanEmail = userData.mail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      throw new Error('El correo electrónico no es válido.');
    }
    const docRegex = /^[0-9]{7,9}$/;
    if (!docRegex.test((userData.documento || '').trim())) {
      throw new Error('El documento debe ser puramente numérico y tener entre 7 y 9 dígitos.');
    }
    if (!isSupabaseConfigured()) {
      console.log('[ApiService] Running Mock pre-register.');
      preRegisteredEmails.add(cleanEmail);
      return { message: 'Solicitud de registro creada en memoria local (Modo Mock). Ingresa el código 123456 para continuar.' };
    }

    try {
      // Check existing email in personas_credenciales
      const { data: existingEmail, error: emailErr } = await supabase
        .from('personas_credenciales')
        .select('identificador, email, personas(estado)')
        .eq('email', cleanEmail)
        .maybeSingle();

      // Check existing document in personas
      const { data: existingDoc, error: docErr } = await supabase
        .from('personas')
        .select('identificador, documento, estado')
        .eq('documento', userData.documento)
        .maybeSingle();
      
      if (existingEmail) {
        const personState = existingEmail.personas?.estado === 'incativo' ? 'inactivo' : existingEmail.personas?.estado;
        if (personState === 'inactivo') {
          return { 
            message: 'Ya existe una solicitud de registro pendiente para este correo. Por favor, espera a que el revisor técnico apruebe tu cuenta.' 
          };
        } else {
          throw new Error('Ya existe un perfil activo con este correo electrónico.');
        }
      }

      if (existingDoc) {
        const personState = existingDoc.estado === 'incativo' ? 'inactivo' : existingDoc.estado;
        if (personState === 'inactivo') {
          throw new Error('Ya existe una solicitud de registro pendiente para este documento con otro correo.');
        } else {
          throw new Error('Ya existe un perfil registrado con este número de documento.');
        }
      }

      let frontUrl = '';
      let backUrl = '';
      
      const subfolder = userData.documento.trim();
      if (userData.foto_documento_frente) {
        frontUrl = await uploadDniPhoto(userData.foto_documento_frente, subfolder, 'frente.jpg');
      }
      if (userData.foto_documento_dorso) {
        backUrl = await uploadDniPhoto(userData.foto_documento_dorso, subfolder, 'dorso.jpg');
      }

      const combinedUrls = `${frontUrl},${backUrl}`;

      // Insert into personas (base table) - state mapped to 'incativo' (typo constraint in DB)
      const { data: person, error: personErr } = await supabase
        .from('personas')
        .insert({
          documento: userData.documento,
          nombre: userData.nombre,
          direccion: userData.direccion,
          estado: 'incativo',
          foto: userData.foto_selfie ? base64ToHexStr(userData.foto_selfie) : null
        })
        .select()
        .single();

      if (personErr) throw personErr;

      // Insert credentials into personas_credenciales
      const { error: credErr } = await supabase
        .from('personas_credenciales')
        .insert({
          identificador: person.identificador,
          email: cleanEmail,
          fotos_documento: combinedUrls,
          numeropais: userData.pais_id || null
        });

      if (credErr) {
        // Rollback insert in personas if credentials fail
        await supabase.from('personas').delete().eq('identificador', person.identificador);
        throw credErr;
      }

      return { message: 'Solicitud de registro creada con éxito. Tu cuenta está en revisión. Recibirás tu contraseña predefinida por correo una vez aprobada.' };
    } catch (error) {
      console.error('[ApiService] Pre-registration error:', error.message);
      throw new Error(error.message || 'Error en pre-registro');
    }
  },

  async verifyOtp(email, token) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.trim();

    if (!isSupabaseConfigured()) {
      console.log('[ApiService] Running Mock OTP verification.');
      if (cleanToken === '123456') {
        preRegisteredEmails.add(cleanEmail);
        return { message: 'Código verificado con éxito (Offline Mock).' };
      }
      throw new Error('Código de verificación inválido. Usa 123456 en modo offline.');
    }

    try {
      let data = null;
      let error = null;

      try {
        console.log('[ApiService] Verifying OTP with type: email for:', cleanEmail);
        const res = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanToken,
          type: 'email'
        });
        data = res.data;
        error = res.error;
      } catch (err) {
        error = err;
      }

      if (error) {
        console.log('[ApiService] OTP verification type:email failed, trying type:magiclink...');
        try {
          const res = await supabase.auth.verifyOtp({
            email: cleanEmail,
            token: cleanToken,
            type: 'magiclink'
          });
          if (!res.error) {
            data = res.data;
            error = null;
          }
        } catch (err) {
        }
      }

      if (error) {
        console.log('[ApiService] OTP verification type:magiclink failed, trying type:signup...');
        try {
          const res = await supabase.auth.verifyOtp({
            email: cleanEmail,
            token: cleanToken,
            type: 'signup'
          });
          if (!res.error) {
            data = res.data;
            error = null;
          }
        } catch (err) {
        }
      }

      if (error) {
        throw error;
      }

      // Resolve email to identificador from personas_credenciales
      const { data: cred, error: fetchCredErr } = await supabase
        .from('personas_credenciales')
        .select('identificador')
        .eq('email', cleanEmail)
        .single();

      if (fetchCredErr || !cred) {
        throw new Error('No se pudo encontrar el usuario para activar.');
      }

      const { error: updateErr } = await supabase
        .from('personas')
        .update({ estado: 'activo' })
        .eq('identificador', cred.identificador);

      if (updateErr) {
        console.warn('[ApiService] Failed to update persona status to active:', updateErr.message);
      }

      if (data?.session) {
        await AsyncStorage.setItem('userToken', data.session.access_token);
      }

      return { 
        message: 'Código verificado con éxito.',
        session: data?.session 
      };
    } catch (error) {
      console.error('[ApiService] OTP verification error:', error.message);
      throw new Error(error.message || 'Código de verificación incorrecto o expirado.');
    }
  },

  async updatePassword(email, password) {
    const cleanEmail = email.trim().toLowerCase();
    if (!isSupabaseConfigured()) {
      console.log('[ApiService] Running Mock update password.');
      const existing = mockUsers.find(u => u.email === cleanEmail);
      if (!existing) {
        mockUsers.push({
          email: cleanEmail,
          password,
          profile: {
            identificador: Math.floor(Math.random() * 1000) + 10,
            documento: 'DNI-' + Math.floor(Math.random() * 90000000 + 10000000),
            nombre: cleanEmail.split('@')[0],
            direccion: 'Dirección Registrada',
            estado: 'activo',
            admitido: 'si',
            categoria: 'comun'
          }
        });
      } else {
        existing.password = password;
      }
      const token = 'mock-jwt-token-for-' + cleanEmail;
      await AsyncStorage.setItem('userToken', token);
      return { message: 'Contraseña establecida con éxito (Offline Mock).' };
    }

    try {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData && sessionData.session) {
          const { error } = await supabase.auth.updateUser({
            password: password
          });
          if (error) {
            console.warn('[ApiService] Supabase auth updateUser failed:', error.message);
          }
        }
      } catch (authErr) {
        console.warn('[ApiService] Supabase auth session check failed:', authErr.message);
      }

      // Resolve email to identificador from personas_credenciales
      const { data: cred, error: fetchCredErr } = await supabase
        .from('personas_credenciales')
        .select('identificador')
        .eq('email', cleanEmail)
        .single();

      if (fetchCredErr || !cred) {
        throw new Error('No se pudo encontrar el usuario para actualizar la contraseña.');
      }

      const { error: updateErr } = await supabase
        .from('personas')
        .update({ estado: 'activo' })
        .eq('identificador', cred.identificador);

      if (updateErr) {
        console.warn('[ApiService] Failed to activate persona status on password update:', updateErr.message);
      }

      const { error: updateCredErr } = await supabase
        .from('personas_credenciales')
        .update({ passwordhash: hashPassword(password) })
        .eq('identificador', cred.identificador);

      if (updateCredErr) {
        console.warn('[ApiService] Failed to update passwordhash on credentials update:', updateCredErr.message);
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session) {
        await AsyncStorage.setItem('userToken', sessionData.session.access_token);
      }

      return { message: 'Contraseña guardada correctamente.' };
    } catch (error) {
      console.error('[ApiService] Update password error:', error.message);
      throw new Error(error.message || 'Error al guardar la contraseña.');
    }
  },

  async getProfile() {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) throw new Error('No hay sesión activa.');

    // Return cached profile if token hasn't changed (avoids repeated DB calls)
    if (_profileCache && _profileCacheToken === token) {
      return _profileCache;
    }

    let email = null;
    let clientId = null;

    if (token.startsWith('mock-jwt-token-for-')) {
      email = token.replace('mock-jwt-token-for-', '');
    } else if (token.startsWith('session-token-for-')) {
      clientId = parseInt(token.replace('session-token-for-', ''), 10);
    }

    if (!isSupabaseConfigured()) {
      if (email) {
        const user = mockUsers.find(u => u.email === email);
        if (user) return user.profile;
      }
      throw new Error('Sesión simulada no encontrada');
    }

    try {
      let personId = clientId;

      // If we only have email, resolve the person ID in a single lightweight query
      if (!personId && email) {
        const { data: cred, error: credErr } = await supabase
          .from('personas_credenciales')
          .select('identificador')
          .eq('email', email)
          .single();
        if (credErr || !cred) throw new Error('Perfil de usuario no encontrado.');
        personId = cred.identificador;
      }

      if (!personId) throw new Error('Token de sesión inválido.');

      // Single query with all needed joins
      const { data: person, error: personError } = await supabase
        .from('personas')
        .select(`
          identificador,
          documento,
          nombre,
          direccion,
          estado,
          foto,
          personas_credenciales ( email, numeropais ),
          clientes ( admitido, categoria ),
          empleados ( cargo )
        `)
        .eq('identificador', personId)
        .single();

      if (personError || !person) throw new Error('Perfil de usuario no encontrado en la base de datos.');

      const clientInfo = person.clientes && person.clientes.length > 0 ? person.clientes[0] : person.clientes;
      const employeeInfo = person.empleados && person.empleados.length > 0 ? person.empleados[0] : person.empleados;
      const creds = person.personas_credenciales && person.personas_credenciales.length > 0 ? person.personas_credenciales[0] : person.personas_credenciales;

      let selfieBase64 = null;
      if (person.foto) {
        selfieBase64 = parseLegacyBytea(person.foto);
      }

      return {
        identificador: person.identificador,
        documento: person.documento,
        nombre: person.nombre,
        direccion: person.direccion,
        estado: person.estado === 'incativo' ? 'inactivo' : person.estado,
        email: creds?.email || null,
        foto: selfieBase64,
        admitido: clientInfo?.admitido || 'no',
        categoria: clientInfo?.categoria || 'comun',
        cargo: employeeInfo?.cargo || null
      };

      // Store in cache for subsequent calls within the same session
      _profileCache = result;
      _profileCacheToken = token;
      return result;
    } catch (error) {
      console.error('[ApiService] getProfile error:', error.message);
      throw error;
    }
  },


  async uploadProduct(productData) {
    if (!isSupabaseConfigured()) {
      console.log('[ApiService] Running Mock uploadProduct.');
      
      const token = await AsyncStorage.getItem('userToken');
      let userId = 3; // default fallback
      if (token && token.startsWith('session-token-for-')) {
        userId = parseInt(token.replace('session-token-for-', ''), 10);
      }
      
      const newMockProdId = Math.floor(Math.random() * 1000) + 200;
      const newMockProduct = {
        identificador: newMockProdId,
        titulo: productData.titulo,
        descripcion: productData.descripcion,
        fecha: new Date().toISOString().split('T')[0],
        disponible: 'no',
        foto: productData.fotos && productData.fotos.length > 0 ? productData.fotos[0] : 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=600&q=80',
        moneda: productData.moneda || 'ARS',
        precio_base_propuesto: 1000,
        comision_propuesta: 10,
        propuesta_estado: 'en_revision',
        motivo_rechazo: null,
        contexto: productData.informacionHistorica || 'Sin información histórica.',
        duenio: userId,
        artista: productData.artista || null,
        periodo: productData.periodo || null,
        contextoHistorico: productData.contextoHistorico || null
      };
      
      mockMyProducts.push(newMockProduct);

      // Check count
      const userProds = mockMyProducts.filter(p => p.duenio === userId);
      const userProfile = mockUsers.find(u => u.profile?.identificador === userId)?.profile;
      const userName = userProfile?.nombre || 'Usuario Postor';

      // Check if subasta already exists for this user in mockAuctions
      const { supabaseService } = require('./supabaseService');
      const mockAuctionsList = supabaseService.mockAuctions || [];
      const subExists = mockAuctionsList.some(a => a.producto?.seller_name === userName);

      if (userProds.length >= 5 && !subExists) {
        console.log(`[ApiService Mock] User reached ${userProds.length} products. Auto-creating mock subasta...`);
        // Approve all user's products
        userProds.forEach(p => {
          p.disponible = 'si';
          p.propuesta_estado = 'aceptada';
        });

        const newSubId = Math.floor(Math.random() * 1000) + 100;
        const subDate = new Date(Date.now() + 11 * 24 * 3600 * 1000).toISOString().split('T')[0];

        userProds.forEach((p, idx) => {
          mockAuctionsList.push({
            identificador: Math.floor(Math.random() * 1000) + 2000,
            subasta_id: newSubId,
            fecha: subDate,
            hora: '12:00:00',
            estado: 'abierta',
            precio_actual: Number(p.precio_base_propuesto || 1000),
            bid_count: 0,
            highest_bidder: 'Nadie',
            categoria: 'comun',
            producto: {
              identificador: p.identificador,
              titulo: p.titulo || p.descripcioncompleta || 'Artículo',
              descripcion: p.descripcion || p.descripcioncatalogo || 'Sin descripción',
              image_url: p.foto || 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=600&q=80',
              seller_name: userName
            }
          });
        });

        await this.createNotification(userId, 'Subasta Especial Creada', `¡Felicidades! Has subido ${userProds.length} artículos. Se ha creado una subasta especial a tu nombre ("${userName}") programada para el ${subDate}.`);
      }

      return { success: true, productId: newMockProdId };
    }

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) throw new Error('Usuario no autenticado.');

      let userId = null;
      if (token.startsWith('session-token-for-')) {
        userId = parseInt(token.replace('session-token-for-', ''), 10);
      }

      if (!userId) throw new Error('Usuario no autenticado o sesión inválida.');

      const { data: duenio } = await supabase
        .from('duenios')
        .select('identificador')
        .eq('identificador', userId)
        .maybeSingle();

      if (!duenio) {
        console.log('[ApiService] Owner record not found. Creating owner profile...');
        const { error: duenioErr } = await supabase
          .from('duenios')
          .insert({
            identificador: userId,
            numeropais: null,
            verificaciónfinanciera: 'si',
            verificaciónjudicial: 'si',
            calificacionriesgo: 1,
            verificador: 1
          });
        if (duenioErr) throw duenioErr;
      }

      let docUrl = null;
      if (productData.documentoOrigenBase64) {
        docUrl = await uploadDniPhoto(productData.documentoOrigenBase64, 'documentos_origen', `doc_${Date.now()}.jpg`);
      }

      // Insert into productos (base table, no historic/docurl fields)
      const { data: newProduct, error: productErr } = await supabase
        .from('productos')
        .insert({
          fecha: new Date().toISOString().split('T')[0],
          disponible: 'no',
          descripcioncatalogo: productData.descripcion,
          descripcioncompleta: productData.titulo,
          revisor: 1, 
          duenio: userId,
          seguro: null
        })
        .select()
        .single();

      if (productErr) throw productErr;

      // Insert details into productos_detalles
      const { error: detErr } = await supabase
        .from('productos_detalles')
        .insert({
          identificador: newProduct.identificador,
          informacion_historica: productData.informacionHistorica || null,
          documento_origen: docUrl,
          moneda: productData.moneda || 'ARS',
          propuesta_estado: 'en_revision',
          artista_diseniador: productData.artista || null,
          anio_periodo: productData.periodo || null,
          contexto_historico: productData.contextoHistorico || null
        });

      if (detErr) {
        // Rollback product insert if details fail
        await supabase.from('productos').delete().eq('identificador', newProduct.identificador);
        throw detErr;
      }

      if (productData.fotos && productData.fotos.length > 0) {
        const photoInserts = productData.fotos.map(base64Str => {
          return supabase
            .from('fotos')
            .insert({
              producto: newProduct.identificador,
              foto: base64ToHexStr(base64Str)
            });
        });
        const results = await Promise.all(photoInserts);
        const errResult = results.find(r => r.error);
        if (errResult) {
          throw errResult.error;
        }
      }

      // Check count of user products in Supabase
      const { count, error: countErr } = await supabase
        .from('productos')
        .select('*', { count: 'exact', head: true })
        .eq('duenio', userId);

      if (countErr) {
        console.warn('Error counting user products:', countErr.message);
      } else {
        const { data: persona } = await supabase
          .from('personas')
          .select('nombre')
          .eq('identificador', userId)
          .single();
        const userName = persona?.nombre || 'Usuario';

        // Check if catalog named userName already exists
        const { data: existingCatalog } = await supabase
          .from('catalogos')
          .select('identificador')
          .eq('descripcion', userName)
          .maybeSingle();

        if (count >= 5 && !existingCatalog) {
          console.log(`[ApiService] User has ${count} products. Creating auto-subasta named: ${userName}`);

          // 1. Fetch all user's products
          const { data: userProds, error: fetchProdsErr } = await supabase
            .from('productos')
            .select('identificador')
            .eq('duenio', userId);
          
          if (!fetchProdsErr && userProds) {
            const prodIds = userProds.map(p => p.identificador);
            
            // 2. Approve all these products
            await supabase
              .from('productos_detalles')
              .update({
                propuesta_estado: 'aceptada',
                precio_base_propuesto: 1000.00,
                comision_propuesta: 10.00
              })
              .in('identificador', prodIds);

            await supabase
              .from('productos')
              .update({ disponible: 'si' })
              .in('identificador', prodIds);

            // 3. Create subasta
            const subDate = new Date(Date.now() + 11 * 24 * 3600 * 1000).toISOString().split('T')[0];
            const { data: newSub, error: subErr } = await supabase
              .from('subastas')
              .insert({
                fecha: subDate,
                hora: '12:00:00',
                estado: 'abierta',
                ubicacion: 'Subasta de ' + userName,
                capacidadasistentes: 100,
                tienedeposito: 'no',
                seguridadpropia: 'no',
                categoria: 'comun',
                subastador: null
              })
              .select()
              .single();
            
            if (!subErr && newSub) {
              // 4. Create catalog named after user
              const { data: catalog, error: catErr } = await supabase
                .from('catalogos')
                .insert({
                  descripcion: userName,
                  subasta: newSub.identificador,
                  responsable: 1
                })
                .select()
                .single();

              if (!catErr && catalog) {
                // 5. Create itemscatalogo for each product
                for (const pId of prodIds) {
                  await supabase
                    .from('itemscatalogo')
                    .insert({
                      catalogo: catalog.identificador,
                      producto: pId,
                      preciobase: 1000.00,
                      comision: 10.00,
                      subastado: 'no'
                    });
                }
              }
            }

            // 6. Notify user
            await this.createNotification(
              userId, 
              'Subasta Especial Creada', 
              `¡Felicidades! Has subido ${count} artículos. Se ha creado una subasta especial a tu nombre ("${userName}") programada para el ${subDate}.`
            );
          }
        }
      }

      return { success: true, productId: newProduct.identificador };
    } catch (error) {
      console.error('[ApiService] uploadProduct error:', error.message);
      throw new Error(error.message || 'Error al subir el producto.');
    }
  },

  async getUserProducts() {
    if (!isSupabaseConfigured()) {
      return mockMyProducts;
    }

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) throw new Error('Usuario no autenticado.');

      let userId = null;
      if (token.startsWith('session-token-for-')) {
        userId = parseInt(token.replace('session-token-for-', ''), 10);
      }

      if (!userId) return [];

      const { data, error } = await supabase
          .from('productos')
          .select(`
            identificador,
            fecha,
            disponible,
            descripcioncatalogo,
            descripcioncompleta,
            seguro:seguros (
              nropoliza,
              compania,
              polizacombinada,
              importe
            ),
            itemscatalogo (
              subastado,
              catalogo:catalogos (
                subastas (
                  ubicacion,
                  fecha,
                  hora
                )
              )
            ),
            productos_detalles (
              informacion_historica,
              documento_origen,
              moneda,
              precio_base_propuesto,
              comision_propuesta,
              propuesta_estado,
              motivo_rechazo,
              direccion_inspeccion
            )
          `)
          .eq('duenio', userId);

      if (error) throw error;

      // Fetch first photo for each product separately to avoid statement timeouts
      const firstPhotos = {};
      if (data && data.length > 0) {
        const productIds = data.map(p => p.identificador);
        const { data: photosData, error: photosError } = await supabase
          .from('fotos')
          .select('producto, foto')
          .in('producto', productIds);
        
        if (!photosError && photosData) {
          photosData.forEach(item => {
            if (!firstPhotos[item.producto]) {
              firstPhotos[item.producto] = item.foto;
            }
          });
        }
      }

      return (data || []).map(p => {
        let finalFoto = 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=600&q=80';
        const productPhoto = firstPhotos[p.identificador];
        if (productPhoto) {
          finalFoto = parseLegacyBytea(productPhoto) || finalFoto;
        }

        let location = 'Av. Corrientes 1234, Piso 5';
        let subastaInfo = null;
        let subastadoVal = 'no';
        if (p.itemscatalogo) {
          const item = Array.isArray(p.itemscatalogo)
            ? (p.itemscatalogo.length > 0 ? p.itemscatalogo[0] : null)
            : p.itemscatalogo;
          if (item) {
            subastadoVal = item.subastado || 'no';
            location = item.catalogo?.subastas?.ubicacion || location;
            subastaInfo = item.catalogo?.subastas ? {
              fecha: item.catalogo.subastas.fecha,
              hora: item.catalogo.subastas.hora,
              ubicacion: item.catalogo.subastas.ubicacion
            } : null;
          }
        }

        let insurance = null;
        if (p.seguro) {
          const sObj = Array.isArray(p.seguro) ? p.seguro[0] : p.seguro;
          if (sObj) {
            insurance = {
              nroPoliza: sObj.nropoliza,
              compania: sObj.compania,
              importe: sObj.importe,
              polizaCombinada: sObj.polizacombinada,
              direccion: 'Av. Libertador 2590, CABA',
              telefono: '+54 11 5555-1234'
            };
          }
        }

        const details = p.productos_detalles && p.productos_detalles.length > 0
          ? p.productos_detalles[0]
          : p.productos_detalles;

        return {
          identificador: p.identificador,
          titulo: p.descripcioncompleta,
          descripcion: p.descripcioncatalogo,
          fecha: p.fecha,
          disponible: p.disponible,
          subastado: subastadoVal,
          foto: finalFoto,
          location,
          subastaInfo,
          subasta_info: subastaInfo,
          seguro: insurance,
          contexto: details?.informacion_historica || 'No Posee',
          documento_origen: details?.documento_origen || null,
          moneda: details?.moneda || 'ARS',
          precio_base_propuesto: details?.precio_base_propuesto || null,
          comision_propuesta: details?.comision_propuesta || null,
          propuesta_estado: details?.propuesta_estado || 'en_revision',
          motivo_rechazo: details?.motivo_rechazo || null,
          direccion_inspeccion: details?.direccion_inspeccion || null
        };
      });
    } catch (error) {
      console.error('[ApiService] getUserProducts error:', error.message);
      return [];
    }
  },

  async logout() {
    // Clear profile cache on logout
    _profileCache = null;
    _profileCacheToken = null;
    await AsyncStorage.removeItem('userToken');
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
  },


  async getPaises() {
    if (!isSupabaseConfigured()) {
      return mockPaises;
    }
    try {
      const { data, error } = await supabase
        .from('paises')
        .select('*')
        .order('nombre', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('[ApiService] Error fetching paises:', err.message);
      return mockPaises;
    }
  },

  async getPaymentMethods(userId) {
    if (!isSupabaseConfigured()) {
      return mockPaymentMethods.filter(m => m.cliente === userId);
    }
    try {
      const { data, error } = await supabase
        .from('mediosdepago')
        .select('*')
        .eq('cliente', userId);
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('[ApiService] Error fetching payment methods:', err.message);
      return [];
    }
  },

  async addPaymentMethod(userId, payload) {
    const defaultEstado = payload.tipo === 'tarjeta' ? 'activo' : 'pendiente';
    const chosenMoneda = payload.moneda || 'ARS';
    let limitAmount = Number(payload.monto || 0);
    if (payload.tipo === 'tarjeta' || payload.tipo === 'cuenta') {
      limitAmount = chosenMoneda === 'USD' ? 50000.00 : 75000000.00;
    }
    if (!isSupabaseConfigured()) {
      const newMethod = {
        identificador: Math.floor(Math.random() * 1000) + 10,
        cliente: userId,
        tipo: payload.tipo,
        proveedor: payload.proveedor,
        mascara: payload.mascara,
        monto: limitAmount,
        estado: defaultEstado,
        moneda: chosenMoneda
      };
      mockPaymentMethods.push(newMethod);
      return { success: true, method: newMethod };
    }
    try {
      const { data, error } = await supabase
        .from('mediosdepago')
        .insert({
          cliente: userId,
          tipo: payload.tipo,
          proveedor: payload.proveedor,
          mascara: payload.mascara,
          monto: limitAmount,
          estado: defaultEstado,
          moneda: chosenMoneda
        })
        .select()
        .single();
      if (error) throw error;
      return { success: true, method: data };
    } catch (err) {
      console.error('[ApiService] Error adding payment method:', err.message);
      throw err;
    }
  },

  async updatePaymentMethodAmount(pmId, newAmount) {
    if (!isSupabaseConfigured()) {
      const pm = mockPaymentMethods.find(m => m.identificador === pmId);
      if (pm) {
        pm.monto = newAmount;
        return { success: true, method: pm };
      }
      return { success: false, error: 'Payment method not found' };
    }
    try {
      const { data, error } = await supabase
        .from('mediosdepago')
        .update({ monto: newAmount })
        .eq('identificador', pmId)
        .select()
        .single();
      if (error) throw error;
      return { success: true, method: data };
    } catch (err) {
      console.error('[ApiService] Error updating payment method amount:', err.message);
      throw err;
    }
  },

  async setDefaultPaymentMethod(userId, pmId) {
    if (!isSupabaseConfigured()) {
      mockPaymentMethods.forEach(m => {
        if (m.cliente === userId) {
          m.predeterminado = (m.identificador === pmId);
        }
      });
      return { success: true };
    }
    try {
      // First, set all user's payment methods to predeterminado = false
      await supabase
        .from('mediosdepago')
        .update({ predeterminado: false })
        .eq('cliente', userId);
      // Then, set the selected one to predeterminado = true
      const { data, error } = await supabase
        .from('mediosdepago')
        .update({ predeterminado: true })
        .eq('identificador', pmId)
        .select()
        .single();
      if (error) throw error;
      return { success: true, method: data };
    } catch (err) {
      console.error('[ApiService] Error setting default payment method:', err.message);
      throw err;
    }
  },

  async validateCardWithMercadoPago(cardNumber) {
    // Simular llamada a API de Mercado Pago
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Algoritmo de Luhn para validación básica de números de tarjetas
    const cleanNum = cardNumber.replace(/\D/g, '');
    if (cleanNum.length < 13 || cleanNum.length > 19) {
      throw new Error('Número de tarjeta inválido (largo incorrecto)');
    }
    
    let sum = 0;
    let shouldDouble = false;
    for (let i = cleanNum.length - 1; i >= 0; i--) {
      let digit = parseInt(cleanNum.charAt(i), 10);
      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      shouldDouble = !shouldDouble;
    }
    
    const isValid = (sum % 10) === 0;
    if (!isValid) {
      throw new Error('Mercado Pago: La tarjeta no es válida o fue rechazada por la entidad emisora.');
    }
    
    // Identificar la marca a través del BIN (primer dígito)
    let brand = 'Visa';
    if (cleanNum.startsWith('5')) {
      brand = 'Mastercard';
    } else if (cleanNum.startsWith('3')) {
      brand = 'Amex';
    }
    
    return { success: true, brand };
  },

  async getUserFines(userId) {
    if (!isSupabaseConfigured()) {
      return mockFines.filter(f => f.cliente === userId);
    }
    try {
      const { data, error } = await supabase
        .from('multas')
        .select('*')
        .eq('cliente', userId)
        .order('fechacreacion', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('[ApiService] Error fetching user fines:', err.message);
      return [];
    }
  },

  async payFine(fineId) {
    if (!isSupabaseConfigured()) {
      const fine = mockFines.find(f => f.identificador === fineId);
      if (fine) {
        fine.estado = 'pagada';
      }
      return { success: true };
    }
    try {
      const { error } = await supabase
        .from('multas')
        .update({ estado: 'pagada' })
        .eq('identificador', fineId);
      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('[ApiService] Error paying fine:', err.message);
      throw err;
    }
  },

  async getUserNotifications(userId) {
    if (!isSupabaseConfigured()) {
      return mockNotifications.filter(n => n.cliente === userId);
    }
    try {
      const { data, error } = await supabase
        .from('notificaciones')
        .select('*')
        .eq('cliente', userId)
        .order('fechacreacion', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('[ApiService] Error fetching notifications:', err.message);
      return [];
    }
  },

  async getUserWonAuctions(userId) {
    if (!isSupabaseConfigured()) {
      return [
        {
          identificador: 104,
          subasta_id: 1,
          fecha: '2026-06-08',
          hora: '18:00:00',
          estado: 'cerrada',
          en_vivo: false,
          tiempo_restante_segundos: 0,
          precio_actual: 45000,
          categoria: 'oro',
          moneda: 'ARS',
          subastado: 'si',
          highest_bidder: 'Usuario Postor',
          producto: {
            identificador: 104,
            titulo: 'Reloj Omega Seamaster Vintage 1965 (Adjudicado)',
            descripcion: 'Omega Seamaster Vintage 1965, correa de cuero negro, caja de acero.',
            image_url: 'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&w=600&q=80',
            images: ['https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&w=600&q=80'],
            seller_name: 'Vendedor Anónimo',
            moneda: 'ARS',
            poliza: null,
            historia: {
              artista: 'Omega',
              anio: '1965',
              contexto: 'Reloj clásico de colección'
            }
          },
          bid_count: 3,
          ends_at: new Date(Date.now() - 24 * 3600000).toISOString()
        }
      ];
    }
    try {
      const { supabaseService } = require('./supabaseService');
      const { data, error } = await supabaseService.getUserWonAuctions(userId);
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('[ApiService] Error fetching won auctions:', err.message);
      return [];
    }
  },

  async markNotificationAsRead(notificationId) {
    if (!isSupabaseConfigured()) {
      const notification = mockNotifications.find(n => n.identificador === notificationId);
      if (notification) {
        notification.leido = 'si';
      }
      return { success: true };
    }
    try {
      const { error } = await supabase
        .from('notificaciones')
        .update({ leido: 'si' })
        .eq('identificador', notificationId);
      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('[ApiService] Error marking notification read:', err.message);
      return { error: err.message };
    }
  },

  async createNotification(userId, title, message) {
    if (!isSupabaseConfigured()) {
      const newNotif = {
        identificador: Math.floor(Math.random() * 10000) + 1,
        cliente: userId,
        titulo: title,
        mensaje: message,
        leido: 'no',
        fechacreacion: new Date().toISOString()
      };
      mockNotifications.push(newNotif);
      return { success: true, notification: newNotif };
    }
    try {
      const { data, error } = await supabase
        .from('notificaciones')
        .insert({
          cliente: userId,
          titulo: title,
          mensaje: message,
          leido: 'no'
        })
        .select()
        .single();
      if (error) throw error;
      return { success: true, notification: data };
    } catch (err) {
      console.error('[ApiService] Error creating notification:', err.message);
      return { error: err.message };
    }
  },

  async getPendingClients() {
    if (!isSupabaseConfigured()) {
      return mockUsers
        .filter(u => u.profile && u.profile.admitido === 'no')
        .map(u => ({
          identificador: u.profile.identificador,
          documento: u.profile.documento,
          nombre: u.profile.nombre,
          direccion: u.profile.direccion,
          estado: u.profile.estado,
          email: u.email,
          foto: null, 
          fotos_documento: 'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4,https://images.unsplash.com/photo-1554774853-aae0a22c8aa4'
        }));
    }
    try {
      const { data, error } = await supabase
        .from('personas')
        .select(`
          identificador,
          documento,
          nombre,
          direccion,
          estado,
          foto,
          personas_credenciales (
            email,
            fotos_documento
          )
        `)
        .eq('estado', 'incativo'); // query DB with typo state constraint incativo
      
      if (error) throw error;

      return (data || []).map(p => {
        let selfieBase64 = null;
        if (p.foto) {
          selfieBase64 = parseLegacyBytea(p.foto);
        }
        const creds = p.personas_credenciales && p.personas_credenciales.length > 0 
          ? p.personas_credenciales[0] 
          : p.personas_credenciales;
        return {
          identificador: p.identificador,
          documento: p.documento,
          nombre: p.nombre,
          direccion: p.direccion,
          estado: 'inactivo', // map back to 'inactivo' for UI compatibility
          email: creds?.email || '',
          foto: selfieBase64,
          fotos_documento: creds?.fotos_documento || ''
        };
      });
    } catch (err) {
      console.error('[ApiService] Error getting pending clients:', err.message);
      return [];
    }
  },

  async approveClient(clientId, password, category = 'comun') {
    if (!isSupabaseConfigured()) {
      const user = mockUsers.find(u => u.profile && u.profile.identificador === clientId);
      if (user) {
        user.profile.admitido = 'si';
        user.profile.estado = 'activo';
        user.profile.categoria = category;
        user.password = password; 
      }
      return { success: true, emailSimulated: `Hola ${user?.profile?.nombre || 'Cliente'},\n\n¡Felicidades! Tu cuenta de PujaYa! ha sido aprobada por nuestro revisor técnico.\n\nTu contraseña predefinida de acceso es: ${password}\n\nYa puedes ingresar a la app.` };
    }
    try {
      const { data: personaInfo, error: fetchErr } = await supabase
        .from('personas')
        .select(`
          nombre,
          personas_credenciales (
            email,
            numeropais
          )
        `)
        .eq('identificador', clientId)
        .single();
      
      if (fetchErr) throw fetchErr;

      const creds = personaInfo.personas_credenciales && personaInfo.personas_credenciales.length > 0
        ? personaInfo.personas_credenciales[0]
        : personaInfo.personas_credenciales;

      const { error: personErr } = await supabase
        .from('personas')
        .update({ 
          estado: 'activo'
        })
        .eq('identificador', clientId);

      if (personErr) throw personErr;

      const { error: credErr } = await supabase
        .from('personas_credenciales')
        .update({ 
          passwordhash: hashPassword(password)
        })
        .eq('identificador', clientId);

      if (credErr) throw credErr;

      const { error: clientErr } = await supabase
        .from('clientes')
        .insert({ 
          identificador: clientId,
          numeropais: creds?.numeropais || null,
          admitido: 'si',
          categoria: category,
          verificador: 1
        });

      if (clientErr) throw clientErr;

      const emailContent = `SIMULACION ENVIO CORREO APROBACION:\nPara: ${creds?.email}\nAsunto: Cuenta Aprobada - PujaYa!\n\nHola ${personaInfo.nombre},\n\n¡Felicidades! Tu cuenta ha sido aprobada por nuestro revisor técnico.\n\nTu contraseña predefinida de acceso es: ${password}\n\nYa puedes ingresar a la app.`;
      console.log(emailContent);

      return { success: true, emailSimulated: emailContent };
    } catch (err) {
      console.error('[ApiService] Error approving client:', err.message);
      throw err;
    }
  },

  async rejectClient(clientId, reason) {
    if (!isSupabaseConfigured()) {
      const idx = mockUsers.findIndex(u => u.profile && u.profile.identificador === clientId);
      let user = null;
      if (idx !== -1) {
        user = mockUsers[idx];
        mockUsers.splice(idx, 1);
      }
      return { success: true, emailSimulated: `Hola ${user?.profile?.nombre || 'Cliente'},\n\nLamentamos informarte que tu solicitud de registro en PujaYa! ha sido rechazada por nuestro revisor técnico.\n\nMotivo del rechazo:\n${reason}\n\nSi deseas volver a registrarte, asegúrate de corregir los inconvenientes mencionados.` };
    }

    try {
      const { data: personaInfo, error: fetchErr } = await supabase
        .from('personas')
        .select(`
          nombre,
          documento,
          personas_credenciales (
            email
          )
        `)
        .eq('identificador', clientId)
        .single();

      if (fetchErr) throw fetchErr;

      const creds = personaInfo.personas_credenciales && personaInfo.personas_credenciales.length > 0
        ? personaInfo.personas_credenciales[0]
        : personaInfo.personas_credenciales;

      const subfolder = personaInfo.documento.trim();
      try {
        const { data: fileList, error: listErr } = await supabase.storage
          .from('dni-photos')
          .list(subfolder);

        if (!listErr && fileList && fileList.length > 0) {
          const filesToRemove = fileList.map(f => `${subfolder}/${f.name}`);
          const { error: removeErr } = await supabase.storage
            .from('dni-photos')
            .remove(filesToRemove);
          if (removeErr) {
            console.warn('[ApiService] Warning: Failed to clean up storage files on rejection:', removeErr.message);
          }
        }
      } catch (storageErr) {
        console.warn('[ApiService] Warning: Storage cleanup exception:', storageErr.message);
      }

      const { error: deleteErr } = await supabase
        .from('personas')
        .delete()
        .eq('identificador', clientId);

      if (deleteErr) throw deleteErr;

      const emailContent = `SIMULACION ENVIO CORREO RECHAZO:\nPara: ${creds?.email}\nAsunto: Registro Rechazado - PujaYa!\n\nHola ${personaInfo.nombre},\n\nLamentamos informarte que tu solicitud de registro en PujaYa! ha sido rechazada por nuestro revisor técnico.\n\nMotivo del rechazo:\n${reason}\n\nSi deseas volver a registrarte, asegúrate de corregir los inconvenientes mencionados.`;
      console.log(emailContent);

      return { success: true, emailSimulated: emailContent };
    } catch (err) {
      console.error('[ApiService] Error rejecting client:', err.message);
      throw err;
    }
  },

  async getActiveClients() {
    if (!isSupabaseConfigured()) {
      return mockUsers
        .filter(u => u.profile && u.profile.admitido === 'si')
        .map(u => ({
          identificador: u.profile.identificador,
          documento: u.profile.documento,
          nombre: u.profile.nombre,
          direccion: u.profile.direccion,
          estado: u.profile.estado,
          email: u.email,
          categoria: u.profile.categoria || 'comun'
        }));
    }
    try {
      const { data, error } = await supabase
        .from('personas')
        .select(`
          identificador,
          documento,
          nombre,
          direccion,
          estado,
          personas_credenciales ( email ),
          clientes ( categoria, admitido )
        `)
        .eq('estado', 'activo');
      
      if (error) throw error;
      
      return (data || [])
        .filter(p => {
          const clientInfo = p.clientes && p.clientes.length > 0 ? p.clientes[0] : p.clientes;
          return clientInfo && clientInfo.admitido === 'si';
        })
        .map(p => {
          const creds = p.personas_credenciales && p.personas_credenciales.length > 0 
            ? p.personas_credenciales[0] 
            : p.personas_credenciales;
          const clientInfo = p.clientes && p.clientes.length > 0 
            ? p.clientes[0] 
            : p.clientes;
          return {
            identificador: p.identificador,
            documento: p.documento,
            nombre: p.nombre,
            direccion: p.direccion,
            estado: p.estado,
            email: creds?.email || '',
            categoria: clientInfo?.categoria || 'comun'
          };
        });
    } catch (err) {
      console.error('[ApiService] Error getting active clients:', err.message);
      return [];
    }
  },

  async updateClientCategory(clientId, category) {
    if (!isSupabaseConfigured()) {
      const user = mockUsers.find(u => u.profile && u.profile.identificador === clientId);
      if (user) {
        user.profile.categoria = category;
      }
      return { success: true };
    }
    try {
      const { error } = await supabase
        .from('clientes')
        .update({ categoria: category })
        .eq('identificador', clientId);
      
      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('[ApiService] Error updating client category:', err.message);
      throw err;
    }
  },

  async resetPasswordRequest(email) {
    const cleanEmail = email.trim().toLowerCase();
    if (!isSupabaseConfigured()) {
      return { success: true, message: 'Código enviado (Modo Mock). Usa el código 123456.' };
    }
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail
      });
      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('[ApiService] Reset password request error:', err.message);
      throw err;
    }
  },

  async resetPasswordConfirm(email, token, newPassword) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.trim();
    if (!isSupabaseConfigured()) {
      const user = mockUsers.find(u => u.email === cleanEmail);
      if (user) {
        user.password = newPassword;
      }
      return { success: true };
    }
    try {
      let data = null;
      let error = null;

      try {
        const res = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanToken,
          type: 'recovery'
        });
        data = res.data;
        error = res.error;
      } catch (err) {
        error = err;
      }

      if (error) {
        try {
          const res = await supabase.auth.verifyOtp({
            email: cleanEmail,
            token: cleanToken,
            type: 'email'
          });
          data = res.data;
          error = res.error;
        } catch (e) {
        }
      }

      if (error) throw error;

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData && sessionData.session) {
          const { error: passErr } = await supabase.auth.updateUser({
            password: newPassword
          });
          if (passErr) {
            console.warn('[ApiService] Supabase auth updateUser failed during reset:', passErr.message);
          }
        }
      } catch (authErr) {
        console.warn('[ApiService] Supabase auth session check failed during reset:', authErr.message);
      }

      // Resolve email to identificador
      const { data: cred, error: fetchCredErr } = await supabase
        .from('personas_credenciales')
        .select('identificador')
        .eq('email', cleanEmail)
        .single();

      if (fetchCredErr || !cred) throw new Error('Usuario no encontrado');

      const { error: dbErr } = await supabase
        .from('personas_credenciales')
        .update({ passwordhash: hashPassword(newPassword) })
        .eq('identificador', cred.identificador);

      if (dbErr) {
        console.warn('[ApiService] Failed to update PostgreSQL passwordhash during recovery:', dbErr.message);
      }

      return { success: true };
    } catch (err) {
      console.error('[ApiService] Reset password confirm error:', err.message);
      throw err;
    }
  },

  async changePassword(email, currentPassword, newPassword) {
    const cleanEmail = email.trim().toLowerCase();
    
    if (!isSupabaseConfigured()) {
      console.log('[ApiService] Running Mock changePassword.');
      const user = mockUsers.find(u => u.email === cleanEmail);
      if (!user) {
        throw new Error('Usuario no encontrado.');
      }
      if (user.password !== currentPassword) {
        throw new Error('La contraseña actual es incorrecta.');
      }
      user.password = newPassword;
      return { success: true, message: 'Contraseña cambiada con éxito (Offline Mock).' };
    }

    try {
      const { data: cred, error: fetchErr } = await supabase
        .from('personas_credenciales')
        .select('identificador, passwordhash')
        .eq('email', cleanEmail)
        .single();

      if (fetchErr || !cred) {
        throw new Error('No se pudo verificar la información del usuario.');
      }

      const hashedPassword = hashPassword(currentPassword);
      if (cred.passwordhash !== currentPassword && cred.passwordhash !== hashedPassword) {
        throw new Error('La contraseña actual es incorrecta.');
      }

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData && sessionData.session) {
          const { error: authErr } = await supabase.auth.updateUser({
            password: newPassword
          });
          if (authErr) {
            console.warn('[ApiService] Failed to update Supabase Auth user:', authErr.message);
          }
        }
      } catch (authSessionErr) {
        console.warn('[ApiService] Auth session check failed or skipped:', authSessionErr.message);
      }

      const { error: dbErr } = await supabase
        .from('personas_credenciales')
        .update({ passwordhash: hashPassword(newPassword) })
        .eq('identificador', cred.identificador);

      if (dbErr) throw dbErr;

      return { success: true, message: 'Contraseña cambiada con éxito.' };
    } catch (err) {
      console.error('[ApiService] changePassword error:', err.message);
      throw new Error(err.message || 'Error al cambiar la contraseña.');
    }
  },

  async getPendingProducts() {
    if (!isSupabaseConfigured()) {
      return mockMyProducts.filter(p => p.disponible === 'no').map(p => ({
        ...p,
        seller_name: 'Usuario Postor',
        seller_id: 3
      }));
    }
    try {
      const { data, error } = await supabase
        .from('productos')
        .select(`
          identificador,
          descripcioncompleta,
          descripcioncatalogo,
          fecha,
          disponible,
          duenio,
          duenios (
            personas (
              identificador,
              nombre,
              documento
            )
          ),
          productos_detalles (
            informacion_historica,
            documento_origen,
            moneda,
            precio_base_propuesto,
            comision_propuesta,
            propuesta_estado,
            motivo_rechazo
          )
        `)
        .eq('disponible', 'no');
      
      if (error) throw error;
      
      return (data || []).map(p => {
        const details = p.productos_detalles && p.productos_detalles.length > 0 
          ? p.productos_detalles[0] 
          : p.productos_detalles;
        const owner = p.duenios && p.duenios.personas;
        
        return {
          identificador: p.identificador,
          titulo: p.descripcioncompleta,
          descripcion: p.descripcioncatalogo,
          fecha: p.fecha,
          disponible: p.disponible,
          contexto: details?.informacion_historica || 'No Posee',
          documento_origen: details?.documento_origen || null,
          seller_name: owner?.nombre || 'Vendedor Anónimo',
          seller_id: p.duenio,
          moneda: details?.moneda || 'ARS',
          precio_base_propuesto: details?.precio_base_propuesto || null,
          comision_propuesta: details?.comision_propuesta || null,
          propuesta_estado: details?.propuesta_estado || 'en_revision',
          motivo_rechazo: details?.motivo_rechazo || null
        };
      });
    } catch (err) {
      console.error('[ApiService] getPendingProducts error:', err.message);
      return [];
    }
  },

  async approveProduct(productId, subastaId, policyData = null) {
    if (!isSupabaseConfigured()) {
      const prod = mockMyProducts.find(p => p.identificador === productId);
      if (prod) {
        // Check for duplicates in mock mode
        try {
          const { supabaseService: ss } = require('./supabaseService');
          if (ss && ss.mockAuctions) {
            const alreadyInAuction = ss.mockAuctions.find(a => a.producto?.identificador === productId);
            if (alreadyInAuction) {
              throw new Error('Este producto ya está asignado a una subasta. Un objeto solo puede participar en una subasta a la vez.');
            }
          }
        } catch (e) {
          if (e.message.includes('ya está asignado')) throw e;
        }

        prod.disponible = 'si';
        if (policyData) {
          prod.seguro = {
            nroPoliza: policyData.nroPoliza,
            compania: policyData.compania,
            direccion: 'Av. Libertador 2590, CABA',
            telefono: '+54 11 5555-1234'
          };
        }
        // Add mock auction for it
        try {
          const { supabaseService } = require('./supabaseService');
          if (supabaseService && supabaseService.mockAuctions) {
            const exists = supabaseService.mockAuctions.find(a => a.producto.identificador === productId);
            if (exists) {
              exists.subasta_id = subastaId;
              exists.estado = 'abierta';
            } else {
              supabaseService.mockAuctions.push({
                identificador: Math.floor(Math.random() * 1000) + 100,
                subasta_id: subastaId,
                fecha: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().split('T')[0],
                hora: '15:00:00',
                estado: 'abierta',
                precio_actual: 1000,
                bid_count: 0,
                highest_bidder: 'Nadie',
                producto: {
                  identificador: productId,
                  titulo: prod.titulo,
                  descripcion: prod.descripcion,
                  image_url: prod.foto,
                  seller_name: 'Usuario Postor'
                }
              });
            }
          }
        } catch (e) {
          console.warn('[ApiService] Error updating mock subastas:', e);
        }
        await this.createNotification(3, 'Artículo Aprobado', `Tu artículo "${prod.titulo}" ha sido aprobado y asignado a una subasta.`);
      }
      return { success: true };
    }
    try {
      // Fetch details first to get owner id
      const { data: prod, error: fetchErr } = await supabase
        .from('productos')
        .select('duenio, descripcioncompleta')
        .eq('identificador', productId)
        .single();
      if (fetchErr) throw fetchErr;

      // 1. Update available to 'si'
      const { data: updatedProd, error: updateErr } = await supabase
        .from('productos')
        .update({ disponible: 'si' })
        .eq('identificador', productId)
        .select();
      
      if (updateErr) throw updateErr;
      if (!updatedProd || updatedProd.length === 0) {
        throw new Error('Error de permisos: No se pudo actualizar el estado del producto. Asegúrese de que el usuario tenga políticas de UPDATE en la tabla "productos" en Supabase.');
      }

      // 2. Find or create catalog for the subasta
      let { data: catalogData, error: catalogSelectErr } = await supabase
        .from('catalogos')
        .select('identificador')
        .eq('subasta', subastaId)
        .limit(1);

      let catalogId;
      if (catalogSelectErr || !catalogData || catalogData.length === 0) {
        // Create catalog
        const { data: newCatalog, error: catalogInsertErr } = await supabase
          .from('catalogos')
          .insert({
            descripcion: 'Catálogo de Artículos Aprobados',
            subasta: subastaId,
            responsable: 1
          })
          .select()
          .single();
        
        if (catalogInsertErr) throw catalogInsertErr;
        catalogId = newCatalog.identificador;
      } else {
        catalogId = catalogData[0].identificador;
      }

      // 3. Link to itemscatalogo (fetching base price and commission from details)
      const { data: details } = await supabase
        .from('productos_detalles')
        .select('precio_base_propuesto, comision_propuesta')
        .eq('identificador', productId)
        .single();

      const basePrice = details?.precio_base_propuesto || 500.00;
      const comision = details?.comision_propuesta || 10.00;

      // 3a. Check that the product is not already in ANY catalog (no duplicates)
      const { data: existingItems, error: existingErr } = await supabase
        .from('itemscatalogo')
        .select('identificador, catalogo')
        .eq('producto', productId);

      if (!existingErr && existingItems && existingItems.length > 0) {
        // Recovering from partial approval: update itemscatalogo details instead of inserting duplicate
        const { error: updateItemErr } = await supabase
          .from('itemscatalogo')
          .update({
            catalogo: catalogId,
            preciobase: basePrice,
            comision: comision,
            subastado: 'no'
          })
          .eq('producto', productId);
        if (updateItemErr) throw updateItemErr;
      } else {
        const { error: itemErr } = await supabase
          .from('itemscatalogo')
          .insert({
            catalogo: catalogId,
            producto: productId,
            preciobase: basePrice,
            comision: comision,
            subastado: 'no'
          });

        if (itemErr) throw itemErr;
      }

      // 4. Create and link policy if policyData is provided
      if (policyData) {
        const { error: insError } = await supabase
          .from('seguros')
          .insert({
            nropoliza: policyData.nroPoliza,
            compania: policyData.compania,
            polizacombinada: policyData.polizaCombinada,
            importe: policyData.importe
          });
          
        if (!insError) {
          const { data: linkedProd, error: linkErr } = await supabase
            .from('productos')
            .update({ seguro: policyData.nroPoliza })
            .eq('identificador', productId)
            .select();
          
          if (linkErr) throw linkErr;
          if (!linkedProd || linkedProd.length === 0) {
            throw new Error('No se pudo asociar la póliza de seguro al producto en la base de datos.');
          }
        } else {
          console.warn('[ApiService] Error inserting seguro:', insError.message);
          throw new Error('Error al insertar póliza de seguro: ' + insError.message);
        }
      }

      await this.createNotification(prod.duenio, 'Artículo Aprobado', `Tu artículo "${prod.descripcioncompleta}" ha sido aprobado y asignado a la subasta.`);

      return { success: true };
    } catch (err) {
      console.error('[ApiService] approveProduct error:', err.message);
      throw err;
    }
  },

  async rejectProduct(productId) {
    if (!isSupabaseConfigured()) {
      const idx = mockMyProducts.findIndex(p => p.identificador === productId);
      if (idx !== -1) {
        const prod = mockMyProducts[idx];
        mockMyProducts.splice(idx, 1);
        await this.createNotification(3, 'Artículo Rechazado', `Tu artículo "${prod.titulo}" ha sido rechazado.`);
      }
      return { success: true };
    }
    try {
      const { data: prod, error: fetchErr } = await supabase
        .from('productos')
        .select('duenio, descripcioncompleta')
        .eq('identificador', productId)
        .single();
      if (fetchErr) throw fetchErr;

      const { error } = await supabase
        .from('productos')
        .delete()
        .eq('identificador', productId);
      
      if (error) throw error;

      await this.createNotification(prod.duenio, 'Artículo Rechazado', `Tu artículo "${prod.descripcioncompleta}" ha sido rechazado por el revisor técnico.`);

      return { success: true };
    } catch (err) {
      console.error('[ApiService] rejectProduct error:', err.message);
      throw err;
    }
  },

  async getChatMessages(userId, receiverId) {
    if (!isSupabaseConfigured()) {
      return mockChatMessages.filter(
        m => (m.remitente === userId && m.destinatario === receiverId) ||
             (m.remitente === receiverId && m.destinatario === userId)
      ).sort((a, b) => new Date(a.fechacreacion) - new Date(b.fechacreacion));
    }
    try {
      const { data, error } = await supabase
        .from('mensajes_chat')
        .select('*')
        .or(`and(remitente.eq.${userId},destinatario.eq.${receiverId}),and(remitente.eq.${receiverId},destinatario.eq.${userId})`)
        .order('fechacreacion', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[ApiService] getChatMessages error:', err.message);
      return [];
    }
  },

  async sendChatMessage(userId, receiverId, messageText) {
    const techId = await this.getSupportTechnicianId();
    const isTechSender = (userId === techId);

    if (!isSupabaseConfigured()) {
      const newMsg = {
        identificador: Math.floor(Math.random() * 10000),
        remitente: userId,
        destinatario: receiverId,
        mensaje: messageText,
        fechacreacion: new Date().toISOString(),
        leido: 'no'
      };
      mockChatMessages.push(newMsg);
      if (isTechSender) {
        await this.createNotification(
          receiverId, 
          'Nuevo mensaje de Soporte', 
          `El equipo de soporte técnico te ha enviado un mensaje: "${messageText.slice(0, 50)}${messageText.length > 50 ? '...' : ''}"`
        );
      }
      return { success: true, message: newMsg };
    }
    try {
      const { data, error } = await supabase
        .from('mensajes_chat')
        .insert({
          remitente: userId,
          destinatario: receiverId,
          mensaje: messageText,
          leido: 'no'
        })
        .select()
        .single();
      
      if (error) throw error;

      if (isTechSender) {
        await this.createNotification(
          receiverId, 
          'Nuevo mensaje de Soporte', 
          `El equipo de soporte técnico te ha enviado un mensaje: "${messageText.slice(0, 50)}${messageText.length > 50 ? '...' : ''}"`
        );
      }

      return { success: true, message: data };
    } catch (err) {
      console.error('[ApiService] sendChatMessage error:', err.message);
      throw err;
    }
  },

  async markMessagesAsRead(senderId, receiverId) {
    if (!isSupabaseConfigured()) {
      mockChatMessages.forEach(msg => {
        if (msg.remitente === senderId && msg.destinatario === receiverId) {
          msg.leido = 'si';
        }
      });
      return { success: true };
    }
    try {
      const { error } = await supabase
        .from('mensajes_chat')
        .update({ leido: 'si' })
        .eq('remitente', senderId)
        .eq('destinatario', receiverId)
        .eq('leido', 'no');
      
      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('[ApiService] markMessagesAsRead error:', err.message);
      return { success: false, error: err.message };
    }
  },

  async getUnreadChatMessagesCount(userId) {
    if (!isSupabaseConfigured()) {
      const counts = {};
      mockChatMessages.forEach(msg => {
        if (msg.destinatario === userId && msg.leido === 'no') {
          counts[msg.remitente] = (counts[msg.remitente] || 0) + 1;
        }
      });
      return counts;
    }
    try {
      const { data, error } = await supabase
        .from('mensajes_chat')
        .select('remitente')
        .eq('destinatario', userId)
        .eq('leido', 'no');
      
      const counts = {};
      if (!error && data) {
        data.forEach(msg => {
          counts[msg.remitente] = (counts[msg.remitente] || 0) + 1;
        });
      }
      return counts;
    } catch (err) {
      console.error('[ApiService] getUnreadChatMessagesCount error:', err.message);
      return {};
    }
  },

  async getPendingPaymentMethods() {
    if (!isSupabaseConfigured()) {
      const pending = mockPaymentMethods.filter(m => m.estado === 'pendiente');
      return pending.map(m => {
        const user = mockUsers.find(u => u.profile?.identificador === m.cliente);
        return {
          ...m,
          client_name: user?.profile?.nombre || 'Cliente Anónimo'
        };
      });
    }
    try {
      const { data, error } = await supabase
        .from('mediosdepago')
        .select(`
          identificador,
          cliente,
          tipo,
          proveedor,
          mascara,
          monto,
          estado,
          clientes (
            personas (
              nombre
            )
          )
        `)
        .eq('estado', 'pendiente');
      if (error) throw error;
      return (data || []).map(m => {
        const owner = m.clientes && m.clientes.personas;
        return {
          identificador: m.identificador,
          cliente: m.cliente,
          tipo: m.tipo,
          proveedor: m.proveedor,
          mascara: m.mascara,
          monto: m.monto,
          estado: m.estado,
          client_name: owner?.nombre || 'Cliente Anónimo'
        };
      });
    } catch (err) {
      console.error('[ApiService] Error fetching pending payment methods:', err.message);
      return [];
    }
  },

  async approvePaymentMethod(pmId) {
    if (!isSupabaseConfigured()) {
      const pm = mockPaymentMethods.find(m => m.identificador === pmId);
      if (pm) {
        pm.estado = 'activo';
        await this.createNotification(pm.cliente, 'Medio de Pago Aprobado', `Tu medio de pago (${pm.proveedor} ${pm.mascara}) ha sido aprobado.`);
        return { success: true, method: pm };
      }
      throw new Error('Medio de pago no encontrado.');
    }
    try {
      const { data: pm, error: fetchErr } = await supabase
        .from('mediosdepago')
        .select('cliente, proveedor, mascara')
        .eq('identificador', pmId)
        .single();
      if (fetchErr) throw fetchErr;

      const { data, error } = await supabase
        .from('mediosdepago')
        .update({ estado: 'activo' })
        .eq('identificador', pmId)
        .select()
        .single();
      if (error) throw error;

      await this.createNotification(pm.cliente, 'Medio de Pago Aprobado', `Tu medio de pago (${pm.proveedor} ${pm.mascara}) ha sido aprobado por el revisor técnico.`);

      return { success: true, method: data };
    } catch (err) {
      console.error('[ApiService] Error approving payment method:', err.message);
      throw err;
    }
  },

  async rejectPaymentMethod(pmId) {
    if (!isSupabaseConfigured()) {
      const idx = mockPaymentMethods.findIndex(m => m.identificador === pmId);
      if (idx !== -1) {
        const pm = mockPaymentMethods[idx];
        mockPaymentMethods.splice(idx, 1);
        await this.createNotification(pm.cliente, 'Medio de Pago Rechazado', `Tu medio de pago (${pm.proveedor} ${pm.mascara}) ha sido rechazado.`);
        return { success: true };
      }
      throw new Error('Medio de pago no encontrado.');
    }
    try {
      const { data: pm, error: fetchErr } = await supabase
        .from('mediosdepago')
        .select('cliente, proveedor, mascara')
        .eq('identificador', pmId)
        .single();
      if (fetchErr) throw fetchErr;

      const { error } = await supabase
        .from('mediosdepago')
        .delete()
        .eq('identificador', pmId);
      if (error) throw error;

      await this.createNotification(pm.cliente, 'Medio de Pago Rechazado', `Tu medio de pago (${pm.proveedor} ${pm.mascara}) ha sido rechazado por el revisor técnico.`);

      return { success: true };
    } catch (err) {
      console.error('[ApiService] Error rejecting payment method:', err.message);
      throw err;
    }
  },

  async proposeProductTerms(productId, basePrice, commission) {
    if (!isSupabaseConfigured()) {
      const prod = mockMyProducts.find(p => p.identificador === productId);
      if (prod) {
        prod.precio_base_propuesto = Number(basePrice);
        prod.comision_propuesta = Number(commission);
        prod.propuesta_estado = 'propuesta_enviada';
        await this.createNotification(3, 'Nueva propuesta de términos', `El revisor técnico ha propuesto un precio base de $${basePrice} y una comisión de ${commission}% para tu artículo "${prod.titulo}".`);
        return { success: true };
      }
      throw new Error('Producto no encontrado.');
    }
    try {
      const { data: prod, error: fetchErr } = await supabase
        .from('productos')
        .select('duenio, descripcioncompleta')
        .eq('identificador', productId)
        .single();
      if (fetchErr) throw fetchErr;

      const { error } = await supabase
        .from('productos_detalles')
        .update({
          precio_base_propuesto: Number(basePrice),
          comision_propuesta: Number(commission),
          propuesta_estado: 'propuesta_enviada'
        })
        .eq('identificador', productId);
      if (error) throw error;

      await this.createNotification(
        prod.duenio,
        'Nueva propuesta de términos',
        `El revisor técnico ha propuesto un precio base de $${basePrice} y una comisión de ${commission}% para tu artículo "${prod.descripcioncompleta}". Por favor, revisa y responde la propuesta.`
      );

      return { success: true };
    } catch (err) {
      console.error('[ApiService] proposeProductTerms error:', err.message);
      throw err;
    }
  },

  async respondToProductProposal(productId, responseState, rejectReason = null) {
    if (!isSupabaseConfigured()) {
      const prod = mockMyProducts.find(p => p.identificador === productId);
      if (prod) {
        prod.propuesta_estado = responseState;
        if (responseState === 'rechazada') {
          prod.motivo_rechazo = rejectReason;
        }
        return { success: true };
      }
      throw new Error('Producto no encontrado.');
    }
    try {
      const updates = {
        propuesta_estado: responseState
      };
      if (responseState === 'rechazada') {
        updates.motivo_rechazo = rejectReason;
      }
      const { error } = await supabase
        .from('productos_detalles')
        .update(updates)
        .eq('identificador', productId);
      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('[ApiService] respondToProductProposal error:', err.message);
      throw err;
    }
  },

  async getApprovedProducts() {
    if (!isSupabaseConfigured()) {
      return mockMyProducts.filter(p => p.propuesta_estado === 'aceptada' && p.disponible === 'no');
    }
    try {
      const { data, error } = await supabase
        .from('productos')
        .select(`
          identificador,
          descripcioncompleta,
          descripcioncatalogo,
          fecha,
          disponible,
          duenio,
          duenios (
            personas (
              nombre
            )
          ),
          productos_detalles (
            moneda,
            precio_base_propuesto,
            comision_propuesta,
            propuesta_estado
          )
        `)
        .eq('disponible', 'no');
      
      if (error) throw error;

      return (data || []).map(p => {
        const details = p.productos_detalles && p.productos_detalles.length > 0 
          ? p.productos_detalles[0] 
          : p.productos_detalles;
        const owner = p.duenios && p.duenios.personas;
        
        return {
          identificador: p.identificador,
          titulo: p.descripcioncompleta,
          descripcion: p.descripcioncatalogo,
          fecha: p.fecha,
          disponible: p.disponible,
          moneda: details?.moneda || 'ARS',
          precio_base_propuesto: details?.precio_base_propuesto || 0,
          comision_propuesta: details?.comision_propuesta || 0,
          propuesta_estado: details?.propuesta_estado || 'en_revision',
          seller_name: owner?.nombre || 'Vendedor Anónimo'
        };
      }).filter(p => p.propuesta_estado === 'aceptada');
    } catch (err) {
      console.error('[ApiService] getApprovedProducts error:', err.message);
      return [];
    }
  },

  async createSubasta(subastaData, selectedProductIds) {
    let products = [];
    if (!isSupabaseConfigured()) {
      products = mockMyProducts.filter(p => selectedProductIds.includes(p.identificador));
    } else {
      const { data, error } = await supabase
        .from('productos_detalles')
        .select('identificador, moneda, precio_base_propuesto')
        .in('identificador', selectedProductIds);
      if (!error && data) {
        products = data;
      }
    }

    let maxPriceUsd = 0;
    products.forEach(p => {
      let price = Number(p.precio_base_propuesto || 0);
      const moneda = p.moneda || 'ARS';
      let equivUsd = price;
      if (moneda === 'ARS') {
        equivUsd = price / 1000;
      }
      if (equivUsd > maxPriceUsd) {
        maxPriceUsd = equivUsd;
      }
    });

    let category = 'comun';
    if (maxPriceUsd >= 50000) category = 'platino';
    else if (maxPriceUsd >= 30000) category = 'oro';
    else if (maxPriceUsd >= 15000) category = 'plata';
    else if (maxPriceUsd >= 5000) category = 'especial';
    
    if (!isSupabaseConfigured()) {
      const newSubId = Math.floor(Math.random() * 1000) + 10;
      const newSubastaObj = {
        identificador: newSubId,
        fecha: subastaData.fecha,
        hora: subastaData.hora,
        estado: 'abierta',
        ubicacion: subastaData.ubicacion,
        capacidadasistentes: Number(subastaData.capacidad),
        tienedeposito: subastaData.deposito,
        seguridadpropia: subastaData.seguridad,
        categoria: category,
        subastador: null
      };

      try {
        const { supabaseService } = require('./supabaseService');
        if (supabaseService && supabaseService.mockAuctions) {
          selectedProductIds.forEach(pId => {
            const p = mockMyProducts.find(prod => prod.identificador === pId);
            if (p) {
              p.disponible = 'si';
              p.propuesta_estado = 'aceptada';
              
              supabaseService.mockAuctions.push({
                identificador: Math.floor(Math.random() * 1000) + 1000,
                subasta_id: newSubId,
                fecha: subastaData.fecha,
                hora: subastaData.hora,
                estado: 'abierta',
                precio_actual: Number(p.precio_base_propuesto || 1000),
                bid_count: 0,
                highest_bidder: 'Nadie',
                categoria: category,
                producto: {
                  identificador: p.identificador,
                  titulo: p.titulo || p.descripcioncompleta,
                  descripcion: p.descripcion || p.descripcioncatalogo,
                  image_url: p.foto || 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=600&q=80',
                  seller_name: 'Vendedor'
                }
              });
            }
          });
        }
      } catch (err) {}

      selectedProductIds.forEach(pId => {
        const p = mockMyProducts.find(prod => prod.identificador === pId);
        if (p) {
          this.createNotification(3, 'Artículo Publicado en Subasta', `Tu artículo "${p.titulo || p.descripcioncompleta}" ha sido asignado a la subasta programada para el ${subastaData.fecha}.`);
        }
      });

      return { success: true, subasta: newSubastaObj };
    }

    try {
      const { data: newSub, error: subErr } = await supabase
        .from('subastas')
        .insert({
          fecha: subastaData.fecha,
          hora: subastaData.hora,
          estado: 'abierta',
          ubicacion: subastaData.ubicacion,
          capacidadasistentes: Number(subastaData.capacidad),
          tienedeposito: subastaData.deposito,
          seguridadpropia: subastaData.seguridad,
          categoria: category,
          subastador: null
        })
        .select()
        .single();
      
      if (subErr) throw subErr;

      const { data: catalog, error: catErr } = await supabase
        .from('catalogos')
        .insert({
          descripcion: `Catálogo de Subasta ${category.toUpperCase()}`,
          subasta: newSub.identificador,
          responsable: 1
        })
        .select()
        .single();
      
      if (catErr) throw catErr;

      // Fetch owner details to notify them
      const { data: prodDetailsList } = await supabase
        .from('productos')
        .select('identificador, duenio, descripcioncompleta')
        .in('identificador', selectedProductIds);

      for (const pId of selectedProductIds) {
        const prodDetails = products.find(p => p.identificador === pId);
        const basePrice = Number(prodDetails?.precio_base_propuesto || 500.00);
        const commission = Number(prodDetails?.comision_propuesta || 10.00);

        const { error: itemErr } = await supabase
          .from('itemscatalogo')
          .insert({
            catalogo: catalog.identificador,
            producto: pId,
            preciobase: basePrice,
            comision: commission,
            subastado: 'no'
          });
        if (itemErr) throw itemErr;

        const { error: prodUpdateErr } = await supabase
          .from('productos')
          .update({ disponible: 'si' })
          .eq('identificador', pId);
        if (prodUpdateErr) throw prodUpdateErr;
      }

      if (prodDetailsList) {
        for (const prodInfo of prodDetailsList) {
          await this.createNotification(
            prodInfo.duenio,
            'Artículo Publicado en Subasta',
            `Tu artículo "${prodInfo.descripcioncompleta}" ha sido asignado y publicado en la subasta programada para el ${subastaData.fecha} a las ${subastaData.hora}.`
          );
        }
      }

      return { success: true, subasta: newSub };
    } catch (err) {
      console.error('[ApiService] createSubasta error:', err.message);
      throw err;
    }
  },

  async getProductsByOwner(userId) {
    if (!isSupabaseConfigured()) {
      return mockMyProducts;
    }
    try {
      const { data, error } = await supabase
        .from('productos')
        .select(`
          identificador,
          fecha,
          disponible,
          descripcioncompleta,
          descripcioncatalogo,
          productos_detalles (
            moneda,
            precio_base_propuesto,
            comision_propuesta,
            propuesta_estado,
            motivo_rechazo
          ),
          itemscatalogo (
            catalogo:catalogos (
              subasta:subastas (
                identificador,
                fecha,
                hora,
                ubicacion
              )
            )
          )
        `)
        .eq('duenio', userId);
      if (error) throw error;
      return (data || []).map(p => {
        const details = p.productos_detalles && p.productos_detalles.length > 0 ? p.productos_detalles[0] : p.productos_detalles;
        const itemCat = p.itemscatalogo && p.itemscatalogo.length > 0 ? p.itemscatalogo[0] : p.itemscatalogo;
        const subInfo = itemCat?.catalogo?.subasta;
        return {
          identificador: p.identificador,
          titulo: p.descripcioncompleta,
          descripcion: p.descripcioncatalogo,
          fecha: p.fecha,
          disponible: p.disponible,
          moneda: details?.moneda || 'ARS',
          precio_base_propuesto: details?.precio_base_propuesto || null,
          comision_propuesta: details?.comision_propuesta || null,
          propuesta_estado: details?.propuesta_estado || 'en_revision',
          motivo_rechazo: details?.motivo_rechazo || null,
          subasta_info: subInfo || null
        };
      });
    } catch (err) {
      console.error('[ApiService] getProductsByOwner error:', err.message);
      return [];
    }
  },

  async getSupportTechnicianId() {
    if (!isSupabaseConfigured()) {
      return 1;
    }
    try {
      const { data, error } = await supabase
        .from('empleados')
        .select('identificador')
        .eq('cargo', 'Revisor Técnico')
        .limit(1);
      if (error || !data || data.length === 0) {
        return 1;
      }
      return data[0].identificador;
    } catch (err) {
      console.warn('[ApiService] Error fetching support technician ID:', err.message);
      return 1;
    }
  }
};

const uploadProductPhoto = async (base64Data, productId) => {
  try {
    const arrayBuffer = base64ToArrayBuffer(base64Data);
    const filePath = `productos/${productId}_${Date.now()}.jpg`;

    const { data, error } = await supabase.storage
      .from('dni-photos') 
      .upload(filePath, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('dni-photos')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (err) {
    console.error('[Supabase Storage] Product photo upload error:', err.message);
    throw new Error('No se pudo subir la foto del producto: ' + err.message);
  }
};

export default apiService;
