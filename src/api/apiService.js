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
    }
  }
];

let preRegisteredEmails = new Set(['juan@mail.com']);

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

export const apiService = {
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

    if (!isSupabaseConfigured()) {
      console.log('[ApiService] Running Mock login.');
      const user = mockUsers.find(u => u.email === cleanEmail && u.password === cleanPassword);
      if (user) {
        const token = 'mock-jwt-token-for-' + cleanEmail;
        await AsyncStorage.setItem('userToken', token);
        return { token };
      }
      throw new Error('Credenciales inválidas (Simulación Offline)');
    }

    let authData = null;
    let authError = null;

    try {
      // 1. Attempt standard password login first
      console.log('[ApiService] Attempting password sign in for:', cleanEmail);
      const res = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword
      });
      authData = res.data;
      authError = res.error;
    } catch (err) {
      authError = err;
    }

    // 2. If password login fails, attempt to treat the password as a temporary OTP token
    if (authError) {
      console.log('[ApiService] Password sign in failed. Attempting to treat password as OTP code...');
      let otpData = null;
      let otpError = null;

      // Cascading OTP verification types: 'email', 'magiclink', 'signup'
      try {
        console.log('[ApiService] Trying OTP verification with type: email');
        const res = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanPassword,
          type: 'email'
        });
        otpData = res.data;
        otpError = res.error;
      } catch (err) {
        otpError = err;
      }

      if (otpError) {
        console.log('[ApiService] OTP type:email failed, trying type:magiclink...');
        try {
          const res = await supabase.auth.verifyOtp({
            email: cleanEmail,
            token: cleanPassword,
            type: 'magiclink'
          });
          if (!res.error) {
            otpData = res.data;
            otpError = null;
          }
        } catch (err) {
          // ignore
        }
      }

      if (otpError) {
        console.log('[ApiService] OTP type:magiclink failed, trying type:signup...');
        try {
          const res = await supabase.auth.verifyOtp({
            email: cleanEmail,
            token: cleanPassword,
            type: 'signup'
          });
          if (!res.error) {
            otpData = res.data;
            otpError = null;
          }
        } catch (err) {
          // ignore
        }
      }

      if (!otpError && otpData && otpData.session) {
        console.log('[ApiService] OTP verified successfully! Setting permanent password to OTP code...');
        authData = otpData;
        authError = null;

        try {
          // Update the user's password to be this OTP code permanently
          const { error: passUpdateErr } = await supabase.auth.updateUser({
            password: cleanPassword
          });
          if (passUpdateErr) {
            console.warn('[ApiService] Failed to update permanent password in Supabase Auth:', passUpdateErr.message);
          }
        } catch (err) {
          console.warn('[ApiService] Failed to update permanent password in Supabase Auth:', err.message);
        }
      } else {
        // If OTP verification also failed, throw the original authError or otpError
        console.error('[ApiService] Both password login and OTP verification failed.');
        throw new Error('Credenciales inválidas o código de correo incorrecto/expirado.');
      }
    }

    try {
      // 3. Make sure the corresponding profile is updated to 'activo' in PostgreSQL
      const { error: updateErr } = await supabase
        .from('personas')
        .update({ estado: 'activo' })
        .eq('email', cleanEmail);

      if (updateErr) {
        console.warn('[ApiService] Failed to update persona status to active:', updateErr.message);
      }

      // 4. Query corresponding profile from 'personas' join with 'clientes'
      let { data: person, error: personError } = await supabase
        .from('personas')
        .select(`
          identificador,
          documento,
          nombre,
          direccion,
          estado,
          email,
          clientes (
            admitido,
            categoria
          )
        `)
        .eq('email', cleanEmail)
        .single();

      if (personError || !person) {
        console.log('[ApiService] Persona profile not found for authenticated user. Auto-creating...');
        const tempDocument = 'AUTO-' + Math.floor(Math.random() * 90000000 + 10000000);
        const tempName = cleanEmail.split('@')[0];

        const { data: newPerson, error: createPersonErr } = await supabase
          .from('personas')
          .insert({
            documento: tempDocument,
            nombre: tempName,
            direccion: 'Dirección no especificada',
            estado: 'activo',
            email: cleanEmail
          })
          .select()
          .single();

        if (createPersonErr) {
          console.error('[ApiService] Failed to auto-create persona profile:', createPersonErr.message);
          throw new Error('Usuario autenticado pero no posee perfil en tabla personas y falló la creación automática.');
        }

        const { error: clientErr } = await supabase
          .from('clientes')
          .insert({
            identificador: newPerson.identificador,
            numeropais: null,
            admitido: 'si',
            categoria: 'comun',
            verificador: 1
          });

        if (clientErr) {
          console.error('[ApiService] Failed to auto-create client profile:', clientErr.message);
        }

        person = {
          ...newPerson,
          clientes: {
            admitido: 'si',
            categoria: 'comun'
          }
        };
      }

      // Save token to Storage for session consistency
      await AsyncStorage.setItem('userToken', authData.session.access_token);
      return { token: authData.session.access_token };
    } catch (error) {
      console.error('[ApiService] Login processing failed:', error.message);
      throw new Error(error.message || 'Error al iniciar sesión');
    }
  },

  // Pre-Register handler
  async preRegister(userData) {
    const cleanEmail = userData.mail.trim().toLowerCase();
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
            // Re-trigger OTP verification mail
            const { error: otpErr } = await supabase.auth.signInWithOtp({
              email: cleanEmail,
              options: {
                shouldCreateUser: true
              }
            });

            if (otpErr) {
              console.warn('[ApiService] OTP retry warning:', otpErr.message);
              throw new Error('No se pudo reenviar el correo de verificación: ' + otpErr.message);
            }

            return { 
              message: 'Ya existe una solicitud de registro pendiente para este correo. Te hemos reenviado el código de verificación de 6 dígitos.' 
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
          foto: combinedUrls,
          email: cleanEmail
        })
        .select()
        .single();

      if (personErr) throw personErr;

      // 3. Insert into 'clientes'
      // Note: verificador defaults to 1 (assigned employee ID)
      const { error: clientErr } = await supabase
        .from('clientes')
        .insert({
          identificador: person.identificador,
          numeropais: null,
          admitido: 'no',
          categoria: 'comun',
          verificador: 1
        });

      if (clientErr) throw clientErr;

      // 4. Trigger Supabase OTP authentication email
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: true
        }
      });

      if (otpErr) {
        console.warn('[ApiService] OTP send warning:', otpErr.message);

        // Fallback for development if rate limited by Supabase free tier SMTP
        const errLower = otpErr.message.toLowerCase();
        if (errLower.includes('rate limit') || errLower.includes('limit exceeded') || errLower.includes('too many requests')) {
          console.log('[ApiService] Rate limited by Supabase. Creating user directly with fallback password "123456" for testing...');
          const { error: signUpErr } = await supabase.auth.signUp({
            email: cleanEmail,
            password: '123456'
          });

          if (!signUpErr) {
            // Also automatically set their persona state to active since we bypass verification
            await supabase
              .from('personas')
              .update({ estado: 'activo' })
              .eq('email', cleanEmail);

            return { 
              message: 'El límite de correos de Supabase se ha excedido. Tu cuenta ha sido creada automáticamente con la contraseña temporal: 123456' 
            };
          } else {
            console.error('[ApiService] Fallback signup also failed:', signUpErr.message);
            throw new Error('Límite de envío de correos excedido en Supabase y falló el registro alternativo: ' + signUpErr.message);
          }
        }

        throw new Error('Pre-registro completado pero no se pudo enviar el correo de verificación: ' + otpErr.message);
      }

      return { message: 'Solicitud de registro creada. Te hemos enviado un código de verificación de 6 dígitos a tu correo.' };
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
      const { data, error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      // Make sure persona status is 'activo' in PostgreSQL
      const { error: updateErr } = await supabase
        .from('personas')
        .update({ estado: 'activo' })
        .eq('email', cleanEmail);

      if (updateErr) {
        console.warn('[ApiService] Failed to activate persona on password update:', updateErr.message);
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
    if (!isSupabaseConfigured()) {
      const token = await AsyncStorage.getItem('userToken');
      if (token && token.startsWith('mock-jwt-token-for-')) {
        const email = token.replace('mock-jwt-token-for-', '');
        const user = mockUsers.find(u => u.email === email);
        if (user) return user.profile;
      }
      throw new Error('Sesión simulada no encontrada');
    }

    try {
      // Get current auth user session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No hay usuario autenticado en la sesión de Supabase.');

      const cleanEmail = user.email.trim().toLowerCase();

      // Fetch detail profile from 'personas' join with 'clientes'
      let { data: person, error: personError } = await supabase
        .from('personas')
        .select(`
          identificador,
          documento,
          nombre,
          direccion,
          estado,
          email,
          clientes (
            admitido,
            categoria
          )
        `)
        .eq('email', cleanEmail)
        .single();

      if (personError || !person) {
        console.log('[ApiService] Persona profile not found in getProfile. Auto-creating...');
        const tempDocument = 'AUTO-' + Math.floor(Math.random() * 90000000 + 10000000);
        const tempName = cleanEmail.split('@')[0];

        const { data: newPerson, error: createPersonErr } = await supabase
          .from('personas')
          .insert({
            documento: tempDocument,
            nombre: tempName,
            direccion: 'Dirección no especificada',
            estado: 'activo',
            email: cleanEmail
          })
          .select()
          .single();

        if (createPersonErr) {
          throw new Error('Perfil no encontrado y falló la creación automática.');
        }

        const { error: clientErr } = await supabase
          .from('clientes')
          .insert({
            identificador: newPerson.identificador,
            numeropais: null,
            admitido: 'si',
            categoria: 'comun',
            verificador: 1
          });

        if (clientErr) {
          console.error('[ApiService] Failed to auto-create client profile:', clientErr.message);
        }

        person = {
          ...newPerson,
          clientes: {
            admitido: 'si',
            categoria: 'comun'
          }
        };
      }

      const clientInfo = person.clientes && person.clientes.length > 0 ? person.clientes[0] : person.clientes;

      return {
        identificador: person.identificador,
        documento: person.documento,
        nombre: person.nombre,
        direccion: person.direccion,
        estado: person.estado,
        admitido: clientInfo?.admitido || 'no',
        categoria: clientInfo?.categoria || 'comun'
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
      return { success: true, message: 'Producto subido con éxito (Modo Mock).' };
    }

    try {
      // 1. Get current authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado.');

      // 2. Fetch the persona's identificador using email
      const { data: person } = await supabase
        .from('personas')
        .select('identificador')
        .eq('email', user.email.trim().toLowerCase())
        .single();

      if (!person) throw new Error('No se encontró el perfil de la persona.');

      const userId = person.identificador;

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

      // 4. Create the product
      const { data: newProduct, error: productErr } = await supabase
        .from('productos')
        .insert({
          fecha: new Date().toISOString().split('T')[0],
          disponible: 'si',
          descripcioncatalogo: productData.descripcion,
          descripcioncompleta: productData.titulo,
          revisor: 1, // default employee revisor
          duenio: userId
        })
        .select()
        .single();

      if (productErr) throw productErr;

      // 5. Upload photo and insert into 'fotos' table
      let photoUrl = 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=600&q=80'; // fallback default
      if (productData.fotoBase64) {
        photoUrl = await uploadProductPhoto(productData.fotoBase64, newProduct.identificador);
      }

      const { error: fotoErr } = await supabase
        .from('fotos')
        .insert({
          producto: newProduct.identificador,
          foto: photoUrl
        });

      if (fotoErr) throw fotoErr;

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
      return [];
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado.');

      const { data: person } = await supabase
        .from('personas')
        .select('identificador')
        .eq('email', user.email.trim().toLowerCase())
        .single();

      if (!person) return [];

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
          .eq('duenio', person.identificador);

      if (error) throw error;

      return (data || []).map(p => ({
        identificador: p.identificador,
        titulo: p.descripcioncompleta,
        descripcion: p.descripcioncatalogo,
        fecha: p.fecha,
        disponible: p.disponible,
        foto: p.fotos && p.fotos.length > 0 ? p.fotos[0].foto : 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=600&q=80'
      }));
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
