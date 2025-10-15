import { useEffect, useState } from 'react';
import { fetchAllGoalsIndexed, deleteGoal, updateGoal, saveSummary, UserCategories, initializeUserCategories, addCategory, getWeekStartDate } from '../utils/functions'; // Removed unused imports
// import { handleDeleteAccomplishment } from '@components/GoalCard';
import Pagination from './Pagination';
import GoalCard from '@components/GoalCard';
import GoalForm from '@components/GoalForm';
import Modal from 'react-modal';
import SummaryGenerator from '@components/SummaryGenerator';
import SummaryEditor from '@components/SummaryEditor';
import GoalEditor from '@components/GoalEditor';
import { modalClasses, overlayClasses } from '@styles/classes';
import { Goal as GoalUtilsGoal } from '@utils/goalUtils';
// import * as goalUtils from '@utils/goalUtils';
import 'react-datepicker/dist/react-datepicker.css';
import { PlusSquare as SquarePlus } from 'lucide-react';
import { BrowserRouter } from 'react-router-dom';


type Goal = GoalUtilsGoal & {
  created_at?: string;
};

const GoalsComponent = () => {
    const [indexedGoals, setIndexedGoals] = useState<Record<string, Goal[]>>({});
    const [pages, setPages] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState<string>('');
    const [scope, setScope] = useState<'week' | 'month' | 'year'>('week');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false); // Modal state
    const [isEditorOpen, setIsEditorOpen] = useState(false); // Editor modal state
    const [newGoal, setNewGoal] = useState<Goal>({
        id: '',
        title: '',
        description: '',
        category: '',
        week_start: '',
        user_id: '',
        created_at: '',
    });
    const [selectedGoal, setSelectedGoal] = useState<{
        id: string;
        user_id: string;
        title: string;
        description: string;
        category: string;
        week_start: string;
        created_at: string;
    } | null>(null);
    const [selectedSummary, setSelectedSummary] = useState<{
        id: string;
        user_id: string;
        content: string;
        type: string;
        title: string;
    } | null>(null); // State for selected summary
    const [filter, setFilter] = useState<string>('');

    // Set the default scope to the current week
    useEffect(() => {
      const today = new Date();
      const currentWeekStart = new Date(getWeekStartDate(today)); // Convert to Date object if `getWeekStartDate` returns a string
      setScope('week'); // Set the default scope to 'week'
      setNewGoal((prevGoal) => ({ ...prevGoal, week_start: currentWeekStart.toISOString().split('T')[0] })); // Format the date as YYYY-MM-DD
    //   console.log({currentWeekStart});
    }, []);

    useEffect(() => {
        const fetchGoalsAndCategories = async () => {
            try {
                // Fetch goals
                const { indexedGoals, pages } = await fetchAllGoalsIndexed(scope);
                setIndexedGoals(indexedGoals);
                setPages(pages);

                if (pages.length > 0) {
                    const today = new Date();
                    const currentWeekStart = new Date(getWeekStartDate(today)).toISOString().split('T')[0];
                    const currentPageIndex = pages.findIndex(page => page === currentWeekStart);
                    setCurrentPage(currentPageIndex !== -1 ? pages[currentPageIndex] : pages[0]); // Set to currentWeekStart if found, otherwise default to the first page
                }
                

                // Initialize user categories
                await initializeUserCategories();
            } catch (error) {
                console.error('Error fetching goals or initializing categories:', error);
            }
        };

        fetchGoalsAndCategories();
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
    const closeEditor = () => {
        if (!isEditorOpen) {
            console.warn('closeEditor called but editor is already closed.');
            return; // Prevent redundant calls
        }
        // console.log('closeEditor called');
        setIsEditorOpen(false);
    }

    // Function to refresh goals
    const refreshGoals = async () => {
        try {
        const { indexedGoals, pages } = await fetchAllGoalsIndexed(scope);
        setIndexedGoals(indexedGoals);
        setPages(pages);

        if (pages.length > 0) {
            const today = new Date();
            const currentWeekStart = new Date(getWeekStartDate(today)).toISOString().split('T')[0];
            const currentPageIndex = pages.findIndex(page => page === currentWeekStart);
            setCurrentPage(currentPageIndex !== -1 ? pages[currentPageIndex] : pages[0]); // Set to currentWeekStart if found, otherwise default to the first page
        }
        } catch (error) {
        console.error('Error refreshing goals:', error);
        }
    };

    useEffect(() => {
        // console.log('refreshGoals triggered');
        refreshGoals(); // Fetch goals on component mount or when scope changes
    }, [scope]);
  
// Add a new goal
    //const handleAddGoal = async (event: React.FormEvent, goal?: Goal) => {
    //    event.preventDefault(); // Prevent default form submission
//
    //    const goalToAdd = goal || newGoal; // Use the passed goal or fallback to newGoal state
//
    //    // Log the goal being validated
    //    console.log('Validating goal:', goalToAdd);
//
    //    // Validation: Ensure all required fields are populated
    //    if (!goalToAdd.title || !goalToAdd.description || !goalToAdd.category || !goalToAdd.week_start || !goalToAdd.user_id) {
    //        console.error('All fields are required. Missing fields:', goalToAdd);
    //        return;
    //    }
//
    //    // Revalidate week_start before adding to the database
    //    if (goalToAdd.week_start) {
    //      goalToAdd.week_start = goalToAdd.week_start.split('T')[0]; // Ensure no timestamp
    //    }
    //    console.log('Validated week_start in AllGoals:', goalToAdd.week_start);
//
    //    try {
    //        console.log('Adding goal:', goalToAdd);
    //        await addGoal(goalToAdd); // Add the new goal
    //        await refreshGoals(); // Refresh the goals list
    //    } catch (error) {
    //        console.error('Error adding goal:', error);
    //    }
    //};
// Delete a goal
    const handleDeleteGoal = async (goalId: string) => {
        try {
        await deleteGoal(goalId);
        await refreshGoals(); // Refresh goals after deleting
        } catch (error) {
        console.error('Error deleting goal:', error);
        }
    };

// Update a goal
    const handleUpdateGoal = async (goalId: string, updatedGoal: Goal) => {
        try {
        await updateGoal(goalId, updatedGoal);
        await refreshGoals(); // Refresh goals after deleting
        } catch (error) {
        console.error('Error updating goal:', error);
        }
    };

   // Filter goals based on the filter state
  const handleFilterChange = (filterValue: string) => {
    setFilter(filterValue);
    if (filterValue) {
      const filtered = (indexedGoals[currentPage] || []).filter((goal) =>
        goal.title.toLowerCase().includes(filterValue.toLowerCase()) ||
        goal.category.toLowerCase().includes(filterValue.toLowerCase()) ||
        goal.description.toLowerCase().includes(filterValue.toLowerCase()) ||
        goal.week_start.toLowerCase().includes(filterValue.toLowerCase())
      );
      setIndexedGoals((prev) => ({ ...prev, [currentPage]: filtered }));
    } else {
      refreshGoals(); // Reset to all goals if no filter
    }
  };

  const handlePageChange = (page: string) => {
    setCurrentPage(page);
  };

    // console.log('Indexed Goals:', indexedGoals);
    // console.log('Filtered Goals:', filteredGoals);
    // console.log('Formatted date:', formattedDate);

  // Update the Goals list rendering logic to apply filtering and sorting
  const sortedAndFilteredGoals = (indexedGoals[currentPage] || [])
    .filter((goal) => {
      if (!filter) return true;
      return (
        goal.title.toLowerCase().includes(filter.toLowerCase()) ||
        goal.category.toLowerCase().includes(filter.toLowerCase()) ||
        goal.description.toLowerCase().includes(filter.toLowerCase()) ||
        goal.week_start.toLowerCase().includes(filter.toLowerCase())
      );
    })
    .sort((a, b) => {
      if (sortDirection === 'asc') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    // Add a function to highlight filtered words
//   const applyHighlight = (text: string, filter: string) => {
//     if (!filter) return text;
//     // Escape special characters in the filter string
//     const escapedFilter = filter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
//     const regex = new RegExp(`(${escapedFilter})`, 'gi');
//     return text.replace(regex, '<span class="bg-brand-10 text-brand-90 inline-block">$1</span>');
//   };

  return (
    <div className={`space-y-6`}>
        <div className="flex justify-between items-center w-full">
            <h1 className="text-2xl font-bold text-gray-90 block sm:hidden">{scope.charAt(0).toUpperCase() + scope.slice(1)}ly goals</h1>
        </div>

        
        <div className="flex justify-between items-start sm:items-center w-full mb-4">
            <div className='flex flex-col md:flex-row'>
                {/* Pagination */}
                <Pagination
                    pages={pages}
                    currentPage={currentPage}
                    onPageChange={handlePageChange}
                    scope={scope}
                />
                {/* Scope Selector */}
                <div className='flex space-x-2 ml-4'>
                    {['week', 'month', 'year'].map((s) => (
                        <button
                            key={s}
                            title={`Select ${s}ly view`}
                            onClick={() => setScope(s as 'week' | 'month' | 'year')}
                            className={`btn-ghost ${scope === s ? 'text-brand-60 hover:text-brand-70 dark:text-brand-20 dark:hover:text-brand-10 font-bold underline' : ''}`}
                        >
                            <span className="hidden md:inline sm:inline">{s.charAt(0).toUpperCase() + s.slice(1)}</span>
                            <span className="md:hidden sm:hidden">{s.charAt(0).toUpperCase()}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
        <div className='flex flex-col 2xl:flex-row 2xl:space-x-8 items-start justify-start w-full mb-4'>
            <div id="allGoals" className="flex flex-col gap-4 2xl:w-2/3 w-full">
                {/* Filter and Sort Controls */}
                <div className="mt-4 h-10 flex items-center space-x-2">
                    <input
                    type="text"
                    id='goal-filter'
                    value={filter}
                    onChange={(e) => handleFilterChange(e.target.value)}
                    placeholder="Filter by title, category, or impact"
                    className="block w-full h-10 p-2 border-gray-300 shadow-sm text-sm sm:text-xl"
                    />
                    <button
                    onClick={() => setSortDirection(dir => (dir === 'asc' ? 'desc' : 'asc'))}
                    className="btn-ghost px-3 py-2"
                    title="Toggle sort direction"
                    >
                    {sortDirection === 'desc' ? '↑' : '↓'}
                    </button>
                    <button
                        onClick={openGoalModal}
                        className="btn-primary flex ml-auto sm:mt-0 md:pr-2 sm:pr-2 xs:pr-0"
                        title={`Add a new goal for the current ${scope}`}
                        aria-label={`Add a new goal for the current ${scope}`}
                        >
                        <SquarePlus className="w-5 h-5" />
                        <span className="block flex text-nowrap">Add Goal</span>
                    </button>
                </div> 

                {/* Goals List */}
                <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5 gap-4 w-full'>
                    {sortedAndFilteredGoals.map((goal) => (
                    <GoalCard
                        key={goal.id}
                        goal={goal}
                        handleDelete={(goalId) => {
                            handleDeleteGoal(goalId);
                        }}
                        handleEdit={(goalId) => {
                            // console.log('handleEdit called with goalId:', goalId);
                            const goalToEdit = indexedGoals[currentPage]?.find((goal) => goal.id === goalId);
                            if (goalToEdit) {
                                // console.log('Editing goal:', goalToEdit);
                                setSelectedGoal(goalToEdit);
                                setIsEditorOpen(true);
                            }
                        }}
                        filter={filter} // Pass the filter prop
                    />
                    ))}
                </div>
                {sortedAndFilteredGoals.length === 0 && (
                    <div className="text-center text-gray-500 mt-4">
                        No goals found for this {scope}. Try adding one!
                    </div>
                )}
            </div>
            <div id="summary" className="p-4 mt-4 gap-4 flex flex-col 2xl:w-1/3 h-full justify-start items-start border-b border-gray-30 dark:border-gray-70 bg-gray-0 bg-opacity-70 dark:bg-gray-100 dark:bg-opacity-30 rounded-md">
                {/* Summary Generator and Editor */}
                {/* <div className="">
                    <h2 className="text-xl font-semibold text-gray-900">Summary</h2>
                    <p className="text-gray-60 dark:text-gray-30">Generate and edit your {scope}ly summary.</p>
                </div> */}
                <div id="summary_btn">
                    <SummaryGenerator 
                        summaryId={selectedSummary?.id || ''} 
                        summaryTitle={selectedSummary?.title || `Summary for ${scope}: ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}
                        selectedRange={new Date()}
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
                            onSave={async (editedTitle, editedContent) => {
                            try {
                                // Save the edited summary as a new entry with summary_type === 'User'
                                // Optionally, you can also update the local state or refetch the summaries
                                saveSummary(
                                setLocalSummaryId,
                                editedTitle || selectedSummary.title, // Use the edited title or the original title
                                editedContent,
                                'User',
                                new Date(),
                                scope
                                );
                                closeEditor(); // Close the modal after saving
                                // setSummary(editedContent, editedTitle, 'User'); // Update the local state
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
            </div>
        </div>
    <div>

        {/* Add Goal Modal */}
        {isGoalModalOpen && (
            <Modal
                isOpen={isGoalModalOpen}
                onRequestClose={closeGoalModal}
                // parentSelector={() => document.getElementById('app')!}
                className={`fixed inset-0 flex md:items-center justify-center z-50`}
                overlayClassName={`${overlayClasses}`}
            >
            <div className={`${modalClasses}`}>
                <GoalForm
                    newGoal={newGoal}
                    setNewGoal={setNewGoal}
                    handleClose={closeGoalModal}
                    categories={UserCategories.map((cat: any) => typeof cat === 'string' ? cat : cat.name)}
                    refreshGoals={refreshGoals} // Pass only refreshGoals
                />
                
            </div>
            </Modal>
        )}
        {/* Goal Editor Modal */}
        {isEditorOpen && (
            <Modal
                isOpen={isEditorOpen}
                onRequestClose={closeEditor}
                ariaHideApp={false} // Prevent React-Modal from setting aria-hidden on #root
                className={`fixed inset-0 flex items-center justify-center z-50`}
                overlayClassName={`${overlayClasses}`}
            >
                <GoalEditor
                    title={selectedGoal?.title || ''}
                    description={selectedGoal?.description || ''}
                    category={selectedGoal?.category || ''}
                    week_start={selectedGoal?.week_start || ''}
                    onAddCategory={async (newCategory: string) => {
                        try {
                            await addCategory(newCategory); // Ensure backend consistency
                            setSelectedGoal((prevGoal) =>
                                prevGoal ? { ...prevGoal, category: newCategory } : null
                            );
                        } catch (error) {
                            console.error('Error adding category:', error);
                        }
                    }}
                    onRequestClose={closeEditor}
                    onSave={async (updatedDescription, updatedTitle, updatedCategory, updatedWeekStart) => {
                        try {
                            if (selectedGoal) {
                                await handleUpdateGoal(selectedGoal.id, {
                                    id: selectedGoal.id,
                                    user_id: selectedGoal.user_id,
                                    created_at: selectedGoal.created_at,
                                    title: updatedTitle,
                                    description: updatedDescription,
                                    category: updatedCategory,
                                    week_start: updatedWeekStart,
                                });
                                await refreshGoals(); // Refetch goals after saving
                            }
                        } catch (error) {
                            console.error('Error saving goal:', error);
                        }
                    }}
                />
            </Modal>
        )}
        </div>
    </div>
  );
};

export default GoalsComponent;

// Add future flags to BrowserRouter
<BrowserRouter
  future={{
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  }}
>
  {/* ...existing code... */}
</BrowserRouter>;

