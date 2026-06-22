import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  ActivityIndicator, 
  StatusBar,
  Alert,
  Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { apiService } from './src/api/apiService';
import { supabaseService } from './src/api/supabaseService';

import AuctionDetailModal from './src/components/AuctionDetailModal';
import AuthScreen from './src/screens/AuthScreen';
import { COLORS, FONTS, SHADOWS } from './src/styles/theme';
import SplashLoader from './src/components/SplashLoader';
import NotificationCenterModal from './src/components/NotificationCenterModal';

// Modular navigation & screens
import Navbar from './src/components/Navbar';
import HomeScreen from './src/screens/HomeScreen';
import SubastasScreen from './src/screens/SubastasScreen';
import UploadProductScreen from './src/screens/UploadProductScreen';
import ArticulosScreen from './src/screens/ArticulosScreen';
import PerfilScreen from './src/screens/PerfilScreen';
import RevisorAdminPanel from './src/screens/RevisorAdminPanel';
import SupportChatScreen from './src/screens/SupportChatScreen';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [activePaymentMethod, setActivePaymentMethod] = useState(null);
  
  const [activeTab, setActiveTab] = useState('home'); 

  const [auctions, setAuctions] = useState([]);
  const [filteredAuctions, setFilteredAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  const [dbStatus, setDbStatus] = useState({ configured: false, url: '' });

  const [selectedAuction, setSelectedAuction] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const [userBalance, setUserBalance] = useState(250000); 
  const [stats, setStats] = useState({ offers: 0, uploaded: 0, won: 0 });

  // Upload screen form states
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadPhotos, setUploadPhotos] = useState([]); 
  const [uploadDocPhoto, setUploadDocPhoto] = useState(null); 
  const [uploadHistory, setUploadHistory] = useState('');
  const [uploadContext, setUploadContext] = useState('');
  const [acceptUploadTerms, setAcceptUploadTerms] = useState(false);
  const [photoPickerMode, setPhotoPickerMode] = useState('product'); 
  const [uploadMoneda, setUploadMoneda] = useState('ARS'); 
  
  // Historical info optional fields
  const [hasHistoricalInfo, setHasHistoricalInfo] = useState(false);
  const [uploadArtista, setUploadArtista] = useState('');
  const [uploadAnio, setUploadAnio] = useState('');
  const [uploadContextoHist, setUploadContextoHist] = useState(''); 
  
  const [uploadLoading, setUploadLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [myProducts, setMyProducts] = useState([]);
  const [loadingMyProducts, setLoadingMyProducts] = useState(false);

  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [showNotifModal, setShowNotifModal] = useState(false);

  const [paymentMethods, setPaymentMethods] = useState([]);
  const [wonAuctions, setWonAuctions] = useState([]);
  const [userFines, setUserFines] = useState([]);

  const [pendingClients, setPendingClients] = useState([]);
  const [revisorLoading, setRevisorLoading] = useState(false);

  const [subastas, setSubastas] = useState([]);
  const [selectedSubasta, setSelectedSubasta] = useState(null);
  const [loadingSubastas, setLoadingSubastas] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  useEffect(() => {
    // checkAuthentication will call fetchData and fetchSubastas internally
    checkAuthentication();
    checkConnection();
  }, []);

  const checkAuthentication = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        // Load profile, auctions and subastas in parallel
        const [profile] = await Promise.all([
          apiService.getProfile(),
          fetchData(),
          fetchSubastas()
        ]);
        setUserProfile(profile);
        setIsAuthenticated(true);
      } else {
        // No session — still load public auctions
        await Promise.all([fetchData(), fetchSubastas()]);
        setIsAuthenticated(false);
        setUserProfile(null);
      }
    } catch (e) {
      console.warn('[App] Session check failed, redirecting to login:', e);
      // Still load public data on error
      await Promise.all([fetchData(), fetchSubastas()]).catch(() => {});
      setIsAuthenticated(false);
      setUserProfile(null);
    } finally {
      setAuthLoading(false);
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
    setIsGuest(false);
    setUserProfile(null);
    setPaymentMethods([]);
    setActivePaymentMethod(null);
    setAuctions([]);
    setFilteredAuctions([]);
    setActiveTab('home');
    setAuthLoading(false);
  };

  const fetchMyProductsAndStats = async () => {
    if (!isAuthenticated || !userProfile) return;
    try {
      setLoadingMyProducts(true);
      const data = await apiService.getUserProducts();
      setMyProducts(data || []);

      const myOffersCount = auctions.filter(a => 
        a.highest_bidder === userProfile?.nombre && 
        a.subastado !== 'si' && 
        a.estado !== 'cerrada'
      ).length; 
      
      let wonAuctionsCount = 0;
      try {
        wonAuctionsCount = await supabaseService.getUserWonCount(userProfile.identificador);
      } catch (err) {
        console.warn('[App] Error getting won auctions count:', err);
      }

      try {
        const wonData = await apiService.getUserWonAuctions(userProfile.identificador);
        setWonAuctions(wonData || []);
      } catch (err) {
        console.warn('[App] Error getting won auctions:', err);
      }

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
  }, [isAuthenticated]); // Only run on auth state change, not on every tab/auctions update

  // Auto-refresh relevant data when active tab changes
  useEffect(() => {
    if (activeTab === 'home') {
      if (auctions.length === 0) fetchData();
      if (subastas.length === 0) fetchSubastas();
      if (isAuthenticated && userProfile) {
        fetchUserData();
      }
    } else if (activeTab === 'subastas') {
      if (subastas.length === 0) fetchSubastas();
      if (auctions.length === 0) fetchData();
    } else if (activeTab === 'articulos') {
      fetchMyProductsAndStats();
    } else if (activeTab === 'perfil') {
      if (isAuthenticated && userProfile) {
        fetchData();
        fetchUserData();
        fetchMyProductsAndStats();
      }
    }
  }, [activeTab, isAuthenticated, isGuest]);

  // Keep stats.offers in sync with auctions changes
  useEffect(() => {
    if (isAuthenticated && userProfile) {
      const myOffersCount = auctions.filter(a => 
        a.highest_bidder === userProfile?.nombre && 
        a.subastado !== 'si' && 
        a.estado !== 'cerrada'
      ).length;
      setStats(prev => ({
        ...prev,
        offers: myOffersCount
      }));
    }
  }, [auctions, userProfile, isAuthenticated]);

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
        if (typeof unsubscribe === 'function') unsubscribe();
      };
    }
  }, [isAuthenticated]);

  const fetchUserData = async () => {
    if (!userProfile) return;
    try {
      const uId = userProfile.identificador;
      
      // Run all user data queries IN PARALLEL — replaces 4 sequential network calls
      const [pm, fn, nt] = await Promise.all([
        apiService.getPaymentMethods(uId),
        apiService.getUserFines(uId),
        apiService.getUserNotifications(uId),
      ]);

      // Sort payment methods stably by identificador so they never change order/places
      const sortedPm = pm ? [...pm].sort((a, b) => Number(a.identificador) - Number(b.identificador)) : [];

      setPaymentMethods(sortedPm);
      if (sortedPm.length > 0) {
        const predeterminadoMethod = sortedPm.find(item => item.predeterminado === true || item.predeterminado === 'si');
        if (predeterminadoMethod) {
          setActivePaymentMethod(predeterminadoMethod);
        } else if (!activePaymentMethod || !sortedPm.some(item => item.identificador === activePaymentMethod.identificador)) {
          setActivePaymentMethod(sortedPm[0]);
        } else {
          const updatedActive = sortedPm.find(item => item.identificador === activePaymentMethod.identificador);
          setActivePaymentMethod(updatedActive);
        }
      } else {
        setActivePaymentMethod(null);
      }
      
      setUserFines(fn || []);
      
      const unread = (nt || []).filter(n => n.leido !== 'si').length;
      setUnreadNotifCount(unread);

      // Revisor data can load separately, non-blocking
      if (userProfile.cargo === 'Revisor Técnico') {
        fetchPendingRegistrations();
      }
      
      // Update user products and statistics
      fetchMyProductsAndStats();
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
          .select(`
            *,
            catalogos (
              itemscatalogo (
                subastado
              )
            )
          `);
        if (!error && data) {
          const processed = data.map(sub => {
            const items = [];
            if (sub.catalogos) {
              const catalogs = Array.isArray(sub.catalogos) ? sub.catalogos : [sub.catalogos];
              catalogs.forEach(cat => {
                if (cat.itemscatalogo) {
                  const catItems = Array.isArray(cat.itemscatalogo) ? cat.itemscatalogo : [cat.itemscatalogo];
                  catItems.forEach(item => {
                    items.push(item);
                  });
                }
              });
            }
            
            const hasItems = items.length > 0;
            const todos_subastados = hasItems && items.every(item => item.subastado === 'si');
            
            return {
              ...sub,
              todos_subastados
            };
          });
          setSubastas(processed);
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

  const handleDeletePaymentMethod = async (pmId) => {
    Alert.alert(
      'Eliminar Medio de Pago',
      '¿Estás seguro de que quieres eliminar este medio de pago?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            try {
              const configured = supabaseService.getConfigStatus().configured;
              if (!configured) {
                const { mockPaymentMethods } = require('./src/api/apiService');
                const idx = mockPaymentMethods.findIndex(item => item.identificador === pmId);
                if (idx !== -1) mockPaymentMethods.splice(idx, 1);
              } else {
                const { supabase } = require('./src/api/supabaseClient');
                await supabase.from('mediosdepago').delete().eq('identificador', pmId);
              }
              fetchUserData();
            } catch (e) {
              console.warn('Error deleting payment method:', e);
            }
          }
        }
      ]
    );
  };

  const handlePayFine = async (fineId, amount) => {
    if (!activePaymentMethod) {
      Alert.alert('Error', 'Debes tener un medio de pago predeterminado activo para pagar la multa.');
      return;
    }
    if (Number(activePaymentMethod.monto) < amount) {
      Alert.alert('Error', 'Fondos insuficientes en el medio de pago predeterminado seleccionado.');
      return;
    }
    try {
      const newMonto = Math.max(0, Number(activePaymentMethod.monto) - amount);
      await apiService.updatePaymentMethodAmount(activePaymentMethod.identificador, newMonto);
      await apiService.payFine(fineId);
      Alert.alert('Multa Pagada', 'La multa ha sido pagada con éxito.');
      fetchUserData();
    } catch (e) {
      Alert.alert('Error', e.message || 'No se pudo pagar la multa.');
    }
  };

  const handleSetDefaultPaymentMethod = async (pmId, silent = false) => {
    try {
      if (userProfile) {
        await apiService.setDefaultPaymentMethod(userProfile.identificador, pmId);
        if (!silent) {
          Alert.alert('Éxito', 'Medio de pago establecido como predeterminado.');
        }
        fetchUserData();
      }
    } catch (e) {
      if (!silent) {
        Alert.alert('Error', e.message || 'No se pudo cambiar el medio de pago predeterminado.');
      } else {
        console.warn('Error setting default payment method silently:', e);
      }
    }
  };

  const handleApproveClient = async (clientId, password, category = 'comun') => {
    if (!password || password.trim().length < 6) {
      Alert.alert('Error', 'La contraseña predefinida debe tener al menos 6 caracteres.');
      return;
    }
    try {
      setRevisorLoading(true);
      const res = await apiService.approveClient(clientId, password.trim(), category);
      Alert.alert(
        'Cliente Admitido',
        `El cliente ha sido admitido con éxito.\n\n${res.emailSimulated}`
      );
      fetchPendingRegistrations();
    } catch (err) {
      Alert.alert('Error', err.message || 'Error al admitir al cliente.');
    } finally {
      setRevisorLoading(false);
    }
  };

  const handleRejectClient = async (clientId, reason) => {
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
      fetchPendingRegistrations();
    } catch (err) {
      Alert.alert('Error', err.message || 'Error al rechazar al cliente.');
    } finally {
      setRevisorLoading(false);
    }
  };

  // Only re-fetch user data when auth state or profile changes — NOT on every tab switch
  useEffect(() => {
    if (isAuthenticated && userProfile) {
      fetchUserData();
    } else if (isGuest) {
      // Guest: public data already loaded in checkAuthentication
    }
  }, [isAuthenticated, userProfile, isGuest]);

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
    const promises = [fetchData(), fetchSubastas()];
    if (isAuthenticated && userProfile) {
      promises.push(fetchUserData());
      promises.push(fetchMyProductsAndStats());
    }
    await Promise.all(promises);
    setRefreshing(false);
  };

  const checkConnection = () => {
    const status = supabaseService.getConfigStatus();
    setDbStatus(status);
  };

  const filterData = () => {
    let result = [...auctions];
    if (selectedSubasta) {
      result = result.filter(item => Number(item.subasta_id) === Number(selectedSubasta.identificador));
    } else {
      if (selectedCategory !== 'Todos') {
        result = result.filter(item => item.categoria === selectedCategory);
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        result = result.filter(item => 
          item.titulo.toLowerCase().includes(query) || 
          item.descripcion.toLowerCase().includes(query)
        );
      }
    }
    setFilteredAuctions(result);
  };

  const handleBidPress = async (auction) => {
    setSelectedAuction(auction);
    setModalVisible(true);

    if (auction.producto?.identificador && !isGuest) {
      try {
        const { data } = await supabaseService.getProductPhotos(auction.producto.identificador);
        if (data && data.length > 0) {
          setSelectedAuction(prev => {
            if (!prev) return null;
            return {
              ...prev,
              producto: {
                ...prev.producto,
                images: data
              }
            };
          });
          
          setAuctions(prevAuctions => 
            prevAuctions.map(item => item.identificador === auction.identificador ? {
              ...item,
              producto: {
                ...item.producto,
                images: data
              }
            } : item)
          );
        }
      } catch (e) {
        console.warn('[App] Error loading detailed photos:', e);
      }
    }
  };

  const handleBidSuccess = async (updatedAuction) => {
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

  const pickPhoto = async (source, mode = photoPickerMode) => {
    try {
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          setErrorMessage('Permiso de cámara denegado.');
          return;
        }

        const takePhotoRecursive = async (currentPhotosCount) => {
          if (currentPhotosCount >= 10) {
            Alert.alert('Límite alcanzado', 'Has alcanzado el límite de 10 fotos.');
            return;
          }

          const camResult = await ImagePicker.launchCameraAsync({
            allowsEditing: false,
            quality: 0.5,
            base64: true,
          });

          if (!camResult.canceled && camResult.assets && camResult.assets.length > 0) {
            const pickedAsset = {
              uri: camResult.assets[0].uri,
              base64: camResult.assets[0].base64
            };

            if (mode === 'product') {
              setUploadPhotos(prev => {
                const updated = [...prev, pickedAsset];

                // Prompt user to take another photo
                setTimeout(() => {
                  Alert.alert(
                    'Foto agregada',
                    `Has tomado ${updated.length} foto(s). ¿Deseas tomar otra foto?`,
                    [
                      {
                        text: 'Sí, tomar otra',
                        onPress: () => takePhotoRecursive(updated.length)
                      },
                      {
                        text: 'No, terminar',
                        style: 'cancel'
                      }
                    ]
                  );
                }, 500);

                return updated;
              });
            } else {
              setUploadDocPhoto(pickedAsset);
            }
          }
        };

        await takePhotoRecursive(mode === 'product' ? uploadPhotos.length : 0);

      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          setErrorMessage('Permiso de biblioteca denegado.');
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: 'images',
          allowsMultipleSelection: mode === 'product',
          quality: 0.5,
          base64: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          if (mode === 'product') {
            const newAssets = result.assets.map(asset => ({
              uri: asset.uri,
              base64: asset.base64
            }));
            setUploadPhotos(prev => [...prev, ...newAssets].slice(0, 10));
          } else {
            setUploadDocPhoto({
              uri: result.assets[0].uri,
              base64: result.assets[0].base64
            });
          }
        }
      }
    } catch (e) {
      setErrorMessage('Error al seleccionar la imagen.');
    }
  };

  const handleUploadProduct = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!uploadTitle.trim() || !uploadDesc.trim()) {
      setErrorMessage('Por favor completa todos los campos obligatorios del formulario (Título y Descripción).');
      return;
    }

    if (uploadPhotos.length < 6) {
      setErrorMessage(`Debes subir un mínimo de 6 fotos del producto. (Cargadas: ${uploadPhotos.length})`);
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
        fotos: uploadPhotos.map(p => p.base64),
        informacionHistorica: (uploadHistory.trim() || uploadContext.trim())
          ? `Historia: ${uploadHistory.trim()}\nContexto: ${uploadContext.trim()}`
          : null,
        documentoOrigenBase64: uploadDocPhoto ? uploadDocPhoto.base64 : null,
        moneda: uploadMoneda,
        // Optional historical info fields
        artista: hasHistoricalInfo ? uploadArtista.trim() : null,
        periodo: hasHistoricalInfo ? uploadAnio.trim() : null,
        contextoHistorico: hasHistoricalInfo ? uploadContextoHist.trim() : null
      };

      await apiService.uploadProduct(payload);
      setSuccessMessage('¡Producto subido con éxito! Pendiente de aprobación.');
      
      // Clear form
      setUploadTitle('');
      setUploadDesc('');
      setUploadPhotos([]);
      setUploadDocPhoto(null);
      setUploadHistory('');
      setUploadContext('');
      setAcceptUploadTerms(false);
      setHasHistoricalInfo(false);
      setUploadArtista('');
      setUploadAnio('');
      setUploadContextoHist('');

      // Refresh data to show new subasta and items
      if (isAuthenticated && userProfile) {
        fetchUserData();
      }
      fetchData();
      fetchSubastas();
    } catch (err) {
      setErrorMessage(err.message || 'Error al subir el producto.');
    } finally {
      setUploadLoading(false);
    }
  };

  if (authLoading) {
    return <SplashLoader statusText="Iniciando PujaYa!..." />;
  }

  if (!isAuthenticated && !isGuest) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.darkGray600} />
        <AuthScreen 
          onLoginSuccess={handleLoginSuccess} 
          onGuestLogin={() => {
            setIsGuest(true);
            setActiveTab('home');
            fetchData();
            fetchSubastas();
          }}
        />
      </SafeAreaView>
    );
  }

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeScreen
            userProfile={userProfile}
            unreadNotifCount={unreadNotifCount}
            onShowNotifications={() => setShowNotifModal(true)}
            onLogout={handleLogout}
            userBalance={userBalance}
            stats={stats}
            loading={loading}
            auctions={auctions}
            onBidPress={handleBidPress}
            onViewAllSubastas={() => setActiveTab('subastas')}
            isGuest={isGuest}
            paymentMethods={paymentMethods}
            activePaymentMethod={activePaymentMethod}
            setActivePaymentMethod={setActivePaymentMethod}
            onSetDefaultPaymentMethod={handleSetDefaultPaymentMethod}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        );
      case 'subastas':
        return (
          <SubastasScreen
            subastas={subastas}
            selectedSubasta={selectedSubasta}
            setSelectedSubasta={setSelectedSubasta}
            loadingSubastas={loadingSubastas}
            filteredAuctions={filteredAuctions}
            onBidPress={handleBidPress}
            loading={loading}
            unreadNotifCount={unreadNotifCount}
            onShowNotifications={() => setShowNotifModal(true)}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            isGuest={isGuest}
          />
        );
      case 'upload':
        if (isGuest) return null;
        return (
          <UploadProductScreen
            uploadTitle={uploadTitle}
            setUploadTitle={setUploadTitle}
            uploadDesc={uploadDesc}
            setUploadDesc={setUploadDesc}
            uploadMoneda={uploadMoneda}
            setUploadMoneda={setUploadMoneda}
            uploadPhotos={uploadPhotos}
            setUploadPhotos={setUploadPhotos}
            uploadDocPhoto={uploadDocPhoto}
            uploadHistory={uploadHistory}
            setUploadHistory={setUploadHistory}
            uploadContext={uploadContext}
            setUploadContext={setUploadContext}
            acceptUploadTerms={acceptUploadTerms}
            setAcceptUploadTerms={setAcceptUploadTerms}
            uploadLoading={uploadLoading}
            errorMessage={errorMessage}
            successMessage={successMessage}
            handleUploadProduct={handleUploadProduct}
            openPhotoSourceSelector={openPhotoSourceSelector}
            unreadNotifCount={unreadNotifCount}
            onShowNotifications={() => setShowNotifModal(true)}
            hasHistoricalInfo={hasHistoricalInfo}
            setHasHistoricalInfo={setHasHistoricalInfo}
            uploadArtista={uploadArtista}
            setUploadArtista={setUploadArtista}
            uploadAnio={uploadAnio}
            setUploadAnio={setUploadAnio}
            uploadContextoHist={uploadContextoHist}
            setUploadContextoHist={setUploadContextoHist}
          />
        );
      case 'articulos':
        if (isGuest) return null;
        return (
          <ArticulosScreen
            myProducts={myProducts}
            loadingMyProducts={loadingMyProducts}
            setActiveTab={setActiveTab}
            refreshProducts={fetchMyProductsAndStats}
          />
        );
      case 'support_chat':
        if (isGuest) return null;
        return (
          <SupportChatScreen
            userProfile={userProfile}
            setActiveTab={setActiveTab}
          />
        );
      case 'perfil':
        if (isGuest) return null;
        return (
          <PerfilScreen
            userProfile={userProfile}
            setActiveTab={setActiveTab}
            stats={stats}
            paymentMethods={paymentMethods}
            auctions={auctions}
            wonAuctions={wonAuctions}
            handleBidPress={handleBidPress}
            pendingClients={pendingClients}
            revisorLoading={revisorLoading}
            handleApproveClient={handleApproveClient}
            handleRejectClient={handleRejectClient}
            handleDeletePaymentMethod={handleDeletePaymentMethod}
            handleLogout={handleLogout}
            fetchUserData={fetchUserData}
            userFines={userFines}
            handlePayFine={handlePayFine}
            activePaymentMethod={activePaymentMethod}
            handleSetDefaultPaymentMethod={handleSetDefaultPaymentMethod}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.darkGray600} />
      
      {/* 1. SCREEN VIEW SWITCHER */}
      <View style={styles.mainContent}>
        {renderActiveScreen()}
      </View>

      {/* 2. CUSTOM BOTTOM NAVIGATION BAR */}
      {!isKeyboardVisible && (
        <Navbar 
          activeTab={activeTab === 'revisor_panel' ? 'perfil' : activeTab} 
          setActiveTab={setActiveTab} 
          isGuest={isGuest}
          onUploadPress={() => {
            setUploadTitle('');
            setUploadDesc('');
            setUploadPhotos([]);
            setUploadDocPhoto(null);
            setUploadHistory('');
            setUploadContext('');
            setAcceptUploadTerms(false);
            setErrorMessage('');
            setSuccessMessage('');
            setActiveTab('upload');
          }}
        />
      )}

      {/* Details & Bidding Modal */}
      <AuctionDetailModal
        visible={modalVisible}
        auction={selectedAuction}
        isGuest={isGuest}
        activePaymentMethod={activePaymentMethod}
        userFines={userFines}
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
          fetchUserData(); 
        }}
      />
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
  }
});
