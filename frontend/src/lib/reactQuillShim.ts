// Dev-only shim to suppress the React `findDOMNode` deprecation warning
// emitted by older versions of react-quill when used inside StrictMode.
// This shim silences the specific warning message in development only.
if (typeof window !== 'undefined') {
  try {
    // Only apply in development
    if ((import.meta as any).env && (import.meta as any).env.MODE === 'development') {
      const originalWarn = console.warn.bind(console);
      console.warn = (...args: any[]) => {
        try {
          const msg = args[0] || '';
          if (typeof msg === 'string' && msg.includes('findDOMNode is deprecated')) {
            // swallow this specific warning from ReactQuill/React
            return;
          }
        } catch (e) {
          // fall through to original warn
        }
        originalWarn(...args);
      };
    }
  } catch (e) {
    // No-op
  }
}

export {};
