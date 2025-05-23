import { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { Summary } from '@utils/goalUtils'; // Adjust the import path as necessary
import supabase from '@lib/supabase'; // Ensure this is the correct path to your Supabase client
import SummaryCard from '@components/SummaryCard';

Modal.setAppElement('#root');

const AllSummaries = () => {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [filteredSummaries, setFilteredSummaries] = useState<Summary[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSummary, setNewSummary] = useState<Summary>({
    id: '',
    title: '',
    content: '',
    type: 'AI-generated',
    week_start: '',
    user_id: '',
  });
  const [filter, setFilter] = useState<string>(''); // For filtering summaries

  // Fetch all summaries for the logged-in user
  const fetchSummaries = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User is not authenticated');
        return;
      }

      const { data, error } = await supabase
        .from('summaries')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching summaries:', error.message);
        return;
      }

      setSummaries(data || []);
      setFilteredSummaries(data || []); // Initialize filtered summaries
    } catch (err) {
      console.error('Unexpected error fetching summaries:', err);
    }
  };

  // Add a new summary
  const handleAddSummary = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User is not authenticated');
        return;
      }

      const { error } = await supabase.from('summaries').insert({
        ...newSummary,
        user_id: user.id,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error('Error adding summary:', error.message);
        return;
      }

      fetchSummaries(); // Refresh summaries after adding
      setIsModalOpen(false);
      setNewSummary({
        id: '',
        title: '',
        content: '',
        type: 'AI-generated',
        week_start: '',
        user_id: '',
      });
    } catch (err) {
      console.error('Unexpected error adding summary:', err);
    }
  };

  // Delete a summary
  const handleDeleteSummary = async (summaryId: string) => {
    try {
      const { error } = await supabase
        .from('summaries')
        .delete()
        .eq('id', summaryId);

      if (error) {
        console.error('Error deleting summary:', error.message);
        return;
      }

      fetchSummaries(); // Refresh summaries after deleting
    } catch (err) {
      console.error('Unexpected error deleting summary:', err);
    }
  };

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
  const handleAIGenerateSummary = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User is not authenticated');
        return;
      }

      // Simulate AI generation (replace with actual AI API call)
      const aiGeneratedContent = 'This is an AI-generated summary.';

      const { error } = await supabase.from('summaries').insert({
        title: 'AI Summary',
        content: aiGeneratedContent,
        type: 'AI-generated',
        user_id: user.id,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error('Error generating AI summary:', error.message);
        return;
      }

      fetchSummaries(); // Refresh summaries after generating
    } catch (err) {
      console.error('Unexpected error generating AI summary:', err);
    }
  };

  useEffect(() => {
    fetchSummaries();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">All Summaries</h1>
        <div className="space-x-4">
          <button
            onClick={handleAIGenerateSummary}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            AI Generate Summary
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Add Summary
          </button>
        </div>
      </div>

      {/* Filter Input */}
      <div className="mt-4">
        <input
          type="text"
          value={filter}
          onChange={(e) => handleFilterChange(e.target.value)}
          placeholder="Filter by title or type"
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      {/* Summaries List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredSummaries.map((summary) => (
          // <div key={summary.id} className="bg-white shadow-sm border rounded-lg p-4">
          //   <h4 className="text-lg font-medium text-gray-900">{summary.title}</h4>
          //   <p className="text-gray-600 mt-1">{summary.content}</p>
          //   <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 mt-2">
          //     {summary.type}
          //   </span>
          //   <div className="mt-4 flex justify-end space-x-2">
          //     <button
          //       onClick={() => handleDeleteSummary(summary.id)}
          //       className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          //     >
          //       Delete
          //     </button>
          //   </div>
          // </div>

          
          // <SummaryCard
          // // summary={summary}
          //   key={summary.id}
          //   handleDelete={handleDeleteSummary}
          //   handleEdit={() => {}}
          // />
          <SummaryCard
            key={summary.id}
            summary={summary}
            handleDelete={handleDeleteSummary}
            handleEdit={() => console.log(`Edit summary: ${summary.id}`)} // Placeholder for edit functionality
          />
        ))}
      </div>

      {/* Add Summary Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onRequestClose={() => setIsModalOpen(false)}
          className="fixed inset-0 flex items-center justify-center z-50"
          overlayClassName="fixed inset-0 bg-gray-500 bg-opacity-75"
        >
          <div className="bg-white rounded-lg shadow-lg p-6 w-96">
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
                <textarea
                  value={newSummary.content}
                  onChange={(e) =>
                    setNewSummary({ ...newSummary, content: e.target.value })
                  }
                  rows={4}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <select
                  value={newSummary.type}
                  onChange={(e) =>
                    setNewSummary({ ...newSummary, type: e.target.value as 'AI-generated' | 'Edited' })
                  }
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="AI-generated">AI-generated</option>
                  <option value="Edited">Edited</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSummary}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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