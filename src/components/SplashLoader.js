import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { COLORS, FONTS } from '../styles/theme';

const splashIcon = require('../../assets/splash-icon.png');

export default function SplashLoader({ statusText = 'Iniciando PujaYa!...' }) {
  const pulseAnim = useRef(new Animated.Value(0.85)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const dot1Y = useRef(new Animated.Value(0)).current;
  const dot2Y = useRef(new Animated.Value(0)).current;
  const dot3Y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

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

    const animateDot = (value) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: -12,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    const t1 = setTimeout(() => animateDot(dot1Y), 0);
    const t2 = setTimeout(() => animateDot(dot2Y), 150);
    const t3 = setTimeout(() => animateDot(dot3Y), 300);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [pulseAnim, fadeAnim, dot1Y, dot2Y, dot3Y]);

  return (
    <View style={styles.container}>
      <View style={[styles.blurCircle, styles.circleLeft]} />
      <View style={[styles.blurCircle, styles.circleRight]} />

      <Animated.View style={[styles.logoWrapper, { opacity: fadeAnim, transform: [{ scale: pulseAnim }] }]}>
        <Image source={splashIcon} style={styles.splashImage} />
      </Animated.View>

      <View style={styles.loaderWrapper}>
        <View style={styles.dotsContainer}>
          <Animated.View style={[styles.dot, { transform: [{ translateY: dot1Y }] }]} />
          <Animated.View style={[styles.dot, { transform: [{ translateY: dot2Y }] }]} />
          <Animated.View style={[styles.dot, { transform: [{ translateY: dot3Y }] }]} />
        </View>
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
    overflow: 'hidden',
  },
  blurCircle: {
    position: 'absolute',
    borderRadius: 200,
    opacity: 0.12,
  },
  circleLeft: {
    width: 350,
    height: 350,
    backgroundColor: COLORS.primary,
    top: -100,
    left: -120,
  },
  circleRight: {
    width: 300,
    height: 300,
    backgroundColor: COLORS.secondary,
    bottom: -80,
    right: -100,
  },
  logoWrapper: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 10,
    marginBottom: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashImage: {
    width: 160,
    height: 160,
    resizeMode: 'contain',
  },
  loaderWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 30,
    marginBottom: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
    marginHorizontal: 5,
  },
  statusText: {
    color: COLORS.lightGray100,
    marginTop: 14,
    fontSize: FONTS.sizeBase + 1,
    fontWeight: FONTS.weightMedium,
    letterSpacing: 0.5,
  },
  footerText: {
    position: 'absolute',
    bottom: 24,
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeSm,
    opacity: 0.5,
  },
});
