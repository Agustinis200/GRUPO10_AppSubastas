import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, Dimensions, RefreshControl } from 'react-native';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import AuctionCard from '../components/AuctionCard';
import { COLORS, FONTS, SHADOWS } from '../styles/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;

export default function HomeScreen({
  userProfile,
  unreadNotifCount,
  onShowNotifications,
  onLogout,
  userBalance,
  stats,
  loading,
  auctions,
  onBidPress,
  onViewAllSubastas,
  isGuest,
  paymentMethods = [],
  activePaymentMethod,
  setActivePaymentMethod,
  onSetDefaultPaymentMethod,
  refreshing,
  onRefresh
}) {
  const activeMethods = paymentMethods.filter(pm => pm.estado === 'activo');
  const scrollViewRef = React.useRef(null);

  React.useEffect(() => {
    if (activePaymentMethod && activeMethods.length > 0) {
      const index = activeMethods.findIndex(pm => pm.identificador === activePaymentMethod.identificador);
      if (index !== -1 && scrollViewRef.current) {
        const timer = setTimeout(() => {
          scrollViewRef.current?.scrollTo({ x: index * (SCREEN_WIDTH - 40), animated: false });
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [activePaymentMethod, activeMethods.length]);

  return (
    <ScrollView 
      contentContainerStyle={styles.scrollContent} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.primary}
          colors={[COLORS.primary]}
        />
      }
    >
      {/* Header Panel */}
      <View style={styles.homeHeader}>
        <View>
          <Text style={styles.headerWelcome}>¡Hola de nuevo!</Text>
          <Text style={styles.headerName}>{isGuest ? 'Invitado' : userProfile?.nombre}</Text>
          {!isGuest && userProfile?.categoria && (
            <Text style={styles.headerCategory}>
              Categoría: <Text style={{ fontWeight: '700', textTransform: 'uppercase' }}>{userProfile.categoria}</Text>
            </Text>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {!isGuest && (
            <TouchableOpacity onPress={onShowNotifications} style={[styles.logoutIconButton, { marginRight: 10 }]}>
              <Feather name="bell" size={18} color={COLORS.white} />
              {unreadNotifCount > 0 && (
                <View style={styles.bellBadgeMini}>
                  <Text style={styles.bellBadgeTextMini}>{unreadNotifCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onLogout} style={styles.logoutIconButton}>
            <Feather name={isGuest ? "log-in" : "log-out"} size={18} color={isGuest ? COLORS.primary : COLORS.danger} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Guest Mode Invitation Card OR Registered Payment Methods Carousel */}
      {isGuest ? (
        <View style={styles.guestInviteCard}>
          <Feather name="user-check" size={28} color={COLORS.secondary} style={{ marginBottom: 12 }} />
          <Text style={styles.guestInviteTitle}>Modo Invitado</Text>
          <Text style={styles.guestInviteText}>
            Estás explorando PujaYa! como invitado. Para poder registrar medios de pago, certificar cheques, pujar y ver precios en tiempo real, crea una cuenta o inicia sesión.
          </Text>
          <TouchableOpacity onPress={onLogout} style={styles.guestInviteButton}>
            <Text style={styles.guestInviteButtonText}>Iniciar Sesión / Registrarse</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ marginBottom: 24 }}>
          <Text style={styles.sectionTitle}>Medios de Pago y Saldo</Text>
          {activeMethods.length === 0 ? (
            <View style={styles.balanceCard}>
              <View style={styles.balanceHeaderRow}>
                <Text style={styles.balanceCardTitle}>SIN MEDIOS DE PAGO</Text>
                <View style={[styles.tierBadge, { backgroundColor: COLORS.danger }]}>
                  <Text style={styles.tierBadgeText}>REQUERIDO</Text>
                </View>
              </View>
              <Text style={[styles.balanceCardValue, { color: COLORS.lightGray200 }]}>$0,00</Text>
              <Text style={styles.balanceCardHint}>Registra una tarjeta, CBU o cheque en tu Perfil para ofertar</Text>
            </View>
          ) : (
            <View>
              <ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={async (e) => {
                  const xOffset = e.nativeEvent.contentOffset.x;
                  const index = Math.round(xOffset / (SCREEN_WIDTH - 40));
                  if (activeMethods[index]) {
                    const targetPm = activeMethods[index];
                    setActivePaymentMethod(targetPm);
                    if (onSetDefaultPaymentMethod) {
                      await onSetDefaultPaymentMethod(targetPm.identificador, true);
                    }
                  }
                }}
                style={styles.carouselScrollView}
                contentContainerStyle={styles.carouselContent}
              >
                {activeMethods.map((pm, idx) => {
                  const isActive = activePaymentMethod?.identificador === pm.identificador;
                  const isPredeterminado = pm.predeterminado === true || pm.predeterminado === 'si';
                  const amountVal = pm.monto && Number(pm.monto) > 0 ? Number(pm.monto) : (pm.moneda === 'USD' ? 50000 : 75000000);
                  
                  return (
                    <View key={pm.identificador} style={styles.carouselPageWrapper}>
                      <View style={[styles.carouselCard, isActive && styles.activeCarouselCard]}>
                        <View style={styles.balanceHeaderRow}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <FontAwesome5 
                              name={pm.tipo === 'tarjeta' ? 'credit-card' : pm.tipo === 'cheque' ? 'money-check-alt' : 'university'} 
                              size={16} 
                              color={isActive ? COLORS.secondary : COLORS.lightGray200} 
                              style={{ marginRight: 8 }}
                            />
                            <Text style={[styles.balanceCardTitle, isActive && { color: COLORS.white }]}>
                              {pm.tipo === 'tarjeta' 
                                ? `TARJETA ${pm.proveedor.toUpperCase()}` 
                                : pm.tipo === 'cheque' 
                                  ? `CHEQUE CERTIFICADO` 
                                  : `CBU / CUENTA`} {`(${pm.moneda || 'ARS'})`}
                            </Text>
                          </View>
                          {isPredeterminado ? (
                            <View style={[styles.tierBadge, { backgroundColor: COLORS.success }]}>
                              <Text style={styles.tierBadgeText}>PREDETERMINADO</Text>
                            </View>
                          ) : null}
                        </View>
                        
                        <Text style={[styles.balanceCardValue, isActive && { color: COLORS.success }]}>
                          {pm.moneda === 'USD' ? 'u$s ' : '$ '}{amountVal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                        
                        <View style={styles.cardInfoRow}>
                          <Text style={styles.cardMask}>{pm.mascara}</Text>
                          {pm.tipo === 'cheque' && (
                            <Text style={styles.bankName}>{pm.proveedor}</Text>
                          )}
                        </View>

                        <Text style={styles.balanceCardHint}>
                          {pm.tipo === 'cheque' 
                            ? 'Saldo certificado extraído dinámicamente' 
                            : 'Límite preaprobado disponible para ofertas'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
              
              {/* Dots Indicator */}
              <View style={styles.dotsRow}>
                {activeMethods.map((pm, idx) => {
                  const isActive = activePaymentMethod?.identificador === pm.identificador;
                  return (
                    <View 
                      key={pm.identificador} 
                      style={[styles.dot, isActive && styles.activeDot]} 
                    />
                  );
                })}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Quick Stats Panel (Only for Registered Users) */}
      {!isGuest && (
        <>
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
        </>
      )}

      {/* Featured Auctions */}
      <View style={styles.featuredHeaderRow}>
        <Text style={styles.sectionTitle}>Subastas Destacadas</Text>
        <TouchableOpacity onPress={onViewAllSubastas}>
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
            <AuctionCard 
              key={item.identificador} 
              auction={item} 
              onBidPress={onBidPress} 
              isGuest={isGuest} 
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  headerCategory: {
    color: COLORS.secondary || '#FF8C00',
    fontSize: FONTS.sizeSm || 11,
    fontWeight: '600',
    marginTop: 2,
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
  balanceCard: {
    backgroundColor: COLORS.darkGray500,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
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
    fontSize: 28,
    fontWeight: FONTS.weightExtraBold,
    marginBottom: 8,
  },
  balanceCardHint: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeSm,
    marginTop: 4,
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
  emptyText: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeBase,
    textAlign: 'center',
    marginTop: 20,
  },
  // Guest Invite Styles
  guestInviteCard: {
    backgroundColor: COLORS.darkGray500,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    marginBottom: 24,
    ...SHADOWS.default,
  },
  guestInviteTitle: {
    color: COLORS.white,
    fontSize: FONTS.sizeLg,
    fontWeight: FONTS.weightBold,
    marginBottom: 8,
  },
  guestInviteText: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeBase,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  guestInviteButton: {
    backgroundColor: COLORS.secondary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    ...SHADOWS.orangeGlow,
  },
  guestInviteButtonText: {
    color: COLORS.textWhite,
    fontSize: FONTS.sizeBase,
    fontWeight: FONTS.weightBold,
  },
  // Carousel Styles
  carouselScrollView: {
    width: SCREEN_WIDTH - 40,
    alignSelf: 'center',
  },
  carouselContent: {
    alignItems: 'center',
  },
  carouselPageWrapper: {
    width: SCREEN_WIDTH - 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselCard: {
    width: SCREEN_WIDTH - 40,
    backgroundColor: COLORS.darkGray500,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.default,
  },
  activeCarouselCard: {
    borderColor: COLORS.secondary,
    borderWidth: 1.5,
    ...SHADOWS.orangeGlow,
  },
  cardInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardMask: {
    color: COLORS.white,
    fontSize: FONTS.sizeBase,
    fontWeight: FONTS.weightBold,
    letterSpacing: 1,
  },
  bankName: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeMd,
    fontWeight: FONTS.weightMedium,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.border,
    marginHorizontal: 4,
  },
  activeDot: {
    width: 16,
    backgroundColor: COLORS.secondary,
  },
});
