import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import Logo from './Logo';
import { COLORS, FONTS } from '../styles/theme';

export default function SplashLoader({ statusText = 'Iniciando PujaYa!...' }) {
  const pulseAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    // Pulse animation for logo branding
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.85,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoWrapper, { transform: [{ scale: pulseAnim }] }]}>
        <Logo size="large" />
      </Animated.View>
      
      <View style={styles.loaderWrapper}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.statusText}>{statusText}</Text>
      </View>

      <Text style={styles.footerText}>© 2026 Grupo 10. Todos los derechos reservados.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.darkGray600,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logoWrapper: {
    marginBottom: 48,
  },
  loaderWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    color: COLORS.lightGray200,
    marginTop: 16,
    fontSize: FONTS.sizeBase,
    fontWeight: FONTS.weightMedium,
    letterSpacing: 0.5,
  },
  footerText: {
    position: 'absolute',
    bottom: 24,
    color: 'rgba(0, 0, 0, 0.25)',
    fontSize: FONTS.sizeSm,
  },
});
