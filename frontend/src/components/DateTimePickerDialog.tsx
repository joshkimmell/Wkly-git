import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, FormControlLabel, Switch, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { DatePicker, TimePicker, DateTimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { Bell } from 'lucide-react';
import { useTimezone } from '@context/TimezoneContext';
import { convertToUTC, utcToDatetimeLocal } from '@utils/timezone';

interface DateTimePickerDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (date: string | null, time: string | null, reminderEnabled?: boolean, reminderDatetime?: string | null) => void;
    initialDate?: string | null;
    initialTime?: string | null;
    initialReminderEnabled?: boolean;
    initialReminderDatetime?: string | null;
    title?: string;
}

const DateTimePickerDialog: React.FC<DateTimePickerDialogProps> = ({
    open,
    onClose,
    onSave,
    initialDate,
    initialTime,
    initialReminderEnabled,
    initialReminderDatetime,
    title = 'Set Date & Time'
}) => {
    const { timezone } = useTimezone();
    const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
    const [selectedTime, setSelectedTime] = useState<Dayjs | null>(null);
    const [reminderEnabled, setReminderEnabled] = useState(false);
    const [reminderOffset, setReminderOffset] = useState<string>('30');
    const [reminderDatetime, setReminderDatetime] = useState<string>('');
    const [selectedReminderDatetime, setSelectedReminderDatetime] = useState<Dayjs | null>(null);

    // Initialize with existing values when dialog opens
    useEffect(() => {
        if (open) {
            if (initialDate) {
                setSelectedDate(dayjs(initialDate));
            } else {
                setSelectedDate(dayjs());
            }
            
            if (initialTime) {
                setSelectedTime(dayjs(`2000-01-01T${initialTime}`));
            } else {
                setSelectedTime(null);
            }
            
            // Initialize reminder state
            setReminderEnabled(initialReminderEnabled || false);
            if (initialReminderDatetime && initialDate && initialTime) {
                const rem = new Date(initialReminderDatetime).getTime();
                const sched = new Date(`${initialDate}T${initialTime}`).getTime();
                const diffMin = Math.round((sched - rem) / 60000);
                const presets = [0, 15, 30, 60, 1440];
                const match = presets.find((p) => p === diffMin);
                if (match !== undefined) {
                    setReminderOffset(String(match));
                    setReminderDatetime('');
                    setSelectedReminderDatetime(null);
                } else {
                    setReminderOffset('custom');
                    // Convert UTC to user's timezone for display
                    const localStr = utcToDatetimeLocal(initialReminderDatetime, timezone);
                    setReminderDatetime(localStr);
                    setSelectedReminderDatetime(dayjs(localStr));
                }
            } else if (initialReminderDatetime) {
                setReminderOffset('custom');
                // Convert UTC to user's timezone for display
                const localStr = utcToDatetimeLocal(initialReminderDatetime, timezone);
                setReminderDatetime(localStr);
                setSelectedReminderDatetime(dayjs(localStr));
            } else {
                setReminderOffset('30');
                setReminderDatetime('');
                setSelectedReminderDatetime(null);
            }
        }
    }, [open, initialDate, initialTime, initialReminderEnabled, initialReminderDatetime, timezone]);

    const handleSave = () => {
        const dateStr = selectedDate ? selectedDate.format('YYYY-MM-DD') : null;
        const timeStr = selectedTime ? selectedTime.format('HH:mm') : null;
        
        // Compute reminder datetime in UTC
        let computedReminderDatetime: string | null = null;
        let finalReminderEnabled = reminderEnabled;
        
        if (reminderEnabled) {
            try {
                if (reminderOffset === 'custom') {
                    // Convert from user's timezone to UTC
                    computedReminderDatetime = reminderDatetime
                        ? new Date(reminderDatetime).toISOString()
                        : null;
                } else if (dateStr && timeStr) {
                    // Create scheduled datetime in user's timezone, then convert to UTC
                    const scheduledUTC = convertToUTC(dateStr, timeStr, timezone);
                    const scheduledDate = new Date(scheduledUTC);
                    // Subtract the offset
                    scheduledDate.setMinutes(scheduledDate.getMinutes() - Number(reminderOffset));
                    computedReminderDatetime = scheduledDate.toISOString();
                } else if (reminderDatetime) {
                    computedReminderDatetime = new Date(reminderDatetime).toISOString();
                }
            } catch (error) {
                console.error('Failed to compute reminder datetime:', error);
                computedReminderDatetime = null;
            }
            
            // If reminder is enabled but we couldn't compute a datetime, disable it
            if (!computedReminderDatetime) {
                finalReminderEnabled = false;
            }
        }
        
        onSave(dateStr, timeStr, finalReminderEnabled, computedReminderDatetime);
        onClose();
    };

    const handleUnschedule = () => {
        onSave(null, null, false, null);
        onClose();
    };

    const handleCancel = () => {
        onClose();
    };
    
    // Derive a human-readable preview of when the alert will fire (in user's timezone)
    const computedAlertPreview = useMemo(() => {
        if (!reminderEnabled) return '';
        const dateStr = selectedDate?.format('YYYY-MM-DD');
        const timeStr = selectedTime?.format('HH:mm');
        if (reminderOffset === 'custom' || !dateStr || !timeStr) {
            if (!reminderDatetime) return '';
            try {
                // The datetime-local input is already in user's timezone
                return new Date(reminderDatetime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
            } catch {
                return '';
            }
        }
        try {
            // Scheduled time is in user's timezone
            const scheduledUTC = convertToUTC(dateStr, timeStr, timezone);
            const scheduledDate = new Date(scheduledUTC);
            scheduledDate.setMinutes(scheduledDate.getMinutes() - Number(reminderOffset));
            return scheduledDate.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
        } catch (error) {
            console.warn('Failed to compute alert preview:', error);
            return '';
        }
    }, [reminderEnabled, reminderOffset, selectedDate, selectedTime, reminderDatetime, timezone]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <div className="flex flex-col space-y-4 mt-2">
                        <DatePicker
                            label="Date"
                            value={selectedDate}
                            onChange={(newValue) => setSelectedDate(newValue)}
                            slotProps={{
                                textField: { fullWidth: true }
                            }}
                        />
                        <TimePicker
                            label="Time (optional)"
                            value={selectedTime}
                            onChange={(newValue) => setSelectedTime(newValue)}
                            slotProps={{
                                textField: { fullWidth: true }
                            }}
                        />
                        
                        {/* Alert / Reminder */}
                        <div className="border border-gray-20 dark:border-gray-70 rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Bell className="w-4 h-4" />
                                    <label className="text-sm font-semibold">Alert</label>
                                </div>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={reminderEnabled}
                                            onChange={(e) => setReminderEnabled(e.target.checked)}
                                            size="small"
                                        />
                                    }
                                    label={reminderEnabled ? 'On' : 'Off'}
                                    labelPlacement="start"
                                    sx={{ marginLeft: 0 }}
                                />
                            </div>

                            {reminderEnabled && (
                                <div className="space-y-2 gap-2">
                                    {selectedDate && selectedTime ? (
                                        <FormControl fullWidth size="small">
                                            <InputLabel>Alert time</InputLabel>
                                            <Select
                                                value={reminderOffset}
                                                onChange={(e) => setReminderOffset(e.target.value)}
                                                label="Alert time"
                                            >
                                                <MenuItem value="0">At time of task</MenuItem>
                                                <MenuItem value="15">15 minutes before</MenuItem>
                                                <MenuItem value="30">30 minutes before</MenuItem>
                                                <MenuItem value="60">1 hour before</MenuItem>
                                                <MenuItem value="1440">1 day before</MenuItem>
                                                <MenuItem value="custom">Custom time</MenuItem>
                                            </Select>
                                        </FormControl>
                                    ) : (
                                        <p className="text-xs text-secondary-text">Set a scheduled date &amp; time above to use relative alerts, or pick a custom time.</p>
                                    )}

                                    {(reminderOffset === 'custom' || !selectedDate || !selectedTime) && (
                                        <DateTimePicker
                                            label="Custom alert date &amp; time"
                                            value={selectedReminderDatetime}
                                            onChange={(newValue) => {
                                                setSelectedReminderDatetime(newValue);
                                                setReminderDatetime(newValue ? newValue.format('YYYY-MM-DDTHH:mm') : '');
                                            }}
                                            slotProps={{ textField: { size: 'small', fullWidth: true } }}
                                        />
                                    )}

                                    {computedAlertPreview && (
                                        <p className="text-xs text-brand-60 dark:text-brand-30">
                                            Alert at: {computedAlertPreview}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </LocalizationProvider>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleCancel} color="inherit">
                    Cancel
                </Button>
                {initialDate && (
                    <Button onClick={handleUnschedule} color="error">
                        Unschedule
                    </Button>
                )}
                <Button onClick={handleSave} variant="contained" color="primary">
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default DateTimePickerDialog;
