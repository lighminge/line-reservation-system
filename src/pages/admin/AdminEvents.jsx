import { useState, useEffect, useRef } from 'react';
import { getAllEvents, saveEvent, deleteEvent, getAllUsers, uploadImage, resolveImageUrl, getMessageTemplates, getDictTags } from '../../services/db';
import { Calendar, Clock, Image as ImageIcon, Plus, Trash2, Edit2, Users, Search, X, MessageSquare, Check, ChevronLeft, ChevronRight, AlertCircle, BookmarkPlus, Tag } from 'lucide-react';
import { cn } from '../../utils/cn';
import RichTextEditor from '../../components/RichTextEditor';
import QuickRepliesModal from '../../components/QuickRepliesModal';
import TimePicker from '../../components/TimePicker';
import DatePicker from '../../components/DatePicker';

export default function AdminEvents() {
  const [activeTab, setActiveTab] = useState('events'); // 'events' or 'sentUsers'

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // User selection states
  const [allUsers, setAllUsers] = useState([]);
  const [globalTags, setGlobalTags] = useState([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userFilterTag, setUserFilterTag] = useState('');
  const [modalUserPage, setModalUserPage] = useState(1);
  const [modalUserPageSize, setModalUserPageSize] = useState(10);
  
  // Filter States
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Sent Users Tab States
  const [selectedSentEventId, setSelectedSentEventId] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [saving, setSaving] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, eventId: null });
  
  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [messageTitle, setMessageTitle] = useState('活動通知');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imageAspectRatio, setImageAspectRatio] = useState('1.51:1');
  const [sendDate, setSendDate] = useState('');
  const [sendTime, setSendTime] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  
  const [useOriginalLineName, setUseOriginalLineName] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [eventsData, usersData, templates, tagsData] = await Promise.all([
        getAllEvents(),
        getAllUsers(),
        getMessageTemplates(),
        getDictTags()
      ]);
      
      // Sort events by sendDate and sendTime
      eventsData.sort((a, b) => {
        const dateTimeA = new Date(`${a.sendDate}T${a.sendTime}`);
        const dateTimeB = new Date(`${b.sendDate}T${b.sendTime}`);
        return dateTimeB - dateTimeA;
      });

      setEvents(eventsData);
      setAllUsers(usersData);
      setGlobalTags(tagsData || []);
      if (templates?.settings?.useOriginalLineNameForPush) {
        setUseOriginalLineName(true);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleOpenModal = async (ev = null) => {
    setEditingEvent(ev);
    if (ev) {
      setTitle(ev.title || '');
      setContent(ev.content || '');
      setMessageTitle(ev.messageTitle || '活動通知');
      setSendDate(ev.sendDate || '');
      setSendTime(ev.sendTime || '');
      setSelectedUserIds(ev.targetUsers ? ev.targetUsers.map(u => u.userId) : []);
      setImageUrl(ev.imageUrl || '');
      setImageFile(null);
      if (ev.imageUrl) {
        const resolved = await resolveImageUrl(ev.imageUrl);
        setImagePreview(resolved);
      } else {
        setImagePreview('');
      }
      setImageAspectRatio(ev.imageAspectRatio || '1.51:1');
    } else {
      setTitle('');
      setContent('');
      setMessageTitle('活動通知');
      setSendDate('');
      setSendTime('');
      setSelectedUserIds([]);
      setImageUrl('');
      setImageFile(null);
      setImagePreview('');
      setImageAspectRatio('1.51:1');
    }
    setIsModalOpen(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageFile(file);
        setImagePreview(reader.result);
        const img = new Image();
        img.onload = () => {
          setImageAspectRatio(`${img.width}:${img.height}`);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title || !sendDate || !sendTime || (!content && !imageFile && !imageUrl)) {
      alert("請填寫活動標題、排程時間，以及(推播內容或圖片)");
      return;
    }
    if (selectedUserIds.length === 0) {
      alert("請至少選擇一位用戶");
      return;
    }

    setSaving(true);
    try {
      let finalImageUrl = imageUrl;
      if (imageFile) {
        finalImageUrl = await uploadImage(imageFile, `events/${Date.now()}_${imageFile.name}`);
      }

      const targetUsers = selectedUserIds.map(id => {
        const u = allUsers.find(u => u.userId === id || u.id === id);
        if (u) {
          let name = u.displayName || '用戶';
          if (useOriginalLineName && u.originalLineName) name = u.originalLineName;
          return { userId: u.userId, displayName: name };
        }
        return null;
      }).filter(Boolean);

      const eventData = {
        title,
        messageTitle,
        content,
        imageUrl: finalImageUrl,
        imageAspectRatio,
        sendDate,
        sendTime,
        targetUsers
      };

      await saveEvent(editingEvent?.id, eventData);
      await fetchData();
      setIsModalOpen(false);
    } catch (error) {
      alert("儲存失敗：" + error.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (deleteModal.eventId) {
      await deleteEvent(deleteModal.eventId);
      setDeleteModal({ isOpen: false, eventId: null });
      await fetchData();
    }
  };

  const applyQuickReply = (htmlText) => {
    setContent(htmlText);
    setQrModalOpen(false);
  };

  const filteredUsers = allUsers.filter(u => {
    if (userFilterTag && userFilterTag !== 'all') {
      if (!u.tags || !u.tags.includes(userFilterTag)) return false;
    }
    if (!userSearchTerm) return true;
    const term = userSearchTerm.toLowerCase();
    return (u.displayName || '').toLowerCase().includes(term) || (u.originalLineName || '').toLowerCase().includes(term);
  });

  const modalTotalPages = Math.ceil(filteredUsers.length / modalUserPageSize) || 1;
  const paginatedUsers = filteredUsers.slice((modalUserPage - 1) * modalUserPageSize, modalUserPage * modalUserPageSize);

  useEffect(() => {
    if (modalUserPage > modalTotalPages) {
      setModalUserPage(modalTotalPages);
    }
  }, [filteredUsers.length, modalUserPageSize, modalUserPage, modalTotalPages]);

  const toggleUser = (userId) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds(selectedUserIds.filter(id => id !== userId));
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  const selectAllFiltered = () => {
    const ids = filteredUsers.map(u => u.userId);
    const newSelected = [...new Set([...selectedUserIds, ...ids])];
    setSelectedUserIds(newSelected);
  };

  const deselectAllFiltered = () => {
    const ids = filteredUsers.map(u => u.userId);
    const newSelected = selectedUserIds.filter(id => !ids.includes(id));
    setSelectedUserIds(newSelected);
  };

  // Main Events Filter & Pagination
  const filteredEvents = events.filter(ev => {
    if (filterStatus !== 'all' && ev.status !== filterStatus) return false;
    if (filterStartDate && ev.sendDate < filterStartDate) return false;
    if (filterEndDate && ev.sendDate > filterEndDate) return false;
    if (searchKeyword) {
      const kw = searchKeyword.toLowerCase();
      const t = (ev.title || '').toLowerCase();
      const c = (ev.content || '').toLowerCase();
      if (!t.includes(kw) && !c.includes(kw)) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredEvents.length / pageSize) || 1;
  const paginatedEvents = filteredEvents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [filteredEvents.length, pageSize, currentPage, totalPages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Tabs */}
      <div className="bg-white comic-box border-[3px] border-black overflow-hidden">
        <div className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-yellow-300 border-b-[3px] border-black">
          <h1 className="text-2xl font-black text-black flex items-center gap-2">
            <MessageSquare className="w-8 h-8 text-black" />
            活動通知管理
          </h1>
          <div className="flex gap-2 w-full md:w-auto">
            <button 
              onClick={() => setActiveTab('events')}
              className={cn(
                "flex-1 md:flex-none px-4 py-2 font-black border-2 border-black comic-box-sm transition-transform active:scale-95",
                activeTab === 'events' ? "bg-black text-white" : "bg-white text-black hover:bg-slate-100"
              )}
            >
              活動列表
            </button>
            <button 
              onClick={() => setActiveTab('sentUsers')}
              className={cn(
                "flex-1 md:flex-none px-4 py-2 font-black border-2 border-black comic-box-sm transition-transform active:scale-95",
                activeTab === 'sentUsers' ? "bg-black text-white" : "bg-white text-black hover:bg-slate-100"
              )}
            >
              已通知人員清單
            </button>
            <button 
              onClick={() => setActiveTab('messageFormat')}
              className={cn(
                "flex-1 md:flex-none px-4 py-2 font-black border-2 border-black comic-box-sm transition-transform active:scale-95",
                activeTab === 'messageFormat' ? "bg-black text-white" : "bg-white text-black hover:bg-slate-100"
              )}
            >
              活動訊息清單
            </button>
          </div>
        </div>

        {activeTab === 'events' && (
          <div className="p-4 bg-cyan-100 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">狀態:</span>
                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="p-2 border-2 border-black outline-none font-bold comic-box-sm bg-white"
                >
                  <option value="all">全部</option>
                  <option value="pending">排程中</option>
                  <option value="sent">已發送</option>
                </select>
              </div>

              {/* Date Filter */}
              <div className="flex flex-col xl:flex-row items-start xl:items-center gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm whitespace-nowrap">期間:</span>
                  <div className="bg-white comic-box-sm">
                    <DatePicker 
                      value={filterStartDate}
                      onChange={(val) => setFilterStartDate(val)}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold hidden xl:inline">~</span>
                  <span className="font-bold text-sm xl:hidden whitespace-nowrap">至:</span>
                  <div className="bg-white comic-box-sm">
                    <DatePicker 
                      value={filterEndDate}
                      onChange={(val) => setFilterEndDate(val)}
                    />
                  </div>
                </div>
              </div>

              {/* Keyword Search */}
              <div className="relative">
                <input 
                  type="text"
                  placeholder="搜尋活動標題或內容..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="p-2 pl-8 border-2 border-black outline-none font-bold comic-box-sm bg-white w-full md:w-64"
                />
                <Search className="w-4 h-4 text-slate-500 absolute left-2 top-3" />
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="flex gap-3 text-sm font-black bg-white p-2 border-2 border-black comic-box-sm">
                <span>總計: {events.length}</span>
                <span className="text-green-600">已發送: {events.filter(e => e.status === 'sent').length}</span>
                <span className="text-yellow-600">排程中: {events.filter(e => e.status === 'pending').length}</span>
              </div>

            <button 
              onClick={() => handleOpenModal()}
              className="bg-green-400 hover:bg-green-300 text-black px-4 py-2 border-2 border-black comic-box-sm font-black flex items-center gap-2 transition-transform active:scale-95 shadow-[2px_2px_0_0_#000] whitespace-nowrap w-full md:w-auto justify-center"
            >
              <Plus className="w-5 h-5" />
              新增活動
            </button>
            </div>
          </div>
        )}
      </div>

      {activeTab === 'events' && (
        <div className="space-y-4">
          {/* Pagination Controls Moved to Top */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-3 border-2 border-black comic-box-sm">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">每頁顯示:</span>
              <select 
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="p-1 border-2 border-black outline-none font-bold bg-slate-50"
              >
                <option value={5}>5 筆</option>
                <option value={10}>10 筆</option>
                <option value={15}>15 筆</option>
                <option value={20}>20 筆</option>
              </select>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 border-2 border-black comic-box-sm transition-transform active:scale-95"
                >
                  <ChevronLeft className="w-5 h-5 font-black" />
                </button>
                <span className="font-black text-lg">
                  第 {currentPage} 頁 / 共 {totalPages} 頁
                </span>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 border-2 border-black comic-box-sm transition-transform active:scale-95"
                >
                  <ChevronRight className="w-5 h-5 font-black" />
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedEvents.map(ev => {
              const isSent = ev.status === 'sent';
              return (
                <div key={ev.id} className="bg-white border-[3px] border-black comic-box flex flex-col hover:shadow-[8px_8px_0_0_#000] transition-all overflow-hidden relative">
                  {isSent && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 border-2 border-black font-black rotate-12 z-10">
                      已發送
                    </div>
                  )}
                  {ev.status === 'pending' && (
                    <div className="absolute top-2 right-2 bg-yellow-400 text-black text-xs px-2 py-1 border-2 border-black font-black -rotate-6 z-10">
                      排程中
                    </div>
                  )}
                  
                  <div className="p-4 border-b-2 border-black bg-slate-100 flex-1 relative">
                    <span className="absolute left-2 top-2 text-xs font-black text-slate-400">
                      #{events.length - events.findIndex(e => e.id === ev.id)}
                    </span>
                    <h3 className="text-xl font-black mb-2 line-clamp-1 pr-14 mt-4">{ev.title}</h3>
                    
                    <div className="space-y-2 mt-4 text-sm font-bold text-slate-700">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        日期: {ev.sendDate}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        時間: {ev.sendTime}
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        人數: 共 {ev.targetUsers?.length || 0} 人
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex bg-white">
                    <button 
                      onClick={() => handleOpenModal(ev)}
                      disabled={isSent}
                      className="flex-1 py-3 font-black text-black border-r-2 border-black hover:bg-slate-100 disabled:opacity-50 disabled:bg-slate-200"
                    >
                      編輯
                    </button>
                    <button 
                      onClick={() => setDeleteModal({ isOpen: true, eventId: ev.id })}
                      className="flex-1 py-3 font-black text-red-600 hover:bg-red-50"
                    >
                      刪除
                    </button>
                  </div>
                </div>
              )
            })}
            {filteredEvents.length === 0 && (
              <div className="col-span-full p-12 bg-white text-center border-[3px] border-black border-dashed comic-box">
                <p className="text-slate-500 font-bold text-lg">找不到符合條件的活動通知</p>
              </div>
            )}
          </div>

          {/* Bottom Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-6">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 bg-white hover:bg-slate-100 disabled:opacity-50 border-[3px] border-black comic-box-sm transition-transform active:scale-95"
              >
                <ChevronLeft className="w-6 h-6 text-black font-black" />
              </button>
              <span className="font-black text-lg text-black bg-white px-4 py-2 border-[3px] border-black comic-box-sm">
                第 {currentPage} 頁 / 共 {totalPages} 頁
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 bg-white hover:bg-slate-100 disabled:opacity-50 border-[3px] border-black comic-box-sm transition-transform active:scale-95"
              >
                <ChevronRight className="w-6 h-6 text-black font-black" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Sent Users Tab */}
      {activeTab === 'sentUsers' && (
        <div className="bg-white comic-box border-[3px] border-black p-6">
          <div className="mb-6">
            <label className="block text-lg font-black mb-2">請選擇已發送的活動：</label>
            <select 
              value={selectedSentEventId}
              onChange={(e) => setSelectedSentEventId(e.target.value)}
              className="w-full md:w-1/2 p-3 border-2 border-black outline-none font-bold comic-box-sm bg-yellow-50 focus:bg-yellow-100"
            >
              <option value="">-- 選擇活動 --</option>
              {events.filter(e => e.status === 'sent').map(ev => (
                <option key={ev.id} value={ev.id}>
                  {ev.sendDate} {ev.sendTime} - {ev.title}
                </option>
              ))}
            </select>
          </div>

          {selectedSentEventId ? (
            <div className="border-2 border-black comic-box-sm overflow-hidden">
              <div className="bg-slate-800 text-white p-3 font-black flex justify-between items-center">
                <span>發送名單</span>
                <span className="text-sm bg-white/20 px-2 py-1 rounded">
                  共 {events.find(e => e.id === selectedSentEventId)?.targetUsers?.length || 0} 人
                </span>
              </div>
              <div className="divide-y-2 divide-black">
                {events.find(e => e.id === selectedSentEventId)?.targetUsers?.map((u, idx) => (
                  <div key={idx} className="p-3 bg-white flex items-center gap-3 hover:bg-slate-50">
                    <div className="w-8 h-8 rounded-full bg-cyan-200 border-2 border-black flex items-center justify-center font-black">
                      {idx + 1}
                    </div>
                    <span className="font-bold">{u.displayName}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center p-12 text-slate-500 font-bold border-2 border-dashed border-slate-300 comic-box-sm">
              請從上方選擇一個已發送的活動來檢視名單
            </div>
          )}
        </div>
      )}

      {activeTab === 'messageFormat' && (
        <div className="bg-white p-6 comic-box border-[3px] border-black space-y-6">
          <h2 className="text-xl font-black flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-blue-500" />
            已發送活動訊息預覽
          </h2>
          
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <span className="font-bold">請選擇已發送活動：</span>
            <select
              value={selectedSentEventId}
              onChange={(e) => setSelectedSentEventId(e.target.value)}
              className="flex-1 p-2 border-2 border-black comic-box-sm font-bold bg-slate-50 outline-none"
            >
              <option value="">-- 請選擇 --</option>
              {events.filter(e => e.status === 'sent').map(ev => (
                <option key={ev.id} value={ev.id}>
                  {ev.sendDate} {ev.sendTime} - {ev.title}
                </option>
              ))}
            </select>
          </div>

          {selectedSentEventId && (
            <div className="mt-6 border-2 border-black p-4 bg-slate-50 relative">
              {(() => {
                const ev = events.find(e => e.id === selectedSentEventId);
                if (!ev) return null;
                return (
                  <div className="space-y-4 max-w-sm mx-auto bg-[#849ebf] p-4 rounded-xl">
                    <div className="bg-white rounded-xl overflow-hidden shadow-sm relative">
                      {/* Header */}
                      <div className="bg-[#00B900] p-3">
                        <div dangerouslySetInnerHTML={{ __html: (ev.messageTitle || '').replace(/{好友的顯示名稱}/g, '用戶').replace(/{帳號名稱}/g, '用戶') }} className="text-white font-bold text-center text-lg" />
                      </div>
                      
                      {/* Hero Image */}
                      {ev.imageUrl && (
                        <div className="w-full">
                          <img src={ev.imageUrl} alt="Event Hero" className="w-full object-cover" />
                        </div>
                      )}
                      
                      {/* Body */}
                      <div className="p-4">
                        <div dangerouslySetInnerHTML={{ __html: (ev.content || '').replace(/{好友的顯示名稱}/g, '用戶').replace(/{帳號名稱}/g, '用戶') }} className="text-slate-800 text-sm whitespace-pre-wrap" />
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border-[4px] border-black shadow-[8px_8px_0_0_#000] max-w-5xl w-full flex flex-col max-h-[90vh]">
            <div className="p-4 border-b-[3px] border-black bg-green-400 flex justify-between items-center sticky top-0 z-20">
              <h2 className="text-xl font-black text-black">{editingEvent ? '編輯活動通知' : '新增活動通知'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 p-1 rounded transition-colors">
                <X className="w-6 h-6 text-black" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 flex flex-col md:flex-row gap-8 bg-slate-50">
              {/* Left Column: Form */}
              <div className="flex-1 space-y-6">
                <div>
                  <label className="block text-sm font-black mb-1">活動標題 (內部辨識用)</label>
                  <input 
                    type="text" 
                    value={title} 
                    onChange={e => setTitle(e.target.value)}
                    className="w-full p-3 border-2 border-black outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 comic-box-sm bg-white font-bold"
                    placeholder="例如：端午節特惠活動"
                  />
                </div>
                
                <div className="flex flex-col md:flex-row gap-4 bg-yellow-100 p-4 border-2 border-black comic-box-sm">
                  <div className="flex-1 relative">
                    <label className="block text-sm font-black mb-2 flex items-center gap-1"><Calendar className="w-4 h-4"/> 發送日期</label>
                    <div className="w-full p-1 border-2 border-black bg-white comic-box-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] flex items-center h-[52px]">
                      <DatePicker 
                        value={sendDate}
                        onChange={(val) => setSendDate(val)}
                        clearable={false}
                      />
                    </div>
                  </div>
                  <div className="flex-1 relative">
                    <label className="block text-sm font-black mb-2 flex items-center gap-1"><Clock className="w-4 h-4"/> 發送時間</label>
                    <div className="p-1 bg-white border-2 border-black comic-box-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] h-[52px] flex items-center">
                      <TimePicker 
                        value={sendTime || '09:00'}
                        onChange={(newVal) => setSendTime(newVal)}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-black mb-1">推播顯示主標題</label>
                  <input 
                    type="text" 
                    value={messageTitle} 
                    onChange={e => setMessageTitle(e.target.value)}
                    className="w-full p-3 border-2 border-black outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 comic-box-sm bg-white font-bold"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-black">推播內容 (支援 {`{好友的顯示名稱}`} 變數)</label>
                    <button 
                      type="button" 
                      onClick={() => setQrModalOpen(true)} 
                      className="text-xs bg-yellow-300 border-2 border-black font-black px-2 py-1 comic-box-sm shadow-[2px_2px_0_0_#000] hover:bg-yellow-200 flex items-center gap-1"
                    >
                      <BookmarkPlus className="w-3 h-3" /> 常用訊息
                    </button>
                  </div>
                  <div className="border-2 border-black comic-box-sm bg-white">
                    <RichTextEditor
                      value={content}
                      onChange={setContent}
                      placeholder="輸入通知內容..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-black mb-1">上傳圖片 (選填)</label>
                  <div className="border-2 border-black comic-box-sm p-4 bg-white text-center relative hover:bg-slate-50 transition-colors shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]">
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleImageChange}
                      accept="image/*"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    {imagePreview ? (
                      <div className="relative">
                        <img src={imagePreview} alt="Preview" className="max-h-48 mx-auto border-2 border-black shadow-[4px_4px_0_0_#000]" />
                        <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                          點擊更換
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-6">
                        <ImageIcon className="w-12 h-12 text-slate-300 mb-2" />
                        <span className="text-sm font-bold text-slate-500">點擊此處上傳圖片</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: User Selection */}
              <div className="w-full md:w-80 flex flex-col gap-3">
                <div className="bg-slate-800 text-white p-3 border-2 border-black comic-box-sm">
                  <h3 className="font-black text-lg flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    選擇對象 ({selectedUserIds.length})
                  </h3>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="搜尋用戶名稱..."
                    value={userSearchTerm}
                    onChange={(e) => { setUserSearchTerm(e.target.value); setModalUserPage(1); }}
                    className="w-full p-2 pl-8 border-2 border-black outline-none focus:border-green-500 comic-box-sm text-sm font-bold"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-2 top-3" />
                </div>
                
                <div className="relative">
                  <select
                    value={userFilterTag}
                    onChange={(e) => { setUserFilterTag(e.target.value); setModalUserPage(1); }}
                    className="w-full p-2 pl-8 border-2 border-black outline-none focus:border-green-500 comic-box-sm text-sm font-bold bg-white"
                  >
                    <option value="">全部標籤</option>
                    {globalTags.map(tag => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                  <Tag className="w-4 h-4 text-slate-400 absolute left-2 top-3" />
                </div>

                <div className="flex gap-2">
                  <button onClick={selectAllFiltered} className="flex-1 bg-white border-2 border-black comic-box-sm py-2 text-sm font-black hover:bg-cyan-50 shadow-[2px_2px_0_0_#000] active:scale-95 transition-transform">
                    全選
                  </button>
                  <button onClick={deselectAllFiltered} className="flex-1 bg-white border-2 border-black comic-box-sm py-2 text-sm font-black hover:bg-red-50 shadow-[2px_2px_0_0_#000] active:scale-95 transition-transform">
                    全不選
                  </button>
                </div>
                <div className="text-sm font-black text-blue-700 bg-blue-50 border-2 border-black p-2 comic-box-sm text-center shadow-[2px_2px_0_0_#000]">
                  目前符合條件的人員總數: {filteredUsers.length} 人
                </div>

                <div className="flex-1 flex flex-col min-h-[200px] md:max-h-[600px]">
                  {filteredUsers.length > 0 && (
                    <div className="flex flex-col gap-2 bg-slate-100 p-2 border-2 border-black comic-box-sm mb-2 shrink-0">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <div className="flex items-center gap-1">
                          每頁:
                          <select 
                            value={modalUserPageSize}
                            onChange={e => {
                              setModalUserPageSize(Number(e.target.value));
                              setModalUserPage(1);
                            }}
                            className="border-2 border-black outline-none font-bold bg-white text-xs p-1"
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
                          {modalUserPage} / {modalTotalPages} 頁
                        </div>
                      </div>
                      <div className="flex justify-between gap-2">
                        <button 
                          onClick={() => setModalUserPage(p => Math.max(1, p - 1))}
                          disabled={modalUserPage === 1}
                          className="flex-1 py-1 border-2 border-black bg-white hover:bg-slate-200 disabled:opacity-50 text-xs font-black transition-transform active:scale-95 shadow-[2px_2px_0_0_#000] disabled:shadow-none disabled:active:scale-100"
                        >
                          上一頁
                        </button>
                        <button 
                          onClick={() => setModalUserPage(p => Math.min(modalTotalPages, p + 1))}
                          disabled={modalUserPage === modalTotalPages}
                          className="flex-1 py-1 border-2 border-black bg-white hover:bg-slate-200 disabled:opacity-50 text-xs font-black transition-transform active:scale-95 shadow-[2px_2px_0_0_#000] disabled:shadow-none disabled:active:scale-100"
                        >
                          下一頁
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto border-2 border-black comic-box-sm bg-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]">
                    {paginatedUsers.map(u => {
                    const isChecked = selectedUserIds.includes(u.userId);
                    return (
                      <label key={u.id} className="flex items-center p-3 border-b border-slate-100 hover:bg-green-50 cursor-pointer transition-colors">
                        <input
                           type="checkbox"
                           className="hidden"
                           checked={isChecked}
                           onChange={() => toggleUser(u.userId)}
                        />
                        <div className={cn(
                          "w-6 h-6 border-2 border-black comic-box-sm mr-3 flex items-center justify-center shrink-0 transition-colors",
                          isChecked ? "bg-green-400" : "bg-white"
                        )}>
                          {isChecked && <Check className="w-4 h-4 text-black font-black" strokeWidth={4} />}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-black">{u.displayName}</span>
                          {useOriginalLineName && u.originalLineName && u.originalLineName !== u.displayName && (
                            <span className="text-xs text-slate-500">{u.originalLineName}</span>
                          )}
                        </div>
                      </label>
                    )
                  })}
                  {filteredUsers.length === 0 && (
                      <div className="p-8 text-center text-slate-400 text-sm font-bold">
                        沒有找到符合的用戶
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t-[3px] border-black bg-white flex justify-end gap-4 sticky bottom-0 z-20">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 bg-white text-black font-black border-2 border-black comic-box-sm hover:bg-slate-100 transition-transform active:scale-95"
              >
                取消
              </button>
              <button 
                onClick={handleSave}
                disabled={saving || (editingEvent && editingEvent.status === 'sent')}
                className="px-8 py-2 bg-green-400 text-black font-black border-2 border-black comic-box-sm hover:bg-green-300 disabled:opacity-50 disabled:bg-slate-200 shadow-[4px_4px_0_0_#000] flex items-center gap-2 transition-transform active:translate-y-1 active:shadow-[0_0_0_0_#000]"
              >
                {saving && <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>}
                儲存排程
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Replies Modal */}
      <QuickRepliesModal 
        isOpen={qrModalOpen} 
        onClose={() => setQrModalOpen(false)} 
        activeCategory="eventNotify"
        onSelect={(text) => {
          setContent(text);
          setQrModalOpen(false);
        }}
      />

      {/* Custom Delete Confirm Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border-[4px] border-black comic-box p-6 max-w-sm w-full text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 border-2 border-black rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-black text-black mb-2">確定要刪除嗎？</h3>
            <p className="text-slate-600 font-bold mb-6">刪除後將無法還原此活動排程！</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setDeleteModal({ isOpen: false, eventId: null })}
                className="flex-1 py-3 bg-white border-2 border-black font-black comic-box-sm hover:bg-slate-100 active:scale-95 transition-transform"
              >
                取消
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 py-3 bg-red-400 text-black border-2 border-black font-black comic-box-sm shadow-[4px_4px_0_0_#000] hover:bg-red-300 active:scale-95 transition-transform"
              >
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
