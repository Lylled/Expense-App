import { File } from 'expo-file-system';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
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
import { SafeAreaView } from 'react-native-safe-area-context';

import { findSelectedName } from '@/components/category-dropdown.shared';
import { CategorySearchPicker } from '@/components/category-search-picker';
import { Checkbox } from '@/components/checkbox';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { groupByParent, type Category } from '@/lib/categories';
import { parseFinnishDate, todayAsFinnishDate } from '@/lib/expenses';
import { supabase } from '@/lib/supabase';

type Status = 'idle' | 'scanning' | 'recognizing' | 'reviewing' | 'saving' | 'error';

type ReviewItem = {
  key: string;
  name: string;
  priceText: string;
  categoryId: string | null;
  checked: boolean;
};

type AiParsedReceipt = {
  storeName: string | null;
  date: string | null;
  items: { name: string; price: number }[];
  total: number | null;
};

// supabase-js's own error.message for a failed Edge Function call is always
// just "Edge Function returned a non-2xx status code" - the actual detail
// (our function's own { error: "..." } body, or whatever Supabase's gateway
// itself returned if the request never reached our function, e.g. a missing
// auth header) is only reachable via error.context, the raw Response. Show
// that raw body rather than assuming a shape, so a mismatch is visible
// instead of silently falling back to the generic message again.
async function describeFunctionError(error: unknown): Promise<string> {
  // Duck-typed rather than `instanceof Response`: React Native's fetch
  // polyfill produces a Response whose prototype chain doesn't match the
  // global `Response` supabase-js's own fetch call sees, so `instanceof`
  // silently fails here.
  const context = (error as { context?: unknown } | null)?.context as
    | { text?: () => Promise<string>; status?: number }
    | undefined;

  if (context && typeof context.text === 'function') {
    try {
      const bodyText = await context.text();
      const status = typeof context.status === 'number' ? ` (HTTP ${context.status})` : '';
      if (!bodyText) return `Tyhjä vastaus palvelimelta${status}`;
      try {
        const parsed = JSON.parse(bodyText) as { error?: unknown };
        if (typeof parsed.error === 'string') return parsed.error;
        return `${bodyText}${status}`;
      } catch {
        return `${bodyText}${status}`;
      }
    } catch {
      // Body couldn't be read either - fall through to the generic message.
    }
  }

  return error instanceof Error ? error.message : String(error);
}

