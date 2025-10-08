import React, { useEffect, useState } from 'react';
import { getWeekStartDate, addCategory } from '@utils/functions'; // Removed unused fetchAllGoals
import { Goal } from '@utils/goalUtils'; // Import the addCategory function
import supabase from '@lib/supabase'; // Import Supabase client
import { initializeUserCategories, UserCategories } from '@utils/functions'; // Correct import path
import { TagIcon } from 'lucide-react'; // Removed unused PlusSquare
import ReactQuill from 'react-quill'; // Removed unused Quill
import 'react-quill/dist/quill.bubble.css'; // Import Quill styles

export interface AddGoalProps {
  newGoal: Goal; // Updated to use the full Goal type
  setNewGoal: React.Dispatch<React.SetStateAction<Goal>>; // Updated to match the full Goal type
  // handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleAddGoal: (event: React.FormEvent) => void;
  handleClose: () => void; // Added handleClose prop to allow closing the modal
  categories: string[];
  onAddCategory: (newCategory: string) => void;
  refreshGoals: () => Promise<void>; // Added refreshGoals prop to refresh the goals
}


const AddGoal: React.FC<AddGoalProps> = ({ handleAddGoal, newGoal, setNewGoal, onAddCategory, handleClose, refreshGoals }) => {
  const [newCategory, setNewCategory] = React.useState('');
  const [isAddingCategory, setIsAddingCategory] = React.useState(false);
  const [categories, setCategories] = React.useState<{ id: string; name: string }[]>([]); // Update state type to match the expected structure
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  const [generatedPlan, setGeneratedPlan] = useState<Goal[]>([]);
  const [selectedSteps, setSelectedSteps] = useState<number[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [showWizard, setShowWizard] = useState(true); // State to toggle between wizard and manual form

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
    const fetchCategories = async () => {
      await initializeUserCategories();
      setCategories([...UserCategories]); // Ensure categories are set as objects with `id` and `name`
    };
    fetchCategories();
  }, []); // Fetch categories on component mount

  const handleAddCategory = async () => {
    if (newCategory.trim()) {
      try {
        const { error } = await supabase
          .from('categories')
          .insert({ name: newCategory.trim() });

        if (error) {
          console.error('Error adding category:', error.message);
          return;
        }

        addCategory(newCategory.trim()); // Add to local categories
        setNewGoal((prevGoal) => ({ ...prevGoal, category: newCategory.trim() }));
        setNewCategory(''); // Clear the input field
        setIsAddingCategory(false); // Hide the "Add new category" section
        onAddCategory(newCategory.trim()); // Call the onAddCategory prop

        // Refresh the categories list after adding a new category
        const updatedCategories = await supabase
          .from('categories')
          .select('*');

        if (updatedCategories.error) {
          console.error('Error fetching updated categories:', updatedCategories.error.message);
        } else {
          setCategories(updatedCategories.data || []);
        }
      } catch (err) {
        console.error('Unexpected error adding category:', err);
        console.log('category added:', newCategory.trim());
      }
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
    const currentWeek = new Date().toISOString().split('T')[0];

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
        week_start: currentWeek,
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
              <label htmlFor="natural-language-input" className="block text-sm font-medium text-gray-700">
                Describe your goal
              </label>
              <textarea
                id="natural-language-input"
                value={naturalLanguageInput}
                onChange={(e) => setNaturalLanguageInput(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
              <ul className="list-disc pl-5">
                {generatedPlan.map((step, index) => (
                  <li key={index} className="flex items-start space-x-2 text-gray-90 dark:text-gray-20">
                    <input
                      type="checkbox"
                      checked={selectedSteps.includes(index)}
                      onChange={() => toggleStepSelection(index)}
                      className="mt-1"
                    />
                    <div>
                      <strong>{step.title}</strong>: {step.description} (Category: {step.category})
                    </div>
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
              <ul className="list-disc pl-5 text-gray-90 dark:text-gray-20">
                {generatedPlan.filter((_, index) => selectedSteps.includes(index)).map((step, index) => (
                  <li key={index}>
                    <strong>{step.title}</strong>: {step.description} (Category: {step.category})
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="Name your goal..."
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <ReactQuill
              id="description"
              value={newGoal.description}
              onChange={(value) => setNewGoal({ ...newGoal, description: value })}
              className=""
              placeholder="Describe your goal..."
              theme='bubble'
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
              className="mt-1 block w-full rounded-md border-gray-30 shadow-sm focus:border-brand-50 focus:ring-brand-50 sm:text-sm"
            >
              <option value="" disabled>-- Select a category --</option>
              <option value="create-new">Add a new category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.name}>
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
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
              className="mt-1 block w-full rounded-md"
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