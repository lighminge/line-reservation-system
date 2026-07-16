import React, { useMemo, useEffect, useRef, useState } from 'react';
import ReactQuill from 'react-quill-new';
import EmojiPicker, { Categories } from 'emoji-picker-react';
import zhHantData from 'emoji-picker-react/dist/data/emojis-zh-hant';
import { Smile } from 'lucide-react';
import { renderToString } from 'react-dom/server';
import 'react-quill-new/dist/quill.snow.css';

const RichTextEditor = ({ value, onChange, placeholder, styleClass = 'h-48' }) => {
  const wrapperRef = useRef(null);
  const quillRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'size': ['small', false, 'large', 'huge'] }],
        ['bold'],
        [{ 'color': [] }],
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
        }
        .ql-editor {
          font-size: 16px;
        }
        /* Custom styling for emoji button to look like Quill buttons */
        .ql-snow .ql-toolbar button.ql-emoji {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 24px;
        }
        .ql-snow .ql-toolbar button.ql-emoji:hover {
          color: #06c;
        }
        .ql-snow .ql-toolbar button.ql-emoji:hover svg {
          stroke: #06c;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
