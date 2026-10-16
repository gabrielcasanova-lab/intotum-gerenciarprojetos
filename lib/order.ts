/**
 * Nova ordem de uma lista ao subir (-1) ou descer (+1) um item uma posição.
 * Devolve null quando não há o que mudar (item no topo/fim ou não encontrado).
 */
export function moveInOrder<T>(ids: T[], id: T, direction: -1 | 1): T[] | null {
  const from = ids.indexOf(id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= ids.length) return null;
  const next = [...ids];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}
