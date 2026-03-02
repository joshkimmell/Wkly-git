import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';

interface DateTimePickerDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (date: string | null, time: string | null) => void;
    initialDate?: string | null;
    initialTime?: string | null;
    title?: string;
}

const DateTimePickerDialog: React.FC<DateTimePickerDialogProps> = ({
    open,
    onClose,
    onSave,
    initialDate,
    initialTime,
    title = 'Set Date & Time'
}) => {
    const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
    const [selectedTime, setSelectedTime] = useState<Dayjs | null>(null);

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
        }
    }, [open, initialDate, initialTime]);

    const handleSave = () => {
        const dateStr = selectedDate ? selectedDate.format('YYYY-MM-DD') : null;
        const timeStr = selectedTime ? selectedTime.format('HH:mm') : null;
        onSave(dateStr, timeStr);
        onClose();
    };

    const handleUnschedule = () => {
        onSave(null, null);
        onClose();
    };

    const handleCancel = () => {
        onClose();
    };

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
