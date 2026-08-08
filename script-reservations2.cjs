const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminReservations.jsx', 'utf8');

const searchPoint = "        ))}\n" + 
                    "      </div>\n" + 
                    "      )}\n";
                    
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
                        <td colSpan="8" className="p-8 text-center font-bold text-slate-500 border-b-2 border-black">沒有符合條件的預約</td>
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

content = content.replace(searchPoint, "        ))}\n" + notiTabLogic + "      </div>\n      )\n");

fs.writeFileSync('script-fix.cjs', \`const fs = require('fs');
let c = fs.readFileSync('src/pages/admin/AdminReservations.jsx', 'utf8');
c = c.replace(
  "        ))}\\n      </div>\\n      )}",
  "        ))}\\n" + \` \${notiTabLogic} \` + "\\n      </div>\\n      )}"
);
fs.writeFileSync('src/pages/admin/AdminReservations.jsx', c);
\`);
