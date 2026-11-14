import TextRecognition from '@react-native-ml-kit/text-recognition';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import DocumentScanner, { ScanDocumentResponseStatus } from 'react-native-document-scanner-plugin';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Collapsible } from '@/components/ui/collapsible';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { parseReceipt, type ParsedReceipt } from '@/lib/parse-receipt';

type Status = 'idle' | 'scanning' | 'recognizing' | 'done' | 'error';

export default function OcrTestScreen() {
  const theme = useTheme();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [recognizedText, setRecognizedText] = useState('');
  const [parsed, setParsed] = useState<ParsedReceipt | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleScan() {
    try {
      setStatus('scanning');
      // Opens the native scanner UI: it live-detects the receipt's edges and
      // returns an already cropped + perspective-corrected (deskewed) photo,
      // so OCR always sees a flat rectangle regardless of the capture angle.
      const { scannedImages, status: scanStatus } = await DocumentScanner.scanDocument();
      if (scanStatus !== ScanDocumentResponseStatus.Success || !scannedImages?.length) {
        setStatus('idle');
        return;
      }

      const uri = scannedImages[0];
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

  function handleReset() {
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
            Kuitinskannaus ja tekstintunnistus toimivat vain natiivissa Android- tai
            iOS-kehitysversiossa, ei webissä.
          </ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {closeButton}

        {!photoUri && (
          <>
            <ThemedText type="subtitle">Kuittiskanneri</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
              Avaa skanneri, aseta kuitti kehyksen sisään ja ota kuva. Skanneri rajaa ja
              suoristaa kuvan automaattisesti ennen tekstintunnistusta.
            </ThemedText>
            <Pressable
              style={[styles.button, { backgroundColor: theme.backgroundElement }]}
              onPress={handleScan}
              disabled={status === 'scanning' || status === 'recognizing'}>
              <ThemedText type="smallBold">Skannaa kuitti</ThemedText>
            </Pressable>
            {status === 'scanning' && <ActivityIndicator />}
            {status === 'error' && (
              <ThemedText style={styles.centerText}>
                Virhe tekstintunnistuksessa: {errorMessage}
              </ThemedText>
            )}
          </>
        )}

        {photoUri && (
          <ScrollView contentContainerStyle={styles.resultScroll}>
            <ThemedText type="subtitle">Tunnistettu teksti</ThemedText>
            <Image source={{ uri: photoUri }} style={styles.preview} contentFit="contain" />
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
              onPress={handleReset}>
              <ThemedText type="smallBold">Skannaa uusi kuitti</ThemedText>
            </Pressable>
          </ScrollView>
        )}
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
