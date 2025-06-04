import { useState, useEffect } from 'react';
import Modal from 'react-modal';
// import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '@lib/supabase'; // Ensure this is the correct path to your Supabase client
import { Goal } from '@utils/goalUtils';
import GoalCard from '@components/GoalCard';
    

Modal.setAppElement('#root');

const AllGoals = () => {
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
  // Removed unused error state

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
      // Optionally log the error or handle it as needed
      console.error(error.message);
    }
  };
  
  // const deleteGoal = async (goalId: string) => {
  //   try {
  //     const { error } = await supabase
  //       .from('goals')
  //       .delete()
  //       .eq('id', goalId);

  //     if (error) {
  //       console.error('Error deleting goal:', error.message);
  //       return;
  //     }

  //     fetchGoals(); // Refresh goals after deleting
  //   } catch (err) {
  //     console.error('Unexpected error deleting goals:', err);
  //   }
  // };

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">All Goals</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Add Goal
        </button>
      </div>

      {/* Filter Input */}
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
};

export default AllGoals;





// function setError(_message: any) {
//   throw new Error('Function not implemented.');
// }
// import React, { useState, useEffect, useCallback } from 'react';
// import Modal from 'react-modal';
// import useAuth from '@hooks/useAuth';
// import supabase from '../../frontend/src/lib/supabase';
// // import { Session } from "@supabase/auth-helpers-react";
// import { Categories, FetchGoalsParams, Goal } from '@utils/goalUtils';
// import { backendUrl, fetchGoals, filterGoalsByWeek, handleSubmit, handleDeleteGoal, handleError } from '@utils/functions';
// import 'react-datepicker/dist/react-datepicker.css';
// import AddGoal from '@components/GoalForm';
// import GoalCard from '@components/GoalCard';
// import { TrashIcon, PlusIcon } from 'lucide-react';
// import debounce from 'lodash.debounce';
// // import { useParams } from 'react-router';
 


// Modal.setAppElement('#root');
// // interface Goal {
// //   id: string;
// //   title: string;
// //   description: string;
// //   category: string;
// //   week_start: string;
// //   user_id: string;
// // }

// const AllGoals = () => {

