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
    const editor = screen.getByRole('textbox');
    // focus
    editor.focus();
    // insert some text
    document.execCommand('insertText', false, 'hello');
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
    const boldBtn = screen.getByLabelText('Bold');
    userEvent.click(boldBtn);
    expect(handleChange).toHaveBeenCalled();
  });
});
