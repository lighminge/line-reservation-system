const fs = require('fs');

let content = fs.readFileSync('src/pages/admin/AdminReservations.jsx', 'utf8');

// 1. Add state for subTab and pagination
const stateBlockOld = `  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'confirmed'

  // New states for pending/confirmed wall filters`;

const stateBlockNew = `  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'confirmed'
  const [confirmedSubTab, setConfirmedSubTab] = useState('list'); // 'list' | 'notifications'
  const [notiPage, setNotiPage] = useState(1);
  const [notiPageSize, setNotiPageSize] = useState(10);

  // New states for pending/confirmed wall filters`;

content = content.replace(stateBlockOld, stateBlockNew);

// 2. Fix reminderSettings time defaults
content = content.replace(
  `onChange={(e) => setReminderSettings({...reminderSettings, threeDaysBefore: {...reminderSettings.threeDaysBefore, enabled: e.target.checked}})}`,
  `onChange={(e) => setReminderSettings({...reminderSettings, threeDaysBefore: {...reminderSettings.threeDaysBefore, enabled: e.target.checked, time: reminderSettings.threeDaysBefore?.time || '20:00'}})}`
);
content = content.replace(
  `onChange={(e) => setReminderSettings({...reminderSettings, twoDaysBefore: {...reminderSettings.twoDaysBefore, enabled: e.target.checked}})}`,
  `onChange={(e) => setReminderSettings({...reminderSettings, twoDaysBefore: {...reminderSettings.twoDaysBefore, enabled: e.target.checked, time: reminderSettings.twoDaysBefore?.time || '20:00'}})}`
);
content = content.replace(
  `onChange={(e) => setReminderSettings({...reminderSettings, dayBefore: {...reminderSettings.dayBefore, enabled: e.target.checked}})}`,
  `onChange={(e) => setReminderSettings({...reminderSettings, dayBefore: {...reminderSettings.dayBefore, enabled: e.target.checked, time: reminderSettings.dayBefore?.time || '20:00'}})}`
);
content = content.replace(
  `onChange={(e) => setReminderSettings({...reminderSettings, sameDay: {...reminderSettings.sameDay, enabled: e.target.checked}})}`,
  `onChange={(e) => setReminderSettings({...reminderSettings, sameDay: {...reminderSettings.sameDay, enabled: e.target.checked, time: reminderSettings.sameDay?.time || '09:00'}})}`
);

// 3. Add SubTab UI and reset pagination on filter change
const filterOld = `        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h2 className="text-2xl font-bold text-black font-black flex items-center">
            <Check className="w-6 h-6 mr-2 text-green-500" />
            已核准預約
          </h2>
          <div className="flex items-center space-x-2 bg-slate-100 p-1.5 border-2 border-black w-full md:w-auto">
            <select 
              value={confirmedPurposeFilter}
              onChange={(e) => setConfirmedPurposeFilter(e.target.value)}
              className="bg-white border border-black text-black font-black text-sm outline-none w-full min-w-[150px] font-medium p-2 border-2 border-black font-black focus:border-blue-500"
            >
              <option value="ALL">全部項目</option>
              {purposesDict.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>`;

const filterNew = `        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full md:w-auto">
            <h2 className="text-2xl font-bold text-black font-black flex items-center">
              <Check className="w-6 h-6 mr-2 text-green-500" />
              已核准預約
            </h2>
            <div className="flex gap-2 w-full sm:w-auto">
              <button 
                onClick={() => setConfirmedSubTab('list')}
                className={cn("flex-1 sm:flex-none px-4 py-2 font-black border-2 border-black comic-box-sm transition-transform active:scale-95", confirmedSubTab === 'list' ? 'bg-black text-white' : 'bg-white text-black')}
              >
                預約明細
              </button>
              <button 
                onClick={() => setConfirmedSubTab('notifications')}
                className={cn("flex-1 sm:flex-none px-4 py-2 font-black border-2 border-black comic-box-sm transition-transform active:scale-95", confirmedSubTab === 'notifications' ? 'bg-black text-white' : 'bg-white text-black')}
              >
                預約通知清單
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-2 bg-slate-100 p-1.5 border-2 border-black w-full md:w-auto">
            <select 
              value={confirmedPurposeFilter}
              onChange={(e) => {
                setConfirmedPurposeFilter(e.target.value);
                setNotiPage(1);
              }}
              className="bg-white border border-black text-black font-black text-sm outline-none w-full min-w-[150px] font-medium p-2 border-2 border-black font-black focus:border-blue-500"
            >
              <option value="ALL">全部項目</option>
              {purposesDict.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>`;

