export const asItems = (result) => {
  if (Array.isArray(result)) return result;
  return result?.items ?? [];
};

export const asItem = (result) => asItems(result)[0] ?? null;