export default function ReceiptScanScreen() {
  const { session } = useAuth();
  const theme = useTheme();

  const [categories, setCategories] = useState<Category[]>([]);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [dateText, setDateText] = useState(todayAsFinnishDate());
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [editingKeys, setEditingKeys] = useState<ReadonlySet<string>>(new Set());
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

      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setErrorMessage('Kameran käyttöoikeus puuttuu.');
        setStatus('error');
        return;
      }

      // A plain camera photo, not a cropped/deskewed scan: the AI model reads
      // the whole image directly and copes with background and skew far
      // better than the old OCR + row-reconstruction pipeline did, so the
      // document scanner's slower edge-detection UI isn't worth it anymore.
      const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      if (result.canceled || !result.assets.length) {
        setStatus('idle');
        return;
      }

      const uri = result.assets[0].uri;
      setPhotoUri(uri);
      setStatus('recognizing');

      const imageBase64 = await new File(uri).base64();
      const { data, error } = await supabase.functions.invoke<AiParsedReceipt>('parse-receipt', {
        body: { imageBase64, mimeType: 'image/jpeg' },
      });

      if (error || !data) {
        throw new Error(error ? await describeFunctionError(error) : 'Kuitin lukeminen epäonnistui.');
      }

      setStoreName(data.storeName);
      setDateText(data.date ?? todayAsFinnishDate());
      setItems(
        data.items.map((item, index) => ({
          key: String(index),
          name: item.name,
          priceText: item.price.toFixed(2).replace('.', ','),
          categoryId: null,
          checked: true,
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
    setStoreName(null);
    setDateText(todayAsFinnishDate());
    setItems([]);
    setEditingKeys(new Set());
    setErrorMessage('');
    setStatus('idle');
  }

  // Assigns one category to every currently checked row at once - the
  // common case is that a whole receipt belongs to a single category.
  // For a mixed receipt: check the rows for category A, assign it, then
  // adjust which rows are checked to the rest and assign a different one.
  // Re-running this on an already-categorized row (checked again on its
  // own) simply overwrites it, which doubles as "fix a wrong category".
  // "checked" only drives this bulk assignment, nothing else - whether a
  // row ends up saved depends only on whether it has a category (below),
  // so leaving some rows unchecked after an assignment round never drops
  // them from the save.
  function assignCategoryToChecked(categoryId: string) {
    setItems((current) => current.map((item) => (item.checked ? { ...item, categoryId } : item)));
  }

  function removeItem(key: string) {
    setItems((current) => current.filter((item) => item.key !== key));
  }

  function setItemName(key: string, name: string) {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, name } : item)));
  }

  function setItemPriceText(key: string, priceText: string) {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, priceText } : item)));
  }

  function toggleItemChecked(key: string) {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, checked: !item.checked } : item))
    );
  }

  const allChecked = items.length > 0 && items.every((item) => item.checked);
  const checkedCount = items.filter((item) => item.checked).length;

  function toggleAllChecked() {
    const nextChecked = !allChecked;
    setItems((current) => current.map((item) => ({ ...item, checked: nextChecked })));
  }

  function toggleEditing(key: string) {
    setEditingKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
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

    const amounts = items.map((item) => Number(item.priceText.replace(',', '.')));
    if (amounts.some((amount) => Number.isNaN(amount) || amount <= 0)) {
      setErrorMessage('Jonkin rivin summa ei kelpaa - tarkista rivien summat.');
      return;
    }

    if (!session) return;

    setStatus('saving');
    const { error } = await supabase.from('expenses').insert(
      items.map((item, index) => ({
        user_id: session.user.id,
        category_id: item.categoryId,
        amount: amounts[index],
        description: item.name.trim(),
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
          <ThemedText type="subtitle">Kuvaa kuitti</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
            Kuitin kuvaaminen toimii vain natiivissa Android- tai iOS-kehitysversiossa, ei webissä.
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
            <ThemedText type="subtitle">Kuvaa kuitti</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
              Ota kuva kuitista niin, että koko kuitti näkyy kuvassa. Tekoäly lukee kuvan
              sellaisenaan, joten kuvaa ei tarvitse rajata tai suoristaa erikseen.
            </ThemedText>
            <Pressable
              style={[styles.button, { backgroundColor: theme.backgroundElement }]}
              onPress={handleScan}
              disabled={status === 'scanning'}>
              <ThemedText type="smallBold">Ota kuva</ThemedText>
            </Pressable>
            {status === 'scanning' && <ActivityIndicator />}
            {status === 'error' && (
              <ThemedText style={styles.centerText}>Virhe: {errorMessage}</ThemedText>
            )}
          </>
        )}

        {photoUri && (
          <ScrollView contentContainerStyle={styles.resultScroll}>
            <Image source={{ uri: photoUri }} style={styles.preview} contentFit="contain" />

            {status === 'recognizing' && (
              <>
                <ActivityIndicator />
                <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
                  Tekoäly lukee kuittia…
                </ThemedText>
              </>
            )}
            {status === 'error' && (
              <ThemedText style={styles.centerText}>Virhe: {errorMessage}</ThemedText>
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
                  <>
                    <Pressable onPress={toggleAllChecked} style={styles.selectAllRow}>
                      <Checkbox checked={allChecked} onToggle={toggleAllChecked} />
                      <ThemedText type="small">Valitse kaikki</ThemedText>
                    </Pressable>

                    <CategorySearchPicker
                      categories={grouped}
                      selectedCategoryId={null}
                      onSelect={assignCategoryToChecked}
                      triggerLabel={`Aseta luokka valituille (${checkedCount}/${items.length})`}
                    />

                    {items.map((item) => {
                      const isEditing = editingKeys.has(item.key);
                      const categoryName = item.categoryId
                        ? (findSelectedName(grouped, item.categoryId) ?? 'Luokka poistettu')
                        : 'Ei luokkaa';
                      return (
                        <ThemedView key={item.key} type="backgroundElement" style={styles.itemCard}>
                          <View style={styles.itemHeaderRow}>
                            <Checkbox
                              checked={item.checked}
                              onToggle={() => toggleItemChecked(item.key)}
                            />

                            {isEditing ? (
                              <>
                                <TextInput
                                  style={[styles.input, styles.itemNameInput]}
                                  value={item.name}
                                  onChangeText={(name) => setItemName(item.key, name)}
                                />
                                <TextInput
                                  style={[styles.input, styles.itemPriceInput]}
                                  keyboardType="decimal-pad"
                                  value={item.priceText}
                                  onChangeText={(priceText) => setItemPriceText(item.key, priceText)}
                                />
                              </>
                            ) : (
                              <>
                                <ThemedText
                                  type="smallBold"
                                  style={styles.itemNameText}
                                  numberOfLines={1}>
                                  {item.name}
                                </ThemedText>
                                <ThemedText type="smallBold">{item.priceText} €</ThemedText>
                              </>
                            )}

                            <Pressable onPress={() => toggleEditing(item.key)} hitSlop={Spacing.two}>
                              <ThemedText type="small" themeColor="textSecondary">
                                {isEditing ? '✓' : '✏️'}
                              </ThemedText>
                            </Pressable>
                          </View>
                          <View style={styles.itemFooterRow}>
                            <ThemedText type="small" themeColor="textSecondary">
                              Luokka: {categoryName}
                            </ThemedText>
                            <Pressable onPress={() => removeItem(item.key)} hitSlop={Spacing.two}>
                              <ThemedText type="small" themeColor="textSecondary">
                                ✕ Poista
                              </ThemedText>
                            </Pressable>
                          </View>
                        </ThemedView>
                      );
                    })}
                  </>
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

                <Pressable
                  style={[styles.button, { backgroundColor: theme.backgroundElement }]}
                  onPress={handleReset}>
                  <ThemedText type="smallBold">Ota uusi kuva</ThemedText>
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
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
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
  itemFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemNameText: {
    flex: 1,
  },
  itemNameInput: {
    flex: 1,
  },
  itemPriceInput: {
    width: 80,
  },
});
