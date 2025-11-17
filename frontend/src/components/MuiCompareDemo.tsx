import React, { useState } from 'react';
import { TextField, Button, Switch, IconButton, Tooltip, Fab, Link } from '@mui/material';
import { ArrowDownToDotIcon, Search } from 'lucide-react';
import RichTextEditor from './RichTextEditor';

const MuiCompareDemo: React.FC = () => {
  const [editorValue, setEditorValue] = useState<string>('');

  return (
    <div className="space-y-6">
      {/* <h2 className="text-lg font-semibold">MUI vs Tailwind controls</h2> */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="font-medium mb-2">Style sheet</h3>
          <div className="space-y-4">
            <TextField label="Title" />
            {/* demo instance of the new RichTextEditor */}
            <RichTextEditor 
                id='tester'
                value={editorValue} 
                onChange={(v: string) => setEditorValue(v)} 
                placeholder="Start typing..."
                label="Description" 
                // minRows={12}
                />
            <div className="flex flex-wrap items-center gap-4">
              <Tooltip title="Dis a switch, bitch!">
                <Switch defaultChecked className='toggle' />
              </Tooltip>
              <Button variant="text">Primary</Button>
              <Button variant='contained'>Dis</Button>
              <Button variant='outlined'>Dat</Button>
              <Tooltip title="Search">
                <IconButton aria-label="search" color='primary' className=''><Search /></IconButton>
              </Tooltip>
              <Fab color="primary" aria-label="add">
                <ArrowDownToDotIcon />
              </Fab>
              <Link href="#" underline="hover">Learn more</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MuiCompareDemo;
