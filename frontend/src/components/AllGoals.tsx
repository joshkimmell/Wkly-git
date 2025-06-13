import React, { useEffect, useState } from 'react';
import { fetchAllGoalsIndexed, addGoal, deleteSummary, deleteGoal, updateGoal, getWeekStartDate, setSummary, saveSummary } from '../utils/functions';
import Pagination from './Pagination';
import  GoalCard from '@components/GoalCard';
import Modal from 'react-modal';
import SummaryGenerator from '@components/SummaryGenerator';
import SummaryEditor from '@components/SummaryEditor';
import { modalClasses, overlayClasses } from '@styles/classes';
import { Goal as BaseGoal } from '@utils/goalUtils';
import 'react-datepicker/dist/react-datepicker.css';

type Goal = BaseGoal & {
  created_at?: string;
};

const GoalsComponent = () => {
    const [indexedGoals, setIndexedGoals] = useState<Record<string, Goal[]>>({});
    const [pages, setPages] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState<string>('');
    const [scope, setScope] = useState<'week' | 'month' | 'year'>('week');
    const [filteredGoals, setFilteredGoals] = useState<Goal[]>([]);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [sortField] = useState<'created_at'>('created_at');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false); // Modal state
    const [isEditorOpen, setIsEditorOpen] = useState(false); // Editor modal state
    const [newGoal, setNewGoal] = useState<Goal>({
        id: '',
        user_id: '',
        title: '',
        description: '',
        category: 'Technical skills',
        week_start: getWeekStartDate(new Date()),
        created_at: '',
    });
    const [selectedRange, setSelectedRange] = useState<Date>(new Date());
    const [userId, setUserId] = useState<string | null>(null);
    const [selectedSummary, setSelectedSummary] = useState<{
        id: string;
        user_id: string;
        content: string;
        type: string;
        title: string;
    } | null>(null); // State for selected summary
    const [filter, setFilter] = useState<string>('');

    // const formattedDate = selectedRange.toISOString().split('T')[0]; // YYYY-MM-DD format

    useEffect(() => {
        const fetchGoals = async () => {
            try {
                const { indexedGoals, pages } = await fetchAllGoalsIndexed(scope);
                setIndexedGoals(indexedGoals);
                setPages(pages);

                if (pages.length > 0) {
                setCurrentPage(pages[0]); // Set the first page as the default
                }
            } catch (error) {
                console.error('Error fetching goals:', error);
            }
        };
        fetchGoals();
    }, [scope]);

    const openGoalModal = () => {
        if (!isGoalModalOpen) {
        setNewGoal((prev) => ({
            ...prev,
            // week_start: getWeekStartDate(),
        }));
        setIsGoalModalOpen(true);
        }
    };
  
    const closeGoalModal = () => {
      setIsGoalModalOpen(false);
    };

    // Sets the selected summary ID and opens the editor modal
    function setLocalSummaryId(id: string): void {
        setSelectedSummary((prev) => prev ? { ...prev, id } : prev);
        setIsEditorOpen(true);
    }
    function closeEditor() {
        setIsEditorOpen(false);
    }

    // Function to refresh goals
    const refreshGoals = async () => {
        try {
        const { indexedGoals, pages } = await fetchAllGoalsIndexed(scope);
        setIndexedGoals(indexedGoals);
        setPages(pages);

        if (pages.length > 0) {
            setCurrentPage(pages[0]); // Set the first page as the default
        }
        } catch (error) {
        console.error('Error refreshing goals:', error);
        }
    };

    useEffect(() => {
        refreshGoals(); // Fetch goals on component mount or when scope changes
    }, [scope]);
  
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
            week_start: getWeekStartDate(new Date()), 
            created_at: '',
        }); 
          await refreshGoals(); // Refresh the goals list
        } catch (error) {
        console.error('Error adding goal:', error);
        }
    };
