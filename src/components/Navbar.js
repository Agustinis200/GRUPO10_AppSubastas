import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform, Alert } from 'react-native';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../styles/theme';

export default function Navbar({ activeTab, setActiveTab, onUploadPress, isGuest }) {
  const handleTabPress = (tabName, action) => {
    if (isGuest && ['upload', 'articulos', 'perfil'].includes(tabName)) {
      Alert.alert(
        'Acceso Restringido',
        'Debes iniciar sesión para poder acceder a esta funcionalidad.',
        [{ text: 'Entendido' }]
      );
      return;
    }
    if (action) {
      action();
    } else {
      setActiveTab(tabName);
    }
  };

  return (
    <View style={styles.navbar}>
      <TouchableOpacity 
        style={styles.navItem} 
        onPress={() => handleTabPress('home')}
      >
        <Feather name="home" size={20} color={activeTab === 'home' ? COLORS.secondary : COLORS.lightGray200} />
        <Text style={[styles.navText, activeTab === 'home' && styles.activeNavText]}>Home</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.navItem} 
        onPress={() => handleTabPress('subastas')}
      >
        <FontAwesome5 name="gavel" size={18} color={activeTab === 'subastas' ? COLORS.secondary : COLORS.lightGray200} />
        <Text style={[styles.navText, activeTab === 'subastas' && styles.activeNavText]}>Subastas</Text>
      </TouchableOpacity>

      {/* Middle Plus Button */}
      <TouchableOpacity 
        style={styles.middleNavItem} 
        onPress={() => handleTabPress('upload', onUploadPress)}
      >
        <View style={[styles.plusButton, SHADOWS.glow]}>
          <Text style={styles.plusButtonText}>+</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.navItem} 
        onPress={() => handleTabPress('articulos')}
      >
        <Feather name="package" size={20} color={activeTab === 'articulos' ? COLORS.secondary : COLORS.lightGray200} />
        <Text style={[styles.navText, activeTab === 'articulos' && styles.activeNavText]}>Artículos</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.navItem} 
        onPress={() => handleTabPress('perfil')}
      >
        <Feather name="user" size={20} color={activeTab === 'perfil' ? COLORS.secondary : COLORS.lightGray200} />
        <Text style={[styles.navText, activeTab === 'perfil' && styles.activeNavText]}>Perfil</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 65,
    backgroundColor: COLORS.darkGray500,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: Platform.OS === 'ios' ? 12 : 4,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '18%',
  },
  navText: {
    fontSize: 10,
    color: COLORS.lightGray200,
    marginTop: 2,
    fontWeight: '700',
  },
  activeNavText: {
    color: COLORS.secondary,
  },
  middleNavItem: {
    width: '18%',
    alignItems: 'center',
    justifyContent: 'center',
    top: -6, 
  },
  plusButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.glow,
  },
  plusButtonText: {
    color: COLORS.textWhite,
    fontSize: 28,
    fontWeight: '300',
    top: -1, 
  },
});
