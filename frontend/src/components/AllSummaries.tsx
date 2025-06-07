import { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { Summary } from '@utils/goalUtils'; // Adjust the import path as necessary
import { fetchSummaries, createSummary, deleteSummary, setSummary, saveSummary } from '@utils/functions'; // Adjust the import path as necessary
import supabase from '@lib/supabase'; // Ensure this is the correct path to your Supabase client
import SummaryCard from '@components/SummaryCard';
import SummaryEditor from '@components/SummaryEditor';
// import SummaryGenerator from '@components/SummaryGenerator';
import { modalClasses } from '@styles/classes'; // Adjust the import path as necessary
import ReactQuill from 'react-quill';

Modal.setAppElement('#root');

const AllSummaries = () => {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [filteredSummaries, setFilteredSummaries] = useState<Summary[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Removed unused summaryType state
  const [newSummary, setNewSummary] = useState<Summary>({
    id:   '',
    title: '',
    content: '',
    type: '', 
    week_start: '',
    user_id: '',
    created_at: '',
  });
  const [content, setContent] = useState(''); // For ReactQuill editor content
  const [localSummaryId, setLocalSummaryId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<Date>(new Date()); // Default to current week
  const [sortField] = useState<'created_at'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Fetch all summaries for the logged-in user
    const handleFetchSummaries = async () => {
    try {
      // Get the current user ID (if needed)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User is not authenticated');
        return;
      }
  
      // Call your Netlify function
      const response = await fetch(`/.netlify/functions/getSummaries?user_id=${user.id}`);
      if (!response.ok) {
        console.error('Error fetching summaries:', await response.text());
        return;
      }
  
      const data = await response.json();
      setSummaries(data || []);
      setFilteredSummaries(data || []);
    } catch (err) {
      console.error('Unexpected error fetching summaries:', err);
    }
  };

  function openEditor(summary: Summary) {
    setSelectedSummary(summary);
    setIsEditorOpen(true);
  }
  console.log('isEditorOpen:', isEditorOpen);

  function closeEditor() {
    setIsEditorOpen(false);
    setSelectedSummary(null);
  }
  
  // Save the edited summary
  const handleSave = async (editedContent: string) => {
    try {
     await saveSummary(setLocalSummaryId, editedContent, 'User', selectedWeek);
      setSummary(editedContent);
      setSelectedWeek(selectedWeek);
      closeEditor();
      console.log('Local summary ID set:', localSummaryId);
    } catch (error) {
      console.error('Error saving edited summary:', error);
    }
  };
  
  const handleDeleteSummary = async (summaryId: string) => {
    if (!summaryId) {
      console.error('No summary ID provided to deleteSummary');
      return;
    }
    try {
      await deleteSummary(summaryId); // Use the summary ID passed as argument
      
      setNewSummary({
        id: summaryId,
        title: '',
        content: '',
        type: 'User',
        week_start: '',
        user_id: '',
        created_at: '',
      }); // Reset newSummary state
      setIsEditorOpen(false); // Close editor if open
      console.log('Summary deleted successfully');
      handleFetchSummaries(); // Refresh summaries after deleting
    } catch (error) {
      console.error('Error deleting summary:', error);
    }
  };

  const [filter, setFilter] = useState<string>(''); // For filtering summaries
  
  



  const sortedSummaries = [...filteredSummaries].sort((a, b) => {
    let aValue: string | number = a[sortField] ?? '';
    let bValue: string | number = b[sortField] ?? '';
  
    if (sortField === 'created_at') {
      const aDate = aValue ? new Date(aValue as string) : null;
      const bDate = bValue ? new Date(bValue as string) : null;
      const aTime = aDate && !isNaN(aDate.getTime()) ? aDate.getTime() : 0;
      const bTime = bDate && !isNaN(bDate.getTime()) ? bDate.getTime() : 0;
  
      if (aTime < bTime) return sortDirection === 'asc' ? -1 : 1;
      if (aTime > bTime) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    } else {
      const aStr = (aValue || '').toString().toLowerCase();
      const bStr = (bValue || '').toString().toLowerCase();
  
      if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    }
  });



// const handleAddSummary = async () => {
//   try {
//     await createSummary({
//       user_id,
//       content,
//       summary_type,
//       week_start,
//       title,
//     });
//     // ...refresh or update state
//   } catch (error) {
//     console.error('Error adding summary:', error);
//   }
// };

  const handleAddSummary = async () => {
    try {
      await fetch('/.netlify/functions/createSummary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary_id: newSummary.id,
          content,
          summary_type: newSummary.type || 'User', // Default to 'User' if not set
          title: newSummary.title,
        }),
      });
    }
    catch (err) {
      console.error('Unexpected error adding summary:', err);
    }
  };


  // const handleAddSummary = async () => {
  //   try {
  //     const { data: { user } } = await supabase.auth.getUser();
  //     if (!user) {
  //       console.error('User is not authenticated');
  //       return;
  //     }

  //     const { error } = await supabase.from('summaries').insert({
  //       ...newSummary,
  //       user_id: user.id,
  //       created_at: new Date().toISOString(),
  //     });

  //     if (error) {
  //       console.error('Error adding summary:', error.message);
  //       return;
  //     }

  //     handleFetchSummaries(); // Refresh summaries after adding
  //     setIsModalOpen(false);
  //     setNewSummary({
  //       id: '',
  //       title: '',
  //       content: '',
  //       type: 'AI',
  //       week_start: '',
  //       user_id: '',
  //       created_at: '',
  //     });
  //   } catch (err) {
  //     console.error('Unexpected error adding summary:', err);
  //   }
  // };


  // Filter summaries based on the filter state
  const handleFilterChange = (filterValue: string) => {
    setFilter(filterValue);
    if (filterValue) {
      const filtered = summaries.filter((summary) =>
        summary.title.toLowerCase().includes(filterValue.toLowerCase()) ||
        summary.type.toLowerCase().includes(filterValue.toLowerCase())
      );
      setFilteredSummaries(filtered);
    } else {
      setFilteredSummaries(summaries); // Reset to all summaries if no filter
    }
  };

  // AI-generate a summary
  // const handleAIGenerateSummary = async () => {
  //   try {
  //     const { data: { user } } = await supabase.auth.getUser();
  //     if (!user) {
  //       console.error('User is not authenticated');
  //       return;
  //     }

  //     // Simulate AI generation (replace with actual AI API call)
  //     const aiGeneratedContent = 'This is an AI-generated summary.';

  //     const { error } = await supabase.from('summaries').insert({
  //       title: 'AI Summary',
  //       content: aiGeneratedContent,
  //       type: 'AI-generated',
  //       user_id: user.id,
  //       created_at: new Date().toISOString(),
  //     });

  //     if (error) {
  //       console.error('Error generating AI summary:', error.message);
  //       return;
  //     }

  //     fetchSummaries(); // Refresh summaries after generating
  //   } catch (err) {
  //     console.error('Unexpected error generating AI summary:', err);
  //   }
  // };

  useEffect(() => {
    handleFetchSummaries();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className=" block sm:hidden">All Summaries</h1>
        <div className="space-x-4 py-4 w-full justify-end flex">
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary"
          >
            Add Summary
          </button>
        </div>
      </div> 

      {/* Filter Input */}
      <div className="mt-4 h-10 flex items-center space-x-2">
        <input
          type="text"
          value={filter}
          onChange={(e) => handleFilterChange(e.target.value)}
          placeholder="Filter by title, category, or impact"
          className="block w-full h-10 p-2 rounded-md border-gray-30 shadow-sm focus:border-brand-50 focus:ring-brand-50 sm:text-sm"
        />
        <button
          onClick={() => setSortDirection(dir => (dir === 'asc' ? 'desc' : 'asc'))}
          className="border rounded px-2 py-1"
          title="Toggle sort direction"
        >
          {sortDirection === 'asc' ? '↑' : '↓'}
        </button>
      </div>

      {/* Summaries List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {sortedSummaries.map((summary) =>
          <SummaryCard
            key={summary.id}
            content={summary.content}
            title={summary.title}
            type={summary.type}
            id={summary.id}
            created_at={summary.created_at}
            week_start={summary.week_start}
            handleDelete={() => handleDeleteSummary(summary.id)}
            handleEdit={() => openEditor(summary)}
          />
        )}
      </div>
      {isEditorOpen && selectedSummary && ( 
        <Modal
          isOpen={isEditorOpen}
          onRequestClose={closeEditor}
          className="fixed inset-0 flex items-center justify-center z-50"
          overlayClassName="fixed inset-0 bg-gray-500 bg-opacity-75"
        > 
          {/* <div className={modalClasses}> */}
           <div className={`${modalClasses}`}>
              <SummaryEditor
                // summaryId={selectedSummary?.id || ''} // Pass the correct summary ID
                initialContent={selectedSummary.content} // Pass the initial content
                onRequestClose={() => setSelectedSummary(null)} // Close the modal
                onSave={async (editedContent) => {
                  try {
                    // Save the edited summary as a new entry with summary_type === 'User'
                    // Optionally, you can also update the local state or refetch the summaries
                    await saveSummary(setLocalSummaryId, editedContent, 'User', selectedWeek);
                    closeEditor(); // Close the modal after saving
                    setSummary(editedContent); // Update the local state
                    handleFetchSummaries(); // Refresh summaries
                    console.log('Edited summary saved successfully');
                  } catch (error) {
                    console.error('Error saving edited summary:', error);
                  }
                }}
              />
            </div>
            
            {/* <div className='flex flex-row justify-end mt-4 gap-2'>
              <button
                onClick={() => closeEditor()}
                className="btn-secondary"
              >
                Cancel
              </button> 
              <button
                onClick={() => handleSave(
                  selectedSummary.content,
                )} // Save as 'User' type
                className="btn-primary"
              >
                Save edited summary
              </button> 
              
            </div> */}
          {/* </div> */}
        </Modal> 
       )}
        

      {/* Add Summary Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onRequestClose={() => setIsModalOpen(false)}
          className="fixed inset-0 flex items-center justify-center z-50"
          overlayClassName="fixed inset-0 bg-gray-500 bg-opacity-75"
        >
          <div className={`${modalClasses}`}>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add Summary</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  value={newSummary.title}
                  onChange={(e) =>
                    setNewSummary({ ...newSummary, title: e.target.value })
                  }
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Content</label>
                <ReactQuill
                    id={newSummary.id}
                    value={newSummary.content}
                    onChange={(value) =>
                      setNewSummary({ ...newSummary, content: value })
                    }
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="btn-secondary"
                aria-label="Cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSummary}
                className="btn-primary"
              >
                Add
              </button>
            </div>
          </div>
        </Modal>
       )}
    </div>
  );
};

export default AllSummaries;
