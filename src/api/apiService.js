import { supabase } from './supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Offline fallback mock databases
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
      cargo: 'Postor'
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
      cargo: 'Revisor Técnico'
    }
  }
];

let preRegisteredEmails = new Set(['juan@mail.com']);

let mockMyProducts = [];

let mockPaymentMethods = [
  { identificador: 1, cliente: 3, tipo: 'tarjeta', proveedor: 'Visa', mascara: '**** **** **** 4242', estado: 'activo' }
];

let mockFines = [
  { identificador: 1, cliente: 3, descripcion: 'Falta de pago en Subasta Rolex', monto: 1500, estado: 'pendiente', fechacreacion: new Date().toISOString() }
];

let mockNotifications = [
  { identificador: 1, cliente: 3, titulo: 'Bienvenido', mensaje: '¡Bienvenido a PujaYa! Tu cuenta ha sido creada y verificada.', leido: 'no', fechacreacion: new Date().toISOString() }
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
  
  let decodedText = '';
  if (rawPhoto.startsWith('\\x') || rawPhoto.startsWith('0x')) {
    decodedText = hexToUtf8(rawPhoto);
  } else {
    decodedText = rawPhoto;
  }
  
  decodedText = decodedText.trim();
  
  if (decodedText.startsWith('{') && decodedText.endsWith('}')) {
    try {
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
    } catch (e) {
      console.warn('[ApiService] Failed to parse legacy bytea JSON:', e.message);
    }
  }
  
  if (decodedText.startsWith('http') || decodedText.startsWith('data:image')) {
    return decodedText;
  }
  
  return 'data:image/jpeg;base64,' + hexToBase64(rawPhoto);
};

const isSupabaseConfigured = () => {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  return url && key && url !== 'https://your-supabase-project.supabase.co' && key !== 'your-supabase-anon-key-here' && url !== '' && key !== '';
};

// Helper to convert base64 to ArrayBuffer
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

