import { useEffect, useState } from 'react';
import { fetchGoals, addGoal, deleteGoal, updateGoal } from '@utils/functions';
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
  const [goals, setGoals] = useState<Goal[]>([]);
  const [filteredGoals, setFilteredGoals] = useState<Goal[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGoal, setNewGoal] = useState<Goal>({
    id: '',
    user_id: '',
    title: '',
    description: '',
    category: 'Technical skills',
    week_start: '',
  });
  const [token, setToken] = useState<string | null>(null); // Replace with your auth token logic
  const [filter, setFilter] = useState<string>(''); // For filtering goals
  const [selectedWeek, setSelectedWeek] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [weekOptions, setWeekOptions] = useState<Date[]>([]); // Store weeks as Date objects
  

  // Fetch all distinct weeks and goals
  const fetchWeeksAndGoals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User is not authenticated');
        return;
      }

      // Call the get_unique_weeks function
      const { data: weeksData, error: weeksError } = await supabase.rpc('get_unique_weeks', {
        user_id: user.id,
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

  // // Add a new goal
  // const handleAddGoal = async () => {
  //   try {
  //     const { data: { user }, error: authError } = await supabase.auth.getUser();

  //     if (authError) {
  //       console.error('Error fetching user:', authError.message);
  //       return;
  //     }

  //     if (!user) {
  //       console.error('User is not authenticated');
  //       return;
  //     }

  //     // Ensure user_id is valid
  //     if (!user.id) {
  //       console.error('Invalid user_id');
  //       return;
  //     }

  //     const { error } = await supabase.from('goals').insert({
  //       ...newGoal,
  //       user_id: user.id, // Use the authenticated user's ID
  //       created_at: new Date().toISOString(),
  //     });

  //     if (error) {
  //       console.error('Error adding goal:', error.message);
  //       return;
  //     }

  //     fetchWeeksAndGoals(); // Refresh goals after adding
  //     setIsModalOpen(false);
  //     setNewGoal({
  //       id: '', 
  //       title: '',
  //       description: '',
  //       category: 'Technical skills',
  //       week_start: '',
  //       user_id: '',
  //     });
  //   } catch (err) {
  //     console.error('Unexpected error adding goal:', err);
  //   }
  // };

  // // Delete a goal
  // const deleteGoal = async (goalId: string) => {
  //   try {
  //     // 1. Delete related accomplishments first
  //     await supabase
  //       .from('accomplishments')
  //       .delete()
  //       .eq('goal_id', goalId);
  
  //     // 2. Then, delete the goal
  //     await supabase
  //       .from('goals')
  //       .delete()
  //       .eq('id', goalId);
  
  //     // Fetch goals again to update the UI
  //     await fetchWeeksAndGoals();
  
  //   } catch (error: any) {
  //     setError(error.message);
  //   }
  // };

   // Fetch all goals
   const fetchAllGoals = async () => {
    try {
      const data = await fetchGoals(token!, selectedWeek.toISOString().split('T')[0]); // Ensure token and weekStart are available
      setGoals(data);
    } catch (error) {
      console.error('Error fetching goals:', error);
    }
  };

  // Add a new goal
  const handleAddGoal = async () => {
    try {
      await addGoal(token!, newGoal); // Ensure token is available
      fetchAllGoals(); // Refresh goals after adding
    } catch (error) {
      console.error('Error adding goal:', error);
    }
  };

  // Delete a goal
  const handleDeleteGoal = async (goalId: string) => {
    try {
      await deleteGoal(token!, goalId); // Ensure token is available
      fetchAllGoals(); // Refresh goals after deleting
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  };

  // Update a goal (example usage)
  const handleUpdateGoal = async (goalId: string, updatedGoal: any) => {
    try {
      await updateGoal(token!, goalId, updatedGoal); // Ensure token is available
      fetchAllGoals(); // Refresh goals after updating
    } catch (error) {
      console.error('Error updating goal:', error);
    }
  };

  useEffect(() => {
    // Fetch goals on component mount
    fetchAllGoals();
  }, []);


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

  useEffect(() => {
    fetchWeeksAndGoals();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Weekly Goals</h1>
        <button
          onClick={() => setIsModalOpen(true)}
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
            handleDelete={(goalId) => handleDeleteGoal(goalId)}
            handleEdit={() => console.log(`Edit goal: ${goal.id}`)} // Placeholder for edit functionality
          />
        ))}
      </div>
      {/* Summary Generator and Editor */}
        <div className="mt-6">
            <h2 className="text-xl font-semibold text-gray-900">Summary</h2>
            <p className="text-gray-600">Generate and edit your weekly summary.</p>
        </div>
         <div>
            <SummaryGenerator selectedWeek={selectedWeek} />
            {selectedSummary && (
                <SummaryEditor
                    summaryId={selectedSummary.id}
                    initialContent={selectedSummary.content}
                />
            )}
        </div>

      {/* Add Goal Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onRequestClose={() => setIsModalOpen(false)}
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
                onClick={() => setIsModalOpen(false)}
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
