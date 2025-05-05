import { useState, useEffect } from 'react';
import { supabase } from '../src/lib/supabase';
import { startOfWeek } from 'date-fns';

interface Goal {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'Not started' | 'In progress' | 'Done';
}

interface Accomplishment {
  title: string;
  description: string;
  impact: string;
  category: string;
  goal_id?: string;
}

export default function WeeklyReview() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [accomplishments, setAccomplishments] = useState<Accomplishment[]>([]);
  const [newAccomplishment, setNewAccomplishment] = useState<Accomplishment>({
    title: '',
    description: '',
    impact: '',
    category: 'Technical skills'
  });

  useEffect(() => {
    fetchWeeklyGoals();
  }, []);

  const fetchWeeklyGoals = async () => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('week_start', weekStart.toISOString());

    if (error) {
      console.error('Error fetching goals:', error);
    } else {
      setGoals(data || []);
    }
  };

  const updateGoalStatus = async (goalId: string, status: Goal['status']) => {
    try {
      const { error } = await supabase
        .from('goals')
        .update({ status })
        .eq('id', goalId);

      if (error) throw error;

      setGoals(goals.map(goal => 
        goal.id === goalId ? { ...goal, status } : goal
      ));
    } catch (error) {
      console.error('Error updating goal status:', error);
    }
  };

  const addAccomplishment = async (goalId?: string) => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    
    try {
      const { error } = await supabase
        .from('accomplishments')
        .insert({
          ...newAccomplishment,
          goal_id: goalId,
          week_start: weekStart.toISOString()
        });

      if (error) throw error;

      setAccomplishments([...accomplishments, { ...newAccomplishment, goal_id: goalId }]);
      setNewAccomplishment({
        title: '',
        description: '',
        impact: '',
        category: 'Technical skills'
      });
    } catch (error) {
      console.error('Error adding accomplishment:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Weekly Review</h2>
        
        <div className="space-y-6">
          {goals.map((goal) => (
            <div key={goal.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{goal.title}</h3>
                  <p className="text-gray-600 mt-1">{goal.description}</p>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 mt-2">
                    {goal.category}
                  </span>
                </div>
                <select
                  value={goal.status}
                  onChange={(e) => updateGoalStatus(goal.id, e.target.value as Goal['status'])}
                  className="ml-4 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="Not started">Not started</option>
                  <option value="In progress">In progress</option>
                  <option value="Done">Done</option>
                </select>
              </div>

              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700">Add Accomplishment</h4>
                <div className="mt-2 space-y-4">
                  <input
                    type="text"
                    placeholder="Title"
                    value={newAccomplishment.title}
                    onChange={(e) => setNewAccomplishment({ ...newAccomplishment, title: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                  <textarea
                    placeholder="Description"
                    value={newAccomplishment.description}
                    onChange={(e) => setNewAccomplishment({ ...newAccomplishment, description: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                  <textarea
                    placeholder="Impact"
                    value={newAccomplishment.impact}
                    onChange={(e) => setNewAccomplishment({ ...newAccomplishment, impact: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                  <button
                    onClick={() => addAccomplishment(goal.id)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Add Accomplishment
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Additional Accomplishments</h3>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Title"
            value={newAccomplishment.title}
            onChange={(e) => setNewAccomplishment({ ...newAccomplishment, title: e.target.value })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          <textarea
            placeholder="Description"
            value={newAccomplishment.description}
            onChange={(e) => setNewAccomplishment({ ...newAccomplishment, description: e.target.value })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          <textarea
            placeholder="Impact"
            value={newAccomplishment.impact}
            onChange={(e) => setNewAccomplishment({ ...newAccomplishment, impact: e.target.value })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          <select
            value={newAccomplishment.category}
            onChange={(e) => setNewAccomplishment({ ...newAccomplishment, category: e.target.value })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="Technical skills">Technical skills</option>
            <option value="Business">Business</option>
            <option value="Eminence">Eminence</option>
            <option value="Concepts">Concepts</option>
            <option value="Community">Community</option>
          </select>
          <button
            onClick={() => addAccomplishment()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Add Additional Accomplishment
          </button>
        </div>
      </div>
    </div>
  );
}