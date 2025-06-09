import { useEffect, useState, useRef } from 'react';
import { fetchGoals, filterGoalsByWeek, addGoal, deleteGoal, updateGoal, getWeekStartDate, setSummary } from '@utils/functions';
import GoalCard from '@components/GoalCard';
import Modal from 'react-modal';
import { Goal as BaseGoal } from '@utils/goalUtils';

type Goal = BaseGoal & {
  created_at?: string;
};
import supabase from '@lib/supabase';
import SummaryGenerator from '@components/SummaryGenerator';
import saveSummary from '@components/SummaryGenerator';
import SummaryEditor from '@components/SummaryEditor';
import { modalClasses } from '@styles/classes';
import 'react-datepicker/dist/react-datepicker.css';
import { ArrowLeft, ArrowRight } from 'lucide-react';



const WeeklyGoals = () => {

  const hasFetchedData = useRef(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  // const [summary, setSummary] = useState<string | null>(null); // Summary state
  // const [error, setError] = useState<string | null>(null); // Error state
  const [filteredGoals, setFilteredGoals] = useState<Goal[]>([]);
  const [weekOptions, setWeekOptions] = useState<Date[]>([]); // Store weeks as Date objects
  const [selectedWeek, setSelectedWeek] = useState<Date | null>(null); // Default to null until fetched
  const [filter, setFilter] = useState<string>(''); // For filtering goals
  const [sortField] = useState<'created_at'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isLoading, setIsLoading] = useState<boolean>(true); // Loading state
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false); // Modal state
  const [isEditorOpen, setIsEditorOpen] = useState(false); // Editor modal state
  const [newGoal, setNewGoal] = useState<Goal>({
    id: '',
    user_id: '',
    title: '',
    description: '',
    category: 'Technical skills',
    week_start: '',
    created_at: '',
  });
  
  
  // console.log('User ID:', userId); // Log the user ID for debugging

  // const openEditor = () => {
  //   setIsEditorOpen(true);
  // };
  const closeEditor = () => {
    setIsEditorOpen(false);
  };
  
  const [selectedSummary, setSelectedSummary] = useState<{
    id: string;
    title: string;
    content: string;
  } | null>(null); // State for selected summary
  
  const [userId, setUserId] = useState<string | null>(null);
  // Initialize theme based on user's preference


