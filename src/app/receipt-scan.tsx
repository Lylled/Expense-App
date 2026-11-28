import TextRecognition from '@react-native-ml-kit/text-recognition';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import DocumentScanner, { ScanDocumentResponseStatus } from 'react-native-document-scanner-plugin';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryDropdown } from '@/components/category-dropdown';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Collapsible } from '@/components/ui/collapsible';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { groupByParent, type Category } from '@/lib/categories';
import { parseFinnishDate, todayAsFinnishDate } from '@/lib/expenses';
import { parseReceipt } from '@/lib/parse-receipt';
import { supabase } from '@/lib/supabase';

type Status = 'idle' | 'scanning' | 'recognizing' | 'reviewing' | 'saving' | 'error';

type ReviewItem = {
  key: string;
  name: string;
  price: number;
  categoryId: string | null;
};

export default function ReceiptScanScreen() {
  const { session } = useAuth();
  const theme = useTheme();

  const [categories, setCategories] = useState<Category[]>([]);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [recognizedText, setRecognizedText] = useState('');
  const [storeName, setStoreName] = useState<string | null>(null);
  const [dateText, setDateText] = useState(todayAsFinnishDate());
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    supabase
      .from('categories')
      .select('*')
      .then(({ data, error }) => {
        if (error) setErrorMessage(error.message);
        else setCategories((data ?? []) as Category[]);
      });
  }, []);

  const grouped = groupByParent(categories);

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

      const parsed = parseReceipt(result);
      setStoreName(parsed.storeName);
      setDateText(parsed.date ?? todayAsFinnishDate());
      setItems(
        parsed.items.map((item, index) => ({
          key: String(index),
          name: item.name,
          price: item.price,
          categoryId: null,
        }))
      );
      setStatus('reviewing');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
      setStatus('error');
    }
  }

  function handleReset() {
    setPhotoUri(null);
    setRecognizedText('');
    setStoreName(null);
    setDateText(todayAsFinnishDate());
    setItems([]);
    setErrorMessage('');
    setStatus('idle');
  }

  function removeItem(key: string) {
    setItems((current) => current.filter((item) => item.key !== key));
  }

  function setItemCategory(key: string, categoryId: string) {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, categoryId } : item)));
  }

  async function handleSave() {
    setErrorMessage('');

    if (items.length === 0) {
      setErrorMessage('Ei tallennettavia rivejä.');
      return;
    }

    const isoDate = parseFinnishDate(dateText);
    if (!isoDate) {
      setErrorMessage('Päivämäärä pitää olla muodossa pp.kk.vvvv.');
      return;
    }

    if (items.some((item) => !item.categoryId)) {
      setErrorMessage('Valitse luokka jokaiselle riville.');
      return;
    }

    if (!session) return;

    setStatus('saving');
    const { error } = await supabase.from('expenses').insert(
      items.map((item) => ({
        user_id: session.user.id,
        category_id: item.categoryId,
        amount: item.price,
        description: item.name,
        expense_date: isoDate,
      }))
    );

    if (error) {
      setErrorMessage(error.message);
      setStatus('reviewing');
      return;
    }

    router.back();
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
          <ThemedText type="subtitle">Skannaa kuitti</ThemedText>
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
            <ThemedText type="subtitle">Skannaa kuitti</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
              Avaa skanneri, aseta kuitti kehyksen sisään ja ota kuva. Skanneri rajaa ja
              suoristaa kuvan automaattisesti ennen tekstintunnistusta.
            </ThemedText>
            <Pressable
              style={[styles.button, { backgroundColor: theme.backgroundElement }]}
              onPress={handleScan}
              disabled={status === 'scanning'}>
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
            <Image source={{ uri: photoUri }} style={styles.preview} contentFit="contain" />

            {status === 'recognizing' && <ActivityIndicator />}
            {status === 'error' && (
              <ThemedText style={styles.centerText}>
                Virhe tekstintunnistuksessa: {errorMessage}
              </ThemedText>
            )}

            {(status === 'reviewing' || status === 'saving') && (
              <>
                {storeName && <ThemedText type="smallBold">{storeName}</ThemedText>}

                <TextInput
                  style={styles.input}
                  placeholder="pp.kk.vvvv"
                  placeholderTextColor="#8A8A8E"
                  value={dateText}
                  onChangeText={setDateText}
                />

                {items.length === 0 ? (
                  <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
                    Tuotteita ei tunnistettu kuitilta.
                  </ThemedText>
                ) : (
                  items.map((item) => (
                    <ThemedView key={item.key} type="backgroundElement" style={styles.itemCard}>
                      <View style={styles.itemHeaderRow}>
                        <ThemedText type="smallBold" style={styles.itemName} numberOfLines={1}>
                          {item.name}
                        </ThemedText>
                        <ThemedText type="smallBold">{item.price.toFixed(2)} €</ThemedText>
                        <Pressable onPress={() => removeItem(item.key)} hitSlop={Spacing.two}>
                          <ThemedText type="small" themeColor="textSecondary">
                            ✕
                          </ThemedText>
                        </Pressable>
                      </View>
                      <CategoryDropdown
                        categories={grouped}
                        selectedCategoryId={item.categoryId}
                        onSelect={(categoryId) => setItemCategory(item.key, categoryId)}
                      />
                    </ThemedView>
                  ))
                )}

                {errorMessage && (
                  <ThemedText type="small" style={styles.centerText}>
                    {errorMessage}
                  </ThemedText>
                )}

                <Pressable
                  style={[styles.button, styles.saveButton]}
                  onPress={handleSave}
                  disabled={status === 'saving'}>
                  <ThemedText type="smallBold" style={styles.saveButtonText}>
                    {status === 'saving' ? 'Tallennetaan…' : 'Tallenna menot'}
                  </ThemedText>
                </Pressable>

                <Collapsible title="Raaka tunnistettu teksti">
                  <ThemedText type="code" selectable>
                    {recognizedText || '(tekstiä ei tunnistettu)'}
                  </ThemedText>
                </Collapsible>

                <Pressable
                  style={[styles.button, { backgroundColor: theme.backgroundElement }]}
                  onPress={handleReset}>
                  <ThemedText type="smallBold">Skannaa uusi kuitti</ThemedText>
                </Pressable>
              </>
            )}
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
  saveButton: {
    backgroundColor: '#208AEF',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
  },
  resultScroll: {
    gap: Spacing.three,
    alignItems: 'stretch',
    width: '100%',
    paddingBottom: Spacing.six,
  },
  preview: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: Spacing.three,
  },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#000000',
  },
  itemCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  itemName: {
    flex: 1,
  },
});
