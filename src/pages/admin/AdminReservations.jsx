import { useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2, X, Check, Clock, User, Calendar as CalendarIcon, MessageCircle, Tag, Heart, List, Users, Send, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { getAdminReservations, updateReservationStatus, getAllUsers, getDictionary } from '../../services/db';
import { Solar } from 'lunar-javascript';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';

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
  const [calendarStatus, setCalendarStatus] = useState('ALL');

  // New state for tabs
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'confirmed'

  // New states for pending/confirmed wall filters
  const [pendingPurposeFilter, setPendingPurposeFilter] = useState('ALL');
  const [pendingUserFilters, setPendingUserFilters] = useState({}); // { [purpose]: userId }
  
  const [confirmedPurposeFilter, setConfirmedPurposeFilter] = useState('ALL');
  const [confirmedUserFilters, setConfirmedUserFilters] = useState({}); // { [purpose]: userId }
  
  // Export state
  const [exportModal, setExportModal] = useState({ isOpen: false, purpose: 'ALL', status: 'ALL', sort: 'DATE' });
  const [actionConfirmModal, setActionConfirmModal] = useState({ isOpen: false, type: '', res: null });
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (calendarPurpose !== 'ALL' && reservations.length > 0) {
      const filtered = reservations.filter(r => r.purpose === calendarPurpose);
      if (filtered.length > 0) {
        const earliest = filtered.sort((a, b) => a.date.localeCompare(b.date))[0];
        // Only parseISO if date string is valid
        if (earliest.date) {
          try {
            const { parseISO } = require('date-fns');
            setCurrentMonth(parseISO(earliest.date));
          } catch(e) { console.error(e); }
        }
      }
    }
  }, [calendarPurpose]);

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

  const executeConfirmAction = async () => {
    const { type, res } = actionConfirmModal;
    setActionConfirmModal({ isOpen: false, type: '', res: null });
    
    setConfirmingId(res.id);
    try {
      if (type === 'cancel') {
        await updateReservationStatus(res.id, 'cancelled');
        await fetchData();
      } else if (type === 'return_pending') {
        await updateReservationStatus(res.id, 'pending');
        await fetchData();
      } else if (type === 'resend_line') {
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
        setSuccessModal({ isOpen: true, message: '預約確認推播已重新送出！' });
      }
    } catch (error) {
      alert("操作失敗：" + error.message);
    } finally {
      setConfirmingId(null);
    }
  };

  const handleCancel = (res) => {
    setActionConfirmModal({ isOpen: true, type: 'cancel', res });
  };

  const handleReturnPending = (res) => {
    setActionConfirmModal({ isOpen: true, type: 'return_pending', res });
  };

  const handleResendLineMessage = (res) => {
    setActionConfirmModal({ isOpen: true, type: 'resend_line', res });
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const startDay = startOfMonth(currentMonth).getDay();
  const paddingDays = Array.from({ length: startDay }, (_, i) => i);

  // Group reservations for calendar based on filters
  const activeReservations = reservations.filter(r => {
    if (calendarPurpose !== 'ALL' && r.purpose !== calendarPurpose) return false;
    
    // Status filter
    if (calendarStatus === 'ALL') return true; // ALL now includes cancelled as requested
    return r.status === calendarStatus;
  });
  
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

  // For confirmed section
  const confirmedRes = reservations.filter(r => r.status === 'confirmed');
  
  const confirmedTree = {};
  confirmedRes.forEach(r => {
    const purpose = r.purpose || '未指定項目';
    if (!confirmedTree[purpose]) confirmedTree[purpose] = {};
    if (!confirmedTree[purpose][r.date]) confirmedTree[purpose][r.date] = {};
    if (!confirmedTree[purpose][r.date][r.userId]) confirmedTree[purpose][r.date][r.userId] = [];
    
    confirmedTree[purpose][r.date][r.userId].push(r);
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

  const getExportCount = () => {
    let toExport = reservations;
    if (exportModal.purpose !== 'ALL') toExport = toExport.filter(r => r.purpose === exportModal.purpose);
    if (exportModal.status !== 'ALL') toExport = toExport.filter(r => r.status === exportModal.status);
    return toExport.length;
  };

  const handleExport = () => {
    let toExport = reservations;
    
    // filter purpose
    if (exportModal.purpose !== 'ALL') {
      toExport = toExport.filter(r => r.purpose === exportModal.purpose);
    }
    
    // filter status
    if (exportModal.status !== 'ALL') {
      toExport = toExport.filter(r => r.status === exportModal.status);
    }
    
    // sort
    toExport = [...toExport].sort((a, b) => {
      if (exportModal.sort === 'DATE') {
        return `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);
      } else {
        const nameA = users[a.userId] || '';
        const nameB = users[b.userId] || '';
        if (nameA === nameB) {
          return `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);
        }
        return nameA.localeCompare(nameB);
      }
    });
    
    // format data
    const exportData = toExport.map((r, i) => ({
      '序號': i + 1,
      '預約日期': r.date,
      '預約時間': r.time,
      '預約項目': r.purpose,
      '客戶名稱': users[r.userId] || '未知用戶',
      '狀態': r.status === 'confirmed' ? '已確認' : r.status === 'cancelled' ? '已取消' : '待審核',
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reservations");
    
    XLSX.writeFile(wb, `預約名單_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);
    
    setExportModal({ ...exportModal, isOpen: false });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">預約管理</h1>
          <p className="text-slate-500 mt-1">審核並管理所有客戶的預約，發送確認通知</p>
        </div>
        <button 
          onClick={() => setExportModal({ ...exportModal, isOpen: true })}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl flex items-center space-x-2 transition-colors shadow-sm font-bold"
        >
          <Download className="w-5 h-5" />
          <span>匯出Excel檔案</span>
        </button>
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
                value={calendarStatus}
                onChange={(e) => setCalendarStatus(e.target.value)}
                className="p-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-white text-sm font-medium min-w-[120px]"
              >
                <option value="ALL">全部狀態</option>
                <option value="pending">待審核</option>
                <option value="confirmed">已核准</option>
                <option value="cancelled">已取消</option>
              </select>
              
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
                  if (!byTime[r.time]) byTime[r.time] = { confirmed: 0, cancelled: 0 };
                  if (r.status === 'cancelled') {
                    byTime[r.time].cancelled++;
                  } else {
                    byTime[r.time].confirmed++;
                  }
                });
                const sortedTimes = Object.keys(byTime).sort();
                blocks = sortedTimes.map((t, idx) => {
                  const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-rose-500', 'bg-amber-500', 'bg-indigo-500', 'bg-teal-500'];
                  const confirmedCount = byTime[t].confirmed;
                  const cancelledCount = byTime[t].cancelled;
                  let text = `${t} (${confirmedCount}筆)`;
                  if (cancelledCount > 0) text += ` (取消${cancelledCount}筆)`;
                  
                  return {
                    id: t,
                    text: text,
                    color: colors[idx % colors.length]
                  };
                });
              } else {
                // USER mode: Show individual reservations colored by user
                const sortedRes = [...dayReservations].sort((a,b) => a.time.localeCompare(b.time));
                
                // Aggregate cancelled slots for the same user and time
                const aggregatedBlocks = [];
                const cancelledMap = {}; // key: `${userId}-${time}`
                
                sortedRes.forEach(r => {
                  if (r.status === 'cancelled') {
                    const key = `${r.userId}-${r.time}`;
                    if (!cancelledMap[key]) {
                      cancelledMap[key] = { ...r, cancelCount: 1 };
                      aggregatedBlocks.push(cancelledMap[key]);
                    } else {
                      cancelledMap[key].cancelCount++;
                    }
                  } else {
                    aggregatedBlocks.push(r);
                  }
                });

                blocks = aggregatedBlocks.map(r => {
                  const userName = users[r.userId] || '未知';
                  const countText = r.cancelCount > 1 ? ` (${r.cancelCount}筆)` : '';
                  return {
                    id: r.id,
                    text: `${userName} ${r.time}${countText}`,
                    color: r.status === 'cancelled' ? 'bg-slate-400' : getUserColor(r.userId),
                    status: r.status
                  };
                });
              }

              const dayOfWeek = date.getDay();
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

              // Lunar & Holidays
              const solar = Solar.fromDate(date);
              const lunar = solar.getLunar();
              const holidays = solar.getFestivals();
              const lunarHolidays = lunar.getFestivals();
              const jieQi = lunar.getJieQi();

              // Prioritize: lunar holidays -> solar holidays -> jieQi
              let holidayText = '';
              let isSpecialDay = false;
              if (lunarHolidays.length > 0) {
                holidayText = lunarHolidays[0];
                isSpecialDay = true;
              } else if (holidays.length > 0) {
                holidayText = holidays[0];
                isSpecialDay = true;
              } else if (jieQi) {
                holidayText = jieQi;
              }

              return (
                <div
                  key={date.toString()}
                  className={cn(
                    "min-h-[140px] p-2 md:p-3 rounded-xl border transition-all duration-200 flex flex-col items-start relative",
                    isToday(date) ? "border-green-400 ring-1 ring-green-400 bg-green-50/10" : "border-slate-200",
                    isWeekend && !isToday(date) ? "bg-red-50/50" : (!isToday(date) ? "bg-white" : "")
                  )}
                >
                  <div className="flex justify-between items-start w-full mb-2">
                    <span className={cn(
                      "text-sm font-semibold",
                      isToday(date) ? "text-green-600" : isWeekend ? "text-red-500" : "text-slate-700"
                    )}>
                      {format(date, 'd')}
                    </span>
                    {holidayText && (
                      <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-sm", isSpecialDay ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600")}>
                        {holidayText}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-1 w-full mt-1">
                    {blocks.length > 0 ? (
                      blocks.map(b => (
                        <div key={b.id} className="flex items-start gap-1 w-full mt-1">
                          {viewMode === 'USER' && b.status === 'confirmed' && <Check strokeWidth={4} className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />}
                          {viewMode === 'USER' && b.status === 'cancelled' && <X strokeWidth={4} className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />}
                          <div className={`flex-1 text-[10px] md:text-xs text-white px-1.5 py-1 rounded shadow-sm font-medium line-clamp-2 leading-tight ${b.color}`}>
                            {b.text}
                          </div>
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

      <div className="flex flex-col md:flex-row gap-4 mb-8 mt-12">
        <button
          className={cn(
            "flex-1 py-4 text-center font-bold text-lg transition-all flex items-center justify-center gap-2 rounded-2xl border-2 shadow-sm bg-white",
            activeTab === 'pending' 
              ? "border-amber-400 text-amber-700 bg-amber-50" 
              : "border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300"
          )}
          onClick={() => setActiveTab('pending')}
        >
          <Clock className={cn("w-6 h-6", activeTab === 'pending' ? "text-amber-500" : "text-slate-400")} />
          待審核預約
        </button>
        <button
          className={cn(
            "flex-1 py-4 text-center font-bold text-lg transition-all flex items-center justify-center gap-2 rounded-2xl border-2 shadow-sm bg-white",
            activeTab === 'confirmed' 
              ? "border-green-400 text-green-700 bg-green-50" 
              : "border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300"
          )}
          onClick={() => setActiveTab('confirmed')}
        >
          <Check strokeWidth={3} className={cn("w-6 h-6", activeTab === 'confirmed' ? "text-green-500" : "text-slate-400")} />
          已核准預約
        </button>
      </div>

      {/* Pending Reservations Wall */}
      {activeTab === 'pending' && (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center">
            <Clock className="w-6 h-6 mr-2 text-amber-500" />
            待審核預約
          </h2>
          <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-lg w-full md:w-auto">
            <select 
              value={pendingPurposeFilter}
              onChange={(e) => setPendingPurposeFilter(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-sm outline-none w-full min-w-[150px] font-medium p-2 rounded-md focus:border-blue-500"
            >
              <option value="ALL">全部項目</option>
              {purposesDict.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        {Object.keys(pendingTree).filter(p => pendingPurposeFilter === 'ALL' || p === pendingPurposeFilter).length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-12 text-center text-slate-500">
            目前沒有任何待審核的預約
          </div>
        ) : (
          Object.keys(pendingTree)
            .filter(purpose => pendingPurposeFilter === 'ALL' || purpose === pendingPurposeFilter)
            .map(purpose => {
            
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
                    <span className="ml-2 text-sm font-medium bg-white/20 px-2 py-1 rounded-full">
                      總人數 {
                        new Set(Object.values(pendingTree[purpose]).flatMap(dates => Object.keys(dates))).size
                      } 人
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

                    // Sort userIds by their earliest reservation time on this day
                    userIds.sort((a, b) => {
                      const timeA = pendingTree[purpose][dateStr][a].sort((x, y) => x.time.localeCompare(y.time))[0].time;
                      const timeB = pendingTree[purpose][dateStr][b].sort((x, y) => x.time.localeCompare(y.time))[0].time;
                      return timeA.localeCompare(timeB);
                    });

                    return (
                      <div key={dateStr} className="space-y-4">
                        <div className="bg-slate-200/50 px-4 py-3 rounded-xl border border-slate-200">
                          <h4 className="text-lg font-bold text-slate-700 flex items-center">
                            <CalendarIcon className="w-5 h-5 mr-2 text-slate-500" />
                            {dateStr}
                          </h4>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                          {userIds.map(userId => {
                            const userResList = pendingTree[purpose][dateStr][userId].sort((a,b) => a.time.localeCompare(b.time));
                            const u = fullUsers[userId] || {};
                            const uTags = u.tags || [];
                            const uInterests = Array.isArray(u.interests) ? u.interests : (u.interests ? u.interests.split(',').map(i=>i.trim()).filter(Boolean) : []);
                            
                            // Total reservations for this user today (only active ones)
                            const totalResToday = reservations.filter(r => r.userId === userId && r.date === dateStr && r.status !== 'cancelled').length;
                            
                            // Total total reservations for this user in this purpose (active ones)
                            const totalResPurpose = reservations.filter(r => r.userId === userId && r.purpose === purpose && r.status !== 'cancelled').length;

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
                                    <div className="text-xs text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-md inline-block mt-1 mb-2 w-fit">
                                      Line 官方：{u.lineGroup || '未綁定群組'}
                                    </div>
                                    <div className="text-xs text-slate-500 font-medium mb-2 flex flex-col gap-1">
                                      <span>本日總計：<span className="text-slate-800 font-bold">{totalResToday}</span> 筆</span>
                                      <span>本項目總計：<span className="text-slate-800 font-bold">{totalResPurpose}</span> 筆</span>
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
      )}

      {/* Confirmed Reservations Wall */}
      {activeTab === 'confirmed' && (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center">
            <Check className="w-6 h-6 mr-2 text-green-500" />
            已核准預約
          </h2>
          <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-lg w-full md:w-auto">
            <select 
              value={confirmedPurposeFilter}
              onChange={(e) => setConfirmedPurposeFilter(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-sm outline-none w-full min-w-[150px] font-medium p-2 rounded-md focus:border-blue-500"
            >
              <option value="ALL">全部項目</option>
              {purposesDict.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        {Object.keys(confirmedTree).filter(p => confirmedPurposeFilter === 'ALL' || p === confirmedPurposeFilter).length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-12 text-center text-slate-500">
            目前沒有任何已核准的預約
          </div>
        ) : (
          Object.keys(confirmedTree)
            .filter(purpose => confirmedPurposeFilter === 'ALL' || purpose === confirmedPurposeFilter)
            .map(purpose => {
            
            // Calculate unique users for this purpose to populate the user dropdown
            const uniqueUsersMap = {};
            
            Object.keys(confirmedTree[purpose]).forEach(d => {
              Object.keys(confirmedTree[purpose][d]).forEach(uId => {
                if (!uniqueUsersMap[uId]) {
                  uniqueUsersMap[uId] = {
                    id: uId,
                    name: users[uId] || '未知用戶',
                    firstDate: d
                  };
                }
              });
            });

            const sortedUsers = Object.values(uniqueUsersMap).sort((a, b) => a.name.localeCompare(b.name));
            const selectedUserId = confirmedUserFilters[purpose] || '';

            return (
              <div key={purpose} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                <div className="bg-green-600 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <h3 className="text-xl font-bold text-white flex items-center">
                    項目：{purpose} 
                    <span className="ml-3 text-sm font-medium bg-white/20 px-2 py-1 rounded-full">
                      總計 {
                        Object.values(confirmedTree[purpose]).reduce((sum, dates) => 
                          sum + Object.values(dates).reduce((count, userRes) => count + userRes.length, 0), 0
                        )
                      } 筆
                    </span>
                    <span className="ml-2 text-sm font-medium bg-white/20 px-2 py-1 rounded-full">
                      總人數 {
                        new Set(Object.values(confirmedTree[purpose]).flatMap(dates => Object.keys(dates))).size
                      } 人
                    </span>
                  </h3>
                  
                  {/* User Filter Dropdown */}
                  <div className="flex items-center space-x-2 bg-green-700/50 p-1.5 rounded-lg w-full md:w-auto">
                    <User className="w-4 h-4 text-green-100 ml-1 shrink-0" />
                    <select 
                      value={selectedUserId}
                      onChange={(e) => setConfirmedUserFilters({...confirmedUserFilters, [purpose]: e.target.value})}
                      className="bg-transparent text-white text-sm outline-none w-full min-w-[150px] font-medium"
                    >
                      <option value="" className="text-slate-800">所有用戶</option>
                      {sortedUsers.map(u => (
                        <option key={u.id} value={u.id} className="text-slate-800">
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="p-6 space-y-8 bg-slate-50">
                  {Object.keys(confirmedTree[purpose]).sort().map(dateStr => {
                    // Flatten all reservations for this date
                    let allDateRes = [];
                    Object.keys(confirmedTree[purpose][dateStr]).forEach(uId => {
                       if (selectedUserId && uId !== selectedUserId) return;
                       allDateRes.push(...confirmedTree[purpose][dateStr][uId]);
                    });

                    if (allDateRes.length === 0) return null;

                    // Sort by time
                    allDateRes.sort((a,b) => a.time.localeCompare(b.time));

                    return (
                      <div key={dateStr} className="space-y-4">
                        <div className="bg-slate-200/50 px-4 py-3 rounded-xl border border-slate-200">
                          <h4 className="text-lg font-bold text-slate-700 flex items-center">
                            <CalendarIcon className="w-5 h-5 mr-2 text-slate-500" />
                            {dateStr}
                          </h4>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                          {allDateRes.map(res => {
                            const u = fullUsers[res.userId] || {};
                            const uTags = u.tags || [];
                            const uInterests = Array.isArray(u.interests) ? u.interests : (u.interests ? u.interests.split(',').map(i=>i.trim()).filter(Boolean) : []);
                            const uName = users[res.userId] || '未知用戶';

                            return (
                              <div key={res.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-shadow">
                                {/* Header */}
                                <div className="p-4 bg-white border-b border-slate-100 flex gap-4">
                                  {u.pictureUrl ? (
                                    <img src={u.pictureUrl} alt={u.displayName || uName} className="w-12 h-12 rounded-full object-cover shadow-sm border border-slate-200 shrink-0" />
                                  ) : (
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-inner shrink-0 ${getUserColor(res.userId)}`}>
                                      {uName.charAt(0)}
                                    </div>
                                  )}
                                  
                                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <h5 className="font-bold text-slate-800 text-lg truncate">{uName}</h5>
                                    <div className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md inline-block mt-1 w-fit">
                                      Line 官方：{u.lineGroup || '未綁定群組'}
                                    </div>
                                  </div>
                                </div>
                                
                                {u.notes && (
                                  <div className="px-4 py-2 bg-yellow-50/50 border-b border-slate-100 text-xs text-slate-600 line-clamp-2">
                                    <span className="font-bold text-yellow-700">備註：</span>{u.notes}
                                  </div>
                                )}
                                
                                {/* Info Body */}
                                <div className="p-4 space-y-3 flex-1">
                                  {u.email && (
                                    <div className="flex items-start text-sm">
                                      <span className="text-slate-400 w-12 shrink-0">Email</span>
                                      <span className="text-slate-700 truncate">{u.email}</span>
                                    </div>
                                  )}
                                  {u.phone && (
                                    <div className="flex items-start text-sm">
                                      <span className="text-slate-400 w-12 shrink-0">手機</span>
                                      <span className="text-slate-700">{u.phone}</span>
                                    </div>
                                  )}
                                  
                                  {(uTags.length > 0 || uInterests.length > 0) && (
                                    <div className="pt-3 border-t border-slate-100 mt-2 space-y-2">
                                      {uTags.length > 0 && (
                                        <div className="flex items-start gap-2">
                                          <Tag className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                                          <div className="flex flex-wrap gap-1">
                                            {uTags.map(tag => (
                                              <span key={tag} className="bg-blue-50 text-blue-600 text-[10px] px-2 py-0.5 rounded-md font-medium border border-blue-100">{tag}</span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      {uInterests.length > 0 && (
                                        <div className="flex items-start gap-2">
                                          <Heart className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                                          <div className="flex flex-wrap gap-1">
                                            {uInterests.map(interest => (
                                              <span key={interest} className="bg-rose-50 text-rose-600 text-[10px] px-2 py-0.5 rounded-md font-medium border border-rose-100">{interest}</span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Res Details */}
                                <div className="p-4 flex-1 flex flex-col gap-3 bg-slate-50/50">
                                  <div className="bg-white border border-green-200 rounded-xl p-3 shadow-sm flex flex-col gap-3 relative overflow-hidden">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500"></div>
                                    <div className="font-bold text-slate-700 text-lg flex items-center pl-2">
                                      <Clock className="w-5 h-5 mr-2 text-green-500" />
                                      {res.time}
                                    </div>
                                    
                                    {/* Action buttons inside card */}
                                    <div className="flex flex-wrap gap-2">
                                      <button 
                                        onClick={() => handleResendLineMessage(res)}
                                        disabled={confirmingId === res.id}
                                        className="flex-1 min-w-[120px] bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 px-2 py-2 rounded-lg text-xs md:text-sm font-bold transition-colors shadow-sm flex items-center justify-center disabled:opacity-50"
                                      >
                                        {confirmingId === res.id ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                          <>
                                            <Send className="w-4 h-4 mr-1" />
                                            重新傳送確認
                                          </>
                                        )}
                                      </button>
                                      
                                      <button 
                                        onClick={() => handleReturnPending(res)}
                                        disabled={confirmingId === res.id}
                                        className="flex-1 min-w-[100px] bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 px-2 py-2 rounded-lg text-xs md:text-sm font-bold transition-colors shadow-sm flex items-center justify-center disabled:opacity-50"
                                      >
                                        <Clock className="w-4 h-4 mr-1" />
                                        退回待審核
                                      </button>

                                      <button 
                                        onClick={() => handleCancel(res)}
                                        disabled={confirmingId === res.id}
                                        className="flex-none bg-white border border-red-200 hover:bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm flex items-center justify-center disabled:opacity-50"
                                      >
                                        取消預約
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Empty state when filtered */}
                  {Object.keys(confirmedTree[purpose]).every(dateStr => {
                    if (!selectedUserId) return false;
                    return !confirmedTree[purpose][dateStr][selectedUserId];
                  }) && selectedUserId && (
                    <div className="text-center p-8 text-slate-500 bg-white rounded-2xl border border-slate-200 border-dashed">
                      該用戶在此項目沒有已核准的預約
                    </div>
                  )}

                </div>
              </div>
            );
          })
        )}
      </div>
      )}

      {/* Export Excel Modal */}
      {exportModal.isOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800 flex items-center">
                <Download className="w-5 h-5 mr-2 text-emerald-500" />
                匯出預約資料至 Excel
              </h3>
              <button onClick={() => setExportModal({ ...exportModal, isOpen: false })} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm font-bold text-slate-700 block mb-1">選取預約項目</label>
                <select 
                  value={exportModal.purpose}
                  onChange={(e) => setExportModal({ ...exportModal, purpose: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 bg-slate-50"
                >
                  <option value="ALL">全部項目</option>
                  {purposesDict.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-sm font-bold text-slate-700 block mb-1">選取預約狀態</label>
                <select 
                  value={exportModal.status}
                  onChange={(e) => setExportModal({ ...exportModal, status: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 bg-slate-50"
                >
                  <option value="ALL">全部狀態</option>
                  <option value="pending">待審核</option>
                  <option value="confirmed">已確認</option>
                  <option value="cancelled">已取消</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 block mb-1">排序條件</label>
                <select 
                  value={exportModal.sort}
                  onChange={(e) => setExportModal({ ...exportModal, sort: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 bg-slate-50"
                >
                  <option value="DATE">依日期排序 (舊到新)</option>
                  <option value="NAME">依名稱排序 (筆畫/字母)</option>
                </select>
              </div>
            </div>

            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 mb-6 flex items-center justify-between">
              <span className="font-bold text-emerald-800">符合條件總筆數</span>
              <span className="text-xl font-black text-emerald-600">{getExportCount()} 筆</span>
            </div>

            <div className="flex space-x-3">
              <button 
                onClick={() => setExportModal({ ...exportModal, isOpen: false })}
                className="flex-1 py-3 bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold rounded-xl transition-colors"
              >
                取消
              </button>
              <button 
                onClick={handleExport}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-colors flex justify-center items-center"
              >
                確定匯出
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Confirmation Modal */}
      {actionConfirmModal.isOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl max-w-sm w-full p-6 text-center animate-in zoom-in-95 duration-200">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              actionConfirmModal.type === 'cancel' ? 'bg-red-100 text-red-500' :
              actionConfirmModal.type === 'return_pending' ? 'bg-amber-100 text-amber-500' :
              'bg-green-100 text-green-500'
            }`}>
              {actionConfirmModal.type === 'cancel' ? <XCircle className="w-8 h-8" /> :
               actionConfirmModal.type === 'return_pending' ? <Clock className="w-8 h-8" /> :
               <Send className="w-8 h-8" />}
            </div>
            
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              {actionConfirmModal.type === 'cancel' ? '確認取消預約' :
               actionConfirmModal.type === 'return_pending' ? '確認退回待審核' :
               '確認重新傳送推播'}
            </h3>
            
            <p className="text-slate-500 mb-6 font-medium">
              {actionConfirmModal.type === 'cancel' ? '確定要取消此預約嗎？取消後將從行事曆中移除。' :
               actionConfirmModal.type === 'return_pending' ? '確定要將此預約退回「待審核」狀態嗎？' :
               `確定要重新傳送「預約成功」訊息給 ${users[actionConfirmModal.res.userId]} 嗎？`}
            </p>
            
            <div className="flex space-x-3">
              <button 
                onClick={() => setActionConfirmModal({ isOpen: false, type: '', res: null })}
                className="flex-1 py-3 bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold rounded-xl transition-colors"
              >
                取消返回
              </button>
              <button 
                onClick={executeConfirmAction}
                className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg transition-colors flex justify-center items-center ${
                  actionConfirmModal.type === 'cancel' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' :
                  actionConfirmModal.type === 'return_pending' ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' :
                  'bg-green-500 hover:bg-green-600 shadow-green-500/20'
                }`}
              >
                確定執行
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successModal.isOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl max-w-sm w-full p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-green-100 text-green-500">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            
            <h3 className="text-xl font-bold text-slate-800 mb-2">執行成功</h3>
            
            <p className="text-slate-500 mb-6 font-medium">
              {successModal.message}
            </p>
            
            <button 
              onClick={() => setSuccessModal({ isOpen: false, message: '' })}
              className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-500/20 transition-colors"
            >
              確定
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
