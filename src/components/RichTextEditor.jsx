import React, { useMemo } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const RichTextEditor = ({ value, onChange, placeholder, styleClass = 'h-48' }) => {
  const modules = useMemo(() => ({
    toolbar: [
      [{ 'size': ['small', false, 'large', 'huge'] }],
      ['bold'],
      [{ 'color': [] }],
      [{ 'align': [] }],
      ['clean']
    ]
  }), []);

  const formats = [
    'size', 'bold', 'color', 'align'
  ];

  return (
    <div className="bg-white border-2 border-black comic-box-sm flex flex-col">
      <ReactQuill
        theme="snow"
        value={value || ''}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        className={`flex flex-col ${styleClass}`}
      />
      <style>{`
        .ql-toolbar.ql-snow {
          border: none;
          border-bottom: 2px solid black;
          background-color: #f8fafc;
        }
        .ql-container.ql-snow {
          border: none;
          flex-grow: 1;
          font-family: inherit;
        }
        .ql-editor {
          font-size: 16px;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
