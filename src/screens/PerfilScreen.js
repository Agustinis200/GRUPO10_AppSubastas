import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import AuctionCard from '../components/AuctionCard';
import { COLORS, FONTS, SHADOWS } from '../styles/theme';
import { apiService } from '../api/apiService';

export default function PerfilScreen({
  userProfile,
  setActiveTab,
  stats,
  paymentMethods,
  auctions,
  handleBidPress,
  pendingClients,
  revisorLoading,
  handleApproveClient,
  handleRejectClient,
  handleDeletePaymentMethod,
  handleLogout,
  fetchUserData,
  userFines = [],
  handlePayFine,
  activePaymentMethod,
  handleSetDefaultPaymentMethod,
  wonAuctions = []
}) {
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Payment method modal state
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [newCardNumber, setNewCardNumber] = useState('');
  const [newCardProvider, setNewCardProvider] = useState('Visa');
  const [newCardType, setNewCardType] = useState('tarjeta');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [newChequeAmount, setNewChequeAmount] = useState('');
  const [newMoneda, setNewMoneda] = useState('ARS');

  // Change password modal state
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  // Revisor inputs state (local to screen)
  const [revisorPasswords, setRevisorPasswords] = useState({});
  const [revisorReasons, setRevisorReasons] = useState({});

  const handleAddPaymentMethod = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    
    if (!newCardNumber) {
      setErrorMessage(
        newCardType === 'tarjeta' 
          ? 'Por favor ingresa el número de la tarjeta.' 
          : newCardType === 'cuenta' 
            ? 'Por favor ingresa el CBU.' 
            : 'Por favor ingresa el número de cheque.'
      );
      return;
    }
    
    const trimmed = newCardNumber.trim().replace(/[^0-9]/g, '');
    const numericRegex = /^[0-9]+$/;
    if (!numericRegex.test(trimmed)) {
      setErrorMessage('El dato ingresado debe contener únicamente números.');
      return;
    }

    let payload = {};

    if (newCardType === 'tarjeta') {
      if (trimmed.length < 15 || trimmed.length > 16) {
        setErrorMessage('El número de tarjeta debe tener 15 o 16 dígitos.');
        return;
      }

      setUploadLoading(true);
      try {
        const validation = await apiService.validateCardWithMercadoPago(trimmed);
        if (validation.brand === 'Amex') {
          throw new Error('Amex ya no es aceptado como medio de pago. Use Visa o Mastercard.');
        }
        
        const mascara = `**** **** **** ${trimmed.slice(-4)}`;
        payload = {
          tipo: 'tarjeta',
          proveedor: validation.brand || newCardProvider,
          mascara,
          monto: 0,
          moneda: newMoneda
        };
      } catch (err) {
        setErrorMessage(err.message || 'La tarjeta fue rechazada por Mercado Pago.');
        setUploadLoading(false);
        return;
      }
    } else if (newCardType === 'cuenta') {
      if (trimmed.length !== 22) {
        setErrorMessage('El CBU debe tener exactamente 22 dígitos.');
        return;
      }
      if (!newBankName.trim()) {
        setErrorMessage('Por favor ingresa el nombre del Banco Emisor.');
        return;
      }
      const mascara = `CBU **** ${trimmed.slice(-4)}`;
      payload = {
        tipo: 'cuenta',
        proveedor: newBankName.trim(),
        mascara,
        monto: 0,
        moneda: newMoneda
      };
    } else if (newCardType === 'cheque') {
      if (!newBankName.trim()) {
        setErrorMessage('Por favor ingresa el nombre del Banco Emisor del cheque.');
        return;
      }
      if (!newChequeAmount.trim() || isNaN(Number(newChequeAmount)) || Number(newChequeAmount) <= 0) {
        setErrorMessage('Por favor ingresa un monto válido y mayor a cero para el cheque.');
        return;
      }
      const mascara = `CHQ **** ${trimmed.slice(-4)}`;
      payload = {
        tipo: 'cheque',
        proveedor: newBankName.trim(),
        mascara,
        monto: parseFloat(newChequeAmount),
        moneda: newMoneda
      };
    }

    try {
      setUploadLoading(true);
      await apiService.addPaymentMethod(userProfile.identificador, payload);
      setSuccessMessage('¡Medio de pago registrado con éxito!');
      setNewCardNumber('');
      setNewBankName('');
      setNewChequeAmount('');
      setShowAddPaymentModal(false);
      fetchUserData(); 
    } catch (err) {
      setErrorMessage(err.message || 'Error al guardar medio de pago.');
    } finally {
      setUploadLoading(false);
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

  const myActiveBids = auctions.filter(a => 
    a.highest_bidder === userProfile?.nombre && 
    a.subastado !== 'si' && 
    a.estado !== 'cerrada'
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Header (Blue theme) */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <TouchableOpacity 
            onPress={() => setActiveTab('home')} 
            style={styles.backButton}
          >
            <Feather name="arrow-left" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            Mi Perfil
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Profile Avatar Card */}
        <View style={styles.profileAvatarCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {userProfile?.foto ? (
              <View style={styles.avatarImageWrapper}>
                <Image 
                  source={{ uri: userProfile.foto }} 
                  style={styles.avatarImage} 
                />
              </View>
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>
                  {(() => {
                    if (!userProfile?.nombre) return 'CM';
                    const parts = userProfile.nombre.trim().split(' ');
                    if (parts.length >= 2) {
                      return (parts[0][0] + parts[1][0]).toUpperCase();
                    }
                    return parts[0][0].toUpperCase();
                  })()}
                </Text>
              </View>
            )}

            <View style={{ marginLeft: 16, flex: 1 }}>
              <Text style={styles.profileNameText}>
                {userProfile?.nombre || 'Carlos Martinez'}
              </Text>
              <Text style={styles.profileEmailText}>
                {userProfile?.email || 'carlosmartinez@email.com'}
              </Text>
              <View style={styles.profileTierBadge}>
                <Text style={styles.profileTierBadgeText}>
                  {userProfile?.categoria === 'oro' ? 'Miembro Oro' : userProfile?.categoria === 'platino' ? 'Miembro Platino' : userProfile?.categoria === 'plata' ? 'Miembro Plata' : 'Miembro Común'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.profileStatsRow}>
            <View style={styles.profileStatsItem}>
              <Feather name="key" size={18} color="#FF8C00" style={{ marginRight: 10 }} />
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.statsValue}>{stats.offers || 0}</Text>
                <Text style={styles.statsLabel}>Activas</Text>
              </View>
            </View>
            <View style={styles.profileStatsItem}>
              <Feather name="trending-up" size={18} color="#10B981" style={{ marginRight: 10 }} />
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.statsValue}>{stats.won || 0}</Text>
                <Text style={styles.statsLabel}>Ganadas</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Medios de Pago section */}
        <View style={{ marginBottom: 24 }}>
          <Text style={styles.sectionTitle}>Medios de Pago</Text>
          <Text style={styles.sectionSubtitle}>
            {paymentMethods.length} {paymentMethods.length === 1 ? 'método activo' : 'métodos activos'}
          </Text>

          {paymentMethods.length === 0 ? (
            <Text style={styles.emptyCardListText}>No tienes medios de pago registrados.</Text>
          ) : (
            paymentMethods.map((pm) => {
              let cardIcon = 'credit-card';
              let cardIconBg = '#0A5CFF'; 
              let cardTitle = pm.proveedor || 'Visa';
              let cardSubtitle = pm.mascara || '**** **** **** 4242';
              let cardExpiry = pm.tipo === 'tarjeta' ? 'Vence el 12/2028' : '';
              const isCheque = pm.tipo === 'cheque' || pm.proveedor.toLowerCase().includes('cheque');

              if (pm.tipo === 'cuenta' || pm.proveedor.toLowerCase().includes('santander')) {
                cardIcon = 'home';
                cardIconBg = '#EF4444'; 
              } else if (isCheque) {
                cardIcon = 'file-text';
                cardIconBg = '#10B981'; 
              }

              const isPending = pm.estado === 'pendiente';
              return (
                <View key={pm.identificador.toString()} style={[styles.paymentCard, isPending && { opacity: 0.75 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <View style={[styles.paymentMethodIconBox, { backgroundColor: isPending ? COLORS.lightGray200 : cardIconBg }]}>
                        <Feather name={isPending ? 'clock' : cardIcon} size={20} color="#FFFFFF" />
                      </View>
                      <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text style={styles.paymentCardTitle}>{cardTitle} ({pm.moneda || 'ARS'})</Text>
                        <Text style={styles.paymentCardSubtitle}>{cardSubtitle}</Text>
                        {cardExpiry ? <Text style={styles.paymentCardExpiry}>{cardExpiry}</Text> : null}
                      </View>
                    </View>
                    
                    <View style={{ alignItems: 'flex-end', marginLeft: 10 }}>
                      {isPending ? (
                        <View style={[styles.verifiedBadge, { backgroundColor: 'rgba(255, 140, 0, 0.15)' }]}>
                          <Feather name="clock" size={10} color={COLORS.secondary} style={{ marginRight: 4 }} />
                          <Text style={[styles.verifiedBadgeText, { color: COLORS.secondary }]}>En Proceso</Text>
                        </View>
                      ) : (
                        <View style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
                          <View style={[styles.verifiedBadge, { marginBottom: 4 }]}>
                            <Feather name="check-circle" size={10} color="#10B981" style={{ marginRight: 4 }} />
                            <Text style={styles.verifiedBadgeText}>Verificado</Text>
                          </View>
                          
                          {activePaymentMethod && activePaymentMethod.identificador === pm.identificador ? (
                            <View style={[styles.verifiedBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: '#10B981', borderWidth: 0.5, marginBottom: 0, marginTop: 4 }]}>
                              <Feather name="star" size={10} color="#10B981" style={{ marginRight: 4 }} />
                              <Text style={[styles.verifiedBadgeText, { color: '#10B981' }]}>Predeterminado</Text>
                            </View>
                          ) : (
                            <TouchableOpacity 
                              onPress={() => handleSetDefaultPaymentMethod(pm.identificador)}
                              style={[styles.verifiedBadge, { backgroundColor: '#F2F2F7', borderColor: '#C7C7CC', borderWidth: 0.5, marginBottom: 0, marginTop: 4 }]}
                            >
                              <Feather name="star" size={10} color="#8E8E93" style={{ marginRight: 4 }} />
                              <Text style={[styles.verifiedBadgeText, { color: '#8E8E93' }]}>Usar Predeterminado</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                      
                      <TouchableOpacity 
                        onPress={() => handleDeletePaymentMethod(pm.identificador)}
                        style={{ padding: 4, marginTop: 6 }}
                      >
                        <Feather name="trash-2" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
 
                  <View style={styles.secureBadgeRow}>
                    <Feather name="shield" size={13} color={isPending ? COLORS.secondary : "#0A5CFF"} style={{ marginRight: 6 }} />
                    <Text style={styles.secureBadgeText}>
                      {isPending ? 'Pendiente de aprobación técnica' : 'Método verificado y seguro'}
                    </Text>
                  </View>
 
                  {isCheque ? (
                    <View style={styles.chequeLimitsBox}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={styles.chequeLimitLabel}>Monto Certificado</Text>
                        <Text style={[styles.chequeLimitValue, { color: COLORS.success }]}>
                          {pm.moneda === 'USD' ? 'u$s ' : '$ '}{Number(pm.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.chequeLimitsBox}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={styles.chequeLimitLabel}>Límite Preaprobado</Text>
                        <Text style={[styles.chequeLimitValue, { color: COLORS.success }]}>
                          {pm.moneda === 'USD' ? 'u$s ' : '$ '}{Number(pm.monto || (pm.moneda === 'USD' ? 50000 : 75000000)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}

          <TouchableOpacity 
            style={styles.addPaymentButton}
            onPress={() => {
              setErrorMessage('');
              setSuccessMessage('');
              setShowAddPaymentModal(true);
            }}
          >
            <Feather name="plus" size={20} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        {/* Fines (Multas) section */}
        <View style={{ marginBottom: 24 }}>
          <Text style={styles.sectionTitle}>Mis Multas</Text>
          <Text style={styles.sectionSubtitle}>
            Tienes {userFines.filter(f => f.estado === 'pendiente').length} multas pendientes
          </Text>

          {userFines.length === 0 ? (
            <Text style={styles.emptyCardListText}>No registras multas asociadas a tu cuenta.</Text>
          ) : (
            userFines.map((fine) => {
              const isPending = fine.estado === 'pendiente';
              return (
                <View key={fine.identificador.toString()} style={[styles.paymentCard, { borderColor: isPending ? COLORS.danger || '#EF4444' : '#E5E5EA' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <View style={[styles.paymentMethodIconBox, { backgroundColor: isPending ? COLORS.danger || '#EF4444' : '#10B981' }]}>
                        <Feather name="alert-triangle" size={20} color="#FFFFFF" />
                      </View>
                      <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text style={styles.paymentCardTitle}>{fine.descripcion}</Text>
                        <Text style={styles.paymentCardSubtitle}>
                          Fecha: {new Date(fine.fechacreacion).toLocaleDateString('es-AR')}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={{ alignItems: 'flex-end', marginLeft: 10 }}>
                      <View style={[styles.verifiedBadge, { backgroundColor: isPending ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)' }]}>
                        <Text style={[styles.verifiedBadgeText, { color: isPending ? COLORS.danger || '#EF4444' : '#10B981' }]}>
                          {isPending ? 'Pendiente' : 'Pagada'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: '#E5E5EA' }}>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: isPending ? COLORS.danger || '#EF4444' : '#1C1C1E' }}>
                      Importe: ${Number(fine.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </Text>
                    {isPending && (
                      <TouchableOpacity 
                        style={{ backgroundColor: COLORS.primary || '#0A5CFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                        onPress={() => {
                          if (handlePayFine) {
                            handlePayFine(fine.identificador, fine.monto);
                          }
                        }}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' }}>Pagar Multa</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Mis Pujas section */}
        <View style={{ marginBottom: 24 }}>
          <Text style={styles.sectionTitle}>Mis Pujas</Text>
          <Text style={styles.sectionSubtitle}>
            {myActiveBids.length} {myActiveBids.length === 1 ? 'puja activa' : 'pujas activas'}
          </Text>
          
          {myActiveBids.length === 0 ? (
            <Text style={styles.emptyCardListText}>No tienes pujas activas en este momento.</Text>
          ) : (
            myActiveBids.map((item) => (
              <AuctionCard key={item.identificador.toString()} auction={item} onBidPress={handleBidPress} />
            ))
          )}
        </View>

        {/* Mis Artículos Ganados section */}
        <View style={{ marginBottom: 24 }}>
          <Text style={styles.sectionTitle}>Mis Artículos Ganados</Text>
          <Text style={styles.sectionSubtitle}>
            {wonAuctions.length} {wonAuctions.length === 1 ? 'artículo ganado' : 'artículos ganados'}
          </Text>
          
          {wonAuctions.length === 0 ? (
            <Text style={styles.emptyCardListText}>Aún no has ganado ningún artículo en subastas.</Text>
          ) : (
            wonAuctions.map((item) => (
              <AuctionCard key={item.identificador.toString()} auction={item} onBidPress={handleBidPress} />
            ))
          )}
        </View>

        {/* Change password control */}
        <TouchableOpacity 
          style={styles.changePasswordButton}
          onPress={() => {
            setErrorMessage('');
            setSuccessMessage('');
            setShowChangePasswordModal(true);
          }}
        >
          <Text style={styles.changePasswordButtonText}>Cambiar Contraseña</Text>
        </TouchableOpacity>

        {/* Support Chat Button */}
        {userProfile?.cargo !== 'Revisor Técnico' && (
          <TouchableOpacity 
            style={[styles.revisorPanelButton, { backgroundColor: '#FF8C00', marginBottom: 16 }]}
            onPress={() => setActiveTab('support_chat')}
          >
            <Feather name="message-square" size={18} color={COLORS.textWhite} style={{ marginRight: 8 }} />
            <Text style={styles.revisorPanelButtonText}>Soporte Técnico</Text>
          </TouchableOpacity>
        )}

        {/* Logout button */}
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Feather name="log-out" size={18} color="#3A3A3C" style={{ marginRight: 8 }} />
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add Payment Method Modal */}
      <Modal
        visible={showAddPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddPaymentModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 64}
          style={styles.selectorOverlay}
        >
          <View style={styles.paymentModalContent}>
            <View style={styles.paymentModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather name="credit-card" size={20} color={COLORS.white} style={{ marginRight: 8 }} />
                <Text style={styles.paymentModalTitle}>Medio de Pago</Text>
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

            <Text style={styles.inputLabel}>Tipo</Text>
            <View style={styles.providerRow}>
              {[
                { key: 'tarjeta', label: 'Tarjeta' },
                { key: 'cuenta', label: 'CBU' },
                { key: 'cheque', label: 'Cheque' }
              ].map((t) => {
                const isSelected = newCardType === t.key;
                return (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.providerOption, { flex: 0.31 }, isSelected && styles.providerOptionSelected]}
                    onPress={() => {
                      setNewCardType(t.key);
                      setErrorMessage('');
                    }}
                  >
                    <Text style={[styles.providerOptionText, isSelected && styles.providerOptionTextSelected]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.inputLabel}>Moneda</Text>
            <View style={styles.providerRow}>
              {[
                { key: 'ARS', label: 'ARS (Pesos)' },
                { key: 'USD', label: 'USD (Dólares)' }
              ].map((m) => {
                const isSelected = newMoneda === m.key;
                return (
                  <TouchableOpacity
                    key={m.key}
                    style={[styles.providerOption, { flex: 0.48 }, isSelected && styles.providerOptionSelected]}
                    onPress={() => setNewMoneda(m.key)}
                  >
                    <Text style={[styles.providerOptionText, isSelected && styles.providerOptionTextSelected]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {newCardType === 'tarjeta' && (
              <>
                <Text style={styles.inputLabel}>Proveedor de Tarjeta</Text>
                <View style={styles.providerRow}>
                  {['Visa', 'Mastercard'].map((prov) => {
                    const isSelected = newCardProvider === prov;
                    return (
                      <TouchableOpacity
                        key={prov}
                        style={[styles.providerOption, { flex: 0.48 }, isSelected && styles.providerOptionSelected]}
                        onPress={() => setNewCardProvider(prov)}
                      >
                        <Text style={[styles.providerOptionText, isSelected && styles.providerOptionTextSelected]}>
                          {prov}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {newCardType !== 'tarjeta' && (
              <>
                <Text style={styles.inputLabel}>Banco Emisor</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Banco Santander"
                  placeholderTextColor={COLORS.lightGray200}
                  value={newBankName}
                  onChangeText={setNewBankName}
                />
              </>
            )}

            {newCardType === 'cheque' && (
              <>
                <Text style={styles.inputLabel}>Monto del Cheque ({newMoneda === 'USD' ? 'u$s' : '$'})</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: 150000"
                  placeholderTextColor={COLORS.lightGray200}
                  value={newChequeAmount}
                  onChangeText={(text) => setNewChequeAmount(text.replace(/[^0-9.]/g, ''))}
                  keyboardType="numeric"
                />
              </>
            )}

            <Text style={styles.inputLabel}>
              {newCardType === 'tarjeta' 
                ? 'Número de Tarjeta (15 o 16 dig.)' 
                : newCardType === 'cuenta' 
                  ? 'CBU de Cuenta (22 dig.)' 
                  : 'Número de Cheque'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={newCardType === 'tarjeta' ? '4517849210325541' : newCardType === 'cuenta' ? '0070089230009102938472' : 'Ej: 99841203'}
              placeholderTextColor={COLORS.lightGray200}
              value={newCardNumber}
              onChangeText={(text) => setNewCardNumber(text.replace(/[^0-9]/g, ''))}
              keyboardType="numeric"
              maxLength={newCardType === 'tarjeta' ? 16 : newCardType === 'cuenta' ? 22 : 25}
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
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 64}
          style={styles.selectorOverlay}
        >
          <View style={styles.paymentModalContent}>
            <View style={styles.paymentModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather name="lock" size={20} color={COLORS.white} style={{ marginRight: 8 }} />
                <Text style={styles.paymentModalTitle}>Cambiar Contraseña</Text>
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
                <Text style={styles.submitButtonText}>Confirmar</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#0A5CFF',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
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
    backgroundColor: '#FF8C00',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  profileAvatarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginBottom: 24,
  },
  avatarImageWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  avatarImage: {
    width: 64, 
    height: 64, 
    borderRadius: 32, 
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    resizeMode: 'cover',
  },
  avatarPlaceholder: {
    width: 64, 
    height: 64, 
    borderRadius: 32, 
    backgroundColor: '#FF8C00', 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  avatarPlaceholderText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  profileNameText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  profileEmailText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  profileTierBadge: {
    backgroundColor: '#E2F900', 
    paddingHorizontal: 12, 
    paddingVertical: 4, 
    borderRadius: 12, 
    alignSelf: 'flex-start', 
    marginTop: 6,
  },
  profileTierBadgeText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '800',
  },
  profileStatsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    marginTop: 16,
    paddingTop: 16,
  },
  profileStatsItem: {
    flex: 1,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#F2F2F7',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  statsValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  statsLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 16,
  },
  emptyCardListText: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeSm,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 12,
  },
  paymentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  paymentMethodIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  paymentCardSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3A3A3C',
    marginTop: 2,
  },
  paymentCardExpiry: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1F2D9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
  secureBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    paddingTop: 10,
    marginTop: 4,
  },
  secureBadgeText: {
    fontSize: 11,
    color: '#636366',
    fontWeight: '500',
  },
  chequeLimitsBox: {
    backgroundColor: '#D1F2D9',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  chequeLimitLabel: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },
  chequeLimitValue: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '700',
  },
  addPaymentButton: {
    backgroundColor: '#F2F2F7',
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  changePasswordButton: {
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  changePasswordButtonText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  logoutButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    flexDirection: 'row',
  },
  logoutButtonText: {
    color: '#3A3A3C',
    fontWeight: '700',
    fontSize: 14,
  },
  revisorCard: {
    backgroundColor: COLORS.darkGray500,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    borderColor: COLORS.secondary,
    marginBottom: 24,
    ...SHADOWS.default,
  },
  revisorTitle: {
    color: COLORS.secondary,
    fontSize: FONTS.sizeSm,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  revisorSubtitle: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeSm,
    marginBottom: 16,
    marginTop: -8,
  },
  pendingClientCard: {
    backgroundColor: COLORS.darkGray600,
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
  // Modal styles
  selectorOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 15, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
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
  inputLabel: {
    color: COLORS.white,
    fontSize: FONTS.sizeMd,
    fontWeight: FONTS.weightMedium,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  providerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  providerOption: {
    flex: 0.3,
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
  revisorPanelButton: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.orangeGlow,
  },
  revisorPanelButtonText: {
    color: COLORS.textWhite,
    fontWeight: '700',
    fontSize: 14,
  }
});
