const fs = require('fs');

let content = fs.readFileSync('src/pages/admin/AdminMessages.jsx', 'utf8');

// 1. Add refs for title editors
const refsInsert = `  const clientSuccessTitleRef = useRef(null);
  const lineConfirmTitleRef = useRef(null);
  const adminCustomTitleRef = useRef(null);
  const reminderDayBeforeTitleRef = useRef(null);
  const reminderTwoDaysBeforeTitleRef = useRef(null);
  const reminderThreeDaysBeforeTitleRef = useRef(null);
  const reminderSameDayTitleRef = useRef(null);`;

content = content.replace("  const clientSuccessRef = useRef(null);", refsInsert + "\n  const clientSuccessRef = useRef(null);");

// 2. Replace title blocks
const titleFields = [
  { field: 'clientSuccess', refName: 'clientSuccessTitleRef', colorClass: 'text-blue-500' },
  { field: 'lineConfirm', refName: 'lineConfirmTitleRef', colorClass: 'text-green-600' },
  { field: 'adminCustom', refName: 'adminCustomTitleRef', colorClass: 'text-purple-600' },
  { field: 'reminderDayBefore', refName: 'reminderDayBeforeTitleRef', colorClass: 'text-orange-500' },
  { field: 'reminderTwoDaysBefore', refName: 'reminderTwoDaysBeforeTitleRef', colorClass: 'text-orange-500' },
  { field: 'reminderThreeDaysBefore', refName: 'reminderThreeDaysBeforeTitleRef', colorClass: 'text-orange-500' },
  { field: 'reminderSameDay', refName: 'reminderSameDayTitleRef', colorClass: 'text-red-500' }
];

titleFields.forEach(({ field, refName, colorClass }) => {
  let rtfField = field === 'adminCustom' ? 'adminCustomMessage' : field;
  
  const blockRegex = new RegExp(`(<label className="text-sm font-semibold text-black font-black block mb-2">\\s*主標題\\s*<span className="text-xs [^"]+">支援變數：請使用上方選單插入</span>\\s*</label>\\s*)(<RichTextEditor\\s+value={templates\\.${rtfField}\\.title)`, 'g');
  
  const replacement = `<div className="flex justify-between items-end mb-2">
                <label className="text-sm font-semibold text-black font-black block">
                  主標題
                </label>
                <div className="flex items-center gap-2">
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
                </div>
              </div>
              <RichTextEditor ref={${refName}} value={templates.${rtfField}.title`;
              
  content = content.replace(blockRegex, replacement);
});

// 3. Fix the "內文說明" for Line Confirm so it wraps.
// We change:
// <label className="text-sm font-semibold text-black font-black block">
//   內文說明 (下方會自動附上時間等資訊)
// To add a <br/> and span block.
content = content.replace(
  '內文說明 (下方會自動附上時間等資訊)', 
  '內文說明<br/><span className="text-xs font-normal text-slate-500">(下方會自動附上時間等資訊)</span>'
);

fs.writeFileSync('src/pages/admin/AdminMessages.jsx', content);
