import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryActionMenu } from '@/components/category-action-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { groupByParent, type Category } from '@/lib/categories';
import { supabase } from '@/lib/supabase';

type InlineCategoryFormProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  submitLabel?: string;
  onCancel?: () => void;
  autoFocus?: boolean;
};

function InlineCategoryForm({
  value,
  onChangeText,
  onSubmit,
  placeholder,
  submitLabel = 'Lisää',
  onCancel,
  autoFocus,
}: InlineCategoryFormProps) {
  return (
    <View style={styles.addRow}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#8A8A8E"
        value={value}
        onChangeText={onChangeText}
        autoFocus={autoFocus}
      />
      <Pressable style={styles.addButton} onPress={onSubmit}>
        <ThemedText type="smallBold" style={styles.addButtonText}>
          {submitLabel}
        </ThemedText>
      </Pressable>
      {onCancel && (
        <Pressable onPress={onCancel}>
          <ThemedText type="small">Peruuta</ThemedText>
        </Pressable>
      )}
    </View>
  );
}

type CategoryRowProps = {
  category: Category;
  isSubcategory: boolean;
  isEditing: boolean;
  editingName: string;
  onChangeEditingName: (name: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
};

function CategoryRow({
  category,
  isSubcategory,
  isEditing,
  editingName,
  onChangeEditingName,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: CategoryRowProps) {
  if (isEditing) {
    return (
      <InlineCategoryForm
        value={editingName}
        onChangeText={onChangeEditingName}
        onSubmit={onSaveEdit}
        submitLabel="Tallenna"
        onCancel={onCancelEdit}
        autoFocus
      />
    );
  }

  return (
    <View style={[styles.categoryRow, isSubcategory && styles.subcategoryRow]}>
      <ThemedText type={isSubcategory ? 'small' : 'smallBold'} style={styles.categoryRowName}>
        {category.name}
      </ThemedText>
      <CategoryActionMenu label={category.name} onEdit={onStartEdit} onDelete={onDelete} />
    </View>
  );
}

export default function CategoriesScreen() {
  const { session } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const [newCategoryName, setNewCategoryName] = useState('');
  const [subcategoryParentId, setSubcategoryParentId] = useState<string | null>(null);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

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

  function startEditing(id: string, name: string) {
    setEditingId(id);
    setEditingName(name);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingName('');
  }

  async function saveEditing() {
    const name = editingName.trim();
    if (!editingId || !name) {
      cancelEditing();
      return;
    }

    const { error } = await supabase.from('categories').update({ name }).eq('id', editingId);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    cancelEditing();
    fetchCategories();
  }

  function confirmDelete(id: string, name: string, childCount: number) {
    Alert.alert('Poista luokka', `Haluatko varmasti poistaa luokan "${name}"?`, [
      { text: 'Peruuta', style: 'cancel' },
      {
        text: 'Poista',
        style: 'destructive',
        onPress: () => {
          if (childCount > 0) {
            confirmDeleteWithChildren(id, name);
          } else {
            deleteCategory(id);
          }
        },
      },
    ]);
  }

  function confirmDeleteWithChildren(id: string, name: string) {
    Alert.alert(
      'Alaluokat poistuvat myös',
      `Luokan "${name}" poistaminen poistaa myös kaikki sen alaluokat. Oletko varma?`,
      [
        { text: 'Peruuta', style: 'cancel' },
        { text: 'Poista', style: 'destructive', onPress: () => deleteCategory(id) },
      ]
    );
  }

  async function deleteCategory(id: string) {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    fetchCategories();
  }

  const grouped = groupByParent(categories);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          Luokat
        </ThemedText>

        <InlineCategoryForm
          value={newCategoryName}
          onChangeText={setNewCategoryName}
          onSubmit={handleAddCategory}
          placeholder="Uuden luokan nimi"
        />

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
                <CategoryRow
                  category={item}
                  isSubcategory={false}
                  isEditing={editingId === item.id}
                  editingName={editingName}
                  onChangeEditingName={setEditingName}
                  onStartEdit={() => startEditing(item.id, item.name)}
                  onSaveEdit={saveEditing}
                  onCancelEdit={cancelEditing}
                  onDelete={() => confirmDelete(item.id, item.name, item.children.length)}
                />

                {item.children.map((child) => (
                  <CategoryRow
                    key={child.id}
                    category={child}
                    isSubcategory
                    isEditing={editingId === child.id}
                    editingName={editingName}
                    onChangeEditingName={setEditingName}
                    onStartEdit={() => startEditing(child.id, child.name)}
                    onSaveEdit={saveEditing}
                    onCancelEdit={cancelEditing}
                    onDelete={() => confirmDelete(child.id, child.name, 0)}
                  />
                ))}

                {subcategoryParentId === item.id ? (
                  <InlineCategoryForm
                    value={newSubcategoryName}
                    onChangeText={setNewSubcategoryName}
                    onSubmit={() => handleAddSubcategory(item.id)}
                    placeholder="Alaluokan nimi"
                    autoFocus
                  />
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
    alignItems: 'center',
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
    paddingVertical: Spacing.two,
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
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  subcategoryRow: {
    paddingLeft: Spacing.three,
  },
  categoryRowName: {
    flex: 1,
  },
});
