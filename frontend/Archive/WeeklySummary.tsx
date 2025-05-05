import { useState, useEffect } from 'react';
import { useSession } from '@supabase/auth-helpers-react';
import { groupAccomplishmentsByCategory } from '../src/utils/groupAccomplishmentsByCategory'; // Adjust the import path

// Define the Accomplishment type
export interface Accomplishment {
  id: string;
  title: string;
  description: string;
  category: string;
  impact: string;
  week_start: string;
}

// Define the props interface
interface WeeklySummaryProps {
  goals: any[];
  accomplishments: Accomplishment[];
}

function WeeklySummary({ goals, accomplishments }: WeeklySummaryProps) {
  const session = useSession(); // Get the authenticated user's session
  const [summaries, setSummaries] = useState([]); // State for summaries
  const [newContent, setNewContent] = useState(''); // State for new summary content
  const [editingId, setEditingId] = useState<string | null>(null); // State for editing summary
  const [editingContent, setEditingContent] = useState(''); // State for editing content
  const [error, setError] = useState<string | null>(null); // State for errors

  // Group accomplishments by category
  const groupedAccomplishments = groupAccomplishmentsByCategory(accomplishments);

  // Fetch summaries when the component mounts
  useEffect(() => {
    if (session) {
      fetchSummaries();
    }
  }, [session]);

  // Fetch summaries for the authenticated user
  const fetchSummaries = async () => {
    try {
      const response = await fetch(
        `http://localhost:3001/api/summaries?user_id=${session?.user?.id}`
      );
      if (!response.ok) throw new Error('Failed to fetch summaries');

      const data = await response.json();
      setSummaries(data);
    } catch (error) {
      console.error('Error fetching summaries:', error);
      setError('Failed to fetch summaries.');
    }
  };

  // Create a new summary
  const createSummary = async (summary_text: string) => {
    try {
      const response = await fetch('http://localhost:3001/api/summaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: session?.user?.id,
          summary_text,
        }),
      });

      if (!response.ok) throw new Error('Failed to create summary');

      setNewContent(''); // Clear the input field
      fetchSummaries(); // Refresh summaries after creation
    } catch (error) {
      console.error('Error creating summary:', error);
      setError('Failed to create summary.');
    }
  };

  // Update an existing summary
  const updateSummary = async (summary_id: string, summary_text: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/summaries/${summary_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary_text }),
      });

      if (!response.ok) throw new Error('Failed to update summary');

      setEditingId(null); // Exit editing mode
      fetchSummaries(); // Refresh summaries after update
    } catch (error) {
      console.error('Error updating summary:', error);
      setError('Failed to update summary.');
    }
  };

  // Delete a summary
  const deleteSummary = async (summary_id: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/summaries/${summary_id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete summary');

      fetchSummaries(); // Refresh summaries after deletion
    } catch (error) {
      console.error('Error deleting summary:', error);
      setError('Failed to delete summary.');
    }
  };

  return (
    <div>
      <h1>Weekly Summaries</h1>

      {/* Display Goals */}
      <div>
        <h2>Goals</h2>
        <ul>
          {goals.map((goal, index) => (
            <li key={index}>{goal}</li>
          ))}
        </ul>
      </div>

      {/* Display Grouped Accomplishments */}
      <div>
        <h2>Accomplishments</h2>
        {Object.entries(groupedAccomplishments).map(([category, items]) => (
          <div key={category}>
            <h3>{category}</h3>
            <ul>
              {items.map((accomplishment) => (
                <li key={accomplishment.id}>
                  <strong>{accomplishment.title}</strong>: {accomplishment.description}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Error Message */}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* Create Summary */}
      <div>
        <textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="Write a new summary..."
        />
        <button onClick={() => createSummary(newContent)}>Create Summary</button>
      </div>

      {/* List Summaries */}
      <ul>
        {summaries.map((summary: any) => (
          <li key={summary.summary_id}>
            {editingId === summary.summary_id ? (
              <>
                <textarea
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                />
                <button onClick={() => updateSummary(summary.summary_id, editingContent)}>
                  Save
                </button>
                <button onClick={() => setEditingId(null)}>Cancel</button>
              </>
            ) : (
              <>
                <p>{summary.content}</p>
                <button
                  onClick={() => {
                    setEditingId(summary.summary_id);
                    setEditingContent(summary.summary_text);
                  }}
                >
                  Edit
                </button>
                <button onClick={() => deleteSummary(summary.summary_id)}>Delete</button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default WeeklySummary;
