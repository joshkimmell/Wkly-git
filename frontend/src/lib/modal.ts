// Small helper to centralize react-modal configuration
// In development, React.StrictMode can double-mount components; setting ariaHideApp=false
// for dev only can help prevent accessibility management conflicts in tests/storybook.
export const ARIA_HIDE_APP = (() => {
  try {
    if (import.meta.env && (import.meta as any).env.MODE === 'development') {
      return false; // developer-only guard
    }
  } catch (e) {
    // ignore
  }
  return true;
})();

// Development helper: when a modal is opened, log overlay element and computed styles
// Usage: call useOverlayDebug(isOpen) from a component that renders a Modal. No-op in production.
export function useOverlayDebug(isOpen: boolean) {
  if (!(import.meta as any).env || (import.meta as any).env.MODE !== 'development') return;
  // Run in microtask to allow the modal to render into the DOM
  if (!isOpen) return;
  setTimeout(() => {
    try {
      const selector = '.wkly-overlay';
      const overlay = document.querySelector(selector) as HTMLElement | null;
      if (!overlay) {
        console.debug('[overlay-debug] No overlay node found using selector', selector);
        return;
      }
      const style = window.getComputedStyle(overlay);
      console.debug('[overlay-debug] overlay element', overlay);
      console.debug('[overlay-debug] computed style', {
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        background: style.backgroundColor,
        zIndex: style.zIndex,
        pointerEvents: style.pointerEvents,
      });

      // bounding rect
      try {
        const rect = overlay.getBoundingClientRect();
        console.debug('[overlay-debug] boundingRect', {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          bottom: rect.bottom,
          right: rect.right,
        });
      } catch (e) {
        // ignore
      }

      // stacking context trace: walk up parents and log key style fields
      const trace: Array<Record<string, any>> = [];
      let el: HTMLElement | null = overlay;
      while (el) {
        try {
          const s = window.getComputedStyle(el);
          trace.push({
            tag: el.tagName,
            id: el.id || undefined,
            class: el.className || undefined,
            position: s.position,
            zIndex: s.zIndex,
            transform: s.transform,
            opacity: s.opacity,
            display: s.display,
          });
        } catch (e) {
          // ignore
        }
        el = el.parentElement;
      }
      console.debug('[overlay-debug] stacking-context-trace', trace);
    } catch (e) {
      // swallow
    }
  }, 0);
}
