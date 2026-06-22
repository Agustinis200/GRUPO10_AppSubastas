import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Alert, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, FONTS, SHADOWS } from '../styles/theme';
import { apiService } from '../api/apiService';

export default function SupportChatScreen({ userProfile, setActiveTab }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [techId, setTechId] = useState(1); // Default support ID

  const scrollRef = useRef(null);

  useEffect(() => {
    loadSupportTechnician();
  }, []);

  useEffect(() => {
    let interval;
    if (userProfile && techId) {
      fetchMessages();
      interval = setInterval(fetchMessages, 3000);
    }
    return () => clearInterval(interval);
  }, [userProfile, techId]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const loadSupportTechnician = async () => {
    try {
      const technicianId = await apiService.getSupportTechnicianId();
      setTechId(technicianId);
    } catch (err) {
      console.warn('[SupportChat] Support tech fetch error, using fallback 1:', err);
    }
  };

  const fetchMessages = async () => {
    if (!userProfile || !techId) return;
    try {
      const data = await apiService.getChatMessages(userProfile.identificador, techId);
      setMessages(data || []);
      setLoading(false);
      // Mark technician messages to me as read
      await apiService.markMessagesAsRead(techId, userProfile.identificador);
    } catch (err) {
      console.warn('[SupportChat] Messages fetch error:', err.message);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !userProfile || !techId) return;
    setSending(true);
    try {
      await apiService.sendChatMessage(userProfile.identificador, techId, newMessage.trim());
      setNewMessage('');
      fetchMessages();
    } catch (err) {
      Alert.alert('Error', 'No se pudo enviar el mensaje.');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <TouchableOpacity 
            onPress={() => setActiveTab('perfil')} 
            style={styles.backButton}
          >
            <Feather name="arrow-left" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.headerTitle}>Soporte Técnico</Text>
            <Text style={styles.headerSubtitle}>Resolución de Objetos y Consultas</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 90}
      >
        {loading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color={COLORS.secondary} />
            <Text style={styles.loaderText}>Conectando con soporte...</Text>
          </View>
        ) : (
          <ScrollView 
            ref={scrollRef}
            style={styles.messageScroll}
            contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          >
            {messages.length === 0 ? (
              <View style={styles.welcomeBox}>
                <Feather name="message-square" size={32} color={COLORS.secondary} style={{ marginBottom: 10 }} />
                <Text style={styles.welcomeTitle}>¡Hola! ¿En qué podemos ayudarte?</Text>
                <Text style={styles.welcomeText}>
                  Escríbenos tu duda sobre algún objeto subido, envío o cualquier inconveniente técnico, y un revisor se comunicará contigo por aquí.
                </Text>
              </View>
            ) : (
              messages.map((msg, idx) => {
                const isMe = msg.remitente === userProfile.identificador;
                return (
                  <View 
                    key={msg.identificador || idx} 
                    style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}
                  >
                    <Text style={[styles.bubbleText, isMe ? styles.textMe : styles.textOther]}>
                      {msg.mensaje}
                    </Text>
                    <Text style={[styles.timeText, isMe ? styles.timeMe : styles.timeOther]}>
                      {new Date(msg.fechacreacion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}

        {/* Input panel */}
        <View style={styles.inputPanel}>
          <TextInput
            style={styles.textInput}
            placeholder="Escribe tu mensaje..."
            placeholderTextColor={COLORS.lightGray200}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendButton, !newMessage.trim() && styles.disabledButton]}
            onPress={handleSendMessage}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Feather name="send" size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.darkGray600,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    ...SHADOWS.glow,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 40,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.orangeGlow,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    marginTop: 1,
  },
  loaderBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    color: COLORS.lightGray200,
    marginTop: 12,
    fontSize: FONTS.sizeBase,
  },
  messageScroll: {
    flex: 1,
    backgroundColor: COLORS.darkGray600,
  },
  welcomeBox: {
    backgroundColor: COLORS.darkGray500,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  welcomeTitle: {
    color: COLORS.white,
    fontSize: FONTS.sizeBase + 1,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeText: {
    color: COLORS.lightGray100,
    fontSize: FONTS.sizeBase,
    textAlign: 'center',
    lineHeight: 18,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  bubbleMe: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 2,
  },
  bubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.darkGray500,
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 18,
  },
  textMe: {
    color: '#FFFFFF',
  },
  textOther: {
    color: COLORS.white,
  },
  timeText: {
    fontSize: 9,
    marginTop: 4,
    textAlign: 'right',
  },
  timeMe: {
    color: 'rgba(255, 255, 255, 0.65)',
  },
  timeOther: {
    color: COLORS.lightGray200,
  },
  inputPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkGray500,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: 12,
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.darkGray600,
    color: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    ...SHADOWS.orangeGlow,
  },
  disabledButton: {
    backgroundColor: COLORS.lightGray200,
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
});
