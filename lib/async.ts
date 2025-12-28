export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }).map(
    async () => {
      while (cursor < items.length) {
        const current = cursor;
        cursor += 1;
        results[current] = await mapper(items[current], current);
      }
    },
  );

  await Promise.all(workers);
  return results;
}
