/**
 * Requirements addressed:
 * - Scheme editor supports template reordering and adding new templates.
 */
export function swap<T>(arr: T[], i: number, j: number): T[] {
  const next = [...arr];
  const tmp = next[i];
  next[i] = next[j];
  next[j] = tmp;
  return next;
}

export function newId(prefix: string): string {
  // Browser-safe id generation; stable enough for local config usage.
  return `${prefix}-${String(Date.now())}-${Math.random().toString(16).slice(2)}`;
}
