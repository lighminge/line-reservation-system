const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminReservations.jsx', 'utf8');

// 1. Add getMessageTemplates import
content = content.replace(
  `getReminderSettings, saveReminderSettings } from '../../services/db';`,
  `getReminderSettings, saveReminderSettings, getMessageTemplates } from '../../services/db';`
);

// 2. Add states for templates and preview modal
const stateAnchor = `  const [savingReminder, setSavingReminder] = useState(false);`;
const stateInjection = `  const [savingReminder, setSavingReminder] = useState(false);
  const [messageTemplates, setMessageTemplates] = useState({});
  const [previewModal, setPreviewModal] = useState({ isOpen: false, title: '', text: '', imageUrl: '' });`;
content = content.replace(stateAnchor, stateInjection);

// 3. Update fetchData
const fetchDataAnchorOld = `      getAllUsers(),
      getReminderSettings()
    ]);`;
const fetchDataAnchorNew = `      getAllUsers(),
      getReminderSettings(),
      getMessageTemplates()
    ]);`;
content = content.replace(fetchDataAnchorOld, fetchDataAnchorNew);

const fetchSetAnchorOld = `    if (reminderData) {
      setReminderSettings(reminderData);
    }`;
const fetchSetAnchorNew = `    if (reminderData) {
      setReminderSettings(reminderData);
    }
    if (arguments[0] && arguments[0].length > 4) {
      // In JS, Promise.all returns an array. The result of getMessageTemplates is the 5th element.
    }
    // Wait, let's just do it cleanly by rewriting the destructuring:`;

// I should rewrite the whole fetchData function safely.
content = content.replace(
  `    const [resData, pDict, usersData, reminderData] = await Promise.all([
      getAdminReservations(),
      getDictionary('purposes'),
      getAllUsers(),
      getReminderSettings()
    ]);
    
    setReservations(resData);
    setPurposesDict(pDict || []);
    if (reminderData) {
      setReminderSettings(reminderData);
    }`,
  `    const [resData, pDict, usersData, reminderData, tmplData] = await Promise.all([
      getAdminReservations(),
      getDictionary('purposes'),
      getAllUsers(),
      getReminderSettings(),
      getMessageTemplates()
    ]);
    
    setReservations(resData);
    setPurposesDict(pDict || []);
    if (reminderData) {
      setReminderSettings(reminderData);
    }
    if (tmplData) {
      setMessageTemplates(tmplData);
    }`
);

// 4. Add openPreview function inside the component, before return
// Wait, I will inject it inside the `notifications` tab render logic to avoid issues.
const notiLogicSearch = `          const getSubDays = (dateStr, days) => {`;
const notiLogicInject = `          const openPreview = (type, uName) => {
            let tmpl = {};
            if (type === 3) tmpl = messageTemplates.reminderThreeDaysBefore || {};
            else if (type === 2) tmpl = messageTemplates.reminderTwoDaysBefore || {};
            else if (type === 1) tmpl = messageTemplates.reminderDayBefore || {};
            else if (type === 0) tmpl = messageTemplates.reminderSameDay || {};
            
            let defaultTitle = '預約提醒';
            let defaultText = '提醒您有預約';
            if (type === 3) defaultText = '提醒您三天後有預約';
            if (type === 2) defaultText = '提醒您後天有預約';
            if (type === 1) defaultText = '提醒您明日的預約即將到來';
            if (type === 0) { defaultTitle = '今日預約'; defaultText = '提醒您今日的預約'; }

            const t = (tmpl.title || defaultTitle).replace(/{好友的顯示名稱}/g, uName);
            const txt = (tmpl.text || defaultText).replace(/{好友的顯示名稱}/g, uName);

            setPreviewModal({
              isOpen: true,
              title: t,
              text: txt,
              imageUrl: tmpl.imageUrl || ''
            });
          };

          const getSubDays = (dateStr, days) => {`;
content = content.replace(notiLogicSearch, notiLogicInject);