// TODO: Replace this with your actual theme logic or context
// const theme = 'theme-dark'; 
// const current = theme === 'theme-dark' ? 'dark' : ''; // Determine current theme

  useEffect(() => {
    const fetchUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    fetchUserId();
  }, []);

  useEffect(() => {
    if (hasFetchedData.current || !userId) return;

    const initializeData = async () => {
      try {
        // Fetch unique week_start values
        const { data: weeksData, error: weeksError } = await supabase.rpc('get_unique_weeks', {
          user_id: userId,
        });
        // console.log('Weeks data:', weeksData); // Log the fetched weeks data

        if (weeksError) {
          console.error('Error fetching weeks:', weeksError.message);
          return;
        }

        // Convert week_start strings to Date objects
        const weeks = weeksData.map((week: { week_start: string }) => {
          const [year, month, day] = week.week_start.split('-').map(Number);
          return new Date(year, month - 1, day); // month is 0-indexed
        });

        // console.log('Unique weeks:', weeks); // Log the unique weeks

        setWeekOptions(weeks);

        // Set the most recent week as the default selected week
        const mostRecentWeek = weeks[weeks.length - 1] || new Date();
        
        // Fetch goals for the most recent week
        const weekStart = mostRecentWeek.toISOString().split('T')[0]; // Convert to YYYY-MM-DD
        const fetchedGoals = await fetchGoals(weekStart);
        setGoals(fetchedGoals);
        setSelectedWeek(mostRecentWeek);
        // Do NOT call setFilteredGoals here; let useEffect handle it
      } catch (error) {
        console.error('Error initializing data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
    hasFetchedData.current = true; // Set the flag to true after fetching data
  }, [userId]);

// const fetchGoals = async () => {
//   // ...fetch logic...
//   setGoals(fetchedGoals);
//   setFilteredGoals(filterGoalsByWeek(fetchedGoals, selectedWeek));
// };

  const refreshGoals = async () => {
    if (!selectedWeek) {
      console.error('Selected week is not set');
      return;
    }
  
    try {
      // const weekStart = getWeekStartDate(selectedWeek); // Get Monday as YYYY-MM-DD
      const weekStart = selectedWeek.toISOString().split('T')[0]; // Convert to YYYY-MM-DD format
      const fetchedGoals = await fetchGoals(weekStart); // Fetch goals for the week
      setGoals(fetchedGoals);
  
      const filtered = filterGoalsByWeek(fetchedGoals, selectedWeek);
      setFilteredGoals(filtered);
    } catch (error) {
      console.error('Error refreshing goals:', error);
    }
  };

  // console.log('Goals fetched:', goals);
  // console.log('Selected week:', selectedWeek); // Log the user ID for debugging
  
  // useEffect(() => {
  //   if (!selectedWeek) return;
  //   const filtered = filterGoalsByWeek(goals, selectedWeek);
  //   setFilteredGoals(filtered);
  // }, [selectedWeek, goals]);
  // console.log('Filtered goals:', filteredGoals);

useEffect(() => {
  if (!selectedWeek) return;
  const fetchAndSetGoals = async () => {
    setIsLoading(true);
    try {
      const weekStart = selectedWeek.toISOString().split('T')[0];
      const fetchedGoals = await fetchGoals(weekStart);
      const filtered = filterGoalsByWeek(fetchedGoals, weekStart);
      setGoals(fetchedGoals);
      setFilteredGoals(filtered); // Set filtered goals to fetched goals
    } catch (error) {
      console.error('Error fetching goals for week:', error);
    } finally {
      setIsLoading(false);
    }
  };
  fetchAndSetGoals();
}, [selectedWeek]);

  // Handle week selection from the dropdown
  const handleWeekChange = (selectedWeek: string) => {
    // const week = new Date(weekString); // Convert string to Date
    // const monday = getWeekStartDate(week); // Get the Monday of the selected week
    setSelectedWeek(new Date(selectedWeek)); // Set the selected week to Monday
  };
  // console.log('Selected week:', selectedWeek); // Log the selected week for debugging

  // Render loading state
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  // Add a new goal
    const handleAddGoal = async () => {
    try {
      await addGoal(newGoal); // Add the new goal
      setIsGoalModalOpen(false); // Close the modal
      setNewGoal({
        id: '',
        user_id: '',
        title: '',
        description: '',
        category: 'Technical skills',
        week_start: getWeekStartDate(),
        created_at: '',
      }); // Reset the form
      await refreshGoals(); // Refresh the goals list
    } catch (error) {
      console.error('Error adding goal:', error);
    }
  };
  //   const handleAddGoal = async () => {
  //   try {
  //     if (!userId) {
  //       console.error('User is not authenticated');
  //       return;
  //     }

  //     const goalToAdd = { ...newGoal, user_id: userId };
  //     await addGoal(goalToAdd); // Use addGoal from functions.ts
  //     setNewGoal({
  //       id: '',
  //       user_id: '',
  //       title: '',
  //       description: '',
  //       category: 'Technical skills',
  //       week_start: '',
  //     }); // Reset newGoal state to default
  //     setIsGoalModalOpen(false); // Close the modal
  //     await refreshGoals(); // Refresh goals after adding
  //   } catch (error) {
  //     console.error('Error adding goal:', error);
  //   }
  // };

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
      // setGoals((prev) => prev.filter((goal) => goal.id !== goalId));
      // setFilteredGoals((prev) => prev.filter((goal) => goal.id !== goalId));
      console.log('Goal deleted successfully');
      // await refreshGoals(); // Refresh goals after deleting
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
      await refreshGoals(); // Refresh goals after updating
      console.log('Goal updated successfully');
    } catch (error) {
      console.error('Error updating goal:', error);
    }
  };


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

  // Navigate to the previous week
  const handlePreviousWeek = () => {
    const currentIndex = weekOptions.findIndex((week) => week.getTime() === selectedWeek?.getTime());
    if (currentIndex > 0) {
      const previousWeek = weekOptions[currentIndex - 1];
      setSelectedWeek(previousWeek);
    }
  };

  // Navigate to the next week
  const handleNextWeek = () => {
    const currentIndex = weekOptions.findIndex((week) => week.getTime() === selectedWeek?.getTime());
    if (currentIndex < weekOptions.length - 1) {
      const nextWeek = weekOptions[currentIndex + 1];
      setSelectedWeek(nextWeek);
    }
  };

  const openGoalModal = () => {
  if (!isGoalModalOpen) {
    setNewGoal((prev) => ({
      ...prev,
      week_start: getWeekStartDate(),
    }));
    setIsGoalModalOpen(true);
  }
};

  const closeGoalModal = () => {
    setIsGoalModalOpen(false);
  };
console.log('Weeks fetched:', weekOptions);
console.log('Selected week:', selectedWeek); // Log the selected week for debugging
// console.log('Current:', current);

const sortedGoals = [...filteredGoals].sort((a, b) => {
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


  return (
    <div className={`space-y-6`}>
      <div className="flex justify-between items-center w-full">
        <h1 className="text-2xl font-bold text-gray-90 block sm:hidden">Weekly Goals</h1>
      </div>

      {/* Week Selector */}
      <div className="flex items-center justify-between space-x-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={handlePreviousWeek}
            disabled={weekOptions.findIndex((week) => week.getTime() === selectedWeek?.getTime()) === 0}
            className="btn-ghost disabled:opacity-50"
            >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <select
            value={selectedWeek?.toISOString().split('T')[0] || ''}
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
            disabled={weekOptions.findIndex((week) => week.getTime() === selectedWeek?.getTime()) === weekOptions.length - 1}
            className="btn-ghost disabled:opacity-50 hover:disabled:cursor-not-allowed"
            >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

            
          
        <button
          onClick={openGoalModal}
          className="btn-primary sm:block ml-auto pr-4"
        >
          Add Goal
        </button>
      </div>

      {/* Filter Input */}
      <div className="mt-4 h-10 flex items-center space-x-2">
        <input
          type="text"
          value={filter}
          onChange={(e) => handleFilterChange(e.target.value)}
          placeholder="Filter by title, category, or impact"
          className="block w-full h-10 p-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
        <button
          onClick={() => setSortDirection(dir => (dir === 'asc' ? 'desc' : 'asc'))}
          className="border rounded px-2 py-1"
          title="Toggle sort direction"
        >
          {sortDirection === 'asc' ? '↑' : '↓'}
        </button>
      </div>

      {/* Goals List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {sortedGoals.map((goal) => (
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
          <p className="text-gray-60 dark:text-gray-30">Generate and edit your weekly summary.</p>
      </div>
      <div>
          <SummaryGenerator 
            summaryId={selectedSummary?.id || ''} 
            selectedWeek={selectedWeek || new Date()}
            filteredGoals={filteredGoals}
            summaryType='AI' // or the appropriate summary type
          />

          {selectedSummary && isEditorOpen && (
          <Modal
            key={selectedSummary.id} // Use the summary ID as the key
            isOpen={!!selectedSummary} // Ensure modal is open only when selectedSummary is set
            onRequestClose={() => setSelectedSummary(null)} // Close the modal properly
            className={`fixed inset-0 flex items-center justify-center z-50`}
            overlayClassName="fixed inset-0 bg-gray-50 dark:bg-gray-80 dark:bg-opacity-75"
          >
            <div className={`${modalClasses}`}>
              <SummaryEditor
                initialTitle={selectedSummary.title} // Pass the initial title
                initialContent={selectedSummary.content} // Pass the initial content
                onRequestClose={() => setSelectedSummary(null)} // Close the modal
                onSave={async (editedContent) => {
                  try {
                    // Save the edited summary as a new entry with summary_type === 'User'
                    // Optionally, you can also update the local state or refetch the summaries
                    saveSummary({
                      summaryId: selectedSummary?.id || '',
                      content: editedContent,
                      selectedWeek: selectedWeek || new Date(),
                      filteredGoals: filteredGoals,
                      summaryType: 'User', // or the appropriate summary type
                    });
                    closeEditor(); // Close the modal after saving
                    setSummary(editedContent, selectedSummary.title, 'User'); // Update the local state
                    // await refreshGoals(); // Refetch goals if needed
                    console.log('Edited summary saved successfully');
                  } catch (error) {
                    console.error('Error saving edited summary:', error);
                  }
                }}
              />
            </div>
          </Modal>
        )}
      </div>

      {/* Add Goal Modal */}
      {isGoalModalOpen && (
        <Modal
          isOpen={isGoalModalOpen}
          onRequestClose={closeGoalModal}
          // parentSelector={() => document.getElementById('app')!}
          className={`fixed inset-0 flex items-center justify-center z-50`}
          overlayClassName="fixed inset-0 bg-gray-50 dark:bg-gray-100 bg-opacity-65 dark:bg-opacity-65"
        >
          <div className={`${modalClasses}`}>
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
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleAddGoal}
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

export default WeeklyGoals;
