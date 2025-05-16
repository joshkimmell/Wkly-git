import { useEffect, useState, useRef } from 'react';
import { userId, fetchGoals, filterGoalsByWeek, addGoal, deleteGoal, updateGoal, getWeekStartDate, setSummary } from '@utils/functions';
import SummaryGenerator from '@components/SummaryGenerator';
import saveSummary from '@components/SummaryGenerator';
import SummaryEditor from '@components/SummaryEditor';
import GoalCard from '@components/GoalCard';
import Modal from 'react-modal';
import { Goal } from '@utils/goalUtils';
import supabase from '@lib/supabase';
import 'react-datepicker/dist/react-datepicker.css';
// import { startOfWeek } from 'date-fns'; // Import helper to calculate Monday
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { set } from 'lodash';
// import { data } from 'react-router';
// import { set } from 'lodash';
// import { User } from 'lucide-react';



const WeeklyGoals = () => {

  const hasFetchedData = useRef(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  // const [summary, setSummary] = useState<string | null>(null); // Summary state
  // const [error, setError] = useState<string | null>(null); // Error state
  const [filteredGoals, setFilteredGoals] = useState<Goal[]>([]);
  const [weekOptions, setWeekOptions] = useState<Date[]>([]); // Store weeks as Date objects
  const [selectedWeek, setSelectedWeek] = useState<Date | null>(null); // Default to null until fetched
  const [filter, setFilter] = useState<string>(''); // For filtering goals
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
  });
  
  // console.log('User ID:', userId); // Log the user ID for debugging


  const [selectedSummary, setSelectedSummary] = useState<{
    id: string;
    title: string;
    content: string;
  } | null>(null); // State for selected summary

  // Utility function to get the Monday of a given date
  // function getMonday(date: Date): Date {
  //   return startOfWeek(date, { weekStartsOn: 1 }); // Week starts on Monday
  // }
  useEffect(() => {
    if (hasFetchedData.current) return;

    const initializeData = async () => {
      if (!userId) return;

      try {
        // Fetch unique week_start values
        const { data: weeksData, error: weeksError } = await supabase.rpc('get_unique_weeks', {
          user_id: userId,
        });
        console.log('Weeks data:', weeksData); // Log the fetched weeks data

        if (weeksError) {
          console.error('Error fetching weeks:', weeksError.message);
          return;
        }

        // Convert week_start strings to Date objects
        // const weeks = weeksData.map((week: { week_start: string }) => new Date(week.week_start));
        // const uniqueWeeks = Array.from(new Set(weeks.map((week: { getTime: () => any; }) => week.getTime())))
        //   .map((time) => new Date(time as number))
        //   .sort((a, b) => a.getTime() - b.getTime());
        const weeks = weeksData.map((week: { week_start: string }) => {
          const [year, month, day] = week.week_start.split('-').map(Number);
          return new Date(year, month - 1, day); // month is 0-indexed
        });

        console.log('Unique weeks:', weeks); // Log the unique weeks

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

  console.log('Goals fetched:', goals);
  console.log('Selected week:', selectedWeek); // Log the user ID for debugging
  
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
  console.log('Selected week:', selectedWeek); // Log the selected week for debugging

  // Render loading state
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
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
      await refreshGoals(); // Refresh goals after adding
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
      await refreshGoals(); // Refresh goals after deleting
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
      setIsGoalModalOpen(true);
    }
  };

  const closeGoalModal = () => {
    setIsGoalModalOpen(false);
  };
console.log('Weeks fetched:', weekOptions);
console.log('Selected week:', selectedWeek); // Log the selected week for debugging


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
          disabled={weekOptions.findIndex((week) => week.getTime() === selectedWeek?.getTime()) === 0}
          className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
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
          className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
        >
          <ArrowRight className="w-4 h-4" />
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
            {/* <SummaryGenerator selectedWeek={selectedWeek || new Date()} filteredGoals={filteredGoals} />
            {selectedSummary && (
              <SummaryEditor
                summaryId={selectedSummary}
                initialContent={selectedSummary.content}
                onRequestClose={() => setSelectedSummary(null)} // Close the modal properly
              />
            )}     */}
           <SummaryGenerator 
            //  type="AI" 
            selectedWeek={selectedWeek || new Date()}
            filteredGoals={filteredGoals}
            //  summaryId={selectedSummary?.id || ''} 
           />
            {/* <SummaryGenerator selectedWeek={selectedWeek || new Date()} filteredGoals={filteredGoals} /> */}
            {selectedSummary && isEditorOpen && (
            <Modal
              isOpen={!!selectedSummary}
              onRequestClose={() => setSelectedSummary(null)} // Close the modal properly
              className="fixed inset-0 flex items-center justify-center z-50"
              overlayClassName="fixed inset-0 bg-gray-500 bg-opacity-75"
            >
              <div className="bg-white rounded-lg shadow-lg p-6 w-96">
                <SummaryEditor
                  summaryId={selectedSummary?.id || ''} // Pass the correct summary ID
                  initialContent={selectedSummary.content} // Pass the initial content
                  onRequestClose={() => setSelectedSummary(null)} // Close the modal
                  onSave={async (editedContent) => {
                    try {
                      // Save the edited summary as a new entry with summary_type === 'User'
                      // Optionally, you can also update the local state or refetch the summaries
                      saveSummary({
                        content: editedContent,
                        selectedWeek: selectedWeek || new Date(),
                        filteredGoals: filteredGoals,
                      });
                      setSummary(editedContent); // Update the local state
                      // await refreshGoals(); // Refetch goals if needed
                      console.log('Edited summary saved successfully');
                      setSelectedSummary(null); // Close the modal after saving
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
