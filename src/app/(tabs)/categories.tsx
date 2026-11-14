import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { groupByParent, type Category } from '@/lib/categories';
import { supabase } from '@/lib/supabase';

export default function CategoriesScreen() {
  const { session } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const [newCategoryName, setNewCategoryName] = useState('');
  const [subcategoryParentId, setSubcategoryParentId] = useState<string | null>(null);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) setErrorMessage(error.message);
    else setCategories(data ?? []);
    setIsLoading(false);
  }

  async function handleAddCategory() {
    const name = newCategoryName.trim();
    if (!name || !session) return;

    const { error } = await supabase
      .from('categories')
      .insert({ name, user_id: session.user.id, parent_id: null });

    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setNewCategoryName('');
    fetchCategories();
  }

  async function handleAddSubcategory(parentId: string) {
    const name = newSubcategoryName.trim();
    if (!name || !session) return;

    const { error } = await supabase
      .from('categories')
      .insert({ name, user_id: session.user.id, parent_id: parentId });

    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setNewSubcategoryName('');
    setSubcategoryParentId(null);
    fetchCategories();
  }

  const grouped = groupByParent(categories);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          Luokat
        </ThemedText>

        <View style={styles.addRow}>
          <TextInput
            style={styles.input}
            placeholder="Uuden luokan nimi"
            placeholderTextColor="#8A8A8E"
            value={newCategoryName}
            onChangeText={setNewCategoryName}
          />
          <Pressable style={styles.addButton} onPress={handleAddCategory}>
            <ThemedText type="smallBold" style={styles.addButtonText}>
              Lisää
            </ThemedText>
          </Pressable>
        </View>

        {errorMessage !== '' && (
          <ThemedText type="small" style={styles.centerText}>
            {errorMessage}
          </ThemedText>
        )}

        {isLoading ? (
          <ActivityIndicator />
        ) : (
          <FlatList
            data={grouped}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
                Ei vielä luokkia. Lisää ensimmäinen yllä.
              </ThemedText>
            }
            renderItem={({ item }) => (
              <ThemedView type="backgroundElement" style={styles.categoryCard}>
                <ThemedText type="smallBold">{item.name}</ThemedText>

                {item.children.map((child) => (
                  <ThemedText key={child.id} type="small" style={styles.subcategoryText}>
                    {child.name}
                  </ThemedText>
                ))}

                {subcategoryParentId === item.id ? (
                  <View style={styles.addRow}>
                    <TextInput
                      style={styles.input}
                      placeholder="Alaluokan nimi"
                      placeholderTextColor="#8A8A8E"
                      value={newSubcategoryName}
                      onChangeText={setNewSubcategoryName}
                      autoFocus
                    />
                    <Pressable
                      style={styles.addButton}
                      onPress={() => handleAddSubcategory(item.id)}>
                      <ThemedText type="smallBold" style={styles.addButtonText}>
                        Lisää
                      </ThemedText>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable onPress={() => setSubcategoryParentId(item.id)}>
                    <ThemedText type="linkPrimary">+ Lisää alaluokka</ThemedText>
                  </Pressable>
                )}
              </ThemedView>
            )}
          />
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
    gap: Spacing.three,
    alignSelf: 'center',
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  title: {
    textAlign: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
  addRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#000000',
  },
  addButton: {
    backgroundColor: '#208AEF',
    paddingHorizontal: Spacing.four,
    justifyContent: 'center',
    borderRadius: Spacing.two,
  },
  addButtonText: {
    color: '#ffffff',
  },
  listContent: {
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  categoryCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  subcategoryText: {
    paddingLeft: Spacing.three,
  },
});
