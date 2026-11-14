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
