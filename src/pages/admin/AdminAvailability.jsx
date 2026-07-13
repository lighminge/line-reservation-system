import { useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isBefore, startOfDay, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2, X, Plus, Clock, Users, BookOpen, Trash2, AlertCircle, Edit2, CheckCircle2, List } from 'lucide-react';
import { cn } from '../../utils/cn';
import { getAvailability, saveAvailability, getDictionary, saveDictionary, getAdminReservations, getAllUsers } from '../../services/db';
import { getTaiwanHolidayInfo } from '../../utils/calendar';
import { ShieldAlert, ArrowRight, ArrowLeft } from 'lucide-react';

export default function AdminAvailability() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availability, setAvailability] = useState({});
  const [reservations, setReservations] = useState([]);
  const [purposesDict, setPurposesDict] = useState([]); 
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Calendar Filter (split into two)
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL', 'ACTIVE', 'EXPIRED'
  const [filterPurpose, setFilterPurpose] = useState('ALL'); // 'ALL' or specific purpose name
  
  // Modal state
  const [selectedDate, setSelectedDate] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Day settings
  const [daySettings, setDaySettings] = useState({ isOpen: false, slots: [] });

  // Slot Edit state
  const [editingSlotIndex, setEditingSlotIndex] = useState(-1);
  const [slotForm, setSlotForm] = useState({
    ampm: 'AM',
    hour: '10',
    minute: '00',
    purposes: [],
    maxCapacity: -1
  });

  // Section Toggle ('none', 'purpose', 'access')
  const [activeSection, setActiveSection] = useState('none');

  // Purpose management State
  const [purposePage, setPurposePage] = useState(1);
  const [purposeFilter, setPurposeFilter] = useState('ALL'); 
  const [editingPurposeId, setEditingPurposeId] = useState(null);
  const [purposeForm, setPurposeForm] = useState({ name: '', startDate: '', endDate: '', userLimit: -1, slotApprovedLimit: -1, restrictedUsers: [] });

  // Access Management State
  const [accessPurposeId, setAccessPurposeId] = useState('');
  const [localRestricted, setLocalRestricted] = useState([]);
  const [selectedAllowedIds, setSelectedAllowedIds] = useState([]);
  const [selectedRestrictedIds, setSelectedRestrictedIds] = useState([]);

  // Custom Alert/Confirm Modals
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '' });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null });

  const monthStr = format(currentMonth, 'yyyy-MM');
  
  const [purposeStats, setPurposeStats] = useState(null);

  useEffect(() => {
    if (filterPurpose !== 'ALL') {
      const autoSwitch = async () => {
        try {
          const { getAllAvailability } = await import('../../services/db');
          const allData = await getAllAvailability();
          const dates = Object.keys(allData).sort();
          for (let d of dates) {
            const slots = allData[d].slots || [];
            if (slots.some(s => s.purposes.includes(filterPurpose))) {
              setCurrentMonth(parseISO(d));
              break;
            }
          }
        } catch (e) { console.error(e); }
      };
      autoSwitch();
    }
  }, [filterPurpose]);

  useEffect(() => {
    if (filterPurpose !== 'ALL') {
      const computeStats = async () => {
        try {
          const { getAllAvailability } = await import('../../services/db');
          const allData = await getAllAvailability();
          
          const dates = Object.keys(allData).sort();
          let daysCount = 0;
          let slotsCount = 0;

          for (let d of dates) {
            const slots = allData[d].slots || [];
            const hasPurpose = slots.some(s => s.purposes.includes(filterPurpose));
            if (hasPurpose) {
              daysCount++;
              slotsCount += slots.filter(s => s.purposes.includes(filterPurpose)).length;
            }
          }

          const uniqueUsers = new Set();
          reservations.forEach(r => {
            if (r.purpose === filterPurpose && r.status !== 'cancelled') {
              uniqueUsers.add(r.userId);
            }
          });

          setPurposeStats({
            days: daysCount,
            slots: slotsCount,
            users: uniqueUsers.size
          });
        } catch (e) {
          console.error(e);
        }
      };
      computeStats();
    } else {
      setPurposeStats(null);
    }
  }, [filterPurpose, reservations]);

  useEffect(() => {
    fetchData();
  }, [monthStr]);

  const fetchData = async () => {
    setLoading(true);
    const [availData, dictData, resData] = await Promise.all([
      getAvailability(monthStr),
      getDictionary('purposes'),
      getAdminReservations()
    ]);
    
    let migratedDict = [...dictData];
    let needsMigration = false;
    migratedDict = migratedDict.map(item => {
      if (typeof item === 'string') {
        needsMigration = true;
        return {
          id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
          name: item,
          startDate: '',
          endDate: '',
          userLimit: -1,
          slotApprovedLimit: -1,
          restrictedUsers: [],
          createdAt: new Date().toISOString()
        };
      }
      return item;
    });

    if (needsMigration) {
      await saveDictionary('purposes', migratedDict);
    }

    const fetchedUsers = await getAllUsers();

    setAvailability(availData);
    setPurposesDict(migratedDict);
    setReservations(resData);
    setAllUsers(fetchedUsers);
    setLoading(false);
  };

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startDay = startOfMonth(currentMonth).getDay();
  const paddingDays = Array.from({ length: startDay }, (_, i) => i);
  const today = startOfDay(new Date());

  const getFilteredSlotsForDay = (dateStr) => {
    const settings = availability[dateStr];
    if (!settings?.isOpen) return null;
    let slots = settings.slots || [];
    
    // 1. Filter by Status
    if (filterStatus === 'ACTIVE') {
      slots = slots.filter(s => s.purposes.some(pName => {
        const pObj = purposesDict.find(pd => pd.name === pName);
        return !pObj?.endDate || !isBefore(parseISO(pObj.endDate), today);
      }));
    } else if (filterStatus === 'EXPIRED') {
      slots = slots.filter(s => s.purposes.some(pName => {
        const pObj = purposesDict.find(pd => pd.name === pName);
        return pObj?.endDate && isBefore(parseISO(pObj.endDate), today);
      }));
    }

    // 2. Filter by Purpose
    if (filterPurpose !== 'ALL') {
      slots = slots.filter(s => s.purposes.includes(filterPurpose));
    }
    
    return slots;
  };

  const openModal = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setSelectedDate(dateStr);
    const existing = availability[dateStr];
    if (existing) {
      setDaySettings({
        slots: existing.slots || (existing.timeSlots || []).map(t => ({
          time: t,
          purposes: existing.purposes || [],
          maxCapacity: -1
        }))
      });
    } else {
      setDaySettings({ slots: [] });
    }
    resetSlotForm();
    setIsModalOpen(true);
  };

  const resetSlotForm = () => {
    setEditingSlotIndex(-1);
    setSlotForm({ ampm: 'AM', hour: '10', minute: '00', purposes: [], maxCapacity: -1 });
  };

  const handleSaveDay = async () => {
    setSaving(true);
    try {
      const existingId = availability[selectedDate]?.id;
      const dataToSave = { 
        month: monthStr, 
        date: selectedDate, 
        isOpen: daySettings.slots.length > 0, 
        slots: daySettings.slots 
      };
      await saveAvailability(existingId, dataToSave);
      await fetchData();
      setIsModalOpen(false);
    } catch (error) {
      setAlertModal({ isOpen: true, message: "儲存失敗: " + error.message });
    } finally {
      setSaving(false);
    }
  };

  const addOrUpdateSlot = () => {
    if (!slotForm.hour || !slotForm.minute || slotForm.purposes.length === 0) {
      setAlertModal({ isOpen: true, message: "請完整填寫時間與預約目的" });
      return;
    }
    
    let h = parseInt(slotForm.hour);
    if (slotForm.ampm === 'PM' && h < 12) h += 12;
    if (slotForm.ampm === 'AM' && h === 12) h = 0;
    
    const timeStr = `${h.toString().padStart(2, '0')}:${slotForm.minute}`;
    
    const newSlot = {
      time: timeStr,
      purposes: slotForm.purposes,
      maxCapacity: slotForm.maxCapacity
    };

    const newSlots = [...daySettings.slots];
    
    if (editingSlotIndex >= 0) {
      newSlots[editingSlotIndex] = newSlot;
    } else {
      if (newSlots.some(s => s.time === timeStr)) {
        setAlertModal({ isOpen: true, message: "該時間時段已經存在！" });
        return;
      }
      newSlots.push(newSlot);
    }

    newSlots.sort((a, b) => a.time.localeCompare(b.time));
    setDaySettings({ ...daySettings, slots: newSlots });
    resetSlotForm();
  };

  const editSlot = (index) => {
    const slot = daySettings.slots[index];
    const [hStr, mStr] = slot.time.split(':');
    let h = parseInt(hStr);
    let ampm = 'AM';
    if (h >= 12) {
      ampm = 'PM';
      if (h > 12) h -= 12;
    } else if (h === 0) {
      h = 12;
    }
    setSlotForm({
      ampm,
      hour: h.toString(),
      minute: mStr,
      purposes: slot.purposes || [],
      maxCapacity: slot.maxCapacity !== undefined ? slot.maxCapacity : -1
    });
    setEditingSlotIndex(index);
  };

  const deleteSlot = (index, e) => {
    e.stopPropagation();
    const slot = daySettings.slots[index];
    
    const hasReservation = reservations.some(r => r.date === selectedDate && r.time === slot.time && r.status !== 'cancelled');
    if (hasReservation) {
      setAlertModal({ isOpen: true, message: "該時段已有客戶預約，無法刪除！" });
      return;
    }
    
    setConfirmModal({
      isOpen: true,
      message: `確定要刪除 ${slot.time} 時段嗎？`,
      onConfirm: () => {
        const newSlots = [...daySettings.slots];
        newSlots.splice(index, 1);
        setDaySettings({ ...daySettings, slots: newSlots });
        if (editingSlotIndex === index) resetSlotForm();
        setConfirmModal({ isOpen: false, message: '', onConfirm: null });
      }
    });
  };

  const togglePurpose = (purposeName) => {
    const p = [...slotForm.purposes];
    const idx = p.indexOf(purposeName);
    if (idx >= 0) p.splice(idx, 1);
    else p.push(purposeName);
    setSlotForm({ ...slotForm, purposes: p });
  };

  // --- Purpose Manager Logic ---
  const filteredPurposes = purposesDict.filter(p => {
    if (purposeFilter === 'ALL') return true;
    const isExp = p.endDate && isBefore(parseISO(p.endDate), today);
    if (purposeFilter === 'ACTIVE') return !isExp;
    if (purposeFilter === 'EXPIRED') return isExp;
    return true;
  });

  const purposesPerPage = 5;
  const purposeTotalPages = Math.max(1, Math.ceil(filteredPurposes.length / purposesPerPage));
  const currentPurposeList = filteredPurposes.slice((purposePage - 1) * purposesPerPage, purposePage * purposesPerPage);

  const startEditPurpose = (p) => {
    setEditingPurposeId(p.id);
    setPurposeForm({ name: p.name, endDate: p.endDate || '', userLimit: p.userLimit !== undefined ? p.userLimit : -1 });
  };

  const savePurpose = async () => {
    if (!purposeForm.name.trim()) return;

    try {
      let newDict = [...purposesDict];
      if (editingPurposeId) {
        newDict = newDict.map(p => p.id === editingPurposeId ? { ...p, ...purposeForm } : p);
      } else {
        if (newDict.some(p => p.name === purposeForm.name)) {
          setAlertModal({ isOpen: true, message: "已經有相同名稱的項目了！" });
          return;
        }
        newDict.push({
          id: Date.now().toString(),
          ...purposeForm,
          createdAt: new Date().toISOString()
        });
      }
      await saveDictionary('purposes', newDict);
      setPurposesDict(newDict);
      setEditingPurposeId(null);
      setPurposeForm({ name: '', startDate: '', endDate: '', userLimit: -1, slotApprovedLimit: -1, restrictedUsers: [] });
    } catch (e) {
      setAlertModal({ isOpen: true, message: "儲存失敗：" + e.message });
    }
  };

  const deletePurpose = (p) => {
    const hasRes = reservations.some(r => r.purpose === p.name);
    if (hasRes) {
      setAlertModal({ isOpen: true, message: "此項目已有客戶預約，無法刪除！" });
      return;
    }

    setConfirmModal({
      isOpen: true,
      message: `確定要刪除「${p.name}」項目嗎？`,
      onConfirm: async () => {
        const newDict = purposesDict.filter(item => item.id !== p.id);
        await saveDictionary('purposes', newDict);
        setPurposesDict(newDict);
        setConfirmModal({ isOpen: false, message: '', onConfirm: null });
      }
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">預約設定</h1>
          <p className="text-slate-500 mt-1">設定每日可預約的時段、項目與人數上限</p>
        </div>
      </div>

      {/* Calendar View */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Top bar with filter */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center bg-white gap-4">
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-4 w-full md:w-auto">
            <span className="text-sm font-bold text-slate-600 whitespace-nowrap">顯示項目：</span>
            
            {/* Split filters: Status and Purpose */}
            <div className="flex items-center space-x-2 w-full md:w-auto">
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="p-2 border border-slate-200 rounded-lg outline-none focus:border-green-500 bg-slate-50 text-sm font-medium flex-1 md:flex-none"
              >
                <option value="ALL">全部狀態</option>
                <option value="ACTIVE">⚡ 開放中</option>
                <option value="EXPIRED">⏳ 已結束</option>
              </select>
              
              <select 
                value={filterPurpose}
                onChange={(e) => setFilterPurpose(e.target.value)}
                className="p-2 border border-slate-200 rounded-lg outline-none focus:border-green-500 bg-slate-50 text-sm font-medium flex-1 md:flex-none min-w-[120px]"
              >
                <option value="ALL">指定項目 (全部)</option>
                {purposesDict.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="p-6 relative min-h-[500px] bg-slate-50/30">
          
          {/* Calendar Header & Stats */}
          <div className="flex flex-col mb-6 gap-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800 flex items-center">
                {format(currentMonth, 'yyyy年 MM月')}
              </h2>
              <div className="flex space-x-2">
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 transition-colors">
                  <ChevronLeft className="w-5 h-5 text-slate-600" />
                </button>
                <button onClick={() => setCurrentMonth(new Date())} className="px-4 py-2 text-sm font-semibold border border-slate-200 bg-white rounded-lg hover:bg-slate-50 transition-colors text-slate-600">
                  今天
                </button>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 transition-colors">
                  <ChevronRight className="w-5 h-5 text-slate-600" />
                </button>
              </div>
            </div>

            {/* Stats Bar */}
            {purposeStats && filterPurpose !== 'ALL' && (
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex flex-wrap gap-4 md:gap-8 justify-center mt-2 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm"><Clock className="w-5 h-5" /></div>
                  <div>
                    <div className="text-xs text-slate-500 font-medium">總天數</div>
                    <div className="font-bold text-slate-800 text-lg">{purposeStats.days} <span className="text-sm font-normal text-slate-500">天</span></div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm"><List className="w-5 h-5" /></div>
                  <div>
                    <div className="text-xs text-slate-500 font-medium">總時段</div>
                    <div className="font-bold text-slate-800 text-lg">{purposeStats.slots} <span className="text-sm font-normal text-slate-500">個</span></div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shadow-sm"><Users className="w-5 h-5" /></div>
                  <div>
                    <div className="text-xs text-slate-500 font-medium">預約人數</div>
                    <div className="font-bold text-slate-800 text-lg">{purposeStats.users} <span className="text-sm font-normal text-slate-500">人</span></div>
                  </div>
                </div>
              </div>
            )}
          </div>

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
            {paddingDays.map(i => <div key={`padding-${i}`} className="min-h-[140px] rounded-xl bg-slate-50/50" />)}
            
            {days.map(date => {
              const dateStr = format(date, 'yyyy-MM-dd');
              const filteredSlots = getFilteredSlotsForDay(dateStr);
              const isOpen = filteredSlots !== null;
              
              const dayOfWeek = date.getDay();
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

              const { holidayText, isSpecialDay } = getTaiwanHolidayInfo(date);

              return (
                <div
                  key={date.toString()}
                  onClick={() => openModal(date)}
                  className={cn(
                    "min-h-[140px] p-2 md:p-3 rounded-xl border transition-all duration-200 flex flex-col items-start relative hover:shadow-md cursor-pointer",
                    isToday(date) ? "border-green-400 ring-1 ring-green-400" : "border-slate-200 hover:border-green-300",
                    isOpen ? (isWeekend ? "bg-red-50/50" : "bg-white") : (isWeekend ? "bg-red-50/30" : "bg-slate-50/80")
                  )}
                >
                  <div className="flex justify-between items-start w-full mb-2">
                    <span className={cn("text-sm font-bold", isToday(date) ? "text-green-600" : isWeekend ? "text-red-500" : "text-slate-700")}>
                      {format(date, 'd')}
                    </span>
                    {holidayText && (
                      <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-sm", isSpecialDay ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600")}>
                        {holidayText}
                      </span>
                    )}
                  </div>
                  
                  {isOpen ? (
                    <div className="flex flex-col gap-1 w-full mt-1">
                      {filteredSlots.length > 0 ? filteredSlots.map((s, idx) => {
                        const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-rose-500', 'bg-amber-500', 'bg-indigo-500', 'bg-teal-500'];
                        const colorClass = colors[idx % colors.length];
                        
                        // Calculate total reservations for this slot (ignoring cancelled)
                        const slotResCount = reservations.filter(r => r.date === dateStr && r.time === s.time && r.status !== 'cancelled').length;
                        
                        return (
                          <div key={s.time} className={`text-[10px] md:text-xs text-white px-1.5 py-1 rounded shadow-sm text-center font-medium truncate flex justify-center items-center gap-1 ${colorClass}`}>
                            <span>{s.time}</span>
                            {slotResCount > 0 && <span className="bg-white/20 px-1 rounded-sm">({slotResCount}人)</span>}
                          </div>
                        );
                      }) : (
                        <div className="text-[10px] md:text-xs text-amber-600 bg-amber-50 px-1 py-1 rounded text-center border border-amber-100">無符合時段</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-[10px] md:text-xs text-slate-400 mt-auto px-1">未開放</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Buttons Below Calendar */}
      <div className="flex space-x-2 md:space-x-4 mb-6">
        <button 
          onClick={() => {
            if (activeSection === 'purpose') setActiveSection('none');
            else {
              setActiveSection('purpose');
              setEditingPurposeId(null);
              setPurposeForm({ name: '', startDate: '', endDate: '', userLimit: -1, slotApprovedLimit: -1, restrictedUsers: [] });
            }
          }}
          className={cn(
            "flex-1 py-4 text-center font-bold text-lg transition-all flex items-center justify-center gap-2 rounded-2xl border-2 shadow-sm bg-white",
            activeSection === 'purpose' 
              ? "border-slate-800 text-slate-900 bg-slate-100" 
              : "border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300"
          )}
        >
          <List className={cn("w-6 h-6", activeSection === 'purpose' ? "text-slate-800" : "text-slate-400")} />
          管理預約項目
        </button>

        <button 
          onClick={() => {
            if (activeSection === 'access') setActiveSection('none');
            else {
              setActiveSection('access');
              const initialPurpose = purposesDict[0]?.id || '';
              setAccessPurposeId(initialPurpose);
              setLocalRestricted(purposesDict[0]?.restrictedUsers || []);
              setSelectedAllowedIds([]);
              setSelectedRestrictedIds([]);
            }
          }}
          className={cn(
            "flex-1 py-4 text-center font-bold text-lg transition-all flex items-center justify-center gap-2 rounded-2xl border-2 shadow-sm bg-white",
            activeSection === 'access' 
              ? "border-purple-500 text-purple-700 bg-purple-50" 
              : "border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300"
          )}
        >
          <ShieldAlert className={cn("w-6 h-6", activeSection === 'access' ? "text-purple-600" : "text-slate-400")} />
          管理登錄人員
        </button>
      </div>

      {/* Date Settings Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50 shrink-0">
              <h2 className="text-xl font-bold text-slate-800">
                設定預約：{selectedDate}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 flex flex-col md:flex-row gap-6">
              
              {/* Left Column: Form */}
              <div className="flex-1 space-y-5">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <h3 className="font-bold text-slate-700 mb-3 flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-green-500" />
                    {editingSlotIndex >= 0 ? '編輯時段' : '新增時段'}
                  </h3>
                  
                  <div className="flex items-center space-x-2 mb-4">
                    <select value={slotForm.ampm} onChange={e => setSlotForm({...slotForm, ampm: e.target.value})} className="p-2 border border-slate-200 rounded-lg outline-none focus:border-green-500 bg-white">
                      <option value="AM">上午</option>
                      <option value="PM">下午</option>
                    </select>
                    <select value={slotForm.hour} onChange={e => setSlotForm({...slotForm, hour: e.target.value})} className="p-2 border border-slate-200 rounded-lg outline-none focus:border-green-500 bg-white min-w-[60px]">
                      {Array.from({length: 12}, (_, i) => i === 0 ? 12 : i).map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                    <span>:</span>
                    <select value={slotForm.minute} onChange={e => setSlotForm({...slotForm, minute: e.target.value})} className="p-2 border border-slate-200 rounded-lg outline-none focus:border-green-500 bg-white min-w-[60px]">
                      <option value="00">00</option>
                      <option value="30">30</option>
                    </select>
                  </div>

                  <div className="mb-4">
                    <label className="text-sm font-bold text-slate-700 block mb-2">提供預約項目 (可複選)</label>
                    <div className="flex flex-wrap gap-2">
                      {purposesDict.map(p => {
                        const isExp = p.endDate && isBefore(parseISO(p.endDate), today);
                        return (
                          <button 
                            key={p.id} type="button"
                            onClick={() => togglePurpose(p.name)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border",
                              slotForm.purposes.includes(p.name) ? "bg-green-100 text-green-700 border-green-200" : "bg-white text-slate-600 border-slate-200 hover:border-green-300",
                              isExp && "opacity-50 line-through"
                            )}
                          >
                            {p.name} {isExp && '(已結束)'}
                          </button>
                        );
                      })}
                      {purposesDict.length === 0 && <span className="text-xs text-slate-400">請先建立預約項目</span>}
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-sm font-bold text-slate-700 block mb-2">可預約人數上限</label>
                    <select 
                      value={slotForm.maxCapacity} 
                      onChange={e => setSlotForm({...slotForm, maxCapacity: parseInt(e.target.value)})}
                      className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-green-500 bg-white"
                    >
                      <option value={-1}>不限定 (無上限)</option>
                      {Array.from({length: 20}, (_, i) => i + 1).map(num => (
                        <option key={num} value={num}>{num} 人</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex space-x-2">
                    <button 
                      onClick={addOrUpdateSlot}
                      className="flex-1 bg-slate-800 hover:bg-slate-900 text-white py-2 rounded-xl transition-colors font-medium text-sm flex items-center justify-center shadow-sm"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      {editingSlotIndex >= 0 ? '更新此時段' : '加入時段'}
                    </button>
                    {editingSlotIndex >= 0 && (
                      <button 
                        onClick={resetSlotForm}
                        className="px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 rounded-xl transition-colors font-medium text-sm"
                      >
                        取消
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Existing Slots */}
              <div className="flex-1">
                <h3 className="font-bold text-slate-700 mb-3 flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-2 text-blue-500" />
                  已建立的時段
                </h3>
                <div className="space-y-3">
                  {daySettings.slots.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                      <p className="text-sm">尚無時段，請在左側新增</p>
                    </div>
                  ) : (
                    daySettings.slots.map((s, idx) => {
                      // Fix: only count active reservations
                      const slotRes = reservations.filter(r => r.date === selectedDate && r.time === s.time && r.status !== 'cancelled');
                      const confirmedCount = slotRes.filter(r => r.status === 'confirmed').length;
                      const totalCount = slotRes.length;

                      const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-rose-500', 'bg-amber-500', 'bg-indigo-500', 'bg-teal-500'];
                      const colorClass = colors[idx % colors.length];
                      
                      return (
                        <div 
                          key={s.time}
                          onClick={() => editSlot(idx)}
                          className={`relative flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-slate-200 text-white cursor-pointer transition-transform hover:-translate-y-0.5 shadow-sm ${colorClass}`}
                        >
                          <div>
                            <div className="font-bold text-lg flex items-center">
                              {s.time}
                              {s.maxCapacity > 0 && <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded-full">上限 {s.maxCapacity}人</span>}
                            </div>
                            <div className="text-xs text-white/80 mt-1 truncate max-w-[150px]">
                              {s.purposes.join(', ')}
                            </div>
                            <div className="text-[10px] mt-1 bg-white/20 inline-block px-1.5 py-0.5 rounded">
                              已預約: {totalCount} 人 (已確認: {confirmedCount} 人)
                            </div>
                          </div>
                          <button 
                            onClick={(e) => deleteSlot(idx, e)}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors absolute right-3 top-3"
                          >
                            <Trash2 className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex space-x-3 shrink-0">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors">
                取消
              </button>
              <button onClick={handleSaveDay} disabled={saving} className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-500/20 transition-colors flex justify-center items-center">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : '儲存當日設定'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Access Manager Section */}
      {activeSection === 'access' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 flex flex-col max-h-[90vh] mb-8">
          <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50 shrink-0">
            <h2 className="text-xl font-bold text-slate-800 flex items-center">
              <ShieldAlert className="w-6 h-6 mr-2 text-purple-600" />
              管理登錄人員
            </h2>
          </div>
          
          <div className="p-6 flex-1 flex flex-col overflow-hidden">
            <div className="mb-6 flex items-center">
              <label className="font-bold text-slate-700 mr-4">請選擇預約項目：</label>
              <select 
                value={accessPurposeId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setAccessPurposeId(newId);
                  const p = purposesDict.find(x => x.id === newId);
                  setLocalRestricted(p?.restrictedUsers || []);
                  setSelectedAllowedIds([]);
                  setSelectedRestrictedIds([]);
                }}
                className="p-2.5 border-2 border-slate-200 rounded-xl outline-none focus:border-purple-500 bg-white min-w-[200px] font-bold text-slate-800 shadow-sm"
              >
                {purposesDict.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {purposesDict.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                請先新增預約項目，才能設定存取權限。
              </div>
            ) : (
              <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden min-h-[400px]">
                
                {/* Left: Allowed Users */}
                <div className="flex-1 border-2 border-slate-200 rounded-2xl flex flex-col overflow-hidden bg-slate-50">
                  <div className="bg-slate-100 p-3 border-b border-slate-200 font-bold text-slate-700 text-center flex justify-between items-center">
                    <span>可以使用的人員</span>
                    <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-xs">
                      {allUsers.filter(u => !localRestricted.includes(u.id)).length} 人
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {allUsers.filter(u => !localRestricted.includes(u.id)).map(u => {
                      const isSelected = selectedAllowedIds.includes(u.id);
                      return (
                        <div 
                          key={u.id}
                          onClick={() => {
                            setSelectedAllowedIds(prev => isSelected ? prev.filter(id => id !== u.id) : [...prev, u.id]);
                          }}
                          className={`flex items-center p-3 rounded-xl cursor-pointer transition-all border-2 ${isSelected ? 'border-purple-500 bg-purple-50' : 'border-transparent bg-white hover:border-slate-300'} shadow-sm`}
                        >
                          <img src={u.pictureUrl || 'https://via.placeholder.com/150'} alt="avatar" className="w-10 h-10 rounded-full mr-3 border border-slate-200" />
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-slate-800 truncate">{u.displayName}</div>
                            <div className="text-xs text-slate-500 truncate flex gap-1 mt-0.5">
                              {u.gender && <span className="bg-slate-100 px-1 rounded">{u.gender}</span>}
                              {u.tags && u.tags.slice(0,2).map(t => <span key={t} className="bg-slate-100 px-1 rounded truncate">{t}</span>)}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Middle Buttons */}
                <div className="flex md:flex-col justify-center items-center gap-3 py-4 md:py-0 shrink-0">
                  <button
                    onClick={() => {
                      if(selectedAllowedIds.length > 0) {
                        setLocalRestricted([...localRestricted, ...selectedAllowedIds]);
                        setSelectedAllowedIds([]);
                      }
                    }}
                    disabled={selectedAllowedIds.length === 0}
                    className="p-3 bg-purple-100 hover:bg-purple-200 text-purple-700 disabled:opacity-50 disabled:hover:bg-purple-100 rounded-full transition-colors"
                    title="移至限制名單"
                  >
                    <ArrowRight className="w-5 h-5 hidden md:block" />
                    <div className="w-5 h-5 md:hidden text-center leading-5 font-bold">↓</div>
                  </button>
                  <button
                    onClick={() => {
                      if(selectedRestrictedIds.length > 0) {
                        setLocalRestricted(localRestricted.filter(id => !selectedRestrictedIds.includes(id)));
                        setSelectedRestrictedIds([]);
                      }
                    }}
                    disabled={selectedRestrictedIds.length === 0}
                    className="p-3 bg-slate-200 hover:bg-slate-300 text-slate-700 disabled:opacity-50 disabled:hover:bg-slate-200 rounded-full transition-colors"
                    title="移至可用名單"
                  >
                    <ArrowLeft className="w-5 h-5 hidden md:block" />
                    <div className="w-5 h-5 md:hidden text-center leading-5 font-bold">↑</div>
                  </button>
                </div>

                {/* Right: Restricted Users */}
                <div className="flex-1 border-2 border-slate-200 rounded-2xl flex flex-col overflow-hidden bg-slate-50">
                  <div className="bg-red-50 p-3 border-b border-red-100 font-bold text-red-700 text-center flex justify-between items-center">
                    <span>限制存取人員</span>
                    <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-xs">
                      {localRestricted.length} 人
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {allUsers.filter(u => localRestricted.includes(u.id)).map(u => {
                      const isSelected = selectedRestrictedIds.includes(u.id);
                      return (
                        <div 
                          key={u.id}
                          onClick={() => {
                            setSelectedRestrictedIds(prev => isSelected ? prev.filter(id => id !== u.id) : [...prev, u.id]);
                          }}
                          className={`flex items-center p-3 rounded-xl cursor-pointer transition-all border-2 ${isSelected ? 'border-red-500 bg-red-50' : 'border-transparent bg-white hover:border-slate-300'} shadow-sm`}
                        >
                          <img src={u.pictureUrl || 'https://via.placeholder.com/150'} alt="avatar" className="w-10 h-10 rounded-full mr-3 border border-slate-200" />
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-slate-800 truncate">{u.displayName}</div>
                            <div className="text-xs text-slate-500 truncate flex gap-1 mt-0.5">
                              {u.gender && <span className="bg-slate-100 px-1 rounded">{u.gender}</span>}
                              {u.tags && u.tags.slice(0,2).map(t => <span key={t} className="bg-slate-100 px-1 rounded truncate">{t}</span>)}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    {localRestricted.length === 0 && (
                      <div className="text-center text-slate-400 py-8 text-sm font-medium">目前沒有限制人員</div>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>

          <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0 flex justify-end">
            <button 
              onClick={async () => {
                if (!accessPurposeId) return;
                try {
                  let newDict = purposesDict.map(p => {
                    if (p.id === accessPurposeId) {
                      return { ...p, restrictedUsers: localRestricted };
                    }
                    return p;
                  });
                  await saveDictionary('purposes', newDict);
                  setPurposesDict(newDict);
                  setAlertModal({ isOpen: true, message: "存取權限儲存成功！" });
                } catch (e) {
                  setAlertModal({ isOpen: true, message: "儲存失敗：" + e.message });
                }
              }}
              disabled={!accessPurposeId}
              className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg shadow-purple-600/30 transition-colors disabled:opacity-50"
            >
              儲存設定
            </button>
          </div>
        </div>
      )}

      {/* Purpose Manager Section */}
      {activeSection === 'purpose' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 mb-8">
          <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
            <h2 className="text-xl font-bold text-slate-800 flex items-center">
              <List className="w-5 h-5 mr-2 text-slate-500" />
              管理預約項目
            </h2>
          </div>
          
          <div className="p-6">
              
              {/* Add/Edit Form */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                <h3 className="font-bold text-slate-700 mb-3 text-sm">{editingPurposeId ? '編輯項目' : '新增預約項目'}</h3>
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1 min-w-[120px]">
                    <label className="text-xs font-bold text-slate-500 mb-1 block">項目名稱</label>
                    <input 
                      type="text" 
                      value={purposeForm.name}
                      onChange={e => setPurposeForm({...purposeForm, name: e.target.value})}
                      disabled={editingPurposeId && reservations.some(r => r.purpose === purposesDict.find(x => x.id === editingPurposeId)?.name)}
                      placeholder="例如：剪髮、燙髮"
                      className="w-full p-2 rounded-lg border border-slate-200 focus:border-green-500 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>
                  <div className="flex-1 min-w-[100px]">
                    <label className="text-xs font-bold text-slate-500 mb-1 block">限制預約次數</label>
                    <select
                      value={purposeForm.userLimit}
                      onChange={e => setPurposeForm({...purposeForm, userLimit: parseInt(e.target.value)})}
                      className="w-full p-2 rounded-lg border border-slate-200 focus:border-green-500 outline-none bg-white"
                    >
                      <option value={-1}>無限制</option>
                      {Array.from({length: 10}, (_, i) => i + 1).map(num => (
                        <option key={num} value={num}>最多 {num} 次</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 min-w-[120px]">
                    <label className="text-xs font-bold text-slate-500 mb-1 block">時段核准人數</label>
                    <select
                      value={purposeForm.slotApprovedLimit}
                      onChange={e => setPurposeForm({...purposeForm, slotApprovedLimit: parseInt(e.target.value)})}
                      className="w-full p-2 rounded-lg border border-slate-200 focus:border-green-500 outline-none bg-white"
                    >
                      <option value={-1}>無限制</option>
                      {Array.from({length: 20}, (_, i) => i + 1).map(num => (
                        <option key={num} value={num}>最多 {num} 人</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 min-w-[120px]">
                    <label className="text-xs font-bold text-slate-500 mb-1 block">開始日期 (選填)</label>
                    <input 
                      type="date" 
                      value={purposeForm.startDate}
                      onChange={e => setPurposeForm({...purposeForm, startDate: e.target.value})}
                      className="w-full p-2 rounded-lg border border-slate-200 focus:border-green-500 outline-none"
                    />
                  </div>
                  <div className="flex-1 min-w-[120px]">
                    <label className="text-xs font-bold text-slate-500 mb-1 block">結束日期 (選填)</label>
                    <input 
                      type="date" 
                      value={purposeForm.endDate}
                      onChange={e => setPurposeForm({...purposeForm, endDate: e.target.value})}
                      className="w-full p-2 rounded-lg border border-slate-200 focus:border-green-500 outline-none"
                    />
                  </div>
                  <div className="flex items-end">
                    <button 
                      onClick={savePurpose}
                      disabled={!purposeForm.name.trim()}
                      className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2 rounded-lg font-bold disabled:opacity-50 transition-colors h-[42px]"
                    >
                      {editingPurposeId ? '儲存' : '新增'}
                    </button>
                    {editingPurposeId && (
                      <button 
                        onClick={() => {
                          setEditingPurposeId(null);
                          setPurposeForm({ name: '', startDate: '', endDate: '', userLimit: -1, slotApprovedLimit: -1, restrictedUsers: [] });
                        }}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-600 px-4 py-2 rounded-lg font-bold transition-colors h-[42px] ml-2"
                      >
                        取消
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Filter */}
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm font-bold text-slate-600">
                  總計：{filteredPurposes.length} 筆
                </div>
                <select 
                  value={purposeFilter}
                  onChange={e => {
                    setPurposeFilter(e.target.value);
                    setPurposePage(1);
                  }}
                  className="p-2 border border-slate-200 rounded-lg bg-white text-sm outline-none font-medium"
                >
                  <option value="ALL">顯示全部</option>
                  <option value="ACTIVE">還可以預約項目</option>
                  <option value="EXPIRED">預約項目已結束</option>
                </select>
              </div>

              {/* List */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 w-16">序號</th>
                      <th className="px-4 py-3">項目名稱</th>
                      <th className="px-4 py-3 w-28">次數上限</th>
                      <th className="px-4 py-3 w-32">結束日期</th>
                      <th className="px-4 py-3 w-24">狀態</th>
                      <th className="px-4 py-3 w-24 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPurposeList.map((p, idx) => {
                      const absoluteIdx = (purposePage - 1) * purposesPerPage + idx + 1;
                      const isExp = p.endDate && isBefore(parseISO(p.endDate), today);
                      return (
                        <tr key={p.id} className="border-b border-slate-100 bg-white hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-500">{absoluteIdx}</td>
                          <td className="px-4 py-3 font-bold text-slate-800">{p.name}</td>
                          <td className="px-4 py-3 text-slate-600 font-medium">
                            {p.userLimit && p.userLimit !== -1 ? (
                              <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs mr-2 border border-blue-100">個人限 {p.userLimit} 次</span>
                            ) : null}
                            {p.slotApprovedLimit && p.slotApprovedLimit !== -1 ? (
                              <span className="text-purple-600 bg-purple-50 px-2 py-0.5 rounded text-xs border border-purple-100">時段限 {p.slotApprovedLimit} 人</span>
                            ) : null}
                            {(!p.userLimit || p.userLimit === -1) && (!p.slotApprovedLimit || p.slotApprovedLimit === -1) && (
                              <span className="text-slate-400 text-xs">無限制</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-xs">
                            {p.startDate ? <div className="text-green-600">起: {p.startDate}</div> : <div className="text-slate-400">起: 不限</div>}
                            {p.endDate ? <div className="text-red-600">迄: {p.endDate}</div> : <div className="text-slate-400">迄: 不限</div>}
                          </td>
                          <td className="px-4 py-3">
                            {isExp ? (
                              <span className="bg-red-50 text-red-600 px-2 py-1 rounded text-xs font-bold border border-red-100">已結束</span>
                            ) : (
                              <span className="bg-green-50 text-green-600 px-2 py-1 rounded text-xs font-bold border border-green-100">開放中</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right flex justify-end space-x-1">
                            <button onClick={() => startEditPurpose(p)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => deletePurpose(p)} className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                    {currentPurposeList.length === 0 && (
                      <tr>
                        <td colSpan="6" className="text-center py-8 text-slate-400">目前沒有符合的項目資料</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {purposeTotalPages > 1 && (
                <div className="flex justify-center items-center mt-6 space-x-4">
                  <button 
                    disabled={purposePage === 1}
                    onClick={() => setPurposePage(p => p - 1)}
                    className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-sm font-bold text-slate-600">
                    {purposePage} / {purposeTotalPages}
                  </span>
                  <button 
                    disabled={purposePage === purposeTotalPages}
                    onClick={() => setPurposePage(p => p + 1)}
                    className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}

            </div>
          </div>
      )}

      {/* Alert Modal */}
      {alertModal.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl max-w-sm w-full p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">提示</h3>
            <p className="text-slate-500 mb-6 font-medium">{alertModal.message}</p>
            <button onClick={() => setAlertModal({ isOpen: false, message: '' })} className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-colors">
              確定
            </button>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl max-w-sm w-full p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">確認執行</h3>
            <p className="text-slate-500 mb-6 font-medium">{confirmModal.message}</p>
            <div className="flex space-x-3">
              <button onClick={() => setConfirmModal({ isOpen: false, message: '', onConfirm: null })} className="flex-1 py-3 bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold rounded-xl transition-colors">
                取消
              </button>
              <button onClick={confirmModal.onConfirm} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 transition-colors">
                確定執行
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
