import React, { useState } from 'react';
import { TextField, Button } from '@mui/material';
import { notifySuccess, notifyError } from '@components/ToastyNotification';

interface RequestAccessProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const RequestAccess: React.FC<RequestAccessProps> = ({ onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidEmail = (value: string) => {
    if (!value) return false;
    const re = /^(?:[a-zA-Z0-9_'^&+\/=`{|}~.-])+@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
    return re.test(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/requestAccess', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          name: name.trim() || null,
          message: message.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setError('You have already requested access. We\'ll contact you at ' + email);
          return;
        }
        throw new Error(data.error || 'Failed to submit access request');
      }

      notifySuccess('Access request submitted! We\'ll review your request and contact you at ' + email);
      
      // Clear form
      setEmail('');
      setName('');
      setMessage('');
      
      if (onSuccess) {
        onSuccess();
      } else {
        // Close modal after short delay
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      console.error('Error submitting access request:', err);
      const errorMsg = err?.message || 'Failed to submit access request. Please try again.';
      setError(errorMsg);
      notifyError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-2">Request Access to Wkly</h2>
      <p className="text-gray-50 mb-6">
        Wkly is currently invite-only. Submit your request below and we'll review it shortly.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField
          label="Email *"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          required
          fullWidth
          size="small"
          error={!!error && !isValidEmail(email)}
          helperText={error && !isValidEmail(email) ? 'Please enter a valid email' : ''}
          disabled={loading}
        />

        <TextField
          label="Name (Optional)"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          size="small"
          disabled={loading}
        />

        <TextField
          label="Why would you like to use Wkly? (Optional)"
          multiline
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          fullWidth
          size="small"
          disabled={loading}
          placeholder="Tell us a bit about your goals or how you plan to use Wkly..."
        />

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3 justify-end mt-2">
          <Button
            type="button"
            variant="outlined"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !email}
            className="btn-primary"
          >
            {loading ? 'Submitting...' : 'Submit Request'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default RequestAccess;
