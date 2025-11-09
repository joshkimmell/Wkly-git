import React, { useEffect, useState } from 'react';
import { getWeekStartDate, fetchCategories } from '@utils/functions'; // Import fetchCategories from functions.ts
import { Category, Goal } from '@utils/goalUtils'; // Import the addCategory function
import supabase from '@lib/supabase'; // Import Supabase client
import { useGoalsContext } from '@context/GoalsContext';
import LoadingSpinner from '@components/LoadingSpinner';
import { SearchIcon, RefreshCw } from 'lucide-react';
import Modal from 'react-modal';
import { ARIA_HIDE_APP } from '@lib/modal';
import RichTextEditor from '@components/RichTextEditor';
import { notifySuccess, notifyError } from '@components/ToastyNotification';
import { TextField, MenuItem, Checkbox, FormControlLabel, Switch } from '@mui/material';

export interface AddGoalProps {
  newGoal: Goal; // Updated to use the full Goal type
  setNewGoal: React.Dispatch<React.SetStateAction<Goal>>; // Updated to match the full Goal type
  // handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleClose: () => void; // Added handleClose prop to allow closing the modal
  categories: string[];
  refreshGoals: () => Promise<void>; // Added refreshGoals prop to refresh the goals
}

const AddGoal: React.FC<AddGoalProps> = ({ newGoal, setNewGoal, handleClose, refreshGoals }) => {
  // const [categories, setCategories] = React.useState<{ id: string; name: string }[]>([]); // Update state type to match the expected structure
  const [categories, setCategories] = useState<Category[]>([]); // Update state type to match the expected structure
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  const [generatedPlan, setGeneratedPlan] = useState<Goal[]>([]);
  const [selectedSteps, setSelectedSteps] = useState<number[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [showWizard, setShowWizard] = useState(true); // State to toggle between wizard and manual form
  const [isGenerating, setIsGenerating] = useState(false); // State to track loading
  const [error, setError] = useState<string | null>(null); // State to track errors
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCategories, setFilteredCategories] = useState(categories);

  // small deterministic hash for stable keys (djb2)
  const hashString = (s: string) => {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
    return (h >>> 0).toString(36);
  };
  

  // Goals context for optimistic UI updates
  const { addGoalToCache, updateGoalInCache, removeGoalFromCache, replaceGoalInCache, refreshGoals: ctxRefresh, setLastAddedIds } = useGoalsContext();

  // Set the default `week_start` to the current week's Monday
  useEffect(() => {
    if (!newGoal.week_start) {
      setNewGoal((prevGoal) => ({
        ...prevGoal,
        week_start: getWeekStartDate(),
      }));
    }
  }, [newGoal.week_start, setNewGoal]);

  // Fetch categories on component mount
  useEffect(() => {
    const fetchAndSetCategories = async () => {
      try {
        const { UserCategories } = await fetchCategories(); 

        // Ensure the data is transformed into an array of objects with id and name
        const transformedCategories = Array.isArray(UserCategories)
          ? UserCategories.map((category) => ({ id: category.id, name: category.name }))
          : []; // Fallback to an empty array if the structure is unexpected

        setCategories(transformedCategories);
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };

    fetchAndSetCategories();
  }, []); // Fetch categories on component mount

  const handleGeneratePlan = async () => {
    setIsGenerating(true); // Show loading animation
    setError(null); // Reset error state
    try {
      const response = await fetch('/api/generatePlan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: naturalLanguageInput }),
      });

      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(errorMessage || 'Failed to generate plan');
      }

      const data = await response.json();
      if (Array.isArray(data.result)) {
        const formattedPlan = data.result.map((step: { title: string; description: string }) => ({
          ...step,
          title: typeof step.title === 'string' ? step.title : JSON.stringify(step.title),
        }));
        setGeneratedPlan(formattedPlan);
      } else {
        throw new Error('Unexpected response format');
      }
    } catch (error) {
      console.error('Error generating plan:', error);
      setError((error instanceof Error ? error.message : 'An unexpected error occurred'));
    } finally {
      setIsGenerating(false); // Hide loading animation
    }
  };

  const toggleStepSelection = (index: number) => {
    setSelectedSteps((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const applyPlan = async () => {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
            console.error('Error fetching user ID:', error?.message || 'User not authenticated');
            return;
        }

        const stepsToSubmit = generatedPlan.filter((_, index) => selectedSteps.includes(index));

        let parentCategory = newGoal.category;

        if (!parentCategory) {
            parentCategory = "General";
            console.warn('No category selected. Defaulting to "General".');
        }

        await bulkAddGoals(stepsToSubmit, user.id, parentCategory, newGoal.week_start);

        // Clear the generated plan and selected steps
        setGeneratedPlan([]);
        setSelectedSteps([]);

        // Reset the wizard to defaults
    setNewGoal(prev => ({
      ...prev,
      id: '',
      title: '',
      description: '',
      category: '',
      week_start: '',
      user_id: '',
      created_at: ''
    }));
        setCurrentStep(1);
        setSelectedSteps([]);
        setGeneratedPlan([]);
    };

  const addGoal = async (goal: Goal) => {
    try {
      // Ensure week_start is formatted as YYYY-MM-DD
      if (goal.week_start) {
        goal.week_start = goal.week_start.split('T')[0];
      } else {
        throw new Error('week_start is required and must be a valid date.');
      }

      // console.log('Adding goal with week_start:', goal.week_start); // Log week_start value

      // Fetch the authenticated user's ID
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated. Please log in to add a goal.');
      }

      // Add the user_id to the goal object
      goal.user_id = user.id;

      // Validate that the category exists in the database
      const { error: categoryError } = await supabase
        .from('categories')
        .select('name')
        .eq('name', goal.category)
        .single();

      if (categoryError && categoryError.code === 'PGRST116') {
        console.warn('Category does not exist:', goal.category);

        // Prompt the user to create the category or go back
        const userConfirmed = window.confirm(
          `The category "${goal.category}" does not exist. Would you like to create it?`
        );

        if (!userConfirmed) {
          console.warn('User chose to go back and select an existing category.');
          return;
        }

        // Create the category if the user confirms
        const { error: insertCategoryError } = await supabase
          .from('categories')
          .insert({ name: goal.category });

        if (insertCategoryError) {
          throw new Error(`Error creating category: ${insertCategoryError.message}`);
        }

        console.log('Category successfully created:', goal.category);
      } else if (categoryError) {
        throw new Error('Error fetching category: ' + categoryError.message);
      }

      // Remove fields that should not be sent to the database
  const { created_at: _created_at, id: _id, ...goalToInsert } = goal as unknown as Record<string, unknown>;
      void _created_at;
      void _id;

  // Optimistic UI: add a temporary goal to the cache first

  const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const tempGoal = { ...(goalToInsert as Record<string, unknown>), id: tempId, created_at: new Date().toISOString() } as unknown as Goal;
  // adding temp goal to cache (optimistic)
    addGoalToCache(tempGoal);

      // Insert the goal into the database
      const { data: insertData, error } = await supabase.from('goals').insert(goalToInsert).select().single();

      if (error) {
  // rollback
  // insert error, rolling back temp
        removeGoalFromCache(tempId);
        throw new Error(`Error adding goal to the database: ${error.message}`);
      }

        // Replace temp with the server-provided row (if available)
      if (insertData && insertData.id) {
  const serverGoal = (insertData as unknown) as Goal;
        // replace temp id with server row so subscribers can react
        replaceGoalInCache(tempId, serverGoal);
        // notify and refresh
        try {
          if (ctxRefresh) {
            await ctxRefresh();
          }
          // always call parent refreshGoals to update callers that maintain their own indexed state
          try {
            await refreshGoals();
          } catch (e) {
            console.warn('[GoalForm] addGoal: parent refresh failed (ignored):', e);
          }
        } catch (e) {
          console.warn('Refresh after add failed (ignored):', e);
        }
        // reset the form
        setNewGoal(prev => ({
          ...prev,
          id: '',
          title: '',
          description: '',
          category: '',
          week_start: '',
          user_id: '',
          created_at: ''
        }));
        notifySuccess('Goal added');
      } else {
          // As a fallback, refresh from server
        try {
          if (ctxRefresh) await ctxRefresh();
          else await refreshGoals();
          // reset the form
          setNewGoal(prev => ({
            ...prev,
            id: '',
            title: '',
            description: '',
            category: '',
            week_start: '',
            user_id: '',
            created_at: ''
          }));
          notifySuccess('Goal added');
        } catch (e) {
          notifyError('Failed to refresh goals after adding');
          console.error('Refresh after add failed:', e);
        }
      }

      // Close the modal
      handleClose();
    } catch (error) {
      console.error('Error adding goal:', error);
      notifyError('Failed to add goal.');
    }
  };

  const bulkAddGoals = async (steps: Goal[], userId: string, parentCategory: string, weekStart: string) => {
    try {
      // Ensure week_start is formatted as YYYY-MM-DD
      const formattedWeekStart = weekStart.split('T')[0];

      console.log('Bulk adding goals with default week_start:', formattedWeekStart); // Log default week_start value

  // Optimistic UI: add temporary goals to the cache first

  const temps = steps.map((step) => {
        const id = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const goal = {
          ...step,
          user_id: userId,
          category: parentCategory,
          week_start: step.week_start ? step.week_start.split('T')[0] : formattedWeekStart,
          id,
          created_at: new Date().toISOString(),
        } as Goal;
        addGoalToCache(goal);
        return { tempId: id, payload: goal };
      });

        try {
          // Insert all goals into the database
        const insertPromises = steps.map((step) => {
        const payload = {
          ...step,
          user_id: userId,
          category: parentCategory,
          week_start: step.week_start ? step.week_start.split('T')[0] : formattedWeekStart,
        };
        return supabase.from('goals').insert(payload).select();
      });

  type InsertResult = { data?: unknown[]; body?: unknown[]; error?: unknown };
  const results = await Promise.all(insertPromises) as InsertResult[];

        const createdIds: string[] = [];
        // Replace temp entries with server rows where possible
      for (let i = 0; i < results.length; i++) {
        const res = results[i];
        if (res.error) {
          throw res.error;
        }
  const maybe = res as InsertResult;
  const rows = (maybe.data as unknown[] | undefined) || (maybe.body as unknown[] | undefined) || null;
        if (rows && rows[0]) {
          const row0 = rows[0] as { id?: string };
          if (row0.id) {
            createdIds.push(row0.id);
          }
          // map back to the temp id and replace
          const mappedTemp = temps[i];
          if (mappedTemp) {
            replaceGoalInCache(mappedTemp.tempId, rows[0] as Goal);
          } else {
            updateGoalInCache(rows[0] as Goal);
          }
        }
      }
        // Store created IDs in context so pages can auto-navigate after refresh
        try {
          if (typeof setLastAddedIds === 'function') setLastAddedIds(createdIds);
        } catch (e) {
          console.warn('Failed to set lastAddedIds on context (ignored):', e);
        }

        // Ensure we refresh global cache and the parent local indexed state regardless
        try {
          if (ctxRefresh) {
            await ctxRefresh();
          }
        } catch (e) {
          console.warn('Bulk add ctxRefresh failed (ignored):', e);
        }

        try {
          await refreshGoals();
        } catch (e) {
          console.warn('Bulk add parent refresh failed (ignored):', e);
        }

        console.log('All goals successfully inserted.');
        notifySuccess('Goals added');
      } catch (err) {
        // Rollback: remove any temp entries added to the cache
        try {
          temps.forEach((t) => removeGoalFromCache(t.tempId));
        } catch (remErr) {
          console.warn('Failed to rollback temp goals from cache', remErr);
        }
        console.error('Error during bulk insertion:', err);
        throw err;
      }

        notifySuccess('Goals added');
    } catch (err) {
      console.error('Error during bulk goal insertion or refresh:', err);
      notifyError('Failed to add goals.');
    }
  };

  const goToNextStep = () => setCurrentStep((prev) => prev + 1);
  const goToPreviousStep = () => setCurrentStep((prev) => prev - 1);

  // Ensure goal is only added when 'Add Goal(s)' is clicked
  const handleAddGoal = async (event: React.FormEvent) => {
    event.preventDefault(); // Prevent default form submission

    // Ensure a category is selected
    if (!newGoal.category) {
      console.warn('No category selected. Please select a category before adding the goal.');
      setIsCategoryModalOpen(true); // Reopen the category modal if no category is selected
      return;
    }

    // Check if the current step is the final step in the wizard
    if (showWizard && currentStep !== 3) {
      console.warn('Add Goal(s) button must be clicked to add the goal.');
      return;
    }

    try {
      // Use the addGoal function to insert the goal into the database
      await addGoal(newGoal);
    } catch (error) {
      console.error('Error adding goal:', error);
    }
    console.log('Adding goal with week_start:', newGoal); // Goal value
  };
  const handleBulkAddGoals = async (event: React.FormEvent) => {
    event.preventDefault(); // Prevent default form submission
    if (selectedSteps.length === 0) {
      console.warn('No steps selected. Please select at least one step to add goals.');
      return;
    }
    if (!newGoal.category) {
      console.warn('No category selected. Please select a category before adding the goals.');
      setIsCategoryModalOpen(true); // Reopen the category modal if no category is selected
      return;
    }
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        console.error('Error fetching user ID:', error?.message || 'User not authenticated');
        return;
      }
      await applyPlan();
      // Close the modal
      handleClose();
    } catch (error) {
      console.error('Error adding goals:', error);
    }
  };
  
  
  return (
    <>
    <form id="goalForm" className="space-y-4">
      <div className="mt-6 flex justify-end space-x-4 items-center">
        <label className="block text-sm font-medium text-gray-700">Generate goals</label>
        <FormControlLabel
          control={
            <Switch
              checked={showWizard}
              onChange={(e) => setShowWizard(e.target.checked)}
              inputProps={{ 'aria-label': 'Generate goals toggle' }}
            />
          }
          label=""
        />
      </div>
    </form>
    {/* Wizard steps */}
    {showWizard ? (
      <form onSubmit={handleBulkAddGoals} className="space-y-4">
        {currentStep === 1 && (
          <div>
            <TextField
              id="natural-language-input"
              value={naturalLanguageInput}
              onChange={(e) => setNaturalLanguageInput(e.target.value)}
              className="mt-1 block w-full"
              label="Describe your goal"
              placeholder='Describe your goal in a few sentences, e.g. "I want to improve my physical fitness by exercising regularly and eating healthier."'
              multiline
              minRows={6}
              fullWidth
            />
            <div className="mt-4 space-x-4 w-full justify-end ">
              <button type="button" onClick={handleClose} className="btn-secondary">
                Cancel
              </button>
              <button type="button" onClick={() => { handleGeneratePlan(); goToNextStep(); }} className="btn-primary mt-4">
                Generate Plan
              </button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className='relative'>
            {isGenerating && (
              <div className="w-full bg-gray-10 dark:bg-gray-90 flex justify-center items-center my-4">
                <div className="loader"><LoadingSpinner variant='mui' /></div>
                <span className="ml-2">Generating plan...</span>
              </div>
            )}
            {error && (
              <div className="h-full w-full gap-2 bg-gray-10 dark:bg-gray-90 justify-center items-center">
                <h2 className='text-lg font-bold'>Error!</h2> 
                <p className='text-red-500 h-1/2 overflow-auto p-4 mt-4 mb-4 items-start'>{error}</p>
                <div className="mt-4 space-x-2">
                  <button
                    onClick={handleClose}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="button" onClick={goToPreviousStep} className="btn-secondary">
                    Back
                  </button>
                  <button className='btn-primary' onClick={handleGeneratePlan}>Try regenerating the plan</button>
                </div>
              </div>
            )}
            {!isGenerating && !error && generatedPlan.length != 0 && (
              <>
            <h3 className="text-lg font-medium">Select Steps to Include as Goals</h3>
            <div className='flex w-full items-center justify-between'>
              <div className='mt-2 flex items-center m-2'>
                <FormControlLabel
                  control={
                    <Checkbox
                      id="select-all"
                      checked={selectedSteps.length === generatedPlan.length && generatedPlan.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSteps(generatedPlan.map((_, index) => index));
                        } else {
                          setSelectedSteps([]);
                        }
                      }}
                      inputProps={{ 'aria-label': 'Select all generated steps' }}
                    />
                  }
                  label="Select All"
                />
              </div>
              <button type="button" title="Regenerate Plan" onClick={handleGeneratePlan} className="btn-secondary size-sm">
                <RefreshCw className="inline-block" />
              </button>
            </div>
            <ul className="max-h-96 overflow-y-auto border-b-2 border-gray-30">
              {generatedPlan.map((step, index) => (
                <li
                  key={`${step.title ?? 'step'}-${index}`}
                  className="flex gap-4 bg-gray-10 hover:bg-gray-30 dark:bg-gray-90 dark:hover:bg-gray-80 p-4 items-start space-x-2 text-gray-90 dark:text-gray-20 cursor-pointer"
                  onClick={() => toggleStepSelection(index)}
                >
                  <div className="flex items-start w-full">
                    <Checkbox
                      checked={selectedSteps.includes(index)}
                      onClick={(e) => { e.stopPropagation(); toggleStepSelection(index); }}
                      onChange={(e) => { e.stopPropagation(); toggleStepSelection(index); }}
                      inputProps={{ 'aria-label': `Select step ${index + 1}` }}
                    />
                    <div className="ml-4">
                      <strong>{step.title}</strong>: {step.description}
                    </div>
                  </div>
                </li>
              ))}
            </ul>


            <div className="mt-4">
              <label htmlFor="category-wizard" className="block text-sm font-medium text-gray-70">
                Category
              </label>
              <div className="mt-2 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setFilteredCategories(categories);
                    setIsCategoryModalOpen(true);
                  }}
                  className="btn-ghost w-full text-left justify-between text-xl sm:text-lg md:text-xl lg:text-2xl"
                >
                  {newGoal.category || '-- Select a category --'}
                  <SearchIcon className="w-5 h-5 inline-block ml-2" />
                </button>

                {/* Render Modal with stable isOpen prop */}
                <Modal
                  id='category-list'
                  isOpen={isCategoryModalOpen}
                  onRequestClose={() => setIsCategoryModalOpen(false)}
                  className="fixed inset-0 flex items-center justify-center z-50"
                  overlayClassName="fixed inset-0 bg-black bg-opacity-10"
                  ariaHideApp={ARIA_HIDE_APP}
                  style={{
                    content: {
                      width: 'calc(100% - 8px)',
                      height: '100%',
                      margin: 'auto',
                    },
                  }}
                >
                    <div className="p-4 bg-gray-10 dark:bg-gray-80 rounded-lg shadow-lg w-full max-w-md">
                      <h2 className="text-lg font-bold mb-4">Select or Add a Category</h2>
                      <TextField
                        id="category-search"
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          const filtered = categories.filter((category) =>
                            category.name.toLowerCase().includes(e.target.value.toLowerCase())
                          );
                          setFilteredCategories(filtered);
                        }}
                        className="w-full"
                        placeholder="Find or create a category"
                        fullWidth
                        
                      />
                      <ul className="max-h-60 text-gray-80 dark:text-gray-30 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-70">
                        {filteredCategories.map((category, idx) => (
                            <li
                              key={category?.id ?? hashString(category?.name || String(idx))}
                            className="p-2 hover:bg-gray-20 dark:hover:bg-gray-70 cursor-pointer"
                            onClick={() => {
                              setNewGoal(prev => ({ ...prev, category: category.name }));
                              setIsCategoryModalOpen(false);
                            }}
                          >
                            {category.name}
                          </li>
                        ))}
                        {filteredCategories.length === 0 && (
                          <li key="no-matching" className="p-2 text-gray-30 dark:text-gray-70">No matching categories found.</li>
                        )}
                      </ul>
                      {filteredCategories.length === 0 && (
                        <button
                          onClick={async () => {
                            if (!searchTerm.trim()) return;

                            try {
                              const { data: { user }, error: userError } = await supabase.auth.getUser();
                              if (userError || !user) {
                                console.error('Error fetching user ID:', userError?.message || 'User not authenticated');
                                return;
                              }

                              const userId = user.id;

                              const { data: existingCategory, error: fetchError } = await supabase
                                .from('categories')
                                .select('name')
                                .eq('name', searchTerm.trim())
                                .single();

                              if (fetchError && fetchError.code !== 'PGRST116') {
                                console.error('Error checking category existence:', fetchError.message);
                                return;
                              }

                              if (!existingCategory) {
                                const { error: insertError } = await supabase
                                  .from('categories')
                                  .insert({ name: searchTerm.trim(), user_id: userId });

                                if (insertError) {
                                  console.error('Error adding category:', insertError.message);
                                  return;
                                }

                                console.log('Category added successfully.');
                              } else {
                                console.log('Category already exists.');
                              }

                              setNewGoal(prev => ({ ...prev, category: searchTerm.trim() }));
                              setIsCategoryModalOpen(false);
                            } catch (error) {
                              console.error('Unexpected error:', error);
                            }
                          }}
                          className="btn-primary mt-4"
                        >
                          Save as New Category
                        </button>
                      )}
                      <button
                        onClick={() => setIsCategoryModalOpen(false)}
                        className="btn-secondary mt-4"
                      >
                        Cancel
                      </button>
                    </div>
                  </Modal>
              </div>
            </div>

            <div>
              <label htmlFor="week_start-wizard" className="block text-sm font-medium text-gray-700">
                Week Start
              </label>
              <TextField
                id="week_start-wizard"
                type="date"
                value={newGoal.week_start}
                onChange={(e) => {
                  const selectedDate = new Date(e.target.value);
                  if (selectedDate.getDay() === 0) {
                    setNewGoal(prev => ({ ...prev, week_start: selectedDate.toISOString().split('T')[0] }));
                  } else {
                    const calculatedMonday = getWeekStartDate(selectedDate);
                    setNewGoal(prev => ({ ...prev, week_start: calculatedMonday }));
                  }
                }}
                className="mt-1 w-full"
                required
                fullWidth
                InputLabelProps={{ shrink: true }}
                
                />
            </div>
            <div className="mt-4 space-x-2 w-full justify-end">
              <button
                onClick={handleClose}
                className="btn-secondary"
                >
                Cancel
              </button>
              <button type="button" onClick={goToPreviousStep} className="btn-secondary">
                Back
              </button>
              <button type="button" onClick={goToNextStep} className="btn-primary">
                Apply Plan
              </button>
            </div>
            </>
            )}
          </div>
        )}

        {currentStep === 3 && (
          <div>
            <h3 className="text-lg font-medium">Review Selected Steps</h3>
            <ul className="list-disc pl-5 text-xl text-gray-90 dark:text-gray-20">
                      {generatedPlan.filter((_, index) => selectedSteps.includes(index)).map((step, index) => (
                <li className='mt-4' key={`${step.title ?? 'step'}-${index}`}>
                  <h4>{step.title}</h4> <span className='block text-md text-gray-60'>{step.description}</span> <span className='text-sm'>Category: {newGoal.category} | Week Start: {newGoal.week_start}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 space-x-2">
              <button
                onClick={handleClose}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="button" onClick={goToPreviousStep} className="btn-secondary">
                Back
              </button>
              <button type="submit" className="btn-primary">
                Add Goal(s)
              </button>
            </div>
          </div>  
        )}
      </form>
      ) : (
       
       
  // Manual form
  <form onSubmit={handleAddGoal} className="space-y-4">
          <div>
            <TextField
              id="title"
              label="Title"
              value={newGoal.title}
              onChange={(e) => setNewGoal(prev => ({ ...prev, title: e.target.value }))}
              // className="mt-1 block w-full"
              placeholder="Name your goal..."
              required
              fullWidth
            />
          </div>

          <div>            
            <RichTextEditor 
                id="description"
                label="Description" 
                value={newGoal.description} 
                onChange={(value) => setNewGoal(prev => ({ ...prev, description: value }))}
                placeholder="Describe this goal in a few sentences"
              />
          </div>

          <div>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setFilteredCategories(categories);
                  setIsCategoryModalOpen(true);
                }}
                className="btn-ghost hover:background-gray-80 w-full text-left justify-between text-xl sm:text-lg md:text-xl lg:text-2xl"
              >
                {newGoal.category || '-- Select a category --'}
                <SearchIcon className="w-5 h-5 inline-block ml-2" />
              </button>

              {/* Render category Modal with stable isOpen prop */}
              <Modal
                id='category-list'
                isOpen={isCategoryModalOpen}
                onRequestClose={() => setIsCategoryModalOpen(false)}
                className="fixed inset-0 flex items-center justify-center z-50"
                overlayClassName="fixed inset-0 bg-black bg-opacity-10"
                ariaHideApp={ARIA_HIDE_APP}
                style={{
                  content: {
                    width: 'calc(100% - 8px)',
                    height: '100%',
                    margin: 'auto',
                  },
                }}
              >
                  <div className="p-4 bg-gray-10 dark:bg-gray-80 rounded-lg shadow-lg w-full max-w-md">
                    <h2 className="text-lg font-bold mb-4">Select or Add a Category</h2>
                    <TextField
                      id="category-search-manual"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        const filtered = categories.filter((category) =>
                          category.name.toLowerCase().includes(e.target.value.toLowerCase())
                        );
                        setFilteredCategories(filtered);
                      }}
                      className="w-full"
                      placeholder="Find or create a category"
                      fullWidth
                      
                    />
                    <ul className="max-h-60 text-gray-80 dark:text-gray-30 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-70">
                      {filteredCategories.map((category, idx) => (
                        <li
                          key={category?.id ?? category?.name ?? idx}
                          className="p-2 hover:bg-gray-20 dark:hover:bg-gray-70 cursor-pointer"
                          onClick={() => {
                            setNewGoal(prev => ({ ...prev, category: category.name }));
                            setIsCategoryModalOpen(false);
                          }}
                        >
                          {category.name}
                        </li>
                      ))}
                      {filteredCategories.length === 0 && (
                        <li key="no-matching" className="p-2 text-gray-30 dark:text-gray-70">No matching categories found.</li>
                      )}
                    </ul>
                    {filteredCategories.length === 0 && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!searchTerm.trim()) return;

                          try {
                            const { data: { user }, error: userError } = await supabase.auth.getUser();
                            if (userError || !user) {
                              console.error('Error fetching user ID:', userError?.message || 'User not authenticated');
                              return;
                            }

                            const userId = user.id;

                            const { data: existingCategory, error: fetchError } = await supabase
                              .from('categories')
                              .select('name')
                              .eq('name', searchTerm.trim())
                              .single();

                            if (fetchError && fetchError.code !== 'PGRST116') {
                              console.error('Error checking category existence:', fetchError.message);
                              return;
                            }

                            if (!existingCategory) {
                              const { error: insertError } = await supabase
                                .from('categories')
                                .insert({ name: searchTerm.trim(), user_id: userId });

                              if (insertError) {
                                console.error('Error adding category:', insertError.message);
                                return;
                              }

                              console.log('Category added successfully.');
                            } else {
                              console.log('Category already exists.');
                            }

                            setNewGoal(prev => ({ ...prev, category: searchTerm.trim() }));
                            setIsCategoryModalOpen(false);
                          } catch (error) {
                            console.error('Unexpected error:', error);
                          }
                        }}
                        className="btn-primary mt-4"
                      >
                        Save as New Category
                      </button>
                    )}
                      <button
                        type="button"
                        onClick={() => setIsCategoryModalOpen(false)}
                        className="btn-secondary mt-4"
                      >
                      Cancel
                    </button>
                  </div>
                </Modal>
            </div>
          </div>

          <div>
            <TextField
              id="status"
              select
              label="Status"
              value={newGoal.status || 'Not started'}
              onChange={(e) => {
                const val = e.target.value;
                // Narrow to allowed statuses when possible
                const allowed = ['Not started', 'In progress', 'Blocked', 'Done', 'On hold'] as const;
                if (typeof val === 'string' && (allowed as readonly string[]).includes(val)) {
                  setNewGoal(prev => ({ ...prev, status: val as Goal['status'] }));
                } else {
                  setNewGoal(prev => ({ ...prev, status: prev.status }));
                }
              }}
              className="mt-2 w-full"
              fullWidth
              
            >
              <MenuItem value="Not started">Not started</MenuItem>
              <MenuItem value="In progress">In progress</MenuItem>
              <MenuItem value="Blocked">Blocked</MenuItem>
              <MenuItem value="Done">Done</MenuItem>
            </TextField>
          </div>
          <div>
            <TextField
              id="week_start"
              label="Week Start"
              type="date"
              value={newGoal.week_start}
              onChange={(e) => {
                const selectedDate = new Date(e.target.value);
                if (selectedDate.getDay() === 0) {
                  setNewGoal(prev => ({ ...prev, week_start: selectedDate.toISOString().split('T')[0] }));
                } else {
                  const calculatedMonday = getWeekStartDate(selectedDate);
                  setNewGoal(prev => ({ ...prev, week_start: calculatedMonday }));
                }
              }}
              className="mt-2 w-full"
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
              
            />
          </div>

          <div className="mt-6 flex justify-end space-x-4">
            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary"
              >
              Cancel
            </button>
            <button
              type="submit" // Ensure this button submits the form
              className="btn-primary"
              >
              Add Goal
            </button>

          </div>
        </form>

        )}
  </>
  );
};

export default AddGoal;