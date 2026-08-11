const fs = require('fs');

let content = fs.readFileSync('src/pages/admin/AdminMessages.jsx', 'utf8');

const titleFields = [
  { field: 'reminderThreeDaysBefore', refName: 'reminderThreeDaysBeforeTitleRef' },
  { field: 'reminderTwoDaysBefore', refName: 'reminderTwoDaysBeforeTitleRef' },
  { field: 'reminderDayBefore', refName: 'reminderDayBeforeTitleRef' },
  { field: 'reminderSameDay', refName: 'reminderSameDayTitleRef' }
];

titleFields.forEach(({ field, refName }) => {
  // Regex to match the remaining title labels
  const blockRegex = new RegExp(`(<label className="text-sm font-semibold text-black font-black block mb-2">\\s*主標題\\s*<span className="text-xs [^"]+">支援變數：\\{'\\{好友的顯示名稱\\}'\\}</span>\\s*</label>\\s*)(<RichTextEditor\\s+value={templates\\.${field}\\?\\.title \\|\\| ''})`, 'g');
  
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
              <RichTextEditor ref={${refName}} value={templates.${field}?.title || ''}`;
              
  content = content.replace(blockRegex, replacement);
});

fs.writeFileSync('src/pages/admin/AdminMessages.jsx', content);