// 5. Update the table cells to include a view button.
const cellThreeSearch = `                                {r.reminderThreeDaysBeforeSent && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" title="已發送" />}`;
const cellThreeInject = `                                {r.reminderThreeDaysBeforeSent && (
                                  <button onClick={() => openPreview(3, uName)} className="text-blue-500 hover:text-blue-700 flex items-center gap-1" title="查看已發送內容">
                                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                    <span className="text-[10px] underline">內容</span>
                                  </button>
                                )}`;
content = content.replace(cellThreeSearch, cellThreeInject);

const cellTwoSearch = `                                {r.reminderTwoDaysBeforeSent && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" title="已發送" />}`;
const cellTwoInject = `                                {r.reminderTwoDaysBeforeSent && (
                                  <button onClick={() => openPreview(2, uName)} className="text-blue-500 hover:text-blue-700 flex items-center gap-1" title="查看已發送內容">
                                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                    <span className="text-[10px] underline">內容</span>
                                  </button>
                                )}`;
content = content.replace(cellTwoSearch, cellTwoInject);

const cellOneSearch = `                                {r.reminderDayBeforeSent && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" title="已發送" />}`;
const cellOneInject = `                                {r.reminderDayBeforeSent && (
                                  <button onClick={() => openPreview(1, uName)} className="text-blue-500 hover:text-blue-700 flex items-center gap-1" title="查看已發送內容">
                                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                    <span className="text-[10px] underline">內容</span>
                                  </button>
                                )}`;
content = content.replace(cellOneSearch, cellOneInject);

const cellZeroSearch = `                                {r.reminderSameDaySent && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" title="已發送" />}`;
const cellZeroInject = `                                {r.reminderSameDaySent && (
                                  <button onClick={() => openPreview(0, uName)} className="text-blue-500 hover:text-blue-700 flex items-center gap-1" title="查看已發送內容">
                                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                    <span className="text-[10px] underline">內容</span>
                                  </button>
                                )}`;
content = content.replace(cellZeroSearch, cellZeroInject);

// 6. Add Preview Modal at the very end before the last closing div of the component
// The component ends with:
/*
      {successModal.isOpen && ( ... )}
    </div>
  );
}
*/
const endAnchor = `    </div>
  );
}`;
const modalLogic = `
      {/* Preview Modal */}
      {previewModal.isOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white border-[4px] border-black shadow-[8px_8px_0_0_#000] shadow-xl max-w-md w-full p-0 animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="bg-green-500 p-4 border-b-[4px] border-black flex justify-between items-center">
              <h3 className="text-xl font-black text-white">已發出的資料內容</h3>
              <button onClick={() => setPreviewModal({ ...previewModal, isOpen: false })} className="text-white hover:text-black font-black bg-black/20 p-1 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 bg-slate-50">
              <div className="bg-white border-2 border-black p-4 comic-box flex flex-col gap-4">
                {previewModal.imageUrl && (
                  <img src={previewModal.imageUrl.startsWith('internal://') ? \`/api/image?id=\${previewModal.imageUrl.replace('internal://', '')}\` : previewModal.imageUrl} alt="預覽圖片" className="w-full h-auto border-2 border-black object-cover rounded-xl" style={{aspectRatio: '1.51/1'}} />
                )}
                <div>
                  <div className="text-xs text-green-600 font-bold mb-1 border-b border-green-200 pb-1">標題</div>
                  <div className="text-lg font-black text-black">{previewModal.title}</div>
                </div>
                <div>
                  <div className="text-xs text-green-600 font-bold mb-1 border-b border-green-200 pb-1">內文</div>
                  <div className="text-sm font-bold text-slate-800 whitespace-pre-wrap">{previewModal.text}</div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-100 border-t-[4px] border-black flex justify-end">
              <button 
                onClick={() => setPreviewModal({ ...previewModal, isOpen: false })}
                className="px-6 py-2 bg-black text-white font-black border-2 border-black hover:bg-slate-800 active:scale-95 transition-transform comic-box-sm"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}`;

content = content.replace(endAnchor, modalLogic);

fs.writeFileSync('src/pages/admin/AdminReservations.jsx', content);
