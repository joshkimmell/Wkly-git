import { useState, useEffect } from 'react';
import { TextField } from '@mui/material';
import Modal from 'react-modal';
import { ARIA_HIDE_APP } from '@lib/modal';
import supabase from '@lib/supabase'; // Ensure this is the correct path to your Supabase client
import { fetchAllWinsIndexed, applyHighlight } from '@utils/functions';
import { Win } from '@utils/goalUtils'; // Adjust the import path as necessary
import WinCard from './WinCard';
import WinEditor from './WinEditor';
import { modalClasses, overlayClasses } from '@styles/classes';
import { notifyError, notifySuccess, notifyWithUndo } from './ToastyNotification';
// import { over } from 'lodash';


// Corrected assignment to use `indexedWins`
const AllWins = () => {
  const [wins, setWins] = useState<Win[]>([]);
  const [filteredWins, setFilteredWins] = useState<Win[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newWin, setNewWin] = useState<Win>({
    id: '',
    title: '',
    description: '',
    impact: '',
    goal_id: '',
    user_id: '',
    week_start: '',
    created_at: '',
  });
  const [filter, setFilter] = useState<string>(''); // For filtering wins
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [sortField] = useState<'created_at'>('created_at');
  const [scope] = useState<'week' | 'month' | 'year'>('week');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedWin, setSelectedWin] = useState<Win | null>(null);

  

  useEffect(() => {
    const fetchWins = async () => {
      try {
        const fetchedWins = await fetchAllWinsIndexed(scope);
        const winsArray = Object.values(fetchedWins.indexedWins).flat();
        setFilteredWins(winsArray);
      } catch (error) {
        console.error('Error fetching wins:', error);
      }
    };
    fetchWins();
  }, [scope]);

  // Fetch all wins for the logged-in user
  const fetchWins = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User is not authenticated');
        return;
      }

      const { data, error } = await supabase
        .from('accomplishments')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching wins:', error.message);
        return;
      }

      setWins(data || []);
      setFilteredWins(data || []); // Initialize filtered wins
    } catch (err) {
      console.error('Unexpected error fetching wins:', err);
    }
  };

  // Add a new win
  const handleAddWin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User is not authenticated');
        return;
      }

      const { error } = await supabase.from('accomplishments').insert({
        ...newWin,
        user_id: user.id,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error('Error adding win:', error.message);
        return;
      }

      fetchWins(); // Refresh wins after adding
      closeModal();
      setNewWin({
        id: '',
        title: '',
        description: '',
        impact: '',
        // category: 'Technical skills',
        goal_id: '',
        user_id: user.id,
        week_start: '',
        created_at: new Date().toISOString(),
        // content: '',
        // type: '',
      });
    } catch (err) {
      console.error('Unexpected error adding win:', err);
    }
  };

  // Delete a win
  const handleDeleteWin = (winId: string) => {
    const toDelete = wins.find(a => a.id === winId);
    if (!toDelete) return;
    // Optimistically remove from UI
    setWins(prev => prev.filter(a => a.id !== winId));
    setFilteredWins(prev => prev.filter(a => a.id !== winId));
    notifyWithUndo(
      'Win deleted',
      async () => {
        const { error } = await supabase
          .from('accomplishments')
          .delete()
          .eq('id', winId);
        if (error) throw new Error(error.message);
      },
      () => {
        setWins(prev => [...prev, toDelete]);
        setFilteredWins(prev => [...prev, toDelete]);
      },
    );
  };

  // Filter wins based on the filter state
  const handleFilterChange = (filterValue: string) => {
    setFilter(filterValue);
    if (filterValue) {
      const filtered = wins.filter((win) =>
        win.title.toLowerCase().includes(filterValue.toLowerCase()) ||
        ((win.description || '').toLowerCase().includes(filterValue.toLowerCase())) ||
        ((win.impact || '').toLowerCase().includes(filterValue.toLowerCase()))
      );
      setFilteredWins(filtered);
    } else {
      setFilteredWins(wins); // Reset to all wins if no filter
    }
  };

  // Update the Summaries list rendering logic to apply filtering and sorting
  const sortedAndFilteredWins = filteredWins.sort((a, b) => {
    if (sortField === 'created_at') {
      const aDate = new Date(a.created_at);
      const bDate = new Date(b.created_at);
      return sortDirection === 'asc'
        ? aDate.getTime() - bDate.getTime()
        : bDate.getTime() - aDate.getTime();
    } else {
      const aStr = (a[sortField] as string)?.toLowerCase() || '';
      const bStr = (b[sortField] as string)?.toLowerCase() || '';
      return sortDirection === 'asc'
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    }
  });

  const openModal = () => {
    if (!isModalOpen) {
      setIsModalOpen(true);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  function openEditor(win: Win) {
    setSelectedWin(win);
    setIsEditorOpen(true);
  }

  function closeEditor() {
    setIsEditorOpen(false);
    setSelectedWin(null);
  }

  useEffect(() => {
    fetchWins();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-90 block sm:hidden whitespace-nowrap">All wins</h1>
        <div className="space-x-4 py-4 w-full justify-end flex">
          <button
            onClick={() => openModal()}
            className="btn-primary"
            title="Add Win"
            aria-label="Add Win"
            >
            Add Win
          </button>
        </div>
      </div> 

      {/* Filter Input */}
      <div className="mt-4 h-10 flex items-center space-x-2">
        <TextField
          type="text"
          value={filter}
          onChange={(e) => handleFilterChange(e.target.value)}
          placeholder="Filter by title, category, or impact"
          className="block w-full h-10"
          fullWidth
        />
        <button
          onClick={() => setSortDirection(dir => (dir === 'asc' ? 'desc' : 'asc'))}
          className="border rounded px-2 py-1"
          title="Toggle sort direction"
        >
          {sortDirection === 'asc' ? '↑' : '↓'}
        </button>
      </div>

      {/* Wins List */}
      <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
        {sortedAndFilteredWins.map((win) => (
          <WinCard
            key={win.id}
            id={win.id}
            title={applyHighlight(win.title || '', filter)}
            description={applyHighlight(win.description || '', filter)}
            impact={applyHighlight(win.impact || '', filter)}
            // content={win.content}
            // type={win.type}
            created_at={win.created_at}
            // week_start={win.week_start}
            handleDelete={() => handleDeleteWin(win.id)}
            handleEdit={() => openEditor(win)}
          />
        ))}
      </div>

      {/* Add Win Modal */}
      <Modal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        className="fixed inset-0 flex items-center justify-center z-50"
        overlayClassName={`${overlayClasses}`}
        ariaHideApp={ARIA_HIDE_APP}
      >
        <div className={`${modalClasses}`}>
          {isModalOpen && (
            <>
              <h3 className="text-lg font-medium text-gray-90 mb-4">Add Win</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-70">Title</label>
                  <TextField
                    value={newWin.title}
                    onChange={(e) => setNewWin({ ...newWin, title: e.target.value })}
                    fullWidth
                  />
                </div>
                <div>
                  <TextField
                    label="Description"
                    value={newWin.description}
                    onChange={(e) => setNewWin({ ...newWin, description: e.target.value })}
                    multiline
                    rows={4}
                    fullWidth
                    size="small"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-70">Impact</label>
                  <TextField
                    value={newWin.impact}
                    onChange={(e) => setNewWin({ ...newWin, impact: e.target.value })}
                    fullWidth
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-4">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-70 bg-gray-100 rounded-md hover:bg-gray-20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddWin}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Add
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Win Editor Modal */}
      <Modal
        isOpen={isEditorOpen}
        onRequestClose={closeEditor}
        className={`fixed inset-0 flex items-center justify-center z-50`}
        overlayClassName={`${overlayClasses}`}
        ariaHideApp={ARIA_HIDE_APP}
      >
        <div className={`${modalClasses}`}>
          {isEditorOpen && (
            selectedWin ? (
              <WinEditor
                win={selectedWin}
                onRequestClose={closeEditor}
                onSave={async (updatedDescription?: string, updatedTitle?: string, updatedImpact?: string) => {
                  if (!selectedWin) return;

                  // Build a locally-updated object for UI
                  const updatedWin = {
                    ...selectedWin,
                    description: updatedDescription ?? selectedWin.description ?? '',
                    title: updatedTitle ?? selectedWin.title ?? '',
                    impact: updatedImpact ?? selectedWin.impact ?? '',
                  };

                  try {
                    const { error } = await supabase
                      .from('accomplishments')
                      .update({
                        // write null when empty so DB stores null instead of empty string
                        description: updatedDescription && updatedDescription.trim() ? updatedDescription : null,
                        title: (updatedTitle ?? selectedWin.title),
                        impact: updatedImpact && updatedImpact.trim() ? updatedImpact : null,
                      })
                      .eq('id', updatedWin.id);

                    if (error) {
                      console.error('Error updating win:', error.message);
                      notifyError('Error updating win.');
                      return;
                    }

                    setFilteredWins((prev: Win[]) =>
                      prev.map((win: Win) =>
                        win.id === updatedWin.id
                          ? updatedWin
                          : win
                      )
                    );
                    closeEditor();
                    // notifySuccess('Win updated successfully.');
                  } catch (err) {
                    console.error('Unexpected error updating win:', err);
                  }
                }}
              />
            ) : (
              <div className="p-4 text-center">
                <p className="text-gray-50">No win selected for editing.</p>
              </div>
            )
          )}
        </div>
      </Modal>
    </div>
  );
};

export default AllWins;