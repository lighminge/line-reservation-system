import React, { useMemo, useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import ReactQuill, { Quill } from 'react-quill-new';
import EmojiPicker, { Categories } from 'emoji-picker-react';
import zhHantData from 'emoji-picker-react/dist/data/emojis-zh-hant';
import { Smile } from 'lucide-react';
import { renderToString } from 'react-dom/server';
import 'react-quill-new/dist/quill.snow.css';

const Size = Quill.import('attributors/style/size');
Size.whitelist = ['10px', '12px', '14px', '16px', '18px', '20px', '22px', '24px', '28px', '32px'];
Quill.register(Size, true);

const lineColors = [
  // Row 1: Grayscale
  "#000000", "#444444", "#666666", "#888888", "#aaaaaa", "#cccccc", "#ffffff",
  // Row 2: Reds
  "#5c0000", "#a10000", "#e60000", "#ff0000", "#ff334b", "#f06666", "#facccc",
  // Row 3: Oranges
  "#663d00", "#b26b00", "#e67300", "#ff9900", "#ffaa00", "#ffc266", "#ffebcc",
  // Row 4: Yellows
  "#666600", "#b2b200", "#cccc00", "#ffff00", "#ffff66", "#ffff99", "#ffffcc",
  // Row 5: Line Greens & Standard Greens
  "#003700", "#006100", "#008a00", "#00B900", "#06C755", "#66b966", "#cce8cc",
  // Row 6: Cyans / Teals
  "#003333", "#006666", "#009999", "#00cccc", "#00ffff", "#66ffff", "#ccffff",
  // Row 7: Blues
  "#002966", "#0047b2", "#0066cc", "#0080ff", "#3399ff", "#66a3e0", "#cce0f5",
  // Row 8: Purples / Magentas
  "#3d1466", "#6b24b2", "#9933ff", "#c285ff", "#ff00ff", "#ff66ff", "#ebd6ff"
];

const RichTextEditor = forwardRef(({ value, onChange, placeholder, styleClass = 'h-48' }, ref) => {
  const wrapperRef = useRef(null);
  const quillRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useImperativeHandle(ref, () => ({
    insertTextAtCursor: (text) => {
      if (quillRef.current) {
        const editor = quillRef.current.getEditor();
        const range = editor.getSelection(true) || { index: editor.getLength() };
        editor.insertText(range.index, text);
        editor.setSelection(range.index + text.length);
      }
    }
  }));

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'size': ['10px', '12px', '14px', '16px', '18px', '20px', '22px', '24px', '28px', '32px'] }],
        ['bold'],
        [{ 'color': lineColors }],
        [{ 'align': [] }],
        ['clean'],
        ['emoji'] // Placeholder for our custom button
      ],
      handlers: {
        'emoji': function() {
          setShowEmojiPicker(prev => !prev);
        }
      }
    }
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
        '.ql-clean': '清除格式',
        '.ql-emoji': '插入表情符號'
      };

      Object.entries(tooltips).forEach(([selector, text]) => {
        const elements = wrapperRef.current.querySelectorAll(selector);
        elements.forEach(el => {
          el.setAttribute('title', text);
          const label = el.querySelector('.ql-picker-label');
          if (label) label.setAttribute('title', text);
        });
      });

      // Inject Smile icon into our custom emoji button
      const emojiBtn = wrapperRef.current.querySelector('.ql-emoji');
      if (emojiBtn && !emojiBtn.innerHTML.includes('svg')) {
        emojiBtn.innerHTML = renderToString(<Smile className="w-4 h-4 text-slate-700" strokeWidth={2.5} />);
      }

      // Inject custom "More Colors" color picker at the end of the color palette
      const colorPickerOptions = wrapperRef.current.querySelector('.ql-color .ql-picker-options');
      if (colorPickerOptions && !colorPickerOptions.querySelector('.custom-color-picker-wrapper')) {
        const customWrapper = document.createElement('div');
        customWrapper.className = 'custom-color-picker-wrapper mt-2 border-t pt-2 w-full flex items-center justify-center';
        
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.className = 'w-full h-8 cursor-pointer border-0 p-0';
        colorInput.title = '更多顏色 (光譜選取)';
        
        colorInput.addEventListener('input', (e) => {
          if (quillRef.current) {
            const editor = quillRef.current.getEditor();
            editor.format('color', e.target.value);
            // DO NOT close the picker here! Closing it here breaks the native OS color dialog on Windows/Mac
          }
        });

        customWrapper.appendChild(colorInput);
        colorPickerOptions.appendChild(customWrapper);
      }
    }
  }, []);

  const onEmojiClick = (emojiObject) => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      const range = editor.getSelection(true) || { index: editor.getLength() };
      editor.insertText(range.index, emojiObject.emoji);
      editor.setSelection(range.index + emojiObject.emoji.length);
    }
    setShowEmojiPicker(false);
  };

  return (
    <div ref={wrapperRef} className="bg-white border-2 border-black shadow-[2px_2px_0_0_#000] flex flex-col w-full relative">
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value || ''}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        className={`flex flex-col ${styleClass}`}
      />
      
      {showEmojiPicker && (
        <div className="absolute z-50 top-12 right-0 shadow-2xl border-2 border-black">
          <EmojiPicker 
            onEmojiClick={onEmojiClick} 
            searchDisabled={false}
            skinTonesDisabled={true}
            emojiData={zhHantData}
            searchPlaceholder="搜尋表情符號..."
            searchClearButtonLabel="清除"
            previewConfig={{ defaultCaption: "選擇表情符號..." }}
            categories={[
              { category: Categories.SUGGESTED, name: '最近使用' },
              { category: Categories.SMILEYS_PEOPLE, name: '表情與人物' },
              { category: Categories.ANIMALS_NATURE, name: '動物與自然' },
              { category: Categories.FOOD_DRINK, name: '食物與飲料' },
              { category: Categories.TRAVEL_PLACES, name: '旅遊與地點' },
              { category: Categories.ACTIVITIES, name: '活動' },
              { category: Categories.OBJECTS, name: '物品' },
              { category: Categories.SYMBOLS, name: '符號' },
              { category: Categories.FLAGS, name: '旗幟' }
            ]}
          />
        </div>
      )}

      <style>{`
        .ql-toolbar.ql-snow {
          border: none !important;
          border-bottom: 2px solid black !important;
          background-color: #f8fafc;
          border-radius: 0 !important;
          box-sizing: border-box !important;
          padding: 8px !important;
          width: 100% !important;
        }
        .ql-container.ql-snow {
          border: none !important;
          flex-grow: 1;
          font-family: inherit;
          box-sizing: border-box !important;
          border-radius: 0 !important;
          width: 100% !important;
          min-height: 0 !important;
          display: flex !important;
          flex-direction: column !important;
        }
        .ql-editor {
          font-size: 16px;
          flex-grow: 1;
          overflow-y: auto;
        }
        /* Custom styling for emoji button to look like Quill buttons */
        .ql-snow .ql-toolbar button.ql-emoji,
        .ql-snow .ql-toolbar button.ql-custom-color-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 24px;
        }
        .ql-snow .ql-toolbar button.ql-emoji:hover,
        .ql-snow .ql-toolbar button.ql-custom-color-btn:hover {
          color: #06c;
        }
        .ql-snow .ql-toolbar button.ql-emoji:hover svg,
        .ql-snow .ql-toolbar button.ql-custom-color-btn:hover svg {
          stroke: #06c;
        }

        /* Fix Quill Size dropdown labels */
        .ql-snow .ql-picker.ql-size .ql-picker-label::before,
        .ql-snow .ql-picker.ql-size .ql-picker-item::before {
          content: '16px';
        }
        ${['10px', '12px', '14px', '16px', '18px', '20px', '22px', '24px', '28px', '32px'].map(size => `
          .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="${size}"]::before,
          .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="${size}"]::before {
            content: '${size}';
          }
        `).join('')}

        /* Make color picker wider to fit organized colors (7 per row) */
        .ql-snow .ql-picker.ql-color .ql-picker-options {
          width: 196px !important;
          padding: 8px !important;
        }
        .ql-snow .ql-picker.ql-color .ql-picker-item {
          width: 20px !important;
          height: 20px !important;
          margin: 2px !important;
          border-radius: 4px;
          border: 1px solid #ddd;
        }
        .ql-snow .ql-picker.ql-color .ql-picker-item:hover {
          border-color: #000;
          transform: scale(1.1);
        }
      `}</style>
    </div>
  );
});

export default RichTextEditor;
