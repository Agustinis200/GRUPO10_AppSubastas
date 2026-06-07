import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator 
} from 'react-native';
import { apiService } from '../api/apiService';
import { COLORS, FONTS, SHADOWS } from '../styles/theme';

export default function NotificationCenterModal({ visible, userId, onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && userId) {
      fetchNotifications();
    }
  }, [visible, userId]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await apiService.getUserNotifications(userId);
      setNotifications(data || []);
    } catch (e) {
      console.warn('[NotificationCenterModal] Error loading notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await apiService.markNotificationAsRead(id);
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.identificador === id ? { ...n, leido: 'si' } : n)
      );
    } catch (e) {
      console.warn('[NotificationCenterModal] Error marking read:', e);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>🔔 Notificaciones</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* List */}
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
          ) : notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>No tienes notificaciones en este momento.</Text>
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(item, index) => (item.identificador || index).toString()}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const isUnread = item.leido !== 'si';
                return (
                  <TouchableOpacity 
                    style={[styles.notificationCard, isUnread && styles.unreadCard]}
                    onPress={() => isUnread && handleMarkAsRead(item.identificador)}
                    activeOpacity={isUnread ? 0.7 : 1}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.titleRow}>
                        {isUnread && <View style={styles.unreadDot} />}
                        <Text style={[styles.notificationTitle, isUnread && styles.unreadTitle]}>
                          {item.titulo}
                        </Text>
                      </View>
                      <Text style={styles.dateText}>
                        {new Date(item.fechacreacion).toLocaleDateString([], { day: 'numeric', month: 'short' })}
                      </Text>
                    </View>
                    <Text style={styles.messageText}>{item.mensaje}</Text>
                    {isUnread && (
                      <Text style={styles.markAsReadHint}>Marcar como leída</Text>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </View>
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
    backgroundColor: COLORS.darkGray500,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    height: '75%',
    borderWidth: 1,
    borderColor: COLORS.border,
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
    fontSize: FONTS.sizeXl,
    fontWeight: FONTS.weightExtraBold,
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
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeBase,
    textAlign: 'center',
  },
  listContent: {
    padding: 20,
  },
  notificationCard: {
    backgroundColor: COLORS.darkGray600,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  unreadCard: {
    borderColor: 'rgba(10, 92, 255, 0.3)',
    backgroundColor: 'rgba(10, 92, 255, 0.03)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginRight: 8,
  },
  notificationTitle: {
    color: COLORS.lightGray100,
    fontSize: FONTS.sizeBase,
    fontWeight: FONTS.weightMedium,
    flex: 1,
  },
  unreadTitle: {
    color: COLORS.white,
    fontWeight: FONTS.weightBold,
  },
  dateText: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeSm,
    marginLeft: 8,
  },
  messageText: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeMd,
    lineHeight: 18,
  },
  markAsReadHint: {
    color: COLORS.primary,
    fontSize: FONTS.sizeSm,
    fontWeight: FONTS.weightBold,
    marginTop: 8,
    textAlign: 'right',
  },
});
