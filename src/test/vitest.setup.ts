/**
 * Requirements addressed:
 * - Renderer uses Mantine as the primary component library.
 * - jsdom-based tests must provide minimal browser APIs used by Mantine.
 */

// Vitest runs many tests in a Node environment (no window). Guard all polyfills.
if (typeof window !== 'undefined') {
  // Mantine uses matchMedia (e.g., color scheme / reduced motion). jsdom does
  // not provide it by default.
  if (typeof window.matchMedia !== 'function') {
    window.matchMedia = (query: string) => {
      return {
        matches: false,
        media: query,
        onchange: null,
        addListener: () => undefined, // deprecated
        removeListener: () => undefined, // deprecated
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      };
    };
  }
}
