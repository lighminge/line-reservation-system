const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminReservations.jsx', 'utf8');

const t3Old = `<td className="p-3 border-r-2 border-black bg-white">
                              <div className="flex items-center justify-center gap-1">
                                <span>{getSubDays(r.date, 3)}</span>
                                {r.reminderThreeDaysBeforeSent && (
                                  <button onClick={() => openPreview(3, uName)} className="text-blue-500 hover:text-blue-700 flex items-center gap-1" title="查看已發送內容">
                                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                    <span className="text-[10px] underline">內容</span>
                                  </button>
                                )}
                              </div>
                            </td>`;

const t3New = `<td className="p-3 border-r-2 border-black bg-white">
                              <div className="flex items-center justify-center gap-1">
                                <span>{getSubDays(r.date, 3)}</span>
                                {r.reminderThreeDaysBeforeSent && (
                                  <div className="flex items-center gap-2">
                                    <button onClick={() => openPreview(3, uName)} className="text-blue-500 hover:text-blue-700 flex items-center gap-1" title="查看已發送內容">
                                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                      <span className="text-[10px] underline">內容</span>
                                    </button>
                                    <button onClick={() => handleResendLineMessage(r, 'reminderThreeDaysBefore')} className="text-[10px] bg-slate-100 hover:bg-slate-200 border border-slate-300 px-1 py-0.5 rounded text-slate-600" title="重新發送通知">
                                      重發
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>`;

const t2Old = `<td className="p-3 border-r-2 border-black bg-white">
                              <div className="flex items-center justify-center gap-1">
                                <span>{getSubDays(r.date, 2)}</span>
                                {r.reminderTwoDaysBeforeSent && (
                                  <button onClick={() => openPreview(2, uName)} className="text-blue-500 hover:text-blue-700 flex items-center gap-1" title="查看已發送內容">
                                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                    <span className="text-[10px] underline">內容</span>
                                  </button>
                                )}
                              </div>
                            </td>`;
                            
const t2New = `<td className="p-3 border-r-2 border-black bg-white">
                              <div className="flex items-center justify-center gap-1">
                                <span>{getSubDays(r.date, 2)}</span>
                                {r.reminderTwoDaysBeforeSent && (
                                  <div className="flex items-center gap-2">
                                    <button onClick={() => openPreview(2, uName)} className="text-blue-500 hover:text-blue-700 flex items-center gap-1" title="查看已發送內容">
                                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                      <span className="text-[10px] underline">內容</span>
                                    </button>
                                    <button onClick={() => handleResendLineMessage(r, 'reminderTwoDaysBefore')} className="text-[10px] bg-slate-100 hover:bg-slate-200 border border-slate-300 px-1 py-0.5 rounded text-slate-600" title="重新發送通知">
                                      重發
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>`;

const t1Old = `<td className="p-3 border-r-2 border-black bg-white">
                              <div className="flex items-center justify-center gap-1">
                                <span>{getSubDays(r.date, 1)}</span>
                                {r.reminderDayBeforeSent && (
                                  <button onClick={() => openPreview(1, uName)} className="text-blue-500 hover:text-blue-700 flex items-center gap-1" title="查看已發送內容">
                                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                    <span className="text-[10px] underline">內容</span>
                                  </button>
                                )}
                              </div>
                            </td>`;
                            
const t1New = `<td className="p-3 border-r-2 border-black bg-white">
                              <div className="flex items-center justify-center gap-1">
                                <span>{getSubDays(r.date, 1)}</span>
                                {r.reminderDayBeforeSent && (
                                  <div className="flex items-center gap-2">
                                    <button onClick={() => openPreview(1, uName)} className="text-blue-500 hover:text-blue-700 flex items-center gap-1" title="查看已發送內容">
                                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                      <span className="text-[10px] underline">內容</span>
                                    </button>
                                    <button onClick={() => handleResendLineMessage(r, 'reminderDayBefore')} className="text-[10px] bg-slate-100 hover:bg-slate-200 border border-slate-300 px-1 py-0.5 rounded text-slate-600" title="重新發送通知">
                                      重發
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>`;

const t0Old = `<td className="p-3 bg-white">
                              <div className="flex items-center justify-center gap-1">
                                <span>{r.date}</span>
                                {r.reminderSameDaySent && (
                                  <button onClick={() => openPreview(0, uName)} className="text-blue-500 hover:text-blue-700 flex items-center gap-1" title="查看已發送內容">
                                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                    <span className="text-[10px] underline">內容</span>
                                  </button>
                                )}
                              </div>
                            </td>`;
                            
const t0New = `<td className="p-3 bg-white border-b-0">
                              <div className="flex items-center justify-center gap-1">
                                <span>{r.date}</span>
                                {r.reminderSameDaySent && (
                                  <div className="flex items-center gap-2">
                                    <button onClick={() => openPreview(0, uName)} className="text-blue-500 hover:text-blue-700 flex items-center gap-1" title="查看已發送內容">
                                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                      <span className="text-[10px] underline">內容</span>
                                    </button>
                                    <button onClick={() => handleResendLineMessage(r, 'reminderSameDay')} className="text-[10px] bg-slate-100 hover:bg-slate-200 border border-slate-300 px-1 py-0.5 rounded text-slate-600" title="重新發送通知">
                                      重發
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>`;

content = content.replace(t3Old, t3New);
content = content.replace(t2Old, t2New);
content = content.replace(t1Old, t1New);
content = content.replace(t0Old, t0New);

fs.writeFileSync('src/pages/admin/AdminReservations.jsx', content);
