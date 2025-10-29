import React, { useState } from 'react';
import { TextField, Button, Switch, IconButton, Tooltip } from '@mui/material';
import { Search } from 'lucide-react';
import RichTextEditor from './RichTextEditor';

const MuiCompareDemo: React.FC = () => {
  const [editorValue, setEditorValue] = useState<string>('');

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">MUI vs Tailwind controls</h2>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="font-medium mb-2">MUI</h3>
          <div className="space-y-4">
            <TextField label="Title" />
            {/* demo instance of the new RichTextEditor */}
            <RichTextEditor 
                id='tester'
                value={editorValue} 
                onChange={(v: string) => setEditorValue(v)} 
                placeholder="Start typing..."
                label="Description" 
                />
            <div className="flex items-center gap-4">
              <Tooltip title="Generate with AI?">
                <Switch defaultChecked />
              </Tooltip>
              <Button variant="contained">Primary</Button>
              <Tooltip title="Search">
                <IconButton aria-label="search"><Search /></IconButton>
              </Tooltip>
            </div>
          </div>
        </div>
        <div>
          <h3 className="font-medium mb-2">Tailwind native</h3>
          <div className="space-y-4">
            <label className="form-label">Title</label>
            <input className="input-field" />
            <TextField label="Description" multiline minRows={3} />
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
