import { useState, useEffect } from 'react';
import Modal from 'react-modal';
import supabase from '@lib/supabase'; // Ensure this is the correct path to your Supabase client
import { fetchAllAccomplishmentsIndexed } from '@utils/functions';
import { Accomplishment } from '@utils/goalUtils'; // Adjust the import path as necessary
import AccomplishmentCard from './AccomplishmentCard';
import { modalClasses, overlayClasses } from '@styles/classes';
// import { over } from 'lodash';

Modal.setAppElement('#root');

// interface Accomplishment {
//   id: string;
//   title: string;
//   description: string;
//   impact: string;
//   category: string;
//   goal_id: string;
//   user_id: string;
//   created_at: string;
//   content: string;
//   type: string;
//   week_start: string;
// }

// Corrected assignment to use `indexedAccomplishments`
const AllAccomplishments = () => {
  const [accomplishments, setAccomplishments] = useState<Accomplishment[]>([]);
  const [filteredAccomplishments, setFilteredAccomplishments] = useState<Accomplishment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAccomplishment, setNewAccomplishment] = useState<Accomplishment>({
    id: '',
    title: '',
    description: '',
    impact: '',
    // category: 'Technical skills',
    goal_id: '',
    user_id: '',
    created_at: '',
    // content: '',
    // type: '',
    // week_start: '',
  });
  const [filter, setFilter] = useState<string>(''); // For filtering accomplishments
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [scope, setScope] = useState<'week' | 'month' | 'year'>('week');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedAccomplishment, setSelectedAccomplishment] = useState<Accomplishment | null>(null);

  useEffect(() => {
    const fetchAccomplishments = async () => {
      try {
        const fetchedAccomplishments = await fetchAllAccomplishmentsIndexed(scope);
        const accomplishmentsArray = Object.values(fetchedAccomplishments.indexedAccomplishments).flat();
        setFilteredAccomplishments(accomplishmentsArray);
      } catch (error) {
        console.error('Error fetching accomplishments:', error);
      }
    };
    fetchAccomplishments();
  }, [scope]);

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
        // category: 'Technical skills',
        goal_id: '',
        user_id: '',
        created_at: '',
        // content: '',
        // type: '',
        // week_start: '',
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
        accomplishment.description.toLowerCase().includes(filterValue.toLowerCase()) ||
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

  function openEditor(accomplishment: Accomplishment) {
    setSelectedAccomplishment(accomplishment);
    setIsEditorOpen(true);
  }

  function closeEditor() {
    setIsEditorOpen(false);
    setSelectedAccomplishment(null);
  }

  useEffect(() => {
    fetchAccomplishments();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className=" block sm:hidden">All accomplishments</h1>
        <div className="space-x-4 py-4 w-full justify-end flex">
          <button
            onClick={() => openModal()}
            className="btn-primary"
            title="Add Accomplishment"
            aria-label="Add Accomplishment"
            >
            Add Accomplishment
          </button>
        </div>
      </div> 

      {/* Scope Selector */}
        {/* <div>
            {['week', 'month', 'year'].map((s) => (
            <button
                key={s}
                onClick={() => setScope(s as 'week' | 'month' | 'year')}
                className={`btn-ghost ${scope === s ? 'font-bold underline' : ''}`}
            >
                {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
            ))}
        </div>
        <div className="flex justify-between items-center w-full mb-4"> */}
            {/* Pagination */}
            {/* <Pagination
                pages={pages}
                currentPage={currentPage}
                onPageChange={handlePageChange}
                scope={scope}
            />

            <button
                onClick={openGoalModal}
                className="btn-primary sm:block ml-auto pr-4"
                >
                Add Goal
            </button> */}
        {/* </div> */}

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

      {/* Scope Selector */}
      {/* <div>
        {['week', 'month', 'year'].map((s) => (
          <button
            key={s}
            onClick={() => setScope(s as 'week' | 'month' | 'year')}
            className={`btn ${scope === s ? 'font-bold underline' : ''}`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div> */}

      {/* Accomplishments List */}
      <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
        {filteredAccomplishments.map((accomplishment) => (
          <AccomplishmentCard
            key={accomplishment.id}
            id={accomplishment.id}
            title={accomplishment.title}
            description={accomplishment.description}
            impact={accomplishment.impact}
            // content={accomplishment.content}
            // type={accomplishment.type}
            created_at={accomplishment.created_at}
            // week_start={accomplishment.week_start}
            handleDelete={() => handleDeleteAccomplishment(accomplishment.id)}
            handleEdit={() => openEditor(accomplishment)}
          />
        ))}
        {isEditorOpen && (
          <Modal isOpen={isEditorOpen} onRequestClose={closeEditor}>
            <h2>Edit Accomplishment</h2>
            <p>{selectedAccomplishment?.title}</p>
            <button onClick={closeEditor}>Close</button>
          </Modal>
        )}
      </div>

      {/* Add Accomplishment Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onRequestClose={closeModal}
          className="fixed inset-0 flex items-center justify-center z-50"
          overlayClassName={`${overlayClasses}`}
          ariaHideApp={false} // Disable automatic aria-hidden management
        >
          <div className={`${modalClasses}`}>
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
              {/* <div>
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
              </div> */}
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

      {isEditorOpen && (
        <Modal 
          isOpen={isEditorOpen} 
          onRequestClose={closeEditor}
          className="fixed inset-0 flex items-center justify-center z-50"
          overlayClassName={`${overlayClasses}`}>
          <h2>Edit Accomplishment</h2>
          <p>{selectedAccomplishment?.title}</p>
          <button onClick={closeEditor}>Close</button>
        </Modal>
      )}
    </div>
  );
};

export default AllAccomplishments;