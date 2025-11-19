import { screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { renderWithProviders, mockSupabaseAuthGetUser } from '../test-utils/axeRender';
import GoalCard from '../../components/GoalCard';

const fakeGoal = {
  id: 'goal-1',
  title: 'Test goal',
  description: 'desc',
  category: 'cat',
  status: 'Not started',
  week_start: '2025-10-13',
};

describe('notes/accomplishments counts regression', () => {
  beforeEach(() => {
    mockSupabaseAuthGetUser();
  });

  it('updates notes count after create and delete', async () => {
    // stub fetch to handle createNote, deleteNote, and getNotes/getNotes?count_only
    let notes: any[] = [];
    (globalThis as any).fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : (input as Request).url || String(input);
      if (url.includes('/api/getNotes')) {
        // return list or count
        const isCount = url.includes('count_only=1');
        const body = isCount ? { count: notes.length } : notes;
        return { ok: true, json: async () => body, text: async () => JSON.stringify(body) } as any;
      }
      if (url.includes('/api/createNote')) {
        const body = init?.body ? JSON.parse(String(init.body)) : {};
        const created = { id: `note-${Date.now()}`, content: body.content, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        notes = [created, ...notes];
        return { ok: true, json: async () => created, text: async () => JSON.stringify(created) } as any;
      }
      if (url.includes('/api/deleteNote')) {
        const noteId = new URL(String(url), 'http://localhost').searchParams.get('note_id');
        notes = notes.filter((n) => n.id !== noteId);
        return { ok: true, json: async () => ({}), text: async () => '{}' } as any;
      }
      return { ok: true, json: async () => ([]), text: async () => '[]' } as any;
    };

  const handleDelete = vi.fn();
  const handleEdit = vi.fn();

    renderWithProviders(<GoalCard goal={fakeGoal as any} handleDelete={handleDelete} handleEdit={handleEdit} filter="" />);

  // (initial badge may be absent or present with 0) - skip strict initial assertion

  // Open notes modal (there are two possible matching nodes due to MUI cloning; pick the first button)
  const notesBtns = screen.getAllByLabelText('Notes');
  const notesBtn = notesBtns.find((n) => n.tagName.toLowerCase() === 'button') || notesBtns[0];
  fireEvent.click(notesBtn as HTMLElement);

    // Add a note via the Add note button (there's a textarea and button in the modal)
    const textarea = await screen.findByLabelText('Add a new note');
    fireEvent.change(textarea, { target: { value: 'hello' } });
    const addBtn = screen.getByText(/Add note/);
    fireEvent.click(addBtn);

    // Wait for the badge to appear with count 1 by checking the data-testid
    await waitFor(() => {
      const visible = screen.queryByTestId(`notes-count-${fakeGoal.id}`);
      const hidden = screen.queryByTestId(`notes-count-${fakeGoal.id}-testonly`);
      const badge = visible || hidden;
      expect(badge).toBeDefined();
      expect((badge!.textContent || '').trim()).toMatch(/1/);
    });

    // Now delete the note by clicking delete on the first note's delete button
    const deleteButtons = await screen.findAllByTitle('Delete note');
    expect(deleteButtons.length).toBeGreaterThan(0);
    fireEvent.click(deleteButtons[0]);

    // Confirm delete in modal
    const confirmBtn = await screen.findByText('Delete');
    fireEvent.click(confirmBtn);

    // Wait for the badge to update to 0 after delete (visible or test-only hidden)
    await waitFor(() => {
      const visible = screen.queryByTestId(`notes-count-${fakeGoal.id}`);
      const hidden = screen.queryByTestId(`notes-count-${fakeGoal.id}-testonly`);
      const badge = visible || hidden;
      expect(badge).toBeDefined();
      expect((badge!.textContent || '').trim()).toMatch(/0/);
    });
  });
});
