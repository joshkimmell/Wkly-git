import React, { useState, useEffect } from 'react';
import supabase from '@lib/supabase'; // Ensure this is the correct path to your Supabase client
// import { handleDeleteGoal } from '@utils/functions';
import { Goal, Accomplishment } from '@utils/goalUtils'; // Adjust the import path as necessary
import { ChevronDown, ChevronUp, Trash, Edit } from 'lucide-react';

interface GoalCardProps {
  goal: Goal;
  handleDelete: (goalId: string) => void;
  handleEdit: (goalId: string) => void;
}

// const GoalCard: React.FC<GoalCardProps> = ({ goal }) => {
const GoalCard: React.FC<GoalCardProps> = ({ goal, handleDelete, handleEdit }) => {
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
          category: goal.category,
          week_start: goal.week_start,
        });

        if (error) {
          console.error('Error adding accomplishment:', error.message);
          return;
        }

        fetchAccomplishments();
        setNewAccomplishment({ title: '', description: '', impact: '' });
        setIsModalOpen(false);
      } catch (err) {
        console.error('Unexpected error:', err);
      }
    }
  };

  
  
  return (
    <div key={goal.id} className="bg-white shadow-sm border rounded-lg p-4">
      <div className="flex flex-col justify-between">
        <div className='goal-header flex flex-row w-full justify-right align-right'>
          <button
            onClick={() => {
              console.log('Deleting Goal ID:', goal.id); // Log the goal ID
              handleDelete(goal.id);
            }}
            className="text-red-600 hover:text-red-800"
            >
            <Trash className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleEdit(goal.id)}
            className="text-blue-600 hover:text-blue-800 ml-2"
            >
            <Edit className="w-5 h-5" />
          </button>
        </div>
        <div className="goal-content flex flex-col mt-2">
          <h4 className="text-lg font-medium text-gray-900">{goal.title || 'Untitled Goal'}</h4>
          <p className="text-gray-600 mt-1">{goal.description || 'No description provided.'}</p>
          <span className="flex flex-col w-auto items-left px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 mt-2">
            {goal.category || 'Uncategorized'}
          </span>
        </div>
        <footer className="mt-2 text-sm text-gray-500">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-indigo-600 hover:underline text-sm w-full"
            >
            {isExpanded ? (
              <h4 className="text-sm font-semibold text-gray-900 flex flex-row items-center justify-between w-full">
              Accomplishments
              <ChevronUp className="w-5 h-5" />
            </h4>
            ) : (
              <h4 className="text-sm font-semibold text-gray-900 flex flex-row items-center justify-between w-full">
              Accomplishments
                <ChevronDown className="w-5 h-5 mt-1" />
              </h4>
            )}
          </button>
        </footer>

      {isExpanded && (
        <div className="goal-accomplishments mt-4">
          {/* <h4 className="text-sm font-semibold text-gray-900">Accomplishments</h4> */}
          <ul className="list-none list-inside text-gray-700 mt-2 space-y-1">
            {accomplishments.map((accomplishment) => (
              <li key={accomplishment.id}>
                <h5>
                  <strong>{accomplishment.title}</strong>
                </h5>
                <p>
                  {accomplishment.description}{' '}
                  <span className="text-sm">{accomplishment.impact}</span>
                </p>
              </li>
            ))}
          </ul>
          <button
          onClick={() => setIsModalOpen(true)}
          className="mt-4 inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
          Add Accomplishment
          </button>
        </div>
      )}
          
      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
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
        rows={3}
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
        </div>
        <div className="mt-6 flex justify-end space-x-4">
        <button
        onClick={() => setIsModalOpen(false)}
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
        </div>
      )}
    </div>
    </div>
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