// Delete a goal
    const handleDeleteGoal = async (goalId: string) => {
        try {
        //   if (!userId) {
        //     console.error('User is not authenticated');
        //     return;
        //   }

        await deleteGoal(goalId);
        //   setGoals((prevGoals) => prevGoals.filter((goal) => goal.id !== goalId)); // Remove the deleted goal from state
        //   setFilteredGoals((prevFilteredGoals) =>
        //     prevFilteredGoals.filter((goal) => goal.id !== goalId)
        //   ); // Update filtered goals
        // setGoals((prev) => prev.filter((goal) => goal.id !== goalId));
        // setFilteredGoals((prev) => prev.filter((goal) => goal.id !== goalId));
        // console.log('Goal deleted successfully');
        await refreshGoals(); // Refresh goals after deleting
        } catch (error) {
        console.error('Error deleting goal:', error);
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

  const handlePageChange = (page: string) => {
    setCurrentPage(page);
  };

    // console.log('Indexed Goals:', indexedGoals);
    // console.log('Filtered Goals:', filteredGoals);
    // console.log('Formatted date:', formattedDate);

  return (
    <div className={`space-y-6`}>
        <div className="flex justify-between items-center w-full">
            <h1 className="text-2xl font-bold text-gray-90 block sm:hidden">{scope.charAt(0).toUpperCase() + scope.slice(1)}ly goals</h1>
        </div>

        {/* Scope Selector */}
        <div>
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
        <div className="flex justify-between items-center w-full mb-4">
            {/* Pagination */}
            <Pagination
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
            </button>
        </div>

        {/* Filter and Sort Controls */}
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
        <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
            {indexedGoals[currentPage]?.map((goal) => (
            <GoalCard
                key={goal.id}
                goal={goal}
                handleDelete={(goalId) => {
                // console.log('Parent Component - Deleting Goal ID:', goalId); // Log the goal ID in the parent
                handleDeleteGoal(goalId);
                }}
                handleEdit={(goalId) => {
                // console.log('Parent Component - Editing Goal ID:', goalId); // Log the goal ID in the parent
                updateGoal(goalId, goal);
                }}
            />
            ))}
        </div>
        {indexedGoals[currentPage]?.length === 0 && (
            <div className="text-center text-gray-500 mt-4">
            No goals found for this {scope}.
            </div>
        )}
    
    
        {/* Summary Generator and Editor */}
        <div className="mt-6">
            <h2 className="text-xl font-semibold text-gray-900">Summary</h2>
            <p className="text-gray-60 dark:text-gray-30">Generate and edit your {scope}ly summary.</p>
        </div>
        <div>
            {/* {scope}: {selectedRange.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} */}
            <SummaryGenerator 
                summaryId={selectedSummary?.id || ''} 
                summaryTitle={selectedSummary?.title || `Summary for ${scope}: ${selectedRange.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}
                selectedRange={selectedRange}
                filteredGoals={indexedGoals[currentPage] || []} // Pass the goals for the current page
                scope={scope}
            />

            {selectedSummary && isEditorOpen && (
            <Modal
                key={selectedSummary.id} // Use the summary ID as the key
                isOpen={!!selectedSummary} // Ensure modal is open only when selectedSummary is set
                onRequestClose={() => setSelectedSummary(null)} // Close the modal properly
                className={`fixed inset-0 flex items-center justify-center z-50`}
                overlayClassName={`${overlayClasses}`}
            >
                <div className={`${modalClasses}`}>
                <SummaryEditor
                    id={selectedSummary.id} // Pass the summary,
                    content={selectedSummary.content} // Pass the initial content
                    type={selectedSummary.type === 'AI' || selectedSummary.type === 'User' ? selectedSummary.type : 'User'} // Pass the summary type
                    title={selectedSummary.title} // Pass the initial title
                    onRequestClose={() => setSelectedSummary(null)} // Close the modal
                    onSave={async (editedContent) => {
                    try {
                        // Save the edited summary as a new entry with summary_type === 'User'
                        // Optionally, you can also update the local state or refetch the summaries
                        saveSummary(
                        setLocalSummaryId,
                        selectedSummary.title,
                        editedContent,
                        'User',
                        selectedRange || new Date()
                        );
                        closeEditor(); // Close the modal after saving
                        setSummary(editedContent, selectedSummary.title, 'User'); // Update the local state
                        // await refreshGoals(); // Refetch goals if needed
                        // console.log('Edited summary saved successfully');
                    } catch (error) {
                        console.error('Error saving edited summary:', error);
                    }
                    }}
                />
                </div>
            </Modal>
            )}
        </div>
        <div>

        {/* Add Goal Modal */}
        {isGoalModalOpen && (
            <Modal
                isOpen={isGoalModalOpen}
                onRequestClose={closeGoalModal}
                // parentSelector={() => document.getElementById('app')!}
                className={`fixed inset-0 flex items-center justify-center z-50`}
                overlayClassName={`${overlayClasses}`}
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
                    onChange={(e) => {
                        const selectedDate = new Date(e.target.value);
                        // console.log(`Selected date: ${selectedDate.toISOString().split('T')[0]}`);

                        // Check if the selected date is already a Monday
                        if (selectedDate.getDay() === 0) {
                        // console.log(`Selected date is already Monday: ${selectedDate.toISOString().split('T')[0]}`);
                        setNewGoal({ ...newGoal, week_start: selectedDate.toISOString().split('T')[0] });
                        } else {
                        const calculatedMonday = getWeekStartDate(selectedDate);
                        // console.log(`Calculated week_start: ${calculatedMonday}`);
                        setNewGoal({ ...newGoal, week_start: calculatedMonday });
                        }
                    }}
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
    </div>
  );
};

export default GoalsComponent;
