import { useState, useEffect } from 'react';
import { Loader2, CalendarDays, Puzzle, CheckCircle2, AlertCircle, RefreshCw, X, Check } from 'lucide-react';
import { getAdminReservations, updateReservationStatus, getAllUsers, getDictionary, getAllAvailability } from '../../services/db';
import { cn } from '../../utils/cn';

export default function AdminScheduling() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Data
  const [allReservations, setAllReservations] = useState([]);
  const [allUsers, setAllUsers] = useState({});
  const [purposesDict, setPurposesDict] = useState([]);
  const [allAvailability, setAllAvailability] = useState({});
  
  // UI State
  const [selectedPurpose, setSelectedPurpose] = useState('ALL');
  const [boardData, setBoardData] = useState([]); // This stores current arrangement
  const [originalPending, setOriginalPending] = useState([]); // Keeps track of original un-arranged state
  
  // Dialog state
  const [dialog, setDialog] = useState({ isOpen: false, type: '', message: '', solutions: [], totalCount: 0 });
  const [finalizeConfirmModal, setFinalizeConfirmModal] = useState({ isOpen: false, count: 0 });
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [res, usersList, dict, availData] = await Promise.all([
        getAdminReservations(),
        getAllUsers(),
        getDictionary(),
        getAllAvailability()
      ]);
      
      const userMap = {};
      usersList.forEach(u => userMap[u.userId] = u);
      
      setAllUsers(userMap);
      setAllReservations(res || []);
      setPurposesDict(dict?.purposes || []);
      setAllAvailability(availData || {});
      
      // Auto select the first purpose if exists
      const uniquePurposes = [...new Set(res.filter(r => r.status === 'pending').map(r => r.purpose).filter(Boolean))];
      if (uniquePurposes.length > 0) {
        setSelectedPurpose(uniquePurposes[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Derive board state when purpose changes
  useEffect(() => {
    if (selectedPurpose === 'ALL') {
      setBoardData([]);
      setOriginalPending([]);
      return;
    }
    
    // Get all pending for this purpose
    const pendingForPurpose = allReservations.filter(r => r.purpose === selectedPurpose && r.status === 'pending');
    setOriginalPending(pendingForPurpose);
    
    // Initial board state is just where they are originally requested
    setBoardData([...pendingForPurpose]);
  }, [selectedPurpose, allReservations]);

  // Extract unique slots (date + time)
  const getSlots = () => {
    if (selectedPurpose === 'ALL') return [];
    
    const slotsMap = {};
    
    // 1. Add all configured slots for the selected purpose from availability settings
    Object.keys(allAvailability).forEach(date => {
      const dayData = allAvailability[date];
      if (dayData && dayData.slots && Array.isArray(dayData.slots)) {
        dayData.slots.forEach(slot => {
          if (slot.purposes && slot.purposes.includes(selectedPurpose)) {
            // Time string format must match how reservations store it.
            // In AdminAvailability, we only configure startTime and endTime.
            // Reservations typically store `startTime~endTime` or just what is displayed.
            // Wait, in ReservationForm.jsx, how is `r.time` saved? It's `startTime~endTime`.
            const timeStr = `${slot.startTime || '00:00'}~${slot.endTime || '23:59'}`;
            if (!slotsMap[date]) slotsMap[date] = new Set();
            slotsMap[date].add(timeStr);
          }
        });
      }
    });

    // 2. Also add any slots from originalPending (in case some requests exist for slots that were removed)
    originalPending.forEach(r => {
      const date = r.date;
      const time = r.time || '未指定時間';
      if (!slotsMap[date]) slotsMap[date] = new Set();
      slotsMap[date].add(time);
    });
    
    const dates = Object.keys(slotsMap).sort();
    return dates.map(date => ({
      date,
      times: Array.from(slotsMap[date]).sort()
    }));
  };

  // ---- Drag and Drop handlers ----
  const handleDragStart = (e, resId) => {
    e.dataTransfer.setData('text/plain', resId);
  };

  const handleDrop = (e, targetDate, targetTime) => {
    e.preventDefault();
    const resId = e.dataTransfer.getData('text/plain');
    if (!resId) return;

    setBoardData(prev => prev.map(r => {
      if (r.id === resId) {
        return { ...r, date: targetDate, time: targetTime };
      }
      return r;
    }));
  };

  // ---- Auto Arrange Logic ----
  const handleAutoArrange = () => {
    if (selectedPurpose === 'ALL') return setSuccessModal({ isOpen: true, message: '請先選擇預約項目' });
    if (originalPending.length === 0) return setSuccessModal({ isOpen: true, message: '沒有待審核預約' });

    const childrenMap = {};
    originalPending.forEach(r => {
      // Group by user
      if (!childrenMap[r.userId]) childrenMap[r.userId] = [];
      childrenMap[r.userId].push(r);
    });

    const sortedUsers = Object.keys(childrenMap).sort((a, b) => childrenMap[a].length - childrenMap[b].length);

    let totalPerfectSolutionsCount = 0;
    const perfectSolutions = [];
    const MAX_SOLUTIONS_TO_KEEP = 15;
    const HARD_LIMIT = 1000;

    const backtrack = (userIdx, currentAssigned, usedSlots) => {
      if (totalPerfectSolutionsCount >= HARD_LIMIT) return;
      if (userIdx === sortedUsers.length) {
        totalPerfectSolutionsCount++;
        if (perfectSolutions.length < MAX_SOLUTIONS_TO_KEEP) {
          perfectSolutions.push(Object.values(currentAssigned));
        }
        return;
      }

      const userId = sortedUsers[userIdx];
      const reqs = childrenMap[userId];

      for (let req of reqs) {
        const slotKey = `${req.date}_${req.time}`;
        if (!usedSlots.has(slotKey)) {
          usedSlots.add(slotKey);
          currentAssigned[userId] = req;
          backtrack(userIdx + 1, currentAssigned, usedSlots);
          usedSlots.delete(slotKey);
          delete currentAssigned[userId];
        }
      }
    };

    backtrack(0, {}, new Set());

    if (totalPerfectSolutionsCount > 1) {
      setDialog({
        isOpen: true,
        type: 'choose-solution',
        message: '找到多組完美排班組合！',
        solutions: perfectSolutions,
        totalCount: totalPerfectSolutionsCount
      });
    } else if (totalPerfectSolutionsCount === 1) {
      setBoardData(perfectSolutions[0]);
      setSuccessModal({ isOpen: true, message: '✨ 智慧自動排班完成！找到 1 種「完美無衝突」排班，已套用！' });
    } else {
      // Greedy match for conflicts
      const slotAssignments = {};
      const finalBoardData = [];

      const tryAssign = (userId, visited) => {
        const requests = childrenMap[userId];
        for (let req of requests) {
          const slotKey = `${req.date}_${req.time}`;
          if (!visited.has(slotKey)) {
            visited.add(slotKey);
            if (!slotAssignments[slotKey] || tryAssign(slotAssignments[slotKey], visited)) {
              slotAssignments[slotKey] = userId;
              return true;
            }
          }
        }
        return false;
      };

      const unassignedUsers = [];
      sortedUsers.forEach(userId => {
        const visited = new Set();
        if (!tryAssign(userId, visited)) {
          unassignedUsers.push(userId);
        }
      });

      for (let slotKey in slotAssignments) {
        const uId = slotAssignments[slotKey];
        const reqs = childrenMap[uId];
        const matchedReq = reqs.find(r => `${r.date}_${r.time}` === slotKey);
        if (matchedReq) finalBoardData.push(matchedReq);
      }

      unassignedUsers.forEach(uId => {
        // Just shove them into their first requested slot
        finalBoardData.push(childrenMap[uId][0]);
      });

      setBoardData(finalBoardData);
      setSuccessModal({ isOpen: true, message: '⚠️ 自動排班完成！目前無法達成零衝突，已盡量排開，無法排開的已標示紅框，請手動拖曳微調！' });
    }
  };

  // ---- Finalize Logic ----
  const handleFinalizeClick = () => {
    if (selectedPurpose === 'ALL') return;
    
    // Collect all users who are currently on the board
    const approvedResIds = new Set(boardData.map(r => r.id));
    
    if (approvedResIds.size === 0) return setSuccessModal({ isOpen: true, message: '沒有排班資料可確認' });

    setFinalizeConfirmModal({ isOpen: true, count: approvedResIds.size });
  };

  const executeFinalize = async () => {
    setFinalizeConfirmModal({ isOpen: false, count: 0 });
    setSaving(true);
    
    const approvedResIds = new Set(boardData.map(r => r.id));
    const approvedUserIds = new Set(boardData.map(r => r.userId));
    try {
      const promises = [];
      
      for (const req of originalPending) {
        const isApprovedReq = approvedResIds.has(req.id);
        const userHasBeenApprovedSomewhere = approvedUserIds.has(req.userId);
        
        if (isApprovedReq) {
          // It's on the board, so confirm it
          promises.push(updateReservationStatus(req.id, 'confirmed'));
          
          // Send LINE notification
          promises.push(
            fetch('/api/send-line-message', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: req.userId,
                reservationId: req.id,
                date: req.date,
                time: req.time,
                purpose: req.purpose
              }),
            }).catch(e => console.warn("Push API error:", e))
          );
        } else {
          // Not on the board.
          // Rule a: Cancel other pending users for that slot
          // Rule b: Cancel other pending slots for approved users
          const isSlotTaken = boardData.some(b => b.date === req.date && b.time === req.time);
          
          if (userHasBeenApprovedSomewhere || isSlotTaken) {
             promises.push(updateReservationStatus(req.id, 'cancelled'));
          } else {
             // For un-assigned users not conflicting, we also cancel them because they didn't make the cut.
             promises.push(updateReservationStatus(req.id, 'cancelled'));
          }
        }
      }
      
      await Promise.all(promises);
      setSuccessModal({ isOpen: true, message: '最終安排已成功核准並發布！\n落選及衝突的時段已自動取消。' });
      
      // Refresh
      fetchData();
    } catch (e) {
      console.error(e);
      setSuccessModal({ isOpen: true, message: '發生錯誤，請稍後再試！' });
    } finally {
      setSaving(false);
    }
  };

  const slotsData = getSlots();

  if (loading) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
            <Puzzle className="w-8 h-8 text-blue-600" />
            預約時段安排 (最終排班)
          </h1>
          <p className="text-slate-500 font-bold mt-2">使用拖曳或一鍵排班，輕鬆解決時段衝突</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select 
            value={selectedPurpose}
            onChange={e => setSelectedPurpose(e.target.value)}
            className="px-4 py-2 bg-white border-2 border-slate-300 rounded-xl font-bold text-lg text-slate-800 focus:border-blue-500 outline-none flex-1 md:flex-none"
          >
            <option value="ALL">請選擇預約項目...</option>
            {[...new Set(allReservations.filter(r => r.status === 'pending').map(r => r.purpose).filter(Boolean))].map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <button onClick={fetchData} className="flex items-center gap-2 p-2 bg-yellow-300 hover:bg-yellow-400 font-black text-black border-[3px] border-black shadow-[4px_4px_0_0_#000] active:translate-y-1 active:shadow-[0_0_0_0_#000] transition-all whitespace-nowrap comic-box-sm">
            <RefreshCw className="w-5 h-5 text-black" strokeWidth={3} />
            重新載入待審核預約
          </button>
        </div>
      </div>

      {selectedPurpose !== 'ALL' && originalPending.length > 0 && (
        <div className="bg-white p-6 comic-box mb-6">
          <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="comic-box-sm bg-cyan-200 px-3 py-1 font-black border-2 border-black">
                待排班人數: {new Set(originalPending.map(r => r.userId)).size} 人
              </span>
              <span className="comic-box-sm bg-yellow-300 px-3 py-1 font-black border-2 border-black">
                預約總數: {originalPending.length} 筆
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleAutoArrange}
                className="flex items-center px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-black font-black comic-button"
              >
                ✨ 一鍵自動安排
              </button>
              <button 
                onClick={handleFinalizeClick}
                disabled={saving || boardData.length === 0}
                className="flex items-center px-4 py-2 bg-green-400 hover:bg-green-300 text-black font-black comic-button disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                發布最終安排
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative min-h-[400px]">
            {slotsData.map(({ date, times }) => (
              <div key={date} className="comic-box bg-pink-100 p-4 flex flex-col">
                <div className="text-center font-black text-xl text-black border-b-[3px] border-black pb-3 mb-4 sticky top-0 bg-pink-100 z-10">
                  📅 {date}
                </div>
                <div className="flex-1 space-y-4">
                  {times.map(time => {
                    const cards = boardData.filter(r => r.date === date && r.time === time);
                    const isConflict = cards.length > 1;
                    const isBestChoice = cards.length === 1;

                    return (
                      <div 
                        key={`${date}_${time}`}
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => handleDrop(e, date, time)}
                        className={cn(
                          "p-3 comic-box-sm transition-colors min-h-[100px] flex flex-col bg-white border-2 border-black",
                          isConflict ? "bg-red-200" : 
                          isBestChoice ? "bg-green-100" : ""
                        )}
                      >
                        <div className="text-center mb-3">
                          <span className="inline-block bg-white text-black px-3 py-1 font-black border-2 border-black comic-box-sm">
                            🕒 {time}
                          </span>
                        </div>
                        
                        {isConflict && (
                          <div className="text-xs bg-red-400 text-black font-black text-center mb-3 py-1.5 border-2 border-black comic-box-sm flex items-center justify-center">
                            <AlertCircle className="w-4 h-4 mr-1" /> 衝突！請拖曳移開 (共 {cards.length} 人)
                          </div>
                        )}
                        
                        <div className="flex-1 space-y-2">
                          {cards.map(card => {
                            const u = allUsers[card.userId] || {};
                            return (
                              <div
                                key={card.id}
                                draggable
                                onDragStart={e => handleDragStart(e, card.id)}
                                className={cn(
                                  "p-3 comic-box-sm shadow-[2px_2px_0_0_#000] cursor-grab active:cursor-grabbing border-2 border-black group relative",
                                  isBestChoice ? "bg-yellow-200" : "bg-cyan-100 hover:bg-cyan-200"
                                )}
                              >
                                <div className="font-black text-black pr-6">
                                  {u.childName || u.displayName || '未命名'}
                                </div>
                                {isBestChoice && (
                                  <div className="mt-1 text-[10px] bg-green-400 text-black px-2 py-0.5 font-black border-2 border-black comic-box-sm inline-block">
                                    ⭐ 最佳時段
                                  </div>
                                )}
                                <button 
                                  onClick={() => setBoardData(prev => prev.filter(p => p.id !== card.id))}
                                  className="absolute top-2 right-2 text-black hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-white border-2 border-black rounded-full p-0.5"
                                  title="移出排班板"
                                >
                                  <X className="w-4 h-4" strokeWidth={3} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center text-sm font-black text-black mt-6 bg-yellow-300 py-3 comic-box-sm border-2 border-black">
            💡 提示：您可以直接按住人員卡片，拖曳到其他時段格子來手動調整排班。
          </div>
        </div>
      )}

      {selectedPurpose !== 'ALL' && originalPending.length === 0 && (
        <div className="bg-white p-12 text-center comic-box border-[3px] border-black">
          <CheckCircle2 className="w-16 h-16 text-black mx-auto mb-4" strokeWidth={3} />
          <h3 className="text-2xl font-black text-black">目前沒有待審核的預約</h3>
          <p className="text-black font-bold mt-2 text-lg bg-yellow-300 inline-block px-4 py-1 comic-box-sm border-2 border-black">此項目所有的預約都已處理完畢！</p>
        </div>
      )}

      {/* Modal for Multiple Perfect Solutions */}
      {dialog.isOpen && dialog.type === 'choose-solution' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white comic-box shadow-[8px_8px_0_0_#000] w-full max-w-4xl max-h-[90vh] flex flex-col border-[4px] border-black overflow-hidden">
            <div className="p-4 bg-yellow-300 flex justify-between items-center border-b-[4px] border-black">
              <h3 className="text-xl font-black text-black">✨ 找到 {dialog.totalCount} 組完美排班組合！</h3>
              <button onClick={() => setDialog({ isOpen: false })} className="text-black hover:bg-yellow-400 p-1 rounded-full border-2 border-transparent hover:border-black transition-colors"><X strokeWidth={3} /></button>
            </div>
            <div className="p-4 bg-cyan-100 text-black font-black text-sm border-b-[3px] border-black">
              系統為您計算出了多種「零衝突」的排班方式，請選擇其中一種套用至排班板：
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-pink-100">
              {dialog.solutions.map((sol, idx) => (
                <div key={idx} className="border-[3px] border-black comic-box p-4 bg-white transition-transform hover:-translate-y-1">
                  <div className="flex justify-between items-center mb-4 border-b-2 border-dashed border-slate-300 pb-2">
                    <span className="font-black text-xl text-black bg-yellow-300 px-3 py-1 comic-box-sm border-2 border-black">方案 #{idx + 1}</span>
                    <button 
                      onClick={() => {
                        setBoardData(sol);
                        setDialog({ isOpen: false });
                      }}
                      className="bg-green-400 hover:bg-green-300 text-black px-4 py-2 font-black comic-button"
                    >
                      套用此方案
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {sol.map(req => {
                      const u = allUsers[req.userId] || {};
                      return (
                        <div key={req.id} className="bg-cyan-100 border-2 border-black comic-box-sm p-2 text-sm flex flex-col justify-between">
                          <div className="font-black text-black truncate text-base">{u.childName || u.displayName}</div>
                          <div className="text-slate-700 font-bold text-xs mt-2 bg-white px-1.5 py-0.5 rounded border border-slate-300 text-center">
                            {req.date} {req.time}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Finalize Confirmation Modal */}
      {finalizeConfirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white comic-box shadow-[8px_8px_0_0_#000] w-full max-w-md flex flex-col border-[4px] border-black overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 bg-yellow-300 flex justify-between items-center border-b-[4px] border-black">
              <h3 className="text-xl font-black text-black flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-red-500" strokeWidth={3} />
                發布最終排班
              </h3>
              <button onClick={() => setFinalizeConfirmModal({ isOpen: false, count: 0 })} className="text-black hover:bg-yellow-400 p-1 rounded-full border-2 border-transparent hover:border-black transition-colors"><X strokeWidth={3} /></button>
            </div>
            <div className="p-6 bg-pink-100 flex flex-col gap-4">
              <p className="font-black text-black text-lg">即將發布最終排班！</p>
              <ul className="list-disc list-inside text-black font-bold space-y-2 bg-white p-4 border-[3px] border-black comic-box-sm">
                <li>將直接核准排班板上的 <span className="bg-yellow-300 px-2 py-0.5 border-2 border-black font-black">{finalizeConfirmModal.count}</span> 筆預約</li>
                <li>若該時段有其他人待審核，會被自動取消</li>
                <li>被核准的人，在其他時段的待審核預約也會自動取消</li>
              </ul>
              <p className="text-red-600 font-black text-center mt-2">確定要執行這個操作嗎？（此動作無法還原）</p>
            </div>
            <div className="p-4 bg-white border-t-[4px] border-black flex justify-end gap-3">
              <button 
                onClick={() => setFinalizeConfirmModal({ isOpen: false, count: 0 })}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-black font-black comic-button"
              >
                取消
              </button>
              <button 
                onClick={executeFinalize}
                className="px-4 py-2 bg-green-400 hover:bg-green-300 text-black font-black comic-button flex items-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" strokeWidth={3} />
                確定發布
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white comic-box shadow-[8px_8px_0_0_#000] w-full max-w-sm flex flex-col border-[4px] border-black overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 bg-green-400 flex justify-between items-center border-b-[4px] border-black">
              <h3 className="text-xl font-black text-black flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6" strokeWidth={3} />
                系統提示
              </h3>
              <button onClick={() => setSuccessModal({ isOpen: false, message: '' })} className="text-black hover:bg-green-500 p-1 rounded-full border-2 border-transparent hover:border-black transition-colors"><X strokeWidth={3} /></button>
            </div>
            <div className="p-6 bg-green-50 text-center">
              <p className="font-black text-black text-lg whitespace-pre-line">{successModal.message}</p>
            </div>
            <div className="p-4 bg-white border-t-[4px] border-black flex justify-center">
              <button 
                onClick={() => setSuccessModal({ isOpen: false, message: '' })}
                className="px-6 py-2 bg-green-400 hover:bg-green-300 text-black font-black comic-button w-full"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
