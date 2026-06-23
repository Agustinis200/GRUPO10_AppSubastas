import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, ActivityIndicator, TextInput, Alert, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, FONTS } from '../styles/theme';
import { apiService } from '../api/apiService';

export default function ArticulosScreen({
  myProducts,
  loadingMyProducts,
  setActiveTab,
  refreshProducts
}) {
  const [rejectingProductId, setRejectingProductId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const handleAccept = async (productId) => {
    setActionLoading(true);
    try {
      await apiService.respondToProductProposal(productId, 'aceptada');
      Alert.alert('Éxito', 'Has aceptado los términos propuestos.');
      if (refreshProducts) refreshProducts();
    } catch (err) {
      Alert.alert('Error', err.message || 'No se pudo aceptar la propuesta.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReject = async (productId) => {
    if (!rejectReason.trim()) {
      Alert.alert('Campo Requerido', 'Por favor ingresa un motivo para rechazar la propuesta.');
      return;
    }
    setActionLoading(true);
    try {
      await apiService.respondToProductProposal(productId, 'rechazada', rejectReason.trim());
      Alert.alert('Éxito', 'Has rechazado la propuesta y solicitado el retiro del artículo.');
      setRejectingProductId(null);
      setRejectReason('');
      if (refreshProducts) refreshProducts();
    } catch (err) {
      Alert.alert('Error', err.message || 'No se pudo rechazar la propuesta.');
    } finally {
      setActionLoading(false);
    }
  };
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Header (Dark Navy Blue theme) */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <TouchableOpacity 
            onPress={() => setActiveTab('home')} 
            style={styles.backButton}
          >
            <Feather name="arrow-left" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            Mis Artículos Enviados
          </Text>
        </View>

        {/* Stats Card inside Header */}
        <View style={styles.statsCard}>
          <View style={styles.statsItem}>
            <Text style={styles.statsValue}>
              {myProducts.length}
            </Text>
            <Text style={styles.statsLabel}>
              Total Enviados
            </Text>
          </View>
          <View style={styles.statsDivider} />
          <View style={styles.statsItem}>
            <Text style={styles.statsValue}>
              {myProducts.filter(p => {
                // "En proceso" = artículos que aún no fueron asignados a subasta
                // (disponible 'no' y propuesta no aceptada todavía)
                const estado = p.propuesta_estado || 'en_revision';
                return p.disponible !== 'si' && ['en_revision', 'esperando_inspeccion', 'en_inspeccion', 'propuesta_enviada'].includes(estado);
              }).length}
            </Text>
            <Text style={styles.statsLabel}>
              En Proceso
            </Text>
          </View>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loadingMyProducts}
            onRefresh={refreshProducts}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        
        {/* Coverage Banner (Orange Outline Capsule) */}
        <View style={styles.coverageBanner}>
          <Text style={styles.coverageTitle}>
            Aumentar cobertura
          </Text>
          <Text style={styles.coverageText}>
            Para solicitar un aumento de la cobertura de tu póliza de seguro, comunícate con la aseguradora:
          </Text>
          <Text style={[styles.coverageText, { fontWeight: 'bold', marginTop: 4 }]}>
            Tel: +54 11 5555-1234 | Email: contacto@segurosinternacionales.com
          </Text>
          <Text style={[styles.coverageText, { fontStyle: 'italic', fontSize: 10, marginTop: 2 }]}>
            Dirección: Av. Libertador 2590, CABA
          </Text>
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
          myProducts.map((item) => {
            const isSubastado = item.disponible === 'si' && item.subastaInfo != null;
            const wasSubastado = item.subastado === 'si';
            const estado = item.propuesta_estado || 'en_revision';

            let badgeColor = 'rgba(255, 140, 0, 0.15)';
            let badgeTextColor = COLORS.secondary || '#FF8C00';
            let badgeText = 'En Proceso';
            let badgeIcon = 'clock';

            if (wasSubastado) {
              badgeColor = 'rgba(142, 142, 147, 0.15)';
              badgeTextColor = '#8E8E93';
              badgeText = 'Subastado';
              badgeIcon = 'check-circle';
            } else if (isSubastado) {
              badgeColor = '#D1F2D9';
              badgeTextColor = '#10B981';
              badgeText = 'En Subasta';
              badgeIcon = 'trending-up';
            } else if (estado === 'esperando_inspeccion') {
              badgeColor = 'rgba(255, 140, 0, 0.15)';
              badgeTextColor = '#FF8C00';
              badgeText = 'Esperando Envío (Inspección)';
              badgeIcon = 'truck';
            } else if (estado === 'inspeccion_rechazada') {
              badgeColor = 'rgba(142, 142, 147, 0.15)';
              badgeTextColor = '#8E8E93';
              badgeText = 'Envío Cancelado';
              badgeIcon = 'x';
            } else if (estado === 'en_inspeccion') {
              badgeColor = 'rgba(10, 92, 255, 0.15)';
              badgeTextColor = '#0A5CFF';
              badgeText = 'En Inspección Física';
              badgeIcon = 'search';
            } else if (estado === 'inspeccion_fallida') {
              badgeColor = 'rgba(239, 68, 68, 0.15)';
              badgeTextColor = COLORS.danger || '#EF4444';
              badgeText = 'Inspección Fallida';
              badgeIcon = 'alert-triangle';
            } else if (estado === 'propuesta_enviada') {
              badgeColor = 'rgba(10, 92, 255, 0.15)';
              badgeTextColor = COLORS.primary || '#0A5CFF';
              badgeText = 'Propuesta Recibida';
              badgeIcon = 'mail';
            } else if (estado === 'aceptada') {
              badgeColor = 'rgba(16, 185, 129, 0.15)';
              badgeTextColor = '#10B981';
              badgeText = 'En Espera de Subasta';
              badgeIcon = 'check-circle';
            } else if (estado === 'rechazada') {
              badgeColor = 'rgba(239, 68, 68, 0.15)';
              badgeTextColor = COLORS.danger || '#EF4444';
              badgeText = 'Propuesta Rechazada';
              badgeIcon = 'x-circle';
            }

            return (
              <View key={item.identificador.toString()} style={styles.productCard}>
                <View style={styles.productHeader}>
                  <Image source={{ uri: item.foto }} style={styles.productImage} />
                  <View style={styles.productInfo}>
                    <Text style={styles.productTitle}>
                      {item.titulo}
                    </Text>
                    
                    {/* Status Badge */}
                    <View style={[styles.statusBadge, { backgroundColor: badgeColor }]}>
                      <Feather name={badgeIcon} size={12} color={badgeTextColor} style={{ marginRight: 4 }} />
                      <Text style={[styles.statusText, { color: badgeTextColor }]}>{badgeText}</Text>
                    </View>
                    
                    <Text style={styles.productLocation}>
                      Ubicación: <Text style={{ fontWeight: '600' }}>{item.location || 'Av. Corrientes 1234, Piso 5'}</Text>
                    </Text>
                  </View>
                </View>

                {/* Negotiation Box */}
                {!isSubastado && !wasSubastado && (
                  <View style={styles.negotiationBox}>
                    {estado === 'en_revision' && (
                      <Text style={{ fontSize: 12, color: '#8E8E93', fontStyle: 'italic', lineHeight: 16 }}>
                        Nuestros técnicos están revisando las fotos de tu artículo para verificar nuestro interés inicial. Te notificaremos aquí pronto.
                      </Text>
                    )}

                    {estado === 'esperando_inspeccion' && (
                      <View>
                        <Text style={styles.negotiationTitle}>Inspección Física Solicitada:</Text>
                        <Text style={{ fontSize: 12, color: '#1C1C1E', lineHeight: 17, marginBottom: 8 }}>
                          ¡Nos interesa tu artículo! Para continuar, necesitamos realizar una revisión física completa. Debes enviar el producto a la dirección indicada por el revisor:
                        </Text>
                        <View style={{ backgroundColor: '#EBF3FF', borderRadius: 8, padding: 10, marginBottom: 8 }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#0A5CFF' }}>
                            <Feather name="map-pin" size={12} /> {item.direccion_inspeccion || 'Av. de la Constitución 1420, CABA'}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 11, color: '#8E8E93', fontStyle: 'italic', lineHeight: 15, marginBottom: 12 }}>
                          * Si el artículo se encuentra en buen estado, te propondremos un precio base y comisión. Si no cumple o es rechazado, deberás retirarlo o pagar por el envío de retorno.
                        </Text>
                        
                        <View style={styles.negotiationActions}>
                          <TouchableOpacity 
                            style={[styles.negotiationBtn, styles.acceptBtn]}
                            onPress={async () => {
                              setActionLoading(true);
                              try {
                                await apiService.respondToProductProposal(item.identificador, 'en_inspeccion');
                                Alert.alert('Envío Aceptado', 'Has aceptado enviar el producto para su inspección física.');
                                if (refreshProducts) refreshProducts();
                              } catch (e) {
                                Alert.alert('Error', e.message);
                              } finally {
                                setActionLoading(false);
                              }
                            }}
                            disabled={actionLoading}
                          >
                            <Text style={styles.negotiationBtnText}>Aceptar y Enviar</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={[styles.negotiationBtn, styles.rejectBtn]}
                            onPress={async () => {
                              setActionLoading(true);
                              try {
                                await apiService.respondToProductProposal(item.identificador, 'inspeccion_rechazada');
                                Alert.alert('Envío Rechazado', 'Has cancelado el proceso de envío e inspección.');
                                if (refreshProducts) refreshProducts();
                              } catch (e) {
                                Alert.alert('Error', e.message);
                              } finally {
                                setActionLoading(false);
                              }
                            }}
                            disabled={actionLoading}
                          >
                            <Text style={styles.negotiationBtnText}>Rechazar Envío</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {estado === 'inspeccion_rechazada' && (
                      <View>
                        <Text style={[styles.negotiationTitle, { color: COLORS.danger }]}>Envío Rechazado:</Text>
                        <Text style={{ fontSize: 12, color: '#8E8E93', fontStyle: 'italic' }}>
                          Rechazaste enviar el artículo para inspección física. El proceso ha finalizado.
                        </Text>
                      </View>
                    )}

                    {estado === 'en_inspeccion' && (
                      <Text style={{ fontSize: 12, color: '#0A5CFF', fontWeight: '500', lineHeight: 16 }}>
                        El artículo se encuentra en nuestro centro de distribución siendo inspeccionado físicamente por nuestros especialistas. Te notificaremos la cotización propuesta tan pronto finalice el análisis técnico.
                      </Text>
                    )}

                    {estado === 'propuesta_enviada' && (
                      <View>
                        <Text style={styles.negotiationTitle}>Términos Propuestos por Soporte:</Text>
                        <View style={styles.negotiationRow}>
                          <Text style={styles.negotiationLabel}>Moneda:</Text>
                          <Text style={styles.negotiationValue}>{item.moneda || 'ARS'}</Text>
                        </View>
                        <View style={styles.negotiationRow}>
                          <Text style={styles.negotiationLabel}>Precio Base:</Text>
                          <Text style={[styles.negotiationValue, { color: '#10B981', fontWeight: 'bold' }]}>
                            {item.moneda === 'USD' ? 'u$s ' : '$ '}{Number(item.precio_base_propuesto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </Text>
                        </View>
                        <View style={styles.negotiationRow}>
                          <Text style={styles.negotiationLabel}>Comisión:</Text>
                          <Text style={styles.negotiationValue}>
                            {Number(item.comision_propuesta).toLocaleString('es-AR', { minimumFractionDigits: 2 })}%
                          </Text>
                        </View>
                        
                        {rejectingProductId === item.identificador ? (
                          <View style={{ marginTop: 12 }}>
                            <Text style={styles.inputLabel}>Motivo del Rechazo/Retiro:</Text>
                            <TextInput
                              style={styles.textInput}
                              placeholder="Ej: Deseo retirar el producto"
                              placeholderTextColor="#C7C7CC"
                              value={rejectReason}
                              onChangeText={setRejectReason}
                            />
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                              <TouchableOpacity 
                                style={[styles.miniBtn, { backgroundColor: COLORS.danger }]}
                                onPress={() => handleConfirmReject(item.identificador)}
                                disabled={actionLoading}
                              >
                                {actionLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.miniBtnText}>Confirmar</Text>}
                              </TouchableOpacity>
                              <TouchableOpacity 
                                style={[styles.miniBtn, { backgroundColor: '#E5E5EA' }]}
                                onPress={() => {
                                  setRejectingProductId(null);
                                  setRejectReason('');
                                }}
                              >
                                <Text style={[styles.miniBtnText, { color: '#000000' }]}>Cancelar</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : (
                          <View style={styles.negotiationActions}>
                            <TouchableOpacity 
                              style={[styles.negotiationBtn, styles.acceptBtn]}
                              onPress={() => handleAccept(item.identificador)}
                              disabled={actionLoading}
                            >
                              <Text style={styles.negotiationBtnText}>Aceptar Términos</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={[styles.negotiationBtn, styles.rejectBtn]}
                              onPress={() => {
                                setRejectingProductId(item.identificador);
                                setRejectReason('');
                              }}
                            >
                              <Text style={styles.negotiationBtnText}>Rechazar / Retirar</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    )}

                    {estado === 'aceptada' && (
                      <View>
                        <Text style={[styles.negotiationTitle, { color: '#10B981' }]}>En Espera de Asignación a Subasta:</Text>
                        <View style={styles.negotiationRow}>
                          <Text style={styles.negotiationLabel}>Precio Base:</Text>
                          <Text style={styles.negotiationValue}>
                            {item.moneda === 'USD' ? 'u$s ' : '$ '}{Number(item.precio_base_propuesto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </Text>
                        </View>
                        <View style={styles.negotiationRow}>
                          <Text style={styles.negotiationLabel}>Comisión:</Text>
                          <Text style={styles.negotiationValue}>
                            {Number(item.comision_propuesta).toLocaleString('es-AR', { minimumFractionDigits: 2 })}%
                          </Text>
                        </View>

                      </View>
                    )}

                    {(estado === 'rechazada' || estado === 'inspeccion_fallida') && (
                      <View>
                        <Text style={[styles.negotiationTitle, { color: COLORS.danger }]}>
                          {estado === 'rechazada' ? 'Propuesta Rechazada' : 'Inspección Física Fallida'}:
                        </Text>
                        {item.motivo_rechazo ? (
                          <Text style={{ fontSize: 12, color: '#3A3A3C', fontWeight: '600', marginBottom: 8 }}>
                            Motivo: <Text style={{ fontStyle: 'italic', fontWeight: 'normal', color: '#8E8E93' }}>{item.motivo_rechazo}</Text>
                          </Text>
                        ) : null}
                        <View style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', borderRadius: 8, padding: 12 }}>
                          <Text style={{ fontSize: 12, color: COLORS.danger, fontWeight: '700', lineHeight: 16 }}>
                            ⚠️ El artículo no ingresará a la subasta. Debes retirarlo de nuestra sucursal de recepción dentro de los próximos 15 días, o pagar por transferencia/efectivo el costo de retorno para coordinar el envío a tu domicilio.
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {/* Info de la Subasta (Light Blue background) */}
                {item.subasta_info && (
                  <View style={styles.subastaInfoBox}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <Feather name="calendar" size={14} color="#0A5CFF" style={{ marginRight: 6 }} />
                      <Text style={styles.subastaInfoTitle}>Asignado a Subasta:</Text>
                    </View>
                    <Text style={styles.subastaInfoDetail}>
                      Fecha: <Text style={{ fontWeight: '600', color: '#1C1C1E' }}>{item.subasta_info.fecha}</Text> a las <Text style={{ fontWeight: '600', color: '#1C1C1E' }}>{item.subasta_info.hora}</Text>
                    </Text>
                    <Text style={styles.subastaInfoDetail}>
                      Ubicación: <Text style={{ fontWeight: '600', color: '#1C1C1E' }}>{item.subasta_info.ubicacion || 'Online'}</Text>
                    </Text>
                  </View>
                )}

                {/* Bottom Insurance Box (Blue background) */}
                {item.seguro && (
                  <View style={styles.insuranceBox}>
                    <Text style={styles.insurancePolicy}>
                      Póliza: {item.seguro.nroPoliza}
                    </Text>
                    <Text style={styles.insuranceCompany}>
                      {item.seguro.compania}
                    </Text>
                    <Text style={styles.insuranceAddress}>
                      {item.seguro.direccion}
                    </Text>
                    <Text style={[styles.insuranceAddress, { marginTop: 2 }]}>
                      Email: {item.seguro.email || 'contacto@segurosinternacionales.com'}
                    </Text>
                    <View style={styles.insurancePhoneRow}>
                      <Feather name="phone" size={12} color="#0A5CFF" style={{ marginRight: 6 }} />
                      <Text style={styles.insurancePhone}>
                        {item.seguro.telefono}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#001A3F',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
    height: 40,
    justifyContent: 'center'
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
    elevation: 3
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700'
  },
  statsCard: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: 'rgba(10, 92, 255, 0.4)',
    backgroundColor: 'rgba(10, 92, 255, 0.15)',
    borderRadius: 20,
    paddingVertical: 14,
    justifyContent: 'space-around',
    alignItems: 'center'
  },
  statsItem: {
    flex: 1,
    alignItems: 'center'
  },
  statsValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  statsLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
    marginTop: 4
  },
  statsDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)'
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40
  },
  coverageBanner: {
    borderWidth: 1.5,
    borderColor: '#FF8C00',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginBottom: 20
  },
  coverageTitle: {
    color: '#C26700',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4
  },
  coverageText: {
    color: '#C26700',
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 15
  },
  tabLoader: {
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    color: COLORS.lightGray200,
    marginTop: 12,
    fontSize: FONTS.sizeBase
  },
  emptyContainer: {
    paddingVertical: 60,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40
  },
  emptyTextTitle: {
    color: '#1C1C1E', // Modified to be visible on white background
    fontSize: FONTS.sizeLg,
    fontWeight: FONTS.weightBold,
    marginBottom: 6,
    textAlign: 'center'
  },
  emptyTextSubtitle: {
    color: '#8E8E93', // Modified to be visible on white background
    fontSize: FONTS.sizeMd,
    textAlign: 'center'
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1
  },
  productHeader: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center'
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    resizeMode: 'cover'
  },
  productInfo: {
    marginLeft: 16,
    flex: 1
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1C1E'
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1F2D9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 6,
    marginBottom: 8
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981'
  },
  productLocation: {
    fontSize: 11,
    color: '#3A3A3C',
    fontWeight: '500'
  },
  insuranceBox: {
    backgroundColor: '#E6F0FA',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(10, 92, 255, 0.1)'
  },
  insurancePolicy: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0A5CFF',
    textDecorationLine: 'underline',
    marginBottom: 6
  },
  insuranceCompany: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 2
  },
  insuranceAddress: {
    fontSize: 11,
    color: '#636366',
    fontWeight: '500',
    marginBottom: 4
  },
  insurancePhoneRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  insurancePhone: {
    fontSize: 11,
    color: '#0A5CFF',
    fontWeight: '600'
  },
  negotiationBox: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  negotiationTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  negotiationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  negotiationLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  negotiationValue: {
    fontSize: 12,
    color: '#1C1C1E',
    fontWeight: '600',
  },
  negotiationActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  negotiationBtn: {
    flex: 0.48,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: {
    backgroundColor: '#10B981',
  },
  rejectBtn: {
    backgroundColor: '#EF4444',
  },
  negotiationBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    color: '#1C1C1E',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingHorizontal: 12,
    height: 38,
    fontSize: 13,
  },
  miniBtn: {
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 0.48,
  },
  miniBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
  subastaInfoBox: {
    backgroundColor: '#F0F4FA',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(10, 92, 255, 0.1)',
  },
  subastaInfoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0A5CFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subastaInfoDetail: {
    fontSize: 11,
    color: '#636366',
    marginTop: 2,
  },
  policyCard: {
    backgroundColor: '#EBF3FF',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(10, 92, 255, 0.15)',
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(10, 92, 255, 0.12)',
  },
  policyTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0A5CFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  policyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  policyLabel: {
    fontSize: 11,
    color: '#636366',
    fontWeight: '500',
  },
  policyValue: {
    fontSize: 11,
    color: '#1C1C1E',
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  policyPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(10, 92, 255, 0.12)',
  },
  policyPhone: {
    fontSize: 12,
    color: '#0A5CFF',
    fontWeight: '700',
  },
});
