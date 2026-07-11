import { useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2, X, Check, Clock, User, Calendar as CalendarIcon, MessageCircle, Tag, Heart } from 'lucide-react';
import { cn } from '../../utils/cn';
import { getAdminReservations, updateReservationStatus, getAllUsers } from '../../services/db';

export default function AdminReservations() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [reservations, setReservations] = useState([]);
  const [users, setUsers] = useState({});
  const [fullUsers, setFullUsers] = useState({});
  const [loading, setLoading] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null);

  useEffect(() => {
    fetchData();
  }, [currentMonth]);

  const fetchData = async () => {
    setLoading(true);
    // Fetch all reservations (could be optimized to fetch by month in a real app)
    const resData = await getAdminReservations();
    setReservations(resData);
    
    // Fetch users for displaying names and profiles
    const usersData = await getAllUsers();
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
      // 1. Update status in Firestore
      await updateReservationStatus(res.id, 'confirmed');

      // 2. Auto-cancel other pending reservations for the same user, same day, same purpose
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
      
      // 3. Trigger Line Push Message API
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
      });
      
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

  // Group reservations by date string
  const reservationsByDate = reservations.reduce((acc, res) => {
    if (!acc[res.date]) acc[res.date] = [];
    acc[res.date].push(res);
    return acc;
  }, {});

  // For pending section:
  // Level 1: Purpose
  // Level 2: Date
  // Level 3: User
  const pendingRes = reservations.filter(r => r.status === 'pending');
  
  const pendingTree = {};
  pendingRes.forEach(r => {
    const purpose = r.purpose || '未指定項目';
    if (!pendingTree[purpose]) pendingTree[purpose] = {};
    if (!pendingTree[purpose][r.date]) pendingTree[purpose][r.date] = {};
    if (!pendingTree[purpose][r.date][r.userId]) pendingTree[purpose][r.date][r.userId] = [];
    
    pendingTree[purpose][r.date][r.userId].push(r);
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">預約管理</h1>
          <p className="text-slate-500 mt-1">審核並管理所有客戶的預約，發送確認通知</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Calendar Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800 flex items-center">
            <CalendarIcon className="w-6 h-6 mr-2 text-slate-500" />
            {format(currentMonth, 'yyyy 年 MM 月')}
          </h2>
          <div className="flex space-x-2">
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
              
              // Group day reservations by time to show blocks
              const byTime = {};
              dayReservations.forEach(r => {
                if (!byTime[r.time]) byTime[r.time] = 0;
                byTime[r.time]++;
              });
              
              const sortedTimes = Object.keys(byTime).sort();

              return (
                <div
                  key={date.toString()}
                  className={cn(
                    "min-h-[140px] p-2 md:p-3 rounded-xl border transition-all duration-200 flex flex-col items-start relative",
                    isToday(date) ? "border-green-400 ring-1 ring-green-400" : "border-slate-200",
                    "bg-white"
                  )}
                >
                  <span className={cn(
                    "text-sm font-semibold mb-2",
                    isToday(date) ? "text-green-600" : "text-slate-700"
                  )}>
                    {format(date, 'd')}
                  </span>
                  
                  <div className="flex flex-col gap-1 w-full mt-1">
                    {sortedTimes.length > 0 ? (
                      sortedTimes.map((t, idx) => {
                        const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-rose-500', 'bg-amber-500', 'bg-indigo-500', 'bg-teal-500'];
                        const colorClass = colors[idx % colors.length];
                        return (
                          <div key={t} className={`text-[10px] md:text-xs text-white px-1.5 py-1 rounded shadow-sm text-center font-medium truncate ${colorClass}`}>
                            {t} ({byTime[t]}筆)
                          </div>
                        );
                      })
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
          Object.keys(pendingTree).map(purpose => (
            <div key={purpose} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-8">
              <div className="bg-slate-800 p-4">
                <h3 className="text-xl font-bold text-white flex items-center">
                  項目：{purpose}
                </h3>
              </div>
              
              <div className="p-6 space-y-8">
                {Object.keys(pendingTree[purpose]).sort().map(dateStr => (
                  <div key={dateStr} className="space-y-4">
                    <h4 className="text-lg font-bold text-slate-700 border-b-2 border-slate-100 pb-2 flex items-center">
                      <CalendarIcon className="w-5 h-5 mr-2 text-slate-400" />
                      {dateStr}
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {Object.keys(pendingTree[purpose][dateStr]).map(userId => {
                        const userResList = pendingTree[purpose][dateStr][userId].sort((a,b) => a.time.localeCompare(b.time));
                        const u = fullUsers[userId] || {};
                        const uTags = u.tags || [];
                        const uInterests = Array.isArray(u.interests) ? u.interests : (u.interests ? u.interests.split(',').map(i=>i.trim()).filter(Boolean) : []);
                        
                        // Total reservations for this user today (including other purposes)
                        const totalResToday = reservations.filter(r => r.userId === userId && r.date === dateStr).length;

                        return (
                          <div key={userId} className="bg-slate-50 border border-slate-200 rounded-2xl flex flex-col overflow-hidden hover:shadow-md transition-shadow">
                            
                            {/* User Header */}
                            <div className="p-4 bg-white border-b border-slate-100 flex gap-4">
                              {u.pictureUrl ? (
                                <img src={u.pictureUrl} alt={u.displayName} className="w-16 h-16 rounded-full object-cover shadow-sm border border-slate-200" />
                              ) : (
                                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                                  <User className="w-8 h-8" />
                                </div>
                              )}
                              
                              <div className="flex-1 min-w-0">
                                <h5 className="font-bold text-slate-800 text-lg truncate">{u.displayName || '未知用戶'}</h5>
                                <div className="text-xs text-slate-500 font-medium mb-2">
                                  本日總預約：{totalResToday} 筆
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
                            <div className="p-4 flex-1 flex flex-col gap-3">
                              {userResList.map(res => (
                                <div key={res.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col gap-3">
                                  <div className="font-bold text-slate-700 text-lg flex items-center">
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
                              <div className="p-2 bg-amber-50 text-amber-600 text-xs text-center border-t border-amber-100">
                                ⚠️ 確認其中一筆，將自動取消其他時段
                              </div>
                            )}

                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
