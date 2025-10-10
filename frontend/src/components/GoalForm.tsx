import React, { useEffect, useState, useRef } from 'react';
import { getWeekStartDate, fetchCategories } from '@utils/functions'; // Import fetchCategories from functions.ts
import { Goal } from '@utils/goalUtils'; // Import the addCategory function
import supabase from '@lib/supabase'; // Import Supabase client
import LoadingSpinner from '@components/LoadingSpinner';
import { SearchIcon } from 'lucide-react';
import Modal from 'react-modal';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // Import Quill styles

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
  const [categories, setCategories] = React.useState<{ id: string; name: string }[]>([]); // Update state type to match the expected structure
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
  const quillRef = useRef<any>(null);

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
        setGeneratedPlan(data.result);
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
      // console.log('Adding goal:', goal);

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

  // Ensure goal is only added when 'Add Goal(s)' is clicked
  const handleAddGoal = async (event: React.FormEvent) => {
    event.preventDefault(); // Prevent default form submission

    // Ensure a category is selected
    if (!newGoal.category) {
      console.warn('No category selected. Please select a category before adding the goal.');
      setIsCategoryModalOpen(true); // Reopen the category modal if no category is selected
      return;
    }

    // Check if the current step is the final step
    if (showWizard && currentStep !== 3) {
      console.warn('Add Goal(s) button must be clicked to add the goal.');
      return;
    }

    // Fetch the authenticated user's ID
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      console.error('Error fetching user ID:', error?.message || 'User not authenticated');
      return;
    }

    const userId = user.id;

    // Ensure week_start is formatted as YYYY-MM-DD
    if (newGoal.week_start) {
      newGoal.week_start = newGoal.week_start.split('T')[0];
    }

    // Create the goal payload
    const { created_at, id, ...goalToAdd } = {
      ...newGoal,
      user_id: userId, // Include user_id
    };

    // console.log('Adding goal:', goalToAdd);

    // Insert goal into the database
    const { error: insertError } = await supabase.from('goals').insert(goalToAdd);

    if (insertError) {
      console.error('Error adding goal to the database:', insertError.message);
      return;
    }

    // console.log('Goal successfully added:', goalToAdd);

    // Refresh goals and close the form
    refreshGoals();
    handleClose();
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
              <label htmlFor="natural-language-input" className="block text-sm font-medium text-gray-70" >
                Describe your goal
              </label>
              <textarea
                id="natural-language-input"
                value={naturalLanguageInput}
                onChange={(e) => setNaturalLanguageInput(e.target.value)}
                className="mt-1 block w-full h-[20vh] border-b-gray-30 shadow-sm focus:border-b-2 sm:text-lg md:text-xl lg:text-2xl placeholer:gray-50 placeholder:italic"
                placeholder='Describe your goal in a few sentences, e.g. "I want to improve my physical fitness by exercising regularly and eating healthier."'
              />
              <div className="mt-4 space-x-4 w-full justify-end ">
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
            <div className='relative'>
              {isGenerating && (
                <div className="absolute h-full w-full bg-gray-10 dark:bg-gray-90 flex justify-center items-center z-100">
                  <div className="loader"><LoadingSpinner /></div>
                  <span className="ml-2">Generating plan...</span>
                </div>
              )}
              {error && (
                <div className="absolute h-full w-full gap-2 bg-gray-10 dark:bg-gray-90 justify-center items-center">
                  <h2 className='text-lg font-bold'>Error!</h2> 
                  <p className='text-red-500 h-1/2 overflow-auto p-4 mt-4 mb-4 items-start'>{error}</p>
                  <div className="mt-4 space-x-2">
                    <button type="button" onClick={goToPreviousStep} className="btn-secondary">
                      Back
                    </button>
                    <button className='btn-primary' onClick={handleGeneratePlan}>Try regenerating the plan</button>
                  </div>
                </div>
              )}
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


              <div className="mt-4">
                <label htmlFor="category-wizard" className="block text-sm font-medium text-gray-70">
                  Category
                </label>
                <div className="mt-2 mb-4">
                  <button
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

                  {/* Ensure the modal is only rendered when `isCategoryModalOpen` is true */}
                  {isCategoryModalOpen && (
                    <Modal
                      id='category-list'
                      isOpen={isCategoryModalOpen}
                      onRequestClose={() => setIsCategoryModalOpen(false)}
                      className="fixed inset-0 flex items-center justify-center z-50"
                      overlayClassName="fixed inset-0 bg-black bg-opacity-10"
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
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value);
                            const filtered = categories.filter((category) =>
                              category.name.toLowerCase().includes(e.target.value.toLowerCase())
                            );
                            setFilteredCategories(filtered);
                          }}
                          className="w-full text-md p-2 border border-gray-60 focus:outline-none focus:ring-2 focus:ring-brand-50 mb-4 placeholder:gray-50 placeholder:italic"
                          placeholder="Find or create a category"
                        />
                        <ul className="max-h-60 text-gray-80 dark:text-gray-30 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-70">
                          {filteredCategories.map((category) => (
                            <li
                              key={category.id}
                              className="p-2 hover:bg-gray-20 dark:hover:bg-gray-70 cursor-pointer"
                              onClick={() => {
                                setNewGoal({ ...newGoal, category: category.name });
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

                                setNewGoal({ ...newGoal, category: searchTerm.trim() });
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
                  )}
                </div>
              </div>

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
                <button type="button" onClick={goToPreviousStep} className="btn-secondary">
                  Back
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
                <button type="submit" className="btn-primary">
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
            
            <ReactQuill
              ref={quillRef}
              value={newGoal.description}
              onChange={(value) => setNewGoal({ ...newGoal, description: value })}
              theme="snow"
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-30 dark:text-gray-70">
              Category
            </label>
            <div className="relative">
              <button
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

              {/* Ensure the modal is only rendered when `isCategoryModalOpen` is true */}
              {isCategoryModalOpen && (
                <Modal
                  id='category-list'
                  isOpen={isCategoryModalOpen}
                  onRequestClose={() => setIsCategoryModalOpen(false)}
                  className="fixed inset-0 flex items-center justify-center z-50"
                  overlayClassName="fixed inset-0 bg-black bg-opacity-10"
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
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        const filtered = categories.filter((category) =>
                          category.name.toLowerCase().includes(e.target.value.toLowerCase())
                        );
                        setFilteredCategories(filtered);
                      }}
                      className="w-full text-md p-2 border border-gray-60 focus:outline-none focus:ring-2 focus:ring-brand-50 mb-4 placeholder:gray-50 placeholder:italic"
                      placeholder="Find or create a category"
                    />
                    <ul className="max-h-60 text-gray-80 dark:text-gray-30 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-70">
                      {filteredCategories.map((category) => (
                        <li
                          key={category.id}
                          className="p-2 hover:bg-gray-20 dark:hover:bg-gray-70 cursor-pointer"
                          onClick={() => {
                            setNewGoal({ ...newGoal, category: category.name });
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

                            setNewGoal({ ...newGoal, category: searchTerm.trim() });
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
              )}
            </div>
          </div>

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
              type="submit" // Ensure this button submits the form
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