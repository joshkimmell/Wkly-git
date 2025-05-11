import { useEffect, useState } from 'react';
import { userString, fetchGoals, addGoal, deleteGoal, updateGoal } from '@utils/functions';
import SummaryGenerator from '@components/SummaryGenerator';
import SummaryEditor from '@components/SummaryEditor';
import GoalCard from '@components/GoalCard';
import Modal from 'react-modal';
import { Goal } from '@utils/goalUtils';
import supabase from '@lib/supabase';
import 'react-datepicker/dist/react-datepicker.css';

const WeeklyGoals = () => {
  const [selectedSummary, /*setSelectedSummary*/] = useState<{
    id: string;
    content: string;
} | null>(null);
const [userId, setUserId] = useState<string | null>(null); // Use state for userId  
const [goals, setGoals] = useState<Goal[]>([]);
  const [filteredGoals, setFilteredGoals] = useState<Goal[]>([]);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [newGoal, setNewGoal] = useState<Goal>({
    id: '',
    user_id: '',
    title: '',
    description: '',
    category: 'Technical skills',
    week_start: '',
  });
  const [filter, setFilter] = useState<string>(''); // For filtering goals
  const [selectedWeek, setSelectedWeek] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [weekOptions, setWeekOptions] = useState<Date[]>([]); // Store weeks as Date objects
  
  // Fetch the user ID on component mount
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const id = await userString();
        setUserId(id); // Set the userId in state
        console.log('User ID:', id);
      } catch (error) {
        console.error('Error fetching user ID:', error);
      }
    };
  
    fetchUserId();
  }, []);

  function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  const formattedDate = formatDate(selectedWeek);

  // Fetch all distinct weeks 
  const fetchWeeks = async () => {
    try {
      if (!userId) {
        console.error('User is not authenticated');
        return;
      }

      // Call the get_unique_weeks function
      const { data: weeksData, error: weeksError } = await supabase.rpc('get_unique_weeks', {
        user_id: userId,
      });

      if (weeksError) {
        console.error('Error fetching weeks:', weeksError.message);
        return;
      }

      // Convert week_start strings to Date objects
      const weeks = weeksData.map((week: { week_start: string | number | Date; }) => new Date(week.week_start));

      setWeekOptions(weeks); // Populate dropdown options with unique Date objects
      setSelectedWeek(weeks[0] || new Date()); // Default to the first week
    } catch (err) {
      console.error('Unexpected error fetching weeks and goals:', err);
    }
  };

   // Fetch all goals
   const fetchWeeklyGoals = async () => {
    try {
      if (!userId) {
        console.error('User is not authenticated');
        return;
      }
      await fetchWeeks(); // Fetch weeks first
      // Fetch goals for the selected week
      const data = await fetchGoals(formattedDate);
      setGoals(data);

      // Apply filter and week selection
      const weekString = formattedDate;
      const filtered = data.filter((goal: { week_start: string; title: string; category: string; description: string; }) =>
        goal.week_start === weekString &&
        (goal.title.toLowerCase().includes(filter.toLowerCase()) ||
          goal.category.toLowerCase().includes(filter.toLowerCase()) ||
          goal.description.toLowerCase().includes(filter.toLowerCase()))
      );
      setFilteredGoals(filtered);
    } catch (error) {
      console.error('Error fetching goals:', error);
    }
  };

  const refreshGoals = async () => {
    try {
      await fetchWeeklyGoals(); // Fetch the latest goals
      console.log('Goals refreshed successfully');
    } catch (error) {
      console.error('Error refreshing goals:', error);
    }
  };

  // Add a new goal
  const handleAddGoal = async () => {
    try {
      if (!userId) {
        console.error('User is not authenticated');
        return;
      }

      const goalToAdd = { ...newGoal, user_id: userId };
      await addGoal(goalToAdd); // Use addGoal from functions.ts
      setNewGoal({
        id: '',
        user_id: '',
        title: '',
        description: '',
        category: 'Technical skills',
        week_start: '',
      }); // Reset newGoal state to default
      setIsGoalModalOpen(false); // Close the modal
      // refreshGoals(); // Refresh goals after adding
    } catch (error) {
      console.error('Error adding goal:', error);
    }
  };

  // Delete a goal
  const handleDeleteGoal = async (goalId: string) => {
    try {
      if (!userId) {
        console.error('User is not authenticated');
        return;
      }

      await deleteGoal(goalId);
      setGoals((prevGoals) => prevGoals.filter((goal) => goal.id !== goalId)); // Remove the deleted goal from state
      setFilteredGoals((prevFilteredGoals) =>
        prevFilteredGoals.filter((goal) => goal.id !== goalId)
      ); // Update filtered goals
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  };

  // Update a goal (example usage)
  const handleUpdateGoal = async (goalId: string, updatedGoal: any) => {
    try {
      if (!userId) {
        console.error('User is not authenticated');
        return;
      }

      await updateGoal(goalId, updatedGoal);
      // refreshGoals(); // Refresh goals after updating
      setFilteredGoals((prevFilteredGoals) =>
        prevFilteredGoals.filter((goal) => goal.id !== goalId)
      ); // Update filtered goals
    } catch (error) {
      console.error('Error updating goal:', error);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchWeeks();
      fetchWeeklyGoals();
    }
  }, [userId]); // Re-run when userId is set


  // Filter goals based on the filter state
  const handleFilterChange = (filterValue: string) => {
    setFilter(filterValue);
    if (filterValue) {
      const filtered = goals.filter((goal) =>
        goal.title.toLowerCase().includes(filterValue.toLowerCase()) ||
        goal.category.toLowerCase().includes(filterValue.toLowerCase()) ||
        goal.description.toLowerCase().includes(filterValue.toLowerCase()) ||
        goal.week_start.toLowerCase().includes(filterValue.toLowerCase())
      );
      setFilteredGoals(filtered);
    } else {
      setFilteredGoals(goals); // Reset to all goals if no filter
    }
  };

  // Filter goals by the selected week
  const filterGoalsByWeek = (week: Date) => {
    const weekString = week.toISOString().split('T')[0]; // Convert Date to YYYY-MM-DD
    const filtered = goals.filter((goal) => goal.week_start === weekString);
    setFilteredGoals(filtered);
  };

  // Handle week selection from the dropdown
  const handleWeekChange = (weekString: string) => {
    const week = new Date(weekString); // Convert string to Date
    setSelectedWeek(week);
    filterGoalsByWeek(week);
  };

  // Navigate to the previous week
  const handlePreviousWeek = () => {
    const currentIndex = weekOptions.findIndex((week) => week.getTime() === selectedWeek.getTime());
    if (currentIndex > 0) {
      const previousWeek = weekOptions[currentIndex - 1];
      setSelectedWeek(previousWeek);
      filterGoalsByWeek(previousWeek);
    }
  };

  // Navigate to the next week
  const handleNextWeek = () => {
    const currentIndex = weekOptions.findIndex((week) => week.getTime() === selectedWeek.getTime());
    if (currentIndex < weekOptions.length - 1) {
      const nextWeek = weekOptions[currentIndex + 1];
      setSelectedWeek(nextWeek);
      filterGoalsByWeek(nextWeek);
    }
  };

  const openGoalModal = () => {
    if (!isGoalModalOpen) {
      setIsGoalModalOpen(true);
    }
  };

  const closeGoalModal = () => {
    setIsGoalModalOpen(false);
  };

  useEffect(() => {
    if (userId) {
      fetchWeeks();
      fetchWeeklyGoals();
    }
  }, [userId]); // Re-run when userId is set

  

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Weekly Goals</h1>
        <button
          onClick={openGoalModal}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Add Goal
        </button>
      </div>

      {/* Week Selector */}
      <div className="flex items-center space-x-4">
        <button
          onClick={handlePreviousWeek}
          disabled={weekOptions.findIndex((week) => week.getTime() === selectedWeek.getTime()) === 0}
          className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
        >
          Previous
        </button>
          <select
            value={selectedWeek.toISOString().split('T')[0]} // Convert Date to YYYY-MM-DD for the dropdown
            onChange={(e) => handleWeekChange(e.target.value)}
            className="px-4 py-2 border rounded-md"
          >
            {weekOptions.map((week) => (
              <option key={week.toISOString()} value={week.toISOString().split('T')[0]}>
                {week.toLocaleDateString()} {/* Format week_start */}
              </option>
            ))}
          </select>
        
        <button
          onClick={handleNextWeek}
          disabled={weekOptions.findIndex((week) => week.getTime() === selectedWeek.getTime()) === weekOptions.length - 1}
          className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {/* Filter Input */}
      <div className="mt-4 h-10">
        <input
          type="text"
          value={filter}
          onChange={(e) => handleFilterChange(e.target.value)}
          placeholder="Filter by title, category, or impact"
          className="block w-full h-10 p-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      {/* Goals List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredGoals.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            handleDelete={(goalId) => {
              console.log('Parent Component - Deleting Goal ID:', goalId); // Log the goal ID in the parent
              handleDeleteGoal(goalId);
            }}
            handleEdit={(goalId) => {
              console.log('Parent Component - Editing Goal ID:', goalId); // Log the goal ID in the parent
              handleUpdateGoal(goalId, goal);
            }}
          />
        ))}
      </div>
      {/* Summary Generator and Editor */}
        <div className="mt-6">
            <h2 className="text-xl font-semibold text-gray-900">Summary</h2>
            <p className="text-gray-600">Generate and edit your weekly summary.</p>
        </div>
         <div>
            <SummaryGenerator selectedWeek={selectedWeek} filteredGoals={filteredGoals} />
            {selectedSummary && (
                <SummaryEditor
                    summaryId={selectedSummary.id}
                    initialContent={selectedSummary.content}
                />
            )}
        </div>

      {/* Add Goal Modal */}
      {isGoalModalOpen && (
        <Modal
          isOpen={isGoalModalOpen}
          onRequestClose={closeGoalModal}
          className="fixed inset-0 flex items-center justify-center z-50"
          overlayClassName="fixed inset-0 bg-gray-500 bg-opacity-75"
        >
          <div className="bg-white rounded-lg shadow-lg p-6 w-96">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add Goal</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  value={newGoal.title}
                  onChange={(e) =>
                    setNewGoal({ ...newGoal, title: e.target.value })
                  }
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={newGoal.description}
                  onChange={(e) =>
                    setNewGoal({ ...newGoal, description: e.target.value })
                  }
                  rows={4}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Week Start</label>
                <input
                  type="date"
                  value={newGoal.week_start}
                  onChange={(e) =>
                    setNewGoal({ ...newGoal, week_start: e.target.value })
                  }
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  value={newGoal.category}
                  onChange={(e) =>
                    setNewGoal({ ...newGoal, category: e.target.value })
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
                onClick={closeGoalModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                onClick={handleAddGoal}
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

export default WeeklyGoals;
