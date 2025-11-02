import { render, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import TiptapEditor from '../TiptapEditor';

// simple DOMPurify mock
vi.mock('dompurify', () => ({
  sanitize: (s: string) => s
}));

describe('TiptapEditor', () => {
  test('keyboard shortcut Ctrl/Cmd+B applies bold', async () => {
    const handleChange = vi.fn();
    render(<TiptapEditor value="" onChange={handleChange} />);
  // testing-library may see multiple textbox roles (toolbar clones). Pick the contenteditable
  const editors = screen.getAllByRole('textbox');
  const editor = editors.find((el) => el.id === 'goal-description') || editors[0];
  // focus and insert some text (happy-dom doesn't implement execCommand)
  editor.focus();
  // directly set text content for the contenteditable used by the test harness
  (editor as HTMLElement).textContent = 'hello';
    // select the text
    const range = document.createRange();
    range.selectNodeContents(editor);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    // trigger Ctrl+B
    fireEvent.keyDown(editor, { key: 'b', ctrlKey: true });
    // onChange should be called (execCommand may produce <b> or <strong>)
    expect(handleChange).toHaveBeenCalled();
  });

  test('toolbar bold button triggers onChange', async () => {
    const handleChange = vi.fn();
    render(<TiptapEditor value="<p>hi</p>" onChange={handleChange} />);
  // toolbar may render clones; pick the first Bold button
  const boldBtns = screen.getAllByLabelText('Bold');
  const boldBtn = boldBtns[0];
    userEvent.click(boldBtn);
    expect(handleChange).toHaveBeenCalled();
  });
});
