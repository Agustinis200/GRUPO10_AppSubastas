import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  ScrollView, 
  Image,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { apiService } from '../api/apiService';
import { COLORS, FONTS, SHADOWS } from '../styles/theme';

export default function AuthScreen({ onLoginSuccess }) {
  const [authMode, setAuthMode] = useState('login'); // 'login', 'pre-register', 'verify', 'set-password'
  
  // Shared loading state
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Login inputs
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Pre-register inputs
  const [regNombre, setRegNombre] = useState('');
  const [regDocumento, setRegDocumento] = useState('');
  const [regDireccion, setRegDireccion] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regDocFrente, setRegDocFrente] = useState(null);
  const [regDocDorso, setRegDocDorso] = useState(null);

  // Verification & Password setting inputs
  const [compEmail, setCompEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [showSourceSelector, setShowSourceSelector] = useState(false);
  const [activePhotoType, setActivePhotoType] = useState(null); // 'frente', 'dorso'

  const openSelector = (type) => {
    setActivePhotoType(type);
    setShowSourceSelector(true);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const pickFromSource = async (source) => {
    setShowSourceSelector(false);
    if (!activePhotoType) return;
    
    try {
      let result;
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          setErrorMessage('Se necesitan permisos para usar la cámara.');
          return;
        }
        
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.5,
          base64: true,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          setErrorMessage('Se necesitan permisos para acceder a la galería.');
          return;
        }
        
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: 'images',
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.5,
          base64: true,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const fileObj = {
          uri: result.assets[0].uri,
          base64: result.assets[0].base64
        };
        if (activePhotoType === 'frente') {
          setRegDocFrente(fileObj);
        } else {
          setRegDocDorso(fileObj);
        }
      }
    } catch (e) {
      setErrorMessage('Error al seleccionar imagen.');
    }
  };

  const handleLogin = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    if (!loginEmail || !loginPassword) {
      setErrorMessage('Por favor completa todos los campos.');
      return;
    }

    setLoading(true);
    try {
      const result = await apiService.login(loginEmail.trim(), loginPassword);
      setLoading(false);
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err) {
      setLoading(false);
      setErrorMessage(err.message || 'Error al iniciar sesión.');
    }
  };

  const handlePreRegister = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    if (!regNombre || !regDocumento || !regDireccion || !regEmail) {
      setErrorMessage('Por favor completa todos los campos de texto.');
      return;
    }
    if (!regDocFrente || !regDocDorso) {
      setErrorMessage('Por favor carga las fotos del DNI (Frente y Dorso).');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        nombre: regNombre.trim(),
        documento: regDocumento.trim(),
        direccion: regDireccion.trim(),
        mail: regEmail.trim(),
        pais_id: 32, // Argentina por defecto
        foto_documento_frente: regDocFrente.base64,
        foto_documento_dorso: regDocDorso.base64
      };
      const result = await apiService.preRegister(payload);
      setLoading(false);
      setSuccessMessage('Registro exitoso. Se ha enviado un código de 6 dígitos a tu correo. Úsalo como tu contraseña en la pestaña "Ingresar".');
      
      // Auto switch to login tab after 3 seconds
      setTimeout(() => {
        setLoginEmail(regEmail);
        setAuthMode('login');
        setSuccessMessage('');
      }, 3500);

    } catch (err) {
      setLoading(false);
      setErrorMessage(err.message || 'Error en el pre-registro.');
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        
        {/* Brand Logo Header */}
        <View style={styles.brandHeader}>
          <Text style={styles.brandTitle}>PujaYa!</Text>
          <Text style={styles.brandSubtitle}>Registra ofertas, gana subastas online</Text>
        </View>

        {/* Tab Selection */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, authMode === 'login' && styles.activeTab]}
            onPress={() => { setAuthMode('login'); setErrorMessage(''); setSuccessMessage(''); }}
          >
            <Text style={[styles.tabText, authMode === 'login' && styles.activeTabText]}>Ingresar</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tab, authMode === 'pre-register' && styles.activeTab]}
            onPress={() => { setAuthMode('pre-register'); setErrorMessage(''); setSuccessMessage(''); }}
          >
            <Text style={[styles.tabText, authMode === 'pre-register' && styles.activeTabText]}>Registro</Text>
          </TouchableOpacity>
        </View>

        {/* Form Panel */}
        <View style={styles.card}>
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

          {/* 1. LOGIN MODE */}
          {authMode === 'login' && (
            <View>
              <Text style={styles.inputLabel}>Correo Electrónico</Text>
              <TextInput
                style={styles.input}
                placeholder="ejemplo@mail.com"
                placeholderTextColor={COLORS.lightGray200}
                value={loginEmail}
                onChangeText={setLoginEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Contraseña / Código de Correo</Text>
              <TextInput
                style={styles.input}
                placeholder="******"
                placeholderTextColor={COLORS.lightGray200}
                value={loginPassword}
                onChangeText={setLoginPassword}
                secureTextEntry
                autoCapitalize="none"
              />

              <TouchableOpacity 
                style={[styles.submitButton, loading && styles.disabledButton]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.submitButtonText}>Entrar</Text>}
              </TouchableOpacity>

              <Text style={styles.hintText}>
                ¿No tienes cuenta? Regístrate en la pestaña "Registro". Recibirás un correo con el código para ingresar.
              </Text>
            </View>
          )}

          {/* 2. PRE-REGISTER MODE */}
          {authMode === 'pre-register' && (
            <View>
              <Text style={styles.inputLabel}>Nombre Completo</Text>
              <TextInput
                style={styles.input}
                placeholder="Juan Pérez"
                placeholderTextColor={COLORS.lightGray200}
                value={regNombre}
                onChangeText={setRegNombre}
              />

              <Text style={styles.inputLabel}>DNI o Documento de Identidad</Text>
              <TextInput
                style={styles.input}
                placeholder="40111222"
                placeholderTextColor={COLORS.lightGray200}
                value={regDocumento}
                onChangeText={setRegDocumento}
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Dirección Postal</Text>
              <TextInput
                style={styles.input}
                placeholder="Av. Siempre Viva 123"
                placeholderTextColor={COLORS.lightGray200}
                value={regDireccion}
                onChangeText={setRegDireccion}
              />

              <Text style={styles.inputLabel}>Correo Electrónico</Text>
              <TextInput
                style={styles.input}
                placeholder="juan@mail.com"
                placeholderTextColor={COLORS.lightGray200}
                value={regEmail}
                onChangeText={setRegEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {/* Document Photo Uploads */}
              <Text style={styles.inputLabel}>Fotografía del Documento</Text>
              <View style={styles.photoUploadRow}>
                <TouchableOpacity style={styles.photoBox} onPress={() => openSelector('frente')}>
                  {regDocFrente ? (
                    <Image source={{ uri: regDocFrente.uri }} style={styles.thumbnail} />
                  ) : (
                    <View style={styles.placeholderBox}>
                      <Text style={styles.placeholderIcon}>📷</Text>
                      <Text style={styles.placeholderLabel}>Frente DNI</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.photoBox} onPress={() => openSelector('dorso')}>
                  {regDocDorso ? (
                    <Image source={{ uri: regDocDorso.uri }} style={styles.thumbnail} />
                  ) : (
                    <View style={styles.placeholderBox}>
                      <Text style={styles.placeholderIcon}>📷</Text>
                      <Text style={styles.placeholderLabel}>Dorso DNI</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={[styles.submitButton, loading && styles.disabledButton]}
                onPress={handlePreRegister}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.submitButtonText}>Pre-Registrarse</Text>}
              </TouchableOpacity>
            </View>
          )}

        </View>

      </ScrollView>

      {/* Image Source Selector Modal */}
      {showSourceSelector && (
        <View style={styles.selectorOverlay}>
          <View style={styles.selectorContainer}>
            <Text style={styles.selectorTitle}>Subir foto del DNI</Text>
            <Text style={styles.selectorSubtitle}>¿Cómo quieres agregar la foto?</Text>
            
            <TouchableOpacity style={styles.selectorOption} onPress={() => pickFromSource('camera')}>
              <Text style={styles.selectorOptionIcon}>📷</Text>
              <Text style={styles.selectorOptionText}>Tomar Foto con la Cámara</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.selectorOption} onPress={() => pickFromSource('gallery')}>
              <Text style={styles.selectorOptionIcon}>🖼️</Text>
              <Text style={styles.selectorOptionText}>Elegir desde la Galería</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.selectorOption, styles.cancelOption]} onPress={() => setShowSourceSelector(false)}>
              <Text style={styles.cancelOptionText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.darkGray600,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
    flexGrow: 1,
    justifyContent: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  brandTitle: {
    color: COLORS.white,
    fontSize: 32,
    fontWeight: FONTS.weightExtraBold,
    letterSpacing: -1,
  },
  brandSubtitle: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeMd,
    marginTop: 6,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
    ...SHADOWS.glow,
  },
  tabText: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeBase,
    fontWeight: FONTS.weightBold,
  },
  activeTabText: {
    color: COLORS.white,
  },
  card: {
    backgroundColor: COLORS.darkGray500,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.default,
  },
  inputLabel: {
    color: COLORS.white,
    fontSize: FONTS.sizeMd,
    fontWeight: FONTS.weightMedium,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: COLORS.darkGray600,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    color: COLORS.white,
    paddingHorizontal: 16,
    height: 48,
    fontSize: FONTS.sizeBase,
    marginBottom: 16,
  },
  photoUploadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  photoBox: {
    width: '48%',
    height: 110,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.darkGray600,
    overflow: 'hidden',
  },
  placeholderBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  placeholderLabel: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeSm,
    fontWeight: FONTS.weightMedium,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    ...SHADOWS.glow,
  },
  disabledButton: {
    backgroundColor: COLORS.textDisabled,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizeLg,
    fontWeight: FONTS.weightBold,
  },
  hintText: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeSm,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 16,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: FONTS.sizeBase,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  successText: {
    color: COLORS.success,
    fontSize: FONTS.sizeBase,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  selectorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 10, 15, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 1000,
  },
  selectorContainer: {
    backgroundColor: COLORS.darkGray500,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.default,
  },
  selectorTitle: {
    color: COLORS.white,
    fontSize: FONTS.sizeLg,
    fontWeight: FONTS.weightBold,
    textAlign: 'center',
    marginBottom: 4,
  },
  selectorSubtitle: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeMd,
    textAlign: 'center',
    marginBottom: 20,
  },
  selectorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkGray600,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectorOptionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  selectorOptionText: {
    color: COLORS.white,
    fontSize: FONTS.sizeBase,
    fontWeight: FONTS.weightMedium,
  },
  cancelOption: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    justifyContent: 'center',
    marginTop: 8,
  },
  cancelOptionText: {
    color: COLORS.danger,
    fontSize: FONTS.sizeBase,
    fontWeight: FONTS.weightBold,
  },
  passwordHeaderTitle: {
    color: COLORS.white,
    fontSize: FONTS.sizeLg,
    fontWeight: FONTS.weightBold,
    textAlign: 'center',
    marginBottom: 8,
  },
  passwordHeaderSubtitle: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeMd,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
});
