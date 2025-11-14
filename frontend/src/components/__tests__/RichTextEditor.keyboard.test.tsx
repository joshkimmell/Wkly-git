import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import RichTextEditor from '../RichTextEditor';

// mock DOMPurify if used
beforeAll(() => {
  (window as any).DOMPurify = { sanitize: (s: string) => s };
});

describe('RichTextEditor keyboard accessibility', () => {
  test('auto-focuses toolbar when editor is focused via keyboard by default', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <div>
        <button>before</button>
        <RichTextEditor id="rte1" value={""} onChange={onChange} label="Test" />
        <button>after</button>
      </div>
    );

    // tab to 'before', then to the editor — auto-focus should move focus into toolbar
    await user.tab();
    await user.tab();

    const firstBtn = await screen.findByLabelText(/Bold/i);
    expect(firstBtn).toHaveFocus();
  });

  test('does not auto-focus toolbar when prop disabled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <div>
        <button>before</button>
        <RichTextEditor id="rte2" value={""} onChange={onChange} label="Test" autoFocusToolbarOnKeyboard={false} />
        <button>after</button>
      </div>
    );

    await user.tab();
    await user.tab();

    const firstBtn = await screen.findByLabelText(/Bold/i);
    expect(firstBtn).not.toHaveFocus();
  });
});
