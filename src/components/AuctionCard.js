import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { COLORS, FONTS, SHADOWS } from '../styles/theme';

const CATEGORY_METADATA = {
  comun: { label: 'Común', color: '#8E8E93' },      // Light Gray 200
  especial: { label: 'Especial', color: '#9B5DE5' },  // Violet
  plata: { label: 'Plata', color: '#A0AEC0' },     // Muted Silver
  oro: { label: 'Oro', color: '#FFB703' },         // Gold
  platino: { label: 'Platino', color: '#00F5D4' }   // Cyan/Neon
};

export default function AuctionCard({ auction, onBidPress }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(auction.ends_at) - +new Date();
      if (difference <= 0) {
        setTimeLeft('Finalizada');
        setIsUrgent(false);
        return;
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      if (hours < 2) {
        setIsUrgent(true);
      } else {
        setIsUrgent(false);
      }

      let formatted = '';
      if (hours > 0) {
        formatted += `${hours}h `;
      }
      formatted += `${minutes}m ${seconds}s`;
      setTimeLeft(formatted);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [auction.ends_at]);

  const catMeta = CATEGORY_METADATA[auction.categoria] || { label: auction.categoria, color: COLORS.primary };

  return (
    <View style={styles.card}>
      <Image source={{ uri: auction.producto.image_url }} style={styles.image} />
      
      <View style={[styles.categoryBadge, { backgroundColor: catMeta.color }]}>
        <Text style={styles.categoryText}>{catMeta.label}</Text>
      </View>

      {auction.en_vivo && (
        <View style={styles.liveBadge}>
          <Text style={styles.liveText}>● EN VIVO</Text>
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>{auction.producto.titulo}</Text>
        <Text style={styles.seller}>Por {auction.producto.seller_name || 'Vendedor'}</Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Precio Actual</Text>
            <Text style={styles.bidAmount}>${auction.precio_actual.toLocaleString()}</Text>
          </View>
          <View style={[styles.statBox, styles.rightStat]}>
            <Text style={styles.statLabel}>Ofertas</Text>
            <Text style={styles.statValue}>{auction.bid_count}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.timerContainer}>
            <Text style={styles.statLabel}>Tiempo Restante</Text>
            <Text style={[styles.timerText, isUrgent && styles.urgentText]}>
              {timeLeft}
            </Text>
          </View>

          <TouchableOpacity 
            style={[styles.bidButton, timeLeft === 'Finalizada' && styles.disabledButton]}
            onPress={() => onBidPress(auction)}
            disabled={timeLeft === 'Finalizada'}
          >
            <Text style={styles.bidButtonText}>Pujar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.darkGray500,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.default,
  },
  image: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  categoryBadge: {
    position: 'absolute',
    top: 15,
    left: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  categoryText: {
    color: '#0F0F1A',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  liveBadge: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: COLORS.danger,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  liveText: {
    color: COLORS.textWhite,
    fontSize: 10,
    fontWeight: '800',
  },
  content: {
    padding: 20,
  },
  title: {
    color: COLORS.white,
    fontSize: FONTS.sizeXl,
    fontWeight: FONTS.weightBold,
    marginBottom: 4,
  },
  seller: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeMd,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.borderMuted,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statBox: {
    flex: 1,
  },
  rightStat: {
    alignItems: 'flex-end',
  },
  statLabel: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeSm,
    textTransform: 'uppercase',
    fontWeight: FONTS.weightMedium,
    marginBottom: 4,
  },
  bidAmount: {
    color: COLORS.secondary, // Naranja
    fontSize: FONTS.sizeXl,
    fontWeight: FONTS.weightExtraBold,
  },
  statValue: {
    color: COLORS.white,
    fontSize: FONTS.sizeLg,
    fontWeight: FONTS.weightBold,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timerContainer: {
    flex: 1,
  },
  timerText: {
    color: COLORS.success,
    fontSize: FONTS.sizeBase,
    fontWeight: FONTS.weightBold,
  },
  urgentText: {
    color: COLORS.danger,
  },
  bidButton: {
    backgroundColor: COLORS.primary, // Azul Cobalto
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    ...SHADOWS.glow,
  },
  disabledButton: {
    backgroundColor: COLORS.textDisabled,
    shadowOpacity: 0,
    elevation: 0,
  },
  bidButtonText: {
    color: COLORS.textWhite,
    fontWeight: FONTS.weightBold,
    fontSize: FONTS.sizeBase,
  },
});
