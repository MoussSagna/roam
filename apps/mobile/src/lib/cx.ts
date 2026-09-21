/** Joins class names, ignoring falsy values. Keep overrides out of it: NativeWind ignores order. */
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
