import { useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isBefore, startOfDay, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2, X, Plus, Clock, Users, BookOpen, Trash2, AlertCircle, Edit2, CheckCircle2, List } from 'lucide-react';
import { cn } from '../../utils/cn';
import { getAvailability, saveAvailability, getDictionary, saveDictionary, getAdminReservations } from '../../services/db';

export default function AdminAvailability() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availability, setAvailability] = useState({});
  const [reservations, setReservations] = useState([]);
  const [purposesDict, setPurposesDict] = useState([]); // Array of { id, name, endDate, createdAt }
  const [loading, setLoading] = useState(false);
  
  // Calendar Filter
  const [filterPurpose, setFilterPurpose] = useState(''); // '' means all, 'ACTIVE', 'EXPIRED', or specific purpose ID/name
  
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
    purposes: [], // Array of purpose names
    maxCapacity: -1
  });

  // Purpose management Modal
  const [showPurposeManager, setShowPurposeManager] = useState(false);
  const [purposePage, setPurposePage] = useState(1);
  const [purposeFilter, setPurposeFilter] = useState('ALL'); // 'ALL', 'ACTIVE', 'EXPIRED'
  const [editingPurposeId, setEditingPurposeId] = useState(null);
  const [purposeForm, setPurposeForm] = useState({ name: '', endDate: '' });

  // Custom Alert/Confirm Modals
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '' });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null });

  const monthStr = format(currentMonth, 'yyyy-MM');

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
    
    // Auto-migrate strings to objects if needed
    let migratedDict = [...dictData];
    let needsMigration = false;
    migratedDict = migratedDict.map(item => {
      if (typeof item === 'string') {
        needsMigration = true;
        return {
          id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
          name: item,
          endDate: '',
          createdAt: new Date().toISOString()
        };
      }
      return item;
    });

    if (needsMigration) {
      await saveDictionary('purposes', migratedDict);
    }

    setAvailability(availData);
    setPurposesDict(migratedDict);
    setReservations(resData);
    setLoading(false);
  };

  // --- Calendar Logistics ---
  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startDay = startOfMonth(currentMonth).getDay();
  const paddingDays = Array.from({ length: startDay }, (_, i) => i);
  const today = startOfDay(new Date());

  const getFilteredSlotsForDay = (dateStr) => {
    const settings = availability[dateStr];
    if (!settings?.isOpen) return null;
    let slots = settings.slots || [];
    
    if (filterPurpose) {
      if (filterPurpose === 'ACTIVE') {
        // Only show slots that have at least one active purpose
        slots = slots.filter(s => s.purposes.some(pName => {
          const pObj = purposesDict.find(pd => pd.name === pName);
          return !pObj?.endDate || !isBefore(parseISO(pObj.endDate), today);
        }));
      } else if (filterPurpose === 'EXPIRED') {
        // Only show slots that have at least one expired purpose
        slots = slots.filter(s => s.purposes.some(pName => {
          const pObj = purposesDict.find(pd => pd.name === pName);
          return pObj?.endDate && isBefore(parseISO(pObj.endDate), today);
        }));
      } else {
        // Specific purpose name
        slots = slots.filter(s => s.purposes.includes(filterPurpose));
      }
    }
    return slots;
  };

  // --- Day Modal Logic ---
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
    
    const hasReservation = reservations.some(r => r.date === selectedDate && r.time === slot.time);
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
    const hasRes = reservations.some(r => r.purpose === p.name);
    if (hasRes) {
      setAlertModal({ isOpen: true, message: "此項目已有客戶預約，無法編輯名稱與結束日期！" });
      return;
    }
    setEditingPurposeId(p.id);
    setPurposeForm({ name: p.name, endDate: p.endDate || '' });
  };

  const savePurpose = async () => {
    if (!purposeForm.name.trim()) return;
    
    let newDict = [...purposesDict];
    if (editingPurposeId) {
      newDict = newDict.map(p => p.id === editingPurposeId ? { ...p, name: purposeForm.name, endDate: purposeForm.endDate } : p);
    } else {
      newDict.push({
        id: Date.now().toString(),
        name: purposeForm.name.trim(),
        endDate: purposeForm.endDate,
        createdAt: new Date().toISOString()
      });
    }

    try {
      await saveDictionary('purposes', newDict);
      setPurposesDict(newDict);
      setEditingPurposeId(null);
      setPurposeForm({ name: '', endDate: '' });
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
        <button 
          onClick={() => {
            setShowPurposeManager(true);
            setEditingPurposeId(null);
            setPurposeForm({ name: '', endDate: '' });
          }}
          className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl flex items-center space-x-2 transition-colors shadow-sm"
        >
          <List className="w-5 h-5" />
          <span>管理預約項目</span>
        </button>
      </div>

      {/* Calendar View */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Top bar with filter */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center bg-white gap-4">
          <div className="flex items-center space-x-2 w-full md:w-auto">
            <span className="text-sm font-bold text-slate-600 whitespace-nowrap">顯示項目：</span>
            <select 
              value={filterPurpose}
              onChange={(e) => setFilterPurpose(e.target.value)}
              className="p-2 border border-slate-200 rounded-lg outline-none focus:border-green-500 bg-slate-50 text-sm w-full md:w-auto"
            >
              <option value="">顯示全部</option>
              <option value="ACTIVE">⚡ 還可以預約的項目</option>
              <option value="EXPIRED">⏳ 已結束的項目</option>
              <optgroup label="指定項目">
                {purposesDict.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-bold text-slate-800">{format(currentMonth, 'yyyy 年 MM 月')}</h2>
            <div className="flex space-x-2">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 relative min-h-[500px] bg-slate-50/30">
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

              return (
                <div
                  key={date.toString()}
                  onClick={() => openModal(date)}
                  className={cn(
                    "min-h-[140px] p-2 md:p-3 rounded-xl border transition-all duration-200 flex flex-col items-start relative hover:shadow-md cursor-pointer",
                    isToday(date) ? "border-green-400 ring-1 ring-green-400" : "border-slate-200 hover:border-green-300",
                    isOpen ? "bg-white" : "bg-slate-50/80"
                  )}
                >
                  <span className={cn("text-sm font-bold mb-2", isToday(date) ? "text-green-600" : "text-slate-700")}>
                    {format(date, 'd')}
                  </span>
                  
                  {isOpen ? (
                    <div className="flex flex-col gap-1 w-full mt-1">
                      {filteredSlots.length > 0 ? filteredSlots.map((s, idx) => {
                        const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-rose-500', 'bg-amber-500', 'bg-indigo-500', 'bg-teal-500'];
                        const colorClass = colors[idx % colors.length];
                        return (
                          <div key={s.time} className={`text-[10px] md:text-xs text-white px-1.5 py-1 rounded shadow-sm text-center font-medium truncate ${colorClass}`}>
                            {s.time}
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
                      const slotRes = reservations.filter(r => r.date === selectedDate && r.time === s.time);
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

      {/* Purpose Manager Modal */}
      {showPurposeManager && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center">
                <List className="w-5 h-5 mr-2 text-slate-500" />
                管理預約項目
              </h2>
              <button onClick={() => setShowPurposeManager(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              
              {/* Add/Edit Form */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                <h3 className="font-bold text-slate-700 mb-3 text-sm">{editingPurposeId ? '編輯項目' : '新增預約項目'}</h3>
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-slate-500 mb-1 block">項目名稱</label>
                    <input 
                      type="text" 
                      value={purposeForm.name}
                      onChange={e => setPurposeForm({...purposeForm, name: e.target.value})}
                      placeholder="例如：剪髮、燙髮"
                      className="w-full p-2 rounded-lg border border-slate-200 focus:border-green-500 outline-none"
                    />
                  </div>
                  <div className="flex-1">
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
                          setPurposeForm({ name: '', endDate: '' });
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
                          <td className="px-4 py-3 text-slate-600">{p.endDate || '無期限'}</td>
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
                        <td colSpan="5" className="text-center py-8 text-slate-400">目前沒有符合的項目資料</td>
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
