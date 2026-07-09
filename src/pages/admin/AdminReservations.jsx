import { useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2, X, Check, Clock, User, Calendar as CalendarIcon, MessageCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { getAdminReservations, updateReservationStatus, getAllUsers } from '../../services/db';

export default function AdminReservations() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [reservations, setReservations] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(false);
  
  // View State
  const [selectedDate, setSelectedDate] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    // Fetch all reservations (could be optimized to fetch by month in a real app)
    const resData = await getAdminReservations();
    setReservations(resData);
    
    // Fetch users for displaying names
    const usersData = await getAllUsers();
    const userMap = {};
    usersData.forEach(u => {
      userMap[u.userId] = u.displayName; // Map by LINE userId
    });
    setUsers(userMap);
    
    setLoading(false);
  };

  const handleConfirm = async (res) => {
    setConfirmingId(res.id);
    try {
      // 1. Update status in Firestore
      await updateReservationStatus(res.id, 'confirmed');
      
      // 2. Trigger Line Push Message API
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

  const openDayDetails = (dateStr) => {
    setSelectedDate(dateStr);
    setIsModalOpen(true);
  };

  const getStatusBadge = (status) => {
    if (status === 'confirmed') {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800"><Check className="w-3 h-3 mr-1"/>已確認</span>;
    }
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800"><Clock className="w-3 h-3 mr-1"/>待審核</span>;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
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

          <div className="grid grid-cols-7 gap-4">
            {paddingDays.map(i => (
              <div key={`padding-${i}`} className="min-h-[120px] rounded-xl bg-slate-50/50" />
            ))}
            
            {days.map(date => {
              const dateStr = format(date, 'yyyy-MM-dd');
              const dayReservations = reservationsByDate[dateStr] || [];
              const pendingCount = dayReservations.filter(r => r.status === 'pending').length;

              return (
                <button
                  key={date.toString()}
                  onClick={() => openDayDetails(dateStr)}
                  className={cn(
                    "min-h-[120px] p-3 rounded-xl border transition-all duration-200 flex flex-col items-start relative hover:shadow-md text-left",
                    isToday(date) ? "border-green-400 ring-1 ring-green-400" : "border-slate-200",
                    dayReservations.length > 0 ? "bg-white hover:border-slate-300" : "bg-slate-50 hover:bg-white"
                  )}
                >
                  <span className={cn(
                    "text-sm font-semibold mb-2",
                    isToday(date) ? "text-green-600" : "text-slate-700"
                  )}>
                    {format(date, 'd')}
                  </span>
                  
                  <div className="flex flex-col space-y-1.5 w-full mt-auto">
                    {dayReservations.length > 0 ? (
                      <>
                        <div className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded truncate">
                          共 {dayReservations.length} 筆預約
                        </div>
                        {pendingCount > 0 && (
                          <div className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded truncate flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {pendingCount} 筆待審核
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-xs text-slate-400 px-1">無預約</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Day Details Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl max-w-3xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50 shrink-0">
              <h2 className="text-xl font-bold text-slate-800">
                {selectedDate} 預約明細
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
              {!(reservationsByDate[selectedDate] && reservationsByDate[selectedDate].length > 0) ? (
                <div className="text-center py-12 text-slate-500">
                  <CalendarIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p>本日尚無任何預約</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reservationsByDate[selectedDate]
                    .sort((a, b) => a.time.localeCompare(b.time))
                    .map(res => (
                    <div key={res.id} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-slate-300">
                      
                      <div className="flex items-start space-x-4">
                        <div className="bg-green-50 text-green-700 font-bold text-lg px-4 py-2 rounded-xl border border-green-100">
                          {res.time}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <User className="w-4 h-4 text-slate-400" />
                            <span className="font-bold text-slate-800">{users[res.userId] || '未知用戶'}</span>
                            {getStatusBadge(res.status)}
                          </div>
                          <div className="text-sm text-slate-600 flex items-center mt-2">
                            <span className="bg-slate-100 px-2 py-1 rounded text-slate-700 font-medium">
                              項目：{res.purpose || '未指定'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center shrink-0">
                        {res.status === 'pending' ? (
                          <button
                            onClick={() => handleConfirm(res)}
                            disabled={confirmingId === res.id}
                            className="bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-md shadow-green-500/20 flex items-center disabled:opacity-50"
                          >
                            {confirmingId === res.id ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <>
                                <MessageCircle className="w-5 h-5 mr-2" />
                                <span>確認並發送通知</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <div className="text-sm text-slate-400 flex items-center">
                            <Check className="w-4 h-4 mr-1" />
                            已通知客戶
                          </div>
                        )}
                      </div>
                      
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
