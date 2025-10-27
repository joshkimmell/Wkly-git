import { modalClasses } from '@styles/classes';
import React, { useState, useEffect, useRef } from 'react';
import { TextField, MenuItem } from '@mui/material';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Goal } from '@utils/goalUtils'; // Import the addCategory function
import { getWeekStartDate, fetchCategories } from '@utils/functions';
import { supabase } from '@lib/supabase'; // Import Supabase client
import { Search as SearchIcon } from 'lucide-react';
// import { TagIcon } from 'lucide-react';
import Modal from 'react-modal';
import { ARIA_HIDE_APP } from '@lib/modal';


interface GoalEditorProps {
    title: string;
    description: string;
    category: string;
    week_start: string;
    onAddCategory: (newCategory: string) => void;
    onRequestClose: () => void;
  onSave: (updatedDescription: string, updatedTitle: string, updatedCategory: string, updatedWeekStart: string, status?: string, status_notes?: string) => Promise<void>; // Updated to include updatedTitle and optional status fields
}

const GoalEditor: React.FC<GoalEditorProps> = ({
    title: initialTitle,
    description: initialDescription,
    category: initialCategory,
    week_start: initialWeekStart,
    // onAddCategory,
    onRequestClose,
    onSave,
}) => {
    // const [newCategory, setNewCategory] = React.useState('');
    // const [isAddingCategory, setIsAddingCategory] = React.useState(false);
    // const [localCategories, setLocalCategories] = React.useState<{ id: string; name: string }[]>([]); // Renamed `categories` state to `localCategories` to avoid conflict with the `categories` prop
    const [categories, setCategories] = React.useState<{ id: string; name: string }[]>([]); // Update state type to match the expected structure
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredCategories, setFilteredCategories] = useState(categories);

    const [updatedGoal, setUpdatedGoal] = useState<Goal>({
        title: initialTitle,
        description: initialDescription,
        category: initialCategory,
        week_start: initialWeekStart,
        id: '',
        user_id: '', // Add appropriate default value
        created_at: new Date().toISOString(), // Add appropriate default value
    status: (undefined as unknown) as any,
    status_notes: '' as any,
    });
    const [tempCategory, setTempCategory] = useState(initialCategory); // Temporary category state
    const quillRef = useRef<ReactQuill | null>(null);

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // console.log('handleSave triggered with updatedGoal:', updatedGoal); // Debug log
        try {
            // Use tempCategory directly to avoid redundant state updates
            await onSave(
                updatedGoal.description,
                updatedGoal.title,
                tempCategory, // Use the temporary category
                updatedGoal.week_start,
                updatedGoal.status ?? undefined,
                updatedGoal.status_notes ?? undefined
            );
            // console.log('onSave successfully called'); // Debug log
            onRequestClose(); // Close the editor only after successful save
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
            setUpdatedGoal((prevGoal) => ({
              ...prevGoal,
              week_start: getWeekStartDate(),
            }));
          }
        }, [updatedGoal.week_start, setUpdatedGoal]);

      // // Fetch categories on component mount
      //   useEffect(() => {
      //     const fetchCategories = async () => {
      //       await initializeUserCategories();
      //       setLocalCategories([...UserCategories]); // Ensure categories are set as objects with `id` and `name`
      //     };
      //     fetchCategories();
      //   }, []); // Fetch categories on component mount
      
      //   const handleAddCategory = async () => {
      //     if (newCategory.trim()) {
      //       try {
      //         const { error } = await supabase
      //           .from('categories')
      //           .insert({ name: newCategory.trim() });
      
      //         if (error) {
      //           console.error('Error adding category:', error.message);
      //           return;
      //         }
      
      //         addCategory(newCategory.trim()); // Add to local categories
      //         setUpdatedGoal((prevGoal) => ({ ...prevGoal, category: newCategory.trim() }));
      //         setIsAddingCategory(false); // Hide the "Add new category" section
      //         onAddCategory(newCategory.trim()); // Call the onAddCategory prop
      //       } catch (err) {
      //         console.error('Unexpected error adding category:', err);
      //         console.log('category added:', newCategory.trim());
      //       }
      //     }
      //   };
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
              // console.log('Fetched UserCategories:', transformedCategories); // Debug log to inspect the structure
            } catch (err) {
              console.error('Error fetching categories:', err);
            }
          };
      
          fetchAndSetCategories();
        }, []); // Fetch categories on component mount
    
    const handleFieldChange = (field: keyof Goal, value: string) => {
        // console.log(`Field change detected: ${field} =`, value); // Debug log
        setUpdatedGoal((prevGoal) => ({ ...prevGoal, [field]: value })); // Preserve other fields
    };

    const handleCategoryModalOpen = () => {
      // console.log('isCategoryModalOpen before click:', isCategoryModalOpen); // Debug log
      if (!isCategoryModalOpen) { // Prevent opening the modal if it's already open
        setSearchTerm('');
        setFilteredCategories(categories);
        setIsCategoryModalOpen(true);
      } else {
        console.warn('Attempted to open modal while it is already open.'); // Warning log
      }
    };
    
    const handleCategorySelection = (categoryName: string) => {
        // console.log('Category selected:', categoryName); // Debug log
        setTempCategory(categoryName); // Update only the temporary category state
        setIsCategoryModalOpen(false); // Close the modal without triggering any save or update actions
    };

    const handleCategoryModalClose = () => {
        // console.log('Closing category modal.'); // Debug log
        setIsCategoryModalOpen(false);
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
            <label htmlFor="title_goal" className="block text-sm font-medium text-gray-70">Title</label>
            <TextField
              id="title_goal"
              value={updatedGoal.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              required
              fullWidth
              className="mt-1"
            />
            {/* ReactQuill editor for editing the content */}
              {/* <ReactQuill
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
              /> */}
            </div>
            <div className='flex flex-col'>
              <label htmlFor="description_goal" className="block text-sm font-medium text-gray-70">
                Description
              </label>
              {/* ReactQuill editor for editing the content */}
              <ReactQuill
                  ref={quillRef}
                  id="description_goal"
                  value={updatedGoal.description}
                  theme="snow"
                  onChange={(value) => handleFieldChange('description', value)} // Update description state
              />
              <input
                  type="hidden"
                  name="goal_id"
                  value={updatedGoal.id} // Pass the goal ID
                  readOnly
              />
            </div>
            <div>
            <label htmlFor="category_goal" className="block text-sm font-medium text-gray-30 dark:text-gray-70">
              Category
            </label>
            <div className="relative">
              <a
                id="category_goal"
                onClick={handleCategoryModalOpen}
                className="btn-ghost text-brand-60 dark:text-brand-20 cursor-pointer flex px-4 py-1 rounded-md w-full text-left items-center justify-between text-xl sm:text-lg md:text-xl lg:text-2xl"
              >
                {tempCategory || '-- Select a category --'}
                <SearchIcon className="w-5 h-5 inline-block ml-2" />
              </a>

              {/* Category selection modal: always-rendered Modal with conditional content */}
              <Modal
                id='category-list'
                isOpen={isCategoryModalOpen}
                onRequestClose={handleCategoryModalClose}
                ariaHideApp={ARIA_HIDE_APP}
                shouldFocusAfterRender={false}
                shouldReturnFocusAfterClose={false}
                className="fixed inset-0 flex items-center justify-center z-[1050]"
                overlayClassName="fixed inset-0 bg-black bg-opacity-30"
                style={{
                  content: {
                    width: 'calc(100% - 8px)',
                    height: '100%',
                    margin: 'auto',
                  },
                }}
              >
                {isCategoryModalOpen && (
                  <div className="p-4 bg-gray-10 dark:bg-gray-90 rounded-lg shadow-lg w-full max-w-md">
                    <h2 className="text-lg font-bold mb-4">Select or Add a Category</h2>
                    <TextField
                      id="category_search"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        const filtered = categories.filter((category) =>
                          category.name.toLowerCase().includes(e.target.value.toLowerCase())
                        );
                        setFilteredCategories(filtered);
                      }}
                      placeholder="Find or create a category"
                      fullWidth
                      className="mb-4"
                    />
                    <ul className="max-h-60 text-gray-80 dark:text-gray-30 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-70">
                      {filteredCategories.map((category) => (
                        <li
                          key={category.id || `category-${category.name}`}
                          className="p-2 hover:bg-gray-20 dark:hover:bg-gray-70 cursor-pointer"
                          onClick={() => {
                            handleCategorySelection(category.name);
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

                            setTempCategory(searchTerm.trim()); // Update temporary category
                            setIsCategoryModalOpen(false); // Close the category modal
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
                      onClick={() => handleCategoryModalClose()}
                      className="btn-secondary mt-4"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </Modal>
            </div>
          </div>
            
          <div className='flex flex-col'>
              <label htmlFor="week_start" className="block text-sm font-medium text-gray-700">
                  Week Start
              </label>
              <TextField
                  type="date"
                  id="week_start"
                  value={updatedGoal.week_start}
                  onChange={(e) => handleFieldChange('week_start', e.target.value)}
                  className="mt-1"
                  fullWidth
                  required
              />
          </div>
          <div>
            <TextField
              id="status"
              select
              label="Status"
              value={updatedGoal.status || 'Not started'}
              onChange={(e) => setUpdatedGoal((prev) => ({ ...prev, status: e.target.value as any }))}
              fullWidth
              className="mt-1"
            >
              <MenuItem value="Not started">Not started</MenuItem>
              <MenuItem value="In progress">In progress</MenuItem>
              <MenuItem value="Blocked">Blocked</MenuItem>
              <MenuItem value="Done">Done</MenuItem>
            </TextField>
          </div>
          <div>
            <TextField
              id="status_notes"
              label="Status notes (optional)"
              value={updatedGoal.status_notes || ''}
              onChange={(e) => setUpdatedGoal((prev) => ({ ...prev, status_notes: e.target.value }))}
              fullWidth
              multiline
              rows={3}
              className="mt-1"
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
