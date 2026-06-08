import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  StatusBar,
  RefreshControl,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { apiService } from './src/api/apiService';
import { supabaseService } from './src/api/supabaseService';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import AuctionCard from './src/components/AuctionCard';
import AuctionDetailModal from './src/components/AuctionDetailModal';
import AuthScreen from './src/screens/AuthScreen';
import { COLORS, FONTS, SHADOWS } from './src/styles/theme';
import Logo from './src/components/Logo';
import SplashLoader from './src/components/SplashLoader';
import NotificationCenterModal from './src/components/NotificationCenterModal';

const CATEGORIES = [
  { key: 'Todos', label: 'Todos' },
  { key: 'comun', label: 'Común' },
  { key: 'especial', label: 'Especial' },
  { key: 'plata', label: 'Plata' },
  { key: 'oro', label: 'Oro' },
  { key: 'platino', label: 'Platino' }
];

export default function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Revisor input fields tracking state
  const [revisorPasswords, setRevisorPasswords] = useState({});
  const [revisorReasons, setRevisorReasons] = useState({});

  // Tab Navigation State
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'subastas', 'upload', 'articulos', 'perfil'

  // Auctions data state
  const [auctions, setAuctions] = useState([]);
  const [filteredAuctions, setFilteredAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  // Connection Info state
  const [dbStatus, setDbStatus] = useState({ configured: false, url: '' });

  // Detail Modal state
  const [selectedAuction, setSelectedAuction] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // User Stats (Simulated or fetched)
  const [userBalance, setUserBalance] = useState(250000); // 250,000 ARS/USD
  const [stats, setStats] = useState({ offers: 0, uploaded: 0, won: 0 });

  // Upload Product Form State
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadPrice, setUploadPrice] = useState('');
  const [uploadPhotos, setUploadPhotos] = useState([]); // Array of { uri, base64 }
  const [uploadDocPhoto, setUploadDocPhoto] = useState(null); // { uri, base64 }
  const [uploadArtist, setUploadArtist] = useState('');
  const [uploadYear, setUploadYear] = useState('');
  const [uploadContext, setUploadContext] = useState('');
  const [acceptUploadTerms, setAcceptUploadTerms] = useState(false);
  const [photoPickerMode, setPhotoPickerMode] = useState('product'); // 'product' or 'document'
  
  const [showPhotoSelector, setShowPhotoSelector] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Password Reset Modal State
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  // User Products list State
  const [myProducts, setMyProducts] = useState([]);
  const [loadingMyProducts, setLoadingMyProducts] = useState(false);

  // Notifications state
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [showNotifModal, setShowNotifModal] = useState(false);

  // Payments & Fines dashboard state
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [userFines, setUserFines] = useState([]);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [newCardNumber, setNewCardNumber] = useState('');
  const [newCardProvider, setNewCardProvider] = useState('Visa');
  const [newCardType, setNewCardType] = useState('tarjeta');

  // Revisor / Employee panel state
  const [pendingClients, setPendingClients] = useState([]);
  const [revisorLoading, setRevisorLoading] = useState(false);

  // Subastas Catalog navigation state
  const [subastas, setSubastas] = useState([]);
  const [selectedSubasta, setSelectedSubasta] = useState(null);
  const [loadingSubastas, setLoadingSubastas] = useState(false);

  // Check auth status on launch
  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    const startTime = Date.now();
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        const profile = await apiService.getProfile();
        setUserProfile(profile);
        setIsAuthenticated(true);
        fetchData();
        checkConnection();
      } else {
        setIsAuthenticated(false);
        setUserProfile(null);
      }
    } catch (e) {
      console.warn('[App] Session check failed, redirecting to login:', e);
      setIsAuthenticated(false);
      setUserProfile(null);
    } finally {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 4000 - elapsed);
      setTimeout(() => {
        setAuthLoading(false);
      }, remaining);
    }
  };

  const handleLoginSuccess = () => {
    setAuthLoading(true);
    checkAuthentication();
  };

  const handleLogout = async () => {
    setAuthLoading(true);
    await apiService.logout();
    setIsAuthenticated(false);
    setUserProfile(null);
    setAuctions([]);
    setFilteredAuctions([]);
    setActiveTab('home');
    setAuthLoading(false);
  };

  // Fetch my products and stats
  const fetchMyProductsAndStats = async () => {
    if (!isAuthenticated) return;
    try {
      setLoadingMyProducts(true);
      const data = await apiService.getUserProducts();
      setMyProducts(data || []);

      // Calculate stats based on auctions
      const myOffersCount = auctions.filter(a => a.highest_bidder === userProfile?.nombre).length + 2; 
      const wonAuctionsCount = Math.max(0, myOffersCount - 1); 
      setStats({
        offers: myOffersCount,
        uploaded: data ? data.length : 0,
        won: wonAuctionsCount
      });
    } catch (e) {
      console.warn('[App] Failed to fetch products or stats:', e);
    } finally {
      setLoadingMyProducts(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchMyProductsAndStats();
    }
  }, [isAuthenticated, activeTab, auctions]);

  useEffect(() => {
    if (isAuthenticated) {
      const unsubscribe = supabaseService.subscribeToBids((payload) => {
        console.log('[App] Realtime event received:', payload);
        setAuctions(prevAuctions => 
          prevAuctions.map(item => {
            if (item.identificador === payload.auctionId) {
              return {
                ...item,
                precio_actual: payload.precio_actual,
                bid_count: payload.bid_count,
                highest_bidder: payload.highest_bidder
              };
            }
            return item;
          })
        );
      });

      return () => {
        unsubscribe();
      };
    }
  }, [isAuthenticated]);

  const fetchUserData = async () => {
    if (!userProfile) return;
    try {
      const uId = userProfile.identificador;
      
      // Load payment methods
      const pm = await apiService.getPaymentMethods(uId);
      setPaymentMethods(pm || []);
      
      // Load fines
      const fn = await apiService.getUserFines(uId);
      setUserFines(fn || []);
      
      // Load notifications count
      const nt = await apiService.getUserNotifications(uId);
      const unread = nt.filter(n => n.leido !== 'si').length;
      setUnreadNotifCount(unread);

      // Load subastas list
      fetchSubastas();

      // If user is employee, load pending registrations
      if (userProfile.cargo === 'Revisor Técnico') {
        fetchPendingRegistrations();
      }
    } catch (e) {
      console.warn('Error fetching user dashboard data:', e);
    }
  };

  const fetchSubastas = async () => {
    setLoadingSubastas(true);
    try {
      const configured = supabaseService.getConfigStatus().configured;
      if (!configured) {
        const mockSubs = [
          { identificador: 1, fecha: '2026-06-15', hora: '14:30:00', estado: 'abierta', ubicacion: 'Hotel Hilton, Salón B', capacidadasistentes: 150, tienedeposito: 'no', seguridadpropia: 'si', categoria: 'oro' },
          { identificador: 2, fecha: '2026-06-20', hora: '10:00:00', estado: 'abierta', ubicacion: 'Subasta 100% Virtual', capacidadasistentes: 500, tienedeposito: 'no', seguridadpropia: 'no', categoria: 'comun' },
          { identificador: 3, fecha: '2026-06-25', hora: '18:00:00', estado: 'abierta', ubicacion: 'Depósito Central', capacidadasistentes: 50, tienedeposito: 'si', seguridadpropia: 'si', categoria: 'platino' }
        ];
        setSubastas(mockSubs);
      } else {
        const { supabase } = require('./src/api/supabaseClient');
        const { data, error } = await supabase
          .from('subastas')
          .select('*');
        if (!error && data) {
          setSubastas(data);
        }
      }
    } catch (e) {
      console.warn('Error loading subastas:', e);
    } finally {
      setLoadingSubastas(false);
    }
  };

  const fetchPendingRegistrations = async () => {
    setRevisorLoading(true);
    try {
      const data = await apiService.getPendingClients();
      setPendingClients(data || []);
    } catch (e) {
      console.warn('Error loading pending registrations:', e);
    } finally {
      setRevisorLoading(false);
    }
  };

  const handleAddPaymentMethod = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    if (!newCardNumber) {
      setErrorMessage(newCardType === 'tarjeta' ? 'Por favor ingresa los datos de la tarjeta.' : 'Por favor ingresa los datos del CBU.');
      return;
    }
    
    // Mask number
    const trimmed = newCardNumber.trim().replace(/[^0-9]/g, '');
    const numericRegex = /^[0-9]+$/;
    if (!numericRegex.test(trimmed)) {
      setErrorMessage('El dato ingresado debe contener únicamente números.');
      return;
    }

    if (newCardType === 'tarjeta') {
      if (trimmed.length < 15 || trimmed.length > 16) {
        setErrorMessage('El número de tarjeta debe tener 15 o 16 dígitos.');
        return;
      }
    } else {
      if (trimmed.length !== 22) {
        setErrorMessage('El CBU debe tener exactamente 22 dígitos.');
        return;
      }
    }
    const mascara = `**** **** **** ${trimmed.slice(-4)}`;
    const payload = {
      tipo: newCardType,
      proveedor: newCardProvider,
      mascara
    };

    try {
      setUploadLoading(true);
      await apiService.addPaymentMethod(userProfile.identificador, payload);
      setSuccessMessage('¡Medio de pago registrado con éxito!');
      setNewCardNumber('');
      setShowAddPaymentModal(false);
      fetchUserData(); // Reload list
    } catch (err) {
      setErrorMessage(err.message || 'Error al guardar medio de pago.');
    } finally {
      setUploadLoading(false);
    }
  };

  const handlePayFine = async (fineId, amount) => {
    setErrorMessage('');
    setSuccessMessage('');
    try {
      setLoadingMyProducts(true); // show general loading indicator
      await apiService.payFine(fineId);
      // Deduct from balance
      setUserBalance(prev => Math.max(0, prev - amount));
      setSuccessMessage('¡Multa pagada con éxito!');
      fetchUserData(); // Reload fines list
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (err) {
      setErrorMessage('Error al pagar la multa.');
    } finally {
      setLoadingMyProducts(false);
    }
  };

  const handleChangePassword = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setErrorMessage('Por favor completa todos los campos.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMessage('Las nuevas contraseñas no coinciden.');
      return;
    }

    try {
      setChangePasswordLoading(true);
      await apiService.changePassword(userProfile.email, currentPassword, newPassword);
      setSuccessMessage('¡Contraseña cambiada con éxito!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      
      // Auto close modal after 1.5 seconds
      setTimeout(() => {
        setShowChangePasswordModal(false);
        setSuccessMessage('');
      }, 1500);
    } catch (err) {
      setErrorMessage(err.message || 'Error al cambiar la contraseña.');
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const handleApproveClient = async (clientId, password) => {
    setErrorMessage('');
    setSuccessMessage('');
    
    if (!password || password.trim().length < 6) {
      Alert.alert('Error', 'La contraseña predefinida debe tener al menos 6 caracteres.');
      return;
    }

    try {
      setRevisorLoading(true);
      const res = await apiService.approveClient(clientId, password.trim());
      
      Alert.alert(
        'Cliente Admitido',
        `El cliente ha sido admitido con éxito.\n\n${res.emailSimulated}`
      );
      
      // Clear values for this client
      setRevisorPasswords(prev => {
        const copy = { ...prev };
        delete copy[clientId];
        return copy;
      });
      
      fetchPendingRegistrations();
    } catch (err) {
      setErrorMessage('Error al procesar la admisión.');
      Alert.alert('Error', err.message || 'Error al admitir al cliente.');
    } finally {
      setRevisorLoading(false);
    }
  };

  const handleRejectClient = async (clientId, reason) => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!reason || reason.trim().length === 0) {
      Alert.alert('Error', 'Por favor, escribe el motivo del rechazo antes de presionar Rechazar.');
      return;
    }

    try {
      setRevisorLoading(true);
      const res = await apiService.rejectClient(clientId, reason.trim());
      
      Alert.alert(
        'Registro Rechazado',
        `El registro ha sido rechazado y los datos del usuario se han eliminado de la base de datos.\n\n${res.emailSimulated}`
      );

      // Clear values for this client
      setRevisorReasons(prev => {
        const copy = { ...prev };
        delete copy[clientId];
        return copy;
      });

      fetchPendingRegistrations();
    } catch (err) {
      setErrorMessage('Error al procesar el rechazo.');
      Alert.alert('Error', err.message || 'Error al rechazar al cliente.');
    } finally {
      setRevisorLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && userProfile) {
      fetchUserData();
    }
  }, [isAuthenticated, userProfile, activeTab]);

  useEffect(() => {
    filterData();
  }, [auctions, searchQuery, selectedCategory, selectedSubasta]);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabaseService.getAuctions();
    setAuctions(data || []);
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    const { data } = await supabaseService.getAuctions();
    setAuctions(data || []);
    setRefreshing(false);
  };

  const checkConnection = () => {
    const status = supabaseService.getConfigStatus();
    setDbStatus(status);
  };

  const filterData = () => {
    let result = [...auctions];

    if (selectedSubasta) {
      result = result.filter(item => item.subasta_id === selectedSubasta.identificador);
    }

    if (selectedCategory !== 'Todos') {
      result = result.filter(item => item.categoria === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.producto.titulo.toLowerCase().includes(query) || 
        item.producto.descripcion.toLowerCase().includes(query)
      );
    }

    setFilteredAuctions(result);
  };

  const handleBidPress = (auction) => {
    setSelectedAuction(auction);
    setModalVisible(true);
  };

  const handleBidSuccess = (updatedAuction) => {
    if (selectedAuction) {
      const bidDiff = updatedAuction.precio_actual - selectedAuction.precio_actual;
      setUserBalance(prev => Math.max(0, prev - bidDiff));
    }

    setAuctions(prev => 
      prev.map(item => item.identificador === updatedAuction.identificador ? updatedAuction : item)
    );
    setSelectedAuction(updatedAuction);
  };

  const openPhotoSourceSelector = (mode) => {
    Alert.alert(
      mode === 'product' ? 'Subir foto del producto' : 'Subir Documento de Origen',
      '¿Cómo quieres agregar la foto?',
      [
        { 
          text: 'Tomar Foto con la Cámara', 
          onPress: () => {
            setPhotoPickerMode(mode);
            pickPhoto('camera', mode);
          } 
        },
        { 
          text: 'Elegir desde la Galería', 
          onPress: () => {
            setPhotoPickerMode(mode);
            pickPhoto('gallery', mode);
          } 
        },
        { text: 'Cancelar', style: 'cancel' }
      ]
    );
  };

  // Image Selector helper
  const pickPhoto = async (source, mode = photoPickerMode) => {
    try {
      let result;
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          setErrorMessage('Permiso de cámara denegado.');
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
          setErrorMessage('Permiso de biblioteca denegado.');
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
        const pickedAsset = {
          uri: result.assets[0].uri,
          base64: result.assets[0].base64
        };
        if (mode === 'product') {
          setUploadPhotos(prev => [...prev, pickedAsset]);
        } else {
          setUploadDocPhoto(pickedAsset);
        }
      }
    } catch (e) {
      setErrorMessage('Error al seleccionar la imagen.');
    }
  };

  // Handle uploading product
  const handleUploadProduct = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!uploadTitle.trim() || !uploadDesc.trim() || !uploadPrice.trim() || !uploadContext.trim()) {
      setErrorMessage('Por favor completa todos los campos del formulario.');
      return;
    }

    if (isNaN(uploadPrice) || Number(uploadPrice) <= 0) {
      setErrorMessage('El precio base debe ser un número positivo.');
      return;
    }

    if (uploadPhotos.length < 6) {
      setErrorMessage(`Debes subir un mínimo de 6 fotos del producto. (Cargadas: ${uploadPhotos.length})`);
      return;
    }

    if (!uploadDocPhoto) {
      setErrorMessage('Por favor sube el Documento de Origen del producto.');
      return;
    }

    if (!acceptUploadTerms) {
      setErrorMessage('Debes aceptar los términos y condiciones de subasta para continuar.');
      return;
    }

    setUploadLoading(true);
    try {
      const payload = {
        titulo: uploadTitle.trim(),
        descripcion: uploadDesc.trim(),
        precioBase: Number(uploadPrice),
        fotos: uploadPhotos.map(p => p.base64),
        informacionHistorica: uploadContext.trim(),
        documentoOrigenBase64: uploadDocPhoto.base64
      };

      await apiService.uploadProduct(payload);
      
      setSuccessMessage('¡Producto subido y publicado en subastas con éxito!');
      setUploadTitle('');
      setUploadDesc('');
      setUploadPrice('');
      setUploadPhotos([]);
      setUploadDocPhoto(null);
      setUploadContext('');
      setAcceptUploadTerms(false);
      setUploadLoading(false);

      // Force refresh auctions data
      fetchData();

      // Redirect to user articles after 1.5 seconds
      setTimeout(() => {
        setSuccessMessage('');
        setActiveTab('articulos');
      }, 1500);

    } catch (err) {
      setUploadLoading(false);
      setErrorMessage(err.message || 'Error al subir el producto.');
    }
  };

  if (authLoading) {
    return <SplashLoader statusText="Iniciando PujaYa!..." />;
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.darkGray600} />
        <AuthScreen onLoginSuccess={handleLoginSuccess} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.darkGray600} />
      
      {/* 1. SCREEN VIEW SWITCHER */}
      <View style={styles.mainContent}>

        {/* ========================================================== */}
        {/* PANTALLA 1: INICIO / DASHBOARD (HOME)                      */}
        {/* ========================================================== */}
        {activeTab === 'home' && (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Header Panel */}
            <View style={styles.homeHeader}>
              <View>
                <Text style={styles.headerWelcome}>¡Hola de nuevo!</Text>
                <Text style={styles.headerName}>{userProfile?.nombre}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => setShowNotifModal(true)} style={[styles.logoutIconButton, { marginRight: 10 }]}>
                  <Feather name="bell" size={18} color={COLORS.white} />
                  {unreadNotifCount > 0 && (
                    <View style={styles.bellBadgeMini}>
                      <Text style={styles.bellBadgeTextMini}>{unreadNotifCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutIconButton}>
                  <Feather name="log-out" size={18} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Balance Card */}
            <View style={styles.balanceCard}>
              <View style={styles.balanceHeaderRow}>
                <Text style={styles.balanceCardTitle}>SALDO TOTAL DISPONIBLE</Text>
                <View style={styles.tierBadge}>
                  <Text style={styles.tierBadgeText}>{userProfile?.categoria?.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.balanceCardValue}>${userBalance.toLocaleString()}</Text>
              <Text style={styles.balanceCardHint}>Límite de crédito asignado para ofertas</Text>
            </View>

            {/* Quick Stats Panel */}
            <Text style={styles.sectionTitle}>Mi Actividad</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <FontAwesome5 name="gavel" size={20} color={COLORS.primary} style={{ marginBottom: 6 }} />
                <Text style={styles.statValue}>{stats.offers}</Text>
                <Text style={styles.statLabel}>Ofertas</Text>
              </View>

              <View style={styles.statBox}>
                <Feather name="package" size={20} color={COLORS.primary} style={{ marginBottom: 6 }} />
                <Text style={styles.statValue}>{stats.uploaded}</Text>
                <Text style={styles.statLabel}>Artículos</Text>
              </View>

              <View style={styles.statBox}>
                <Feather name="award" size={20} color={COLORS.primary} style={{ marginBottom: 6 }} />
                <Text style={styles.statValue}>{stats.won}</Text>
                <Text style={styles.statLabel}>Ganadas</Text>
              </View>
            </View>

            {/* Featured Auctions */}
            <View style={styles.featuredHeaderRow}>
              <Text style={styles.sectionTitle}>Subastas Destacadas</Text>
              <TouchableOpacity onPress={() => setActiveTab('subastas')}>
                <Text style={styles.viewAllText}>Ver todas ➔</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
            ) : auctions.length === 0 ? (
              <Text style={styles.emptyText}>No hay subastas activas en este momento.</Text>
            ) : (
              <View style={styles.featuredList}>
                {auctions.slice(0, 2).map((item) => (
                  <AuctionCard key={item.identificador} auction={item} onBidPress={handleBidPress} />
                ))}
              </View>
            )}
          </ScrollView>
        )}

        {/* ========================================================== */}
        {/* PANTALLA 2: CATÁLOGOS DE SUBASTAS (SUBASTAS)               */}
        {/* ========================================================== */}
        {activeTab === 'subastas' && (
          <View style={{ flex: 1 }}>
            {!selectedSubasta ? (
              <View style={{ flex: 1 }}>
                {/* Header Panel */}
                <View style={styles.header}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <View>
                      <Text style={styles.headerTitle}>Catálogos de Subasta</Text>
                      <Text style={styles.headerSubtitle}>Selecciona una subasta activa</Text>
                    </View>
                    <TouchableOpacity onPress={() => setShowNotifModal(true)} style={styles.bellButton}>
                      <Feather name="bell" size={22} color={COLORS.white} />
                      {unreadNotifCount > 0 && (
                        <View style={styles.bellBadge}>
                          <Text style={styles.bellBadgeText}>{unreadNotifCount}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {loadingSubastas ? (
                  <View style={styles.tabLoader}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Cargando subastas...</Text>
                  </View>
                ) : subastas.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Feather name="calendar" size={40} color={COLORS.lightGray200} style={{ marginBottom: 12 }} />
                    <Text style={styles.emptyTextTitle}>No hay subastas programadas</Text>
                    <Text style={styles.emptyTextSubtitle}>Por favor intenta más tarde.</Text>
                  </View>
                ) : (
                  <FlatList
                    data={subastas}
                    keyExtractor={(item) => item.identificador.toString()}
                    contentContainerStyle={styles.listContainer}
                    renderItem={({ item }) => (
                      <TouchableOpacity 
                        style={styles.subastaCatalogCard}
                        onPress={() => setSelectedSubasta(item)}
                      >
                        <View style={styles.subastaCatalogHeader}>
                          <View style={styles.subastaCatalogDateRow}>
                            <Feather name="calendar" size={14} color={COLORS.lightGray200} style={{ marginRight: 4 }} />
                            <Text style={styles.subastaCatalogDateText}>{item.fecha} a las {item.hora}</Text>
                          </View>
                          <View style={[styles.subastaCatalogBadge, { backgroundColor: item.estado === 'abierta' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' }]}>
                            <Text style={[styles.subastaCatalogBadgeText, { color: item.estado === 'abierta' ? COLORS.success : COLORS.danger }]}>
                              {item.estado.toUpperCase()}
                            </Text>
                          </View>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                          <Feather name="map-pin" size={14} color={COLORS.lightGray200} style={{ marginRight: 6 }} />
                          <Text style={[styles.subastaCatalogLocation, { flex: 1 }]} numberOfLines={2}>{item.ubicacion}</Text>
                        </View>

                        <View style={styles.subastaCatalogDetails}>
                          <View style={styles.subastaDetailItem}>
                            <Text style={styles.subastaDetailLabel}>Capacidad:</Text>
                            <Text style={styles.subastaDetailValue}>{item.capacidadasistentes} postores</Text>
                          </View>
                          <View style={styles.subastaDetailItem}>
                            <Text style={styles.subastaDetailLabel}>Categoría:</Text>
                            <Text style={[styles.subastaDetailValue, styles.categoryPillText]}>
                              {item.categoria.toUpperCase()}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.subastaCatalogExtraInfo}>
                          <Text style={styles.subastaExtraLabel}>
                            Depósito: <Text style={{ color: item.tienedeposito === 'si' ? COLORS.success : COLORS.lightGray200 }}>{item.tienedeposito === 'si' ? 'Sí' : 'No'}</Text>
                          </Text>
                          <Text style={styles.subastaExtraLabel}>
                            Seguridad: <Text style={{ color: item.seguridadpropia === 'si' ? COLORS.success : COLORS.lightGray200 }}>{item.seguridadpropia === 'si' ? 'Sí' : 'No'}</Text>
                          </Text>
                        </View>

                        <View style={styles.subastaCatalogButton}>
                          <Text style={styles.subastaCatalogButtonText}>Ver Catálogo de Artículos ➔</Text>
                        </View>
                      </TouchableOpacity>
                    )}
                  />
                )}
              </View>
            ) : (
              <View style={{ flex: 1 }}>
                {/* Catalog Detail List header */}
                <View style={styles.header}>
                  <TouchableOpacity onPress={() => setSelectedSubasta(null)} style={[styles.backButton, { flexDirection: 'row', alignItems: 'center' }]}>
                    <Feather name="arrow-left" size={14} color={COLORS.secondary} style={{ marginRight: 6 }} />
                    <Text style={styles.backButtonText}>Volver a Subastas</Text>
                  </TouchableOpacity>
                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.headerTitle}>Catálogo de Artículos</Text>
                    <Text style={styles.headerSubtitle}>
                      Subasta en {selectedSubasta.ubicacion} (Cat. {selectedSubasta.categoria.toUpperCase()})
                    </Text>
                  </View>
                </View>

                {/* Search & Category filter */}
                <View style={styles.searchSection}>
                  <View style={styles.searchBar}>
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Buscar artículos en esta subasta..."
                      placeholderTextColor={COLORS.lightGray200}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                    {searchQuery ? (
                      <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                        <Feather name="x" size={16} color={COLORS.lightGray200} />
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {/* Categories Scroll */}
                  <View style={styles.categoriesContainer}>
                    <FlatList
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      data={CATEGORIES}
                      keyExtractor={(item) => item.key}
                      renderItem={({ item }) => {
                        const isSelected = selectedCategory === item.key;
                        return (
                          <TouchableOpacity
                            style={[styles.categoryTab, isSelected && styles.activeCategoryTab]}
                            onPress={() => setSelectedCategory(item.key)}
                          >
                            <Text style={[styles.categoryTabText, isSelected && styles.activeCategoryTabText]}>
                              {item.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      }}
                    />
                  </View>
                </View>

                {/* Auction List */}
                {loading ? (
                  <View style={styles.tabLoader}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Cargando artículos...</Text>
                  </View>
                ) : filteredAuctions.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyTextIcon}>🔍</Text>
                    <Text style={styles.emptyTextTitle}>Sin artículos en esta subasta</Text>
                    <Text style={styles.emptyTextSubtitle}>Intenta cambiando los filtros o la búsqueda.</Text>
                  </View>
                ) : (
                  <FlatList
                    data={filteredAuctions}
                    keyExtractor={(item) => item.identificador.toString()}
                    renderItem={({ item }) => (
                      <AuctionCard auction={item} onBidPress={handleBidPress} />
                    )}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                      <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={COLORS.primary}
                        colors={[COLORS.primary]}
                      />
                    }
                  />
                )}
              </View>
            )}
          </View>
        )}

        {/* ========================================================== */}
        {/* PANTALLA 3: REGISTRO / SUBIDA DE PRODUCTOS (UPLOAD)        */}
        {/* ========================================================== */}
        {activeTab === 'upload' && (
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={{ flex: 1 }}
          >
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <View style={styles.uploadHeader}>
                  <Text style={styles.headerTitle}>Subir Producto</Text>
                  <Text style={styles.headerSubtitle}>Registra un artículo para subasta</Text>
                </View>
                <TouchableOpacity onPress={() => setShowNotifModal(true)} style={styles.bellButton}>
                  <Feather name="bell" size={22} color={COLORS.white} />
                  {unreadNotifCount > 0 && (
                    <View style={styles.bellBadge}>
                      <Text style={styles.bellBadgeText}>{unreadNotifCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.card}>
                {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
                {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

                <Text style={styles.inputLabel}>Título del Producto</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: iPhone 15 Pro Max 256GB"
                  placeholderTextColor={COLORS.lightGray200}
                  value={uploadTitle}
                  onChangeText={setUploadTitle}
                />

                <Text style={styles.inputLabel}>Descripción del Catálogo</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Detalles, estado físico, caja, accesorios..."
                  placeholderTextColor={COLORS.lightGray200}
                  value={uploadDesc}
                  onChangeText={setUploadDesc}
                  multiline
                  numberOfLines={3}
                />

                <Text style={styles.inputLabel}>Precio Base ($ USD/ARS)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: 1200"
                  placeholderTextColor={COLORS.lightGray200}
                  value={uploadPrice}
                  onChangeText={setUploadPrice}
                  keyboardType="numeric"
                />

                <Text style={styles.inputLabel}>Información Histórica del Producto</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Origen, dueños anteriores, hechos históricos notables..."
                  placeholderTextColor={COLORS.lightGray200}
                  value={uploadContext}
                  onChangeText={setUploadContext}
                  multiline
                  numberOfLines={3}
                />

                <View style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={styles.inputLabel}>Fotos del Producto ({uploadPhotos.length} de 6 mín.)</Text>
                    {uploadPhotos.length < 10 && (
                      <TouchableOpacity 
                        style={styles.addPhotoMiniButton} 
                        onPress={() => openPhotoSourceSelector('product')}
                      >
                        <Text style={styles.addPhotoMiniButtonText}>+ Agregar</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {uploadPhotos.length === 0 ? (
                    <TouchableOpacity 
                      style={styles.photoUploadBox} 
                      onPress={() => openPhotoSourceSelector('product')}
                    >
                      <View style={styles.photoPlaceholder}>
                        <Feather name="image" size={32} color={COLORS.lightGray200} style={{ marginBottom: 6 }} />
                        <Text style={styles.photoPlaceholderLabel}>Seleccionar Mínimo 6 Fotos</Text>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalPhotosScroll}>
                      {uploadPhotos.map((item, idx) => (
                        <View key={idx.toString()} style={styles.photoScrollItem}>
                          <Image source={{ uri: item.uri }} style={styles.photoScrollImage} />
                          <TouchableOpacity 
                            style={styles.deletePhotoBadge}
                            onPress={() => {
                              setUploadPhotos(prev => prev.filter((_, i) => i !== idx));
                            }}
                          >
                            <Feather name="x" size={10} color={COLORS.textWhite} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                  )}
                </View>

                <Text style={styles.inputLabel}>Documento de Origen (Certificado / Papeles)</Text>
                <TouchableOpacity 
                  style={styles.photoUploadBox} 
                  onPress={() => openPhotoSourceSelector('document')}
                >
                  {uploadDocPhoto ? (
                    <View style={{ flex: 1, position: 'relative' }}>
                      <Image source={{ uri: uploadDocPhoto.uri }} style={styles.uploadedThumbnail} />
                      <View style={styles.docCheckOverlay}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                          <Feather name="check" size={14} color={COLORS.textWhite} style={{ marginRight: 6 }} />
                          <Text style={styles.docCheckOverlayText}>Documento Cargado</Text>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Feather name="file-text" size={32} color={COLORS.lightGray200} style={{ marginBottom: 6 }} />
                      <Text style={styles.photoPlaceholderLabel}>Subir Documento de Procedencia</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.checkboxContainer} 
                  onPress={() => setAcceptUploadTerms(!acceptUploadTerms)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, acceptUploadTerms && styles.checkboxChecked]}>
                    {acceptUploadTerms && <Feather name="check" size={12} color={COLORS.textWhite} />}
                  </View>
                  <Text style={styles.checkboxLabel}>
                    Acepto que los datos y documentos provistos son reales y autorizo la revisión del artículo.
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.submitButton, (uploadLoading || !acceptUploadTerms || uploadPhotos.length < 6 || !uploadDocPhoto) && styles.disabledButton]}
                  onPress={handleUploadProduct}
                  disabled={uploadLoading}
                >
                  {uploadLoading ? (
                    <ActivityIndicator color={COLORS.textWhite} />
                  ) : (
                    <Text style={styles.submitButtonText}>Publicar Artículo</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        )}

        {/* ========================================================== */}
        {/* PANTALLA 4: MIS ARTÍCULOS REGISTRADOS (ARTICULOS)          */}
        {/* ========================================================== */}
        {activeTab === 'articulos' && (
          <View style={{ flex: 1 }}>
            <View style={styles.header}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <View>
                  <Text style={styles.headerTitle}>Mis Artículos</Text>
                  <Text style={styles.headerSubtitle}>Productos registrados a tu nombre</Text>
                </View>
                <TouchableOpacity onPress={() => setShowNotifModal(true)} style={styles.bellButton}>
                  <Feather name="bell" size={22} color={COLORS.white} />
                  {unreadNotifCount > 0 && (
                    <View style={styles.bellBadge}>
                      <Text style={styles.bellBadgeText}>{unreadNotifCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {loadingMyProducts ? (
              <View style={styles.tabLoader}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Cargando tus artículos...</Text>
              </View>
            ) : myProducts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Feather name="package" size={40} color={COLORS.lightGray200} style={{ marginBottom: 12 }} />
                <Text style={styles.emptyTextTitle}>Aún no has subido artículos</Text>
                <Text style={styles.emptyTextSubtitle}>Usa el botón central (+) para agregar tu primer producto.</Text>
              </View>
            ) : (
              <FlatList
                data={myProducts}
                keyExtractor={(item) => item.identificador.toString()}
                renderItem={({ item }) => (
                  <View style={styles.productCard}>
                    <Image source={{ uri: item.foto }} style={styles.productImage} />
                    <View style={styles.productInfo}>
                      <Text style={styles.productTitle}>{item.titulo}</Text>
                      <Text style={styles.productDesc} numberOfLines={2}>{item.descripcion}</Text>
                      <View style={styles.productBadgeRow}>
                        <View style={[styles.statusBadge, item.disponible === 'si' ? styles.statusBadgeActive : styles.statusBadgeSold]}>
                          <Text style={styles.statusBadgeText}>
                            {item.disponible === 'si' ? 'En Subasta / Disponible' : 'Vendido'}
                          </Text>
                        </View>
                        <Text style={styles.productDate}>{item.fecha}</Text>
                      </View>
                    </View>
                  </View>
                )}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        )}

        {/* ========================================================== */}
        {/* PANTALLA 5: PERFIL DE USUARIO / CONFIGURACIÓN (PERFIL)     */}
        {/* ========================================================== */}
        {activeTab === 'perfil' && (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <View style={styles.perfilHeader}>
                <Text style={styles.headerTitle}>Mi Perfil</Text>
                <Text style={styles.headerSubtitle}>Datos de tu cuenta de Postor</Text>
              </View>
              <TouchableOpacity onPress={() => setShowNotifModal(true)} style={styles.bellButton}>
                <Feather name="bell" size={22} color={COLORS.white} />
                {unreadNotifCount > 0 && (
                  <View style={styles.bellBadge}>
                    <Text style={styles.bellBadgeText}>{unreadNotifCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Profile Avatar Card */}
            <View style={styles.profileAvatarCard}>
              <View style={styles.avatarIconBox}>
                {userProfile?.foto ? (
                  <Image source={{ uri: userProfile.foto }} style={styles.avatarImage} />
                ) : (
                  <Feather name="user" size={40} color={COLORS.lightGray200} />
                )}
              </View>
              <Text style={styles.profileNameText}>{userProfile?.nombre}</Text>
              <View style={[styles.profileTierBadge, SHADOWS.glow]}>
                <Text style={styles.profileTierBadgeText}>Nivel {userProfile?.categoria?.toUpperCase()}</Text>
              </View>
            </View>

            {/* User Data Card */}
            <View style={[styles.card, { marginBottom: 20 }]}>
              <Text style={styles.profileSectionTitle}>DATOS PERSONALES</Text>

              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>NÚMERO DE DOCUMENTO (DNI)</Text>
                <Text style={styles.profileValue}>{userProfile?.documento}</Text>
              </View>

              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>CORREO ELECTRÓNICO</Text>
                <Text style={styles.profileValue}>{userProfile?.email}</Text>
              </View>

              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>DIRECCIÓN REGISTRADA</Text>
                <Text style={styles.profileValue}>{userProfile?.direccion || 'No registrada'}</Text>
              </View>

              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>ESTADO DE VERIFICACIÓN</Text>
                <View style={styles.profileStatusRow}>
                  <View style={[styles.profileStatusDot, userProfile?.estado === 'activo' ? styles.dotGreen : styles.dotAmber]} />
                  <Text style={styles.profileStatusText}>
                    {userProfile?.estado === 'activo' ? 'Cuenta Verificada / Activa' : 'Pendiente de aprobación'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.changePasswordButton}
                onPress={() => {
                  setErrorMessage('');
                  setSuccessMessage('');
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmNewPassword('');
                  setShowCurrentPassword(false);
                  setShowNewPassword(false);
                  setShowConfirmNewPassword(false);
                  setShowChangePasswordModal(true);
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="lock" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.changePasswordButtonText}>Cambiar Contraseña</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Payment Methods Card */}
            <View style={[styles.card, { marginBottom: 20 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={styles.profileSectionTitle}>MEDIOS DE PAGO</Text>
                <TouchableOpacity 
                  style={styles.addPaymentMiniBtn}
                  onPress={() => {
                    setErrorMessage('');
                    setSuccessMessage('');
                    setShowAddPaymentModal(true);
                  }}
                >
                  <Text style={styles.addPaymentMiniBtnText}>+ Agregar</Text>
                </TouchableOpacity>
              </View>

              {paymentMethods.length === 0 ? (
                <Text style={styles.emptyCardListText}>No tienes medios de pago registrados.</Text>
              ) : (
                paymentMethods.map((pm) => (
                  <View key={pm.identificador.toString()} style={styles.paymentMethodItem}>
                    <View style={styles.paymentMethodIconBox}>
                      <Feather name="credit-card" size={18} color={COLORS.primary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.paymentMethodProvider}>
                        {pm.proveedor} ({pm.tipo === 'tarjeta' ? 'Tarjeta' : 'CBU'})
                      </Text>
                      <Text style={styles.paymentMethodMascara}>{pm.mascara}</Text>
                    </View>
                    <View style={styles.paymentMethodStatus}>
                      <Text style={styles.paymentMethodStatusText}>{pm.estado.toUpperCase()}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Fines Card */}
            <View style={[styles.card, { marginBottom: 20 }]}>
              <Text style={styles.profileSectionTitle}>MIS MULTAS Y SANCIONES</Text>
              
              {userFines.length === 0 ? (
                <Text style={styles.emptyCardListText}>¡Felicitaciones! No tienes multas registradas.</Text>
              ) : (
                userFines.map((fine) => {
                  const isPending = fine.estado === 'pendiente';
                  return (
                    <View key={fine.identificador.toString()} style={styles.fineItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fineDesc}>{fine.descripcion}</Text>
                        <Text style={styles.fineDate}>
                          {new Date(fine.fechacreacion).toLocaleDateString()} a las {new Date(fine.fechacreacion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        <Text style={[styles.fineMonto, { color: isPending ? COLORS.danger : COLORS.success }]}>
                          Monto: ${Number(fine.monto).toLocaleString()}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                        <View style={[styles.fineStatusBadge, { backgroundColor: isPending ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)' }]}>
                          <Text style={[styles.fineStatusText, { color: isPending ? COLORS.danger : COLORS.success }]}>
                            {fine.estado.toUpperCase()}
                          </Text>
                        </View>
                        {isPending && (
                          <TouchableOpacity 
                            style={styles.payFineButton}
                            onPress={() => handlePayFine(fine.identificador, fine.monto)}
                          >
                            <Text style={styles.payFineButtonText}>Pagar</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            {/* ========================================================== */}
            {/* SECCIÓN ESPECIAL: PANEL DEL REVISOR TÉCNICO              */}
            {/* (Solo para usuarios con cargo 'Revisor Técnico')          */}
            {/* ========================================================== */}
            {userProfile?.cargo === 'Revisor Técnico' && (
              <View style={[styles.card, { borderColor: COLORS.secondary, borderWidth: 1.5, marginBottom: 20 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Feather name="shield" size={18} color={COLORS.secondary} style={{ marginRight: 6 }} />
                  <Text style={[styles.profileSectionTitle, { color: COLORS.secondary, marginBottom: 0 }]}>
                    PANEL REVISOR TÉCNICO
                  </Text>
                </View>
                <Text style={styles.revisorSubtitle}>
                  Control de admisión manual de cuentas de clientes
                </Text>

                {revisorLoading ? (
                  <ActivityIndicator color={COLORS.secondary} style={{ marginVertical: 20 }} />
                ) : pendingClients.length === 0 ? (
                  <Text style={styles.emptyCardListText}>No hay solicitudes de clientes pendientes de admisión.</Text>
                ) : (
                  pendingClients.map((client) => {
                    const docPhotos = (client.fotos_documento || '').split(',').filter(Boolean);
                    return (
                      <View key={client.identificador.toString()} style={styles.pendingClientCard}>
                        <View style={styles.pendingClientInfo}>
                          <Text style={styles.clientName}>{client.nombre}</Text>
                          <Text style={styles.clientMeta}>DNI: {client.documento}</Text>
                          <Text style={styles.clientMeta}>Email: {client.email}</Text>
                          <Text style={styles.clientMeta}>Dirección: {client.direccion}</Text>
                        </View>

                        <Text style={styles.revisorSectionHeader}>SELFIE DE LA PERSONA</Text>
                        <View style={styles.selfieContainer}>
                          {client.foto ? (
                            <Image source={{ uri: client.foto }} style={styles.revisorSelfieImage} />
                          ) : (
                            <View style={styles.selfiePlaceholder}>
                              <Feather name="user" size={24} color={COLORS.lightGray200} />
                              <Text style={styles.selfiePlaceholderText}>Sin foto selfie</Text>
                            </View>
                          )}
                        </View>

                        <Text style={styles.revisorSectionHeader}>DOCUMENTOS DE IDENTIDAD (DNI)</Text>
                        <View style={styles.docsContainer}>
                          {docPhotos.map((uri, idx) => (
                            <View key={idx.toString()} style={styles.revisorDocWrapper}>
                              <Image source={{ uri }} style={styles.revisorDocImage} />
                              <Text style={styles.revisorDocLabel}>
                                {idx === 0 ? 'Frente' : 'Dorso'}
                              </Text>
                            </View>
                          ))}
                          {docPhotos.length === 0 && (
                            <Text style={styles.selfiePlaceholderText}>No se cargaron imágenes de documentos.</Text>
                          )}
                        </View>

                        {/* Inputs for reviewer actions */}
                        <View style={styles.revisorInputsWrapper}>
                          <Text style={styles.revisorInputLabel}>Contraseña a asignar (para Admitir):</Text>
                          <TextInput
                            style={styles.revisorTextInput}
                            placeholder="Contraseña"
                            placeholderTextColor={COLORS.lightGray200}
                            value={revisorPasswords[client.identificador] !== undefined ? revisorPasswords[client.identificador] : '123456'}
                            onChangeText={(text) => setRevisorPasswords(prev => ({ ...prev, [client.identificador]: text }))}
                          />

                          <Text style={styles.revisorInputLabel}>Motivo de rechazo (para Rechazar):</Text>
                          <TextInput
                            style={styles.revisorTextInput}
                            placeholder="Ej: Foto de documento borrosa o ilegible"
                            placeholderTextColor={COLORS.lightGray200}
                            value={revisorReasons[client.identificador] || ''}
                            onChangeText={(text) => setRevisorReasons(prev => ({ ...prev, [client.identificador]: text }))}
                          />
                        </View>

                        <View style={styles.revisorActions}>
                          <TouchableOpacity 
                            style={[styles.revisorActionBtn, styles.revisorApproveBtn, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
                            onPress={() => handleApproveClient(client.identificador, revisorPasswords[client.identificador] !== undefined ? revisorPasswords[client.identificador] : '123456')}
                          >
                            <Feather name="check" size={14} color={COLORS.textWhite} style={{ marginRight: 6 }} />
                            <Text style={styles.revisorBtnText}>Admitir</Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity 
                            style={[styles.revisorActionBtn, styles.revisorRejectBtn, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
                            onPress={() => handleRejectClient(client.identificador, revisorReasons[client.identificador] || '')}
                          >
                            <Feather name="x" size={14} color={COLORS.textWhite} style={{ marginRight: 6 }} />
                            <Text style={styles.revisorBtnText}>Rechazar</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}

            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

      </View>

      {/* 2. CUSTOM BOTTOM NAVIGATION BAR */}
      <View style={styles.navbar}>
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => setActiveTab('home')}
        >
          <Feather name="home" size={20} color={activeTab === 'home' ? COLORS.secondary : COLORS.lightGray200} />
          <Text style={[styles.navText, activeTab === 'home' && styles.activeNavText]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => setActiveTab('subastas')}
        >
          <FontAwesome5 name="gavel" size={18} color={activeTab === 'subastas' ? COLORS.secondary : COLORS.lightGray200} />
          <Text style={[styles.navText, activeTab === 'subastas' && styles.activeNavText]}>Subastas</Text>
        </TouchableOpacity>

        {/* Middle Plus Button */}
        <TouchableOpacity 
          style={styles.middleNavItem} 
          onPress={() => {
            setUploadTitle('');
            setUploadDesc('');
            setUploadPrice('');
            setUploadPhotos([]);
            setUploadDocPhoto(null);
            setUploadContext('');
            setAcceptUploadTerms(false);
            setErrorMessage('');
            setSuccessMessage('');
            setActiveTab('upload');
          }}
        >
          <View style={[styles.plusButton, SHADOWS.glow]}>
            <Text style={styles.plusButtonText}>+</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => setActiveTab('articulos')}
        >
          <Feather name="package" size={20} color={activeTab === 'articulos' ? COLORS.secondary : COLORS.lightGray200} />
          <Text style={[styles.navText, activeTab === 'articulos' && styles.activeNavText]}>Artículos</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => setActiveTab('perfil')}
        >
          <Feather name="user" size={20} color={activeTab === 'perfil' ? COLORS.secondary : COLORS.lightGray200} />
          <Text style={[styles.navText, activeTab === 'perfil' && styles.activeNavText]}>Perfil</Text>
        </TouchableOpacity>
      </View>

      {/* Details & Bidding Modal */}
      <AuctionDetailModal
        visible={modalVisible}
        auction={selectedAuction}
        onClose={() => {
          setModalVisible(false);
          setSelectedAuction(null);
        }}
        onBidSuccess={handleBidSuccess}
      />



      {/* Notification Center Modal */}
      <NotificationCenterModal
        visible={showNotifModal}
        userId={userProfile?.identificador}
        onClose={() => {
          setShowNotifModal(false);
          fetchUserData(); // refresh badge count
        }}
      />

      {/* Add Payment Method Modal */}
      <Modal
        visible={showAddPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddPaymentModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.selectorOverlay}
        >
          <View style={styles.paymentModalContent}>
            <View style={styles.paymentModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather name="credit-card" size={20} color={COLORS.white} style={{ marginRight: 8 }} />
                <Text style={[styles.paymentModalTitle, { marginBottom: 0 }]}>Medio de Pago</Text>
              </View>
              <TouchableOpacity 
                style={styles.closeButtonMini}
                onPress={() => setShowAddPaymentModal(false)}
              >
                <Feather name="x" size={16} color={COLORS.lightGray200} />
              </TouchableOpacity>
            </View>

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
            {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

            <Text style={styles.inputLabel}>Proveedor</Text>
            <View style={styles.providerRow}>
              {['Visa', 'Mastercard', 'Amex'].map((prov) => {
                const isSelected = newCardProvider === prov;
                return (
                  <TouchableOpacity
                    key={prov}
                    style={[styles.providerOption, { flex: 0.3 }, isSelected && styles.providerOptionSelected]}
                    onPress={() => setNewCardProvider(prov)}
                  >
                    <Text style={[styles.providerOptionText, isSelected && styles.providerOptionTextSelected]}>
                      {prov}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.inputLabel}>Tipo</Text>
            <View style={styles.providerRow}>
              {[
                { key: 'tarjeta', label: 'Tarjeta' },
                { key: 'cuenta', label: 'CBU' }
              ].map((t) => {
                const isSelected = newCardType === t.key;
                return (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.providerOption, { flex: 0.48 }, isSelected && styles.providerOptionSelected]}
                    onPress={() => setNewCardType(t.key)}
                  >
                    <Text style={[styles.providerOptionText, isSelected && styles.providerOptionTextSelected]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.inputLabel}>
              {newCardType === 'tarjeta' ? 'Número de Tarjeta (16 dig.)' : 'CBU de Cuenta (22 dig.)'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={newCardType === 'tarjeta' ? '4517849210325541' : '0070089230009102938472'}
              placeholderTextColor={COLORS.lightGray200}
              value={newCardNumber}
              onChangeText={(text) => setNewCardNumber(text.replace(/[^0-9]/g, ''))}
              keyboardType="numeric"
              maxLength={newCardType === 'tarjeta' ? 16 : 22}
            />

            <TouchableOpacity 
              style={[styles.submitButton, uploadLoading && styles.disabledButton]}
              onPress={handleAddPaymentMethod}
              disabled={uploadLoading}
            >
              {uploadLoading ? (
                <ActivityIndicator color={COLORS.textWhite} />
              ) : (
                <Text style={styles.submitButtonText}>Registrar</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={showChangePasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowChangePasswordModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.selectorOverlay}
        >
          <View style={styles.paymentModalContent}>
            <View style={styles.paymentModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather name="lock" size={20} color={COLORS.white} style={{ marginRight: 8 }} />
                <Text style={[styles.paymentModalTitle, { marginBottom: 0 }]}>Cambiar Contraseña</Text>
              </View>
              <TouchableOpacity 
                style={styles.closeButtonMini}
                onPress={() => setShowChangePasswordModal(false)}
              >
                <Feather name="x" size={16} color={COLORS.lightGray200} />
              </TouchableOpacity>
            </View>

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
            {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

            <Text style={styles.inputLabel}>Contraseña Actual</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="******"
                placeholderTextColor={COLORS.lightGray200}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showCurrentPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity 
                style={styles.passwordVisibilityButton}
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                <Feather 
                  name={showCurrentPassword ? "eye" : "eye-off"} 
                  size={20} 
                  color={COLORS.lightGray200} 
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Nueva Contraseña</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={COLORS.lightGray200}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity 
                style={styles.passwordVisibilityButton}
                onPress={() => setShowNewPassword(!showNewPassword)}
              >
                <Feather 
                  name={showNewPassword ? "eye" : "eye-off"} 
                  size={20} 
                  color={COLORS.lightGray200} 
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Confirmar Nueva Contraseña</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="******"
                placeholderTextColor={COLORS.lightGray200}
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                secureTextEntry={!showConfirmNewPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity 
                style={styles.passwordVisibilityButton}
                onPress={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
              >
                <Feather 
                  name={showConfirmNewPassword ? "eye" : "eye-off"} 
                  size={20} 
                  color={COLORS.lightGray200} 
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.submitButton, changePasswordLoading && styles.disabledButton]}
              onPress={handleChangePassword}
              disabled={changePasswordLoading}
            >
              {changePasswordLoading ? (
                <ActivityIndicator color={COLORS.textWhite} />
              ) : (
                <Text style={styles.submitButtonText}>Guardar Nueva Contraseña</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.darkGray600,
  },
  mainContent: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    backgroundColor: COLORS.darkGray600,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.lightGray200,
    marginTop: 12,
    fontSize: FONTS.sizeBase,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  homeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerWelcome: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeMd,
  },
  headerName: {
    color: COLORS.white,
    fontSize: FONTS.sizeXxl,
    fontWeight: FONTS.weightExtraBold,
  },
  logoutIconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutIcon: {
    fontSize: 16,
  },
  balanceCard: {
    backgroundColor: COLORS.darkGray500,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(10, 92, 255, 0.15)',
    marginBottom: 24,
    ...SHADOWS.default,
  },
  balanceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceCardTitle: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeSm,
    fontWeight: FONTS.weightBold,
    letterSpacing: 0.5,
  },
  tierBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tierBadgeText: {
    color: COLORS.textWhite,
    fontSize: 9,
    fontWeight: FONTS.weightBold,
  },
  balanceCardValue: {
    color: COLORS.success,
    fontSize: 32,
    fontWeight: FONTS.weightExtraBold,
    marginBottom: 8,
  },
  balanceCardHint: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeSm,
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: FONTS.sizeLg,
    fontWeight: FONTS.weightBold,
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statBox: {
    width: '30%',
    backgroundColor: COLORS.darkGray500,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  statValue: {
    color: COLORS.white,
    fontSize: FONTS.sizeXl,
    fontWeight: FONTS.weightBold,
    marginBottom: 2,
  },
  statLabel: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeSm,
  },
  featuredHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    color: COLORS.secondary,
    fontSize: FONTS.sizeMd,
    fontWeight: FONTS.weightBold,
  },
  featuredList: {
    marginBottom: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: FONTS.sizeXl2,
    fontWeight: FONTS.weightExtraBold,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeMd,
    marginTop: 2,
  },
  searchSection: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkGray500,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 48,
  },
  searchInput: {
    flex: 1,
    color: COLORS.white,
    fontSize: FONTS.sizeBase,
  },
  clearButton: {
    padding: 4,
  },
  clearButtonText: {
    color: COLORS.lightGray200,
    fontSize: 12,
  },
  categoriesContainer: {
    marginTop: 12,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activeCategoryTab: {
    backgroundColor: COLORS.secondary, // Cambiado a Naranja como activo
    borderColor: COLORS.secondary,
  },
  categoryTabText: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeMd,
    fontWeight: FONTS.weightBold,
  },
  activeCategoryTabText: {
    color: COLORS.textWhite,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  tabLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTextIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTextTitle: {
    color: COLORS.white,
    fontSize: FONTS.sizeLg,
    fontWeight: FONTS.weightBold,
    marginBottom: 6,
  },
  emptyTextSubtitle: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeMd,
    textAlign: 'center',
  },
  uploadHeader: {
    paddingTop: 16,
    marginBottom: 16,
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  photoUploadBox: {
    backgroundColor: COLORS.darkGray600,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    height: 140,
    overflow: 'hidden',
    marginBottom: 20,
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderIcon: {
    fontSize: 32,
    marginBottom: 6,
  },
  photoPlaceholderLabel: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeMd,
  },
  uploadedThumbnail: {
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
    ...SHADOWS.glow,
  },
  disabledButton: {
    backgroundColor: COLORS.lightGray200,
  },
  submitButtonText: {
    color: COLORS.textWhite,
    fontSize: FONTS.sizeLg,
    fontWeight: FONTS.weightBold,
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
  productCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.darkGray500,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: COLORS.darkGray600,
    resizeMode: 'cover',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  productTitle: {
    color: COLORS.white,
    fontSize: FONTS.sizeLg,
    fontWeight: FONTS.weightBold,
  },
  productDesc: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeSm,
    marginTop: 2,
    lineHeight: 14,
  },
  productBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  statusBadgeSold: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  statusBadgeText: {
    color: COLORS.success,
    fontSize: 9,
    fontWeight: FONTS.weightBold,
  },
  productDate: {
    color: COLORS.lightGray200,
    fontSize: 10,
  },
  perfilHeader: {
    paddingTop: 16,
    marginBottom: 20,
  },
  profileAvatarCard: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    resizeMode: 'cover',
  },
  avatarIconText: {
    fontSize: 36,
  },
  profileNameText: {
    color: COLORS.white,
    fontSize: FONTS.sizeXl,
    fontWeight: FONTS.weightExtraBold,
    marginBottom: 6,
  },
  profileTierBadge: {
    backgroundColor: COLORS.secondary,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
    ...SHADOWS.orangeGlow,
  },
  profileTierBadgeText: {
    color: COLORS.textWhite,
    fontSize: FONTS.sizeSm,
    fontWeight: FONTS.weightBold,
  },
  profileSectionTitle: {
    color: COLORS.white,
    fontSize: FONTS.sizeSm,
    fontWeight: FONTS.weightBold,
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  profileRow: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 12,
  },
  profileLabel: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeSm - 1,
    fontWeight: FONTS.weightBold,
    marginBottom: 4,
  },
  profileValue: {
    color: COLORS.white,
    fontSize: FONTS.sizeBase,
    fontWeight: FONTS.weightMedium,
  },
  profileStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  profileStatusText: {
    color: COLORS.white,
    fontSize: FONTS.sizeBase,
    fontWeight: FONTS.weightMedium,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  logoutButtonText: {
    color: COLORS.danger,
    fontSize: FONTS.sizeLg,
    fontWeight: FONTS.weightBold,
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 65,
    backgroundColor: COLORS.darkGray500,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: Platform.OS === 'ios' ? 12 : 4,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '18%',
  },
  navIcon: {
    fontSize: 20,
    color: COLORS.lightGray200,
  },
  activeNavIcon: {
    color: COLORS.secondary, // Naranja para activo en base a imagen
  },
  navText: {
    fontSize: FONTS.sizeSm - 1,
    color: COLORS.lightGray200,
    marginTop: 2,
    fontWeight: FONTS.weightBold,
  },
  activeNavText: {
    color: COLORS.secondary,
  },
  middleNavItem: {
    width: '18%',
    alignItems: 'center',
    justifyContent: 'center',
    top: -6, // Elevar ligeramente el boton del medio como en la imagen
  },
  plusButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.glow,
  },
  plusButtonText: {
    color: COLORS.textWhite,
    fontSize: 28,
    fontWeight: '300',
    top: -1, // Alinear el mas verticalmente
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
  // --- NEW STYLES ---
  bellButton: {
    position: 'relative',
    padding: 8,
  },
  bellIcon: {
    fontSize: 22,
  },
  bellBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: COLORS.danger,
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellBadgeText: {
    color: COLORS.textWhite,
    fontSize: 9,
    fontWeight: 'bold',
  },
  bellBadgeMini: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: COLORS.danger,
    borderRadius: 7,
    width: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellBadgeTextMini: {
    color: COLORS.textWhite,
    fontSize: 8,
    fontWeight: 'bold',
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backButtonText: {
    color: COLORS.secondary,
    fontSize: FONTS.sizeSm,
    fontWeight: 'bold',
  },
  subastaCatalogCard: {
    backgroundColor: COLORS.darkGray500,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.default,
  },
  subastaCatalogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  subastaCatalogDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subastaCatalogDateIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  subastaCatalogDateText: {
    color: COLORS.lightGray100,
    fontSize: FONTS.sizeSm + 1,
    fontWeight: 'bold',
  },
  subastaCatalogBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  subastaCatalogBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  subastaCatalogLocation: {
    color: COLORS.white,
    fontSize: FONTS.sizeBase,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subastaCatalogDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 10,
    marginBottom: 10,
  },
  subastaDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subastaDetailLabel: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeSm,
    marginRight: 4,
  },
  subastaDetailValue: {
    color: COLORS.white,
    fontSize: FONTS.sizeSm,
    fontWeight: 'bold',
  },
  categoryPillText: {
    color: COLORS.secondary,
    fontWeight: 'bold',
  },
  subastaCatalogExtraInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  subastaExtraLabel: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeSm,
  },
  subastaCatalogButton: {
    backgroundColor: 'rgba(10, 92, 255, 0.08)',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(10, 92, 255, 0.2)',
  },
  subastaCatalogButtonText: {
    color: COLORS.primary,
    fontSize: FONTS.sizeSm + 1,
    fontWeight: 'bold',
  },
  addPhotoMiniButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  addPhotoMiniButtonText: {
    color: COLORS.textWhite,
    fontSize: 10,
    fontWeight: 'bold',
  },
  horizontalPhotosScroll: {
    paddingVertical: 4,
  },
  photoScrollItem: {
    position: 'relative',
    marginRight: 12,
  },
  photoScrollImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  deletePhotoBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.textWhite,
  },
  deletePhotoBadgeText: {
    color: COLORS.textWhite,
    fontSize: 9,
    fontWeight: 'bold',
  },
  docCheckOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(16, 185, 129, 0.85)',
    paddingVertical: 6,
    alignItems: 'center',
  },
  docCheckOverlayText: {
    color: COLORS.textWhite,
    fontSize: FONTS.sizeSm,
    fontWeight: 'bold',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxCheckmark: {
    color: COLORS.textWhite,
    fontSize: 11,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    color: COLORS.lightGray100,
    fontSize: FONTS.sizeSm,
    flex: 1,
    lineHeight: 16,
  },
  addPaymentMiniBtn: {
    backgroundColor: 'rgba(255, 140, 0, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.3)',
  },
  addPaymentMiniBtnText: {
    color: COLORS.secondary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyCardListText: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeSm,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 12,
  },
  paymentMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 8,
  },
  paymentMethodIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(10, 92, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentMethodIcon: {
    fontSize: 18,
  },
  paymentMethodProvider: {
    color: COLORS.white,
    fontSize: FONTS.sizeSm + 1,
    fontWeight: 'bold',
  },
  paymentMethodMascara: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeSm,
    marginTop: 2,
  },
  paymentMethodStatus: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  paymentMethodStatusText: {
    color: COLORS.success,
    fontSize: 8,
    fontWeight: 'bold',
  },
  fineItem: {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fineDesc: {
    color: COLORS.white,
    fontSize: FONTS.sizeSm + 1,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  fineDate: {
    color: COLORS.lightGray200,
    fontSize: 9,
    marginBottom: 4,
  },
  fineMonto: {
    fontSize: FONTS.sizeSm + 1,
    fontWeight: 'bold',
  },
  fineStatusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  fineStatusText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  payFineButton: {
    backgroundColor: COLORS.success,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    ...SHADOWS.glow,
  },
  payFineButtonText: {
    color: COLORS.textWhite,
    fontSize: FONTS.sizeSm,
    fontWeight: 'bold',
  },
  revisorSubtitle: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeSm,
    marginBottom: 16,
    marginTop: -8,
  },
  pendingClientCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 16,
  },
  pendingClientInfo: {
    marginBottom: 12,
  },
  clientName: {
    color: COLORS.white,
    fontSize: FONTS.sizeLg,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  clientMeta: {
    color: COLORS.lightGray100,
    fontSize: FONTS.sizeSm,
    marginBottom: 2,
  },
  revisorSectionHeader: {
    color: COLORS.secondary,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 8,
  },
  selfieContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  revisorSelfieImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: COLORS.border,
    resizeMode: 'cover',
  },
  selfiePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.darkGray600,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selfiePlaceholderText: {
    color: COLORS.lightGray200,
    fontSize: 10,
    marginTop: 4,
  },
  docsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  revisorDocWrapper: {
    width: '48%',
    alignItems: 'center',
  },
  revisorDocImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    resizeMode: 'cover',
    backgroundColor: COLORS.darkGray600,
  },
  revisorDocLabel: {
    color: COLORS.lightGray200,
    fontSize: 10,
    marginTop: 4,
  },
  revisorInputsWrapper: {
    marginVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  revisorInputLabel: {
    color: COLORS.lightGray200,
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
    marginTop: 6,
  },
  revisorTextInput: {
    backgroundColor: COLORS.darkGray600,
    color: COLORS.white,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 12,
  },
  revisorActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  revisorActionBtn: {
    flex: 0.48,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  revisorApproveBtn: {
    backgroundColor: COLORS.success,
  },
  revisorRejectBtn: {
    backgroundColor: COLORS.danger,
  },
  revisorBtnText: {
    color: COLORS.textWhite,
    fontSize: FONTS.sizeSm + 1,
    fontWeight: 'bold',
  },
  paymentModalContent: {
    backgroundColor: COLORS.darkGray500,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.default,
  },
  paymentModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  paymentModalTitle: {
    color: COLORS.white,
    fontSize: FONTS.sizeLg,
    fontWeight: 'bold',
  },
  closeButtonMini: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  providerOption: {
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerOptionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  providerOptionText: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeSm,
    fontWeight: 'bold',
  },
  providerOptionTextSelected: {
    color: COLORS.textWhite,
  },
  dotGreen: {
    backgroundColor: COLORS.success,
  },
  dotAmber: {
    backgroundColor: COLORS.secondary,
  },
  changePasswordButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  changePasswordButtonText: {
    color: COLORS.primary,
    fontWeight: FONTS.weightBold,
    fontSize: FONTS.sizeBase,
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
  passwordVisibilityIcon: {
    fontSize: 16,
  },
});
