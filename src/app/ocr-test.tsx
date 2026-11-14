import TextRecognition from '@react-native-ml-kit/text-recognition';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Collapsible } from '@/components/ui/collapsible';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { parseReceipt, type ParsedReceipt } from '@/lib/parse-receipt';

type Status = 'idle' | 'recognizing' | 'done' | 'error';

/**
 * Some Android devices save the photo in the camera sensor's native (landscape)
 * orientation instead of rotating it to match the portrait-locked app, which then
 * makes the OCR read the receipt sideways. Detect that and rotate it back.
 */
async function correctLandscapeCapture(photo: { uri: string; width: number; height: number }) {
  if (photo.width <= photo.height) return photo.uri;

  const rotated = await ImageManipulator.manipulate(photo.uri).rotate(-90).renderAsync();
  const saved = await rotated.saveAsync({ compress: 1, format: SaveFormat.JPEG });
  return saved.uri;
}

export default function OcrTestScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const theme = useTheme();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [recognizedText, setRecognizedText] = useState('');
  const [parsed, setParsed] = useState<ParsedReceipt | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleCapture() {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      const uri = await correctLandscapeCapture(photo);
      setPhotoUri(uri);
      setStatus('recognizing');
      const result = await TextRecognition.recognize(uri);
      setRecognizedText(result.text);
      setParsed(parseReceipt(result));
      setStatus('done');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
      setStatus('error');
    }
  }

  function handleRetry() {
    setPhotoUri(null);
    setRecognizedText('');
    setParsed(null);
    setErrorMessage('');
    setStatus('idle');
  }

  const closeButton = (
    <Pressable onPress={() => router.back()} style={styles.closeButton} hitSlop={Spacing.two}>
      <ThemedText type="link">Sulje</ThemedText>
    </Pressable>
  );

  if (Platform.OS === 'web') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          {closeButton}
          <ThemedText type="subtitle">OCR-testi</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
            Tekstintunnistus käyttää Google ML Kitiä, joka toimii vain natiivissa
            Android- tai iOS-kehitysversiossa, ei webissä.
          </ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (!permission) {
    return <ThemedView style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          {closeButton}
          <ThemedText type="subtitle">Kameran käyttöoikeus tarvitaan</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
            Tarvitsemme luvan kameraan, jotta voimme kuvata kuitin OCR-testiä varten.
          </ThemedText>
          <Pressable
            style={[styles.button, { backgroundColor: theme.backgroundElement }]}
            onPress={requestPermission}>
            <ThemedText type="smallBold">Myönnä lupa</ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (photoUri) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          {closeButton}
          <ScrollView contentContainerStyle={styles.resultScroll}>
            <ThemedText type="subtitle">Tunnistettu teksti</ThemedText>
            <Image source={{ uri: photoUri }} style={styles.preview} contentFit="cover" />
            {status === 'recognizing' && <ActivityIndicator />}
            {status === 'error' && (
              <ThemedText style={styles.centerText}>
                Virhe tekstintunnistuksessa: {errorMessage}
              </ThemedText>
            )}
            {status === 'done' && parsed && (
              <ThemedView type="backgroundElement" style={styles.parsedBox}>
                <View style={styles.fieldRow}>
                  <ThemedText type="smallBold">Kauppa</ThemedText>
                  <ThemedText type="small">{parsed.storeName ?? '(ei tunnistettu)'}</ThemedText>
                </View>

                <View style={styles.fieldRow}>
                  <ThemedText type="smallBold">Päivämäärä</ThemedText>
                  <ThemedText type="small">{parsed.date ?? '(ei tunnistettu)'}</ThemedText>
                </View>

                <ThemedText type="smallBold">Tuotteet</ThemedText>
                {parsed.items.length === 0 ? (
                  <ThemedText type="small">(ei tunnistettu tuotteita)</ThemedText>
                ) : (
                  parsed.items.map((item, index) => (
                    <View key={`${item.name}-${index}`} style={styles.itemRow}>
                      <ThemedText type="small" style={styles.itemName} numberOfLines={1}>
                        {item.name}
                      </ThemedText>
                      <ThemedText type="small">{item.price.toFixed(2)} €</ThemedText>
                    </View>
                  ))
                )}

                <View style={styles.fieldRow}>
                  <ThemedText type="smallBold">Yhteensä</ThemedText>
                  <ThemedText type="small">
                    {parsed.total !== null ? `${parsed.total.toFixed(2)} €` : '(ei tunnistettu)'}
                  </ThemedText>
                </View>
              </ThemedView>
            )}

            {status === 'done' && (
              <Collapsible title="Raaka tunnistettu teksti">
                <ThemedText type="code" selectable>
                  {recognizedText || '(tekstiä ei tunnistettu)'}
                </ThemedText>
              </Collapsible>
            )}
            <Pressable
              style={[styles.button, { backgroundColor: theme.backgroundElement }]}
              onPress={handleRetry}>
              <ThemedText type="smallBold">Ota uusi kuva</ThemedText>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />
      <SafeAreaView style={styles.captureBar} edges={['bottom']}>
        <Pressable style={styles.captureButtonOuter} onPress={handleCapture}>
          <ThemedView style={styles.captureButtonInner} />
        </Pressable>
      </SafeAreaView>
      <SafeAreaView style={styles.topBar} edges={['top']}>
        {closeButton}
      </SafeAreaView>
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
    alignItems: 'center',
    gap: Spacing.three,
    alignSelf: 'center',
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  centerText: {
    textAlign: 'center',
  },
  closeButton: {
    alignSelf: 'flex-start',
  },
  button: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
  camera: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.three,
  },
  captureBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: Spacing.four,
  },
  captureButtonOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#ffffff',
  },
  resultScroll: {
    gap: Spacing.three,
    alignItems: 'center',
    paddingBottom: Spacing.six,
  },
  preview: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: Spacing.three,
  },
  parsedBox: {
    width: '100%',
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  fieldRow: {
    gap: Spacing.half,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  itemName: {
    flex: 1,
  },
});
