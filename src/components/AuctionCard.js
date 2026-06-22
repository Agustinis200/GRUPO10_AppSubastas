import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { COLORS, FONTS, SHADOWS } from '../styles/theme';
import { Feather } from '@expo/vector-icons';
import { isSubastaClosed, isSubastaNotStarted } from '../api/supabaseService';

export default function AuctionCard({ auction, onBidPress, isGuest }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      if (auction.subasta_terminada) {
        setTimeLeft('Subasta terminada');
        return;
      }

      if (auction.subastado === 'si') {
        setTimeLeft('Objeto subastado');
        return;
      }

      const notStarted = auction.estado !== 'abierta' && isSubastaNotStarted(auction.fecha, auction.hora);
      if (notStarted) {
        setTimeLeft('No iniciada');
        return;
      }

      if (auction.estado === 'bloqueada' || auction.is_locked) {
        setTimeLeft('Bloqueada');
        return;
      }

      const isClosed = auction.estado !== 'abierta' && (auction.estado === 'cerrada' || auction.estado === 'carrada' || isSubastaClosed(auction.fecha, auction.hora));
      if (isClosed) {
        setTimeLeft('Cerrada');
        return;
      }

      const difference = +new Date(auction.ends_at) - +new Date();
      if (difference <= 0) {
        setTimeLeft('Cerrada');
        return;
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference / (1000 * 60)) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      const pad = (num) => String(num).padStart(2, '0');

      let formatted = '';
      if (hours > 0) {
        formatted += `${hours}h `;
      }
      formatted += `${pad(minutes)}min ${pad(seconds)}s`;
      setTimeLeft(formatted);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [auction.ends_at, auction.fecha, auction.hora, auction.estado, auction.is_locked, auction.subasta_terminada, auction.subastado]);

  const moneda = auction.moneda || auction.producto?.moneda || 'ARS';
  const currencySymbol = moneda === 'USD' ? 'u$s ' : '$ ';

  const comision = auction.comision || ((auction.precio_actual || 0) * 0.1) || 3000;
  const nextMin = (auction.precio_actual || 0) + Math.max(100, Math.round(comision / 100) * 100);

  const priceDisplay = isGuest ? `${currencySymbol}***` : `${currencySymbol}${Number(auction.precio_actual || auction.preciobase || 0).toLocaleString('es-AR')}`;
  const nextMinDisplay = isGuest ? `${currencySymbol}***` : `${currencySymbol}${Number(nextMin).toLocaleString('es-AR')}`;

  const getTimerStyle = () => {
    if (timeLeft === 'Subasta terminada') {
      return { icon: 'check-circle', color: COLORS.lightGray200 };
    }
    if (timeLeft === 'Objeto subastado') {
      return { icon: 'check', color: COLORS.success };
    }
    if (timeLeft === 'Bloqueada') {
      return { icon: 'lock', color: COLORS.danger };
    }
    if (timeLeft === 'No iniciada') {
      return { icon: 'calendar', color: COLORS.primary };
    }
    if (timeLeft === 'Cerrada') {
      return { icon: 'x-circle', color: COLORS.lightGray200 };
    }
    return { icon: 'clock', color: COLORS.secondary };
  };

  const timerStyle = getTimerStyle();

  return (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => onBidPress(auction)}
      activeOpacity={0.8}
    >
      <View style={styles.row}>
        <Image source={{ uri: auction.producto.image_url }} style={styles.image} />
        
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>
            {auction.producto.titulo}
          </Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statColumn}>
              <Text style={styles.statLabel}>Precio base</Text>
              <Text style={styles.statValueBlue}>
                {priceDisplay}
              </Text>
            </View>
            
            <View style={[styles.statColumn, { alignItems: 'flex-end' }]}>
              <Text style={styles.statLabel}>Moneda</Text>
              <Text style={styles.statValueGray}>{moneda === 'USD' ? 'Dólar' : 'Peso'}</Text>
              
              <View style={styles.timerRow}>
                <Feather name={timerStyle.icon} size={14} color={timerStyle.color} style={{ marginRight: 4 }} />
                <Text style={[styles.timerText, { color: timerStyle.color }]}>{timeLeft}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
      
      <View style={styles.divider} />
      
      <Text style={styles.footerText}>
        {auction.bid_count} {auction.bid_count === 1 ? 'puja' : 'pujas'} - Mínima siguiente: {nextMinDisplay}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FFE0C2',
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  content: {
    flex: 1,
    marginLeft: 14,
  },
  title: {
    color: '#FF8C00',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statColumn: {
    flex: 0.5,
  },
  statLabel: {
    color: '#8E8E93',
    fontSize: 10,
    marginBottom: 2,
  },
  statValueBlue: {
    color: '#0A5CFF',
    fontSize: 16,
    fontWeight: '800',
  },
  statValueGray: {
    color: '#636366',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 6,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  timerText: {
    color: '#FF8C00',
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 10,
  },
  footerText: {
    color: '#3A3A3C',
    fontSize: 12,
    fontWeight: '600',
  },
});

