export type Category = {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  created_at: string;
};

export type CategoryWithChildren = Category & {
  children: Category[];
};

export function groupByParent(categories: Category[]): CategoryWithChildren[] {
  const topLevel = categories.filter((category) => category.parent_id === null);
  return topLevel.map((category) => ({
    ...category,
    children: categories.filter((child) => child.parent_id === category.id),
  }));
}

export type CategoryOption = {
  id: string;
  label: string;
};

/** Flattens categories for a single-level picker: top-level categories by
 * their own name, subcategories prefixed with their parent's name. */
export function flattenForPicker(categories: Category[]): CategoryOption[] {
  const byId = new Map(categories.map((category) => [category.id, category]));

  return categories
    .map((category) => {
      const parent = category.parent_id ? byId.get(category.parent_id) : null;
      return {
        id: category.id,
        label: parent ? `${parent.name}: ${category.name}` : category.name,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'fi'));
}
