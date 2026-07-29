import { useState, useEffect, useRef } from 'react';
import { getAllEvents, saveEvent, deleteEvent, getAllUsers, uploadImage, resolveImageUrl, getMessageTemplates } from '../../services/db';
import { Calendar, Clock, Image as ImageIcon, Plus, Trash2, Edit2, Users, Search, X, MessageSquare, Check } from 'lucide-react';
import { cn } from '../../utils/cn';
import RichTextEditor from '../../components/RichTextEditor';

export default function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // User selection states
  const [allUsers, setAllUsers] = useState([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [saving, setSaving] = useState(false);
  
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
      const [eventsData, usersData, templates] = await Promise.all([
        getAllEvents(),
        getAllUsers(),
        getMessageTemplates()
      ]);
      
      // Sort events by sendDate and sendTime
      eventsData.sort((a, b) => {
        const dateTimeA = new Date(`${a.sendDate}T${a.sendTime}`);
        const dateTimeB = new Date(`${b.sendDate}T${b.sendTime}`);
        return dateTimeB - dateTimeA;
      });

      setEvents(eventsData);
      setAllUsers(usersData);
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

  const handleDelete = async (id) => {
    if (window.confirm("確定要刪除這個活動通知嗎？")) {
      await deleteEvent(id);
      await fetchData();
    }
  };

  const filteredUsers = allUsers.filter(u => {
    if (!userSearchTerm) return true;
    const term = userSearchTerm.toLowerCase();
    return (u.displayName || '').toLowerCase().includes(term) || (u.originalLineName || '').toLowerCase().includes(term);
  });

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 comic-box border-[3px] border-black">
        <h1 className="text-2xl font-black text-black flex items-center gap-2">
          <MessageSquare className="w-8 h-8 text-green-500" />
          活動通知管理
        </h1>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-green-400 hover:bg-green-300 text-black px-4 py-2 border-2 border-black comic-box-sm font-black flex items-center gap-2 transition-transform active:scale-95 shadow-[2px_2px_0_0_#000]"
        >
          <Plus className="w-5 h-5" />
          新增活動
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map(ev => {
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
              
              <div className="p-4 border-b-2 border-black bg-slate-100 flex-1">
                <h3 className="text-xl font-black mb-2 line-clamp-1 pr-14">{ev.title}</h3>
                
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
                  onClick={() => handleDelete(ev.id)}
                  className="flex-1 py-3 font-black text-red-600 hover:bg-red-50"
                >
                  刪除
                </button>
              </div>
            </div>
          )
        })}
        {events.length === 0 && (
          <div className="col-span-full p-12 bg-white text-center border-[3px] border-black border-dashed comic-box">
            <p className="text-slate-500 font-bold text-lg">目前沒有任何活動通知</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border-[4px] border-black shadow-[8px_8px_0_0_#000] max-w-4xl w-full flex flex-col max-h-[90vh]">
            <div className="p-4 border-b-[3px] border-black bg-green-400 flex justify-between items-center sticky top-0 z-20">
              <h2 className="text-xl font-black text-black">{editingEvent ? '編輯活動通知' : '新增活動通知'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 p-1 rounded transition-colors">
                <X className="w-6 h-6 text-black" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 flex flex-col md:flex-row gap-8">
              {/* Left Column: Form */}
              <div className="flex-1 space-y-4">
                <div>
                  <label className="block text-sm font-black mb-1">活動標題 (內部辨識用)</label>
                  <input 
                    type="text" 
                    value={title} 
                    onChange={e => setTitle(e.target.value)}
                    className="w-full p-2 border-2 border-black outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 comic-box-sm bg-slate-50"
                    placeholder="例如：端午節特惠活動"
                  />
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-black mb-1">排程發送日期</label>
                    <input 
                      type="date" 
                      value={sendDate} 
                      onChange={e => setSendDate(e.target.value)}
                      className="w-full p-2 border-2 border-black outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 comic-box-sm bg-slate-50 font-bold"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-black mb-1">排程發送時間</label>
                    <input 
                      type="time" 
                      value={sendTime} 
                      onChange={e => setSendTime(e.target.value)}
                      className="w-full p-2 border-2 border-black outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 comic-box-sm bg-slate-50 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-black mb-1">推播顯示主標題</label>
                  <input 
                    type="text" 
                    value={messageTitle} 
                    onChange={e => setMessageTitle(e.target.value)}
                    className="w-full p-2 border-2 border-black outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 comic-box-sm bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black mb-1">推播內容 (支援 {`{好友的顯示名稱}`} 變數)</label>
                  <div className="border-2 border-black comic-box-sm">
                    <RichTextEditor
                      value={content}
                      onChange={setContent}
                      placeholder="輸入通知內容..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-black mb-1">上傳圖片 (選填)</label>
                  <div className="border-2 border-black comic-box-sm p-4 bg-slate-50 text-center relative hover:bg-slate-100 transition-colors">
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleImageChange}
                      accept="image/*"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    {imagePreview ? (
                      <div className="relative">
                        <img src={imagePreview} alt="Preview" className="max-h-48 mx-auto border-2 border-black" />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-4">
                        <ImageIcon className="w-8 h-8 text-slate-400 mb-2" />
                        <span className="text-sm font-bold text-slate-600">點擊上傳圖片</span>
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
                    選擇發送對象 ({selectedUserIds.length})
                  </h3>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="搜尋用戶名稱..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="w-full p-2 pl-8 border-2 border-black outline-none focus:border-green-500 comic-box-sm text-sm font-bold"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-2 top-3" />
                </div>

                <div className="flex gap-2">
                  <button onClick={selectAllFiltered} className="flex-1 bg-slate-100 border-2 border-black comic-box-sm py-1 text-sm font-black hover:bg-slate-200">
                    全選
                  </button>
                  <button onClick={deselectAllFiltered} className="flex-1 bg-slate-100 border-2 border-black comic-box-sm py-1 text-sm font-black hover:bg-slate-200">
                    全不選
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto border-2 border-black comic-box-sm bg-slate-50 min-h-[200px] md:max-h-[500px]">
                  {filteredUsers.map(u => {
                    const isChecked = selectedUserIds.includes(u.userId);
                    return (
                      <label key={u.id} className="flex items-center p-3 border-b border-slate-200 hover:bg-green-50 cursor-pointer">
                        <input
                           type="checkbox"
                           className="hidden"
                           checked={isChecked}
                           onChange={() => toggleUser(u.userId)}
                        />
                        <div className={cn(
                          "w-5 h-5 border-2 border-black comic-box-sm mr-3 flex items-center justify-center shrink-0 transition-colors",
                          isChecked ? "bg-green-400" : "bg-white"
                        )}>
                          {isChecked && <Check className="w-4 h-4 text-black font-black" />}
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
                    <div className="p-4 text-center text-slate-500 text-sm font-bold">
                      沒有找到符合的用戶
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t-[3px] border-black bg-slate-50 flex justify-end gap-4 sticky bottom-0 z-20">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 bg-white text-black font-black border-2 border-black comic-box-sm hover:bg-slate-100"
              >
                取消
              </button>
              <button 
                onClick={handleSave}
                disabled={saving || (editingEvent && editingEvent.status === 'sent')}
                className="px-6 py-2 bg-green-400 text-black font-black border-2 border-black comic-box-sm hover:bg-green-300 disabled:opacity-50 disabled:bg-slate-200 shadow-[2px_2px_0_0_#000] flex items-center gap-2"
              >
                {saving && <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>}
                儲存排程
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
