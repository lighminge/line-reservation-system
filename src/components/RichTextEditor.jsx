import React, { useMemo, useEffect, useRef } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const RichTextEditor = ({ value, onChange, placeholder, styleClass = 'h-48' }) => {
  const wrapperRef = useRef(null);

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

  useEffect(() => {
    if (wrapperRef.current) {
      // Add localized tooltips to the toolbar buttons
      const tooltips = {
        '.ql-size': '字體大小',
        '.ql-bold': '粗體',
        '.ql-color': '文字顏色',
        '.ql-align': '對齊方式',
        '.ql-clean': '清除格式'
      };

      Object.entries(tooltips).forEach(([selector, text]) => {
        const elements = wrapperRef.current.querySelectorAll(selector);
        elements.forEach(el => {
          el.setAttribute('title', text);
          // If it's a picker (dropdown), also set title on its label
          const label = el.querySelector('.ql-picker-label');
          if (label) label.setAttribute('title', text);
        });
      });
    }
  }, []);

  return (
    <div ref={wrapperRef} className="bg-white border-2 border-black comic-box-sm flex flex-col w-full overflow-visible">
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
          border-radius: 4px 4px 0 0;
          box-sizing: border-box;
          padding: 8px;
        }
        .ql-container.ql-snow {
          border: none;
          flex-grow: 1;
          font-family: inherit;
          box-sizing: border-box;
          border-radius: 0 0 4px 4px;
        }
        .ql-editor {
          font-size: 16px;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
