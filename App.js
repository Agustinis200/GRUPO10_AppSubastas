import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text,
  ScrollView,
  TouchableOpacity,
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
import { Feather } from '@expo/vector-icons';

import AuctionDetailModal from './src/components/AuctionDetailModal';
import AuthScreen from './src/screens/AuthScreen';
import { COLORS, FONTS, SHADOWS } from './src/styles/theme';
import SplashLoader from './src/components/SplashLoader';
import NotificationCenterModal from './src/components/NotificationCenterModal';

// Navegación modular y pantallas
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

  // Estados del formulario de subida
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadPhotos, setUploadPhotos] = useState([]); 
  const [uploadDocPhoto, setUploadDocPhoto] = useState(null); 
  const [uploadHistory, setUploadHistory] = useState('');
  const [uploadContext, setUploadContext] = useState('');
  const [acceptUploadTerms, setAcceptUploadTerms] = useState(false);
  const [photoPickerMode, setPhotoPickerMode] = useState('product'); 
  const [uploadMoneda, setUploadMoneda] = useState('ARS'); 
  
  // Campos opcionales de información histórica
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
    // checkAuthentication cargará fetchData y fetchSubastas
    checkAuthentication();
    checkConnection();
  }, []);

  const checkAuthentication = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        // Cargar perfil, artículos y subastas en paralelo
        const [profile] = await Promise.all([
          apiService.getProfile(),
          fetchData(),
          fetchSubastas()
        ]);
        setUserProfile(profile);
        setIsAuthenticated(true);
      } else {
        // Sin sesión — cargar artículos públicos
        await Promise.all([fetchData(), fetchSubastas()]);
        setIsAuthenticated(false);
        setUserProfile(null);
      }
    } catch (e) {
      console.warn('[App] Session check failed, redirecting to login:', e);
      // Cargar datos públicos en caso de error
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
  }, [isAuthenticated]); // Ejecutar solo al cambiar la autenticación

  // Auto-refrescar datos al cambiar de pestaña
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
      if (myProducts.length === 0 && wonAuctions.length === 0) {
        fetchMyProductsAndStats();
      }
    } else if (activeTab === 'perfil') {
      if (isAuthenticated && userProfile) {
        if (auctions.length === 0) fetchData();
        if (!paymentMethods || paymentMethods.length === 0) fetchUserData();
        if (myProducts.length === 0 && wonAuctions.length === 0) fetchMyProductsAndStats();
      }
    }
  }, [activeTab, isAuthenticated, isGuest]);

  // Sincronizar estadísticas de ofertas con los artículos
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
        
        if (payload.isRefreshRequired) {
          fetchData();
          return;
        }

        setAuctions(prevAuctions => {
          const updatedAuctions = prevAuctions.map(item => {
            if (item.identificador === payload.auctionId) {
              return {
                ...item,
                precio_actual: payload.precio_actual,
                bid_count: payload.bid_count,
                highest_bidder: payload.highest_bidder
              };
            }
            return item;
          });
          return updatedAuctions;
        });

        // Sincronizar selectedAuction para el modal abierto
        setSelectedAuction(prev => {
          if (prev && prev.identificador === payload.auctionId) {
            return {
              ...prev,
              precio_actual: payload.precio_actual,
              bid_count: payload.bid_count,
              highest_bidder: payload.highest_bidder
            };
          }
          return prev;
        });
      });
      return () => {
        if (typeof unsubscribe === 'function') unsubscribe();
      };
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && userProfile) {
      const unsubscribeNotifs = supabaseService.subscribeToNotifications(
        userProfile.identificador,
        (notif) => {
          console.log('[App] New notification received via realtime:', notif);
          Alert.alert(
            notif.titulo || 'Notificación',
            notif.mensaje || '',
            [{ text: 'Entendido', onPress: () => fetchUserData() }]
          );
          fetchUserData();
        }
      );
      return () => {
        if (typeof unsubscribeNotifs === 'function') unsubscribeNotifs();
      };
    }
  }, [isAuthenticated, userProfile]);

  const fetchUserData = async () => {
    if (!userProfile) return;
    try {
      const uId = userProfile.identificador;
      
      // Obtener datos del usuario
      const [pm, fn, nt] = await Promise.all([
        apiService.getPaymentMethods(uId),
        apiService.getUserFines(uId),
        apiService.getUserNotifications(uId),
      ]);

      // Guardar medios de pago
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

      // Cargar datos de revisor si corresponde
      if (userProfile.cargo === 'Revisor Técnico') {
        fetchPendingRegistrations();
      }
      
      // Actualizar productos y estadísticas
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
          const processed = data
            .filter(sub => sub.estado !== 'cerrada' && sub.estado !== 'carrada')
            .map(sub => {
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

  // Cargar datos de usuario al cambiar la autenticación
  useEffect(() => {
    if (isAuthenticated && userProfile) {
      fetchUserData();
    } else if (isGuest) {
      // Invitado: datos ya cargados
    }
  }, [isAuthenticated, userProfile, isGuest]);

  useEffect(() => {
    filterData();
  }, [auctions, searchQuery, selectedCategory, selectedSubasta]);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabaseService.getAuctions();
    setAuctions(data || []);
    
    // Sincronizar modal abierto con nuevos datos
    setSelectedAuction(prev => {
      if (!prev) return prev;
      const fresh = (data || []).find(a => a.identificador === prev.identificador);
      if (!fresh) return prev;
      // Preservar fotos locales en el refresco
      return {
        ...fresh,
        producto: {
          ...fresh.producto,
          fotos: prev.producto?.fotos || [],
          images: prev.producto?.images || [],
          image_url: prev.producto?.image_url || fresh.producto?.image_url
        }
      };
    });

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

  const handleGoToSubasta = (auctionItem) => {
    let subastaRef = auctionItem.catalogo?.subastas;
    if (Array.isArray(subastaRef)) {
      subastaRef = subastaRef.length > 0 ? subastaRef[0] : null;
    }
    
    if (subastaRef) {
      const targetSubasta = subastas.find(s => s.identificador === subastaRef.identificador);
      if (targetSubasta) {
        setSelectedSubasta(targetSubasta);
      } else {
        setSelectedSubasta(subastaRef);
      }
      setActiveTab('subastas');
    } else {
      handleBidPress(auctionItem);
    }
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
            if (prev.identificador !== auction.identificador) return prev;
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
      prev.map(item => {
        if (item.identificador === updatedAuction.identificador) {
          // Preserve the original calculated ends_at and original producto (with photos) to prevent resetting
          return {
            ...updatedAuction,
            ends_at: item.ends_at,
            producto: {
              ...updatedAuction.producto,
              fotos: item.producto?.fotos || [],
              images: item.producto?.images || [],
              image_url: item.producto?.image_url || updatedAuction.producto?.image_url
            }
          };
        }
        return item;
      })
    );
    setSelectedAuction(prev => ({
      ...updatedAuction,
      ends_at: prev?.ends_at || updatedAuction.ends_at,
      producto: {
        ...updatedAuction.producto,
        fotos: prev?.producto?.fotos || [],
        images: prev?.producto?.images || [],
        image_url: prev?.producto?.image_url || updatedAuction.producto?.image_url
      }
    }));
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
            quality: 0.2,
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
          quality: 0.2,
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
        // Campos opcionales de información histórica
        artista: hasHistoricalInfo ? uploadArtista.trim() : null,
        periodo: hasHistoricalInfo ? uploadAnio.trim() : null,
        contextoHistorico: hasHistoricalInfo ? uploadContextoHist.trim() : null
      };

      await apiService.uploadProduct(payload);
      setSuccessMessage('¡Producto subido con éxito! Pendiente de aprobación.');
      
      // Limpiar formulario
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

      // Refrescar datos para mostrar nueva subasta y artículos
      if (isAuthenticated && userProfile) {
        fetchUserData();
        fetchMyProductsAndStats();
      }
      fetchData();
      fetchSubastas();
    } catch (err) {
      setErrorMessage(err.message || 'Error al subir el producto.');
    } finally {
      setUploadLoading(false);
    }
  };

  // Verificar bloqueo por multas de más de 72 horas
  const isBlockedByFines = isAuthenticated && (() => {
    if (!userFines || userFines.length === 0) return false;
    const now = new Date();
    return userFines.some(fine => {
      if (fine.estado !== 'pendiente') return false;
      const createdDate = new Date(fine.fechacreacion || fine.created_at);
      if (isNaN(createdDate.getTime())) return false;
      const diffMs = now - createdDate;
      const diffHours = diffMs / (1000 * 60 * 60);
      return diffHours >= 72;
    });
  })();

  if (authLoading) {
    return <SplashLoader statusText="Iniciando PujaYa!..." />;
  }

  if (isBlockedByFines) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#12121E', justifyContent: 'center', padding: 24 }]}>
        <StatusBar barStyle="light-content" backgroundColor="#12121E" />
        <View style={styles.blockedContainer}>
          <View style={styles.blockedHeader}>
            <View style={styles.lockIconContainer}>
              <Feather name="lock" size={40} color="#FF3B30" />
            </View>
            <Text style={styles.blockedTitle}>Cuenta Bloqueada</Text>
            <Text style={styles.blockedSubtitle}>
              Se ha superado el plazo de 72 horas para abonar tus multas pendientes. Debes regularizarlas para acceder a la aplicación.
            </Text>
          </View>

          <ScrollView style={styles.blockedScroll} contentContainerStyle={{ paddingBottom: 16 }}>
            {userFines.filter(f => f.estado === 'pendiente').map(fine => {
              const createdDate = new Date(fine.fechacreacion || fine.created_at);
              const formattedDate = isNaN(createdDate.getTime()) 
                ? 'Fecha no disponible' 
                : createdDate.toLocaleDateString('es-AR') + ' ' + createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return (
                <View key={fine.identificador} style={styles.blockedFineCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={styles.blockedFineTitle} numberOfLines={1}>{fine.descripcion}</Text>
                    <Text style={styles.blockedFineAmount}>${Number(fine.monto).toLocaleString('es-AR')}</Text>
                  </View>
                  <Text style={styles.blockedFineDate}>Emitida: {formattedDate}</Text>
                  
                  <TouchableOpacity 
                    style={styles.payBlockedFineButton}
                    onPress={() => handlePayFine(fine.identificador, Number(fine.monto))}
                  >
                    <Text style={styles.payBlockedFineButtonText}>Pagar con Medio Predeterminado</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.blockedFooter}>
            {activePaymentMethod ? (
              <View style={styles.blockedPaymentBox}>
                <Text style={styles.blockedPaymentLabel}>Medio de Pago Predeterminado:</Text>
                <Text style={styles.blockedPaymentValue}>
                  {activePaymentMethod.marca || 'Tarjeta'} - **** {activePaymentMethod.numerotarjeta?.slice(-4) || '1234'}
                </Text>
                <Text style={styles.blockedPaymentBalance}>
                  Saldo Disponible: {activePaymentMethod.moneda === 'USD' ? 'u$s' : '$'} {Number(activePaymentMethod.monto).toLocaleString('es-AR')}
                </Text>
              </View>
            ) : (
              <View style={[styles.blockedPaymentBox, { borderColor: '#FF3B30', backgroundColor: 'rgba(255, 59, 48, 0.05)' }]}>
                <Text style={[styles.blockedPaymentLabel, { color: '#FF9500' }]}>Sin Medio de Pago Activo</Text>
                <Text style={styles.blockedPaymentBalance}>
                  No tienes un medio de pago predeterminado para saldar la deuda. Contacta a soporte para regularizar.
                </Text>
              </View>
            )}

            <TouchableOpacity style={styles.blockedLogoutButton} onPress={handleLogout}>
              <Feather name="log-out" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.blockedLogoutButtonText}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
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
            onBidPress={handleGoToSubasta}
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
  },
  blockedContainer: {
    backgroundColor: '#1E1E2E',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#FF3B30',
    padding: 20,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  blockedHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  lockIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  blockedTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  blockedSubtitle: {
    color: '#A0A0B0',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  blockedScroll: {
    maxHeight: 250,
    marginBottom: 16,
  },
  blockedFineCard: {
    backgroundColor: '#2A2A3E',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3A3A5E',
  },
  blockedFineTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  blockedFineAmount: {
    color: '#FF3B30',
    fontSize: 15,
    fontWeight: '800',
  },
  blockedFineDate: {
    color: '#8E8E93',
    fontSize: 11,
    marginTop: 4,
    marginBottom: 12,
  },
  payBlockedFineButton: {
    backgroundColor: '#0A5CFF',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  payBlockedFineButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  blockedFooter: {
    borderTopWidth: 1,
    borderTopColor: '#2A2A3E',
    paddingTop: 16,
  },
  blockedPaymentBox: {
    backgroundColor: '#252538',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3A3A5E',
  },
  blockedPaymentLabel: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  blockedPaymentValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  blockedPaymentBalance: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  blockedLogoutButton: {
    backgroundColor: '#E53E3E',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blockedLogoutButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
