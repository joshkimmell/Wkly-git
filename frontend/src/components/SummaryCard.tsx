import React, { useState } from 'react';
// import ReactMarkdown, { MarkdownAsync } from 'react-markdown'; // Import react-markdown
// import supabase from '../../frontend/src/lib/supabase'; // Ensure this is the correct path to your Supabase client
import { applyHighlight } from '@utils/functions';
import { Summary } from '@utils/goalUtils'; // Adjust the import path as necessary
import { Trash, Edit, Copy, ChevronUp, ChevronDown } from 'lucide-react';
import { cardClasses, summaryClasses } from '@styles/classes';
import { Tooltip, IconButton, Chip, Button } from '@mui/material';
import { notifySuccess, notifyError } from '@components/ToastyNotification';
interface SummaryCardProps {
  id: Summary["id"]; // Corrected type to inherit summary_id
  className?: string; // Optional className prop
  scope?: 'week' | 'month' | 'year'; // Optional property for scope
  week_start?: string; // Optional property for week start
  formattedRange?: string; // Optional property for formatted range
  title: Summary["title"]; // Optional title property
  content: Summary["content"];
  type: Summary["type"];
  format: 'card' | 'content'; // Added type property with specific string literals
  selectable?: boolean;
  isSelected?: boolean;
  onToggleSelect: (id: string) => void;
  handleDelete: (id: string) => void; // Corrected type
  handleEdit: (openEditor: any) => void;
  created_at?: string; // Optional property for created date
}

// const GoalCard: React.FC<GoalCardProps> = ({ goal }) => {
const SummaryCard: React.FC<SummaryCardProps> = ({ 
  id, 
  // scope, 
  title, 
  content, 
  format, 
  type,
  handleDelete, 
  handleEdit, 
  selectable = true,
  isSelected = false,
  onToggleSelect,
}) => {
  // const handleDeleteSummary = (summaryId: string) => {
  //   // Implement the delete logic here
    // console.log(`Deleting goal with ID: ${goal.id}`);
  // };

  // const handleEdit = () => {
  //   // Implement the edit logic here
    // console.log('Editing goal');
  // };
  // const [summaries, setSummaries] = useState<Summary[]>([]);
  // const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); // State to track expansion
  const [filter, setFilter] = useState<string>('');
  
  // accomplishment creation now handled via AccomplishmentsModal onCreate (optimistic updates)
  
     // Use shared HTML-producing highlight helper and render via dangerouslySetInnerHTML
        const renderHTML = (text?: string | null) => ({ __html: applyHighlight(text ?? '', filter) });

  function handleCopy(content: string): void {
    if (navigator && navigator.clipboard) {
      navigator.clipboard.writeText(content).then(
        () => {
          // Optionally, show a success message or toast here
          console.log('Copied!');
          notifySuccess('Content copied to clipboard!'); 
          
        },
        () => {
          notifyError('Error copying content to clipboard'); // Show error if copy fails
          // Optionally, handle error (e.g., show an error message)
        }
      );
    }
  }
  
  return (
    // <>
    
      <div 
        key={id} 
        data-selectable={selectable}
        className=
        
        {`
          ${format === 'content' ? summaryClasses : cardClasses} 
        
        ${!isSelected ? 'bg-gray-10 dark:bg-gray-80 rounded shadow-md hover:shadow-lg border-2 border-transparent hover:border-gray-20 dark:hover:border-gray-70' : 'border-2 border-brand-50 hover:border-brand-50 bg-gray-20 dark:bg-brand-90' } 
        
          transition-shadow shadow-xl flex flex-col text-left w-full space-y-4 mt-4 relative py-2 min-w-1/2 max-w-full`}
        onClick={(e) => {
          // If the click originated from an interactive element (button, input, link, select, textarea,
          // or any element with role="button"), don't treat it as a card-select click. This prevents
          // clicks on internal controls (icons, buttons, menus) from toggling selection.
          const target = e.target as HTMLElement | null;
          if (target && typeof target.closest === 'function') {
            const interactive = target.closest('button, a, input, select, textarea, [role="button"]');
            if (interactive) return;
          }
          onToggleSelect?.(id)
          // console.log(`Card clicked: ${isSelected}, toggling ${id}.`);
        }}
      >
        <div className={`flex flex-row w-full items-start justify-between gap-4 align-top`}>  
          <h4 className="w-full text-lg font-bold text-gray-90" dangerouslySetInnerHTML={{ __html: title }}></h4>
          <div className="flex flex-row justify-between">
            <Chip
              label={type}                
              variant='outlined'
              className="card-status cursor-pointer"
            />
            {/* <span dangerouslySetInnerHTML={{ __html: type }} className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-10 text-brand-100 mt-2" /> */}
          </div>
        </div>
        
        <div className='flex flex-col flex-grow text-left justify-start w-full'>
          {format === 'card' ? (
            <>

              {content.length != 0 ? (
                !isExpanded ? (
                  <div
                    className="pt-2"
                    dangerouslySetInnerHTML={{ __html: content.substring(0, 240) + (content.length > 240 ? '...' : '') }}
                  />
                ) : (
                  <div className="pt-2"><span dangerouslySetInnerHTML={renderHTML(content)} /></div>
                )
              ) : (
                null
              )}

              {content.length >= 240 && (
                <Button
                  onClick={() => setIsExpanded((s) => !s)}
                  variant='outlined'
                  // // className="mt-64 btn-ghost text-start items-start justify-start w-auto shadow-0 p-0"
                  sx={
                    { marginTop: 2, textTransform: 'none' }
                  }
                >
                  {isExpanded ? (
                    <span className="text-xs text-brand-60 dark:text-brand-20">Show Less <ChevronUp className="w-3 h-3 inline-block ml-1" /></span>
                  ) : (
                    <span className="text-xs text-brand-60 dark:text-brand-20">Show More <ChevronDown className="w-3 h-3 inline-block ml-1" /></span>
                  )}
                </Button>
              )}
            </>
          ) : (
            <div className='flex flex-col text-left'>
              <span dangerouslySetInnerHTML={{ __html: content }} />
            </div>
          )}
        </div>
          

          {/* <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="btn-summary flex flex-row items-center justify-between w-full rounded-lg p-4"
              type="button"   
            >
              {!isExpanded ? (
                <div className='flex flex-col text-left'
                  dangerouslySetInnerHTML={{ __html: content.substring(0, 200) + (content.length > 200 ? '...' : '') }}
                />
                ) : (
                <div 
                  className='flex flex-col text-left'
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              )}
            </button> */}
        
        <footer className="mt-4 flex justify-end items-end w-full space-x-2">
          <Tooltip title="Copy" placement="top" arrow>
            <span>
              <IconButton aria-label="Copy" onClick={() => handleCopy(content)} size="small" className="btn-ghost">
                <Copy className='w-4 h-4' />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title="Edit" placement="top" arrow>
            <span>
              <IconButton aria-label="Edit" onClick={() => handleEdit(true)} size="small" className="btn-ghost">
                <Edit className='w-4 h-4' />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title="Delete" placement="top" arrow>
            <span>
              <IconButton aria-label="Delete" onClick={() => handleDelete(id)} size="small" className="btn-ghost">
                <Trash className='w-4 h-4' />
              </IconButton>
            </span>
          </Tooltip>
        </footer>
      </div>
    // </>
  );
};  
      
      export default SummaryCard;