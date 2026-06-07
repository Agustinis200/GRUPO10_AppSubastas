import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { supabaseService } from '../api/supabaseService';
import { COLORS, FONTS, SHADOWS } from '../styles/theme';

export default function AuctionDetailModal({ visible, auction, onClose, onBidSuccess }) {
  const [bidAmount, setBidAmount] = useState('');
  const [bidHistory, setBidHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Rules display helper
  const [minAllowed, setMinAllowed] = useState(0);
  const [maxAllowed, setMaxAllowed] = useState(0);

  useEffect(() => {
    if (visible && auction) {
      fetchHistory();
      
      const currentPrice = auction.precio_actual;
      let calculatedMin = currentPrice + 1;
      
      if (['comun', 'especial', 'plata'].includes(auction.categoria)) {
        const minInc = currentPrice * 0.01;
        const maxInc = currentPrice * 0.20;
        setMinAllowed(currentPrice + minInc);
        setMaxAllowed(currentPrice + maxInc);
        // Default to min allowed
        calculatedMin = Math.ceil(currentPrice + minInc);
      } else {
        // Gold / Platinum have no limits, default + 50
        setMinAllowed(currentPrice + 1);
        setMaxAllowed(null);
        calculatedMin = currentPrice + 50;
      }

      setBidAmount(calculatedMin.toString());
      setErrorMessage('');
      setSuccessMessage('');
    }
  }, [visible, auction]);

  const fetchHistory = async () => {
    if (!auction) return;
    setLoadingHistory(true);
    const { data } = await supabaseService.getBidHistory(auction.identificador);
    setBidHistory(data || []);
    setLoadingHistory(false);
  };

  const handlePlaceBid = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    
    const amount = parseFloat(bidAmount);
    if (isNaN(amount)) {
      setErrorMessage('Por favor ingresa un monto válido.');
      return;
    }

    if (amount <= auction.precio_actual) {
      setErrorMessage(`Tu oferta debe superar el precio actual de $${auction.precio_actual}`);
      return;
    }

    // Client-side rule verification mirroring API spec
    if (['comun', 'especial', 'plata'].includes(auction.categoria)) {
      if (amount < minAllowed) {
        setErrorMessage(`Regla de negocio: la oferta mínima debe ser $${Math.round(minAllowed)} (+1% del base)`);
        return;
      }
      if (maxAllowed && amount > maxAllowed) {
        setErrorMessage(`Regla de negocio: la oferta máxima no puede superar $${Math.round(maxAllowed)} (+20% del base)`);
        return;
      }
    }

    setSubmitting(true);
    const result = await supabaseService.placeBid(auction.identificador, amount);
    setSubmitting(false);

    if (result.error) {
      setErrorMessage(result.error);
    } else {
      setSuccessMessage('¡Puja registrada correctamente!');
      fetchHistory();
      if (onBidSuccess) {
        onBidSuccess(result.auction);
      }
      setTimeout(() => {
        setSuccessMessage('');
      }, 2000);
    }
  };

  const adjustBid = (increment) => {
    const current = parseFloat(bidAmount) || auction.precio_actual;
    setBidAmount(Math.round(current + increment).toString());
  };

  if (!auction) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title} numberOfLines={1}>{auction.producto.titulo}</Text>
              <Text style={styles.subtitle}>Subasta por {auction.producto.seller_name || 'Vendedor'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Description */}
            <Text style={styles.sectionTitle}>Detalles del Producto</Text>
            <Text style={styles.description}>{auction.producto.descripcion}</Text>

            {/* History Details */}
            {auction.producto.historia && (
              <View style={styles.historyDetailBox}>
                <Text style={styles.historyDetailTitle}>Procedencia e Historia</Text>
                <View style={styles.historyDetailRow}>
                  <Text style={styles.historyDetailLabel}>Artista/Origen:</Text>
                  <Text style={styles.historyDetailValue}>{auction.producto.historia.artista}</Text>
                </View>
                <View style={styles.historyDetailRow}>
                  <Text style={styles.historyDetailLabel}>Año:</Text>
                  <Text style={styles.historyDetailValue}>{auction.producto.historia.anio}</Text>
                </View>
                <View style={styles.historyDetailRow}>
                  <Text style={styles.historyDetailLabel}>Contexto:</Text>
                  <Text style={styles.historyDetailValue}>{auction.producto.historia.contexto}</Text>
                </View>
              </View>
            )}

            {/* Cobertura y Seguro policy display */}
            <View style={styles.historyDetailBox}>
              <Text style={styles.historyDetailTitle}>🛡️ Cobertura y Seguro</Text>
              {auction.producto.poliza ? (
                <View>
                  <View style={styles.historyDetailRow}>
                    <Text style={styles.historyDetailLabel}>Nº Póliza:</Text>
                    <Text style={styles.historyDetailValue}>{auction.producto.poliza.nroPoliza}</Text>
                  </View>
                  <View style={styles.historyDetailRow}>
                    <Text style={styles.historyDetailLabel}>Compañía:</Text>
                    <Text style={styles.historyDetailValue}>{auction.producto.poliza.compania}</Text>
                  </View>
                  <View style={styles.historyDetailRow}>
                    <Text style={styles.historyDetailLabel}>Valor Asegurado:</Text>
                    <Text style={[styles.historyDetailValue, { color: COLORS.success, fontWeight: 'bold' }]}>
                      ${auction.producto.poliza.importe.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.historyDetailRow}>
                    <Text style={styles.historyDetailLabel}>Combinada:</Text>
                    <Text style={styles.historyDetailValue}>
                      {auction.producto.poliza.polizaCombinada === 'si' ? 'Sí (Cobertura Total)' : 'No'}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={{ color: COLORS.lightGray200, fontStyle: 'italic', fontSize: FONTS.sizeBase }}>
                  Sin póliza de seguro asignada a este artículo.
                </Text>
              )}
            </View>

            {/* Current Price State */}
            <View style={styles.priceRow}>
              <View style={styles.priceBox}>
                <Text style={styles.priceLabel}>Precio Actual</Text>
                <Text style={styles.priceValue}>${auction.precio_actual.toLocaleString()}</Text>
              </View>
              <View style={styles.priceBox}>
                <Text style={styles.priceLabel}>Líder Actual</Text>
                <Text style={styles.bidderValue}>{auction.highest_bidder || 'Nadie'}</Text>
              </View>
            </View>

            {/* Bidding Bounds Notification */}
            {['comun', 'especial', 'plata'].includes(auction.categoria) && (
              <View style={styles.boundsBox}>
                <Text style={styles.boundsTitle}>Reglas de incremento de puja (Categoría {auction.categoria}):</Text>
                <Text style={styles.boundsText}>• Puja Mínima: +1% (${Math.round(minAllowed - auction.precio_actual)}) ➜ total: ${Math.round(minAllowed)}</Text>
                <Text style={styles.boundsText}>• Puja Máxima: +20% (${Math.round(maxAllowed - auction.precio_actual)}) ➜ total: ${Math.round(maxAllowed)}</Text>
              </View>
            )}

            {/* Bid History */}
            <Text style={styles.sectionTitle}>Historial de Pujas</Text>
            {loadingHistory ? (
              <ActivityIndicator size="small" color={COLORS.primary} style={styles.loader} />
            ) : bidHistory.length === 0 ? (
              <Text style={styles.emptyHistory}>No hay pujas registradas. ¡Sé el primero!</Text>
            ) : (
              <View style={styles.historyList}>
                {bidHistory.map((bid, index) => (
                  <View key={bid.identificador || index} style={styles.historyItem}>
                    <View style={styles.historyLeft}>
                      <View style={[styles.avatarIcon, index === 0 && styles.activeAvatar]}>
                        <Text style={styles.avatarText}>
                          {(bid.bidder || 'U').substring(0, 1).toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.bidderName}>
                          {bid.bidder} {index === 0 && <Text style={styles.leaderBadge}>Líder</Text>}
                        </Text>
                        <Text style={styles.bidTime}>
                          {new Date(bid.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.bidHistoryAmount, index === 0 && styles.activeBidAmount]}>
                      ${bid.importe.toLocaleString()}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Place Bid Section */}
          <View style={styles.bidPanel}>
            <Text style={styles.panelTitle}>Realizar una Puja</Text>
            
            {/* Quick actions */}
            <View style={styles.quickActions}>
              {[50, 100, 500].map((inc) => (
                <TouchableOpacity 
                  key={inc} 
                  style={styles.quickButton} 
                  onPress={() => adjustBid(inc)}
                >
                  <Text style={styles.quickButtonText}>+${inc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Input field */}
            <View style={styles.inputContainer}>
              <Text style={styles.currencyPrefix}>$</Text>
              <TextInput
                style={styles.bidInput}
                keyboardType="numeric"
                value={bidAmount}
                onChangeText={setBidAmount}
                placeholder="Importe a ofertar"
                placeholderTextColor={COLORS.textDisabled}
              />
            </View>

            {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}
            {successMessage ? <Text style={styles.successMessage}>{successMessage}</Text> : null}

            {/* Submit */}
            <TouchableOpacity 
              style={[styles.submitButton, submitting && styles.disabledSubmitButton]} 
              onPress={handlePlaceBid}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={COLORS.textWhite} />
              ) : (
                <Text style={styles.submitButtonText}>Confirmar Puja</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.panelBackground || '#151521',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    height: '85%',
    borderWidth: 1,
    borderColor: COLORS.border,
    display: 'flex',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    color: COLORS.white,
    fontSize: FONTS.sizeXl2,
    fontWeight: FONTS.weightExtraBold,
    maxWidth: 260,
  },
  subtitle: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeMd,
    marginTop: 2,
  },
  closeButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeLg,
    fontWeight: 'bold',
  },
  scrollBody: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: FONTS.sizeLg,
    fontWeight: FONTS.weightBold,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  description: {
    color: COLORS.lightGray100,
    fontSize: FONTS.sizeBase,
    lineHeight: 20,
    marginBottom: 20,
  },
  historyDetailBox: {
    backgroundColor: COLORS.borderMuted,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyDetailTitle: {
    color: COLORS.white,
    fontWeight: FONTS.weightBold,
    fontSize: FONTS.sizeBase,
    marginBottom: 8,
  },
  historyDetailRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  historyDetailLabel: {
    color: COLORS.lightGray200,
    width: 110,
    fontWeight: FONTS.weightMedium,
  },
  historyDetailValue: {
    color: COLORS.white,
    flex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.borderMuted,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  priceBox: {
    flex: 1,
  },
  priceLabel: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeMd,
    marginBottom: 4,
    fontWeight: FONTS.weightMedium,
  },
  priceValue: {
    color: COLORS.secondary, // Naranja
    fontSize: FONTS.sizeXl2,
    fontWeight: FONTS.weightExtraBold,
  },
  bidderValue: {
    color: COLORS.white,
    fontSize: FONTS.sizeLg,
    fontWeight: FONTS.weightBold,
  },
  boundsBox: {
    backgroundColor: 'rgba(255, 140, 0, 0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.2)',
  },
  boundsTitle: {
    color: COLORS.secondary,
    fontWeight: FONTS.weightBold,
    fontSize: FONTS.sizeMd,
    marginBottom: 4,
  },
  boundsText: {
    color: COLORS.lightGray100,
    fontSize: FONTS.sizeMd,
    lineHeight: 18,
  },
  emptyHistory: {
    color: COLORS.lightGray200,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 16,
  },
  historyList: {
    marginBottom: 32,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activeAvatar: {
    backgroundColor: 'rgba(10, 92, 255, 0.15)',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  bidderName: {
    color: COLORS.white,
    fontSize: FONTS.sizeBase,
    fontWeight: FONTS.weightBold,
  },
  leaderBadge: {
    color: COLORS.secondary,
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: 'rgba(255, 140, 0, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bidTime: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeSm,
    marginTop: 2,
  },
  bidHistoryAmount: {
    color: COLORS.lightGray100,
    fontSize: FONTS.sizeBase,
    fontWeight: FONTS.weightBold,
  },
  activeBidAmount: {
    color: COLORS.secondary,
    fontSize: FONTS.sizeLg,
  },
  loader: {
    marginVertical: 16,
  },
  bidPanel: {
    backgroundColor: COLORS.darkGray500,
    padding: 24,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  panelTitle: {
    color: COLORS.white,
    fontSize: FONTS.sizeLg,
    fontWeight: FONTS.weightBold,
    marginBottom: 12,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  quickButton: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickButtonText: {
    color: COLORS.lightGray100,
    fontSize: FONTS.sizeMd,
    fontWeight: FONTS.weightBold,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkGray600,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  currencyPrefix: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
    marginRight: 8,
  },
  bidInput: {
    flex: 1,
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
    height: 48,
  },
  errorMessage: {
    color: COLORS.danger,
    fontSize: FONTS.sizeMd,
    marginBottom: 12,
    fontWeight: '600',
  },
  successMessage: {
    color: COLORS.success,
    fontSize: FONTS.sizeMd,
    marginBottom: 12,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: COLORS.primary, // Azul Cobalto
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.glow,
  },
  disabledSubmitButton: {
    backgroundColor: COLORS.textDisabled,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: COLORS.textWhite,
    fontSize: FONTS.sizeLg,
    fontWeight: FONTS.weightBold,
  },
});
