const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminReservations.jsx', 'utf8');

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
          
          const openPreview = (type, uName) => {
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

          const getSubDays = (dateStr, days) => {
             if (!dateStr) return '-';
             const d = new Date(dateStr);
             d.setDate(d.getDate() - days);
             return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
          };

          return (
            <div className="bg-white border-[3px] border-black comic-box p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4 bg-slate-100 p-2 border-2 border-black comic-box-sm">
                <div className="font-black flex items-center gap-2">
                  <span className="text-black text-sm">總計: {filtered.length} 筆預約</span>
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
                      className="px-2 py-1 border-2 border-black bg-white hover:bg-slate-200 disabled:opacity-50 transition-transform active:scale-95 disabled:active:scale-100"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setNotiPage(p => Math.min(totalPages, p + 1))}
                      disabled={notiPage === totalPages}
                      className="px-2 py-1 border-2 border-black bg-white hover:bg-slate-200 disabled:opacity-50 transition-transform active:scale-95 disabled:active:scale-100"
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
                      <th className="p-3 border-r-2 border-b-2 border-black text-center">
                        前三日通知<br/>
                        <span className="text-[10px] text-slate-300 font-medium">(設定: {reminderSettings.threeDaysBefore?.enabled ? '開啟' : '關閉'})</span>
                      </th>
                      <th className="p-3 border-r-2 border-b-2 border-black text-center">
                        前二日通知<br/>
                        <span className="text-[10px] text-slate-300 font-medium">(設定: {reminderSettings.twoDaysBefore?.enabled ? '開啟' : '關閉'})</span>
                      </th>
                      <th className="p-3 border-r-2 border-b-2 border-black text-center">
                        前一日通知<br/>
                        <span className="text-[10px] text-slate-300 font-medium">(設定: {reminderSettings.dayBefore?.enabled ? '開啟' : '關閉'})</span>
                      </th>
                      <th className="p-3 border-b-2 border-black text-center">
                        當日通知<br/>
                        <span className="text-[10px] text-slate-300 font-medium">(設定: {reminderSettings.sameDay?.enabled ? '開啟' : '關閉'})</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="p-8 text-center font-bold text-slate-500 border-b-2 border-black">沒有符合條件的預約</td>
                      </tr>
                    ) : (
                      paginated.map((r, i) => {
                        const idx = (notiPage - 1) * notiPageSize + i + 1;
                        const uName = users[r.userId] || '未知用戶';
                        return (
                          <tr key={r.id} className="border-b-2 border-black hover:bg-yellow-50 transition-colors whitespace-nowrap font-bold text-center">
                            <td className="p-3 border-r-2 border-black">{idx}</td>
                            <td className="p-3 border-r-2 border-black text-left">{uName}</td>
                            <td className="p-3 border-r-2 border-black text-blue-700">{r.purpose}</td>
                            <td className="p-3 border-r-2 border-black">{r.date}</td>
                            
                            <td className="p-3 border-r-2 border-black bg-white">
                              <div className="flex items-center justify-center gap-1">
                                <span>{getSubDays(r.date, 3)}</span>
                                {r.reminderThreeDaysBeforeSent && (
                                  <button onClick={() => openPreview(3, uName)} className="text-blue-500 hover:text-blue-700 flex items-center gap-1" title="查看已發送內容">
                                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                    <span className="text-[10px] underline">內容</span>
                                  </button>
                                )}
                              </div>
                            </td>
                            
                            <td className="p-3 border-r-2 border-black bg-white">
                              <div className="flex items-center justify-center gap-1">
                                <span>{getSubDays(r.date, 2)}</span>
                                {r.reminderTwoDaysBeforeSent && (
                                  <button onClick={() => openPreview(2, uName)} className="text-blue-500 hover:text-blue-700 flex items-center gap-1" title="查看已發送內容">
                                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                    <span className="text-[10px] underline">內容</span>
                                  </button>
                                )}
                              </div>
                            </td>
                            
                            <td className="p-3 border-r-2 border-black bg-white">
                              <div className="flex items-center justify-center gap-1">
                                <span>{getSubDays(r.date, 1)}</span>
                                {r.reminderDayBeforeSent && (
                                  <button onClick={() => openPreview(1, uName)} className="text-blue-500 hover:text-blue-700 flex items-center gap-1" title="查看已發送內容">
                                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                    <span className="text-[10px] underline">內容</span>
                                  </button>
                                )}
                              </div>
                            </td>
                            
                            <td className="p-3 bg-white">
                              <div className="flex items-center justify-center gap-1">
                                <span>{r.date}</span>
                                {r.reminderSameDaySent && (
                                  <button onClick={() => openPreview(0, uName)} className="text-blue-500 hover:text-blue-700 flex items-center gap-1" title="查看已發送內容">
                                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                    <span className="text-[10px] underline">內容</span>
                                  </button>
                                )}
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

const searchAnchor = `        ))}
      </div>
      )}`;
      
const replaceContent = `        ))}
      </div>
      )}
      
${notiTabLogic}
`;

content = content.replace(searchAnchor, replaceContent);
fs.writeFileSync('src/pages/admin/AdminReservations.jsx', content);
