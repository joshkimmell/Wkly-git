import React from 'react';
import { TextField, Button, Switch, IconButton } from '@mui/material';
import { Search } from 'lucide-react';

const MuiCompareDemo: React.FC = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">MUI vs Tailwind controls</h2>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="font-medium mb-2">MUI</h3>
          <div className="space-y-4">
            <TextField label="Title" />
            <TextField label="Description" multiline minRows={3} />
            <div className="flex items-center gap-4">
              <Switch defaultChecked />
              <Button variant="contained">Primary</Button>
              <IconButton aria-label="search"><Search /></IconButton>
            </div>
          </div>
        </div>
        <div>
          <h3 className="font-medium mb-2">Tailwind native</h3>
          <div className="space-y-4">
            <label className="form-label">Title</label>
            <input className="input-field" />
            <label className="form-label">Description</label>
            <textarea className="input-field" rows={3} />
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Toggle</label>
              <button className="btn-primary">Primary</button>
              <button className="btn-ghost" aria-label="search"><Search /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MuiCompareDemo;
