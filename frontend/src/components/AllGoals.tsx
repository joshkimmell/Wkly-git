import { useEffect, useState } from 'react';
import { fetchAllGoalsIndexed, addGoal, deleteGoal, updateGoal, setSummary, saveSummary, UserCategories, initializeUserCategories, addCategory } from '../utils/functions'; // Removed unused imports
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
        // const fetchCategories = async () => {
        //     await initializeUserCategories();
        //     console.log('UserCategories:', UserCategories); // Log the categories for debugging
        // };
        // fetchCategories();
    }, [scope]);

    useEffect(() => {
            const fetchAndSetCategories = async () => {
                await initializeUserCategories();
                // Removed unused `categories` state
            };
            fetchAndSetCategories();
        }, []);

    // useEffect(() => {
    //     const initializeCategories = async () => {
    //         await initializeDefaultCategories();
    //         setCategories([...DefaultCategories]);
    //     };
    //     initializeCategories();
    // }, []);

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
    const handleAddGoal = async (event: React.FormEvent) => {
        event.preventDefault(); // Prevent default form submission
        try {
            // Validation: Ensure all required fields are populated
            if (!newGoal.title || !newGoal.description || !newGoal.category || !newGoal.week_start) {
                console.error('All fields are required.');
                return;
            }
            console.log('New goal being added:', newGoal);

        await addGoal(newGoal); // Add the new goal
        setNewGoal({
            id: '',
            title: '',
            description: '',
            category: '',
            week_start: '',
            user_id: '',
            created_at: '',
        }); 
        setIsGoalModalOpen(false); // Close the modal
        await refreshGoals(); // Refresh the goals list
        } catch (error) {
        console.error('Error adding goal:', error);
        }
    };
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
            {sortedAndFilteredGoals.map((goal) => (
            <GoalCard
                key={goal.id}
                goal={goal}
                handleDelete={(goalId) => {
                    handleDeleteGoal(goalId);
                }}
                handleEdit={(goalId) => {
                    handleUpdateGoal(goalId, {
                        ...goal,
                        title: goal.title,
                        description: goal.description,
                        category: goal.category,
                        week_start: goal.week_start,
                    });
                    setSelectedGoal(goal);
                    setIsEditorOpen(true);
                }}
                filter={filter} // Pass the filter prop
            />
            ))}
        </div>
        {sortedAndFilteredGoals.length === 0 && (
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
                        new Date()
                        );
                        closeEditor(); // Close the modal after saving
                        setSummary(editedContent, editedTitle, 'User'); // Update the local state
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
                <GoalForm
                    newGoal={newGoal}
                    setNewGoal={setNewGoal}
                    handleAddGoal={handleAddGoal}
                    handleClose={closeGoalModal}
                    categories={UserCategories.map((cat: any) => typeof cat === 'string' ? cat : cat.name)} // Combine default and user categories
                    onAddCategory= {(newCategory: string) => {
                        setNewGoal((prevGoal) => ({ ...prevGoal, category: newCategory }));
                    }}
                />
                
            </div>
            </Modal>
        )}
        {/* Goal Editor Modal */}
        {isEditorOpen && (
            <Modal
                isOpen={isEditorOpen}
                onRequestClose={closeEditor}
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
                            await updateGoal(
                                selectedGoal?.id || '',
                                {
                                    title: updatedTitle,
                                    description: updatedDescription,
                                    category: updatedCategory,
                                    week_start: updatedWeekStart
                                }
                            );
                            closeEditor();
                            await refreshGoals();
                        } catch (error) {
                            console.error('Error saving edited goal:', error);
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

