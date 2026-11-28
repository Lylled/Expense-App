import type { CategoryWithChildren } from '@/lib/categories';

// Shared between category-dropdown.tsx and category-dropdown.android.tsx.
export type CategoryDropdownProps = {
  categories: CategoryWithChildren[];
  selectedCategoryId: string | null;
  onSelect: (id: string) => void;
};

export function findSelectedName(
  categories: CategoryWithChildren[],
  selectedCategoryId: string | null
) {
  if (!selectedCategoryId) return null;
  for (const category of categories) {
    if (category.id === selectedCategoryId) return category.name;
    const child = category.children.find((c) => c.id === selectedCategoryId);
    if (child) return child.name;
  }
  return null;
}

export type FlatCategoryOption = {
  id: string;
  label: string;
};

// Flattens pääluokka/alaluokka into a single list of {id, label} pairs
// ("KOTI", "KOTI › Ruoka", ...) - shared between CategorySearchPicker's
// search list and the AI category-suggestion payload sent to parse-receipt.
export function flattenCategories(categories: CategoryWithChildren[]): FlatCategoryOption[] {
  const options: FlatCategoryOption[] = [];
  for (const category of categories) {
    options.push({ id: category.id, label: category.name });
    for (const child of category.children) {
      options.push({ id: child.id, label: `${category.name} › ${child.name}` });
    }
  }
  return options;
}
