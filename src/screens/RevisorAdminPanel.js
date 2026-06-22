import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator, 
  TextInput, 
  Alert, 
  FlatList, 
  Dimensions,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { COLORS, FONTS, SHADOWS } from '../styles/theme';
import { apiService } from '../api/apiService';
import { supabaseService } from '../api/supabaseService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function RevisorAdminPanel({
  userProfile,
  setActiveTab,
  pendingClients = [],
  revisorLoading,
  handleApproveClient,
  handleRejectClient,
  fetchUserData,
  subastas = []
}) {
  const [activeSubTab, setActiveSubTab] = useState('admision'); // 'admision', 'productos', 'chats', 'crear_subasta'
  
  // Tab 1 (Admisión) local states
  const [admisionSegment, setAdmisionSegment] = useState('solicitudes'); // 'solicitudes', 'niveles', 'pagos'
  const [selectedCategories, setSelectedCategories] = useState({}); // clientId -> category mapping
  const [activeClients, setActiveClients] = useState([]);
  const [loadingActiveClients, setLoadingActiveClients] = useState(false);
  const [revisorPasswords, setRevisorPasswords] = useState({});
  const [revisorReasons, setRevisorReasons] = useState({});
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Tab 2 (Productos) local states
  const [pendingProducts, setPendingProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [showSubastaModal, setShowSubastaModal] = useState(false);
  const [selectedProductForApproval, setSelectedProductForApproval] = useState(null);
  const [proposedPrices, setProposedPrices] = useState({});
  const [proposedCommissions, setProposedCommissions] = useState({});

  // Póliza de seguro local states
  const [policyNumber, setPolicyNumber] = useState('');
  const [policyCompany, setPolicyCompany] = useState('Seguros Internacionales S.A.');
  const [policyCombined, setPolicyCombined] = useState('no');
  const [policyAmount, setPolicyAmount] = useState('');
  const [selectedSubastaIdForApproval, setSelectedSubastaIdForApproval] = useState(null);

  // Tab 4 (Crear Subasta) local states
  const [subastaFecha, setSubastaFecha] = useState('');
  const [subastaHora, setSubastaHora] = useState('');
  const [subastaUbicacion, setSubastaUbicacion] = useState('');
  const [subastaCapacidad, setSubastaCapacidad] = useState('100');
  const [subastaDeposito, setSubastaDeposito] = useState('no');
  const [subastaSeguridad, setSubastaSeguridad] = useState('no');
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [approvedProducts, setApprovedProducts] = useState([]);
  const [loadingApproved, setLoadingApproved] = useState(false);
  const [creatingSubasta, setCreatingSubasta] = useState(false);

  // Tab 3 (Chats) local states
  const [chatClients, setChatClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [selectedChatClient, setSelectedChatClient] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const chatScrollRef = useRef(null);

  // Load products, chat clients, or pending payments on mount / tab change
  useEffect(() => {
    if (activeSubTab === 'productos') {
      loadPendingProducts();
    } else if (activeSubTab === 'chats') {
      loadChatClients(false);
    } else if (activeSubTab === 'admision') {
      if (admisionSegment === 'solicitudes') {
        // Pending clients are loaded via props
      } else if (admisionSegment === 'niveles') {
        loadActiveClientsMobile();
      } else if (admisionSegment === 'pagos') {
        loadPendingPayments();
      }
    } else if (activeSubTab === 'crear_subasta') {
      loadApprovedProducts();
    }
  }, [activeSubTab, admisionSegment]);

  // Periodically fetch chat messages when a chat is open, OR refresh chat list silently
  useEffect(() => {
    let interval;
    if (activeSubTab === 'chats') {
      if (selectedChatClient) {
        fetchChatMessages();
        interval = setInterval(fetchChatMessages, 3000);
      } else {
        interval = setInterval(() => loadChatClients(true), 5000);
      }
    }
    return () => clearInterval(interval);
  }, [selectedChatClient, activeSubTab]);

  // Scroll chat to end when new messages load
  useEffect(() => {
    if (chatMessages.length > 0) {
      setTimeout(() => {
        chatScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [chatMessages]);

  const loadActiveClientsMobile = async () => {
    setLoadingActiveClients(true);
    try {
      const data = await apiService.getActiveClients();
      setActiveClients(data || []);
    } catch (e) {
      console.warn('Error loading active clients:', e);
    } finally {
      setLoadingActiveClients(false);
    }
  };

  const handleUpgradeClientMobile = async (clientId, newCategory) => {
    try {
      setLoadingActiveClients(true);
      await apiService.updateClientCategory(clientId, newCategory);
      Alert.alert('Nivel Actualizado', 'La categoría del cliente se ha actualizado con éxito.');
      loadActiveClientsMobile();
      if (fetchUserData) fetchUserData();
    } catch (err) {
      Alert.alert('Error', err.message || 'Error al actualizar nivel.');
    } finally {
      setLoadingActiveClients(false);
    }
  };

  // --- TAB 1: PENDING PAYMENT METHODS ---
  const loadPendingPayments = async () => {
    setLoadingPayments(true);
    try {
      const data = await apiService.getPendingPaymentMethods();
      setPendingPayments(data || []);
    } catch (e) {
      console.warn('Error loading pending payment methods:', e);
    } finally {
      setLoadingPayments(false);
    }
  };

  const handleApprovePayment = async (pmId) => {
    Alert.alert(
      'Aprobar Medio de Pago',
      '¿Estás seguro de que quieres aprobar este medio de pago?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Aprobar', 
          onPress: async () => {
            try {
              setLoadingPayments(true);
              await apiService.approvePaymentMethod(pmId);
              Alert.alert('Medio de Pago Aprobado', 'El medio de pago ha sido aprobado con éxito.');
              loadPendingPayments();
              if (fetchUserData) fetchUserData();
            } catch (err) {
              Alert.alert('Error', err.message || 'Error al aprobar medio de pago.');
            } finally {
              setLoadingPayments(false);
            }
          }
        }
      ]
    );
  };

  const handleRejectPayment = async (pmId) => {
    Alert.alert(
      'Rechazar Medio de Pago',
      '¿Estás seguro de que quieres rechazar este medio de pago? Se eliminará de la lista del cliente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Rechazar', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoadingPayments(true);
              await apiService.rejectPaymentMethod(pmId);
              Alert.alert('Medio de Pago Rechazado', 'El medio de pago ha sido descartado de las revisiones.');
              loadPendingPayments();
              if (fetchUserData) fetchUserData();
            } catch (err) {
              Alert.alert('Error', err.message || 'Error al rechazar medio de pago.');
            } finally {
              setLoadingPayments(false);
            }
          }
        }
      ]
    );
  };

  // --- TAB 2: PRODUCT REVIEW METHODS ---
  const loadPendingProducts = async () => {
    setLoadingProducts(true);
    try {
      const data = await apiService.getPendingProducts();
      setPendingProducts(data || []);
    } catch (e) {
      console.warn('Error loading pending products:', e);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleApproveProductPress = (product) => {
    setSelectedProductForApproval(product);
    // Suggest a default policy number
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setPolicyNumber(`POL-2026-${product.identificador}-${randomSuffix}`);
    setPolicyCompany('Seguros Internacionales S.A.');
    setPolicyCombined('no');
    // Set default amount to the base price of the product
    const basePrice = product.precio_base_propuesto ? product.precio_base_propuesto.toString() : '';
    setPolicyAmount(basePrice);
    setSelectedSubastaIdForApproval(null);
    setShowSubastaModal(true);
  };

  const handleConfirmProductApproval = async () => {
    if (!selectedProductForApproval) return;
    if (!selectedSubastaIdForApproval) {
      Alert.alert('Campos Incompletos', 'Por favor selecciona una subasta.');
      return;
    }
    if (!policyNumber.trim() || !policyCompany.trim() || !policyAmount.trim()) {
      Alert.alert('Campos Incompletos', 'Por favor completa todos los campos de la póliza de seguro.');
      return;
    }
    const amountNum = Number(policyAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'El importe asegurado debe ser un número mayor a 0.');
      return;
    }

    try {
      setLoadingProducts(true);
      const policyData = {
        nroPoliza: policyNumber.trim(),
        compania: policyCompany.trim(),
        polizaCombinada: policyCombined,
        importe: amountNum
      };

      await apiService.approveProduct(
        selectedProductForApproval.identificador, 
        selectedSubastaIdForApproval,
        policyData
      );

      Alert.alert('Éxito', 'El producto ha sido aprobado y la póliza de seguro ha sido registrada.');
      setShowSubastaModal(false);
      setSelectedProductForApproval(null);
      
      // Reset policy states
      setPolicyNumber('');
      setPolicyCompany('Seguros Internacionales S.A.');
      setPolicyCombined('no');
      setPolicyAmount('');
      setSelectedSubastaIdForApproval(null);

      loadPendingProducts();
    } catch (err) {
      Alert.alert('Error', err.message || 'Error al aprobar producto.');
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleRejectProduct = async (productId) => {
    Alert.alert(
      'Rechazar Producto',
      '¿Estás seguro de que quieres rechazar este producto? Se eliminará de las revisiones pendientes.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Rechazar', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoadingProducts(true);
              await apiService.rejectProduct(productId);
              Alert.alert('Producto Rechazado', 'El producto ha sido descartado de las revisiones.');
              loadPendingProducts();
            } catch (err) {
              Alert.alert('Error', err.message || 'Error al rechazar producto.');
            } finally {
              setLoadingProducts(false);
            }
          }
        }
      ]
    );
  };

  // --- TAB 3: SUPPORT CHAT METHODS ---
  const loadChatClients = async (silent = false) => {
    if (!silent) setLoadingClients(true);
    try {
      const isConfigured = apiService.getConfigStatus().configured;
      const unreadCounts = await apiService.getUnreadChatMessagesCount(userProfile.identificador);

      if (!isConfigured) {
        setChatClients([
          { identificador: 3, nombre: 'Usuario Postor', email: 'juan@mail.com', unreadCount: unreadCounts[3] || 0 }
        ]);
        return;
      }

      const { supabase } = require('../api/supabaseClient');
      const { data, error } = await supabase
        .from('personas')
        .select(`
          identificador,
          nombre,
          personas_credenciales (
            email
          )
        `)
        .eq('estado', 'activo');

      if (!error && data) {
        const mapped = data.map(p => {
          const creds = p.personas_credenciales && p.personas_credenciales.length > 0 
            ? p.personas_credenciales[0] 
            : p.personas_credenciales;
          return {
            identificador: p.identificador,
            nombre: p.nombre,
            email: creds?.email || '',
            unreadCount: unreadCounts[p.identificador] || 0
          };
        }).filter(p => p.identificador !== userProfile?.identificador);
        
        setChatClients(mapped);
      }
    } catch (e) {
      console.warn('Error loading chat clients:', e);
    } finally {
      if (!silent) setLoadingClients(false);
    }
  };

  const fetchChatMessages = async () => {
    if (!selectedChatClient) return;
    try {
      const msgs = await apiService.getChatMessages(userProfile.identificador, selectedChatClient.identificador);
      setChatMessages(msgs || []);
      // Mark client's messages to tech as read
      await apiService.markMessagesAsRead(selectedChatClient.identificador, userProfile.identificador);
    } catch (e) {
      console.warn('Error loading messages:', e);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessageText.trim() || !selectedChatClient) return;
    
    setSendingMessage(true);
    try {
      await apiService.sendChatMessage(
        userProfile.identificador,
        selectedChatClient.identificador,
        newMessageText.trim()
      );
      setNewMessageText('');
      fetchChatMessages();
    } catch (e) {
      Alert.alert('Error', 'No se pudo enviar el mensaje.');
    } finally {
      setSendingMessage(false);
    }
  };

  const loadApprovedProducts = async () => {
    setLoadingApproved(true);
    try {
      const data = await apiService.getApprovedProducts();
      setApprovedProducts(data || []);
    } catch (e) {
      console.warn('Error loading approved products:', e);
    } finally {
      setLoadingApproved(false);
    }
  };

  const handleProposeTerms = async (productId) => {
    const price = proposedPrices[productId];
    const commission = proposedCommissions[productId];

    if (!price || isNaN(Number(price)) || Number(price) <= 0) {
      Alert.alert('Error', 'Por favor ingresa un precio base propuesto válido.');
      return;
    }

    if (!commission || isNaN(Number(commission)) || Number(commission) <= 0) {
      Alert.alert('Error', 'Por favor ingresa una comisión propuesta válida.');
      return;
    }

    try {
      setLoadingProducts(true);
      await apiService.proposeProductTerms(productId, Number(price), Number(commission));
      Alert.alert('Éxito', 'La propuesta de términos ha sido enviada al cliente.');
      loadPendingProducts();
    } catch (err) {
      Alert.alert('Error', err.message || 'No se pudo enviar la propuesta.');
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleCreateSubasta = async () => {
    if (!subastaFecha.trim() || !subastaHora.trim() || !subastaUbicacion.trim() || !subastaCapacidad.trim()) {
      Alert.alert('Campos Incompletos', 'Por favor completa todos los campos de la subasta.');
      return;
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const chosen = new Date(subastaFecha.trim() + 'T00:00:00');
      
      const diffTime = chosen.getTime() - today.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      if (isNaN(diffDays) || diffDays < 10) {
        Alert.alert('Fecha Inválida', 'La fecha de la subasta debe programarse con al menos 10 días de anticipación.');
        return;
      }
    } catch (e) {
      Alert.alert('Error de Fecha', 'Ingresa una fecha válida en formato AAAA-MM-DD (ej: 2026-07-20).');
      return;
    }

    if (selectedProductIds.length === 0) {
      Alert.alert('Productos Requeridos', 'Debes seleccionar al menos un producto aprobado para asociar a la subasta.');
      return;
    }

    setCreatingSubasta(true);
    try {
      const subastaData = {
        fecha: subastaFecha.trim(),
        hora: subastaHora.trim(),
        ubicacion: subastaUbicacion.trim(),
        capacidad: Number(subastaCapacidad),
        deposito: subastaDeposito,
        seguridad: subastaSeguridad
      };

      await apiService.createSubasta(subastaData, selectedProductIds);
      Alert.alert('Éxito', 'La subasta ha sido creada y programada con éxito.');
      
      setSubastaFecha('');
      setSubastaHora('');
      setSubastaUbicacion('');
      setSelectedProductIds([]);
      
      if (fetchUserData) fetchUserData();
      setActiveSubTab('productos');
    } catch (err) {
      Alert.alert('Error', err.message || 'No se pudo crear la subasta.');
    } finally {
      setCreatingSubasta(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <TouchableOpacity 
            onPress={() => setActiveTab('perfil')} 
            style={styles.backButton}
          >
            <Feather name="arrow-left" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Admin Revisor Técnico</Text>
        </View>
      </View>

      {/* Sub-Tabs Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tabButton, activeSubTab === 'admision' && styles.activeTabButton]}
          onPress={() => setActiveSubTab('admision')}
        >
          <Feather name="user-check" size={16} color={activeSubTab === 'admision' ? COLORS.secondary : COLORS.lightGray200} />
          <Text style={[styles.tabText, activeSubTab === 'admision' && styles.activeTabText]}>Admisión</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabButton, activeSubTab === 'productos' && styles.activeTabButton]}
          onPress={() => setActiveSubTab('productos')}
        >
          <Feather name="package" size={16} color={activeSubTab === 'productos' ? COLORS.secondary : COLORS.lightGray200} />
          <Text style={[styles.tabText, activeSubTab === 'productos' && styles.activeTabText]}>Productos</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabButton, activeSubTab === 'chats' && styles.activeTabButton]}
          onPress={() => setActiveSubTab('chats')}
        >
          <Feather name="message-square" size={16} color={activeSubTab === 'chats' ? COLORS.secondary : COLORS.lightGray200} />
          <Text style={[styles.tabText, activeSubTab === 'chats' && styles.activeTabText]}>Soporte</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabButton, activeSubTab === 'crear_subasta' && styles.activeTabButton]}
          onPress={() => setActiveSubTab('crear_subasta')}
        >
          <Feather name="plus-circle" size={16} color={activeSubTab === 'crear_subasta' ? COLORS.secondary : COLORS.lightGray200} />
          <Text style={[styles.tabText, activeSubTab === 'crear_subasta' && styles.activeTabText]}>Subasta</Text>
        </TouchableOpacity>
      </View>

      {/* Contents based on Tab */}
      <View style={styles.contentBody}>
        
        {/* TAB 1: ADMISIÓN DE CLIENTES */}
        {activeSubTab === 'admision' && (
          <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            {/* Segmented Control */}
            <View style={{ flexDirection: 'row', backgroundColor: '#E5E5EA', borderRadius: 8, padding: 4, marginBottom: 16 }}>
              <TouchableOpacity 
                style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: admisionSegment === 'solicitudes' ? COLORS.primary : 'transparent', borderRadius: 6 }}
                onPress={() => setAdmisionSegment('solicitudes')}
              >
                <Text style={{ color: admisionSegment === 'solicitudes' ? '#FFFFFF' : COLORS.lightGray200, fontWeight: 'bold', fontSize: 12 }}>Solicitudes</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: admisionSegment === 'niveles' ? COLORS.primary : 'transparent', borderRadius: 6 }}
                onPress={() => {
                  setAdmisionSegment('niveles');
                  loadActiveClientsMobile();
                }}
              >
                <Text style={{ color: admisionSegment === 'niveles' ? '#FFFFFF' : COLORS.lightGray200, fontWeight: 'bold', fontSize: 12 }}>Niveles</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: admisionSegment === 'pagos' ? COLORS.primary : 'transparent', borderRadius: 6 }}
                onPress={() => setAdmisionSegment('pagos')}
              >
                <Text style={{ color: admisionSegment === 'pagos' ? '#FFFFFF' : COLORS.lightGray200, fontWeight: 'bold', fontSize: 12 }}>Pagos</Text>
              </TouchableOpacity>
            </View>

            {/* Solicitudes Sub-Tab */}
            {admisionSegment === 'solicitudes' && (
              <>
                <Text style={styles.sectionTitle}>Solicitudes de Clientes</Text>
                <Text style={styles.sectionSubtitle}>Verifica selfies y DNI para admitir usuarios</Text>

                {revisorLoading ? (
                  <ActivityIndicator color={COLORS.secondary} size="large" style={{ marginTop: 40 }} />
                ) : pendingClients.length === 0 ? (
                  <View style={styles.emptyView}>
                    <Feather name="users" size={40} color={COLORS.lightGray200} style={{ marginBottom: 12 }} />
                    <Text style={styles.emptyText}>No hay solicitudes de clientes pendientes de admisión.</Text>
                  </View>
                ) : (
                  pendingClients.map((client) => {
                    const docPhotos = (client.fotos_documento || '').split(',').filter(Boolean);
                    const selectedCat = selectedCategories[client.identificador] || 'comun';
                    return (
                      <View key={client.identificador.toString()} style={styles.clientRequestCard}>
                        <View style={styles.clientHeader}>
                          <View>
                            <Text style={styles.clientName}>{client.nombre}</Text>
                            <Text style={styles.clientEmail}>{client.email}</Text>
                          </View>
                          <View style={styles.dniBadge}>
                            <Text style={styles.dniBadgeText}>DNI: {client.documento}</Text>
                          </View>
                        </View>

                        <Text style={styles.metaText}>Dirección: {client.direccion}</Text>

                        {/* Selfie Preview */}
                        <Text style={styles.sectionDividerLabel}>Selfie de Validación</Text>
                        <View style={styles.selfieBox}>
                          {client.foto ? (
                            <Image source={{ uri: client.foto }} style={styles.selfieImage} />
                          ) : (
                            <View style={styles.noPhotoPlaceholder}>
                              <Feather name="user" size={24} color={COLORS.lightGray200} />
                              <Text style={styles.noPhotoText}>Sin selfie registrada</Text>
                            </View>
                          )}
                        </View>

                        {/* DNI Photos */}
                        <Text style={styles.sectionDividerLabel}>Fotografías de Documento</Text>
                        <View style={styles.dniRow}>
                          {docPhotos.map((uri, idx) => (
                            <View key={idx.toString()} style={styles.dniPhotoWrapper}>
                              <Image source={{ uri }} style={styles.dniPhoto} />
                              <Text style={styles.dniPhotoLabel}>
                                {idx === 0 ? 'Frente' : 'Dorso'}
                              </Text>
                            </View>
                          ))}
                          {docPhotos.length === 0 && (
                            <Text style={styles.noPhotoText}>No se cargaron imágenes de documentos.</Text>
                          )}
                        </View>

                        {/* Inputs */}
                        <View style={styles.revisorInputs}>
                          <Text style={styles.inputLabel}>Categoría Inicial del Cliente:</Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 6 }}>
                            {['comun', 'especial', 'plata', 'oro', 'platino'].map(cat => {
                              const isSel = selectedCat === cat;
                              return (
                                <TouchableOpacity
                                  key={cat}
                                  style={{
                                    paddingHorizontal: 10,
                                    paddingVertical: 6,
                                    borderRadius: 8,
                                    borderWidth: 1,
                                    borderColor: isSel ? COLORS.secondary : COLORS.border,
                                    backgroundColor: isSel ? 'rgba(255, 140, 0, 0.12)' : COLORS.darkGray600
                                  }}
                                  onPress={() => setSelectedCategories(prev => ({ ...prev, [client.identificador]: cat }))}
                                >
                                  <Text style={{ color: isSel ? COLORS.secondary : COLORS.lightGray200, fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' }}>
                                    {cat}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>

                          <Text style={styles.inputLabel}>Contraseña temporal (para Admitir):</Text>
                          <TextInput
                            style={styles.textInput}
                            placeholder="Contraseña temporal"
                            placeholderTextColor={COLORS.lightGray200}
                            value={revisorPasswords[client.identificador] !== undefined ? revisorPasswords[client.identificador] : '123456'}
                            onChangeText={(text) => setRevisorPasswords(prev => ({ ...prev, [client.identificador]: text }))}
                          />

                          <Text style={styles.inputLabel}>Motivo de rechazo (para Rechazar):</Text>
                          <TextInput
                            style={styles.textInput}
                            placeholder="Ej: Fotos ilegibles o borrosas"
                            placeholderTextColor={COLORS.lightGray200}
                            value={revisorReasons[client.identificador] || ''}
                            onChangeText={(text) => setRevisorReasons(prev => ({ ...prev, [client.identificador]: text }))}
                          />
                        </View>

                        {/* Buttons */}
                        <View style={styles.actionsRow}>
                          <TouchableOpacity 
                            style={[styles.actionBtn, styles.approveBtn]}
                            onPress={() => handleApproveClient(client.identificador, revisorPasswords[client.identificador] !== undefined ? revisorPasswords[client.identificador] : '123456', selectedCat)}
                          >
                            <Feather name="user-check" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                            <Text style={styles.actionBtnText}>Admitir</Text>
                          </TouchableOpacity>

                          <TouchableOpacity 
                            style={[styles.actionBtn, styles.rejectBtn]}
                            onPress={() => handleRejectClient(client.identificador, revisorReasons[client.identificador] || '')}
                          >
                            <Feather name="user-x" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                            <Text style={styles.actionBtnText}>Rechazar</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )}
              </>
            )}

            {/* Niveles (Upgrade) Sub-Tab */}
            {admisionSegment === 'niveles' && (
              <>
                <Text style={styles.sectionTitle}>Gestión de Niveles</Text>
                <Text style={styles.sectionSubtitle}>Modifica la categoría o nivel de los clientes activos</Text>

                {loadingActiveClients ? (
                  <ActivityIndicator color={COLORS.secondary} size="large" style={{ marginTop: 40 }} />
                ) : activeClients.length === 0 ? (
                  <View style={styles.emptyView}>
                    <Feather name="users" size={40} color={COLORS.lightGray200} style={{ marginBottom: 12 }} />
                    <Text style={styles.emptyText}>No hay clientes activos registrados.</Text>
                  </View>
                ) : (
                  activeClients.map((client) => {
                    const currentCat = client.categoria || 'comun';
                    return (
                      <View key={client.identificador.toString()} style={styles.clientRequestCard}>
                        <View style={styles.clientHeader}>
                          <View>
                            <Text style={styles.clientName}>{client.nombre}</Text>
                            <Text style={styles.clientEmail}>{client.email}</Text>
                            <Text style={[styles.metaText, { marginTop: 4 }]}>DNI: {client.documento}</Text>
                          </View>
                          <View style={[styles.dniBadge, { backgroundColor: 'rgba(10, 92, 255, 0.1)', borderColor: 'transparent' }]}>
                            <Text style={[styles.dniBadgeText, { color: COLORS.primary, textTransform: 'uppercase' }]}>{currentCat}</Text>
                          </View>
                        </View>

                        <Text style={[styles.inputLabel, { marginTop: 12 }]}>Modificar Categoría del Cliente:</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 6 }}>
                          {['comun', 'especial', 'plata', 'oro', 'platino'].map(cat => {
                            const isCurrent = currentCat === cat;
                            return (
                              <TouchableOpacity
                                key={cat}
                                style={{
                                  paddingHorizontal: 10,
                                  paddingVertical: 6,
                                  borderRadius: 8,
                                  borderWidth: 1,
                                  borderColor: isCurrent ? COLORS.primary : COLORS.border,
                                  backgroundColor: isCurrent ? 'rgba(10, 92, 255, 0.12)' : COLORS.darkGray600
                                }}
                                onPress={() => {
                                  if (!isCurrent) {
                                    Alert.alert(
                                      'Cambiar Categoría',
                                      `¿Deseas cambiar la categoría de ${client.nombre} a ${cat.toUpperCase()}?`,
                                      [
                                        { text: 'Cancelar', style: 'cancel' },
                                        { text: 'Cambiar', onPress: () => handleUpgradeClientMobile(client.identificador, cat) }
                                      ]
                                    );
                                  }
                                }}
                              >
                                <Text style={{ color: isCurrent ? COLORS.primary : COLORS.lightGray200, fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' }}>
                                  {cat}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })
                )}
              </>
            )}

            {/* Pagos (Payment Methods) Sub-Tab */}
            {admisionSegment === 'pagos' && (
              <>
                <Text style={styles.sectionTitle}>Medios de Pago Pendientes</Text>
                <Text style={styles.sectionSubtitle}>Aprueba o rechaza CBUs y Cheques Certificados</Text>

                {loadingPayments ? (
                  <ActivityIndicator color={COLORS.secondary} size="large" style={{ marginTop: 20 }} />
                ) : pendingPayments.length === 0 ? (
                  <View style={styles.emptyView}>
                    <Feather name="credit-card" size={40} color={COLORS.lightGray200} style={{ marginBottom: 12 }} />
                    <Text style={styles.emptyText}>No hay medios de pago pendientes de aprobación.</Text>
                  </View>
                ) : (
                  pendingPayments.map((pm) => {
                    return (
                      <View key={pm.identificador.toString()} style={styles.clientRequestCard}>
                        <View style={styles.clientHeader}>
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={styles.clientName}>{pm.client_name}</Text>
                            <Text style={styles.clientEmail}>
                              Tipo: {pm.tipo === 'cuenta' ? 'CBU / Cuenta Bancaria' : pm.tipo === 'cheque' ? 'Cheque Certificado' : pm.tipo}
                            </Text>
                          </View>
                          <View style={[styles.dniBadge, { backgroundColor: 'rgba(255, 140, 0, 0.1)', borderColor: 'rgba(255, 140, 0, 0.2)' }]}>
                            <Text style={[styles.dniBadgeText, { color: COLORS.secondary }]}>EN PROCESO</Text>
                          </View>
                        </View>

                        <Text style={[styles.metaText, { marginTop: 6 }]}>
                          <Text style={{ fontWeight: 'bold' }}>Proveedor: </Text>
                          {pm.proveedor}
                        </Text>

                        <Text style={[styles.metaText, { marginTop: 4 }]}>
                          <Text style={{ fontWeight: 'bold' }}>Identificación: </Text>
                          {pm.mascara}
                        </Text>

                        {pm.tipo === 'cheque' && (
                          <Text style={[styles.metaText, { marginTop: 4, color: COLORS.success, fontWeight: 'bold' }]}>
                            Monto del Cheque: ${Number(pm.monto).toLocaleString()}
                          </Text>
                        )}

                        {/* Action buttons for payment method approval */}
                        <View style={[styles.actionsRow, { marginTop: 16 }]}>
                          <TouchableOpacity 
                            style={[styles.actionBtn, styles.approveBtn]}
                            onPress={() => handleApprovePayment(pm.identificador)}
                          >
                            <Feather name="check" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                            <Text style={styles.actionBtnText}>Aprobar</Text>
                          </TouchableOpacity>

                          <TouchableOpacity 
                            style={[styles.actionBtn, styles.rejectBtn]}
                            onPress={() => handleRejectPayment(pm.identificador)}
                          >
                            <Feather name="x" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                            <Text style={styles.actionBtnText}>Rechazar</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )}
              </>
            )}

          </ScrollView>
        )}

        {/* TAB 2: REVISIÓN DE PRODUCTOS */}
        {activeSubTab === 'productos' && (
          <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.sectionTitle}>Productos Pendientes</Text>
            <Text style={styles.sectionSubtitle}>Propón precio base y comisión o rechaza el artículo</Text>

            {loadingProducts ? (
              <ActivityIndicator color={COLORS.secondary} size="large" style={{ marginTop: 40 }} />
            ) : pendingProducts.length === 0 ? (
              <View style={styles.emptyView}>
                <Feather name="box" size={40} color={COLORS.lightGray200} style={{ marginBottom: 12 }} />
                <Text style={styles.emptyText}>No hay productos cargados pendientes de revisión.</Text>
              </View>
            ) : (
              pendingProducts.map((product) => {
                const estado = product.propuesta_estado || 'en_revision';

                return (
                  <View key={product.identificador.toString()} style={styles.clientRequestCard}>
                    <View style={styles.clientHeader}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={styles.clientName}>{product.titulo}</Text>
                        <Text style={styles.clientEmail}>De: {product.seller_name}</Text>
                      </View>
                      <View style={[
                        styles.dniBadge, 
                        { 
                          backgroundColor: estado === 'en_revision' ? 'rgba(255, 140, 0, 0.1)' : estado === 'propuesta_enviada' ? 'rgba(10, 92, 255, 0.1)' : estado === 'aceptada' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          borderColor: 'transparent'
                        }
                      ]}>
                        <Text style={[
                          styles.dniBadgeText, 
                          { 
                            color: estado === 'en_revision' ? COLORS.secondary : estado === 'propuesta_enviada' ? COLORS.primary : estado === 'aceptada' ? '#10B981' : COLORS.danger 
                          }
                        ]}>
                          {estado === 'en_revision' ? 'REVISIÓN' : estado === 'propuesta_enviada' ? 'PROPUESTO' : estado === 'aceptada' ? 'ACEPTADO' : 'RECHAZADO'}
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.metaText, { marginTop: 6 }]}>
                      <Text style={{ fontWeight: 'bold' }}>Descripción: </Text>
                      {product.descripcion}
                    </Text>

                    <Text style={[styles.metaText, { marginTop: 4 }]}>
                      <Text style={{ fontWeight: 'bold' }}>Historia: </Text>
                      {product.contexto}
                    </Text>

                    <Text style={[styles.metaText, { marginTop: 4, color: COLORS.secondary, fontWeight: 'bold' }]}>
                      Moneda: {product.moneda || 'ARS'}
                    </Text>

                    {/* Origin Document Base64 Preview */}
                    <Text style={styles.sectionDividerLabel}>Documento de Origen / Certificado</Text>
                    <View style={styles.documentPreviewBox}>
                      {product.documento_origen ? (
                        <View style={styles.docCheckRow}>
                          <Feather name="file-text" size={20} color={COLORS.success} style={{ marginRight: 8 }} />
                          <Text style={styles.docCheckText}>Documento de Origen Adjunto (Certificado)</Text>
                        </View>
                      ) : (
                        <View style={styles.docCheckRow}>
                          <Feather name="alert-circle" size={20} color={COLORS.danger} style={{ marginRight: 8 }} />
                          <Text style={[styles.docCheckText, { color: COLORS.danger }]}>Sin Documento de Origen</Text>
                        </View>
                      )}
                    </View>

                    {/* Form if en_revision */}
                    {estado === 'en_revision' && (
                      <View style={styles.revisorInputs}>
                        <Text style={styles.inputLabel}>Precio Base Propuesto ({product.moneda || 'ARS'}):</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="Ej: 1500"
                          placeholderTextColor={COLORS.lightGray200}
                          value={proposedPrices[product.identificador] || ''}
                          onChangeText={(text) => setProposedPrices(prev => ({ ...prev, [product.identificador]: text.replace(/[^0-9.]/g, '') }))}
                          keyboardType="numeric"
                        />

                        <Text style={styles.inputLabel}>Comisión Propuesta (%):</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="Ej: 10"
                          placeholderTextColor={COLORS.lightGray200}
                          value={proposedCommissions[product.identificador] || ''}
                          onChangeText={(text) => setProposedCommissions(prev => ({ ...prev, [product.identificador]: text.replace(/[^0-9.]/g, '') }))}
                          keyboardType="numeric"
                        />
                      </View>
                    )}

                    {estado === 'propuesta_enviada' && (
                      <View style={{ backgroundColor: 'rgba(10, 92, 255, 0.05)', padding: 12, borderRadius: 10, marginVertical: 8 }}>
                        <Text style={{ color: COLORS.white, fontWeight: 'bold', fontSize: 12, marginBottom: 4 }}>Términos Enviados:</Text>
                        <Text style={{ color: COLORS.lightGray100, fontSize: 12 }}>Base: {product.moneda === 'USD' ? 'u$s ' : '$ '}{Number(product.precio_base_propuesto).toLocaleString()}</Text>
                        <Text style={{ color: COLORS.lightGray100, fontSize: 12 }}>Comisión: {Number(product.comision_propuesta).toLocaleString()}%</Text>
                        <Text style={{ color: COLORS.secondary, fontStyle: 'italic', fontSize: 11, marginTop: 6 }}>Esperando respuesta del cliente...</Text>
                      </View>
                    )}

                    {estado === 'aceptada' && (
                      <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)', padding: 12, borderRadius: 10, marginVertical: 8 }}>
                        <Text style={{ color: '#10B981', fontWeight: 'bold', fontSize: 12, marginBottom: 4 }}>Términos Aceptados por Cliente:</Text>
                        <Text style={{ color: COLORS.lightGray100, fontSize: 12 }}>Base: {product.moneda === 'USD' ? 'u$s ' : '$ '}{Number(product.precio_base_propuesto).toLocaleString()}</Text>
                        <Text style={{ color: COLORS.lightGray100, fontSize: 12 }}>Comisión: {Number(product.comision_propuesta).toLocaleString()}%</Text>
                        <Text style={{ color: '#10B981', fontWeight: 'bold', fontSize: 11, marginTop: 6 }}>Listo para ser incluido en una subasta.</Text>
                      </View>
                    )}

                    {estado === 'rechazada' && (
                      <View style={{ backgroundColor: 'rgba(239, 68, 68, 0.05)', padding: 12, borderRadius: 10, marginVertical: 8 }}>
                        <Text style={{ color: COLORS.danger, fontWeight: 'bold', fontSize: 12, marginBottom: 4 }}>Propuesta Rechazada por Cliente:</Text>
                        <Text style={{ color: COLORS.lightGray100, fontSize: 12 }}>Base Propuesta: {product.moneda === 'USD' ? 'u$s ' : '$ '}{Number(product.precio_base_propuesto).toLocaleString()}</Text>
                        <Text style={{ color: COLORS.lightGray100, fontSize: 12 }}>Motivo Rechazo: {product.motivo_rechazo || 'Desconocido'}</Text>
                      </View>
                    )}

                    {/* Action buttons for product approval */}
                    <View style={styles.actionsRow}>
                      {estado === 'en_revision' ? (
                        <TouchableOpacity 
                          style={[styles.actionBtn, styles.approveBtn]}
                          onPress={() => handleProposeTerms(product.identificador)}
                        >
                          <Feather name="send" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                          <Text style={styles.actionBtnText}>Proponer Términos</Text>
                        </TouchableOpacity>
                      ) : estado === 'aceptada' ? (
                        <TouchableOpacity 
                          style={[styles.actionBtn, styles.approveBtn, { backgroundColor: '#10B981' }]}
                          onPress={() => handleApproveProductPress(product)}
                        >
                          <Feather name="check-circle" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                          <Text style={styles.actionBtnText}>Aprobar y Asignar</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={{ flex: 0.48 }} />
                      )}

                      <TouchableOpacity 
                        style={[styles.actionBtn, styles.rejectBtn]}
                        onPress={() => handleRejectProduct(product.identificador)}
                      >
                        <Feather name="x" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.actionBtnText}>Rechazar / Eliminar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}

        {/* TAB 4: CREAR SUBASTA */}
        {activeSubTab === 'crear_subasta' && (
          <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.sectionTitle}>Crear Nueva Subasta</Text>
            <Text style={styles.sectionSubtitle}>Programa una subasta y asocia artículos aprobados por el cliente</Text>

            <View style={styles.clientRequestCard}>
              <Text style={styles.inputLabel}>Fecha de la Subasta (mínimo +10 días, formato AAAA-MM-DD):</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej: 2026-07-20"
                placeholderTextColor={COLORS.lightGray200}
                value={subastaFecha}
                onChangeText={setSubastaFecha}
              />

              <Text style={styles.inputLabel}>Hora de la Subasta (formato HH:MM:SS):</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej: 15:30:00"
                placeholderTextColor={COLORS.lightGray200}
                value={subastaHora}
                onChangeText={setSubastaHora}
              />

              <Text style={styles.inputLabel}>Ubicación / Lugar de Celebración:</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej: Salón de Eventos Hilton o Subasta Virtual"
                placeholderTextColor={COLORS.lightGray200}
                value={subastaUbicacion}
                onChangeText={setSubastaUbicacion}
              />

              <Text style={styles.inputLabel}>Capacidad de Asistentes:</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej: 150"
                placeholderTextColor={COLORS.lightGray200}
                value={subastaCapacidad}
                onChangeText={setSubastaCapacidad}
                keyboardType="numeric"
              />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 10 }}>
                <View style={{ flex: 0.48 }}>
                  <Text style={styles.inputLabel}>¿Tiene Depósito?</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    {['si', 'no'].map(val => (
                      <TouchableOpacity
                        key={val}
                        style={{
                          flex: 0.48,
                          height: 36,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: subastaDeposito === val ? COLORS.secondary : COLORS.border,
                          backgroundColor: subastaDeposito === val ? 'rgba(255, 140, 0, 0.08)' : COLORS.darkGray600,
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onPress={() => setSubastaDeposito(val)}
                      >
                        <Text style={{ color: subastaDeposito === val ? COLORS.secondary : COLORS.lightGray200, fontWeight: 'bold' }}>
                          {val.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={{ flex: 0.48 }}>
                  <Text style={styles.inputLabel}>¿Seguridad Propia?</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    {['si', 'no'].map(val => (
                      <TouchableOpacity
                        key={val}
                        style={{
                          flex: 0.48,
                          height: 36,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: subastaSeguridad === val ? COLORS.secondary : COLORS.border,
                          backgroundColor: subastaSeguridad === val ? 'rgba(255, 140, 0, 0.08)' : COLORS.darkGray600,
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onPress={() => setSubastaSeguridad(val)}
                      >
                        <Text style={{ color: subastaSeguridad === val ? COLORS.secondary : COLORS.lightGray200, fontWeight: 'bold' }}>
                          {val.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Multi-select Approved Products */}
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>Seleccionar Artículos Aprobados ({selectedProductIds.length} seleccionados):</Text>
              {loadingApproved ? (
                <ActivityIndicator color={COLORS.secondary} style={{ marginVertical: 10 }} />
              ) : approvedProducts.length === 0 ? (
                <Text style={{ fontStyle: 'italic', color: '#8E8E93', fontSize: 12, marginVertical: 10 }}>
                  No hay productos con propuesta aceptada por el cliente listos para subasta en este momento.
                </Text>
              ) : (
                approvedProducts.map(p => {
                  const isSelected = selectedProductIds.includes(p.identificador);
                  return (
                    <TouchableOpacity
                      key={p.identificador}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: COLORS.darkGray600,
                        borderWidth: 1,
                        borderColor: isSelected ? COLORS.secondary : COLORS.border,
                        borderRadius: 12,
                        padding: 12,
                        marginBottom: 10
                      }}
                      onPress={() => {
                        if (isSelected) {
                          setSelectedProductIds(prev => prev.filter(id => id !== p.identificador));
                        } else {
                          setSelectedProductIds(prev => [...prev, p.identificador]);
                        }
                      }}
                    >
                      <View style={{
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        borderWidth: 1.5,
                        borderColor: isSelected ? COLORS.secondary : COLORS.border,
                        backgroundColor: isSelected ? COLORS.secondary : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 10
                      }}>
                        {isSelected && <Feather name="check" size={12} color="#FFFFFF" />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: COLORS.white, fontWeight: 'bold', fontSize: 13 }} numberOfLines={1}>
                          {p.titulo}
                        </Text>
                        <Text style={{ color: COLORS.lightGray200, fontSize: 11 }}>
                          Base: {p.moneda === 'USD' ? 'u$s ' : '$ '}{Number(p.precio_base_propuesto).toLocaleString()} | Com: {Number(p.comision_propuesta).toLocaleString()}%
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  { 
                    backgroundColor: COLORS.primary, 
                    height: 46, 
                    borderRadius: 12, 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    marginTop: 20,
                    opacity: (creatingSubasta || selectedProductIds.length === 0) ? 0.6 : 1
                  }
                ]}
                onPress={handleCreateSubasta}
                disabled={creatingSubasta || selectedProductIds.length === 0}
              >
                {creatingSubasta ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 }}>Crear y Programar Subasta</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* TAB 3: CHATS DE SOPORTE */}
        {activeSubTab === 'chats' && (
          <View style={{ flex: 1 }}>
            {!selectedChatClient ? (
              <FlatList
                data={chatClients}
                keyExtractor={(item) => item.identificador.toString()}
                contentContainerStyle={styles.chatListContainer}
                ListHeaderComponent={() => (
                  <View style={{ paddingBottom: 12 }}>
                    <Text style={styles.sectionTitle}>Chats de Soporte</Text>
                    <Text style={styles.sectionSubtitle}>Selecciona un postulante para iniciar la conversación</Text>
                  </View>
                )}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.chatClientRow}
                    onPress={() => setSelectedChatClient(item)}
                  >
                    <View style={styles.chatClientAvatar}>
                      <Text style={styles.chatAvatarText}>
                        {item.nombre.substring(0, 1).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ marginLeft: 14, flex: 1 }}>
                      <Text style={styles.chatClientName}>{item.nombre}</Text>
                      <Text style={styles.chatClientEmail}>{item.email}</Text>
                    </View>
                    {item.unreadCount > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
                      </View>
                    )}
                    <Feather name="chevron-right" size={18} color={COLORS.lightGray200} />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={() => (
                  <View style={styles.emptyView}>
                    <Feather name="message-square" size={40} color={COLORS.lightGray200} style={{ marginBottom: 12 }} />
                    <Text style={styles.emptyText}>No hay usuarios activos registrados para chatear.</Text>
                  </View>
                )}
              />
            ) : (
              <KeyboardAvoidingView 
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 130 : 90}
              >
                {/* Active Chat Header */}
                <View style={styles.activeChatHeader}>
                  <TouchableOpacity 
                    onPress={() => {
                      setSelectedChatClient(null);
                      setChatMessages([]);
                    }}
                    style={styles.backChatListButton}
                  >
                    <Feather name="chevron-left" size={20} color={COLORS.white} />
                  </TouchableOpacity>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.activeChatClientName}>{selectedChatClient.nombre}</Text>
                    <Text style={styles.activeChatClientEmail}>{selectedChatClient.email}</Text>
                  </View>
                  <TouchableOpacity onPress={fetchChatMessages} style={styles.refreshChatButton}>
                    <Feather name="refresh-cw" size={16} color={COLORS.white} />
                  </TouchableOpacity>
                </View>

                {/* Chat Message Scroll */}
                <ScrollView 
                  ref={chatScrollRef}
                  style={styles.chatMessageScroll}
                  contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
                  showsVerticalScrollIndicator={false}
                >
                  {chatMessages.length === 0 ? (
                    <Text style={styles.emptyChatText}>No hay mensajes en esta conversación. Envía uno para iniciar.</Text>
                  ) : (
                    chatMessages.map((msg, idx) => {
                      const isMe = msg.remitente === userProfile.identificador;
                      return (
                        <View 
                          key={msg.identificador || idx} 
                          style={[styles.messageBubble, isMe ? styles.messageBubbleMe : styles.messageBubbleOther]}
                        >
                          <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextOther]}>
                            {msg.mensaje}
                          </Text>
                          <Text style={[styles.messageTime, isMe ? styles.messageTimeMe : styles.messageTimeOther]}>
                            {new Date(msg.fechacreacion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                      );
                    })
                  )}
                </ScrollView>

                {/* Input Panel */}
                <View style={styles.chatInputPanel}>
                  <TextInput
                    style={styles.chatTextInput}
                    placeholder="Escribe tu mensaje..."
                    placeholderTextColor={COLORS.lightGray200}
                    value={newMessageText}
                    onChangeText={setNewMessageText}
                    multiline
                  />
                  <TouchableOpacity 
                    style={[styles.chatSendButton, !newMessageText.trim() && styles.disabledSendButton]}
                    onPress={handleSendMessage}
                    disabled={!newMessageText.trim() || sendingMessage}
                  >
                    {sendingMessage ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Feather name="send" size={18} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            )}
          </View>
        )}

      </View>

      {/* SUBASTA SELECTION MODAL (TAB 2) */}
      <FlatList
        visible={showSubastaModal}
        data={subastas}
        keyExtractor={(item) => item.identificador.toString()}
        renderItem={() => null} // Modal trick
        style={{ display: 'none' }}
      />
      
      {showSubastaModal && (
        <View style={styles.selectorOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
          >
            <View style={[styles.modalSubastaContent, { width: '90%', maxWidth: 400, maxHeight: '85%' }]}>
              <Text style={styles.modalSubastaTitle}>Aprobar y Registrar Póliza</Text>
              <Text style={styles.modalSubastaSubtitle}>Selecciona la subasta e ingresa los datos del seguro:</Text>

              <ScrollView 
                style={{ marginVertical: 8 }}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
              >
                {/* SUB-SECTION 1: SUBASTA SELECTION */}
                <Text style={[styles.inputLabel, { marginTop: 4, marginBottom: 6, color: COLORS.secondary }]}>
                  1. Seleccionar Subasta (*):
                </Text>
                
                <View style={{ maxHeight: 150, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 6, marginBottom: 12, backgroundColor: COLORS.darkGray600 }}>
                  <ScrollView nestedScrollEnabled={true}>
                    {subastas.map((sub) => {
                      const isSelected = selectedSubastaIdForApproval === sub.identificador;
                      return (
                        <TouchableOpacity
                          key={sub.identificador}
                          style={[
                            styles.subastaOption,
                            { marginBottom: 6 },
                            isSelected && { borderColor: COLORS.secondary, backgroundColor: 'rgba(255, 140, 0, 0.12)' }
                          ]}
                          onPress={() => setSelectedSubastaIdForApproval(sub.identificador)}
                        >
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                            <Text style={styles.subastaOptionCategory}>Categoría: {sub.categoria.toUpperCase()}</Text>
                            <Text style={styles.subastaOptionDate}>{sub.fecha}</Text>
                          </View>
                          <Text style={styles.subastaOptionLocation} numberOfLines={1}>{sub.ubicacion}</Text>
                        </TouchableOpacity>
                      );
                    })}
                    {subastas.length === 0 && (
                      <Text style={styles.emptyText}>No hay subastas catalogadas disponibles.</Text>
                    )}
                  </ScrollView>
                </View>

                {/* SUB-SECTION 2: INSURANCE POLICY */}
                <Text style={[styles.inputLabel, { marginBottom: 6, color: COLORS.secondary }]}>
                  2. Datos de la Póliza:
                </Text>

                <Text style={styles.inputLabel}>Número de Póliza (*):</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej: POL-2026-X"
                  placeholderTextColor={COLORS.lightGray200}
                  value={policyNumber}
                  onChangeText={setPolicyNumber}
                />

                <Text style={styles.inputLabel}>Compañía Aseguradora (*):</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej: Seguros Internacionales"
                  placeholderTextColor={COLORS.lightGray200}
                  value={policyCompany}
                  onChangeText={setPolicyCompany}
                />

                <Text style={styles.inputLabel}>¿Es Póliza Combinada?</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                  {['si', 'no'].map(val => (
                    <TouchableOpacity
                      key={val}
                      style={{
                        flex: 0.48,
                        height: 38,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: policyCombined === val ? COLORS.secondary : COLORS.border,
                        backgroundColor: policyCombined === val ? 'rgba(255, 140, 0, 0.08)' : COLORS.darkGray600,
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onPress={() => setPolicyCombined(val)}
                    >
                      <Text style={{ color: policyCombined === val ? COLORS.secondary : COLORS.lightGray200, fontWeight: 'bold', fontSize: 12 }}>
                        {val === 'si' ? 'SÍ' : 'NO'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Importe Asegurado (*):</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej: 50000"
                  placeholderTextColor={COLORS.lightGray200}
                  value={policyAmount}
                  onChangeText={(text) => setPolicyAmount(text.replace(/[^0-9.]/g, ''))}
                  keyboardType="numeric"
                />
              </ScrollView>

              {/* ACTION BUTTONS */}
              <TouchableOpacity 
                style={[
                  styles.submitButton, 
                  { 
                    backgroundColor: '#10B981', 
                    borderRadius: 12, 
                    height: 44, 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    marginTop: 8,
                    opacity: (!selectedSubastaIdForApproval || !policyNumber.trim() || !policyCompany.trim() || !policyAmount.trim()) ? 0.6 : 1
                  }
                ]}
                onPress={handleConfirmProductApproval}
                disabled={!selectedSubastaIdForApproval || !policyNumber.trim() || !policyCompany.trim() || !policyAmount.trim()}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 }}>Aprobar y Registrar Póliza</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowSubastaModal(false);
                  setSelectedProductForApproval(null);
                  
                  // Reset policy states
                  setPolicyNumber('');
                  setPolicyCompany('Seguros Internacionales S.A.');
                  setPolicyCombined('no');
                  setPolicyAmount('');
                  setSelectedSubastaIdForApproval(null);
                }}
              >
                <Text style={styles.modalCloseButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.darkGray600,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    ...SHADOWS.glow,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 40,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.orangeGlow,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.darkGray500,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    marginHorizontal: 4,
  },
  activeTabButton: {
    backgroundColor: 'rgba(255, 140, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.2)',
  },
  tabText: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeBase,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  activeTabText: {
    color: COLORS.secondary,
  },
  contentBody: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: FONTS.sizeLg,
    fontWeight: 'bold',
  },
  sectionSubtitle: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeSm + 1,
    marginBottom: 16,
  },
  emptyView: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeBase,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  clientRequestCard: {
    backgroundColor: COLORS.darkGray500,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 20,
    ...SHADOWS.default,
  },
  clientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  clientName: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  clientEmail: {
    color: COLORS.lightGray200,
    fontSize: 12,
    marginTop: 2,
  },
  dniBadge: {
    backgroundColor: 'rgba(10, 92, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(10, 92, 255, 0.2)',
  },
  dniBadgeText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  metaText: {
    color: COLORS.lightGray100,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionDividerLabel: {
    color: COLORS.secondary,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  selfieBox: {
    alignItems: 'center',
    marginBottom: 12,
  },
  selfieImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  noPhotoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.darkGray600,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  noPhotoText: {
    color: COLORS.lightGray200,
    fontSize: 10,
    marginTop: 4,
  },
  dniRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dniPhotoWrapper: {
    width: '48%',
    alignItems: 'center',
  },
  dniPhoto: {
    width: '100%',
    height: 90,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    resizeMode: 'cover',
  },
  dniPhotoLabel: {
    color: COLORS.lightGray200,
    fontSize: 10,
    marginTop: 4,
  },
  revisorInputs: {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginVertical: 12,
  },
  inputLabel: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
    marginTop: 8,
  },
  textInput: {
    backgroundColor: COLORS.darkGray600,
    color: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    height: 38,
    fontSize: 13,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  actionBtn: {
    flex: 0.48,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.glow,
  },
  approveBtn: {
    backgroundColor: COLORS.success,
  },
  rejectBtn: {
    backgroundColor: COLORS.danger,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  documentPreviewBox: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.darkGray600,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  docCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  docCheckText: {
    color: COLORS.success,
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Selector Overlay for product approval
  selectorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 10, 15, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalSubastaContent: {
    backgroundColor: COLORS.darkGray500,
    borderRadius: 24,
    padding: 24,
    width: '85%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.default,
  },
  modalSubastaTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubastaSubtitle: {
    color: COLORS.lightGray200,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
  },
  subastaOption: {
    backgroundColor: COLORS.darkGray600,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  subastaOptionCategory: {
    color: COLORS.secondary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  subastaOptionDate: {
    color: COLORS.lightGray200,
    fontSize: 11,
  },
  subastaOptionLocation: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  modalCloseButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 12,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  modalCloseButtonText: {
    color: COLORS.danger,
    fontWeight: 'bold',
    fontSize: 14,
  },
  // Support Chat List Styles
  chatListContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  chatClientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkGray500,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.default,
  },
  chatClientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  chatClientName: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  chatClientEmail: {
    color: COLORS.lightGray200,
    fontSize: 11,
    marginTop: 2,
  },
  // Active Chat Screen Styles
  activeChatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkGray500,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backChatListButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeChatClientName: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  activeChatClientEmail: {
    color: COLORS.lightGray200,
    fontSize: 11,
  },
  refreshChatButton: {
    padding: 8,
  },
  chatMessageScroll: {
    flex: 1,
    backgroundColor: COLORS.darkGray600,
  },
  emptyChatText: {
    color: COLORS.lightGray200,
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 40,
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  messageBubbleMe: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 2,
  },
  messageBubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.darkGray500,
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 18,
  },
  messageTextMe: {
    color: '#FFFFFF',
  },
  messageTextOther: {
    color: COLORS.white,
  },
  messageTime: {
    fontSize: 9,
    marginTop: 4,
    textAlign: 'right',
  },
  messageTimeMe: {
    color: 'rgba(255, 255, 255, 0.65)',
  },
  messageTimeOther: {
    color: COLORS.lightGray200,
  },
  chatInputPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkGray500,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: 12,
  },
  chatTextInput: {
    flex: 1,
    backgroundColor: COLORS.darkGray600,
    color: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    fontSize: 14,
    maxHeight: 100,
  },
  chatSendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    ...SHADOWS.orangeGlow,
  },
  disabledSendButton: {
    backgroundColor: COLORS.lightGray200,
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  unreadBadge: {
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginRight: 10,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
