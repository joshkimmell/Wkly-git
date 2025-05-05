import { useEffect, useState } from 'react';
import { useGoalsContext } from '@context/GoalsContext';
import GoalCard from '@components/GoalCard';
import DatePicker from 'react-datepicker';
import Modal from 'react-modal';
import 'react-datepicker/dist/react-datepicker.css';
import { Goal } from '@utils/goalUtils';
import { supabase } from '@lib/supabase';
import { error } from 'console';
import { tr } from 'date-fns/locale';

const WeeklyGoals = () => {

  const [goals, setGoals] = useState<Goal[]>([]);
  const [filteredGoals, setFilteredGoals] = useState<Goal[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGoal, setNewGoal] = useState<Goal>({
    id: '',
    user_id: '',
    title: '',
    description: '',
    category: 'Technical skills',
    week_start: '',
  });
  const [filter, setFilter] = useState<string>(''); // For filtering goals
  const [selectedWeek, setSelectedWeek] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false); // State to track expansion
  const [newAccomplishment, setNewAccomplishment] = useState({
    title: '',
    description: '',
    impact: '',
  });
  const [accomplishments, setAccomplishments] = useState<any[]>([]); // State to hold accomplishments
  const [isAccomplishmentModalOpen, setIsAccomplishmentModalOpen] = useState(false); // State to control the modal for adding accomplishments

  // Fetch all goals for the logged-in user
  const fetchGoals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User is not authenticated');
        return;
      }

      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching goals:', error.message);
        return;
      }

      setGoals(data || []);
      setFilteredGoals(data || []); // Initialize filtered goals
    } catch (err) {
      console.error('Unexpected error fetching goals:', err);
    }
  };

  // Add a new goal
  const handleAddGoal = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User is not authenticated');
        return;
      }

      const { error } = await supabase.from('goals').insert({
        ...newGoal,
        user_id: user.id,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error('Error adding goal:', error.message);
        return;
      }

      fetchGoals(); // Refresh goals after adding
      setIsModalOpen(false);
      setNewGoal({
        id: '', 
        title: '',
        description: '',
        category: 'Technical skills',
        week_start: '',
        user_id: '',
      });
    } catch (err) {
      console.error('Unexpected error adding goal:', err);
    }
  };

  // Delete a goal
  const deleteGoal = async (goalId: string) => {
    try {
      // 1. Delete related accomplishments first
      await supabase
        .from('accomplishments')
        .delete()
        .eq('goal_id', goalId);
  
      // 2. Then, delete the goal
      await supabase
        .from('goals')
        .delete()
        .eq('id', goalId);
  
      // Fetch goals again to update the UI
      await fetchGoals();
  
    } catch (error: any) {
      setError(error.message);
    }
  };

  // Filter goals based on the filter state
  const handleFilterChange = (filterValue: string) => {
    setFilter(filterValue);
    if (filterValue) {
      const filtered = goals.filter((goal) =>
        goal.title.toLowerCase().includes(filterValue.toLowerCase()) ||
        goal.category.toLowerCase().includes(filterValue.toLowerCase()) ||
        goal.description.toLowerCase().includes(filterValue.toLowerCase()) ||
        goal.week_start.toLowerCase().includes(filterValue.toLowerCase())
      );
      setFilteredGoals(filtered);
    } else {
      setFilteredGoals(goals); // Reset to all goals if no filter
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  // function setSelectedWeek(arg0: Date): void {
  //   throw new Error('Function not implemented.');
  // }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Weekly Goals</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Add Goal
        </button>
      </div>

      {/* Filter Input */}
      <DatePicker 
        className='flex mx-auto react-datepicker__input-container react-datepicker__view-calendar-icon w-auto justify-center items-center'
        showIcon
        selected={selectedWeek} 
        allowSameDay={false}
        monthsShown={2}
        // shouldCloseOnSelect={true}
        showTimeSelect={false}
        showTimeInput={false}
        showPreviousMonths={false}
        showMonthYearPicker={false}
        showFullMonthYearPicker={false}
        showTwoColumnMonthYearPicker={false}
        showFourColumnMonthYearPicker={false}
        showYearPicker={false}
        showQuarterYearPicker={false}
        showWeekPicker={false}
        strictParsing={false}
        swapRange={false}
        previousMonthAriaLabel="Previous Month"
        previousMonthButtonLabel="Previous"
        nextMonthAriaLabel="Next Month"
        nextMonthButtonLabel="Next"
        previousYearAriaLabel="Previous Year"
        previousYearButtonLabel="Previous"
        nextYearAriaLabel="Next Year"
        nextYearButtonLabel="Next"
        // timeInputLabel={false}
        enableTabLoop={false}
        // yearItemNumber=""
        focusSelectedMonth={true}
        showPopperArrow={true}
        excludeScrollbar={false}
        calendarStartDay={1}
        toggleCalendarOnIconClick={true}
        usePointerEvent
        onChange={(date) => setSelectedWeek(date || new Date())} 
      />
       {error && <p style={{ color: 'red' }}>{error}</p>}
      <div className="mt-4 h-10">
        <input
          type="text"
          value={filter}
          onChange={(e) => handleFilterChange(e.target.value)}
          placeholder="Filter by title, category, or impact"
          className="block w-full h-10 p-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      {/* Goals List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredGoals.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            handleDelete={deleteGoal}
            handleEdit={() => console.log(`Edit goal: ${goal.id}`)} // Placeholder for edit functionality
          />
        ))}
      </div>

      {/* Add Goal Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onRequestClose={() => setIsModalOpen(false)}
          className="fixed inset-0 flex items-center justify-center z-50"
          overlayClassName="fixed inset-0 bg-gray-500 bg-opacity-75"
        >
          <div className="bg-white rounded-lg shadow-lg p-6 w-96">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add Goal</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  value={newGoal.title}
                  onChange={(e) =>
                    setNewGoal({ ...newGoal, title: e.target.value })
                  }
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={newGoal.description}
                  onChange={(e) =>
                    setNewGoal({ ...newGoal, description: e.target.value })
                  }
                  rows={4}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Week Start</label>
                <input
                  type="date"
                  value={newGoal.week_start}
                  onChange={(e) =>
                    setNewGoal({ ...newGoal, week_start: e.target.value })
                  }
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  value={newGoal.category}
                  onChange={(e) =>
                    setNewGoal({ ...newGoal, category: e.target.value })
                  }
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="Technical skills">Technical skills</option>
                  <option value="Business">Business</option>
                  <option value="Eminence">Eminence</option>
                  <option value="Concepts">Concepts</option>
                  <option value="Community">Community</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                onClick={handleAddGoal}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Add
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
//   const { goals, filteredGoals, setFilteredGoals, filterGoalsByWeek, error } = useGoalsContext();
//   const [selectedWeek, setSelectedWeek] = useState(new Date());

//   useEffect(() => {
//     filterGoalsByWeek(goals, selectedWeek, setFilteredGoals);
//   }, [goals, selectedWeek]);

//   return (
//     <div>
//       <h1>Weekly Goals</h1>
//       <DatePicker selected={selectedWeek} onChange={(date) => setSelectedWeek(date || new Date())} />
//       {error && <p style={{ color: 'red' }}>{error}</p>}
//       <div>
//         {filteredGoals.map((goal) => (
//           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
//           {filteredGoals.map((goal) => (
//             <GoalCard
//               key={goal.id}
//               goal={goal}
//               handleDelete={deleteGoal}
//               handleEdit={() => console.log(`Edit goal: ${goal.id}`)} // Placeholder for edit functionality
//             />
//           ))}
//         </div>
//         ))}
//       </div>
//     </div>
//   );
};

export default WeeklyGoals;

// function setError(_message: any) {
//     throw new Error('Function not implemented.');
//   }
