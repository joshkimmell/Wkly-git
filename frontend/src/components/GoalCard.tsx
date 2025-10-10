import React, { useState, useEffect } from 'react';
import supabase from '@lib/supabase'; // Ensure this is the correct path to your Supabase client
// import { handleDeleteGoal } from '@utils/functions';
import { Goal, Accomplishment } from '@utils/goalUtils'; // Adjust the import path as necessary
import { ChevronDown, ChevronUp, Trash, Edit } from 'lucide-react';
import { cardClasses, modalClasses } from '@styles/classes'; // Adjust the import path as necessary
// import { Link } from 'react-router-dom';
import { applyHighlight } from '@utils/functions'; // Adjust the import path as necessary


interface GoalCardProps {
  goal: Goal; // Add the goal prop to access goal properties
  handleDelete: (goalId: string) => void;
  handleEdit: (goalId: string) => void;
  filter: string; // Accept filter as a prop
}

// const GoalCard: React.FC<GoalCardProps> = ({ goal }) => {
const GoalCard: React.FC<GoalCardProps> = ({ 
  goal, 
  handleDelete, 
  handleEdit,
  filter // Accept filter as a prop
 }) => {
  // // const handleDeleteGoal = (goalId: string) => {
  //   // Implement the delete logic here
    // console.log(`Deleting goal with ID: ${goal.id}`);
  // };

  // const handleEdit = () => {
  //   // Implement the edit logic here
    // console.log('Editing goal');
  // };
  const [accomplishments, setAccomplishments] = useState<Accomplishment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); // State to track expansion
  const [newAccomplishment, setNewAccomplishment] = useState({
    title: '',
    description: '',
    impact: '',
  });

  const openModal = () => {
    if (!isModalOpen) {
      setIsModalOpen(true);
    }
  };

  const closeModal = () => {
    if (isModalOpen) {
      setIsModalOpen(false);
    }
  };

  // Fetch accomplishments from the backend
  const fetchAccomplishments = async () => {
    try {
      const { data, error } = await supabase
        .from('accomplishments')
        .select('*')
        .eq('goal_id', goal.id);

      if (error) {
        console.error('Error fetching accomplishments:', error.message);
        return;
      }

      setAccomplishments(data || []);
    } catch (err) {
      console.error('Unexpected error fetching accomplishments:', err);
    }
  };

  // Fetch accomplishments when the component mounts
  useEffect(() => {
    fetchAccomplishments();
  }, [goal.id]);

  const handleAddAccomplishment = async () => {
    if (
      newAccomplishment.title.trim() &&
      newAccomplishment.description.trim() &&
      newAccomplishment.impact.trim()
    ) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error('User is not authenticated');
          return;
        }

        const { error } = await supabase.from('accomplishments').insert({
          title: newAccomplishment.title,
          description: newAccomplishment.description,
          impact: newAccomplishment.impact,
          goal_id: goal.id,
          user_id: user.id,
          // category: goal.category,
          week_start: goal.week_start,
        });

        if (error) {
          console.error('Error adding accomplishment:', error.message);
          return;
        }

        fetchAccomplishments();
        setNewAccomplishment({ title: '', description: '', impact: '' });
        closeModal();
      } catch (err) {
        console.error('Unexpected error:', err);
      }
    }
  };

  return (
    <div key={goal.id} className={`${cardClasses} shadow-xl`}>
      <div className="goal-header flex flex-row w-full justify-between items-center">
        <div className="tabs flex flex-row items-center justify-end w-full">
          <span className="card-category" dangerouslySetInnerHTML={{ __html: applyHighlight(goal.category, filter) || 'No category provided.' }}>
          </span>
        </div>
      </div>
      <div className="goal-content flex flex-col mt-2 flex-grow">
        <h4 className={`card-title text-lg text-gray-90 dark:text-gray-10 font-medium`} dangerouslySetInnerHTML={{ __html: applyHighlight(goal.title, filter) || 'Untitled Goal' }}>
        </h4>
        <p className={`text-gray-60 dark:text-gray-40 mt-1`} dangerouslySetInnerHTML={{ __html: applyHighlight(goal.description, filter) || 'No description provided.' }}>
        </p>
      </div>
      {/* Footer with accomplishments and actions */}
      <footer className="mt-2 text-sm text-gray-50 dark:text-gray-30 flex flex-col items-left justify-between">
        { accomplishments.length > 0 && ( 
          <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="px-0 text-gray-90 dark:text-gray-10 bg-transparent hover:bg-transparent border-none focus-visible:outline-none  flex flex-row items-center justify-between w-full"
          >
            <h4 className="text-sm font-semibold text-gray-90 dark:text-gray-10  flex flex-row items-center justify-between w-full">
              Accomplishments ({accomplishments.length})
            {isExpanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </h4>
            
        </button>
          )} 
        
          {isExpanded && (
            <div className="goal-accomplishments mt-4">
              {/* <h4 className="text-sm font-semibold text-gray-900">Accomplishments</h4> */}
              <ul className="list-none list-inside text-gray-700 mt-2 space-y-1">
                {accomplishments.map((accomplishment) => (
                  <li key={accomplishment.id}>
                    <h5 className="text-md font-semibold text-gray-80 dark:text-gray-20">
                      {accomplishment.title}
                    </h5>
                    <p className="text-md text-gray-60 dark:text-gray-40">
                      {accomplishment.description}
                    </p>
                    <label className="text-sm text-gray-40 dark:text-gray-50">Impact: {accomplishment.impact}</label>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button
            // to='#'
            onClick={() => openModal()}
            className="mt-2 btn-ghost w-full border-none text-sm font-semibold text-brand-70 dark:text-brand-20 hover:text-brand-90 dark:hover:text-brand-10"
            >
            Add Accomplishment
          </button>
          <div className='flex flex-row w-full justify-end'>
            <button
              onClick={() => {
                console.log('Deleting Goal ID:', goal.id); // Log the goal ID
                handleDelete(goal.id);
              }}
              className="btn-ghost w-auto"
              >
              <Trash className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleEdit(goal.id)}
              className="btn-ghost w-auto"
              >
              <Edit className="w-5 h-5" />
            </button>
          </div>
      </footer>
        
    {/* Modal */}
    {isModalOpen && (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className={`${modalClasses}`}>
      <h3 className="text-lg font-medium text-gray-90 mb-4">Add Accomplishment</h3>
      <div className="space-y-4">
      <div>
      <label className="block text-sm font-medium text-gray-70 dark:text-gray-40">Title</label>
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
      <label className="block text-sm font-medium text-gray-70 dark:text-gray-40">Description</label>
      <textarea
      value={newAccomplishment.description}
      onChange={(e) =>
        setNewAccomplishment({ ...newAccomplishment, description: e.target.value })
      }
      rows={3}
      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
      />
      </div>
      <div>
      <label className="block text-sm font-medium text-gray-70 dark:text-gray-40">Impact</label>
      <input
      type="text"
      value={newAccomplishment.impact}
      onChange={(e) =>
        setNewAccomplishment({ ...newAccomplishment, impact: e.target.value })
      }
      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
      />
      </div>
      </div>
      <div className="mt-6 flex justify-end space-x-4">
      <button
      onClick={() => closeModal()}
      className="btn-secondary"
      >
      Cancel
      </button>
      <button
      onClick={handleAddAccomplishment}
      className="btn-primary"
      >
      Add
      </button>
      </div>
      </div>
      </div>
    )}
    {/* Render children if provided */}
    {/* {children && <div className="goal-children">{children}</div>} */}
  </div>

  // </div>
  );
};
      
export default GoalCard;

      // <div key={goal.id} className="bg-white shadow-sm border rounded-lg p-4">
      //   <h4 className="text-lg font-medium text-gray-900">{goal.title}</h4>
      //   <p className="text-gray-600 mt-1">{goal.description}</p>
      //   <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 mt-2">
      //     {goal.category}
      //   </span>
      //   {/* <p className="text-sm text-gray-500 mt-2">{goal.impact}</p> */}
      //   <div className="mt-4 flex justify-end space-x-2">
      //     <button
      //       onClick={() => handleDeleteGoal(goal.id)}
      //       className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
      //     >
      //       Delete
      //     </button>
      //   </div>
      // </div>