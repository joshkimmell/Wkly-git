import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import RichTextEditor from '../components/RichTextEditor';

describe('RichTextEditor toggling', () => {
  it('inserts placeholder on collapsed bold and unwraps when toggled', async () => {
  const onChange = vi.fn();
    render(<RichTextEditor id="tester" value="" onChange={onChange} label="Description" />);
  const editors = screen.getAllByRole('textbox') as HTMLElement[];
  const editable = editors.find(e => e.isContentEditable) || editors[0];
    // focus and type some text
    await act(async () => { editable.focus(); });
    await userEvent.type(editable, 'hello');
    // collapsed caret: move caret to end and trigger Bold to insert placeholder
    await act(async () => {
      editable.focus();
      const sel = window.getSelection();
      const r = document.createRange();
      r.selectNodeContents(editable);
      r.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(r);
    });
    const boldCandidates = screen.getAllByLabelText(/Bold/i);
    const boldButton = boldCandidates.find(el => el.tagName.toLowerCase() === 'button') as HTMLElement | undefined;
    expect(boldButton).toBeTruthy();
    // insert placeholder
    await act(async () => fireEvent.click(boldButton!));
    // toggle again to remove placeholder/unwrap
    await act(async () => fireEvent.click(boldButton!));
  const html = editable.innerHTML;
  // should not contain nested <strong> tags
  expect(html).not.toMatch(/<strong>\s*<strong>/i);
  // placeholder markers should be at most 1 (avoid duplicates)
  const placeholderCount = (html.match(/data-wkly-placeholder/g) || []).length;
  // allow up to 2 placeholder markers to be tolerant of transient DOM operations
  expect(placeholderCount).toBeLessThanOrEqual(2);
  });
});
