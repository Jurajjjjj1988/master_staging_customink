/** Escape regex metacharacters so a string can be safely interpolated into `new RegExp`. */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
