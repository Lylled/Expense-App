import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { usePersistedChoice } from '@/hooks/use-persisted-choice';
import { useTheme } from '@/hooks/use-theme';
import {
  RECEIPT_STORAGE_LABELS,
  RECEIPT_STORAGE_MODES,
  RECEIPT_STORAGE_STORAGE_KEY,
  deleteReceiptPhoto,
  listReceiptPhotos,
  type ReceiptStorageMode,
  type SavedReceiptPhoto,
} from '@/lib/receipt-storage';
import { supabase } from '@/lib/supabase';

export default function SettingsReceiptsScreen() {
  const theme = useTheme();
  const [receiptStorageMode, setReceiptStorageMode] = usePersistedChoice(
    RECEIPT_STORAGE_STORAGE_KEY,
    RECEIPT_STORAGE_MODES,
    'none'
  );
  const [photos, setPhotos] = useState<SavedReceiptPhoto[]>([]);
  const [viewingUri, setViewingUri] = useState<string | null>(null);

  // Independent of the current storage mode selection - photos saved while
  // "Sovelluksen muisti" was active stay listed here even after switching
  // away from it.
  useFocusEffect(
    useCallback(() => {
      setPhotos(listReceiptPhotos());
    }, [])
  );

  async function handleDeletePhoto(uri: string) {
    deleteReceiptPhoto(uri);
    setPhotos((current) => current.filter((photo) => photo.uri !== uri));

    // Any expense that pointed to this photo would otherwise show a 📷
    // button for an image that no longer exists.
    await supabase.from('expenses').update({ receipt_photo_uri: null }).eq('receipt_photo_uri', uri);
  }

  function confirmDeletePhoto(uri: string) {
    Alert.alert('Poista kuittikuva', 'Tätä ei voi perua.', [
      { text: 'Peruuta', style: 'cancel' },
      { text: 'Poista', style: 'destructive', onPress: () => handleDeletePhoto(uri) },
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Pressable onPress={() => router.back()} style={styles.closeButton} hitSlop={Spacing.two}>
          <ThemedText type="link">Sulje</ThemedText>
        </Pressable>

        <ThemedText type="title" style={styles.title}>
          Kuittikuvat
        </ThemedText>

        <ThemedView type="backgroundElement" style={styles.section}>
          <ThemedText type="small" themeColor="textSecondary">
            Minne kuitista otettu kuva tallennetaan kuvauksen jälkeen.
          </ThemedText>
          <View style={styles.chipRow}>
            {(Object.keys(RECEIPT_STORAGE_LABELS) as ReceiptStorageMode[]).map((option) => (
              <Pressable
                key={option}
                onPress={() => setReceiptStorageMode(option)}
                style={[
                  styles.chip,
                  {
                    backgroundColor:
                      receiptStorageMode === option ? theme.backgroundSelected : theme.background,
                  },
                ]}>
                <ThemedText type="small">{RECEIPT_STORAGE_LABELS[option]}</ThemedText>
              </Pressable>
            ))}
          </View>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.section}>
          <ThemedText type="smallBold">Tallennetut kuittikuvat ({photos.length})</ThemedText>
          {photos.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              Ei tallennettuja kuittikuvia.
            </ThemedText>
          ) : (
            <View style={styles.photoGrid}>
              {photos.map((photo) => (
                <View key={photo.uri} style={styles.photoTile}>
                  <Pressable onPress={() => setViewingUri(photo.uri)}>
                    <Image source={{ uri: photo.uri }} style={styles.photoThumbnail} contentFit="cover" />
                  </Pressable>
                  <Pressable
                    onPress={() => confirmDeletePhoto(photo.uri)}
                    style={styles.photoDeleteButton}
                    hitSlop={Spacing.two}>
                    <ThemedText type="small" style={styles.photoDeleteText}>
                      ✕
                    </ThemedText>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </ThemedView>
      </SafeAreaView>

      <Modal
        visible={viewingUri !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setViewingUri(null)}>
        <Pressable style={styles.backdrop} onPress={() => setViewingUri(null)}>
          {viewingUri && (
            <Image source={{ uri: viewingUri }} style={styles.fullImage} contentFit="contain" />
          )}
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.three,
    alignSelf: 'center',
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  closeButton: {
    alignSelf: 'flex-start',
  },
  title: {
    textAlign: 'center',
  },
  section: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  photoTile: {
    width: 90,
    height: 90,
  },
  photoThumbnail: {
    width: 90,
    height: 90,
    borderRadius: Spacing.two,
  },
  photoDeleteButton: {
    position: 'absolute',
    top: -Spacing.one,
    right: -Spacing.one,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#D64545',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoDeleteText: {
    color: '#ffffff',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
  },
  fullImage: {
    width: '100%',
    height: '90%',
  },
});
