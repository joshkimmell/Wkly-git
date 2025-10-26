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
