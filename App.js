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
  Platform
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { apiService } from './src/api/apiService';
import { supabaseService } from './src/api/supabaseService';
import AuctionCard from './src/components/AuctionCard';
import AuctionDetailModal from './src/components/AuctionDetailModal';
import AuthScreen from './src/screens/AuthScreen';
import { COLORS, FONTS, SHADOWS } from './src/styles/theme';

// Prevent splash screen from hiding as early as possible
// SplashScreen.preventAutoHideAsync().catch(() => {});

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
  const [uploadPhoto, setUploadPhoto] = useState(null); // { uri, base64 }
  const [showPhotoSelector, setShowPhotoSelector] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Splash Screen Interactive State
  const [splashPhase, setSplashPhase] = useState('loading'); // 'loading', 'ready'
  const [loadingDots, setLoadingDots] = useState('.');

  // User Products list State
  const [myProducts, setMyProducts] = useState([]);
  const [loadingMyProducts, setLoadingMyProducts] = useState(false);

  // Check auth status on launch
  useEffect(() => {
    checkAuthentication();
  }, []);

  // Effect for moving dots animation
  useEffect(() => {
    if (splashPhase === 'loading') {
      const interval = setInterval(() => {
        setLoadingDots(prev => {
          if (prev === '...') return '.';
          return prev + '.';
        });
      }, 500);
      return () => clearInterval(interval);
    }
  }, [splashPhase]);

  const checkAuthentication = async () => {
    try {
      // Manual delay of 4 seconds to appreciate the splash screen
                                      await new Promise(resolve => setTimeout(resolve, 4000));
      setSplashPhase('ready');

      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        const profile = await apiService.getProfile();
        setUserProfile(profile);
      }

      // Auto-enter after the 4 seconds delay
      handleSplashEnter();
    } catch (e) {
      console.warn('[App] Session check failed:', e);
      handleSplashEnter(); // Still enter even if check fails
    }
  };

  const handleSplashEnter = async () => {
    if (userProfile) {
      setIsAuthenticated(true);
      fetchData();
      checkConnection();
    } else {
      setIsAuthenticated(false);
    }
    setAuthLoading(false);
    await SplashScreen.hideAsync();
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

  useEffect(() => {
    filterData();
  }, [auctions, searchQuery, selectedCategory]);

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

  // Image Selector helper
  const pickPhoto = async (source) => {
    setShowPhotoSelector(false);
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
        setUploadPhoto({
          uri: result.assets[0].uri,
          base64: result.assets[0].base64
        });
      }
    } catch (e) {
      setErrorMessage('Error al seleccionar la imagen.');
    }
  };

  // Handle uploading product
  const handleUploadProduct = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!uploadTitle || !uploadDesc || !uploadPrice) {
      setErrorMessage('Por favor completa todos los campos.');
      return;
    }

    if (isNaN(uploadPrice) || Number(uploadPrice) <= 0) {
      setErrorMessage('El precio base debe ser un número positivo.');
      return;
    }

    if (!uploadPhoto) {
      setErrorMessage('Por favor sube una foto para el producto.');
      return;
    }

    setUploadLoading(true);
    try {
      const payload = {
        titulo: uploadTitle.trim(),
        descripcion: uploadDesc.trim(),
        precioBase: Number(uploadPrice),
        fotoBase64: uploadPhoto.base64
      };

      await apiService.uploadProduct(payload);
      
      setSuccessMessage('¡Producto subido y publicado en subastas con éxito!');
      setUploadTitle('');
      setUploadDesc('');
      setUploadPrice('');
      setUploadPhoto(null);
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
    return (
      <View style={styles.splashContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <Image
          source={require('./assets/splash-icon.png')}
          style={styles.splashImage}
        />

        {splashPhase === 'loading' ? (
          <View style={{ alignItems: 'center', height: 60, justifyContent: 'center' }}>
            <Text style={{ fontSize: 40, color: '#0A5CFF', fontWeight: 'bold' }}>
              {loadingDots}
            </Text>
          </View>
        ) : (
          <View style={{ height: 60 }} />
        )}
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor={COLORS.darkGray600} />
          <AuthScreen onLoginSuccess={handleLoginSuccess} />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.darkGray600} />

        {/* 1. SCREEN VIEW SWITCHER */}
        <View style={styles.mainContent}>

        {/* TAB 1: HOME */}
        {activeTab === 'home' && (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Header Panel */}
            <View style={styles.homeHeader}>
              <View>
                <Text style={styles.headerWelcome}>¡Hola de nuevo!</Text>
                <Text style={styles.headerName}>{userProfile?.nombre}</Text>
              </View>
              <TouchableOpacity onPress={handleLogout} style={styles.logoutIconButton}>
                <Text style={styles.logoutIcon}>🚪</Text>
              </TouchableOpacity>
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
                <Text style={styles.statIcon}>🔨</Text>
                <Text style={styles.statValue}>{stats.offers}</Text>
                <Text style={styles.statLabel}>Ofertas</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statIcon}>📦</Text>
                <Text style={styles.statValue}>{stats.uploaded}</Text>
                <Text style={styles.statLabel}>Artículos</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statIcon}>🏆</Text>
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

        {/* TAB 2: SUBASTAS */}
        {activeTab === 'subastas' && (
          <View style={{ flex: 1 }}>
            {/* Header Panel */}
            <View style={styles.header}>
              <View>
                <Text style={styles.headerTitle}>Subastas Activas</Text>
                <Text style={styles.headerSubtitle}>Explora ofertas en vivo</Text>
              </View>
            </View>

            {/* Search & Category filter */}
            <View style={styles.searchSection}>
              <View style={styles.searchBar}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar artículos..."
                  placeholderTextColor={COLORS.lightGray200}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                    <Text style={styles.clearButtonText}>✕</Text>
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
                <Text style={styles.loadingText}>Cargando subastas...</Text>
              </View>
            ) : filteredAuctions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTextIcon}>🔍</Text>
                <Text style={styles.emptyTextTitle}>No se encontraron subastas</Text>
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

        {/* TAB 3: UPLOAD PRODUCT */}
        {activeTab === 'upload' && (
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={{ flex: 1 }}
          >
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
              <View style={styles.uploadHeader}>
                <Text style={styles.headerTitle}>Subir Producto</Text>
                <Text style={styles.headerSubtitle}>Registra un artículo para subasta</Text>
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
                  numberOfLines={4}
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

                <Text style={styles.inputLabel}>Fotografía del Producto</Text>
                <TouchableOpacity style={styles.photoUploadBox} onPress={() => setShowPhotoSelector(true)}>
                  {uploadPhoto ? (
                    <Image source={{ uri: uploadPhoto.uri }} style={styles.uploadedThumbnail} />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Text style={styles.photoPlaceholderIcon}>📷</Text>
                      <Text style={styles.photoPlaceholderLabel}>Seleccionar Imagen</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.submitButton, uploadLoading && styles.disabledButton]}
                  onPress={handleUploadProduct}
                  disabled={uploadLoading}
                >
                  {uploadLoading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.submitButtonText}>Publicar Artículo</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        )}

        {/* TAB 4: MIS ARTÍCULOS */}
        {activeTab === 'articulos' && (
          <View style={{ flex: 1 }}>
            <View style={styles.header}>
              <View>
                <Text style={styles.headerTitle}>Mis Artículos</Text>
                <Text style={styles.headerSubtitle}>Productos registrados a tu nombre</Text>
              </View>
            </View>

            {loadingMyProducts ? (
              <View style={styles.tabLoader}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Cargando tus artículos...</Text>
              </View>
            ) : myProducts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTextIcon}>📦</Text>
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

        {/* TAB 5: PERFIL */}
        {activeTab === 'perfil' && (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.perfilHeader}>
              <Text style={styles.headerTitle}>Mi Perfil</Text>
              <Text style={styles.headerSubtitle}>Datos de tu cuenta de Postor</Text>
            </View>

            {/* Profile Avatar Card */}
            <View style={styles.profileAvatarCard}>
              <View style={styles.avatarIconBox}>
                <Text style={styles.avatarIconText}>👤</Text>
              </View>
              <Text style={styles.profileNameText}>{userProfile?.nombre}</Text>
              <View style={[styles.profileTierBadge, SHADOWS.glow]}>
                <Text style={styles.profileTierBadgeText}>Nivel {userProfile?.categoria?.toUpperCase()}</Text>
              </View>
            </View>

            {/* User Data Card */}
            <View style={styles.card}>
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
            </View>

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
          <Text style={[styles.navIcon, activeTab === 'home' && styles.activeNavIcon]}>🏠</Text>
          <Text style={[styles.navText, activeTab === 'home' && styles.activeNavText]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => setActiveTab('subastas')}
        >
          <Text style={[styles.navIcon, activeTab === 'subastas' && styles.activeNavIcon]}>🔨</Text>
          <Text style={[styles.navText, activeTab === 'subastas' && styles.activeNavText]}>Subastas</Text>
        </TouchableOpacity>

        {/* Middle Plus Button */}
        <TouchableOpacity 
          style={styles.middleNavItem} 
          onPress={() => {
            setUploadTitle('');
            setUploadDesc('');
            setUploadPrice('');
            setUploadPhoto(null);
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
          <Text style={[styles.navIcon, activeTab === 'articulos' && styles.activeNavIcon]}>📦</Text>
          <Text style={[styles.navText, activeTab === 'articulos' && styles.activeNavText]}>Artículos</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => setActiveTab('perfil')}
        >
          <Text style={[styles.navIcon, activeTab === 'perfil' && styles.activeNavIcon]}>👤</Text>
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

      {/* Image Source Selector Modal */}
      {showPhotoSelector && (
        <View style={styles.selectorOverlay}>
          <View style={styles.selectorContainer}>
            <Text style={styles.selectorTitle}>Subir foto del producto</Text>
            <Text style={styles.selectorSubtitle}>¿Cómo quieres agregar la foto?</Text>
            
            <TouchableOpacity style={styles.selectorOption} onPress={() => pickPhoto('camera')}>
              <Text style={styles.selectorOptionIcon}>📷</Text>
              <Text style={styles.selectorOptionText}>Tomar Foto con la Cámara</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.selectorOption} onPress={() => pickPhoto('gallery')}>
              <Text style={styles.selectorOptionIcon}>🖼️</Text>
              <Text style={styles.selectorOptionText}>Elegir desde la Galería</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.selectorOption, styles.cancelOption]} onPress={() => setShowPhotoSelector(false)}>
              <Text style={styles.cancelOptionText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
    </SafeAreaProvider>
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
  splashContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashImage: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
  },
  splashLoader: {
    marginTop: 20,
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
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
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
    color: COLORS.white,
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
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
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
    color: COLORS.white,
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
    color: COLORS.white,
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
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
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
    color: COLORS.white,
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
    color: COLORS.white,
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
});
