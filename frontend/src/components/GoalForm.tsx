import React, { useEffect, useState } from 'react';
import { getWeekStartDate, initializeUserCategories, fetchCategories } from '@utils/functions'; // Import fetchCategories from functions.ts
import { Goal } from '@utils/goalUtils'; // Import the addCategory function
import supabase from '@lib/supabase'; // Import Supabase client
import { UserCategories } from '@utils/functions'; // Correct import path
import { TagIcon } from 'lucide-react'; // Removed unused PlusSquare
// import ReactQuill from 'react-quill'; // Removed unused Quill
import 'react-quill/dist/quill.bubble.css'; // Import Quill styles

// Expose fetchCategoriesSimple for testing in the browser console
// (window as any).fetchCategoriesSimple = fetchCategoriesSimple;

export interface AddGoalProps {
  newGoal: Goal; // Updated to use the full Goal type
  setNewGoal: React.Dispatch<React.SetStateAction<Goal>>; // Updated to match the full Goal type
  // handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleClose: () => void; // Added handleClose prop to allow closing the modal
  categories: string[];
  refreshGoals: () => Promise<void>; // Added refreshGoals prop to refresh the goals
}


const AddGoal: React.FC<AddGoalProps> = ({ newGoal, setNewGoal, handleClose, refreshGoals }) => {
  const [newCategory, setNewCategory] = React.useState('');
  const [isAddingCategory, setIsAddingCategory] = React.useState(false);
  const [categories, setCategories] = React.useState<{ id: string; name: string }[]>([]); // Update state type to match the expected structure
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  const [generatedPlan, setGeneratedPlan] = useState<Goal[]>([]);
  const [selectedSteps, setSelectedSteps] = useState<number[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [showWizard, setShowWizard] = useState(true); // State to toggle between wizard and manual form
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        const { UserCategories } = await fetchCategories(); // Use fetchCategories from functions.ts

        // console.log('Fetched UserCategories:', UserCategories); // Debug log to inspect the structure

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

  const handleAddCategory = async () => {
    if (isSubmitting) {
      console.warn('Category submission already in progress.');
      return;
    }

    setIsSubmitting(true); // Prevent further submissions

    try {
      if (newCategory.trim()) {
        // Fetch the authenticated user's ID
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          console.error('Error fetching user ID:', userError?.message || 'User not authenticated');
          return;
        }
        const userId = user.id;

        // Check if the category already exists
        const { data: existingCategory, error: fetchError } = await supabase
          .from('categories')
          .select('name')
          .eq('name', newCategory.trim())
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // Handle specific Supabase error codes
          console.error('Error checking category existence:', fetchError.message);
          return;
        }

        if (!existingCategory) {
          // Add the new category
          const { error: insertError } = await supabase
            .from('categories')
            .insert({ name: newCategory.trim(), user_id: userId });

          if (insertError) {
            console.error('Error adding category:', insertError.message);
            return;
          }

          console.log('Category added successfully.');
        } else {
          console.log('Category already exists.');
        }
      } else {
        console.warn('Category name cannot be empty.');
      }
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setIsSubmitting(false); // Reset submission state
    }
  };

  const handleGeneratePlan = async () => {
    try {
      const response = await fetch('/api/generatePlan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: naturalLanguageInput }),
      });
      // Update to use the VITE-prefixed environment variable
      
      const data = await response.json();
      if (Array.isArray(data.result)) {
        setGeneratedPlan(data.result);
      } else {
        console.error('Unexpected response format:', data);
      }
    } catch (error) {
      console.error('Error generating plan:', error);
    }
  };

  const toggleStepSelection = (index: number) => {
    setSelectedSteps((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const applyPlan = async () => {
    // const currentWeek = new Date().toISOString().split('T')[0];

    // Fetch the authenticated user's ID
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      console.error('Error fetching user ID:', error?.message || 'User not authenticated');
      return;
    }

    const userId = user.id;

    const stepsToSubmit = generatedPlan.filter((_, index) => selectedSteps.includes(index));

    // Ensure all steps share the same category as the parent goal
    let parentCategory = newGoal.category;

    if (!parentCategory) {
      // Default to "general" if no category is selected
      parentCategory = "general";
      console.warn('No category selected. Defaulting to "general".');
    }

    stepsToSubmit.forEach((step) => {
      const goal = {
        ...step,
        category: parentCategory, // Override category with the parent goal's category
        week_start: newGoal.week_start,
        user_id: userId,
      };

      // Log the goal being added
      console.log('Adding goal:', goal);

      if (!goal.title || !goal.description || !goal.category || !goal.week_start || !goal.user_id) {
        console.error('Missing required fields:', goal);
        return;
      }

      // Call a separate function to handle adding the goal
      addGoal(goal);
    });

    setGeneratedPlan([]);
    setSelectedSteps([]);
  };

  const addGoal = async (goal: Goal) => {
    try {
      // Validate that the category exists in the database
      const { data: existingCategory, error: categoryError } = await supabase
        .from('categories')
        .select('name')
        .eq('name', goal.category)
        .single();

      if (categoryError || !existingCategory) {
        console.error(`Category '${goal.category}' does not exist. Please create it first.`);
        return;
      }

      // Insert the goal into the database
      const { error } = await supabase.from('goals').insert(goal);

      if (error) {
        console.error('Error adding goal to the database:', error.message);
        return;
      }

      console.log('Goal successfully added:', goal);

      // Re-fetch the updated list of goals
      if (refreshGoals) {
        await refreshGoals(); // Call the refreshGoals function if available
      } else {
        console.warn('refreshGoals function is not available. Ensure it is passed as a prop.');
      }

      // Close the modal
      handleClose();
    } catch (error) {
      console.error('Error adding goal:', error);
    }
  };

  const goToNextStep = () => setCurrentStep((prev) => prev + 1);
  const goToPreviousStep = () => setCurrentStep((prev) => prev - 1);

  const handleAddGoal = async (event: React.FormEvent) => {
    event.preventDefault(); // Prevent default form submission
    // Fetch the authenticated user's ID
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        console.error('Error fetching user ID:', error?.message || 'User not authenticated');
        return;
    }

    const userId = user.id;

    // const currentWeek = new Date().toISOString().split('T')[0];
    // Wizard mode: Add multiple goals
    if (showWizard) {


        const stepsToSubmit = generatedPlan.filter((_, index) => selectedSteps.includes(index));

        // Ensure all steps share the same category as the parent goal
        let parentCategory = newGoal.category;

        if (!parentCategory) {
            // Default to "general" if no category is selected
            parentCategory = "general";
            console.warn('No category selected. Defaulting to "general".');
        }

        for (const step of stepsToSubmit) {
            const goal = {
                ...step,
                category: parentCategory, // Override category with the parent goal's category
                week_start: newGoal.week_start,
                user_id: userId,
            };

            // Log the goal being added
            console.log('Adding goal:', goal);

            if (!goal.title || !goal.description || !goal.category || !goal.week_start || !goal.user_id) {
                console.error('Missing required fields:', goal);
                continue;
            }

            // Call a separate function to handle adding the goal
            await addGoal(goal);
        }

        setGeneratedPlan([]);
        setSelectedSteps([]);
    } else {
        // Manual mode: Add a single goal
        // const goalToAdd = { ...newGoal }; // Clone the newGoal state

        // Ensure week_start is formatted as YYYY-MM-DD
        if (newGoal.week_start) {
          newGoal.week_start = newGoal.week_start.split('T')[0];
        }

        // Create the goal payload
        const { created_at, id, ...goalToAdd } = {
          ...newGoal,
          user_id: userId, // Include user_id
        };

        console.log('Adding goal:', goalToAdd);

        // Insert goal into the database
        const { error } = await supabase.from('goals').insert(goalToAdd);

        if (error) {
          console.error('Error adding goal to the database:', error.message);
          return;
        }

        // Refresh goals and close the form
        refreshGoals();
        handleClose();
    }
  };

  // function closeGoalModal(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
  //   event.preventDefault();
  //   // If you want to reset the form, you can do so here, e.g.:
  //   // setNewGoal({ ... }); // Reset to initial state if needed
  //   // Then close the modal:
  //   if (typeof onAddCategory === 'function') {
  //     setIsAddingCategory(false);
  //     setNewCategory('');
  //   }
  //   // If you have a prop to close the modal, call it:
  //   if (typeof (AddGoal as any).defaultProps?.closeGoalModal === 'function') {
  //     (AddGoal as any).defaultProps.closeGoalModal();
  //   }
  // }
  // console.log('addGoal week_start:', newGoal.week_start);
  // console.log('addGoal request:', newGoal);
  // console.log('addGoal categories:', categories);
  
  
  return (
    <form onSubmit={handleAddGoal} className="space-y-4">
      {/* Toggle switch to replace the checkbox */}
      <div className="mt-6 flex justify-end space-x-4">
        <label className="block text-sm font-medium text-gray-700">Generate goals</label>
        <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
          <input
            type="checkbox"
            name="toggle"
            id="toggle"
            className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-2 appearance-none cursor-pointer"
            checked={showWizard}
            onChange={(e) => setShowWizard(e.target.checked)}
          />
          <label
            htmlFor="toggle"
            className="toggle-label block overflow-hidden h-6 rounded-full cursor-pointer"
          ></label>
        </div>
      </div>
      {/* Wizard steps */}
      {showWizard ? (
        <>
          {currentStep === 1 && (
            <div>
              <label htmlFor="natural-language-input" className="block text-sm font-medium text-gray-70">
                Describe your goal
              </label>
              <textarea
                id="natural-language-input"
                value={naturalLanguageInput}
                onChange={(e) => setNaturalLanguageInput(e.target.value)}
                className="mt-1 block w-full border-b-gray-30 shadow-sm focus:border-b-2 sm:text-lg md:text-xl lg:text-2xl"
              />
              <div className="mt-4 space-x-2">
                <button
                  onClick={handleClose}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="button" onClick={() => { handleGeneratePlan(); goToNextStep(); }} className="btn-primary mt-4">
                  Generate Plan
                </button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <h3 className="text-lg font-medium">Select Steps to Include as Goals</h3>
              <div className='mt-2 flex items-center m-2'>
                <input
                  type="checkbox"
                  id="select-all"
                  checked={selectedSteps.length === generatedPlan.length && generatedPlan.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedSteps(generatedPlan.map((_, index) => index));
                    } else {
                      setSelectedSteps([]);
                    }
                  }}
                  className="m-2 size-5 rounded-full cursor-pointer"
                />
                <label htmlFor="select-all" className="ml-2 cursor-pointer">Select All</label>
              </div>
              <ul className="max-h-96 overflow-y-auto border-b-2 border-gray-30">
                {generatedPlan.map((step, index) => (
                  <li
                    key={index}
                    className="flex gap-4 bg-gray-10 hover:bg-gray-30 dark:bg-gray-90 dark:hover:bg-gray-80 p-4 items-start space-x-2 text-gray-90 dark:text-gray-20 cursor-pointer"
                    onClick={() => toggleStepSelection(index)}
                  >
                    <div className="flex items-start w-full">
                      <input
                        type="checkbox"
                        checked={selectedSteps.includes(index)}
                        onChange={(e) => e.stopPropagation()} // Prevent parent click event
                        className="step-checkbox m-2 size-5 rounded-full cursor-pointer"
                      />
                      <div className="ml-4">
                        <strong>{step.title}</strong>: {step.description}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>


              <div className="mt-4 space-x-2">
                <label htmlFor="category-wizard" className="block text-sm font-medium text-gray-700">
                  Category
                </label>
                <select
                  id="category"
                  value={newGoal.category}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'create-new') {
                      setIsAddingCategory(true);
                    } else {
                      setIsAddingCategory(false);
                      setNewGoal({ ...newGoal, category: value });
                    }
                  }}
                  className="text-xl"
                >
                  <option value="" disabled>-- Select a category --</option>
                  <option value="create-new">Add a new category</option>
                  {categories.map((category, index) => (
                    <option key={`${category.id}-${index}`} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {isAddingCategory && (
                <div>
                  <label htmlFor="new-category-wizard" className="block text-sm font-medium text-gray-70">
                    Add New Category
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      id="new-category-wizard"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="mt-1 block w-full"
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="btn-ghost text-brand-60 hover:text-brand-80 dark:text-brand-30 dark:hover:text-brand-20 dark:hover:bg-gray-80"
                    >
                      <TagIcon className="w-5 h-5" />
                      <span className="hidden sm:flex flex-row pl-2">Add</span>
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="week_start-wizard" className="block text-sm font-medium text-gray-700">
                  Week Start
                </label>
                <input
                  type="date"
                  id="week_start-wizard"
                  value={newGoal.week_start}
                  onChange={(e) => {
                    const selectedDate = new Date(e.target.value);
                    if (selectedDate.getDay() === 0) {
                      setNewGoal({ ...newGoal, week_start: selectedDate.toISOString().split('T')[0] });
                    } else {
                      const calculatedMonday = getWeekStartDate(selectedDate);
                      setNewGoal({ ...newGoal, week_start: calculatedMonday });
                    }
                  }}
                  className="mt-1 w-full"
                  required
                />
              </div>
              <div className="mt-4 space-x-2">
                <button
                  onClick={handleClose}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="button" onClick={handleGeneratePlan} className="btn-secondary">
                  Regenerate Plan
                </button>
                <button type="button" onClick={goToNextStep} className="btn-primary">
                  Apply Plan
                </button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div>
              <h3 className="text-lg font-medium">Review Selected Steps</h3>
              <ul className="list-disc pl-5 text-xl text-gray-90 dark:text-gray-20">
                {generatedPlan.filter((_, index) => selectedSteps.includes(index)).map((step, index) => (
                  <li className='mt-4' key={index}>
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
                <button type="button" onClick={applyPlan} className="btn-primary">
                  Add Goal(s)
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        // Manual form
        <>
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Title
            </label>
            <input
              type="text"
              id="title"
              value={newGoal.title}
              onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
              className="mt-1 block w-full border-gray-30 focus:border-b-2 focus:ring-0"
              placeholder="Name your goal..."
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            {/* ReactQuill editor for description */}
            {/*
            <ReactQuill
              id="description"
              value={newGoal.description}
              onChange={(value) => setNewGoal({ ...newGoal, description: value })}
              className=""
              placeholder="Describe your goal..."
              theme='bubble'
            />
            */}
            <textarea
              id="description"
              value={newGoal.description}
              onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
              className="w-full border-b-gray-30 shadow-sm focus:border-b-2 focus:border-brand-50 focus:ring-0"
              placeholder="Describe your goal..."
              rows={4}
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Category
            </label>
            <select
              id="category"
              value={newGoal.category}
              onChange={(e) => {
                const value = e.target.value;
                if (value === 'create-new') {
                  setIsAddingCategory(true);
                } else {
                  setIsAddingCategory(false);
                  setNewGoal({ ...newGoal, category: value });
                }
              }}
              className="text-xl"
            >
              <option value="" disabled>-- Select a category --</option>
              <option value="create-new">Add a new category</option>
              {categories.map((category, index) => (
                <option key={`${category.id}-${index}`} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {isAddingCategory && (
            <div>
              <label htmlFor="new-category" className="block text-sm font-medium text-gray-70">
                Add New Category
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  id="new-category"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="mt-1 block w-full"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="btn-ghost text-brand-60 hover:text-brand-80 dark:text-brand-30 dark:hover:text-brand-20 dark:hover:bg-gray-80"
                >
                  <TagIcon className="w-5 h-5" />
                  <span className="hidden sm:flex flex-row pl-2">Add</span>
                </button>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="week_start" className="block text-sm font-medium text-gray-700">
              Week Start
            </label>
            <input
              type="date"
              id="week_start"
              value={newGoal.week_start}
              onChange={(e) => {
                const selectedDate = new Date(e.target.value);
                if (selectedDate.getDay() === 0) {
                  setNewGoal({ ...newGoal, week_start: selectedDate.toISOString().split('T')[0] });
                } else {
                  const calculatedMonday = getWeekStartDate(selectedDate);
                  setNewGoal({ ...newGoal, week_start: calculatedMonday });
                }
              }}
              className="mt-1 w-full"
              required
            />
          </div>

      

          <div className="mt-6 flex justify-end space-x-4">
            <button
              onClick={handleClose}
              className="btn-secondary"
              >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              >
              Add Goal
            </button>

          </div>

          </>
        )}

    </form>
  );
};

export default AddGoal;