content = content.replace(filterOld, filterNew);

// 4. Wrap the confirmed list in {confirmedSubTab === 'list' && ( ... )}
const noReservationsOld = `        {Object.keys(confirmedTree).filter(p => confirmedPurposeFilter === 'ALL' || p === confirmedPurposeFilter).length === 0 ? (`;
const noReservationsNew = `        {confirmedSubTab === 'list' && (Object.keys(confirmedTree).filter(p => confirmedPurposeFilter === 'ALL' || p === confirmedPurposeFilter).length === 0 ? (`;

content = content.replace(noReservationsOld, noReservationsNew);

const closeConfirmedTreeOld = `                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}`;
const closeConfirmedTreeNew = `                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        ))}`;

content = content.replace(closeConfirmedTreeOld, closeConfirmedTreeNew);

// 5. Add notifications tab
const notiTabLogic = `
        {/* Notifications Tab */}
        {confirmedSubTab === 'notifications' && (() => {
          // Flatten reservations
          const allConfirmed = reservations.filter(r => r.status === 'confirmed');
          const filtered = confirmedPurposeFilter === 'ALL' ? allConfirmed : allConfirmed.filter(r => r.purpose === confirmedPurposeFilter);
          
          // Sort by date DESC
          filtered.sort((a, b) => b.date.localeCompare(a.date));
          
          const totalPages = Math.ceil(filtered.length / notiPageSize) || 1;
          const paginated = filtered.slice((notiPage - 1) * notiPageSize, notiPage * notiPageSize);
          
          const getSubDays = (dateStr, days) => {
             if (!dateStr) return '-';
             const d = new Date(dateStr);
             d.setDate(d.getDate() - days);
             return \`\${d.getFullYear()}-\${String(d.getMonth() + 1).padStart(2, '0')}-\${String(d.getDate()).padStart(2, '0')}\`;
          };

          return (
            <div className="bg-white border-[3px] border-black comic-box p-4">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4 bg-slate-100 p-2 border-2 border-black comic-box-sm">
                <div className="font-black flex items-center gap-2">
                  <span className="text-black">總計: {filtered.length} 筆預約</span>
                </div>
                <div className="flex items-center gap-4 w-full sm:w-auto text-sm font-bold">
                  <div className="flex items-center gap-1">
                    每頁:
                    <select 
                      value={notiPageSize}
                      onChange={e => {
                        setNotiPageSize(Number(e.target.value));
                        setNotiPage(1);
                      }}
                      className="border-2 border-black outline-none font-bold bg-white p-1"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={30}>30</option>
                      <option value={40}>40</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                  <div>
                    {notiPage} / {totalPages} 頁
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => setNotiPage(p => Math.max(1, p - 1))}
                      disabled={notiPage === 1}
                      className="px-2 py-1 border-2 border-black bg-white hover:bg-slate-200 disabled:opacity-50 transition-transform active:scale-95"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setNotiPage(p => Math.min(totalPages, p + 1))}
                      disabled={notiPage === totalPages}
                      className="px-2 py-1 border-2 border-black bg-white hover:bg-slate-200 disabled:opacity-50 transition-transform active:scale-95"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto border-2 border-black comic-box-sm bg-white">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-800 text-white font-black whitespace-nowrap">
                    <tr>
                      <th className="p-3 border-r-2 border-b-2 border-black">序號</th>
                      <th className="p-3 border-r-2 border-b-2 border-black">用戶名稱</th>
                      <th className="p-3 border-r-2 border-b-2 border-black">預約項目</th>
                      <th className="p-3 border-r-2 border-b-2 border-black">預約日期</th>
                      <th className="p-3 border-r-2 border-b-2 border-black">
                        前三日通知<br/>
                        <span className="text-xs text-slate-300 font-medium">(設定: {reminderSettings.threeDaysBefore?.enabled ? '開啟' : '關閉'})</span>
                      </th>
                      <th className="p-3 border-r-2 border-b-2 border-black">
                        前二日通知<br/>
                        <span className="text-xs text-slate-300 font-medium">(設定: {reminderSettings.twoDaysBefore?.enabled ? '開啟' : '關閉'})</span>
                      </th>
                      <th className="p-3 border-r-2 border-b-2 border-black">
                        前一日通知<br/>
                        <span className="text-xs text-slate-300 font-medium">(設定: {reminderSettings.dayBefore?.enabled ? '開啟' : '關閉'})</span>
                      </th>
                      <th className="p-3 border-b-2 border-black">
                        當日通知<br/>
                        <span className="text-xs text-slate-300 font-medium">(設定: {reminderSettings.sameDay?.enabled ? '開啟' : '關閉'})</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="p-8 text-center font-bold text-slate-500">沒有符合條件的預約</td>
                      </tr>
                    ) : (
                      paginated.map((r, i) => {
                        const idx = (notiPage - 1) * notiPageSize + i + 1;
                        const uName = users[r.userId] || '未知用戶';
                        return (
                          <tr key={r.id} className="border-b-2 border-black hover:bg-yellow-50 transition-colors whitespace-nowrap font-bold">
                            <td className="p-3 border-r-2 border-black text-center">{idx}</td>
                            <td className="p-3 border-r-2 border-black">{uName}</td>
                            <td className="p-3 border-r-2 border-black text-blue-700">{r.purpose}</td>
                            <td className="p-3 border-r-2 border-black">{r.date}</td>
                            <td className="p-3 border-r-2 border-black">
                              <div className="flex items-center gap-2">
                                <span>{getSubDays(r.date, 3)}</span>
                                {r.reminderThreeDaysBeforeSent && <CheckCircle2 className="w-4 h-4 text-green-500" title="已發送" />}
                              </div>
                            </td>
                            <td className="p-3 border-r-2 border-black">
                              <div className="flex items-center gap-2">
                                <span>{getSubDays(r.date, 2)}</span>
                                {r.reminderTwoDaysBeforeSent && <CheckCircle2 className="w-4 h-4 text-green-500" title="已發送" />}
                              </div>
                            </td>
                            <td className="p-3 border-r-2 border-black">
                              <div className="flex items-center gap-2">
                                <span>{getSubDays(r.date, 1)}</span>
                                {r.reminderDayBeforeSent && <CheckCircle2 className="w-4 h-4 text-green-500" title="已發送" />}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <span>{r.date}</span>
                                {r.reminderSameDaySent && <CheckCircle2 className="w-4 h-4 text-green-500" title="已發送" />}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}
`;

// Insert the new tab logic after the closing of activeTab === 'confirmed' list section.
// Need to find the exact place.
const insertPoint = `      </div>
      )}

      {/* Confirmed Reservations Wall */}`;

content = content.replace(insertPoint, `      </div>
      )}
` + notiTabLogic + `

      {/* Confirmed Reservations Wall */}`); // Wait, the insert point is wrong, it should be at the END of activeTab === 'confirmed'.

// Let's do a better replace for the insertion point.
content = content.replace(`        ))}`}
      </div>
      )}`, `        ))}`}
${notiTabLogic}
      </div>
      )}`);

fs.writeFileSync('src/pages/admin/AdminReservations.jsx', content);
