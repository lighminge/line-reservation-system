const fs = require('fs');

let content = fs.readFileSync('src/pages/admin/AdminMessages.jsx', 'utf8');

// 1. Add refs to the component
const refsInsert = `  const [activeQrField, setActiveQrField] = useState('');
  
  const clientSuccessRef = useRef(null);
  const lineConfirmRef = useRef(null);
  const adminCustomRef = useRef(null);
  const reminderDayBeforeRef = useRef(null);
  const reminderTwoDaysBeforeRef = useRef(null);
  const reminderThreeDaysBeforeRef = useRef(null);
  const reminderSameDayRef = useRef(null);`;

content = content.replace("  const [activeQrField, setActiveQrField] = useState('');", refsInsert);

// 2. Define replacement mapping
const replacements = [
  { field: 'clientSuccess', refName: 'clientSuccessRef' },
  { field: 'lineConfirm', refName: 'lineConfirmRef' },
  { field: 'adminCustom', refName: 'adminCustomRef' },
  { field: 'reminderDayBefore', refName: 'reminderDayBeforeRef' },
  { field: 'reminderTwoDaysBefore', refName: 'reminderTwoDaysBeforeRef' },
  { field: 'reminderThreeDaysBefore', refName: 'reminderThreeDaysBeforeRef' },
  { field: 'reminderSameDay', refName: 'reminderSameDayRef' }
];

replacements.forEach(({ field, refName }) => {
  // Replace the button area
  const btnSearchRegex = new RegExp(`<button\\s+type="button"\\s+onClick={\\(\\) => { setActiveQrField\\('${field}'\\); setQrModalOpen\\(true\\); }}\\s+className="[^"]+"\\s*>\\s*<BookmarkPlus className="w-3 h-3 mr-1" /> 常用訊息\\s*</button>`, 'g');
  
  const btnReplacement = `<div className="flex items-center gap-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        ${refName}.current?.insertTextAtCursor(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="text-xs font-semibold text-black bg-yellow-300 hover:bg-yellow-400 px-2 py-1 rounded border-2 border-black shadow-[2px_2px_0_0_#000] outline-none cursor-pointer"
                  >
                    <option value="">+ 插入變數</option>
                    <option value="{好友的顯示名稱}">好友的名稱</option>
                    <option value="{預約日期}">預約日期</option>
                    <option value="{預約時段}">預約時段</option>
                    <option value="{預約項目}">預約項目</option>
                    <option value="{用戶性別}">用戶性別</option>
                    <option value="{用戶生日}">用戶生日</option>
                    <option value="{用戶星座}">用戶星座</option>
                  </select>
                  <button 
                    type="button" 
                    onClick={() => { setActiveQrField('${field}'); setQrModalOpen(true); }}
                    className="text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded border-2 border-black flex items-center shadow-[2px_2px_0_0_#000] active:shadow-[0_0_0_0_#000] active:translate-x-[2px] active:translate-y-[2px] transition-all"
                  >
                    <BookmarkPlus className="w-3 h-3 mr-1" /> 常用訊息
                  </button>
                </div>`;
  
  content = content.replace(btnSearchRegex, btnReplacement);
  
  // Now replace the RichTextEditor to inject the ref
  let rtfField = field === 'adminCustom' ? 'adminCustomMessage' : field;
  const editorSearchRegex = new RegExp(`(<RichTextEditor\\s+value={templates\\.${rtfField}\\.text}\\s+onChange={val => setTemplates\\({\\.\\.\\.templates, ${rtfField}: {\\.\\.\\.templates\\.${rtfField}, text: val}}\\)}\\s+placeholder="[^"]+"\\s+styleClass="[^"]+"\\s*/>)`, 'g');
  
  content = content.replace(editorSearchRegex, (match) => {
    return match.replace('<RichTextEditor', `<RichTextEditor ref={${refName}}`);
  });
});

fs.writeFileSync('src/pages/admin/AdminMessages.jsx', content);
