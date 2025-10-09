import { modalClasses } from '@styles/classes';
import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Goal } from '@utils/goalUtils'; // Import the addCategory function
import { getWeekStartDate, addCategory, initializeUserCategories, UserCategories } from '@utils/functions';
import { supabase } from '@lib/supabase'; // Import Supabase client
import { TagIcon } from 'lucide-react';


interface GoalEditorProps {
    title: string;
    description: string;
    category: string;
    week_start: string;
    onAddCategory: (newCategory: string) => void;
    onRequestClose: () => void;
    onSave: (updatedDescription: string, updatedTitle: string, updatedCategory: string, updatedWeekStart: string) => Promise<void>; // Updated to include updatedTitle
}

const GoalEditor: React.FC<GoalEditorProps> = ({
    title: initialTitle,
    description: initialDescription,
    category: initialCategory,
    week_start: initialWeekStart,
    onAddCategory,
    onRequestClose,
    onSave,
}) => {
    const [newCategory, setNewCategory] = React.useState('');
    const [isAddingCategory, setIsAddingCategory] = React.useState(false);
    const [localCategories, setLocalCategories] = React.useState<{ id: string; name: string }[]>([]); // Renamed `categories` state to `localCategories` to avoid conflict with the `categories` prop
    const [updatedGoal, setUpdatedGoal] = useState<Goal>({
        title: initialTitle,
        description: initialDescription,
        category: initialCategory,
        week_start: initialWeekStart,
        id: '',
        user_id: '', // Add appropriate default value
        created_at: new Date().toISOString(), // Add appropriate default value
    });
    
    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            await onSave(
                updatedGoal.description,
                updatedGoal.title,
                updatedGoal.category,
                updatedGoal.week_start
            );
            onRequestClose(); // Close the editor after saving
        } catch (error) {
            console.error('Error saving edited goal:', error);
        }
    };
    // const setWeekStart = (date: string) => {
    //     setUpdatedGoal((prevGoal) => ({ ...prevGoal, week_start: date }));
    // };
    // Set the default `week_start` to the current week's Monday
      useEffect(() => {
        if (!updatedGoal.week_start) {
            setUpdatedGoal((prevGoal) => ({ ...prevGoal, week_start: getWeekStartDate() }));
        }
      }, [updatedGoal.week_start, setUpdatedGoal]);

      // Fetch categories on component mount
        useEffect(() => {
          const fetchCategories = async () => {
            await initializeUserCategories();
            setLocalCategories([...UserCategories]); // Ensure categories are set as objects with `id` and `name`
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
              setUpdatedGoal((prevGoal) => ({ ...prevGoal, category: newCategory.trim() }));
              setIsAddingCategory(false); // Hide the "Add new category" section
              onAddCategory(newCategory.trim()); // Call the onAddCategory prop
            } catch (err) {
              console.error('Unexpected error adding category:', err);
              console.log('category added:', newCategory.trim());
            }
          }
        };
    
    const handleFieldChange = (field: keyof Goal, value: string) => {
        setUpdatedGoal((prevGoal) => ({ ...prevGoal, [field]: value })); // Preserve other fields
    };

    return (
        <form onSubmit={handleSave} id="goalEditorForm" className={`${modalClasses} flex flex-col space-y-4`}>
          <div className='flex flex-col'>
            {/* Input for editing the title */}
            {/* <input
                type="text"
                name="title"
                value={updatedGoal.title}
                onChange={(e) => handleFieldChange('title', e.target.value)} // Update title state
                className="w-full p-2 mb-4 border rounded"
                placeholder="Enter goal title"
            /> */}
            <label htmlFor="title" className="block text-sm font-medium text-gray-70">
              Title
            </label>
            {/* ReactQuill editor for editing the content */}
              <ReactQuill
                  id="title"
                  value={updatedGoal.title}
                  onChange={(value) => handleFieldChange('title', value)}
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
            <div className='flex flex-col'>
              <label htmlFor="description" className="block text-sm font-medium text-gray-70">
                Description
              </label>
              {/* ReactQuill editor for editing the content */}
              <ReactQuill
                  id='description'
                  value={updatedGoal.description}
                  theme="bubble"
                  onChange={(value) => handleFieldChange('description', value)} // Update description state
              />
              <input
                  type="hidden"
                  name="goal_id"
                  value={updatedGoal.id} // Pass the goal ID
                  readOnly
              />
            </div>
            <div className='flex flex-col'>
              <label htmlFor="category" className="block text-sm font-medium text-gray-70">
                Category
              </label>
              <select
                id="category"
                value={updatedGoal.category}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'create-new') {
                    setIsAddingCategory(true);
                  } else {
                    setIsAddingCategory(false);
                    setUpdatedGoal((prevGoal) => ({ ...prevGoal, category: value }));
                  }
                }}
                className="mt-1 block w-full rounded-md border-gray-30 shadow-sm focus:border-brand-50 focus:ring-brand-50 sm:text-sm"
              >
                <option value="" disabled>-- Select a category --</option>
                <option value="create-new">Add a new category</option>
                {localCategories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            {isAddingCategory && (
                <div className='flex flex-col'>
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
            <div className='flex flex-col'>
                <label htmlFor="week_start" className="block text-sm font-medium text-gray-700">
                    Week Start
                </label>
                <input
                    type="date"
                    id="week_start"
                    value={updatedGoal.week_start}
                    onChange={(e) => handleFieldChange('week_start', e.target.value)}
                    className="mt-1 block w-full rounded-md"
                    required
                />
            </div>
            <div className="flex justify-end mt-4 space-x-2 text-gray-90 dark:text-gray-10">
                <button className="btn btn-secondary" onClick={onRequestClose} type="button">
                    Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                    Save goal
                </button>
            </div>
        </form>
    );
};

export default GoalEditor;
