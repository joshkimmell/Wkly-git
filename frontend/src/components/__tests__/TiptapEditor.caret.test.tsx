import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import TiptapEditor from '../TiptapEditor';

describe('TiptapEditor caret preservation', () => {
  test('moves caret to end after value updates', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<TiptapEditor value="Hello" onChange={onChange} />);

  // prefer the contenteditable with id when present (avoids toolbar clones)
  const editors = screen.getAllByRole('textbox');
  const editorEl = editors.find((el) => (el as HTMLElement).id === 'goal-description') || editors[0];
  expect(editorEl).toBeTruthy();

    // stub createRange/selectNodeContents/collapse and selection APIs
    const fakeRange = {
      selectNodeContents: vi.fn(),
      collapse: vi.fn(),
    } as any;

    const addRange = vi.fn();
    const removeAllRanges = vi.fn();

    const fakeSelection = {
      removeAllRanges,
      addRange,
    } as any;

    vi.spyOn(document, 'createRange').mockImplementation(() => fakeRange);
    vi.spyOn(window, 'getSelection').mockImplementation(() => fakeSelection as any);

    // update prop -> rerender with new value
    rerender(<TiptapEditor value={'Hello world!'} onChange={onChange} />);

    // requestAnimationFrame used in component; run microtasks if needed
    await new Promise((r) => setTimeout(r, 0));

    // expect selectNodeContents and collapse (caret moved to end) and selection ranges updated
    expect(fakeRange.selectNodeContents).toHaveBeenCalled();
    expect(fakeRange.collapse).toHaveBeenCalledWith(false);
    expect(removeAllRanges).toHaveBeenCalled();
    expect(addRange).toHaveBeenCalled();
  });
});
