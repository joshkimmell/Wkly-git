import { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { Summary } from '@utils/goalUtils'; // Adjust the import path as necessary
import { fetchSummaries, createSummary, deleteSummary, saveSummary } from '@utils/functions'; // Adjust the import path as necessary
import supabase from '@lib/supabase'; // Ensure this is the correct path to your Supabase client
import SummaryCard from '@components/SummaryCard';
import SummaryEditor from '@components/SummaryEditor';
// import SummaryGenerator from '@components/SummaryGenerator';
import { modalClasses, overlayClasses } from '@styles/classes'; // Adjust the import path as necessary
import ReactQuill from 'react-quill';
// import Editor from '@components/Editor';

Modal.setAppElement('#root');

const AllSummaries = () => {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [filteredSummaries, setFilteredSummaries] = useState<Summary[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Removed unused summaryType state
  const [newSummary, setNewSummary] = useState<Summary>({
    id:   '',
    scope: 'week', // Default scope
    title: '',
    content: '',
    type: '', 
    week_start: '',
    user_id: '',
    created_at: '',
  });
  const [localSummaryId, setLocalSummaryId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null);
  const [sortField] = useState<'created_at'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [filter, setFilter] = useState<string>(''); // For filtering summaries
  
  useEffect(() => {
    setFilteredSummaries(summaries); // Initialize filteredSummaries with summaries
  }, [summaries]);

  // Removed scope-related state and logic

  // Corrected fetchSummaries call with required arguments
  const fetchSummariesData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User is not authenticated');
        return;
      }
      const response = await fetchSummaries(user.id, ''); // Provided required arguments
      setSummaries(response || []);
      setFilteredSummaries(response || []);
    } catch (error) {
      console.error('Error fetching summaries:', error);
    }
  };

  useEffect(() => {
    fetchSummariesData();
  }, []);

  function openEditor(summary: Summary) {
    setSelectedSummary(summary);
    setIsEditorOpen(true);
  }
  console.log('isEditorOpen:', isEditorOpen);

  function closeEditor() {
    setIsEditorOpen(false);
    setSelectedSummary(null);
  }
  const handleFetchSummaries = async () => {
    try {
      // Get the current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User is not authenticated');
        return;
      }
      // Fetch summaries from the server
      const response = await fetchSummaries(user.id, localSummaryId ?? ''); // Pass user ID and localSummaryId if needed
      if (!response) {
        console.error('Error fetching summaries:', response);
        return;
      }
      const data = response;
      setSummaries(data || []);
    } catch (err) {
      console.error('Unexpected error fetching summaries:', err);
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
        scope: 'week', // Default scope
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

  const handleAddSummary = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const title = formData.get('title') as string;
    const content = formData.get('content') as string;
    const week_start = formData.get('week_start') as string;
    // const summary_type = formData.get('summary_type') as string;

    // Get user_id from your auth/session context
    const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User is not authenticated');
        return;
      }
    const user_id = user; // Ensure user_id is defined
      await createSummary({
        user_id,        
        content,        // string, not undefined
        summary_type: 'User',   
        week_start,     // string, e.g. '2025-06-02'
        title,
      });
      setNewSummary({
        id: '',
        scope: 'week', // Default scope
        title: '',
        content: '',
        type: 'User',
        week_start: '',
        user_id: user.id,
        created_at: new Date().toISOString(), // Set created_at to current time
      });
      setIsModalOpen(false); // Close the modal after adding
      handleFetchSummaries(); // Refresh summaries after adding
      console.log('Summary added successfully');
    // Reset the form fields
    form.reset();
  };

  // Updated handleFilterChange to include filtering by content
  const handleFilterChange = (filterValue: string) => {
    setFilter(filterValue);
    if (filterValue) {
      const filtered = summaries.filter((summary) =>
        summary.title.toLowerCase().includes(filterValue.toLowerCase()) ||
        summary.type.toLowerCase().includes(filterValue.toLowerCase()) ||
        summary.content.toLowerCase().includes(filterValue.toLowerCase()) // Added content filtering
      );
      setFilteredSummaries(filtered);
    } else {
      setFilteredSummaries(summaries); // Reset to all summaries if no filter
    }
  };

  useEffect(() => {
    handleFetchSummaries();
  }, []);

  // Update the Summaries list rendering logic to apply filtering and sorting
  const sortedAndFilteredSummaries = filteredSummaries.sort((a, b) => {
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

  // Add a function to highlight filtered words
  const applyHighlight = (text: string, filter: string) => {
    if (!filter) return text;
    const regex = new RegExp(`(${filter})`, 'gi');
    return text.replace(regex, '<span class="bg-brand-10 text-brand-90 inline-block">$1</span>');
  };

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
        {sortedAndFilteredSummaries.map((summary) => (
          <SummaryCard
            key={summary.id}
            content={applyHighlight(summary.content, filter)}
            title={applyHighlight(summary.title, filter)}
            type={applyHighlight(summary.type, filter)}
            id={summary.id}
            created_at={summary.created_at}
            week_start={summary.week_start}
            handleDelete={() => handleDeleteSummary(summary.id)}
            handleEdit={() => openEditor(summary)}
          />
        ))}
      </div>
      {sortedAndFilteredSummaries.length === 0 && (
        <div className="text-center text-gray-500 mt-4">
          No summaries found.
        </div>
      )}
      {isEditorOpen && selectedSummary && ( 
        <Modal
            key={selectedSummary.id} // Use the summary ID as the key
            isOpen={!!selectedSummary} // Ensure modal is open only when selectedSummary is set
            onRequestClose={() => setSelectedSummary(null)} // Close the modal properly
            className={`fixed inset-0 flex items-center justify-center z-50`}
            overlayClassName={`${overlayClasses}`}
          >
            {/* <div className={`${modalClasses}`}> */}
              <SummaryEditor
                id={selectedSummary.id}
                type='User' // Assuming 'User' is the type for user-edited summaries  
                title={selectedSummary.title} // Pass the initial title
                content={selectedSummary.content} // Pass the initial content
                onRequestClose={() => setSelectedSummary(null)} // Close the modal
                onSave={async (editedContent, editedTitle) => {
                  try {
                    // Save the edited summary as a new entry with summary_type === 'User'
                    // Optionally, you can also update the local state or refetch the summaries
                    saveSummary(
                      setLocalSummaryId,
                      editedTitle || selectedSummary.title,
                      editedContent,
                      'User',
                      new Date()
                    );
                    closeEditor(); // Close the modal after saving
                    // setSummary(editedContent, editedTitle, 'User'); // Update the local state
                    handleFetchSummaries(); // Refresh summaries after adding
                    console.log('Edited summary saved successfully');
                  } catch (error) {
                    console.error('Error saving edited summary:', error);
                  }
                }}
              />
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
          
          {/* Uncomment this section if you want to use the form directly */}
          <form id="summaryForm" onSubmit={handleAddSummary} className={`${modalClasses}`}>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add Summary</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  name="title"
                  type="text"
                  value={newSummary.title}
                  onChange={(e) =>
                    setNewSummary({ ...newSummary, title: e.target.value })
                  }
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Select timeframe</label>
                <input
                  name="week_start"
                  type="date"
                  value={newSummary.week_start}
                  onChange={(e) =>
                    setNewSummary({ ...newSummary, week_start: e.target.value })
                  }
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Content</label>
                <ReactQuill
                  id={newSummary.id}
                  value={newSummary.content}
                  className=""
                  
                  onChange={(value) =>
                    setNewSummary({ ...newSummary, content: value })
                  }
                  // ReactQuill does not support the "name" prop directly,
                  // but you can add a hidden input to include it in form data:
                />
                
                <input
                  type="hidden"
                  name="content"
                  value={newSummary.content}
                  readOnly
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
                type="submit"
                className="btn-primary"
              >
                Add
              </button>
            </div>
          </form>
        </Modal>
       )}
    </div>
  );
};

export default AllSummaries;