//   const [goals, setGoals] = useState<Goal[]>([]);
//   const [filteredGoals, setFilteredGoals] = useState<Goal[]>([]);
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [newGoal, setNewGoal] = useState<Omit<Goal, 'id'>>({
//       title: '',
//       description: '',
//       category: 'Technical skills',
//       week_start: '',
//       user_id: '',
//     });
//   const [filter, setFilter] = useState<string>('');
//   const { session } = useAuth(); // Correctly call the useAuth hook
//   const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
//   const [error, setError] = useState<string | null>(null);
//   // const [session, setSession] = useState<Session | null>(null);
//   // const { user } = useAuth(); // Hook call inside a component

//   const resetNewGoal = () => {
//     setNewGoal({
//       title: '',
//       description: '',
//       category: 'Technical skills',
//       week_start: '',
//       user_id: '',
//     });
//   };
  

//   const handleFilterChange = debounce((filterValue: string) => {
//     setFilter(filterValue);
//     if (filterValue) {
//       const filtered = goals.filter((goal) =>
//         goal.title.toLowerCase().includes(filterValue.toLowerCase()) ||
//         goal.category.toLowerCase().includes(filterValue.toLowerCase())
//       );
//     setFilteredGoals(filtered);
//     } else {
//       setFilteredGoals(goals);
//     }
//   }, 300); // Debounce for 300ms

//   const deleteGoal = async (goalId: string) => {
//     await handleDeleteGoal(
//       supabase,
//       goalId,
//       setGoals,
//       // fetchGoals, // Fetch goals again after deletion
//       () => fetchMyGoals(),
//       setError
//     );
//   };
//   const submitGoal = async (e: React.FormEvent) => {
//     await handleSubmit(
//       e,
//       supabase,
//       newGoal,
//       // fetchGoals, // Fetch goals again after submission
//       () => fetchMyGoals(), // Fetch goals again after submission
//       setIsModalOpen,
//       resetNewGoal,
//       setError
//     );
//   };

//   // const fetchMyGoals = useCallback(async () => {
//   //   if(!session?.user?.id) {
//   //     setError("No User Session found");
//   //     return;
//   //     }
   
//   //     // await fetchGoals(useParams(), backendUrl, session, supabase,| setGoals, setFilteredGoals, setError, filter);
//   //   const fetchParams: FetchGoalsParams = {
//   //     backendUrl,
//   //     supabase,
//   //     session,
//   //   };
//   //   await fetchGoals(
//   //     fetchParams, 
//   //     filterGoalsByWeek, 
//   //     setGoals, 
//   //     setFilteredGoals, 
//   //     setError,
//   //   );


//   // }, [backendUrl, session, supabase, setGoals, setFilteredGoals, setError]);

//   const fetchMyGoals = useCallback(async () => {
//     const fetchParams: FetchGoalsParams = {
//       backendUrl,
//       supabase,
//       session,
//     };
//     // Check if session is available
//     if(!session?.user?.id) {
//          setError("No User Session found");
//          return;
//     }
//     try {
//       await fetchGoals(
//           fetchParams,
//           filterGoalsByWeek,
//           setGoals,
//           setFilteredGoals,
//           setError,
//           // { userId: session.user?.id || ''}
//       );
//     } catch (err: any) {
//         handleError(err, setError);
//     }
// }, [session, supabase, setGoals, setFilteredGoals, setError, filter]);

// useEffect(() => {
//   if (session) {
//        fetchMyGoals();
//    }
//   }, [session, fetchMyGoals]);


  
//   return (
//     <div>
//       {error && <p>Error: {error}</p>}
//     <div className="space-y-6">
//       <div className="flex justify-between items-center">
//         <h1 className="text-2xl font-bold text-gray-900">All Goals</h1>
//         <button
//           onClick={() => setIsModalOpen(true)}
//           className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
//         >
//           Add Goal
//         </button>
//       </div>
//       <div className="mt-4">
//         <input
//           type="text"
//           value={filter}
//           onChange={(e) => handleFilterChange(e.target.value)}
//           placeholder="Filter by title or category"
//           className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 md:text-md"
//         />
//       </div>
//       <div>
//         <div className="flex justify-end mb-4">
//           <button
//             onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}
//             className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
//           >
//             {viewMode === 'cards' ? 'Switch to Table View' : 'Switch to Card View'}
//           </button>
//         </div>
//         {viewMode === 'cards' ? (
//           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
//             {filteredGoals.map((goal) => (
//               <GoalCard
//                 key={goal.id}
//                 goal={goal}
//                 onDelete={() => deleteGoal(goal.id)}
//               />
//             ))}
//           </div>
//         ) : (
//           <table className="min-w-full divide-y divide-gray-200">
//             <thead className="bg-gray-50">
//               <tr>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Week Start</th>
//                 <th className="relative px-6 py-3"><span className="sr-only">Delete</span></th>
//               </tr>
//             </thead>
//             <tbody className="bg-white divide-y divide-gray-200">
//               {filteredGoals.map((goal) => (
//                 <tr key={goal.id}>
//                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{goal.title}</td>
//                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{goal.category}</td>
//                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{goal.week_start}</td>
//                   <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
//                     <button
//                       onClick={() => deleteGoal(goal.id)}
//                       className="text-indigo-600 hover:text-indigo-900"
//                     >
//                       <TrashIcon className="w-5 h-5" />
//                     </button>
//                     <button
//                       onClick={() => console.log(`Add goal for goal: ${goal.id}`)}
//                       className="text-indigo-600 hover:text-indigo-900"
//                     >
//                       <PlusIcon className="w-5 h-5" />
//                     </button>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         )}
//       </div>
//       {isModalOpen && (
//         <Modal
//           isOpen={isModalOpen}
//           onRequestClose={() => setIsModalOpen(false)}
//           className="fixed inset-0 flex items-center justify-center z-50"
//           overlayClassName="fixed inset-0 bg-gray-500 bg-opacity-75"
//         >
//           <div className="bg-white rounded-lg shadow-lg p-6 w-96">
//             <h3 className="text-lg font-medium text-gray-900 mb-4">Add Goal</h3>
//             <AddGoal
//               newGoal={newGoal}
//               setNewGoal={setNewGoal}
//               handleSubmit={submitGoal}
//               categories={Categories}
//             />
//           </div>
//         </Modal>
//       )}
//     </div>
//     </div>
//   );
// };
// export default AllGoals;






// // function handleError(err: any, setError: React.Dispatch<React.SetStateAction<string | null>>) {
// //   throw new Error('Function not implemented.');
// // }
// // function useCallback(arg0: () => Promise<void>, arg1: any[]) {
// //   throw new Error('Function not implemented.');
// // }
// // // function useEffect(arg0: () => void, arg1: (Session | (() => Promise<void>) | null)[]) {
// // //   throw new Error('Function not implemented.');
// // // }
// // // import React, { useState, useCallback, useEffect } from 'react';
// // // import Modal from 'react-modal';
// // // import supabase from '../lib/supabase';
// // // import AddGoal, { Categories } from '@/components/GoalForm';
// // // import GoalCard from '@/components/GoalCard';
// // // import { FetchGoalsParams, backendUrl, fetchGoals, handleSubmit, handleDeleteGoal } from '../utils/goalUtils';
// // // import 'react-datepicker/dist/react-datepicker.css';
// // // import { TrashIcon, PlusIcon } from 'lucide-react';
// // // import debounce from 'lodash.debounce';
// // // import { Session } from '@supabase/supabase-js';


// // // Modal.setAppElement('#root');
// // // interface Goal {
// // //   id: string;
// // //   title: string;
// // //   description: string;
// // //   category: string;
// // //   week_start: string;
// // //   user_id: string;
// // // }

// // // const AllGoals = () => {
// // //   const [goals, setGoals] = useState<Goal[]>([]);
// // //   const [filteredGoals, setFilteredGoals]deck= useState<Goal[]>([]);
// // //   const [isModalOpen, setIsModalOpen] = useState(false);
// // //   const [newGoal, setNewGoal] = useState<Omit<Goal, 'id'>>({
// // //     title: '',
// // //     description: '',
// // //     category: 'Technical skills',
// // //     week_start: '',
// // //     user_id: '',
// // //   });
// // //   const [filter, setFilter] = useState<string>('');
// // //   const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
// // //   const [error, setError] = useState<string | null>(null);
// // //   const [session, setSession] = useState<Session | null>(null);


// // //   const resetNewGoal = () => {
// // //     setNewGoal({
// // //       title: '',
// // //       description: '',
// // //       category: 'Technical skills',
// // //       week_start: '',
// // //       user_id: '',
// // //     });
// // //   };
// // //   // ----
// // //   const params: FetchGoalsParams = {
// // //     session: session,
// // //     backendUrl,
// // //     supabase,
// // //     setGoals,
// // //     setFilteredGoals,
// // //     setError,
// // //     filter,
// // //     resetNewGoal,
// // //     setIsModalOpen,
// // //     categories: Categories,
// // //   };
// // //   const fetchData = useCallback(async () => {
// // //     try {
// // //       const session = await supabase.auth.getSession();
// // //       if (!session?.data?.session) {
// // //         throw new Error('User is not authenticated');
// // //       }
// // //       await fetchGoals( 
// // //         goals, // _setGoals, not used in the current logic
// // //         session.data.session, // session
// // //         supabase, // _supabase, not used in the current logic
// // //         setGoals, // setGoals
// // //         filteredGoals, //_setFilteredGoals,
// // //         error, // _setError,
// // //         () => {}, //Placeholder
// // //         filter, // _filter,
// // //         setFilteredGoals, //setFilteredGoals
// // //         setError, //setError,
// // //         { userId: session.data.session.user.id }, // _p0
// // //         params,
// // //       );
// // //     } catch (err) {
// // //       console.error('Error fetching goals:', err);
// // //       setError(err instanceof Error ? err.message : 'An unknown error occurred');
// // //     }
// // //   }, []);


// // //   // -----
// // //   const fetchMyGoals = useCallback(async () => {
// // //       if(!session?.user?.id) {
// // //            setError("No User Session found");
// // //            return;
// // //       }
// // //        const params: FetchGoalsParams = {
// // //            backendUrl,
// // //        };
// // //       await fetchGoals( 
// // //         null, // _setGoalsValue, not used in the current logic
// // //         session,
// // //         supabase,
// // //         setGoals, // setGoals
// // //         setFilteredGoals,
// // //          setError,
// // //         () => {}, // Placeholder for _filterGoalsByWeek
// // //         filter, // _filter
// // //         setFilteredGoals, // setFilteredGoals
// // //          setError,
// // //         { userId: session.user?.id || ''},
// // //         params,
// // //       );

// // //     }, [session, supabase, setGoals, setFilteredGoals, setError, filter]);

  
// // //   useEffect(() => {
// // //     const getSession = async () => {
// // //       const { data: { session: currentSession } } = await supabase.auth.getSession();
// // //       setSession(currentSession)
// // //     };
// // //       getSession();
// // //   }, []);

// // //     useEffect(() => {
// // //        if (session) {
// // //            fetchMyGoals();
// // //        }
// // //     }, [session, fetchMyGoals]);


// // //   // function handleFilterChange(value: string): void {
// // //   //   throw new Error('Function not implemented.');
// // //   // }
// // //   const handleFilterChange = debounce((filterValue: string) => {
// // //     setFilter(filterValue);
// // //     if (filterValue) {
// // //       const filtered = goals.filter((goal) =>
// // //         goal.title.toLowerCase().includes(filterValue.toLowerCase()) ||
// // //         goal.category.toLowerCase().includes(filterValue.toLowerCase())
// // //       );
// // //       setFilteredGoals(filtered);
// // //     } else {
// // //       setFilteredGoals(goals);
// // //     }
// // //   }, 300); // Debounce for 300ms
// // //   const deleteGoal = async (goalId: string) => {
// // //     await handleDeleteGoal(
// // //       supabase,
// // //       goalId,
// // //       setGoals,
// // //       fetchData, // Fetch goals again after deletion
// // //       setError
// // //     );
// // //   };
// // //   const submitGoal = async (e: React.FormEvent) => {
// // //     await handleSubmit(
// // //       e,
// // //       supabase,
// // //       newGoal,
// // //       fetchData, // Fetch goals again after submission
// // //       setIsModalOpen,
// // //       resetNewGoal,
// // //       setError
// // //     );
// // //   };

// // //   return (
// // //     <div>
// // //        {error && <p>Error: {error}</p>}
// // //       {/* Component logic here */}
// // //       <div className="space-y-6">
// // //       <div className="flex justify-between items-center">
// // //         <h1 className="text-2xl font-bold text-gray-900">All Goals</h1>
// // //         <button
// // //           onClick={() => setIsModalOpen(true)}
// // //           className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
// // //         >
// // //           Add Goal
// // //         </button>
// // //       </div>
// // //       <div className="mt-4">
// // //         <input
// // //           type="text"
// // //           value={filter}
// // //           onChange={(e) => handleFilterChange(e.target.value)}
// // //           placeholder="Filter by title or category"
// // //           className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 md:text-md"
// // //         />
// // //       </div>
// // //       <div>
// // //         <div className="flex justify-end mb-4">
// // //           <button
// // //             onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}
// // //             className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
// // //           >
// // //             {viewMode === 'cards' ? 'Switch to Table View' : 'Switch to Card View'}
// // //           </button>
// // //         </div>
// // //         {viewMode === 'cards' ? (
// // //           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
// // //             {filteredGoals.map((goal) => (
// // //               <GoalCard
// // //                 key={goal.id}
// // //                 goal={goal}
// // //                 onDelete={() => deleteGoal(goal.id)}
// // //               />
// // //             ))}
// // //           </div>
// // //         ) : (
// // //           <table className="min-w-full divide-y divide-gray-200">
// // //             <thead className="bg-gray-50">
// // //               <tr>
// // //                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
// // //                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
// // //                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Week Start</th>
// // //                 <th className="relative px-6 py-3"><span className="sr-only">Delete</span></th>
// // //               </tr>
// // //             </thead>
// // //             <tbody className="bg-white divide-y divide-gray-200">
// // //               {filteredGoals.map((goal) => (
// // //                 <tr key={goal.id}>
// // //                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{goal.title}</td>
// // //                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{goal.category}</td>
// // //                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{goal.week_start}</td>
// // //                   <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
// // //                     <button
// // //                       onClick={() => deleteGoal(goal.id)}
// // //                       className="text-indigo-600 hover:text-indigo-900"
// // //                     >
// // //                       <TrashIcon className="w-5 h-5" />
// // //                     </button>
// // //                     <button
// // //                       onClick={() => console.log(`Add goal for goal: ${goal.id}`)}
// // //                       className="text-indigo-600 hover:text-indigo-900"
// // //                     >
// // //                       <PlusIcon className="w-5 h-5" />
// // //                     </button>
// // //                   </td>
// // //                 </tr>
// // //               ))}
// // //             </tbody>
// // //           </table>
// // //         )}
// // //       </div>
// // //       {isModalOpen && (
// // //         <Modal
// // //           isOpen={isModalOpen}
// // //           onRequestClose={() => setIsModalOpen(false)}
// // //           className="fixed inset-0 flex items-center justify-center z-50"
// // //           overlayClassName="fixed inset-0 bg-gray-500 bg-opacity-75"
// // //         >
// // //           <div className="bg-white rounded-lg shadow-lg p-6 w-96">
// // //             <h3 className="text-lg font-medium text-gray-900 mb-4">Add Goal</h3>
// // //             <AddGoal
// // //               newGoal={newGoal}
// // //               setNewGoal={setNewGoal}
// // //               handleSubmit={handleSubmit}
// // //               categories={["Technical skills", "Personal development", "Health and fitness", "Career advancement", "Financial goals", "Relationships and social life", "Hobbies and interests", "Community service and volunteering", "Travel and adventure", "Education and learning"]}
// // //             />
// // //           </div>
// // //         </Modal>
// // //       )}
// // //     </div>
// // //     </div>
// // //   );
// // // };

// // // export default AllGoals;



//   // const params: FetchGoalsParams = {
//   //   session: {
//   //     user: {
//   //       id: '',
//   //     },
//   //     access_token: '',
//   //   },
//   //   backendUrl,
//   //   supabase,
//   //   setGoals,
//   //   setFilteredGoals,
//   //   setError,
//   //   filter,
//   //   resetNewGoal: () => resetNewGoal(),
//   //   setIsModalOpen,
//   //   categories: Categories,
//   // };
//   // const fetchData = useCallback(async () => {
//   //   try {
//   //     const session = await supabase.auth.getSession();
//   //     if (!session?.data?.session) {
//   //       throw new Error('User is not authenticated');
//   //     }
//   //     await fetchGoals( 
//   //       // _setGoalsValue, // replace with actual value
//   //       // --userSession,  // replace with actual value
//   //       // --supabaseClient, // replace with actual value
//   //       // --setGoalsState, // replace with actual value
//   //       // --_setFilteredGoalsValue, // replace with actual value
//   //       // --_setErrorsState, // replace with actual value
//   //       // --filterGoalsByWeekFunction, // replace with actual value
//   //       // --"yourFilterValue", // provide a value for the _filter argument
//   //       // --setFilteredGoalsState, // replace with actual value
//   //       // --setErrorState, // replace with actual value
//   //       // --{ userId: currentUserId }, // replace with actual value
//   //       // fetchParams // replace with actual value
//   //       // ---
//   //       // ---
//   //       null, // _setGoals, not used in the current logic
//   //       session.data.session, //, session
//   //       supabase, // _supabase, not used in the current logic
//   //       setGoals, // setGoals
//   //       filteredGoals, //_setFilteredGoals,
//   //       error, // _setError,
//   //       () => {}, //Placeholder
//   //       filter, // _filter,
//   //       setFilteredGoals, //setFilteredGoals
//   //       setError, //setError,
//   //       { userId: session.data.session.user.id }, // _p0
//   //       params,
//   //     );
//   //     } catch (err) {
//   //       console.error('Error fetching goals:', err);
//   //       setError(err instanceof Error ? err.message : 'An unknown error occurred');
//   //     }
//   //   }, [session, supabase, setGoals, setFilteredGoals, setError, filter]);
  
// // Fetch all goals for the logged-in user
  
// //taken from AllAccomplishments.tsx
// // const fetchGoals = async () => {
// //     try {
// //       const { data: { user } } = await supabase.auth.getUser();
// //       if (!user) {
// //         console.error('User is not authenticated');
// //         return;
// //       }

// //       const { data, error } = await supabase
// //         .from('goals')
// //         .select('*')
// //         .eq('user_id', user.id);

// //       if (error) {
// //         console.error('Error fetching goals:', error.message);
// //         return;
// //       }

// //       setGoals(data || []);
// //       setFilteredGoals(data || []); // Initialize filtered goals
// //     } catch (err) {
// //       console.error('Unexpected error fetching goals:', err);
// //     }
// //   };

// //   React.useEffect(() => {
// //     const getSession = async () => {
// //       const { data: { session: currentSession } } = await supabase.auth.getSession();
// //       setSession(currentSession)
// //     };
// //       getSession();
  
// //     if (session) {
// //         fetchGoals();  
// //     };
// //   }, [session, fetchGoals]);
//  // ... other logic