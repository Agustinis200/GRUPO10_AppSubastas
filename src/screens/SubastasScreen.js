import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import AuctionCard from '../components/AuctionCard';
import { COLORS, FONTS, SHADOWS } from '../styles/theme';
import { isSubastaClosed, isSubastaNotStarted } from '../api/supabaseService';

export default function SubastasScreen({
  subastas,
  selectedSubasta,
  setSelectedSubasta,
  loadingSubastas,
  filteredAuctions,
  onBidPress,
  loading,
  unreadNotifCount,
  onShowNotifications,
  refreshing,
  onRefresh,
  isGuest
}) {
  const [selectedSubastaCategory, setSelectedSubastaCategory] = useState('Todos');

  const categoriesList = [
    { key: 'Todos', label: 'Todos' },
    { key: 'comun', label: 'Común' },
    { key: 'especial', label: 'Especial' },
    { key: 'plata', label: 'Plata' },
    { key: 'oro', label: 'Oro' },
    { key: 'platino', label: 'Platino' }
  ];

  const displayedSubastas = selectedSubastaCategory === 'Todos'
    ? subastas
    : subastas.filter(s => s.categoria && s.categoria.toLowerCase() === selectedSubastaCategory.toLowerCase());

  return (
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
              {!isGuest && (
                <TouchableOpacity onPress={onShowNotifications} style={styles.bellButton}>
                  <Feather name="bell" size={22} color={COLORS.white} />
                  {unreadNotifCount > 0 && (
                    <View style={styles.bellBadge}>
                      <Text style={styles.bellBadgeText}>{unreadNotifCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Category Filter Horizontal Scroll */}
          <View style={styles.categoryFilterContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
              {categoriesList.map((cat) => {
                const isActive = selectedSubastaCategory === cat.key;
                return (
                  <TouchableOpacity
                    key={cat.key}
                    style={[styles.categoryFilterPill, isActive && styles.categoryFilterPillActive]}
                    onPress={() => setSelectedSubastaCategory(cat.key)}
                  >
                    <Text style={[styles.categoryFilterPillText, isActive && styles.categoryFilterPillTextActive]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {loadingSubastas ? (
            <View style={styles.tabLoader}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Cargando subastas...</Text>
            </View>
          ) : displayedSubastas.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="calendar" size={40} color={COLORS.lightGray200} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTextTitle}>No hay subastas programadas</Text>
              <Text style={styles.emptyTextSubtitle}>Prueba con otra categoría o intenta más tarde.</Text>
            </View>
          ) : (
            <FlatList
              data={displayedSubastas}
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
                    {(() => {
                      const isClosed = (item.estado !== 'abierta' && (item.estado === 'cerrada' || item.estado === 'carrada' || isSubastaClosed(item.fecha, item.hora))) || item.todos_subastados;
                      const notStarted = !isClosed && item.estado !== 'abierta' && isSubastaNotStarted(item.fecha, item.hora);
                      if (notStarted) {
                        return (
                          <View style={[styles.subastaCatalogBadge, { backgroundColor: 'rgba(10, 92, 255, 0.15)' }]}>
                            <Text style={[styles.subastaCatalogBadgeText, { color: COLORS.primary }]}>
                              PROGRAMADA
                            </Text>
                          </View>
                        );
                      }
                      return (
                        <View style={[styles.subastaCatalogBadge, { backgroundColor: !isClosed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' }]}>
                          <Text style={[styles.subastaCatalogBadgeText, { color: !isClosed ? COLORS.success : COLORS.danger }]}>
                            {(!isClosed ? 'ABIERTA' : 'CERRADA')}
                          </Text>
                        </View>
                      );
                    })()}
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
        <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          {/* Catalog Detail List header (Orange theme) */}
          <View style={styles.orangeHeaderContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <TouchableOpacity 
                onPress={() => setSelectedSubasta(null)} 
                style={styles.backCatalogButton}
              >
                <Feather name="arrow-left" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.orangeHeaderTitle}>
                Catálogo de Subasta
              </Text>
            </View>

            {/* Summary Card */}
            <View style={styles.orangeSummaryCard}>
              <Text style={styles.orangeSummaryTitle}>
                {selectedSubasta.categoria === 'oro' ? 'Subasta de Relojes de Lujo y Antigüedades' : selectedSubasta.categoria === 'platino' ? 'Subasta de Obras de Arte y Coleccionables' : 'Subasta General de Artículos y Electrónica'}
              </Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Feather name="calendar" size={15} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.orangeSummaryText}>
                  {(() => {
                    const dateStr = selectedSubasta.fecha;
                    if (!dateStr) return '';
                    try {
                      const parts = dateStr.split('-');
                      if (parts.length !== 3) return dateStr;
                      const year = parseInt(parts[0], 10);
                      const month = parseInt(parts[1], 10) - 1;
                      const day = parseInt(parts[2], 10);
                      const date = new Date(year, month, day);
                      const days = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
                      const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
                      return `${days[date.getDay()]}, ${day} ${months[month]}`;
                    } catch (e) {
                      return dateStr;
                    }
                  })()}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Feather name="clock" size={15} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.orangeSummaryText}>
                  {selectedSubasta.hora ? selectedSubasta.hora.slice(0, 5) + ' hs' : '18:00 hs'}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather name="user" size={15} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.orangeSummaryText}>
                  Rematador: Martín Rodriguez
                </Text>
              </View>

              <View style={styles.orangeSummaryBadge}>
                <Text style={styles.orangeSummaryBadgeText}>
                  {selectedSubasta.categoria === 'oro' ? 'Gold' : selectedSubasta.categoria === 'platino' ? 'Platino' : selectedSubasta.categoria.toUpperCase()}
                </Text>
              </View>
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
              <Feather name="package" size={40} color={COLORS.lightGray200} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTextTitle}>Sin artículos en esta subasta</Text>
              <Text style={styles.emptyTextSubtitle}>No hay productos asignados para este catálogo.</Text>
            </View>
          ) : (
            <FlatList
              data={filteredAuctions}
              keyExtractor={(item) => item.identificador.toString()}
              renderItem={({ item }) => (
                <AuctionCard auction={item} onBidPress={onBidPress} isGuest={isGuest} />
              )}
              contentContainerStyle={[styles.listContainer, { paddingHorizontal: 20, paddingTop: 20 }]}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={COLORS.primary}
                  colors={[COLORS.primary]}
                />
              }
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  bellButton: {
    position: 'relative',
    padding: 8,
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
  tabLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.lightGray200,
    marginTop: 12,
    fontSize: FONTS.sizeBase,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
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
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
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
  orangeHeaderContainer: {
    backgroundColor: '#C26700',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backCatalogButton: {
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
  orangeHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 16,
  },
  orangeSummaryCard: {
    backgroundColor: '#FF8C00',
    borderRadius: 16,
    padding: 16,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  orangeSummaryTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
    marginRight: 80,
  },
  orangeSummaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  orangeSummaryBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#E2F900', 
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 14,
    transform: [{ skewX: '-12deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  orangeSummaryBadgeText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  categoryFilterContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryFilterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.darkGray500,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryFilterPillActive: {
    backgroundColor: 'rgba(255, 140, 0, 0.08)',
    borderColor: COLORS.secondary,
  },
  categoryFilterPillText: {
    color: COLORS.lightGray200,
    fontSize: 12,
    fontWeight: '700',
  },
  categoryFilterPillTextActive: {
    color: COLORS.secondary,
  },
});