// Helper to upload base64 images directly to Supabase Storage
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

    // Get public URL
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
    if (j >> 8) return ''; // ASCII only
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
  // Check config status
  getConfigStatus() {
    return {
      configured: isSupabaseConfigured(),
      url: process.env.EXPO_PUBLIC_SUPABASE_URL || 'Not Set',
    };
  },

  // Login handler
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
      // Direct query from database personas join with clientes
      const { data: person, error: personError } = await supabase
        .from('personas')
        .select(`
          identificador,
          documento,
          nombre,
          direccion,
          estado,
          email,
          passwordhash,
          clientes (
            admitido,
            categoria
          )
        `)
        .eq('email', cleanEmail)
        .single();

      if (personError || !person) {
        if (personError) {
          console.warn('[ApiService] Error querying persona from DB during login:', personError.message, personError);
        }
        throw new Error('El correo electrónico ingresado no está registrado.');
      }

      // Check account approval
      const clientInfo = person.clientes && person.clientes.length > 0 ? person.clientes[0] : person.clientes;
      const isApproved = person.estado === 'activo' && clientInfo?.admitido === 'si';
      
      // Special check: employees (revisors) might not have a client profile, but they are 'activo'
      const { data: employee } = await supabase
        .from('empleados')
        .select('cargo')
        .eq('identificador', person.identificador)
        .single();

      if (!isApproved && !employee) {
        throw new Error('Tu cuenta se encuentra bajo revisión de nuestro equipo técnico.');
      }

      // Check password matching (supports plain text and SHA-256 hash)
      if (!person.passwordhash || (person.passwordhash !== cleanPassword && person.passwordhash !== hashedPassword)) {
        throw new Error('Contraseña incorrecta.');
      }

      // Save token to Storage for session consistency
      const sessionToken = 'session-token-for-' + person.identificador;
      await AsyncStorage.setItem('userToken', sessionToken);
      return { token: sessionToken };
    } catch (error) {
      console.error('[ApiService] Login processing failed:', error.message);
      throw new Error(error.message || 'Error al iniciar sesión');
    }
  },

  // Pre-Register handler
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
      // 0. Check if email or document is already registered
      const { data: existing, error: checkErr } = await supabase
        .from('personas')
        .select('identificador, email, documento, estado')
        .or(`email.eq.${cleanEmail},documento.eq.${userData.documento}`);
      
      if (!checkErr && existing && existing.length > 0) {
        // Find if there is an exact email match
        const emailMatch = existing.find(p => p.email.trim().toLowerCase() === cleanEmail);
        
        if (emailMatch) {
          if (emailMatch.estado === 'inactivo') {
            return { 
              message: 'Ya existe una solicitud de registro pendiente para este correo. Por favor, espera a que el revisor técnico apruebe tu cuenta.' 
            };
          } else {
            throw new Error('Ya existe un perfil activo con este correo electrónico.');
          }
        } else {
          // Document match with different email
          const docMatch = existing.find(p => p.documento === userData.documento);
          if (docMatch && docMatch.estado === 'inactivo') {
            throw new Error('Ya existe una solicitud de registro pendiente para este documento con otro correo.');
          } else {
            throw new Error('Ya existe un perfil registrado con este número de documento.');
          }
        }
      }

      // 1. Upload photos to Storage
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

      // 2. Insert into 'personas'
      const { data: person, error: personErr } = await supabase
        .from('personas')
        .insert({
          documento: userData.documento,
          nombre: userData.nombre,
          direccion: userData.direccion,
          estado: 'inactivo',
          foto: userData.foto_selfie ? base64ToHexStr(userData.foto_selfie) : null,
          fotos_documento: combinedUrls,
          email: cleanEmail,
          numeropais: userData.pais_id || null
        })
        .select()
        .single();

      if (personErr) throw personErr;

      // 4. Return success response (no OTP token generated, no clientes row created yet)
      return { message: 'Solicitud de registro creada con éxito. Tu cuenta está en revisión. Recibirás tu contraseña predefinida por correo una vez aprobada.' };
    } catch (error) {
      console.error('[ApiService] Pre-registration error:', error.message);
      throw new Error(error.message || 'Error en pre-registro');
    }
  },

  // Verify OTP Code
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
      // 1. Verify OTP using supabase auth
      // We try cascading verification types: 'email', 'magiclink', and finally 'signup'.
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
          // ignore error to try next fallback
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
          // ignore error to throw original
        }
      }

      if (error) {
        throw error;
      }

      // 2. Update persona status to 'activo' in PostgreSQL
      const { error: updateErr } = await supabase
        .from('personas')
        .update({ estado: 'activo' })
        .eq('email', cleanEmail);

      if (updateErr) {
        console.warn('[ApiService] Failed to update persona status to active:', updateErr.message);
      }

      // Store the session access token if available
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

  // Update/Set permanent password
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
      // Try to update Supabase Auth user if there is a session
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

      // Make sure persona status is 'activo' and update passwordhash in PostgreSQL (using hashPassword)
      const { error: updateErr } = await supabase
        .from('personas')
        .update({ estado: 'activo', passwordhash: hashPassword(password) })
        .eq('email', cleanEmail);

      if (updateErr) {
        console.warn('[ApiService] Failed to activate persona and update passwordhash on password update:', updateErr.message);
      }

      // Also ensure it is stored in AsyncStorage if a session exists
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

  // Get active user profile
  async getProfile() {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) throw new Error('No hay sesión activa.');

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
      let query = supabase.from('personas').select(`
        identificador,
        documento,
        nombre,
        direccion,
        estado,
        email,
        foto,
        clientes (
          admitido,
          categoria
        ),
        empleados (
          cargo
        )
      `);

      if (clientId) {
        query = query.eq('identificador', clientId);
      } else if (email) {
        query = query.eq('email', email);
      } else {
        throw new Error('Token de sesión inválido.');
      }

      const { data: person, error: personError } = await query.single();
      if (personError || !person) {
        throw new Error('Perfil de usuario no encontrado en la base de datos.');
      }

      const clientInfo = person.clientes && person.clientes.length > 0 ? person.clientes[0] : person.clientes;
      const employeeInfo = person.empleados && person.empleados.length > 0 ? person.empleados[0] : person.empleados;

      let selfieBase64 = null;
      if (person.foto) {
        selfieBase64 = parseLegacyBytea(person.foto);
      }

      return {
        identificador: person.identificador,
        documento: person.documento,
        nombre: person.nombre,
        direccion: person.direccion,
        estado: person.estado,
        email: person.email,
        foto: selfieBase64,
        admitido: clientInfo?.admitido || 'no',
        categoria: clientInfo?.categoria || 'comun',
        cargo: employeeInfo?.cargo || null
      };
    } catch (error) {
      console.error('[ApiService] getProfile error:', error.message);
      throw error;
    }
  },

  // Upload a new product and add it to active catalog/auction
  async uploadProduct(productData) {
    if (!isSupabaseConfigured()) {
      console.log('[ApiService] Running Mock uploadProduct.');
      
      const newMockProdId = Math.floor(Math.random() * 1000) + 200;
      const newMockProduct = {
        identificador: newMockProdId,
        titulo: productData.titulo,
        descripcion: productData.descripcion,
        fecha: new Date().toISOString().split('T')[0],
        disponible: 'si',
        foto: productData.fotos && productData.fotos.length > 0 ? productData.fotos[0] : 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=600&q=80'
      };
      
      // Save to user products mock memory
      mockMyProducts.push(newMockProduct);

      // Create a mock auction as well
      const newMockAuction = {
        identificador: Math.floor(Math.random() * 1000) + 50,
        fecha: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString().split('T')[0],
        hora: '12:00:00',
        estado: 'abierta',
        en_vivo: true,
        tiempo_restante_segundos: 86400 * 10,
        precio_actual: Number(productData.precioBase),
        categoria: 'comun',
        producto: {
          identificador: newMockProdId,
          titulo: productData.titulo,
          descripcion: productData.descripcion,
          image_url: productData.fotos && productData.fotos.length > 0 ? productData.fotos[0] : 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=600&q=80',
          seller_name: 'Yo (Postor)',
          historia: {
            artista: 'N/A',
            anio: 'N/A',
            contexto: productData.informacionHistorica || 'Sin información histórica.'
          }
        },
        bid_count: 0,
        highest_bidder: 'Nadie',
        ends_at: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString()
      };
      
      // We will push this to mockAuctions which is exposed by supabaseService
      try {
        const { supabaseService } = require('./supabaseService');
        if (supabaseService && supabaseService.mockAuctions) {
          supabaseService.mockAuctions.push(newMockAuction);
        }
      } catch (err) {
        // ignore
      }

      return { success: true, message: 'Producto subido con éxito (Modo Mock).' };
    }

    try {
      // 1. Get current authenticated user from local session token
      const token = await AsyncStorage.getItem('userToken');
      if (!token) throw new Error('Usuario no autenticado.');

      let userId = null;
      if (token.startsWith('session-token-for-')) {
        userId = parseInt(token.replace('session-token-for-', ''), 10);
      }

      if (!userId) throw new Error('Usuario no autenticado o sesión inválida.');

      // 3. Ensure the user exists in 'duenios' table
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

      // 3b. Upload provenance document if provided
      let docUrl = null;
      if (productData.documentoOrigenBase64) {
        docUrl = await uploadDniPhoto(productData.documentoOrigenBase64, 'documentos_origen', `doc_${Date.now()}.jpg`);
      }

      // 4. Create the product
      const { data: newProduct, error: productErr } = await supabase
        .from('productos')
        .insert({
          fecha: new Date().toISOString().split('T')[0],
          disponible: 'si',
          descripcioncatalogo: productData.descripcion,
          descripcioncompleta: productData.titulo,
          revisor: 1, // default employee revisor
          duenio: userId,
          informacion_historica: productData.informacionHistorica || null,
          documento_origen: docUrl
        })
        .select()
        .single();

      if (productErr) throw productErr;

      // 5. Insert each photo as binary bytea into public.fotos
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

      // 6. Automatically link the product to the first catalog so it appears in auctions list
      const { data: catalogData } = await supabase
        .from('catalogos')
        .select('identificador')
        .limit(1);

      if (catalogData && catalogData.length > 0) {
        const catalogId = catalogData[0].identificador;
        const { error: itemErr } = await supabase
          .from('itemscatalogo')
          .insert({
            catalogo: catalogId,
            producto: newProduct.identificador,
            preciobase: Number(productData.precioBase),
            comision: Number(productData.precioBase) * 0.10,
            subastado: 'no'
          });

        if (itemErr) {
          console.warn('[ApiService] Failed to link product to catalog items:', itemErr.message);
        }
      }

      return { success: true, productId: newProduct.identificador };
    } catch (error) {
      console.error('[ApiService] uploadProduct error:', error.message);
      throw new Error(error.message || 'Error al subir el producto.');
    }
  },

  // Get products uploaded by the current user
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
            fotos (
              foto
            )
          `)
          .eq('duenio', userId);

      if (error) throw error;

      return (data || []).map(p => {
        let finalFoto = 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=600&q=80';
        if (p.fotos && p.fotos.length > 0) {
          finalFoto = parseLegacyBytea(p.fotos[0].foto) || finalFoto;
        }
        return {
          identificador: p.identificador,
          titulo: p.descripcioncompleta,
          descripcion: p.descripcioncatalogo,
          fecha: p.fecha,
          disponible: p.disponible,
          foto: finalFoto
        };
      });
    } catch (error) {
      console.error('[ApiService] getUserProducts error:', error.message);
      return [];
    }
  },

  // Sign out / Clear Session
  async logout() {
    await AsyncStorage.removeItem('userToken');
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
  },

  // --- NEW ADDED APIS FOR PUJAYA ---

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
        .eq('cliente', userId)
        .eq('estado', 'activo');
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('[ApiService] Error fetching payment methods:', err.message);
      return [];
    }
  },

  async addPaymentMethod(userId, payload) {
    if (!isSupabaseConfigured()) {
      const newMethod = {
        identificador: Math.floor(Math.random() * 1000) + 10,
        cliente: userId,
        tipo: payload.tipo,
        proveedor: payload.proveedor,
        mascara: payload.mascara,
        estado: 'activo'
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
          estado: 'activo'
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
          foto: null, // no selfie URL in mock
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
          email,
          foto,
          fotos_documento
        `)
        .eq('estado', 'inactivo');
      
      if (error) throw error;

      return (data || []).map(p => {
        let selfieBase64 = null;
        if (p.foto) {
          selfieBase64 = parseLegacyBytea(p.foto);
        }
        return {
          identificador: p.identificador,
          documento: p.documento,
          nombre: p.nombre,
          direccion: p.direccion,
          estado: p.estado,
          email: p.email,
          foto: selfieBase64,
          fotos_documento: p.fotos_documento
        };
      });
    } catch (err) {
      console.error('[ApiService] Error getting pending clients:', err.message);
      return [];
    }
  },

  async approveClient(clientId, password) {
    if (!isSupabaseConfigured()) {
      const user = mockUsers.find(u => u.profile && u.profile.identificador === clientId);
      if (user) {
        user.profile.admitido = 'si';
        user.profile.estado = 'activo';
        user.password = password; // store password in mock user
      }
      return { success: true, emailSimulated: `Hola ${user?.profile?.nombre || 'Cliente'},\n\n¡Felicidades! Tu cuenta de PujaYa! ha sido aprobada por nuestro revisor técnico.\n\nTu contraseña predefinida de acceso es: ${password}\n\nYa puedes ingresar a la app.` };
    }
    try {
      // 1. Get user name, email, and country first for the email log and clientes insert
      const { data: persona, error: fetchErr } = await supabase
        .from('personas')
        .select('nombre, email, numeropais')
        .eq('identificador', clientId)
        .single();
      
      if (fetchErr) throw fetchErr;

      // 2. Update personas table (estado to active, passwordhash to the pre-defined password hash)
      const { error: personErr } = await supabase
        .from('personas')
        .update({ 
          estado: 'activo',
          passwordhash: hashPassword(password)
        })
        .eq('identificador', clientId);

      if (personErr) throw personErr;

      // 3. Insert into clientes table (admitido to 'si', category defaults to 'comun')
      const { error: clientErr } = await supabase
        .from('clientes')
        .insert({ 
          identificador: clientId,
          numeropais: persona.numeropais || null,
          admitido: 'si',
          categoria: 'comun',
          verificador: 1
        });

      if (clientErr) throw clientErr;

      const emailContent = `SIMULACION ENVIO CORREO APROBACION:\nPara: ${persona.email}\nAsunto: Cuenta Aprobada - PujaYa!\n\nHola ${persona.nombre},\n\n¡Felicidades! Tu cuenta ha sido aprobada por nuestro revisor técnico.\n\nTu contraseña predefinida de acceso es: ${password}\n\nYa puedes ingresar a la app.`;
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
      // 1. Get user name, email, and documento first for the email log and storage cleanup
      const { data: persona, error: fetchErr } = await supabase
        .from('personas')
        .select('nombre, email, documento')
        .eq('identificador', clientId)
        .single();

      if (fetchErr) throw fetchErr;

      // 2. Clean up files in Supabase Storage under the subfolder matching the DNI/documento
      const subfolder = persona.documento.trim();
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

      // 3. Delete from personas (which cascades to clientes)
      const { error: deleteErr } = await supabase
        .from('personas')
        .delete()
        .eq('identificador', clientId);

      if (deleteErr) throw deleteErr;

      const emailContent = `SIMULACION ENVIO CORREO RECHAZO:\nPara: ${persona.email}\nAsunto: Registro Rechazado - PujaYa!\n\nHola ${persona.nombre},\n\nLamentamos informarte que tu solicitud de registro en PujaYa! ha sido rechazada por nuestro revisor técnico.\n\nMotivo del rechazo:\n${reason}\n\nSi deseas volver a registrarte, asegúrate de corregir los inconvenientes mencionados.`;
      console.log(emailContent);

      return { success: true, emailSimulated: emailContent };
    } catch (err) {
      console.error('[ApiService] Error rejecting client:', err.message);
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
      // Cascade verify OTP
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
          // ignore
        }
      }

      if (error) throw error;

      // Update password permanently in Supabase Auth if session exists
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

      // Also update passwordhash in PostgreSQL personas table (using hashPassword)
      const { error: dbErr } = await supabase
        .from('personas')
        .update({ passwordhash: hashPassword(newPassword) })
        .eq('email', cleanEmail);

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
      // 1. Verify current password by querying personas table
      const { data: person, error: fetchErr } = await supabase
        .from('personas')
        .select('passwordhash')
        .eq('email', cleanEmail)
        .single();

      if (fetchErr || !person) {
        throw new Error('No se pudo verificar la información del usuario.');
      }

      const hashedCurrent = hashPassword(currentPassword);
      if (person.passwordhash !== currentPassword && person.passwordhash !== hashedCurrent) {
        throw new Error('La contraseña actual es incorrecta.');
      }

      // 2. Check if a Supabase Auth session exists. If so, update it.
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

      // 3. Update passwordhash in PostgreSQL personas table (using hashPassword)
      const { error: dbErr } = await supabase
        .from('personas')
        .update({ passwordhash: hashPassword(newPassword) })
        .eq('email', cleanEmail);

      if (dbErr) throw dbErr;

      return { success: true, message: 'Contraseña cambiada con éxito.' };
    } catch (err) {
      console.error('[ApiService] changePassword error:', err.message);
      throw new Error(err.message || 'Error al cambiar la contraseña.');
    }
  }
};

// Helper to upload base64 images directly to Supabase Storage
const uploadProductPhoto = async (base64Data, productId) => {
  try {
    const arrayBuffer = base64ToArrayBuffer(base64Data);
    const filePath = `productos/${productId}_${Date.now()}.jpg`;

    const { data, error } = await supabase.storage
      .from('dni-photos') // reuse the public dni-photos bucket
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
