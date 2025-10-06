import React, { useEffect } from 'react';
import { getWeekStartDate, addCategory, /*setGoals, fetchCategories*/ } from '@utils/functions'; // Adjust the import path as necessary
import { Goal } from '@utils/goalUtils'; // Import the addCategory function
import supabase from '@lib/supabase'; // Import Supabase client
import { initializeUserCategories, UserCategories } from '@utils/functions'; // Correct import path
import { PlusSquare, TagIcon } from 'lucide-react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.bubble.css'; // Import Quill styles
import { has } from 'lodash';

export interface AddGoalProps {
  newGoal: Goal; // Updated to use the full Goal type
  setNewGoal: React.Dispatch<React.SetStateAction<Goal>>; // Updated to match the full Goal type
  // handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleAddGoal: (event: React.FormEvent) => void;
  handleClose: () => void; // Added handleClose prop to allow closing the modal
  categories: string[];
  onAddCategory: (newCategory: string) => void;
}


const AddGoal: React.FC<AddGoalProps> = ({ handleAddGoal, newGoal, setNewGoal, onAddCategory, handleClose }) => {
  const [newCategory, setNewCategory] = React.useState('');
  const [isAddingCategory, setIsAddingCategory] = React.useState(false);
  const [categories, setCategories] = React.useState<{ id: string; name: string }[]>([]); // Update state type to match the expected structure

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
      } catch (err) {
        console.error('Unexpected error adding category:', err);
        console.log('category added:', newCategory.trim());
      }
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
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Title
        </label>
        {/* <input
          type="text"
          id="title"
          autoFocus
          value={newGoal.title}
          onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-30 shadow-sm focus:border-brand-50 focus:ring-brand-50 sm:text-sm"
          required
        /> */}
        {/* ReactQuill editor for editing the content */}
          <ReactQuill
              id="title"
              value={newGoal.title}
              onChange={(value) => setNewGoal({ ...newGoal, title: value })}
              className="quill-editor h1"
              // formats={['bold', 'italic', 'underline', 'strike','header']}
              placeholder="Name your goal..."
              defaultValue="<h1></h1>"
              theme="bubble"
              // modules={{
              //   toolbar: [
              //     [{ header: [1, 2, false] }], // Header options
              //     ['bold', 'italic', 'underline', 'strike'], // Text formatting
              //   ],
              // }}
          />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        {/* <textarea
          id="description"
          value={newGoal.description}
          onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-30 shadow-sm focus:border-brand-50 focus:ring-brand-50 sm:text-sm"
        /> */}
        {/* ReactQuill editor for editing the content */}
          <ReactQuill
              id="description"
              value={newGoal.description}
              onChange={(value) => setNewGoal({ ...newGoal, description: value })}
              className=""
              placeholder="Describe your goal..."
              // theme="snow"
              theme="bubble" // Uncomment if you want a different theme
              // modules={modules} // Uncomment if you have specific modules to pass
              // formats={formats} // Uncomment if you have specific formats to pass

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
              {/* Add category */}
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
              // console.log(`Selected date: ${selectedDate.toISOString().split('T')[0]}`);

              // Check if the selected date is already a Monday
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
            // onClick={() => handleAddGoal()}
            className="btn-primary"
         >
            Add goal
        </button>
      </div>

    </form>
  );
};

export default AddGoal;