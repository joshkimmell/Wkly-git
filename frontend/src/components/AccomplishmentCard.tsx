import React, { useState } from 'react';
import { cardClasses } from '@styles/classes'; // Adjust the import path as necessary
import { TrashIcon, EditIcon } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

interface AccomplishmentCardProps {
  id: string;
  title: string;
  description?: string;
  impact?: string;
//   content: string;
//   type: string;
  created_at: string;
//   week_start: string;
  handleDelete: () => void;
  handleEdit: () => void;
}

const AccomplishmentCard: React.FC<AccomplishmentCardProps> = ({ id, title, description, impact, created_at, handleDelete, handleEdit }) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  return (
    <div className={`${cardClasses} shadow-xl`} key={id}>
        <div className="goal-content flex flex-col mt-2 flex-grow">
            <h3 dangerouslySetInnerHTML={{ __html: title || 'Untitled Goal'}}></h3>
            <p className="text-gray-60 dark:text-gray-40 mt-1">{description ? <span dangerouslySetInnerHTML={{ __html: description }} /> : <span className="text-gray-400">No description provided.</span>}</p>
            <p className="text-sm text-gray-50 dark:text-gray-30">{impact ? <span dangerouslySetInnerHTML={{ __html: `<strong>Impact:</strong> ${impact}` }} /> : <span className="text-gray-400">No impact specified.</span>}</p>
            <p className="hidden"><strong>Created At:</strong> {created_at}</p>
        </div>
        <footer className="mt-2 text-sm text-gray-50 dark:text-gray-30 flex flex-row items-center justify-end space-x-2">
            <button className='btn-ghost' onClick={() => setConfirmOpen(true)}><TrashIcon className='w-5 h-5' /></button>
            <button className='btn-ghost' onClick={handleEdit}><EditIcon className='w-5 h-5' /></button>
        </footer>
        <ConfirmModal
          isOpen={confirmOpen}
          title="Delete accomplishment?"
          message={`Are you sure you want to delete this accomplishment? This action cannot be undone.`}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={async () => { try { setIsDeleting(true); await handleDelete(); } finally { setIsDeleting(false); setConfirmOpen(false); } }}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          loading={isDeleting}
        />
      
      
    </div>
  );
};

// <div key={goal.id} className={`${cardClasses} shadow-xl`}>
//       <div className="flex flex-col flex-grow">
//         <div className='card-content flex flex-col h-full'>
//           <div className="goal-header flex flex-row w-full justify-between items-center">
            
//             <div className="tabs flex flex-row items-center justify-end w-full">
//               <span className="flex flex-col w-auto items-left px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-10 text-brand-90 mt-2">
//                 {goal.category || 'Uncategorized'}
//               </span>
//             </div>
//           </div>
//           <div className="goal-content flex flex-col mt-2 flex-grow">
//             <h4 className="text-lg text-gray-90 dark:text-gray-10 font-medium">{goal.title || 'Untitled Goal'}</h4>
//             <p className="text-gray-60 dark:text-gray-40 mt-1">{goal.description || 'No description provided.'}</p>
            
//           </div>
//         </div>
//         <footer className="mt-2 text-sm text-gray-50 dark:text-gray-30 flex flex-col items-left justify-between">
//           { accomplishments.length > 0 && ( 
//             <button
//               onClick={() => setIsExpanded(!isExpanded)}
//               className="px-0 text-gray-90 dark:text-gray-10 bg-transparent hover:bg-transparent border-none focus-visible:outline-none  flex flex-row items-center justify-between w-full"
//             >
//               <h4 className="text-sm font-semibold text-gray-90 dark:text-gray-10  flex flex-row items-center justify-between w-full">
//               Accomplishments ({accomplishments.length})
//             {isExpanded ? (
//               <ChevronUp className="w-5 h-5" />
//             ) : (
//               <ChevronDown className="w-5 h-5" />
//             )}
//             </h4>
              
//           </button>
//             )} 
            
//             {isExpanded && (
//               <div className="goal-accomplishments mt-4">
//                 {/* <h4 className="text-sm font-semibold text-gray-900">Accomplishments</h4> */}
//                 <ul className="list-none list-inside text-gray-700 mt-2 space-y-1">
//                   {accomplishments.map((accomplishment) => (
//                     <li key={accomplishment.id}>
//                       <h5 className="text-md font-semibold text-gray-80 dark:text-gray-20">
//                         {accomplishment.title}
//                       </h5>
//                       <p className="text-md text-gray-60 dark:text-gray-40">
//                         {accomplishment.description}
//                       </p>
//                       <label className="text-sm text-gray-40 dark:text-gray-50">Impact: {accomplishment.impact}</label>
//                     </li>
//                   ))}
//                 </ul>
//               </div>
//             )}
//             <button
//               // to='#'
//               onClick={() => setIsModalOpen(true)}
//               className="mt-2 btn-ghost w-full border-none text-sm font-semibold text-brand-70 dark:text-brand-20 hover:text-brand-90 dark:hover:text-brand-10"
//               >
//               Add Accomplishment
//             </button>
//             <div className='flex flex-row w-full justify-end'>
//               <button
//                 onClick={() => {
//                   console.log('Deleting Goal ID:', goal.id); // Log the goal ID
//                   handleDelete(goal.id);
//                 }}
//                 className="btn-ghost w-auto"
//                 >
//                 <Trash className="w-5 h-5" />
//               </button>
//               <button
//                 onClick={() => handleEdit(goal.id)}
//                 className="btn-ghost w-auto"
//                 >
//                 <Edit className="w-5 h-5" />
//               </button>
//             </div>
//         </footer>
          
//       {/* Modal */}
//       {isModalOpen && (
//         <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
//           <div className={`${modalClasses}`}>
//             <h3 className="text-lg font-medium text-gray-90 mb-4">Add Accomplishment</h3>
//             <div className="space-y-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-70 dark:text-gray-40">Title</label>
//                 <input
//                   type="text"
//                   value={newAccomplishment.title}
//                   onChange={(e) =>
//                     setNewAccomplishment({ ...newAccomplishment, title: e.target.value })
//                   }
//                   className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-70 dark:text-gray-40">Description</label>
//                 <textarea
//                 value={newAccomplishment.description}
//                 onChange={(e) =>
//                   setNewAccomplishment({ ...newAccomplishment, description: e.target.value })
//                 }
//                 rows={3}
//                 className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
//                 />
//               </div>
//             <div>
//               <label className="block text-sm font-medium text-gray-70 dark:text-gray-40">Impact</label>
//               <input
//               type="text"
//               value={newAccomplishment.impact}
//               onChange={(e) =>
//                 setNewAccomplishment({ ...newAccomplishment, impact: e.target.value })
//               }
//               className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
//               />
//             </div>
//           </div>
//           <div className="mt-6 flex justify-end space-x-4">
//             <button
//             onClick={() => setIsModalOpen(false)}
//             className="btn-secondary"
//             >
//             Cancel
//             </button>
//             <button
//             onClick={handleAddAccomplishment}
//             className="btn-primary"
//             >
//             Add
//             </button>
//           </div>
//         </div>
//       </div>
//       )}
//     </div>
//   </div>

export default AccomplishmentCard;
