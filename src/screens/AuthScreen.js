import React, { useState, useEffect, useRef } from 'react';
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
  Platform,
  Modal,
  FlatList,
  Alert
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { apiService } from '../api/apiService';
import { COLORS, FONTS, SHADOWS } from '../styles/theme';
import { Feather, FontAwesome5 } from '@expo/vector-icons';

export default function AuthScreen({ onLoginSuccess, onGuestLogin }) {
  const [authMode, setAuthMode] = useState('login'); 
  const scrollRef = useRef(null);
  
  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };
  
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [regNombre, setRegNombre] = useState('');
  const [regDocumento, setRegDocumento] = useState('');
  const [regDireccion, setRegDireccion] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regDocFrente, setRegDocFrente] = useState(null);
  const [regDocDorso, setRegDocDorso] = useState(null);
  const [regSelfie, setRegSelfie] = useState(null);
  const [acceptPolicies, setAcceptPolicies] = useState(false);
  
  const [paises, setPaises] = useState([]);
  const [selectedPais, setSelectedPais] = useState(32); 
  const [selectedPaisNombre, setSelectedPaisNombre] = useState('Argentina');
  const [showCountriesModal, setShowCountriesModal] = useState(false);

  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryOtp, setRecoveryOtp] = useState('');
  const [recoveryNewPassword, setRecoveryNewPassword] = useState('');
  const [recoveryConfirmNewPassword, setRecoveryConfirmNewPassword] = useState('');

  const [showSupportModal, setShowSupportModal] = useState(false);

  useEffect(() => {
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    try {
      const list = await apiService.getPaises();
      setPaises(list || []);
      const defaultCountry = list.find(c => c.numero === 32);
      if (defaultCountry) {
        setSelectedPaisNombre(defaultCountry.nombre);
      }
    } catch (e) {
      console.warn('Error retrieving countries:', e);
    }
  };

  const openSelector = (type) => {
    setErrorMessage('');
    setSuccessMessage('');

    let title = 'Subir imagen';
    if (type === 'frente') title = 'Subir foto frontal de DNI';
    if (type === 'dorso') title = 'Subir foto dorsal de DNI';
    if (type === 'selfie') title = 'Tomar selfie de validación';

    Alert.alert(
      title,
      '¿Cómo quieres agregar la foto?',
      [
        { 
          text: 'Tomar Foto con la Cámara', 
          onPress: () => pickFromSource('camera', type)
        },
        { 
          text: 'Elegir desde la Galería', 
          onPress: () => pickFromSource('gallery', type)
        },
        { text: 'Cancelar', style: 'cancel' }
      ]
    );
  };

  const pickFromSource = async (source, type) => {
    if (!type) return;
    
    try {
      let result;
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          setErrorMessage('Se necesitan permisos para usar la cámara.');
          return;
        }
        
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: false,
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
          allowsEditing: false,
          quality: 0.5,
          base64: true,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const fileObj = {
          uri: result.assets[0].uri,
          base64: result.assets[0].base64
        };
        if (type === 'frente') {
          setRegDocFrente(fileObj);
        } else if (type === 'dorso') {
          setRegDocDorso(fileObj);
        } else if (type === 'selfie') {
          setRegSelfie(fileObj);
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
      scrollToTop();
      return;
    }
    const docRegex = /^[0-9]{7,9}$/;
    if (!docRegex.test(regDocumento.trim())) {
      setErrorMessage('El documento debe ser puramente numérico y tener entre 7 y 9 dígitos.');
      scrollToTop();
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(regEmail.trim())) {
      setErrorMessage('Por favor ingresa un correo electrónico válido (debe contener "@" y un dominio como ".com" o similar).');
      scrollToTop();
      return;
    }
    if (!regDocFrente || !regDocDorso) {
      setErrorMessage('Por favor carga las fotos del DNI (Frente y Dorso).');
      scrollToTop();
      return;
    }
    if (!regSelfie) {
      setErrorMessage('Por favor tómate una Selfie de validación.');
      scrollToTop();
      return;
    }
    if (!acceptPolicies) {
      setErrorMessage('Debes aceptar las políticas de privacidad y condiciones de uso.');
      scrollToTop();
      return;
    }

    setLoading(true);
    try {
      const payload = {
        nombre: regNombre.trim(),
        documento: regDocumento.trim(),
        direccion: regDireccion.trim(),
        mail: regEmail.trim(),
        pais_id: selectedPais,
        foto_documento_frente: regDocFrente.base64,
        foto_documento_dorso: regDocDorso.base64,
        foto_selfie: regSelfie.base64
      };
      const result = await apiService.preRegister(payload);
      setLoading(false);
      setSuccessMessage('Registro exitoso. Tu solicitud ha sido enviada. Una vez aprobada por nuestro revisor técnico, recibirás tu contraseña predefinida por correo electrónico.');
      scrollToTop();
      
      setRegNombre('');
      setRegDocumento('');
      setRegDireccion('');
      setRegEmail('');
      setRegDocFrente(null);
      setRegDocDorso(null);
      setRegSelfie(null);
      setAcceptPolicies(false);

    } catch (err) {
      setLoading(false);
      setErrorMessage(err.message || 'Error en el pre-registro.');
      scrollToTop();
    }
  };

  const handleForgotPasswordRequest = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    if (!recoveryEmail) {
      setErrorMessage('Por favor ingresa tu correo electrónico.');
      return;
    }

    setLoading(true);
    try {
      await apiService.resetPasswordRequest(recoveryEmail);
      setLoading(false);
      setSuccessMessage('Código de verificación enviado. Revisa tu correo.');
      setAuthMode('reset-password');
    } catch (err) {
      setLoading(false);
      setErrorMessage(err.message || 'Error al solicitar el cambio de contraseña.');
    }
  };

  const handleForgotPasswordConfirm = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    if (!recoveryOtp || !recoveryNewPassword || !recoveryConfirmNewPassword) {
      setErrorMessage('Por favor completa todos los campos.');
      return;
    }
    if (recoveryNewPassword !== recoveryConfirmNewPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      await apiService.resetPasswordConfirm(recoveryEmail, recoveryOtp, recoveryNewPassword);
      setLoading(false);
      setSuccessMessage('¡Contraseña guardada con éxito!');
      
      setTimeout(() => {
        setLoginEmail(recoveryEmail);
        setLoginPassword(recoveryNewPassword);
        setAuthMode('login');
        setSuccessMessage('');
      }, 2000);
    } catch (err) {
      setLoading(false);
      setErrorMessage(err.message || 'Error al guardar la nueva contraseña.');
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 50}
      style={styles.container}
    >
      <ScrollView 
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent} 
        keyboardShouldPersistTaps="handled"
      >
        
        {/* Brand Logo Header */}
        <View style={styles.brandHeader}>
          <Image 
            source={require('../../assets/splash-icon.png')} 
            style={styles.brandLogoImage} 
          />
          <Text style={styles.brandSubtitle}>Registra ofertas, gana subastas online</Text>
        </View>

        {/* Tab Selection (Only show when not in recovery flows) */}
        {['login', 'pre-register'].includes(authMode) && (
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
        )}

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

              <Text style={styles.inputLabel}>Contraseña</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="******"
                  placeholderTextColor={COLORS.lightGray200}
                  value={loginPassword}
                  onChangeText={setLoginPassword}
                  secureTextEntry={!showLoginPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity 
                  style={styles.passwordVisibilityButton}
                  onPress={() => setShowLoginPassword(!showLoginPassword)}
                >
                  <Feather 
                    name={showLoginPassword ? "eye" : "eye-off"} 
                    size={20} 
                    color={COLORS.lightGray200} 
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={[styles.submitButton, loading && styles.disabledButton, { marginTop: 20 }]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color={COLORS.textWhite} /> : <Text style={styles.submitButtonText}>Entrar</Text>}
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.guestButton, { marginTop: 12 }]}
                onPress={onGuestLogin}
              >
                <Text style={styles.guestButtonText}>Ingresar como Invitado</Text>
              </TouchableOpacity>

              <Text style={styles.hintText}>
                ¿No tienes cuenta? Regístrate en la pestaña "Registro". Una vez aprobada tu cuenta por nuestro revisor técnico, recibirás tu contraseña predefinida por correo.
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

              <Text style={styles.inputLabel}>País de Residencia</Text>
              <TouchableOpacity 
                style={styles.countryPickerButton} 
                onPress={() => setShowCountriesModal(true)}
              >
                <Text style={styles.countryPickerText}>{selectedPaisNombre}</Text>
                <Text style={styles.countryPickerArrow}>▼</Text>
              </TouchableOpacity>

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

              <Text style={styles.inputLabel}>Fotografía del Documento</Text>
              <View style={styles.photoUploadRow}>
                <TouchableOpacity style={styles.photoBox} onPress={() => openSelector('frente')}>
                  {regDocFrente ? (
                    <Image source={{ uri: regDocFrente.uri }} style={styles.thumbnail} />
                  ) : (
                    <View style={styles.placeholderBox}>
                      <Feather name="camera" size={24} color={COLORS.lightGray200} style={{ marginBottom: 6 }} />
                      <Text style={styles.placeholderLabel}>Frente DNI</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.photoBox} onPress={() => openSelector('dorso')}>
                  {regDocDorso ? (
                    <Image source={{ uri: regDocDorso.uri }} style={styles.thumbnail} />
                  ) : (
                    <View style={styles.placeholderBox}>
                      <Feather name="camera" size={24} color={COLORS.lightGray200} style={{ marginBottom: 6 }} />
                      <Text style={styles.placeholderLabel}>Dorso DNI</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Selfie de Validación (Retrato)</Text>
              <TouchableOpacity style={styles.selfieBox} onPress={() => openSelector('selfie')}>
                {regSelfie ? (
                  <Image source={{ uri: regSelfie.uri }} style={styles.selfieThumbnail} />
                ) : (
                  <View style={styles.selfiePlaceholder}>
                    <Feather name="user" size={32} color={COLORS.lightGray200} style={{ marginBottom: 6 }} />
                    <Text style={styles.placeholderLabel}>Tomarse una Selfie</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.checkboxRow} 
                onPress={() => setAcceptPolicies(!acceptPolicies)}
              >
                <View style={[styles.checkbox, acceptPolicies && styles.checkboxChecked]}>
                  {acceptPolicies && <Feather name="check" size={14} color={COLORS.textWhite} />}
                </View>
                <Text style={styles.checkboxLabel}>
                  Acepto las políticas de privacidad y condiciones de uso de PujaYa!
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.submitButton, loading && styles.disabledButton]}
                onPress={handlePreRegister}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color={COLORS.textWhite} /> : <Text style={styles.submitButtonText}>Pre-Registrarse</Text>}
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => setShowSupportModal(true)} 
                style={styles.supportLink}
              >
                <Text style={styles.supportLinkText}>¿Problemas con el registro? Contactar Soporte</Text>
              </TouchableOpacity>
            </View>
          )}

        </View>

      </ScrollView>



      <Modal
        visible={showCountriesModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCountriesModal(false)}
      >
        <View style={styles.selectorOverlay}>
          <View style={[styles.selectorContainer, { maxHeight: '70%', width: '90%' }]}>
            <Text style={styles.selectorTitle}>Selecciona tu País</Text>
            <Text style={[styles.selectorSubtitle, { marginBottom: 12 }]}>Elige tu nacionalidad de origen</Text>
            
            <FlatList
              data={paises}
              keyExtractor={(item) => item.numero.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.countryRow}
                  onPress={() => {
                    setSelectedPais(item.numero);
                    setSelectedPaisNombre(item.nombre);
                    setShowCountriesModal(false);
                  }}
                >
                  <Text style={styles.countryRowText}>{item.nombre} ({item.nacionalidad})</Text>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              style={{ marginVertical: 10 }}
            />

            <TouchableOpacity 
              style={[styles.selectorOption, styles.cancelOption, { marginTop: 10 }]} 
              onPress={() => setShowCountriesModal(false)}
            >
              <Text style={styles.cancelOptionText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showSupportModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowSupportModal(false)}
      >
        <View style={styles.selectorOverlay}>
          <View style={[styles.selectorContainer, { width: '85%' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
              <Feather name="alert-triangle" size={20} color={COLORS.secondary} style={{ marginRight: 8 }} />
              <Text style={[styles.selectorTitle, { color: COLORS.secondary, marginBottom: 0 }]}>Soporte PujaYa!</Text>
            </View>
            <Text style={[styles.selectorSubtitle, { marginTop: 8, lineHeight: 18 }]}>
              Si tu documento ya está registrado, o tienes inconvenientes cargando tus fotos, por favor contáctanos:
            </Text>
            
            <View style={styles.supportDetailsBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Feather name="mail" size={16} color={COLORS.lightGray200} style={{ marginRight: 8 }} />
                <Text style={[styles.supportTextItem, { marginBottom: 0 }]}>Correo: <Text style={{ fontWeight: 'bold' }}>soporte@pujaya.com</Text></Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Feather name="phone" size={16} color={COLORS.lightGray200} style={{ marginRight: 8 }} />
                <Text style={[styles.supportTextItem, { marginBottom: 0 }]}>Teléfono: <Text style={{ fontWeight: 'bold' }}>+54 11 4444-5555</Text></Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather name="clock" size={16} color={COLORS.lightGray200} style={{ marginRight: 8 }} />
                <Text style={[styles.supportTextItem, { marginBottom: 0 }]}>Horario: Lunes a Viernes 9:00 a 18:00 hs</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.submitButton, { marginTop: 15 }]} 
              onPress={() => setShowSupportModal(false)}
            >
              <Text style={styles.submitButtonText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  brandLogoImage: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
    marginBottom: 8,
  },
  brandSubtitle: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeMd,
    marginTop: 6,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
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
    color: COLORS.textWhite,
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
    color: COLORS.textWhite,
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
  forgotPassContainer: {
    alignSelf: 'flex-end',
    marginBottom: 16,
    marginTop: -8,
  },
  forgotPassText: {
    color: COLORS.primary,
    fontWeight: FONTS.weightMedium,
    fontSize: FONTS.sizeMd,
  },
  countryPickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.darkGray600,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 16,
  },
  countryPickerText: {
    color: COLORS.white,
    fontSize: FONTS.sizeBase,
  },
  countryPickerArrow: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeMd,
  },
  selfieBox: {
    height: 120,
    width: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.darkGray600,
    alignSelf: 'center',
    overflow: 'hidden',
    marginBottom: 20,
  },
  selfieThumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  selfiePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingRight: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.darkGray600,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkmark: {
    color: COLORS.textWhite,
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    color: COLORS.lightGray100,
    fontSize: FONTS.sizeMd,
    flex: 1,
    lineHeight: 16,
  },
  supportLink: {
    alignItems: 'center',
    marginTop: 18,
    paddingVertical: 4,
  },
  supportLinkText: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeSm,
    textDecorationLine: 'underline',
  },
  cancelLink: {
    alignItems: 'center',
    marginTop: 16,
  },
  cancelLinkText: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeBase,
    fontWeight: FONTS.weightMedium,
  },
  countryRow: {
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  countryRowText: {
    color: COLORS.white,
    fontSize: FONTS.sizeBase,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  supportDetailsBox: {
    backgroundColor: COLORS.darkGray600,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  supportTextItem: {
    color: COLORS.white,
    fontSize: FONTS.sizeMd,
    marginBottom: 8,
    lineHeight: 18,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkGray600,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 16,
    height: 48,
    paddingRight: 12,
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    color: COLORS.white,
    paddingHorizontal: 16,
    fontSize: FONTS.sizeBase,
  },
  passwordVisibilityButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestButton: {
    backgroundColor: 'transparent',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.secondary,
    ...SHADOWS.orangeGlow,
  },
  guestButtonText: {
    color: COLORS.secondary,
    fontSize: FONTS.sizeBase,
    fontWeight: FONTS.weightBold,
  },
});
