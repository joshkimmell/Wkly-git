import React, { useEffect, useState } from 'react';
import { getWeekStartDate, fetchCategories } from '@utils/functions'; // Import fetchCategories from functions.ts
import { Category, Goal, Task } from '@utils/goalUtils'; // Import Task type
import supabase from '@lib/supabase'; // Import Supabase client
import { useGoalsContext } from '@context/GoalsContext';
import LoadingSpinner from '@components/LoadingSpinner';
import { SearchIcon, RefreshCw, CheckCircle, Edit2, Calendar, Clock, Bell } from 'lucide-react';
import Modal from 'react-modal';
import { ARIA_HIDE_APP } from '@lib/modal';
import { modalClasses, overlayClasses } from '@styles/classes';
import RichTextEditor from '@components/RichTextEditor';
import { notifySuccess, notifyError } from '@components/ToastyNotification';
import { TextField, MenuItem, Checkbox, FormControlLabel, Switch, Select, InputLabel, FormControl } from '@mui/material';
import { DatePicker, TimePicker, DateTimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

export interface AddGoalProps {
  newGoal: Goal; // Updated to use the full Goal type
  setNewGoal: React.Dispatch<React.SetStateAction<Goal>>; // Updated to match the full Goal type
  handleClose: () => void; // Added handleClose prop to allow closing the modal
  categories: string[];
  refreshGoals: () => Promise<void>; // Added refreshGoals prop to refresh the goals
}

const AddGoal: React.FC<AddGoalProps> = ({ newGoal, setNewGoal, handleClose, refreshGoals }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  
  // New workflow state
  const [draftGoal, setDraftGoal] = useState(''); // Step 1: User's draft input
  const [refinedGoal, setRefinedGoal] = useState<{ title: string; description: string; feedback: string } | null>(null); // Step 2: AI refined goal
  const [generatedTasks, setGeneratedTasks] = useState<Array<Task & { suggested_date?: string; estimated_duration?: string }>>([]); // Step 3: AI generated tasks
  const [selectedTasks, setSelectedTasks] = useState<number[]>([]); // Which tasks to include
  
  // Old workflow state (for backward compatibility)
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  const [generatedPlan, setGeneratedPlan] = useState<Goal[]>([]);
  const [selectedSteps, setSelectedSteps] = useState<number[]>([]);
  
  const [currentStep, setCurrentStep] = useState(1); // 1: Draft, 2: Refine, 3: Tasks, 4: Schedule, 5: Review
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

  // Sync filteredCategories with categories
  useEffect(() => {
    setFilteredCategories(categories);
  }, [categories]);

  // NEW WORKFLOW HANDLERS
  // Step 1: User provides draft goal - AI refines it
  const handleRefineGoal = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('User not authenticated');
      
      const response = await fetch('/.netlify/functions/refineGoal', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ draft_goal: draftGoal }),
      });

      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(errorMessage || 'Failed to refine goal');
      }

      const data = await response.json();
      setRefinedGoal(data);
      setNewGoal(prev => ({
        ...prev,
        title: data.refined_title,
        description: data.refined_description,
      }));
      setCurrentStep(2);
    } catch (error) {
      console.error('Error refining goal:', error);
      setError((error instanceof Error ? error.message : 'An unexpected error occurred'));
    } finally {
      setIsGenerating(false);
    }
  };

  // Step 2: User accepts/edits refined goal - AI generates tasks
  const handleGenerateTasks = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('User not authenticated');
      
      const response = await fetch('/.netlify/functions/generatePlan', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          title: newGoal.title,
          description: newGoal.description 
        }),
      });

      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(errorMessage || 'Failed to generate tasks');
      }

      const data = await response.json();
      if (Array.isArray(data.tasks)) {
        // Transform tasks with default values
        const tasksWithDefaults = data.tasks.map((task: any, index: number) => ({
          id: `temp-${Date.now()}-${index}`,
          goal_id: '',
          user_id: '',
          title: task.title,
          description: task.description,
          status: 'Not started' as const,
          suggested_date: task.suggested_date,
          estimated_duration: task.estimated_duration,
          scheduled_date: undefined,
          scheduled_time: undefined,
          reminder_enabled: false,
          reminder_datetime: undefined,
          order_index: index,
          created_at: new Date().toISOString(),
        }));
        setGeneratedTasks(tasksWithDefaults);
        setSelectedTasks(tasksWithDefaults.map((_: any, i: number) => i)); // Select all by default
        setCurrentStep(3);
      } else {
        throw new Error('Unexpected response format');
      }
    } catch (error) {
      console.error('Error generating tasks:', error);
      setError((error instanceof Error ? error.message : 'An unexpected error occurred'));
    } finally {
      setIsGenerating(false);
    }
  };

  // OLD WORKFLOW HANDLER (for backward compatibility)
  const handleGeneratePlan = async () => {
    setIsGenerating(true); // Show loading animation
    setError(null); // Reset error state
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('User not authenticated');
      
      const response = await fetch('/.netlify/functions/generatePlan', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
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

  // Helper function to ensure category exists in database
  const ensureCategoryExists = async (categoryName: string, userId: string) => {
    try {
      // Try to insert the category - database will handle duplicates
      const { error: insertError } = await supabase
        .from('categories')
        .insert({ name: categoryName, user_id: userId });

      // Ignore duplicate key errors (23505 is PostgreSQL unique violation)
      if (insertError && !insertError.message?.includes('duplicate') && insertError.code !== '23505') {
        console.error('Error creating category:', insertError.message);
        // Don't throw - allow goal creation to continue even if category creation fails
      } else if (!insertError) {
        console.log('Category created successfully:', categoryName);
      }
    } catch (error) {
      console.error('Unexpected error in ensureCategoryExists:', error);
      // Don't throw - allow goal creation to continue
    }
  };

  // NEW: Create goal with tasks
  const createGoalWithTasks = async () => {
    try {
      setIsGenerating(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      // Ensure week_start is properly formatted
      const weekStart = newGoal.week_start ? newGoal.week_start.split('T')[0] : getWeekStartDate();

      // Default category to 'General' if not provided
      const category = newGoal.category?.trim() || 'General';

      // Create the goal via Netlify function (uses service-role to bypass RLS)
      const goalRes = await fetch('/.netlify/functions/createGoal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: newGoal.title,
          description: newGoal.description,
          category,
          week_start: weekStart,
          status: 'Not started',
        }),
      });

      if (!goalRes.ok) {
        const errBody = await goalRes.json().catch(() => ({}));
        throw new Error(`Failed to create goal: ${(errBody as { error?: string }).error || goalRes.statusText}`);
      }

      const createdGoal = await goalRes.json() as { id: string };

      // Create tasks for the goal
      const tasksToCreate = generatedTasks.filter((_, index) => selectedTasks.includes(index));

      // If no tasks have a scheduled date, default the first task to today (no time)
      const noneScheduled = tasksToCreate.length > 0 && tasksToCreate.every(t => !t.scheduled_date);
      if (noneScheduled) {
        tasksToCreate[0] = { ...tasksToCreate[0], scheduled_date: dayjs().format('YYYY-MM-DD') };
      }

      if (tasksToCreate.length > 0) {
        await Promise.all(
          tasksToCreate.map((task) =>
            fetch('/.netlify/functions/createTask', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                goal_id: createdGoal.id,
                title: task.title,
                description: task.description,
                status: task.status,
                scheduled_date: task.scheduled_date || null,
                scheduled_time: task.scheduled_time || null,
                reminder_enabled: task.reminder_enabled,
                reminder_datetime: task.reminder_datetime || null,
                order_index: task.order_index,
              }),
            })
          )
        );
        notifySuccess(`Goal created with ${tasksToCreate.length} task${tasksToCreate.length !== 1 ? 's' : ''}!`);
      } else {
        notifySuccess('Goal created!');
      }

      // Reset state and refresh
      await refreshGoals();
      handleClose();
      
      // Reset wizard
      setDraftGoal('');
      setRefinedGoal(null);
      setGeneratedTasks([]);
      setSelectedTasks([]);
      setCurrentStep(1);
      setNewGoal({
        id: '',
        title: '',
        description: '',
        category: '',
        week_start: '',
        user_id: '',
        created_at: ''
      });

    } catch (error) {
      console.error('Error creating goal with tasks:', error);
      notifyError(error instanceof Error ? error.message : 'Failed to create goal');
    } finally {
      setIsGenerating(false);
    }
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

      // Default category to 'General' if not provided
      if (!goal.category || !goal.category.trim()) {
        goal.category = 'General';
      }

      // Ensure category exists in database (auto-create if needed)
      await ensureCategoryExists(goal.category, user.id);

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
      
      // Default category to 'General' if not provided
      const category = parentCategory?.trim() || 'General';
      
      // Ensure category exists in database
      await ensureCategoryExists(category, userId);

      console.log('Bulk adding goals with default week_start:', formattedWeekStart); // Log default week_start value

  // Optimistic UI: add temporary goals to the cache first

  const temps = steps.map((step) => {
        const id = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const goal = {
          ...step,
          user_id: userId,
          category: category,
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
          category: category,
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
    <form id="goalForm" className="hidden space-y-4">
      <div className="mt-6 flex justify-end space-x-4 items-center">
        <label className="block text-sm font-medium text-gray-70">Generate goals</label>
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
        {/* Step 1: Draft Goal Input */}
        {currentStep === 1 && (
          <div>
            <h3 className="text-lg font-medium mb-4">Step 1: Describe Your Goal</h3>
            <TextField
              id="draft-goal-input"
              value={draftGoal}
              onChange={(e) => setDraftGoal(e.target.value)}
              className="mt-1 block w-full"
              label="Draft Goal"
              placeholder='Describe what you want to achieve, e.g. "I want to improve my physical fitness by exercising regularly and eating healthier."'
              multiline
              minRows={6}
              fullWidth
            />
            <div className="mt-4 space-x-4 w-full justify-end ">
              <button type="button" onClick={handleClose} className="btn-secondary">
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleRefineGoal} 
                disabled={!draftGoal.trim() || isGenerating}
                className="btn-primary mt-4"
              >
                {isGenerating ? 'Refining...' : 'Refine Goal'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Review Refined Goal */}
        {currentStep === 2 && (
          <div>
            <h3 className="text-lg font-medium mb-4">Step 2: Review & Edit Your Goal</h3>
            
            {refinedGoal && (
              <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <CheckCircle className="inline w-4 h-4 mr-1" />
                  <strong>AI Feedback:</strong> {refinedGoal.feedback}
                </p>
              </div>
            )}

            <TextField
              label="Goal Title"
              value={newGoal.title}
              onChange={(e) => setNewGoal(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter a clear, concise title for your goal"
              fullWidth
              required
              className="mb-4"
            />

            <RichTextEditor
              id="goal-description"
              label="Goal Description"
              value={newGoal.description}
              onChange={(value) => setNewGoal(prev => ({ ...prev, description: value }))}
              placeholder="Describe what success looks like..."
            />

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-70 dark:text-gray-30 mb-2">
                Category <span className="text-gray-50 font-normal">(optional, defaults to General)</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setFilteredCategories(categories);
                  setIsCategoryModalOpen(true);
                }}
                className="btn-ghost w-full text-left justify-between"
              >
                {newGoal.category || 'General (default)'}
                <SearchIcon className="w-5 h-5 inline-block ml-2" />
              </button>
            </div>

            {/* <div className="mt-4">
              <TextField
                type="date"
                label="Week Start Date"
                value={newGoal.week_start}
                onChange={(e) => setNewGoal(prev => ({ ...prev, week_start: e.target.value }))}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
              />
            </div> */}

            <div className="mt-4 space-x-4 flex justify-end">
              <button type="button" onClick={goToPreviousStep} className="btn-secondary">
                Back
              </button>
              <button type="button" onClick={createGoalWithTasks} disabled={isGenerating} className="btn-secondary">
                {isGenerating ? 'Creating...' : 'Add goal'}
              </button>
              <button 
                type="button" 
                onClick={handleGenerateTasks}
                disabled={!newGoal.title || isGenerating}
                className="btn-primary"
              >
                {isGenerating ? 'Generating Tasks...' : 'Generate Tasks'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Select Tasks */}
        {currentStep === 3 && (
          <div>
            <h3 className="text-lg font-medium mb-4">Step 3: Review Tasks for Your Goal</h3>

            {isGenerating && (
              <div className="w-full bg-gray-10 dark:bg-gray-90 flex justify-center items-center my-4">
                <div className="loader"><LoadingSpinner variant='mui' /></div>
                <span className="ml-2">Generating tasks...</span>
              </div>
            )}

            {error && (
              <div className="h-full w-full gap-2 bg-gray-10 dark:bg-gray-90 p-4 rounded">
                <h2 className='text-lg font-bold text-red-600'>Error!</h2> 
                <p className='text-red-500 mt-2'>{error}</p>
                <div className="mt-4 space-x-2">
                  <button onClick={handleClose} className="btn-secondary">Cancel</button>
                  <button type="button" onClick={goToPreviousStep} className="btn-secondary">Back</button>
                  <button className='btn-primary' onClick={handleGenerateTasks}>Retry</button>
                </div>
              </div>
            )}

            {!isGenerating && !error && generatedTasks.length > 0 && (
              <>
                <div className='flex w-full items-center justify-between mb-4'>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectedTasks.length === generatedTasks.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTasks(generatedTasks.map((_, index) => index));
                          } else {
                            setSelectedTasks([]);
                          }
                        }}
                      />
                    }
                    label="Select All Tasks"
                  />
                  <button type="button" title="Regenerate Tasks" onClick={handleGenerateTasks} className="btn-secondary size-sm">
                    <RefreshCw className="inline-block w-4 h-4" />
                  </button>
                </div>

                <ul className="max-h-96 overflow-y-auto border border-gray-30 dark:border-gray-70 rounded-md">
                  {generatedTasks.map((task, index) => (
                    <li
                      key={task.id}
                      className="flex gap-4 bg-gray-10 bg-transparent hover:bg-background p-4 items-start border-gray-30 dark:border-gray-70 border-b last:border-b-0"
                      onClick={() => {
                        setSelectedTasks(prev =>
                          prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
                        );
                      }}
                    >
                      <Checkbox
                        checked={selectedTasks.includes(index)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => {
                          setSelectedTasks(prev =>
                            prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
                          );
                        }}
                      />
                      <div className="flex-1">
                        <strong className="block">{task.title}</strong>
                        <p className="text-sm mt-1">{task.description}</p>
                        <div className="flex gap-4 mt-2 text-xs text-gray-60 dark:text-gray-40">
                          {task.suggested_date && (
                            <span><Calendar className="inline w-3 h-3 mr-1" />{task.suggested_date}</span>
                          )}
                          {task.estimated_duration && (
                            <span><Clock className="inline w-3 h-3 mr-1" />{task.estimated_duration}</span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex justify-between items-center">
                  <button type="button" onClick={goToPreviousStep} className="btn-secondary">
                    Back
                  </button>
                  <div className="flex gap-3 items-center">
                    <button 
                      type="button" 
                      onClick={() => setCurrentStep(4)}
                      disabled={selectedTasks.length === 0}
                      className="btn-secondary !text-primary-link hover:underline text-brand"
                    >
                      Schedule Tasks
                    </button>
                    <button
                      type="button"
                      onClick={createGoalWithTasks}
                      disabled={isGenerating}
                      className="btn-primary"
                    >
                      {isGenerating ? 'Creating...' : `Create Goal${selectedTasks.length > 0 ? ` & ${selectedTasks.length} Task${selectedTasks.length !== 1 ? 's' : ''}` : ''}`}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 4: Schedule & Configure Reminders */}
        {currentStep === 4 && (
          <div>
            <h3 className="text-lg font-medium mb-4">Step 4: Schedule Tasks & Set Reminders</h3>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {generatedTasks
                .filter((_, index) => selectedTasks.includes(index))
                .map((task, arrayIndex) => {
                  const originalIndex = selectedTasks[arrayIndex];
                  return (
                    <div key={task.id} className="p-4 border rounded-lg bg-gray-10 dark:bg-gray-90">
                      <h4 className="font-medium mb-3">{task.title}</h4>
                      
                      <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <div className="grid grid-cols-2 gap-4">
                          <DatePicker
                            label="Scheduled Date"
                            value={task.scheduled_date ? dayjs(task.scheduled_date) : null}
                            onChange={(newValue) => {
                              const updated = [...generatedTasks];
                              updated[originalIndex] = { ...updated[originalIndex], scheduled_date: newValue ? newValue.format('YYYY-MM-DD') : '' };
                              setGeneratedTasks(updated);
                            }}
                            slotProps={{ textField: { size: 'small', fullWidth: true } }}
                          />
                          <TimePicker
                            label="Scheduled Time"
                            value={task.scheduled_time ? dayjs(`2000-01-01T${task.scheduled_time}`) : null}
                            onChange={(newValue) => {
                              const updated = [...generatedTasks];
                              updated[originalIndex] = { ...updated[originalIndex], scheduled_time: newValue ? newValue.format('HH:mm') : '' };
                              setGeneratedTasks(updated);
                            }}
                            slotProps={{ textField: { size: 'small', fullWidth: true } }}
                          />
                        </div>
                      </LocalizationProvider>

                      <div className="mt-3">
                        <FormControlLabel
                          control={
                            <Switch
                              checked={task.reminder_enabled}
                              onChange={(e) => {
                                const updated = [...generatedTasks];
                                updated[originalIndex] = { ...updated[originalIndex], reminder_enabled: e.target.checked };
                                setGeneratedTasks(updated);
                              }}
                            />
                          }
                          label={<span className="text-sm"><Bell className="inline w-4 h-4 mr-1" />Enable Reminder</span>}
                        />
                      </div>

                      {task.reminder_enabled && (
                        <DateTimePicker
                          label="Reminder Date & Time"
                          value={task.reminder_datetime ? dayjs(task.reminder_datetime) : null}
                          onChange={(newValue) => {
                            const updated = [...generatedTasks];
                            updated[originalIndex] = { ...updated[originalIndex], reminder_datetime: newValue ? newValue.format('YYYY-MM-DDTHH:mm') : '' };
                            setGeneratedTasks(updated);
                          }}
                          slotProps={{ textField: { size: 'small', fullWidth: true, className: 'mt-2' } }}
                        />
                      )}
                    </div>
                  );
                })}
            </div>

            <div className="mt-6 space-x-4 flex justify-end">
              <button type="button" onClick={goToPreviousStep} className="btn-secondary">
                Back
              </button>
              <button 
                type="button" 
                onClick={createGoalWithTasks}
                disabled={isGenerating}
                className="btn-primary"
              >
                {isGenerating ? 'Creating...' : 'Create Goal & Tasks'}
              </button>
            </div>
          </div>
        )}

        {/* OLD WORKFLOW - Keep for backward compatibility */}
        {currentStep === 1 && false && (
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
                <span className="ml-2">Generating tasks...</span>
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
                Category <span className="text-gray-50 font-normal">(optional, defaults to General)</span>
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
                  {newGoal.category || 'General (default)'}
                  <SearchIcon className="w-5 h-5 inline-block ml-2" />
                </button>

                {/* Render Modal with stable isOpen prop */}
                <Modal
                  id='category-list'
                  isOpen={isCategoryModalOpen}
                  onRequestClose={() => setIsCategoryModalOpen(false)}
                  className="fixed inset-0 flex items-center justify-center z-50"
                  overlayClassName={`${overlayClasses}`}
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

                              // Try to insert the category - database will handle duplicates
                              const { error: insertError } = await supabase
                                .from('categories')
                                .insert({ name: searchTerm.trim(), user_id: userId });

                              // Ignore duplicate key errors (23505 is PostgreSQL unique violation)
                              if (insertError && !insertError.message?.includes('duplicate') && insertError.code !== '23505') {
                                console.error('Error adding category:', insertError.message);
                                return;
                              } else if (!insertError) {
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
              <label htmlFor="week_start-wizard" className="block text-sm font-medium text-gray-70">
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

        {currentStep === 3 && generatedPlan.length > 0 && (
          <div>
            <h3 className="text-lg font-medium">Review Selected Tasks</h3>
            <ul className="list-disc pl-5 text-xl text-gray-90 dark:text-gray-20">
                      {generatedPlan.filter((_, index) => selectedSteps.includes(index)).map((step, index) => (
                <li className='mt-4' key={`${step.title ?? 'step'}-${index}`}>
                  <h4>{step.title}</h4> <span className='block text-md text-gray-60'>{step.description}</span> <span className='text-sm'>Category: {newGoal.category}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 space-x-2">
              <button
                onClick={handleClose}
                className="btn-ghost"
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
                {newGoal.category || 'General (default)'}
                <SearchIcon className="w-5 h-5 inline-block ml-2" />
              </button>

              {/* Render category Modal with stable isOpen prop */}
        <Modal
          id='category-list'
          isOpen={isCategoryModalOpen}
          onRequestClose={() => setIsCategoryModalOpen(false)}
          className="fixed inset-0 flex items-center justify-center z-50"
          overlayClassName={`${overlayClasses}`}
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

                            // Try to insert the category - database will handle duplicates
                            const { error: insertError } = await supabase
                              .from('categories')
                              .insert({ name: searchTerm.trim(), user_id: userId });

                            // Ignore duplicate key errors (23505 is PostgreSQL unique violation)
                            if (insertError && !insertError.message?.includes('duplicate') && insertError.code !== '23505') {
                              console.error('Error adding category:', insertError.message);
                              return;
                            } else if (!insertError) {
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
        
        {/* Shared Category Modal - Available for all workflows */}
        <Modal
          id='category-modal'
          isOpen={isCategoryModalOpen}
          onRequestClose={() => setIsCategoryModalOpen(false)}
          className="fixed inset-0 flex items-center justify-center z-50"
          overlayClassName={`${overlayClasses}`}
          ariaHideApp={ARIA_HIDE_APP}
          style={{
            content: {
              width: 'calc(100% - 8px)',
              height: '100%',
              margin: 'auto',
            },
          }}
        >
          <div className="p-4 bg-background-color rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Select or Create a Category</h2>
            <TextField
              id="category-search-shared"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                const filtered = categories.filter((category) =>
                  category.name.toLowerCase().includes(e.target.value.toLowerCase())
                );
                setFilteredCategories(filtered);
              }}
              className="w-full mb-4"
              placeholder="Find or create a category"
              fullWidth
              autoFocus
            />
            <ul className="max-h-60 text-gray-80 dark:text-gray-30 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-70 mb-4">
              {filteredCategories.map((category, idx) => (
                <li
                  key={category?.id ?? hashString(category?.name || String(idx))}
                  className="p-2 hover:bg-gray-20 dark:hover:bg-gray-70 cursor-pointer"
                  onClick={() => {
                    setNewGoal(prev => ({ ...prev, category: category.name }));
                    setIsCategoryModalOpen(false);
                    setSearchTerm('');
                  }}
                >
                  {category.name}
                </li>
              ))}
              {filteredCategories.length === 0 && searchTerm && (
                <li className="p-2 text-gray-30 dark:text-gray-70">
                  No matching categories found. Create "{searchTerm}"?
                </li>
              )}
              {filteredCategories.length === 0 && !searchTerm && (
                <li className="p-2 text-gray-30 dark:text-gray-70">
                  No categories yet. Start typing to create one.
                </li>
              )}
            </ul>
            <div className="flex gap-2 justify-end">
              {searchTerm && filteredCategories.length === 0 && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!searchTerm.trim()) return;

                    try {
                      const { data: { user }, error: userError } = await supabase.auth.getUser();
                      if (userError || !user) {
                        console.error('Error fetching user ID:', userError?.message || 'User not authenticated');
                        notifyError('You must be logged in to create categories');
                        return;
                      }

                      const userId = user.id;
                      const categoryName = searchTerm.trim();

                      // Try to insert the category - database will handle duplicates
                      const { error: insertError } = await supabase
                        .from('categories')
                        .insert({ name: categoryName, user_id: userId });

                      // Ignore duplicate key errors (23505 is PostgreSQL unique violation)
                      if (insertError && !insertError.message?.includes('duplicate') && insertError.code !== '23505') {
                        console.error('Error adding category:', insertError.message);
                        notifyError('Failed to create category');
                        return;
                      }

                      if (!insertError) {
                        notifySuccess(`Category "${categoryName}" created successfully`);
                      } else {
                        console.log('Category already exists.');
                      }
                      
                      // Refresh categories list
                      const { UserCategories } = await fetchCategories(); 
                      setCategories(
                        UserCategories && Array.isArray(UserCategories)
                          ? UserCategories.map((category) => ({ id: category.id, name: category.name }))
                          : []
                      );

                      setNewGoal(prev => ({ ...prev, category: categoryName }));
                      setIsCategoryModalOpen(false);
                      setSearchTerm('');
                    } catch (error) {
                      console.error('Unexpected error creating category:', error);
                      notifyError('An unexpected error occurred');
                    }
                  }}
                  className="btn-primary"
                >
                  Create "{searchTerm}"
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setSearchTerm('');
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
  </>
  );
};

export default AddGoal;