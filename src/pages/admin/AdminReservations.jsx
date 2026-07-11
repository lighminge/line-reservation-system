import { useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2, X, Check, Clock, User, Calendar as CalendarIcon, MessageCircle, Tag, Heart, List, Users } from 'lucide-react';
import { cn } from '../../utils/cn';
import { getAdminReservations, updateReservationStatus, getAllUsers, getDictionary } from '../../services/db';

export default function AdminReservations() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [reservations, setReservations] = useState([]);
  const [purposesDict, setPurposesDict] = useState([]);
  const [users, setUsers] = useState({});
  const [fullUsers, setFullUsers] = useState({});
  const [loading, setLoading] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null);

  // New states for calendar
  const [viewMode, setViewMode] = useState('TIME'); // 'TIME' or 'USER'
  const [calendarPurpose, setCalendarPurpose] = useState('ALL');

  // New state for pending wall user filters
  const [pendingUserFilters, setPendingUserFilters] = useState({}); // { [purpose]: userId }

  useEffect(() => {
    fetchData();
  }, [currentMonth]);

  const fetchData = async () => {
    setLoading(true);
    
    const [resData, pDict, usersData] = await Promise.all([
      getAdminReservations(),
      getDictionary('purposes'),
      getAllUsers()
    ]);
    
    setReservations(resData);
    setPurposesDict(pDict || []);
    
    const userMap = {};
    const fullUserMap = {};
    usersData.forEach(u => {
      userMap[u.userId] = u.displayName;
      fullUserMap[u.userId] = u;
    });
    setUsers(userMap);
    setFullUsers(fullUserMap);
    
    setLoading(false);
  };

  const handleConfirm = async (res) => {
    setConfirmingId(res.id);
    try {
      await updateReservationStatus(res.id, 'confirmed');

      const otherPending = reservations.filter(
        r => r.id !== res.id &&
             r.userId === res.userId &&
             r.date === res.date &&
             r.purpose === res.purpose &&
             r.status === 'pending'
      );

      for (const r of otherPending) {
        await updateReservationStatus(r.id, 'cancelled');
      }
      
      await fetch('/api/send-line-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: res.userId,
          reservationId: res.id,
          date: res.date,
          time: res.time,
          purpose: res.purpose
        }),
      }).catch(e => console.warn("Push API maybe not available:", e)); // Ignore push API errors in demo
      
      await fetchData();
    } catch (error) {
      alert("確認失敗：" + error.message);
    } finally {
      setConfirmingId(null);
    }
  };

  const handleCancel = async (resId) => {
    if (window.confirm("確定要取消此待審核的預約嗎？")) {
      setConfirmingId(resId);
      try {
        await updateReservationStatus(resId, 'cancelled');
        await fetchData();
      } catch (error) {
        alert("取消失敗：" + error.message);
      } finally {
        setConfirmingId(null);
      }
    }
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const startDay = startOfMonth(currentMonth).getDay();
  const paddingDays = Array.from({ length: startDay }, (_, i) => i);

  // Group active (non-cancelled) reservations for calendar
  const activeReservations = reservations.filter(r => r.status !== 'cancelled' && (calendarPurpose === 'ALL' || r.purpose === calendarPurpose));
  
  const reservationsByDate = activeReservations.reduce((acc, res) => {
    if (!acc[res.date]) acc[res.date] = [];
    acc[res.date].push(res);
    return acc;
  }, {});

  // For pending section
  const pendingRes = reservations.filter(r => r.status === 'pending');
  
  const pendingTree = {};
  pendingRes.forEach(r => {
    const purpose = r.purpose || '未指定項目';
    if (!pendingTree[purpose]) pendingTree[purpose] = {};
    if (!pendingTree[purpose][r.date]) pendingTree[purpose][r.date] = {};
    if (!pendingTree[purpose][r.date][r.userId]) pendingTree[purpose][r.date][r.userId] = [];
    
    pendingTree[purpose][r.date][r.userId].push(r);
  });

  // Calculate unique colors for users based on their ID string
  const getUserColor = (userId) => {
    const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-rose-500', 'bg-amber-500', 'bg-indigo-500', 'bg-teal-500', 'bg-cyan-500', 'bg-fuchsia-500', 'bg-orange-500'];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">預約管理</h1>
          <p className="text-slate-500 mt-1">審核並管理所有客戶的預約，發送確認通知</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Calendar Header with Filters and Toggles */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center bg-slate-50 gap-4">
          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            <h2 className="text-xl font-bold text-slate-800 flex items-center whitespace-nowrap">
              <CalendarIcon className="w-6 h-6 mr-2 text-slate-500" />
              {format(currentMonth, 'yyyy 年 MM 月')}
            </h2>
            
            <div className="flex items-center space-x-2 bg-slate-200/50 p-1 rounded-lg">
              <button 
                onClick={() => setViewMode('TIME')}
                className={cn("px-3 py-1.5 rounded-md text-sm font-bold flex items-center transition-all", viewMode === 'TIME' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}
              >
                <Clock className="w-4 h-4 mr-1.5" />
                時段模式
              </button>
              <button 
                onClick={() => setViewMode('USER')}
                className={cn("px-3 py-1.5 rounded-md text-sm font-bold flex items-center transition-all", viewMode === 'USER' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}
              >
                <Users className="w-4 h-4 mr-1.5" />
                用戶模式
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <select 
                value={calendarPurpose}
                onChange={(e) => setCalendarPurpose(e.target.value)}
                className="p-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-white text-sm font-medium min-w-[120px]"
              >
                <option value="ALL">全部項目</option>
                {purposesDict.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex space-x-2 shrink-0">
            <button 
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <button 
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="p-6 relative min-h-[500px]">
          {loading && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-10">
              <Loader2 className="w-8 h-8 animate-spin text-green-500" />
            </div>
          )}
          
          <div className="grid grid-cols-7 gap-4 mb-4">
            {['日', '一', '二', '三', '四', '五', '六'].map(day => (
              <div key={day} className="text-center font-semibold text-slate-400 text-sm">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2 md:gap-4">
            {paddingDays.map(i => (
              <div key={`padding-${i}`} className="min-h-[140px] rounded-xl bg-slate-50/50" />
            ))}
            
            {days.map(date => {
              const dateStr = format(date, 'yyyy-MM-dd');
              const dayReservations = reservationsByDate[dateStr] || [];
              
              let blocks = [];
              if (viewMode === 'TIME') {
                const byTime = {};
                dayReservations.forEach(r => {
                  if (!byTime[r.time]) byTime[r.time] = 0;
                  byTime[r.time]++;
                });
                const sortedTimes = Object.keys(byTime).sort();
                blocks = sortedTimes.map((t, idx) => {
                  const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-rose-500', 'bg-amber-500', 'bg-indigo-500', 'bg-teal-500'];
                  return {
                    id: t,
                    text: `${t} (${byTime[t]}筆)`,
                    color: colors[idx % colors.length]
                  };
                });
              } else {
                // USER mode: Show individual reservations colored by user
                const sortedRes = [...dayReservations].sort((a,b) => a.time.localeCompare(b.time));
                blocks = sortedRes.map(r => {
                  const userName = users[r.userId] || '未知';
                  return {
                    id: r.id,
                    text: `${userName} ${r.time}`,
                    color: getUserColor(r.userId)
                  };
                });
              }

              return (
                <div
                  key={date.toString()}
                  className={cn(
                    "min-h-[140px] p-2 md:p-3 rounded-xl border transition-all duration-200 flex flex-col items-start relative",
                    isToday(date) ? "border-green-400 ring-1 ring-green-400 bg-green-50/10" : "border-slate-200 bg-white"
                  )}
                >
                  <span className={cn(
                    "text-sm font-semibold mb-2",
                    isToday(date) ? "text-green-600" : "text-slate-700"
                  )}>
                    {format(date, 'd')}
                  </span>
                  
                  <div className="flex flex-col gap-1 w-full mt-1">
                    {blocks.length > 0 ? (
                      blocks.map(b => (
                        <div key={b.id} className={`text-[10px] md:text-xs text-white px-1.5 py-1 rounded shadow-sm text-center font-medium truncate ${b.color}`}>
                          {b.text}
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-slate-400 px-1 mt-auto">無預約</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pending Reservations Wall */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center mb-6">
          <Clock className="w-6 h-6 mr-2 text-amber-500" />
          待審核預約
        </h2>
        
        {Object.keys(pendingTree).length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-12 text-center text-slate-500">
            目前沒有任何待審核的預約
          </div>
        ) : (
          Object.keys(pendingTree).map(purpose => {
            
            // Calculate unique users for this purpose
            const uniqueUsersMap = {}; // { userId: { name, firstDate } }
            
            Object.keys(pendingTree[purpose]).forEach(d => {
              Object.keys(pendingTree[purpose][d]).forEach(uId => {
                if (!uniqueUsersMap[uId]) {
                  uniqueUsersMap[uId] = {
                    id: uId,
                    name: users[uId] || '未知用戶',
                    firstDate: d
                  };
                } else if (d < uniqueUsersMap[uId].firstDate) {
                  uniqueUsersMap[uId].firstDate = d;
                }
              });
            });

            const sortedUsers = Object.values(uniqueUsersMap).sort((a, b) => a.firstDate.localeCompare(b.firstDate));
            const selectedUserId = pendingUserFilters[purpose] || '';

            return (
              <div key={purpose} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                <div className="bg-slate-800 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <h3 className="text-xl font-bold text-white flex items-center">
                    項目：{purpose} 
                    <span className="ml-3 text-sm font-medium bg-white/20 px-2 py-1 rounded-full">
                      總計 {
                        Object.values(pendingTree[purpose]).reduce((sum, dates) => 
                          sum + Object.values(dates).reduce((count, userRes) => count + userRes.length, 0), 0
                        )
                      } 筆
                    </span>
                  </h3>
                  
                  {/* User Filter Dropdown */}
                  <div className="flex items-center space-x-2 bg-slate-700 p-1.5 rounded-lg w-full md:w-auto">
                    <User className="w-4 h-4 text-slate-300 ml-1 shrink-0" />
                    <select 
                      value={selectedUserId}
                      onChange={(e) => setPendingUserFilters({...pendingUserFilters, [purpose]: e.target.value})}
                      className="bg-transparent text-white text-sm outline-none w-full min-w-[150px] font-medium"
                    >
                      <option value="" className="text-slate-800">所有用戶</option>
                      {sortedUsers.map(u => (
                        <option key={u.id} value={u.id} className="text-slate-800">
                          {u.name} (最早: {u.firstDate})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="p-6 space-y-8 bg-slate-50">
                  {Object.keys(pendingTree[purpose]).sort().map(dateStr => {
                    // Filter userIds based on dropdown
                    let userIds = Object.keys(pendingTree[purpose][dateStr]);
                    if (selectedUserId) {
                      userIds = userIds.filter(id => id === selectedUserId);
                    }
                    
                    if (userIds.length === 0) return null;

                    return (
                      <div key={dateStr} className="space-y-4">
                        <h4 className="text-lg font-bold text-slate-700 border-b-2 border-slate-200 pb-2 flex items-center">
                          <CalendarIcon className="w-5 h-5 mr-2 text-slate-400" />
                          {dateStr}
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                          {userIds.map(userId => {
                            const userResList = pendingTree[purpose][dateStr][userId].sort((a,b) => a.time.localeCompare(b.time));
                            const u = fullUsers[userId] || {};
                            const uTags = u.tags || [];
                            const uInterests = Array.isArray(u.interests) ? u.interests : (u.interests ? u.interests.split(',').map(i=>i.trim()).filter(Boolean) : []);
                            
                            // Total reservations for this user today (only active ones)
                            const totalResToday = reservations.filter(r => r.userId === userId && r.date === dateStr && r.status !== 'cancelled').length;
                            
                            // Total total reservations for this user ever (active ones)
                            const totalResAll = reservations.filter(r => r.userId === userId && r.status !== 'cancelled').length;

                            return (
                              <div key={userId} className="bg-white border border-slate-200 rounded-2xl flex flex-col overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                
                                {/* User Header */}
                                <div className="p-4 bg-white border-b border-slate-100 flex gap-4">
                                  {u.pictureUrl ? (
                                    <img src={u.pictureUrl} alt={u.displayName} className="w-16 h-16 rounded-full object-cover shadow-sm border border-slate-200" />
                                  ) : (
                                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 shrink-0">
                                      <User className="w-8 h-8" />
                                    </div>
                                  )}
                                  
                                  <div className="flex-1 min-w-0">
                                    <h5 className="font-bold text-slate-800 text-lg truncate">{u.displayName || '未知用戶'}</h5>
                                    <div className="text-xs text-slate-500 font-medium mb-2 flex flex-col gap-1">
                                      <span>本日總計：<span className="text-slate-800 font-bold">{totalResToday}</span> 筆</span>
                                      <span>歷史總計：<span className="text-slate-800 font-bold">{totalResAll}</span> 筆</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {uTags.map(t => (
                                        <span key={t} className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded flex items-center border border-blue-100">
                                          <Tag className="w-3 h-3 mr-1" />{t}
                                        </span>
                                      ))}
                                      {uInterests.map(i => (
                                        <span key={i} className="text-[10px] bg-pink-50 text-pink-600 px-1.5 py-0.5 rounded flex items-center border border-pink-100">
                                          <Heart className="w-3 h-3 mr-1" />{i}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                {u.notes && (
                                  <div className="px-4 py-2 bg-yellow-50/50 border-b border-slate-100 text-xs text-slate-600 line-clamp-2">
                                    <span className="font-bold text-yellow-700">備註：</span>{u.notes}
                                  </div>
                                )}

                                {/* Small Reservation Cards */}
                                <div className="p-4 flex-1 flex flex-col gap-3 bg-slate-50/50">
                                  {userResList.map(res => (
                                    <div key={res.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col gap-3 relative overflow-hidden">
                                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400"></div>
                                      <div className="font-bold text-slate-700 text-lg flex items-center pl-2">
                                        <Clock className="w-5 h-5 mr-2 text-slate-400" />
                                        {res.time}
                                      </div>
                                      <div className="flex gap-2">
                                        <button 
                                          onClick={() => handleConfirm(res)}
                                          disabled={confirmingId === res.id}
                                          className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center transition-colors shadow-sm disabled:opacity-50"
                                        >
                                          {confirmingId === res.id ? <Loader2 className="w-4 h-4 animate-spin" /> : '確認預約'}
                                        </button>
                                        <button 
                                          onClick={() => handleCancel(res.id)}
                                          disabled={confirmingId === res.id}
                                          className="flex-none bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 px-3 py-2 rounded-lg text-sm font-bold transition-colors border border-slate-200"
                                        >
                                          取消
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                
                                {userResList.length > 1 && (
                                  <div className="p-2 bg-amber-50 text-amber-700 text-xs text-center border-t border-amber-100 font-medium">
                                    ⚠️ 確認其中一筆，將自動取消同日其他時段
                                  </div>
                                )}

                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Empty state when filtered */}
                  {Object.keys(pendingTree[purpose]).every(dateStr => {
                    if (!selectedUserId) return false;
                    return !pendingTree[purpose][dateStr][selectedUserId];
                  }) && selectedUserId && (
                    <div className="text-center p-8 text-slate-500 bg-white rounded-2xl border border-slate-200 border-dashed">
                      該用戶在此項目沒有待審核的預約
                    </div>
                  )}

                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
