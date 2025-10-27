import { useEffect, useState, useRef } from 'react';
import { fetchAllGoalsIndexed, deleteGoal, updateGoal, saveSummary, UserCategories, initializeUserCategories, addCategory, getWeekStartDate } from '../utils/functions';
import Pagination from './Pagination';
import GoalCard from '@components/GoalCard';
import GoalForm from '@components/GoalForm';
import Modal from 'react-modal';
import SummaryGenerator from '@components/SummaryGenerator';
import SummaryEditor from '@components/SummaryEditor';
import GoalEditor from '@components/GoalEditor';
import { modalClasses, overlayClasses } from '@styles/classes';
import { ARIA_HIDE_APP } from '@lib/modal';
import { Goal as GoalUtilsGoal } from '@utils/goalUtils';
import { mapPageForScope, loadPageByScope, savePageByScope } from '@utils/pagination';
import 'react-datepicker/dist/react-datepicker.css';
// import * as goalUtils from '@utils/goalUtils';
import 'react-datepicker/dist/react-datepicker.css';
import { PlusSquare as SquarePlus } from 'lucide-react';
type Goal = GoalUtilsGoal & {
  created_at?: string;
};

const GoalsComponent = () => {
    const [indexedGoals, setIndexedGoals] = useState<Record<string, Goal[]>>({});
    const [pages, setPages] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState<string>('');
    // Remember last selected page per scope so switching maintains context
    const [pageByScope, setPageByScope] = useState<Record<string, string>>({});
    const [scope, setScope] = useState<'week' | 'month' | 'year'>('week');
    const prevScopeRef = useRef<string>(scope);
    const pageByScopeRef = useRef<Record<string, string>>(pageByScope);
    const fetchIdRef = useRef(0);
    const lastSwitchFromRef = useRef<string | null>(null);
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
        status: 'Not started',
        status_notes: '',
    });
    const [selectedGoal, setSelectedGoal] = useState<{
        id: string;
        user_id: string;
        title: string;
        description: string;
        category: string;
        week_start: string;
        created_at: string;
        status?: string | null;
        status_notes?: string | null;
        status_set_at?: string | null;
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
                const currentWeekStart = getWeekStartDate(today); // getWeekStartDate returns YYYY-MM-DD
                setScope('week'); // default scope
                // initialize per-scope page memory to persisted or current date equivalents
                const persisted = loadPageByScope() || {};
                const defaults = {
                    week: currentWeekStart,
                    month: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`,
                    year: `${today.getFullYear()}`,
                };
                setPageByScope((prev) => ({ ...defaults, ...persisted, ...prev }));
                setNewGoal((prevGoal) => ({ ...prevGoal, week_start: currentWeekStart }));
            }, []);

            useEffect(() => {
                const fetchGoalsAndCategories = async () => {
                    const id = ++fetchIdRef.current;
                    try {
                        // Fetch goals for the selected scope
                        const { indexedGoals, pages } = await fetchAllGoalsIndexed(scope);
                        // If another fetch started after this one, ignore these results
                        if (id !== fetchIdRef.current) return;
                        setIndexedGoals(indexedGoals);
                        setPages(pages);

                        // Decide which page to show for this scope
                        const prevScope = lastSwitchFromRef.current ?? prevScopeRef.current;
                        const remembered = pageByScopeRef.current[scope];
                        let desiredPage: string | undefined = remembered;

                        // If we have a remembered page for this scope (the last selected), prefer it and do not overwrite.
                        const prevSelected = pageByScopeRef.current[prevScope as string];
                        if (!desiredPage) {
                            // If switching scopes, prefer mapping from the previous scope's selection (if present)
                            if (prevScope !== scope && prevSelected) {
                                const mapped = mapPageForScope(prevSelected, scope, pages);
                                if (mapped) desiredPage = mapped;
                            } else {
                                // If we don't have a remembered page for this scope, try to map from the previous scope's selection
                                desiredPage = mapPageForScope(prevSelected, scope, pages);
                            }
                        }

                        // If still no desired page, fall back to sensible defaults (current date)
                        if (!desiredPage) {
                            const today = new Date();
                            if (scope === 'week') desiredPage = getWeekStartDate(today);
                            else if (scope === 'month') desiredPage = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
                            else desiredPage = `${today.getFullYear()}`;
                        }

                        // Scope-specific adjustments: prefer pages starting with the desired prefix
                        if (pages.length > 0) {
                            if (scope === 'week') {
                                if (desiredPage) {
                                    // Prefer an exact week match, then a page from the same month,
                                    // then the latest page <= today, then fallback to the first page.
                                    const exact = pages.find((p) => p === desiredPage);
                                    if (exact) desiredPage = exact;
                                    else {
                                        const monthPrefix = (desiredPage as string).slice(0, 7);
                                        const sameMonth = pages.find((p) => p.startsWith(monthPrefix));
                                        if (sameMonth) desiredPage = sameMonth;
                                        else {
                                            // find latest page <= today
                                            const today = new Date();
                                            let found: string | undefined;
                                            for (let i = pages.length - 1; i >= 0; i--) {
                                                const p = pages[i];
                                                const [y, m, d] = p.split('-').map(Number);
                                                const pageDate = new Date(y, (m || 1) - 1, d || 1);
                                                if (pageDate <= today) {
                                                    found = p;
                                                    break;
                                                }
                                            }
                                            desiredPage = found ?? pages[0];
                                        }
                                    }
                                } else {
                                    desiredPage = pages[0];
                                }
                            } else {
                                if (desiredPage) {
                                    const dp = desiredPage as string;
                                    const maybe = pages.find((p) => p.startsWith(dp));
                                    desiredPage = maybe || pages[0];
                                } else {
                                    desiredPage = pages[0];
                                }
                            }
                        }

                        setCurrentPage(desiredPage || (pages[0] ?? ''));

                        // Keep track of the scope we just loaded so future mappings are correct
                        prevScopeRef.current = scope;
                        // Clear the last-switch marker now that we've handled the mapping
                        lastSwitchFromRef.current = null;

                        // Initialize user categories
                        await initializeUserCategories();
                    } catch (error) {
                        console.error('Error fetching goals or initializing categories:', error);
                    }
                };

                fetchGoalsAndCategories();
                // debug logs removed after fixing mapping race conditions
            }, [scope]);

            // Mirror pageByScope into a ref to avoid re-running the fetch effect on its changes
            useEffect(() => { pageByScopeRef.current = pageByScope; }, [pageByScope]);
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

    // Function to refresh goals (keeps current selection where possible)
    const refreshGoals = async () => {
        try {
        const { indexedGoals, pages } = await fetchAllGoalsIndexed(scope);
        setIndexedGoals(indexedGoals);
        setPages(pages);

        // If currentPage is not present in new pages, try to choose a sensible fallback
        if (pages.length > 0) {
            if (!currentPage || !pages.includes(currentPage)) {
                setCurrentPage(pages[0]);
            }
        }
        } catch (error) {
        console.error('Error refreshing goals:', error);
        }
    };
  
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
                                // prevScopeRef.current = scope; // This line is now moved inside the fetch function
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
        const next = { ...pageByScopeRef.current, [scope]: page };
        setPageByScope(next);
        pageByScopeRef.current = next;
        try { savePageByScope(next); } catch (e) { /* ignore */ }
  };

    // persist pageByScope whenever it changes (e.g., scope switches)
    useEffect(() => {
        try {
            savePageByScope(pageByScope);
        } catch (e) {
            // ignore
        }
    }, [pageByScope]);

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
                                onClick={() => {
                                // persist the currently-viewed page for the active scope before switching
                                    const next = { ...pageByScopeRef.current, [scope]: currentPage || pageByScopeRef.current[scope] };
                                    setPageByScope(next);
                                    pageByScopeRef.current = next;
                                    try { savePageByScope(next); } catch (e) {}
                                    // Record which scope we're switching from so the next fetch can map correctly
                                    lastSwitchFromRef.current = scope;
                                    setScope(s as 'week' | 'month' | 'year');
                                }}
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
                        className="btn-primary gap-2 flex ml-auto sm:mt-0 md:pr-2 sm:pr-2 xs:pr-0"
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
            <div id="summary" className="p-4 mt-8 2xl:mt-4 gap-4 flex flex-col w-full 2xl:w-1/3 h-full justify-start items-start border-b border-gray-30 dark:border-gray-70 bg-gray-0 bg-opacity-70 dark:bg-gray-100 dark:bg-opacity-30 rounded-md">                                                                                         {/* Summary Generator and Editor */}
                {/* <div className="">
                    <h2 className="text-xl font-semibold text-gray-900">Summary</h2>
                    <p className="text-gray-60 dark:text-gray-30">Generate and edit your {scope}ly summary.</p>
                </div> */}
                <div id="summary_btn">
                    <SummaryGenerator 
                        summaryId={selectedSummary?.id || ''} 
                        summaryTitle={selectedSummary?.title || `Summary for ${scope}: ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}                                                                                                                                                                                selectedRange={new Date()}
                        filteredGoals={indexedGoals[currentPage] || []} // Pass the goals for the current page
                        scope={scope}
                    />

                    <Modal
                        key={selectedSummary?.id || 'summary-editor'}
                        isOpen={!!selectedSummary && isEditorOpen}
                        onRequestClose={() => setSelectedSummary(null)}
                        ariaHideApp={ARIA_HIDE_APP}
                        className={`fixed inset-0 flex items-center justify-center z-50`}
                        overlayClassName={`${overlayClasses}`}
                    >
                        <div className={`${modalClasses}`}>
                        {selectedSummary && (
                          <SummaryEditor
                            id={selectedSummary.id}
                            content={selectedSummary.content}
                            type={selectedSummary.type === 'AI' || selectedSummary.type === 'User' ? selectedSummary.type : 'User'}
                            title={selectedSummary.title}
                            onRequestClose={() => setSelectedSummary(null)}
                            onSave={async (editedTitle, editedContent) => {
                            try {
                                await saveSummary(
                                  setLocalSummaryId,
                                  editedTitle || selectedSummary.title,
                                  editedContent,
                                  'User',
                                  new Date(),
                                  scope
                                );
                                closeEditor();
                            } catch (error) {
                                console.error('Error saving edited summary:', error);
                            }
                            }}
                          />
                        )}
                        </div>
                    </Modal>
                </div>
            </div>
        </div>
    <div>

        {/* Add Goal Modal */}
        <Modal
            isOpen={isGoalModalOpen}
            onRequestClose={closeGoalModal}
            ariaHideApp={ARIA_HIDE_APP}
            // parentSelector={() => document.getElementById('app')!}
            className={`fixed inset-0 flex md:items-center justify-center z-50`}
            overlayClassName={`${overlayClasses}`}
        >
        <div className={`${modalClasses}`}>
            {isGoalModalOpen && (
                <GoalForm
                    newGoal={newGoal}
                    setNewGoal={setNewGoal}
                    handleClose={closeGoalModal}
                    categories={UserCategories.map((cat: any) => typeof cat === 'string' ? cat : cat.name)}
                    refreshGoals={refreshGoals} // Pass only refreshGoals
                />
            )}
        </div>
        </Modal>
        {/* Goal Editor Modal */}
        <Modal
            isOpen={isEditorOpen}
            onRequestClose={closeEditor}
            ariaHideApp={ARIA_HIDE_APP}
            className={`fixed inset-0 flex items-center justify-center z-50`}
            overlayClassName={`${overlayClasses}`}
        >
            {isEditorOpen && (
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
                    onSave={async (updatedDescription, updatedTitle, updatedCategory, updatedWeekStart, status, status_notes) => {
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
                                    status: (status as any) || selectedGoal?.status,
                                    status_notes: (status_notes as any) || selectedGoal?.status_notes,
                                });
                                await refreshGoals(); // Refetch goals after saving
                            }
                        } catch (error) {
                            console.error('Error saving goal:', error);
                        }
                    }}
                />
            )}
        </Modal>
        </div>
    </div>
  );
};

export default GoalsComponent;
