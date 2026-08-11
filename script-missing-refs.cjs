const fs = require('fs');

let content = fs.readFileSync('src/pages/admin/AdminMessages.jsx', 'utf8');

// 1. Fix adminCustomMessage title
const adminCustomTitleBlockRegex = new RegExp(`(<label className="text-sm font-semibold text-black font-black block mb-2">\\s*主標題\\s*<span className="text-xs text-yellow-700 font-bold ml-2">支援變數：請使用上方選單插入</span>\\s*</label>\\s*)(<RichTextEditor\\s+value={templates\\.adminCustomMessage\\?\\.title \\|\\| ''})`, 'g');

const adminCustomTitleReplacement = `<div className="flex justify-between items-end mb-2">
                <label className="text-sm font-semibold text-black font-black block">
                  主標題
                </label>
                <div className="flex items-center gap-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        adminCustomTitleRef.current?.insertTextAtCursor(e.target.value);
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
              <RichTextEditor ref={adminCustomTitleRef} value={templates.adminCustomMessage?.title || ''}`;

content = content.replace(adminCustomTitleBlockRegex, adminCustomTitleReplacement);

// 2. Add missing refs to text fields
// We know these fields already have the select dropdown but their <RichTextEditor ... > is missing the ref attribute.
// The fields are:
// - adminCustomMessage?.text || '' -> adminCustomRef
// - reminderThreeDaysBefore?.text || '' -> reminderThreeDaysBeforeRef
// - reminderTwoDaysBefore?.text || '' -> reminderTwoDaysBeforeRef
// - reminderDayBefore?.text || '' -> reminderDayBeforeRef
// - reminderSameDay?.text || '' -> reminderSameDayRef

const missingRefs = [
  { field: 'adminCustomMessage', refName: 'adminCustomRef' },
  { field: 'reminderThreeDaysBefore', refName: 'reminderThreeDaysBeforeRef' },
  { field: 'reminderTwoDaysBefore', refName: 'reminderTwoDaysBeforeRef' },
  { field: 'reminderDayBefore', refName: 'reminderDayBeforeRef' },
  { field: 'reminderSameDay', refName: 'reminderSameDayRef' }
];

missingRefs.forEach(({ field, refName }) => {
  const searchRegex = new RegExp(`(<RichTextEditor\\s+)(value={templates\\.${field}\\?\\.text \\|\\| ''})`, 'g');
  content = content.replace(searchRegex, `$1ref={${refName}} $2`);
});

fs.writeFileSync('src/pages/admin/AdminMessages.jsx', content);
