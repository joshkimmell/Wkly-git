import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  CircularProgress,
  Typography,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Box,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Check, X, RefreshCw } from 'lucide-react';
import supabase from '@lib/supabase';
import { notifySuccess, notifyError } from '@components/ToastyNotification';

interface AccessRequest {
  id: string;
  email: string;
  name: string | null;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  notes: string | null;
}

const AdminAccessRequests: React.FC = () => {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        notifyError('Not authenticated');
        return;
      }

      const response = await fetch(`/api/getAccessRequests?status=${statusFilter}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          notifyError('Admin access required');
          return;
        }
        throw new Error('Failed to fetch access requests');
      }

      const data = await response.json();
      setRequests(data);
    } catch (err: any) {
      console.error('Error fetching access requests:', err);
      notifyError(err?.message || 'Failed to load access requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const handleApprove = async (requestId: string, email: string) => {
    setProcessingId(requestId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        notifyError('Not authenticated');
        return;
      }

      const response = await fetch('/api/approveAccessRequest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ requestId }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve access request');
      }

      notifySuccess(`Approved access for ${email}`);
      fetchRequests(); // Refresh the list
    } catch (err: any) {
      console.error('Error approving request:', err);
      notifyError(err?.message || 'Failed to approve request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string, email: string) => {
    if (!confirm(`Are you sure you want to reject the access request from ${email}?`)) {
      return;
    }

    setProcessingId(requestId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        notifyError('Not authenticated');
        return;
      }

      const response = await fetch('/api/rejectAccessRequest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ requestId }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject access request');
      }

      notifySuccess(`Rejected access request from ${email}`);
      fetchRequests(); // Refresh the list
    } catch (err: any) {
      console.error('Error rejecting request:', err);
      notifyError(err?.message || 'Failed to reject request');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusColor = (status: string): "default" | "success" | "error" | "warning" => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Box className="p-6">
      <div className="flex justify-between items-center mb-6">
        <Typography variant="h4">Access Requests</Typography>
        <Tooltip title="Refresh">
          <IconButton onClick={fetchRequests} disabled={loading}>
            <RefreshCw className={loading ? 'animate-spin' : ''} />
          </IconButton>
        </Tooltip>
      </div>

      <div className="flex gap-4 mb-6">
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Status Filter</InputLabel>
          <Select
            value={statusFilter}
            label="Status Filter"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="approved">Approved</MenuItem>
            <MenuItem value="rejected">Rejected</MenuItem>
            <MenuItem value="all">All</MenuItem>
          </Select>
        </FormControl>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <CircularProgress />
        </div>
      ) : requests.length === 0 ? (
        <Paper className="p-8 text-center">
          <Typography variant="body1" color="text.secondary">
            No {statusFilter !== 'all' ? statusFilter : ''} access requests found
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Message</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Requested</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>{request.email}</TableCell>
                  <TableCell>{request.name || '—'}</TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate" title={request.message || ''}>
                      {request.message || '—'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={request.status}
                      color={getStatusColor(request.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{formatDate(request.requested_at)}</TableCell>
                  <TableCell align="right">
                    {request.status === 'pending' && (
                      <div className="flex gap-2 justify-end">
                        <Tooltip title="Approve">
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            onClick={() => handleApprove(request.id, request.email)}
                            disabled={processingId === request.id}
                            startIcon={processingId === request.id ? <CircularProgress size={16} /> : <Check className="w-4 h-4" />}
                          >
                            Approve
                          </Button>
                        </Tooltip>
                        <Tooltip title="Reject">
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            onClick={() => handleReject(request.id, request.email)}
                            disabled={processingId === request.id}
                            startIcon={<X className="w-4 h-4" />}
                          >
                            Reject
                          </Button>
                        </Tooltip>
                      </div>
                    )}
                    {request.status !== 'pending' && (
                      <Typography variant="caption" color="text.secondary">
                        {request.reviewed_at ? formatDate(request.reviewed_at) : '—'}
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default AdminAccessRequests;
