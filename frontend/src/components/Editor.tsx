import React from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // Import Quill styles
// import './Editor.css'; // Import your custom styles if needed

interface EditorProps {
    id: string;
    value: string;
    className?: string;
    onChange: (value: string) => void;
  }

interface EditorState {
    text: string;
    id: string;
    value: string;
    className: string;
  }




class Editor extends React.Component<EditorProps, EditorState> {
  // Define the state to hold the text content
  
  // Constructor to initialize the state
constructor(props: EditorProps) {
    super(props);
    this.state = {
        text: "",
        id: "",
        value: "",
        className: ""
    }
}

  modules = {
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline','strike', 'blockquote'],
      [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
      ['link', 'image'],
      ['clean']
    ],
  };

  formats = [
    'header',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link', 'image'
  ];

  render() {
    return (
      <div className="text-editor">
        <ReactQuill theme="snow"
                    modules={this.modules}
                    formats={this.formats}>
        </ReactQuill>
      </div>
    );
  }
}
export default Editor;
