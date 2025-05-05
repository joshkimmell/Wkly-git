import React, { useEffect } from 'react';

export const Categories = [
  'Technical skills',
  'Business',
  'Eminence',
  'Concepts',
  'Community'
] as Array<string>;

export interface Goal {
  id: string; // Ensure this matches the primary key in your Supabase table
  title: string;
  description: string;
  category: string;
  week_start: string; // Ensure this matches the `week_start` column in your table
  user_id: string; // Ensure this matches the `user_id` column in your table
}

export interface AddGoalProps {
  newGoal: Omit<Goal, 'id'>;
  setNewGoal: React.Dispatch<React.SetStateAction<Omit<Goal, 'id'>>>;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  categories: string[];
}

const AddGoal: React.FC<AddGoalProps> = ({ newGoal, setNewGoal, handleSubmit, categories }) => {
  // Set the default `week_start` to the current week's Monday
  useEffect(() => {
    const getCurrentWeekStart = () => {
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 (Sunday) to 6 (Saturday)
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust to Monday
      const monday = new Date(now.setDate(diff));
      return monday.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    };

    if (!newGoal.week_start) {
      setNewGoal((prevGoal) => ({
        ...prevGoal,
        week_start: getCurrentWeekStart(),
      }));
    }
  }, [newGoal.week_start, setNewGoal]);


  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          required
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          value={newGoal.description}
          onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700">
          Category
        </label>
        <select
          id="category"
          value={newGoal.category}
          onChange={(e) => setNewGoal({ ...newGoal, category: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="week_start" className="block text-sm font-medium text-gray-700">
          Week Start
        </label>
        <input
          type="date"
          id="week_start"
          value={newGoal.week_start}
          onChange={(e) => setNewGoal({ ...newGoal, week_start: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      <button
        type="submit"
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Add Goal
      </button>
    </form>
  );
};

export default AddGoal;