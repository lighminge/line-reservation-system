import { useState, useEffect } from 'react';
import { Loader2, CalendarDays, Puzzle, CheckCircle2, AlertCircle, RefreshCw, X, Check } from 'lucide-react';
import { getAdminReservations, updateReservationStatus, getAllUsers, getDictionary } from '../../services/db';
import { cn } from '../../utils/cn';

export default function AdminScheduling() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Data
  const [allReservations, setAllReservations] = useState([]);
  const [allUsers, setAllUsers] = useState({});
  const [purposesDict, setPurposesDict] = useState([]);
  
  // UI State
  const [selectedPurpose, setSelectedPurpose] = useState('ALL');
  const [boardData, setBoardData] = useState([]); // This stores current arrangement
  const [originalPending, setOriginalPending] = useState([]); // Keeps track of original un-arranged state
  
  // Dialog state
  const [dialog, setDialog] = useState({ isOpen: false, type: '', message: '', solutions: [], totalCount: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [res, usersList, dict] = await Promise.all([
        getAdminReservations(),
        getAllUsers(),
        getDictionary()
      ]);
      
      const userMap = {};
      usersList.forEach(u => userMap[u.userId] = u);
      
      setAllUsers(userMap);
      setAllReservations(res || []);
      setPurposesDict(dict?.purposes || []);
      
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
    const slotsMap = {};
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
    if (selectedPurpose === 'ALL') return alert('請先選擇預約項目');
    if (originalPending.length === 0) return alert('沒有待審核預約');

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
      alert('✨ 智慧自動排班完成！找到 1 種「完美無衝突」排班，已套用！');
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
      alert('⚠️ 自動排班完成！目前無法達成零衝突，已盡量排開，無法排開的已標示紅框，請手動拖曳微調！');
    }
  };

  // ---- Finalize Logic ----
  const handleFinalize = async () => {
    if (selectedPurpose === 'ALL') return;
    
    // Collect all users who are currently on the board
    const approvedResIds = new Set(boardData.map(r => r.id));
    const approvedUserIds = new Set(boardData.map(r => r.userId));
    
    if (approvedResIds.size === 0) return alert('沒有排班資料可確認');

    // Confirm dialog
    if (!window.confirm(`即將發布最終排班！\n\n- 將直接核准排班板上的 ${approvedResIds.size} 筆預約\n- 若該時段有其他人待審核，會被自動取消\n- 被核准的人，在其他時段的待審核預約也會自動取消\n\n確定執行？`)) {
      return;
    }

    setSaving(true);
    try {
      const promises = [];
      
      for (const req of originalPending) {
        const isApprovedReq = approvedResIds.has(req.id);
        const userHasBeenApprovedSomewhere = approvedUserIds.has(req.userId);
        
        if (isApprovedReq) {
          // It's on the board, so confirm it
          promises.push(updateReservationStatus(req.id, 'confirmed'));
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
      alert('✅ 最終安排已成功核准並發布！落選及衝突的時段已自動取消。');
      
      // Refresh
      fetchData();
    } catch (e) {
      console.error(e);
      alert('發生錯誤，請稍後再試');
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
          <button onClick={fetchData} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl border-2 border-slate-200 transition-colors">
            <RefreshCw className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>

      {selectedPurpose !== 'ALL' && originalPending.length > 0 && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-6">
          <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold border border-blue-200">
                待排班人數: {new Set(originalPending.map(r => r.userId)).size} 人
              </span>
              <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-bold border border-orange-200">
                預約總數: {originalPending.length} 筆
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleAutoArrange}
                className="flex items-center px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold rounded-xl border-2 border-yellow-500 shadow-sm transition-transform active:scale-95"
              >
                ✨ 一鍵自動安排
              </button>
              <button 
                onClick={handleFinalize}
                disabled={saving || boardData.length === 0}
                className="flex items-center px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl shadow-sm transition-transform active:scale-95 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                發布最終安排
              </button>
            </div>
          </div>

          <div className="flex gap-6 overflow-x-auto pb-4 snap-x relative min-h-[400px]">
            {slotsData.map(({ date, times }) => (
              <div key={date} className="snap-center shrink-0 w-[320px] bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col">
                <div className="text-center font-black text-xl text-slate-800 border-b-2 border-slate-200 pb-3 mb-4 sticky top-0 bg-slate-50 z-10">
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
                          "p-3 rounded-xl border-2 transition-colors min-h-[100px] flex flex-col",
                          isConflict ? "bg-red-50 border-red-300" : 
                          isBestChoice ? "bg-green-50/50 border-green-200" : "bg-white border-dashed border-slate-300"
                        )}
                      >
                        <div className="text-center mb-3">
                          <span className="inline-block bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm font-bold border border-slate-200">
                            🕒 {time}
                          </span>
                        </div>
                        
                        {isConflict && (
                          <div className="text-xs bg-red-100 text-red-600 font-bold text-center mb-3 py-1.5 rounded-lg flex items-center justify-center border border-red-200">
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
                                  "p-3 rounded-lg shadow-sm cursor-grab active:cursor-grabbing border bg-white group relative",
                                  isBestChoice ? "border-green-400 shadow-md" : "border-slate-200 hover:border-blue-300"
                                )}
                              >
                                <div className="font-bold text-slate-800">
                                  {u.childName || u.displayName || '未命名'}
                                </div>
                                {isBestChoice && (
                                  <div className="mt-1 text-[10px] bg-green-100 text-green-800 px-2 py-0.5 rounded inline-block font-bold">
                                    ⭐ 最佳時段
                                  </div>
                                )}
                                <button 
                                  onClick={() => setBoardData(prev => prev.filter(p => p.id !== card.id))}
                                  className="absolute top-2 right-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="移出排班板"
                                >
                                  <X className="w-4 h-4" />
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
          
          <div className="text-center text-sm font-bold text-slate-500 mt-6 bg-slate-50 py-3 rounded-xl">
            💡 提示：您可以直接按住人員卡片，拖曳到其他時段格子來手動調整排班。
          </div>
        </div>
      )}

      {selectedPurpose !== 'ALL' && originalPending.length === 0 && (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
          <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h3 className="text-2xl font-black text-slate-800">目前沒有待審核的預約</h3>
          <p className="text-slate-500 font-bold mt-2">此項目所有的預約都已處理完畢！</p>
        </div>
      )}

      {/* Modal for Multiple Perfect Solutions */}
      {dialog.isOpen && dialog.type === 'choose-solution' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col border-4 border-yellow-400 overflow-hidden">
            <div className="p-4 bg-yellow-400 flex justify-between items-center">
              <h3 className="text-xl font-black text-yellow-900">✨ 找到 {dialog.totalCount} 組完美排班組合！</h3>
              <button onClick={() => setDialog({ isOpen: false })} className="text-yellow-900 hover:bg-yellow-500 p-1 rounded-full"><X /></button>
            </div>
            <div className="p-4 bg-yellow-50 text-yellow-800 font-bold text-sm border-b border-yellow-200">
              系統為您計算出了多種「零衝突」的排班方式，請選擇其中一種套用至排班板：
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {dialog.solutions.map((sol, idx) => (
                <div key={idx} className="border-2 border-slate-200 rounded-xl p-4 hover:border-yellow-400 transition-colors bg-white">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-black text-lg text-slate-800">方案 #{idx + 1}</span>
                    <button 
                      onClick={() => {
                        setBoardData(sol);
                        setDialog({ isOpen: false });
                      }}
                      className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-4 py-2 rounded-lg font-bold shadow-sm"
                    >
                      套用此方案
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {sol.map(req => {
                      const u = allUsers[req.userId] || {};
                      return (
                        <div key={req.id} className="bg-slate-50 border border-slate-200 rounded p-2 text-sm">
                          <div className="font-bold text-slate-800 truncate">{u.childName || u.displayName}</div>
                          <div className="text-slate-500 text-xs mt-1">{req.date} {req.time}</div>
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
    </div>
  );
}
