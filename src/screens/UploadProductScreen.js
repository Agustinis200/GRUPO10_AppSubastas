import React from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ActivityIndicator, Switch } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, FONTS, SHADOWS } from '../styles/theme';

export default function UploadProductScreen({
  uploadTitle,
  setUploadTitle,
  uploadDesc,
  setUploadDesc,
  uploadMoneda,
  setUploadMoneda,
  uploadPhotos,
  setUploadPhotos,
  uploadDocPhoto,
  uploadHistory,
  setUploadHistory,
  uploadContext,
  setUploadContext,
  acceptUploadTerms,
  setAcceptUploadTerms,
  uploadLoading,
  errorMessage,
  successMessage,
  handleUploadProduct,
  openPhotoSourceSelector,
  unreadNotifCount,
  onShowNotifications,
  hasHistoricalInfo,
  setHasHistoricalInfo,
  uploadArtista,
  setUploadArtista,
  uploadAnio,
  setUploadAnio,
  uploadContextoHist,
  setUploadContextoHist
}) {
  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 90}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <View style={styles.uploadHeader}>
            <Text style={styles.headerTitle}>Subir Producto</Text>
            <Text style={styles.headerSubtitle}>Registra un artículo para subasta</Text>
          </View>
          <TouchableOpacity onPress={onShowNotifications} style={styles.bellButton}>
            <Feather name="bell" size={22} color={COLORS.white} />
            {unreadNotifCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadNotifCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

          {/* Warning Banner explaining Proceso de Evaluación */}
          <View style={styles.evaluationBanner}>
            <Feather name="info" size={16} color={COLORS.secondary} style={{ marginRight: 8, marginTop: 2 }} />
            <Text style={styles.evaluationBannerText}>
              <Text style={{ fontWeight: 'bold' }}>Proceso de evaluación:</Text> Al subir el artículo, entrará en una etapa de revisión técnica donde se estimará su precio base y comisión de subasta.
            </Text>
          </View>

          <Text style={styles.inputLabel}>Título del Producto</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: iPhone 15 Pro Max 256GB"
            placeholderTextColor={COLORS.lightGray200}
            value={uploadTitle}
            onChangeText={setUploadTitle}
          />

          <Text style={styles.inputLabel}>Descripción del Artículo</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Detalles, estado físico, caja, accesorios..."
            placeholderTextColor={COLORS.lightGray200}
            value={uploadDesc}
            onChangeText={setUploadDesc}
            multiline
            numberOfLines={3}
          />

          <Text style={styles.inputLabel}>Moneda de Referencia</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
            {[
              { key: 'ARS', label: 'ARS (Pesos)' },
              { key: 'USD', label: 'USD (Dólares)' }
            ].map((m) => {
              const isSelected = uploadMoneda === m.key;
              return (
                <TouchableOpacity
                  key={m.key}
                  style={{ 
                    flex: 0.48, 
                    height: 40, 
                    borderRadius: 12, 
                    borderWidth: 1, 
                    borderColor: isSelected ? COLORS.secondary : COLORS.border, 
                    backgroundColor: isSelected ? 'rgba(255, 140, 0, 0.08)' : COLORS.darkGray600,
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onPress={() => setUploadMoneda(m.key)}
                >
                  <Text style={{ color: isSelected ? COLORS.secondary : COLORS.lightGray200, fontWeight: 'bold', fontSize: 13 }}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Toggle for Historical Info */}
          <View style={styles.toggleCard}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather name="file-text" size={16} color={COLORS.secondary} style={{ marginRight: 6 }} />
                <Text style={styles.toggleCardTitle}>Información Histórica (Opcional)</Text>
              </View>
              <Text style={styles.toggleCardSubtitle}>
                Añade información sobre el artista, año, procedencia para aumentar valor
              </Text>
            </View>
            <Switch
              value={hasHistoricalInfo}
              onValueChange={setHasHistoricalInfo}
              trackColor={{ false: COLORS.lightGray100, true: COLORS.secondary }}
              thumbColor={Platform.OS === 'android' ? COLORS.white : ''}
            />
          </View>

          {/* Conditional inputs */}
          {hasHistoricalInfo && (
            <View style={styles.historicalFieldsContainer}>
              <Text style={styles.inputLabel}>Artista / Diseñador</Text>
              <TextInput
                style={styles.input}
                placeholder="Nombre del creador"
                placeholderTextColor={COLORS.lightGray200}
                value={uploadArtista}
                onChangeText={setUploadArtista}
              />

              <Text style={styles.inputLabel}>Año / Período</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: 1965, Siglo XIX, etc."
                placeholderTextColor={COLORS.lightGray200}
                value={uploadAnio}
                onChangeText={setUploadAnio}
              />

              <Text style={styles.inputLabel}>Historia del Producto</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Origen, dueños anteriores, hechos históricos notables..."
                placeholderTextColor={COLORS.lightGray200}
                value={uploadHistory}
                onChangeText={setUploadHistory}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.inputLabel}>Contexto de Adquisición y Conservación</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Cómo se obtuvo, estado actual, detalles de conservación..."
                placeholderTextColor={COLORS.lightGray200}
                value={uploadContext}
                onChangeText={setUploadContext}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.inputLabel}>Contexto Histórico</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Historia, procedencia, exposiciones previas, certificaciones..."
                placeholderTextColor={COLORS.lightGray200}
                value={uploadContextoHist}
                onChangeText={setUploadContextoHist}
                multiline
                numberOfLines={3}
              />
            </View>
          )}

          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={styles.inputLabel}>Fotos del Producto ({uploadPhotos.length} de 6 mín.)</Text>
              {uploadPhotos.length < 10 && (
                <TouchableOpacity 
                  style={styles.addPhotoMiniButton} 
                  onPress={() => openPhotoSourceSelector('product')}
                >
                  <Text style={styles.addPhotoMiniButtonText}>+ Agregar</Text>
                </TouchableOpacity>
              )}
            </View>

            {uploadPhotos.length === 0 ? (
              <TouchableOpacity 
                style={styles.photoUploadBox} 
                onPress={() => openPhotoSourceSelector('product')}
              >
                <View style={styles.photoPlaceholder}>
                  <Feather name="image" size={32} color={COLORS.lightGray200} style={{ marginBottom: 6 }} />
                  <Text style={styles.photoPlaceholderLabel}>Seleccionar Mínimo 6 Fotos</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalPhotosScroll}>
                {uploadPhotos.map((item, idx) => (
                  <View key={idx.toString()} style={styles.photoScrollItem}>
                    <Image source={{ uri: item.uri }} style={styles.photoScrollImage} />
                    <TouchableOpacity 
                      style={styles.deletePhotoBadge}
                      onPress={() => {
                        setUploadPhotos(prev => prev.filter((_, i) => i !== idx));
                      }}
                    >
                      <Feather name="x" size={10} color={COLORS.textWhite} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          <Text style={styles.inputLabel}>Documento de Origen (Opcional - PNG, JPG, PDF)</Text>
          <TouchableOpacity 
            style={styles.photoUploadBox} 
            onPress={() => openPhotoSourceSelector('document')}
          >
            {uploadDocPhoto ? (
              <View style={{ flex: 1, position: 'relative' }}>
                <Image source={{ uri: uploadDocPhoto.uri }} style={styles.uploadedThumbnail} />
                <View style={styles.docCheckOverlay}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <Feather name="check" size={14} color={COLORS.textWhite} style={{ marginRight: 6 }} />
                    <Text style={styles.docCheckOverlayText}>Documento Cargado (PNG/JPG/PDF)</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.photoPlaceholder}>
                <Feather name="file-text" size={32} color={COLORS.lightGray200} style={{ marginBottom: 6 }} />
                <Text style={styles.photoPlaceholderLabel}>Subir Documento (Opcional)</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.checkboxContainer} 
            onPress={() => setAcceptUploadTerms(!acceptUploadTerms)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, acceptUploadTerms && styles.checkboxChecked]}>
              {acceptUploadTerms && <Feather name="check" size={12} color={COLORS.textWhite} />}
            </View>
            <Text style={styles.checkboxLabel}>
              Acepto que los datos y documentos provistos son reales y autorizo la revisión del artículo.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.submitButton, (uploadLoading || !acceptUploadTerms || uploadPhotos.length < 6) && styles.disabledButton]}
            onPress={handleUploadProduct}
            disabled={uploadLoading || !acceptUploadTerms || uploadPhotos.length < 6}
          >
            {uploadLoading ? (
              <ActivityIndicator color={COLORS.textWhite} />
            ) : (
              <Text style={styles.submitButtonText}>Publicar Artículo</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  uploadHeader: {
    paddingTop: 16,
    marginBottom: 16,
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
  card: {
    backgroundColor: COLORS.darkGray500,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.default,
  },
  inputLabel: {
    color: COLORS.white,
    fontSize: FONTS.sizeMd,
    fontWeight: FONTS.weightMedium,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: COLORS.darkGray600,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    color: COLORS.white,
    paddingHorizontal: 16,
    height: 48,
    fontSize: FONTS.sizeBase,
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  photoUploadBox: {
    backgroundColor: COLORS.darkGray600,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    height: 140,
    overflow: 'hidden',
    marginBottom: 20,
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderLabel: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeMd,
  },
  uploadedThumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  horizontalPhotosScroll: {
    paddingVertical: 4,
  },
  photoScrollItem: {
    position: 'relative',
    marginRight: 12,
  },
  photoScrollImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  deletePhotoBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.textWhite,
  },
  addPhotoMiniButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  addPhotoMiniButtonText: {
    color: COLORS.textWhite,
    fontSize: 10,
    fontWeight: 'bold',
  },
  docCheckOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(16, 185, 129, 0.85)',
    paddingVertical: 6,
    alignItems: 'center',
  },
  docCheckOverlayText: {
    color: COLORS.textWhite,
    fontSize: FONTS.sizeSm,
    fontWeight: 'bold',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxLabel: {
    color: COLORS.lightGray100,
    fontSize: FONTS.sizeSm,
    flex: 1,
    lineHeight: 16,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.glow,
  },
  disabledButton: {
    backgroundColor: COLORS.lightGray200,
  },
  submitButtonText: {
    color: COLORS.textWhite,
    fontSize: FONTS.sizeLg,
    fontWeight: FONTS.weightBold,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: FONTS.sizeBase,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  successText: {
    color: COLORS.success,
    fontSize: FONTS.sizeBase,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  evaluationBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 140, 0, 0.08)',
    borderColor: 'rgba(255, 140, 0, 0.2)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  evaluationBannerText: {
    color: COLORS.secondary,
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.darkGray600,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  toggleCardTitle: {
    color: COLORS.white,
    fontSize: FONTS.sizeBase,
    fontWeight: FONTS.weightMedium,
  },
  toggleCardSubtitle: {
    color: COLORS.lightGray200,
    fontSize: FONTS.sizeSm,
    marginTop: 4,
    lineHeight: 16,
  },
  historicalFieldsContainer: {
    marginTop: 4,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.secondary,
    paddingLeft: 16,
    marginBottom: 16,
  },
});
