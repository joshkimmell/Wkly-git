import { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { cardClasses, modalClasses } from '@styles/classes';
import supabase from '@lib/supabase'; // Ensure this is the correct path to your Supabase client
import { DeleteIcon, Trash } from 'lucide-react';

Modal.setAppElement('#root');

interface Accomplishment {
  id: string;
  title: string;
  description: string;
  impact: string;
  category: string;
  goal_id: string;
  user_id: string;
  created_at: string;
}

const AllAccomplishments = () => {
  const [accomplishments, setAccomplishments] = useState<Accomplishment[]>([]);
  const [filteredAccomplishments, setFilteredAccomplishments] = useState<Accomplishment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAccomplishment, setNewAccomplishment] = useState<Accomplishment>({
    id: '',
    title: '',
    description: '',
    impact: '',
    category: 'Technical skills',
    goal_id: '',
    user_id: '',
    created_at: '',
  });
  const [filter, setFilter] = useState<string>(''); // For filtering accomplishments
  const [sortField] = useState<'created_at'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');


  
  // Fetch all accomplishments for the logged-in user
  const fetchAccomplishments = async () => {
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
        console.error('Error fetching accomplishments:', error.message);
        return;
      }

      setAccomplishments(data || []);
      setFilteredAccomplishments(data || []); // Initialize filtered accomplishments
    } catch (err) {
      console.error('Unexpected error fetching accomplishments:', err);
    }
  };

  const sortedAccomplishments = [...filteredAccomplishments].sort((a, b) => {
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

  // Add a new accomplishment
  const handleAddAccomplishment = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User is not authenticated');
        return;
      }

      const { error } = await supabase.from('accomplishments').insert({
        ...newAccomplishment,
        user_id: user.id,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error('Error adding accomplishment:', error.message);
        return;
      }

      fetchAccomplishments(); // Refresh accomplishments after adding
      setIsModalOpen(false);
      setNewAccomplishment({
        id: '',
        title: '',
        description: '',
        impact: '',
        category: 'Technical skills',
        goal_id: '',
        user_id: '',
        created_at: '',
      });
    } catch (err) {
      console.error('Unexpected error adding accomplishment:', err);
    }
  };

  // Delete an accomplishment
  const handleDeleteAccomplishment = async (accomplishmentId: string) => {
    try {
      const { error } = await supabase
        .from('accomplishments')
        .delete()
        .eq('id', accomplishmentId);

      if (error) {
        console.error('Error deleting accomplishment:', error.message);
        return;
      }

      fetchAccomplishments(); // Refresh accomplishments after deleting
    } catch (err) {
      console.error('Unexpected error deleting accomplishment:', err);
    }
  };

  // Filter accomplishments based on the filter state
  const handleFilterChange = (filterValue: string) => {
    setFilter(filterValue);
    if (filterValue) {
      const filtered = accomplishments.filter((accomplishment) =>
        accomplishment.title.toLowerCase().includes(filterValue.toLowerCase()) ||
        accomplishment.category.toLowerCase().includes(filterValue.toLowerCase()) ||
        accomplishment.impact.toLowerCase().includes(filterValue.toLowerCase())
      );
      setFilteredAccomplishments(filtered);
    } else {
      setFilteredAccomplishments(accomplishments); // Reset to all accomplishments if no filter
    }
  };

  const openModal = () => {
    if (!isModalOpen) {
      setIsModalOpen(true);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  useEffect(() => {
    fetchAccomplishments();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className=" block sm:hidden">All Accomplishments</h1>
        <button
          onClick={openModal}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Add Accomplishment
        </button>
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
      {/* <div className="mt-4">
        <input
          type="text"
          value={filter}
          onChange={(e) => handleFilterChange(e.target.value)}
          placeholder="Filter by title, category, or impact"
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div> */}

      {/* Accomplishments List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {sortedAccomplishments.map((accomplishment) => (
          <div key={accomplishment.id} className={`${cardClasses}`}>
            <div className="tabs flex flex-row items-center justify-end w-full">
              <span className="flex flex-col w-auto items-left px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-10 text-brand-90 my-0 mb-2">
                {accomplishment.category || 'Uncategorized'}
              </span>
            </div>
            <h4 >{accomplishment.title}</h4>
            <p>{accomplishment.description}</p>
            <p className="text-sm text-gray-60 dark:text-gray-40 mt-2">{accomplishment.impact}</p>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => handleDeleteAccomplishment(accomplishment.id)}
                className="btn-ghost hover:bg-gray-20 dark:hover:bg-gray-70"
              >
                <Trash className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Accomplishment Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onRequestClose={closeModal}
          className="fixed inset-0 flex items-center justify-center z-50"
          overlayClassName="fixed inset-0 bg-gray-500 bg-opacity-75"
          ariaHideApp={false} // Disable automatic aria-hidden management
        >
          <div className="bg-white rounded-lg shadow-lg p-6 w-96">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add Accomplishment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  value={newAccomplishment.title}
                  onChange={(e) =>
                    setNewAccomplishment({ ...newAccomplishment, title: e.target.value })
                  }
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={newAccomplishment.description}
                  onChange={(e) =>
                    setNewAccomplishment({ ...newAccomplishment, description: e.target.value })
                  }
                  rows={4}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Impact</label>
                <input
                  type="text"
                  value={newAccomplishment.impact}
                  onChange={(e) =>
                    setNewAccomplishment({ ...newAccomplishment, impact: e.target.value })
                  }
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  value={newAccomplishment.category}
                  onChange={(e) =>
                    setNewAccomplishment({ ...newAccomplishment, category: e.target.value })
                  }
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="Technical skills">Technical skills</option>
                  <option value="Business">Business</option>
                  <option value="Eminence">Eminence</option>
                  <option value="Concepts">Concepts</option>
                  <option value="Community">Community</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAccomplishment}
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

export default AllAccomplishments;