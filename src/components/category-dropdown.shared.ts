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
