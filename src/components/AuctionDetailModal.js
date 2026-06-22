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
  Platform,
  Image,
  Dimensions
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabaseService, isSubastaClosed, isSubastaNotStarted } from '../api/supabaseService';
import { COLORS, FONTS, SHADOWS } from '../styles/theme';

export default function AuctionDetailModal({ visible, auction, onClose, onBidSuccess, isGuest, activePaymentMethod, userFines = [] }) {
  const moneda = auction?.moneda || auction?.producto?.moneda || 'ARS';
  const currencySymbol = moneda === 'USD' ? 'u$s ' : '$ ';
  const [bidAmount, setBidAmount] = useState('');
  const [bidHistory, setBidHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [minAllowed, setMinAllowed] = useState(0);
  const [maxAllowed, setMaxAllowed] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, expired: false });

  useEffect(() => {
    if (!visible || !auction) return;

    let timerId;

    const calculateTime = async () => {
      if (auction.subasta_terminada || auction.subastado === 'si' || auction.estado === 'bloqueada' || auction.is_locked) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, expired: true });
        return;
      }

      const difference = +new Date(auction.ends_at) - +new Date();
      if (difference <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, expired: true });
        clearInterval(timerId);

        try {
          const res = await supabaseService.autoFinalizeItem(
            auction.identificador,
            auction.subasta_id,
            auction.producto?.duenio,
            auction.producto?.identificador
          );
          if (res && res.success) {
            if (onBidSuccess) {
              onBidSuccess({
                ...auction,
                subastado: 'si',
                estado: 'cerrada'
              });
            }
          }
        } catch (e) {
          console.warn('[AuctionDetailModal] Error auto finalising on expire:', e);
        }
        return;
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference / (1000 * 60)) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft({ hours, minutes, seconds, expired: false });
    };

    calculateTime();
    timerId = setInterval(calculateTime, 1000);

    return () => clearInterval(timerId);
  }, [visible, auction, auction?.ends_at]);

  useEffect(() => {
    if (visible && auction) {
      fetchHistory();
      setActiveIndex(0);
      
      const currentPrice = auction.precio_actual;
      let calculatedMin = currentPrice + 1;
      
      if (['comun', 'especial', 'plata'].includes(auction.categoria)) {
        const minInc = currentPrice * 0.01;
        const maxInc = currentPrice * 0.20;
        setMinAllowed(currentPrice + minInc);
        setMaxAllowed(currentPrice + maxInc);
        calculatedMin = Math.ceil(currentPrice + minInc);
      } else {
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
    
    if (auction.estado === 'bloqueada' || auction.is_locked) {
      setErrorMessage('Esta subasta está bloqueada temporalmente.');
      return;
    }

    const hasPendingFines = userFines.some(f => f.estado === 'pendiente');
    if (hasPendingFines) {
      setErrorMessage('No puedes ofertar porque posees multas pendientes de pago. Por favor, regulariza tu situación desde Mi Perfil.');
      return;
    }

    if (auction.estado !== 'abierta' && isSubastaNotStarted(auction.fecha, auction.hora)) {
      setErrorMessage('Esta subasta aún no ha comenzado.');
      return;
    }
    if (auction.estado !== 'abierta' && (auction.estado === 'cerrada' || auction.estado === 'carrada' || isSubastaClosed(auction.fecha, auction.hora))) {
      setErrorMessage('Esta subasta ya ha finalizado.');
      return;
    }

    if (!activePaymentMethod) {
      setErrorMessage('Debes tener un medio de pago predeterminado activo para poder ofertar.');
      return;
    }

    const productMoneda = auction.producto.moneda || 'ARS';
    const paymentMoneda = activePaymentMethod.moneda || 'ARS';
    if (paymentMoneda !== productMoneda) {
      setErrorMessage(`El medio de pago activo está en ${paymentMoneda}, pero el artículo se subasta en ${productMoneda}. Debes seleccionar un medio de pago en la misma moneda en el Home.`);
      return;
    }
    
    const basePrice = Number(auction.preciobase || 0);
    if (Number(activePaymentMethod.monto) < basePrice) {
      const formattedBase = basePrice.toLocaleString('es-AR', { minimumFractionDigits: 2 });
      const formattedMonto = Number(activePaymentMethod.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 });
      setErrorMessage(`Tu medio de pago predeterminado no cumple con el límite mínimo para ingresar a esta subasta. Límite requerido: ${activePaymentMethod.moneda === 'USD' ? 'u$s' : '$'} ${formattedBase} (Disponible: ${formattedMonto})`);
      return;
    }

    const amount = parseFloat(bidAmount);
    if (isNaN(amount)) {
      setErrorMessage('Por favor ingresa un monto válido.');
      return;
    }

    if (amount <= auction.precio_actual) {
      setErrorMessage(`Tu oferta debe superar el precio actual de ${currencySymbol}${auction.precio_actual.toLocaleString('es-AR')}`);
      return;
    }

    if (['comun', 'especial', 'plata'].includes(auction.categoria)) {
      if (amount < minAllowed) {
        setErrorMessage(`Regla de negocio: la oferta mínima debe ser ${currencySymbol}${Math.round(minAllowed).toLocaleString('es-AR')} (+1% del base)`);
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

  const handleScroll = (event) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    if (slideSize > 0) {
      const index = event.nativeEvent.contentOffset.x / slideSize;
      const roundIndex = Math.round(index);
      setActiveIndex(roundIndex);
    }
  };

  if (!auction) return null;

  const images = auction.producto.images || [auction.producto.image_url];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 64}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>
                {isGuest ? 'Contenido Exclusivo' : auction.producto.titulo}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.subtitle}>
                  {isGuest ? 'Inicia sesión para ver detalles' : `Subasta por ${auction.producto.seller_name || 'Vendedor'}`}
                </Text>
                {!isGuest && (auction.estado === 'bloqueada' || auction.is_locked) && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8, backgroundColor: 'rgba(239, 68, 68, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Feather name="lock" size={10} color={COLORS.danger} style={{ marginRight: 3 }} />
                    <Text style={{ color: COLORS.danger, fontWeight: '700', fontSize: 10 }}>Bloqueada</Text>
                  </View>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {isGuest ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255, 140, 0, 0.08)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
                <Feather name="lock" size={36} color={COLORS.secondary} />
              </View>
              <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>
                Detalles del Artículo Ocultos
              </Text>
              <Text style={{ color: COLORS.lightGray100, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
                Para poder visualizar fotos, descripción, historial, póliza de seguro y precio actual de los artículos en esta subasta, debes iniciar sesión con una cuenta registrada.
              </Text>
              <TouchableOpacity 
                style={[styles.submitButton, { width: '100%', maxWidth: 200 }]} 
                onPress={onClose}
              >
                <Text style={styles.submitButtonText}>Volver</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
                {/* Images Carousel */}
                {images && images.length > 0 && (
                  <View style={styles.carouselContainer}>
                    <ScrollView 
                      horizontal 
                      pagingEnabled 
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.carouselScroll}
                      onScroll={handleScroll}
                      scrollEventThrottle={16}
                    >
                      {images.map((imgUri, index) => (
                        <Image 
                          key={index} 
                          source={{ uri: imgUri }} 
                          style={styles.carouselImage} 
                        />
                      ))}
                    </ScrollView>
                    {/* Pagination Dots */}
                    {images.length > 1 && (
                      <View style={styles.paginationContainer}>
                        {images.map((_, index) => (
                          <View 
                            key={index} 
                            style={[
                              styles.paginationDot, 
                              activeIndex === index && styles.paginationDotActive
                            ]} 
                          />
                        ))}
                      </View>
                    )}
                  </View>
                )}

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
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Feather name="shield" size={18} color={COLORS.white} style={{ marginRight: 6 }} />
                    <Text style={[styles.historyDetailTitle, { marginBottom: 0 }]}>Cobertura y Seguro</Text>
                  </View>
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
                      <View style={[styles.historyDetailRow, { marginTop: 8, borderTopWidth: 0.5, borderTopColor: COLORS.border, paddingTop: 8 }]}>
                        <Text style={styles.historyDetailLabel}>Teléfono:</Text>
                        <Text style={styles.historyDetailValue}>{auction.producto.poliza.telefono || '+54 11 5555-1234'}</Text>
                      </View>
                      <View style={styles.historyDetailRow}>
                        <Text style={styles.historyDetailLabel}>Email:</Text>
                        <Text style={styles.historyDetailValue}>{auction.producto.poliza.email || 'contacto@segurosinternacionales.com'}</Text>
                      </View>
                      <View style={styles.historyDetailRow}>
                        <Text style={styles.historyDetailLabel}>Domicilio:</Text>
                        <Text style={styles.historyDetailValue}>{auction.producto.poliza.direccion || 'Av. Libertador 2590, CABA'}</Text>
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
                    <Text style={styles.priceValue}>
                      {currencySymbol}{auction.precio_actual.toLocaleString('es-AR')}
                    </Text>
                  </View>
                  <View style={styles.priceBox}>
                    <Text style={styles.priceLabel}>Líder Actual</Text>
                    <Text style={styles.bidderValue}>
                      {auction.highest_bidder || 'Nadie'}
                    </Text>
                  </View>
                </View>

                {/* Countdown Stopwatch Boxes */}
                {!auction.subasta_terminada && auction.subastado !== 'si' && !timeLeft.expired && (
                  <View style={styles.timerContainer}>
                    <View style={styles.timerHeader}>
                      <Feather name="clock" size={14} color={COLORS.secondary} style={{ marginRight: 6 }} />
                      <Text style={styles.timerHeaderTitle}>Tiempo Restante</Text>
                    </View>
                    <View style={styles.timerBoxesRow}>
                      <View style={styles.timerBoxWrapper}>
                        <View style={styles.timerBox}>
                          <Text style={styles.timerBoxNum}>
                            {String(timeLeft.hours).padStart(2, '0')}
                          </Text>
                        </View>
                        <Text style={styles.timerBoxLabel}>Horas</Text>
                      </View>
                      <View style={styles.timerBoxWrapper}>
                        <View style={styles.timerBox}>
                          <Text style={styles.timerBoxNum}>
                            {String(timeLeft.minutes).padStart(2, '0')}
                          </Text>
                        </View>
                        <Text style={styles.timerBoxLabel}>Minutos</Text>
                      </View>
                      <View style={styles.timerBoxWrapper}>
                        <View style={styles.timerBox}>
                          <Text style={styles.timerBoxNum}>
                            {String(timeLeft.seconds).padStart(2, '0')}
                          </Text>
                        </View>
                        <Text style={styles.timerBoxLabel}>Segundos</Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Bidding Bounds Notification */}
                {['comun', 'especial', 'plata'].includes(auction.categoria) && (
                  <View style={styles.boundsBox}>
                    <Text style={styles.boundsTitle}>Reglas de incremento de puja (Categoría {auction.categoria}):</Text>
                    <Text style={styles.boundsText}>• Puja Mínima: +1% ({currencySymbol}{Math.round(minAllowed - auction.precio_actual).toLocaleString('es-AR')}) ➜ total: {currencySymbol}{Math.round(minAllowed).toLocaleString('es-AR')}</Text>
                    <Text style={styles.boundsText}>• Puja Máxima: +20% ({currencySymbol}{Math.round(maxAllowed - auction.precio_actual).toLocaleString('es-AR')}) ➜ total: {currencySymbol}{Math.round(maxAllowed).toLocaleString('es-AR')}</Text>
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
                          {currencySymbol}{bid.importe.toLocaleString('es-AR')}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>

              {(() => {
                if (auction.subasta_terminada) {
                  return (
                    <View style={styles.bidPanel}>
                      <Text style={styles.panelTitle}>Subasta Terminada</Text>
                      <Text style={[styles.errorMessage, { color: COLORS.lightGray200, marginBottom: 16 }]}>
                        Todos los artículos de esta subasta han sido subastados y la subasta ha finalizado.
                      </Text>
                      <TouchableOpacity 
                        style={[styles.submitButton, { backgroundColor: COLORS.lightGray200 }]} 
                        onPress={onClose}
                      >
                        <Text style={styles.submitButtonText}>Cerrar</Text>
                      </TouchableOpacity>
                    </View>
                  );
                }

                if (auction.subastado === 'si') {
                  return (
                    <View style={styles.bidPanel}>
                      <Text style={styles.panelTitle}>Objeto Subastado</Text>
                      <Text style={[styles.errorMessage, { color: COLORS.success, marginBottom: 16 }]}>
                        Este artículo ya ha sido subastado y adjudicado. No se admiten nuevas ofertas.
                      </Text>
                      <TouchableOpacity 
                        style={[styles.submitButton, { backgroundColor: COLORS.lightGray200 }]} 
                        onPress={onClose}
                      >
                        <Text style={styles.submitButtonText}>Cerrar</Text>
                      </TouchableOpacity>
                    </View>
                  );
                }

                const notStarted = auction.estado !== 'abierta' && isSubastaNotStarted(auction.fecha, auction.hora);
                const isClosed = auction.estado !== 'abierta' && (auction.estado === 'cerrada' || auction.estado === 'carrada' || isSubastaClosed(auction.fecha, auction.hora));
                
                if (notStarted) {
                  return (
                    <View style={styles.bidPanel}>
                      <Text style={styles.panelTitle}>Subasta No Iniciada</Text>
                      <Text style={[styles.errorMessage, { color: COLORS.secondary, marginBottom: 16 }]}>
                        Esta subasta está programada para comenzar el {auction.fecha} a las {auction.hora}. Aún no se admiten ofertas.
                      </Text>
                      <TouchableOpacity 
                        style={[styles.submitButton, { backgroundColor: COLORS.lightGray200 }]} 
                        onPress={onClose}
                      >
                        <Text style={styles.submitButtonText}>Cerrar</Text>
                      </TouchableOpacity>
                    </View>
                  );
                }
                
                if (auction.estado === 'bloqueada' || auction.is_locked) {
                  return (
                    <View style={styles.bidPanel}>
                      <Text style={styles.panelTitle}>Subasta Bloqueada</Text>
                      <Text style={[styles.errorMessage, { color: COLORS.danger, marginBottom: 16 }]}>
                        Esta subasta está bloqueada temporalmente. Se habilitará cuando el producto anterior sea vendido y termine su período de 3 horas.
                      </Text>
                      <TouchableOpacity 
                        style={[styles.submitButton, { backgroundColor: COLORS.lightGray200 }]} 
                        onPress={onClose}
                      >
                        <Text style={styles.submitButtonText}>Cerrar</Text>
                      </TouchableOpacity>
                    </View>
                  );
                }

                if (isClosed) {
                  return (
                    <View style={styles.bidPanel}>
                      <Text style={styles.panelTitle}>Subasta Finalizada</Text>
                      <Text style={[styles.errorMessage, { color: COLORS.danger, marginBottom: 16 }]}>
                        Esta subasta se encuentra cerrada. No se admiten nuevas ofertas.
                      </Text>
                      <TouchableOpacity 
                        style={[styles.submitButton, { backgroundColor: COLORS.lightGray200 }]} 
                        onPress={onClose}
                      >
                        <Text style={styles.submitButtonText}>Cerrar</Text>
                      </TouchableOpacity>
                    </View>
                  );
                }

                return (
                  <View style={styles.bidPanel}>
                    <Text style={styles.panelTitle}>Realizar una Puja</Text>
                    
                    <View style={styles.quickActions}>
                      {[50, 100, 500].map((inc) => (
                        <TouchableOpacity 
                          key={inc} 
                          style={styles.quickButton} 
                          onPress={() => adjustBid(inc)}
                        >
                          <Text style={styles.quickButtonText}>+{currencySymbol.trim()}{inc}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Input field */}
                    <View style={styles.inputContainer}>
                      <Text style={styles.currencyPrefix}>{currencySymbol.trim()}</Text>
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
                );
              })()}
            </>
          )}
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
  timerContainer: {
    backgroundColor: '#0A1E3D',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  timerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  timerHeaderTitle: {
    color: '#FFFFFF',
    fontSize: FONTS.sizeBase,
    fontWeight: FONTS.weightBold,
  },
  timerBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  timerBoxWrapper: {
    alignItems: 'center',
    marginHorizontal: 12,
  },
  timerBox: {
    backgroundColor: '#0A5CFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  timerBoxNum: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  timerBoxLabel: {
    color: '#E5E5EA',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '600',
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
    color: COLORS.secondary, 
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
    backgroundColor: COLORS.primary, 
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
  carouselContainer: {
    height: 200,
    width: '100%',
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000000',
  },
  carouselScroll: {
    alignItems: 'center',
  },
  carouselImage: {
    width: Dimensions.get('window').width - 48,
    height: 200,
    resizeMode: 'cover',
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: COLORS.secondary || '#FF8C00',
    width: 16,
  },
});
