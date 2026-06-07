import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, SHADOWS } from '../styles/theme';

export default function Logo({ size = 'medium' }) {
  const isLarge = size === 'large';
  const isSmall = size === 'small';

  const titleSize = isLarge ? 34 : isSmall ? 18 : 24;
  const iconSize = isLarge ? 38 : isSmall ? 20 : 26;

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, SHADOWS.glow, { width: iconSize * 1.5, height: iconSize * 1.5, borderRadius: iconSize * 0.75 }]}>
        <Text style={[styles.iconText, { fontSize: iconSize }]}>🔨</Text>
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.logoText, { fontSize: titleSize }]}>
          Puja<Text style={styles.highlightText}>Ya!</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  iconText: {
    color: COLORS.white,
    // Add offset for hammer rotation visual center
    transform: [{ rotate: '-15deg' }],
  },
  textContainer: {
    justifyContent: 'center',
  },
  logoText: {
    color: COLORS.white,
    fontWeight: FONTS.weightExtraBold,
    letterSpacing: -0.5,
  },
  highlightText: {
    color: COLORS.secondary, // Orange highlight
  },
});
