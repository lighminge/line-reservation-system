import { useState, useEffect, useRef } from 'react';
import { getAllUsers, saveAdminUser, deleteUser, uploadImage, getMessageTemplates, getDictTags, saveDictTags, getDictInterests, saveDictInterests } from '../../services/db';
import { Users, Plus, Edit2, Trash2, X, Loader2, UploadCloud, User, MessageSquare, Send, CheckCircle2, AlertCircle, Search, ChevronLeft, ChevronRight, Tag, Heart } from 'lucide-react';
import { cn } from '../../utils/cn';
import { getZodiac, zodiacs } from '../../utils/zodiac';
import ZodiacIcon from '../../components/ZodiacIcon';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Global Dictionaries
  const [globalTags, setGlobalTags] = useState([]);
  const [globalInterests, setGlobalInterests] = useState([]);

  // Search, Filter, Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState('all'); // 'all', 'none', or specific group name
  const [filterGender, setFilterGender] = useState('all');
  const [filterZodiac, setFilterZodiac] = useState('all');
  const [filterInterest, setFilterInterest] = useState('all');
  const [filterTag, setFilterTag] = useState('all');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);

  // Delete Modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Message Modal state
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageTarget, setMessageTarget] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [messageSending, setMessageSending] = useState(false);
  const [sendResult, setSendResult] = useState({ text: '', type: '' });

  // Delete Dict Item Modal state
  const [dictDeleteModal, setDictDeleteModal] = useState({ isOpen: false, type: '', value: '' });

  // Form state
  const [formData, setFormData] = useState({
    displayName: '',
    gender: '',
    bYear: '',
    bMonth: '',
    bDay: '',
    interests: [],
    notes: '',
    pictureUrl: '',
    tags: [],
    lineGroup: ''
  });
  
  const [tagInput, setTagInput] = useState('');
  const [interestInput, setInterestInput] = useState('');
  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterGroup, filterGender, filterZodiac, filterInterest, filterTag, pageSize]);

  const fetchData = async () => {
    setLoading(true);
    const [userData, gTags, gInterests] = await Promise.all([
      getAllUsers(),
      getDictTags(),
      getDictInterests()
    ]);
    setUsers(userData);
    setGlobalTags(gTags || []);
    setGlobalInterests(gInterests || []);
    setLoading(false);
  };

  // Derived state for Search & Filter
  const uniqueGroups = [...new Set(users.map(u => u.lineGroup).filter(Boolean))];
  
  const filteredUsers = users.filter(u => {
    // 1. Group Filter
    if (filterGroup === 'none' && u.lineGroup) return false;
    if (filterGroup !== 'all' && filterGroup !== 'none' && u.lineGroup !== filterGroup) return false;

    // 2. Gender Filter
    if (filterGender !== 'all' && u.gender !== filterGender) return false;

    // 3. Zodiac Filter
    if (filterZodiac !== 'all') {
      const [y, m, d] = (u.birthday || '').split('-');
      const z = getZodiac(m, d);
      if (!z || z.name !== filterZodiac) return false;
    }

    // 4. Interest Filter
    if (filterInterest !== 'all') {
      // Handle both string and array for backward compatibility
      const uInts = Array.isArray(u.interests) ? u.interests : (u.interests ? u.interests.split(',').map(i => i.trim()) : []);
      if (!uInts.includes(filterInterest)) return false;
    }

    // 5. Tag Filter
    if (filterTag !== 'all') {
      const uTags = u.tags || [];
      if (!uTags.includes(filterTag)) return false;
    }

    // 6. Keyword Search
    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      const matchName = (u.displayName || '').toLowerCase().includes(q);
      const matchNotes = (u.notes || '').toLowerCase().includes(q);
      
      if (!matchName && !matchNotes) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  
  // Guard against out of bound page
  const safeCurrentPage = Math.min(currentPage, totalPages);
  
  const displayedUsers = filteredUsers.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );

  const handleOpenMessageModal = (user) => {
    setMessageTarget(user);
    setMessageText('');
    setSendResult({ text: '', type: '' });
    setIsMessageModalOpen(true);
  };

  // Delete Global Dict Items
  const deleteGlobalTag = (tagToDelete) => {
    setDictDeleteModal({ isOpen: true, type: 'tag', value: tagToDelete });
  };

  const deleteGlobalInterest = (interestToDelete) => {
    setDictDeleteModal({ isOpen: true, type: 'interest', value: interestToDelete });
  };

  const confirmDictDelete = async () => {
    const { type, value } = dictDeleteModal;
    setIsDeleting(true);
    if (type === 'tag') {
      const newTags = globalTags.filter(t => t !== value);
      await saveDictTags(newTags);
      setGlobalTags(newTags);
    } else if (type === 'interest') {
      const newInterests = globalInterests.filter(i => i !== value);
      await saveDictInterests(newInterests);
      setGlobalInterests(newInterests);
    }
    setIsDeleting(false);
    setDictDeleteModal({ isOpen: false, type: '', value: '' });
  };

  const loadTemplate = async () => {
    const templates = await getMessageTemplates();
    if (templates && templates.lineConfirm) {
      setMessageText(templates.lineConfirm.text);
    } else {
      setSendResult({ text: '無法載入樣板', type: 'error' });
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText) return;
    
    setMessageSending(true);
    setSendResult({ text: '', type: '' });
    try {
      const response = await fetch('/api/send-custom-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: messageTarget.userId,
          text: messageText,
          title: "系統通知"
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setSendResult({ text: '訊息發送成功！', type: 'success' });
        setTimeout(() => {
          setIsMessageModalOpen(false);
        }, 1500);
      } else {
        setSendResult({ text: '發送失敗：' + data.message, type: 'error' });
      }
    } catch (error) {
      setSendResult({ text: '發送發生錯誤：' + error.message, type: 'error' });
    } finally {
      setMessageSending(false);
    }
  };

  // Delete Handlers
  const openDeleteConfirm = (id) => {
    setUserToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      await deleteUser(userToDelete);
      const data = await getAllUsers();
      setUsers(data);
      setIsDeleteModalOpen(false);
    } catch (error) {
      alert("刪除失敗: " + error.message);
    } finally {
      setIsDeleting(false);
      setUserToDelete(null);
    }
  };

  // Edit Handlers
  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      
      const [y, m, d] = (user.birthday || '').split('-');
      
      setFormData({
        displayName: user.displayName || '',
        gender: user.gender || '',
        childName: user.childName || '',
        childGender: user.childGender || '',
        bYear: y ? parseInt(y).toString() : '',
        bMonth: m ? parseInt(m).toString() : '',
        bDay: d ? parseInt(d).toString() : '',
        interests: Array.isArray(user.interests) ? user.interests : (user.interests ? user.interests.split(',').map(i=>i.trim()).filter(Boolean) : []),
        notes: user.notes || '',
        pictureUrl: user.pictureUrl || '',
        tags: user.tags || [],
        lineGroup: user.lineGroup || ''
      });
      setImagePreview(user.pictureUrl || '');
    } else {
      setEditingUser(null);
      setFormData({ displayName: '', gender: '', childName: '', childGender: '', bYear: '', bMonth: '', bDay: '', interests: [], notes: '', pictureUrl: '', tags: [], lineGroup: '' });
      setImagePreview('');
    }
    setImageFile(null);
    setTagInput('');
    setInterestInput('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setImageFile(null);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Tag & Interest Management
  const addTag = async (val) => {
    const cleanVal = val.trim();
    if (cleanVal !== '' && !formData.tags.includes(cleanVal)) {
      setFormData({ ...formData, tags: [...formData.tags, cleanVal] });
      setTagInput('');
      
      // Update global dict if new
      if (!globalTags.includes(cleanVal)) {
        const newGlobalTags = [...globalTags, cleanVal];
        setGlobalTags(newGlobalTags);
        await saveDictTags(newGlobalTags);
      }
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tagToRemove) });
  };

  const addInterest = async (val) => {
    const cleanVal = val.trim();
    if (cleanVal !== '' && !formData.interests.includes(cleanVal)) {
      setFormData({ ...formData, interests: [...formData.interests, cleanVal] });
      setInterestInput('');
      
      // Update global dict if new
      if (!globalInterests.includes(cleanVal)) {
        const newGlobalInterests = [...globalInterests, cleanVal];
        setGlobalInterests(newGlobalInterests);
        await saveDictInterests(newGlobalInterests);
      }
    }
  };

  const removeInterest = (interestToRemove) => {
    setFormData({ ...formData, interests: formData.interests.filter(i => i !== interestToRemove) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let finalImageUrl = formData.pictureUrl;
      
      if (imageFile) {
        const path = `users/${Date.now()}_${imageFile.name}`;
        finalImageUrl = await uploadImage(imageFile, path);
      }
      
      // Assemble birthday
      let birthdayStr = '';
      if (formData.bYear || formData.bMonth || formData.bDay) {
        birthdayStr = `${formData.bYear || '0000'}-${(formData.bMonth || '00').padStart(2, '0')}-${(formData.bDay || '00').padStart(2, '0')}`;
      }
      
      const dataToSave = { 
        displayName: formData.displayName,
        gender: formData.gender,
        childName: formData.childName,
        childGender: formData.childGender,
        isAdminModifiedName: true,
        birthday: birthdayStr,
        interests: formData.interests,
        notes: formData.notes,
        tags: formData.tags,
        pictureUrl: finalImageUrl 
      };
      
      await saveAdminUser(editingUser?.id, dataToSave);
      
      const data = await getAllUsers();
      setUsers(data);
      handleCloseModal();
    } catch (error) {
      alert("儲存失敗: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Helper for rendering Birthday options
  const years = Array.from({length: 100}, (_, i) => new Date().getFullYear() - i);
  const months = Array.from({length: 12}, (_, i) => i + 1);
  
  // Calculate days based on selected month and year
  const getDaysInMonth = (month, year) => {
    if (!month) return Array.from({length: 31}, (_, i) => i + 1);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10) || 2000; // Leap year check fallback
    return new Date(y, m, 0).getDate();
  };
  const days = Array.from({length: getDaysInMonth(formData.bMonth, formData.bYear)}, (_, i) => i + 1);

  const currentZodiac = getZodiac(formData.bMonth, formData.bDay);

  // Filter Helper
  const getDisplayInterests = (user) => {
    return Array.isArray(user.interests) ? user.interests : (user.interests ? user.interests.split(',').map(i=>i.trim()).filter(Boolean) : []);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 comic-theme">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-black font-black">用戶管理</h1>
          <p className="text-black font-bold mt-1">管理所有使用者的基本資料與照片</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-green-400 hover:bg-green-300 text-black border-2 border-black text-white px-4 py-2 border-2 border-black comic-box-sm flex items-center space-x-2 transition-colors shadow-[2px_2px_0_0_#000] whitespace-nowrap"
        >
          <Plus className="w-5 h-5" />
          <span>新增用戶</span>
        </button>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white p-4 border-[3px] border-black comic-box shadow-[2px_2px_0_0_#000] border border-black flex flex-col gap-4">
        {/* Top row: Keyword Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="搜尋名稱、備註關鍵字..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 border-black comic-box-sm border border-black focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-colors bg-slate-50 focus:bg-white"
          />
        </div>
        
        {/* Bottom row: Dropdown filters */}
        <div className="flex flex-wrap items-center gap-3 w-full text-sm">
          
          <div className="flex items-center space-x-2">
            <span className="font-bold text-black font-bold whitespace-nowrap">Line官方群組</span>
            <select 
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
              className="p-2 border-2 border-black comic-box-sm border border-black focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-colors bg-slate-50 focus:bg-white appearance-none"
            >
              <option value="all">全部</option>
              <option value="none">無分類</option>
              {uniqueGroups.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="font-bold text-black font-bold whitespace-nowrap">性別</span>
            <select 
              value={filterGender}
              onChange={(e) => setFilterGender(e.target.value)}
              className="p-2 border-2 border-black comic-box-sm border border-black focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-colors bg-slate-50 focus:bg-white appearance-none"
            >
              <option value="all">全部</option>
              <option value="男">男</option>
              <option value="女">女</option>
              <option value="其他">其他</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="font-bold text-black font-bold whitespace-nowrap">星座</span>
            <select 
              value={filterZodiac}
              onChange={(e) => setFilterZodiac(e.target.value)}
              className="p-2 border-2 border-black comic-box-sm border border-black focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-colors bg-slate-50 focus:bg-white appearance-none"
            >
              <option value="all">全部</option>
              {zodiacs.map(z => (
                <option key={z.name} value={z.name}>{z.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="font-bold text-black font-bold whitespace-nowrap">自訂標籤</span>
            <select 
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="p-2 border-2 border-black comic-box-sm border border-black focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-colors bg-slate-50 focus:bg-white appearance-none max-w-[150px]"
            >
              <option value="all">全部</option>
              {globalTags.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="font-bold text-black font-bold whitespace-nowrap">興趣分類</span>
            <select 
              value={filterInterest}
              onChange={(e) => setFilterInterest(e.target.value)}
              className="p-2 border-2 border-black comic-box-sm border border-black focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-colors bg-slate-50 focus:bg-white appearance-none max-w-[150px]"
            >
              <option value="all">全部</option>
              {globalInterests.map(i => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>

        </div>
      </div>
      
      <div className="flex justify-between items-center px-1">
        <div className="text-sm font-bold text-black font-bold">
          目前查詢結果：共 <span className="text-green-600 text-lg">{filteredUsers.length}</span> 筆
        </div>
        <div className="flex items-center space-x-2 text-sm text-black font-bold font-medium">
          <span>每頁顯示</span>
          <select 
            value={pageSize} 
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="border border-black rounded p-1 outline-none focus:border-green-500 bg-white"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span>筆</span>
        </div>
      </div>

      <div className="bg-white comic-box overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-black text-black font-bold text-sm">
                <th className="p-4 font-semibold w-16 text-center">序號</th>
                <th className="p-4 font-semibold w-16">頭像</th>
                <th className="p-4 font-semibold">名稱 & 群組</th>
                <th className="p-4 font-semibold">性別 / 生日</th>
                <th className="p-4 font-semibold">標籤 / 興趣</th>
                <th className="p-4 font-semibold">備註</th>
                <th className="p-4 font-semibold text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : displayedUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-black font-bold">找不到符合條件的用戶資料</td>
                </tr>
              ) : (
                displayedUsers.map((user, idx) => {
                  const uZodiac = user.birthday ? getZodiac(user.birthday.split('-')[1], user.birthday.split('-')[2]) : null;
                  const uInterests = getDisplayInterests(user);
                  const globalIdx = (safeCurrentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-center text-black font-bold font-bold">
                        {globalIdx}
                      </td>
                      <td className="p-4">
                        {user.pictureUrl ? (
                          <img src={user.pictureUrl} alt={user.displayName} className="w-10 h-10 rounded-full object-cover border border-black shadow-[2px_2px_0_0_#000] shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-black font-bold shrink-0">
                            <User className="w-5 h-5" />
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-black font-black">{user.displayName || '未提供'}</div>
                        <div className="flex flex-col items-start gap-1 mt-1">
                          {user.lineGroup && (
                            <div className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full inline-block font-medium border border-green-200 whitespace-nowrap">
                              Line 官方：{user.lineGroup}
                            </div>
                          )}
                          {user.childName && (
                            <div className="text-[10px] bg-cyan-200 text-black font-black border-2 border-black px-2 py-0.5 rounded-full inline-block font-medium border border-blue-200 whitespace-nowrap">
                              孩子：{user.childName} {user.childGender && `(${user.childGender})`}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-black font-black text-sm">{user.gender || '性別未提供'}</div>
                        {user.birthday && user.birthday !== '0000-00-00' && (
                          <div className="text-xs text-black font-bold mt-1 flex items-center">
                            {user.birthday} 
                            {uZodiac && <span className="ml-1 text-purple-500 font-medium">({uZodiac.name})</span>}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {(user.tags || []).map(t => (
                            <div key={t} className="text-[10px] bg-cyan-200 text-black font-black border-2 border-black px-2 py-0.5 rounded flex items-center border border-blue-100">
                              <Tag className="w-3 h-3 mr-1" />{t}
                            </div>
                          ))}
                          {uInterests.map(i => (
                            <div key={i} className="text-[10px] bg-pink-50 text-pink-600 px-2 py-0.5 rounded flex items-center border border-pink-100">
                              <Heart className="w-3 h-3 mr-1" />{i}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-black font-black max-w-[200px] truncate text-sm">{user.notes || '-'}</td>
                      <td className="p-4 text-right space-x-2 whitespace-nowrap">
                        {user.userId && (
                          <button onClick={() => handleOpenMessageModal(user)} className="p-2 text-green-600 hover:bg-green-50 border-2 border-black transition-colors" title="傳送訊息">
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => handleOpenModal(user)} className="p-2 text-blue-600 hover:bg-blue-50 border-2 border-black transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => openDeleteConfirm(user.id)} className="p-2 text-red-600 hover:bg-red-50 border-2 border-black transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {!loading && totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="text-sm text-black font-bold font-medium hidden sm:block">
              顯示第 {(safeCurrentPage - 1) * pageSize + 1} 到 {Math.min(safeCurrentPage * pageSize, filteredUsers.length)} 筆
            </div>
            <div className="flex space-x-1 items-center mx-auto sm:mx-0">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                className="p-2 border-2 border-black text-black font-black hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                // Show a limited number of page buttons to prevent overflow
                if (
                  page === 1 || 
                  page === totalPages || 
                  (page >= safeCurrentPage - 1 && page <= safeCurrentPage + 1)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        "w-8 h-8 border-2 border-black text-sm font-bold transition-colors",
                        safeCurrentPage === page ? "bg-green-500 text-white shadow-[2px_2px_0_0_#000]" : "text-black font-black hover:bg-slate-200"
                      )}
                    >
                      {page}
                    </button>
                  );
                } else if (page === safeCurrentPage - 2 || page === safeCurrentPage + 2) {
                  return <span key={page} className="text-slate-400">...</span>;
                }
                return null;
              })}

              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage === totalPages}
                className="p-2 border-2 border-black text-black font-black hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white border-[4px] border-black shadow-[8px_8px_0_0_#000] shadow-xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50 shrink-0">
              <h2 className="text-xl font-bold text-black font-black flex items-center">
                {editingUser ? '✏️ 編輯用戶' : '✨ 新增用戶'}
              </h2>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-black font-black">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6">
              
              {/* Photo Upload Section */}
              <div className="flex flex-col items-center mb-2">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 rounded-full border-4 border-slate-100 bg-slate-50 flex items-center justify-center overflow-hidden cursor-pointer hover:border-green-200 transition-colors relative group"
                >
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <UploadCloud className="w-6 h-6 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center text-slate-400">
                      <UploadCloud className="w-8 h-8 mb-1 text-slate-300 group-hover:text-green-500 transition-colors" />
                      <span className="text-[10px] font-medium uppercase tracking-wider">上傳照片</span>
                    </div>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageChange} 
                  accept="image/*" 
                  className="hidden" 
                />
                <div className="text-xs text-slate-400 mt-2 font-medium">支援 JPG, PNG 格式，建議大小不超過 5MB</div>
              </div>

              {/* Line Group Badge */}
              {formData.lineGroup && (
                <div className="flex justify-center -mt-2 mb-2">
                  <div className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-full border border-green-200 font-bold">
                    來自 Line 官方：{formData.lineGroup}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-bold text-black font-black block mb-1">名稱 <span className="text-red-500">*</span></label>
                  <input 
                    type="text" value={formData.displayName} onChange={e => setFormData({...formData, displayName: e.target.value})}
                    className="w-full p-3 border-2 border-black comic-box-sm border border-black focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none bg-slate-50 focus:bg-white transition-colors" required
                    placeholder="輸入客戶名稱"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-black font-black block mb-1">性別</label>
                  <select 
                    value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}
                    className="w-full p-3 border-2 border-black comic-box-sm border border-black focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none bg-slate-50 focus:bg-white transition-colors appearance-none"
                  >
                    <option value="">未提供</option>
                    <option value="男">男</option>
                    <option value="女">女</option>
                    <option value="其他">其他</option>
                  </select>
                </div>
              </div>

              {/* Child Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-bold text-black font-black block mb-1">孩子姓名</label>
                  <input 
                    type="text" value={formData.childName} onChange={e => setFormData({...formData, childName: e.target.value})}
                    className="w-full p-3 border-2 border-black comic-box-sm border border-black focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-slate-50 focus:bg-white transition-colors"
                    placeholder="輸入孩子姓名"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-black font-black block mb-1">孩子性別</label>
                  <select 
                    value={formData.childGender} onChange={e => setFormData({...formData, childGender: e.target.value})}
                    className="w-full p-3 border-2 border-black comic-box-sm border border-black focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-slate-50 focus:bg-white transition-colors appearance-none"
                  >
                    <option value="">未提供</option>
                    <option value="男">男</option>
                    <option value="女">女</option>
                  </select>
                </div>
              </div>

              {/* Birthday and Zodiac */}
              <div className="bg-slate-50 p-4 border-[3px] border-black comic-box border border-slate-100">
                <label className="text-sm font-bold text-black font-black block mb-2">生日</label>
                <div className="flex items-center space-x-2">
                  <select 
                    value={formData.bYear} onChange={e => setFormData({...formData, bYear: e.target.value})}
                    className="flex-1 p-3 border-2 border-black comic-box-sm border border-black focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none bg-white transition-colors appearance-none"
                  >
                    <option value="">年</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <span className="text-slate-400 font-bold">/</span>
                  <select 
                    value={formData.bMonth} onChange={e => {
                      const m = e.target.value;
                      setFormData(prev => {
                        // Check if day is out of bounds for new month
                        let newD = prev.bDay;
                        const maxDays = getDaysInMonth(m, prev.bYear);
                        if (newD && parseInt(newD) > maxDays) newD = '';
                        return {...prev, bMonth: m, bDay: newD};
                      });
                    }}
                    className="flex-1 p-3 border-2 border-black comic-box-sm border border-black focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none bg-white transition-colors appearance-none"
                  >
                    <option value="">月</option>
                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <span className="text-slate-400 font-bold">/</span>
                  <select 
                    value={formData.bDay} onChange={e => setFormData({...formData, bDay: e.target.value})}
                    className="flex-1 p-3 border-2 border-black comic-box-sm border border-black focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none bg-white transition-colors appearance-none"
                  >
                    <option value="">日</option>
                    {days.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                {/* Zodiac Preview */}
                {currentZodiac && (
                  <div className="mt-4 flex items-center justify-center p-3 bg-white border-2 border-black comic-box-sm border border-purple-100 shadow-[2px_2px_0_0_#000] animate-in zoom-in-95 duration-300">
                    <div className="w-12 h-12 rounded-full border-2 border-purple-200 mr-3 shadow-[2px_2px_0_0_#000] bg-purple-50 flex items-center justify-center">
                      <ZodiacIcon name={currentZodiac.en} className="w-8 h-8 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-sm text-black font-bold font-medium">專屬星座</div>
                      <div className="text-lg font-extrabold text-purple-600 tracking-wider">{currentZodiac.name}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Tags and Interests Management */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Custom Tags */}
                <div>
                  <label className="text-sm font-bold text-black font-black block mb-1">自訂標籤 (Tags)</label>
                  
                  {/* Select from existing */}
                  {globalTags.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1">
                      {globalTags.filter(t => !formData.tags.includes(t)).map(t => (
                        <div key={t} className="flex items-stretch border border-black rounded overflow-hidden shadow-[2px_2px_0_0_#000] group">
                          <button 
                            type="button" onClick={() => addTag(t)}
                            className="text-[10px] bg-slate-100 hover:bg-blue-100 text-black font-bold hover:text-blue-600 px-2 py-1 transition-colors flex-1"
                          >
                            + {t}
                          </button>
                          <button
                            type="button" onClick={() => deleteGlobalTag(t)}
                            className="text-[10px] bg-slate-100 text-slate-300 hover:bg-red-500 hover:text-white px-1.5 transition-colors border-l border-black"
                            title="從推薦清單永久刪除"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="w-full p-2 border-2 border-black comic-box-sm border border-black bg-slate-50 transition-colors focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 focus-within:bg-white flex flex-wrap gap-2 items-center">
                    {(formData.tags || []).map(t => (
                      <div key={t} className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 border-2 border-black flex items-center shadow-[2px_2px_0_0_#000]">
                        <Tag className="w-3 h-3 mr-1" />
                        {t}
                        <button type="button" onClick={() => removeTag(t)} className="ml-1 text-blue-400 hover:text-red-500 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <input 
                      type="text"
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput); } }}
                      className="flex-1 min-w-[100px] bg-transparent outline-none text-sm p-1 text-black font-black"
                      placeholder="輸入新標籤後按 Enter..."
                    />
                  </div>
                </div>

                {/* Interests */}
                <div>
                  <label className="text-sm font-bold text-black font-black block mb-1">興趣 / 喜好</label>
                  
                  {/* Select from existing */}
                  {globalInterests.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1">
                      {globalInterests.filter(i => !formData.interests.includes(i)).map(i => (
                        <div key={i} className="flex items-stretch border border-black rounded overflow-hidden shadow-[2px_2px_0_0_#000] group">
                          <button 
                            type="button" onClick={() => addInterest(i)}
                            className="text-[10px] bg-slate-100 hover:bg-pink-100 text-black font-bold hover:text-pink-600 px-2 py-1 transition-colors flex-1"
                          >
                            + {i}
                          </button>
                          <button
                            type="button" onClick={() => deleteGlobalInterest(i)}
                            className="text-[10px] bg-slate-100 text-slate-300 hover:bg-red-500 hover:text-white px-1.5 transition-colors border-l border-black"
                            title="從推薦清單永久刪除"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="w-full p-2 border-2 border-black comic-box-sm border border-black bg-slate-50 transition-colors focus-within:border-pink-500 focus-within:ring-2 focus-within:ring-pink-200 focus-within:bg-white flex flex-wrap gap-2 items-center">
                    {(formData.interests || []).map(i => (
                      <div key={i} className="bg-pink-100 text-pink-700 text-xs font-bold px-2 py-1 border-2 border-black flex items-center shadow-[2px_2px_0_0_#000]">
                        <Heart className="w-3 h-3 mr-1" />
                        {i}
                        <button type="button" onClick={() => removeInterest(i)} className="ml-1 text-pink-400 hover:text-red-500 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <input 
                      type="text"
                      value={interestInput}
                      onChange={e => setInterestInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addInterest(interestInput); } }}
                      className="flex-1 min-w-[100px] bg-transparent outline-none text-sm p-1 text-black font-black"
                      placeholder="輸入新興趣後按 Enter..."
                    />
                  </div>
                </div>

              </div>

              <div>
                <label className="text-sm font-bold text-black font-black block mb-1">備註</label>
                <textarea 
                  value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}
                  className="w-full p-3 border-2 border-black comic-box-sm border border-black focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none bg-slate-50 focus:bg-white transition-colors h-24 resize-none" 
                  placeholder="客戶相關備註，例如消費習慣等"
                />
              </div>
              
              <div className="pt-4 flex space-x-3 shrink-0 pb-4">
                <button type="button" onClick={handleCloseModal} className="flex-1 py-3 text-black font-black font-bold hover:bg-slate-100 border-2 border-black comic-box-sm transition-colors">
                  取消
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-3 bg-green-400 hover:bg-green-300 text-black border-2 border-black text-white font-bold border-2 border-black comic-box-sm shadow-lg shadow-green-500/20 transition-colors flex justify-center items-center">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : '完成並儲存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white border-[4px] border-black shadow-[8px_8px_0_0_#000] shadow-xl max-w-sm w-full p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-black font-black mb-2">確認刪除用戶</h3>
            <p className="text-black font-bold mb-6 font-medium">刪除後將無法復原，您確定要刪除這筆用戶資料嗎？</p>
            <div className="flex space-x-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-black font-black hover:bg-slate-200 font-bold border-2 border-black comic-box-sm transition-colors">
                取消
              </button>
              <button onClick={confirmDelete} disabled={isDeleting} className="flex-1 py-3 bg-red-400 hover:bg-red-300 text-black border-2 border-black text-white font-bold border-2 border-black comic-box-sm shadow-lg shadow-red-500/20 transition-colors flex justify-center items-center">
                {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : '確定刪除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dict Item Delete Confirmation Modal */}
      {dictDeleteModal.isOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white border-[4px] border-black shadow-[8px_8px_0_0_#000] shadow-xl max-w-sm w-full p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-black font-black mb-2">確認刪除{dictDeleteModal.type === 'tag' ? '標籤' : '興趣'}</h3>
            <p className="text-black font-bold mb-6 font-medium">您確定要從推薦清單中永久刪除「{dictDeleteModal.value}」嗎？</p>
            <div className="flex space-x-3">
              <button onClick={() => setDictDeleteModal({ isOpen: false, type: '', value: '' })} className="flex-1 py-3 bg-slate-100 text-black font-black hover:bg-slate-200 font-bold border-2 border-black comic-box-sm transition-colors">
                取消
              </button>
              <button onClick={confirmDictDelete} disabled={isDeleting} className="flex-1 py-3 bg-red-400 hover:bg-red-300 text-black border-2 border-black text-white font-bold border-2 border-black comic-box-sm shadow-lg shadow-red-500/20 transition-colors flex justify-center items-center">
                {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : '確定刪除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {isMessageModalOpen && messageTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white border-[4px] border-black shadow-[8px_8px_0_0_#000] shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50 shrink-0">
              <h2 className="text-xl font-bold text-black font-black flex items-center">
                <Send className="w-5 h-5 mr-2 text-green-500" />
                傳送訊息給 {messageTarget.displayName}
              </h2>
              <button onClick={() => setIsMessageModalOpen(false)} className="text-slate-400 hover:text-black font-black">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSendMessage} className="p-6 space-y-5">
              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="text-sm font-bold text-black font-black">訊息內容</label>
                  <button 
                    type="button" 
                    onClick={loadTemplate}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded"
                  >
                    帶入「Line 確認推播訊息」樣板
                  </button>
                </div>
                <textarea 
                  value={messageText} 
                  onChange={e => setMessageText(e.target.value)}
                  className="w-full p-3 border-2 border-black comic-box-sm border border-black focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none bg-slate-50 focus:bg-white transition-colors h-40 resize-none" 
                  placeholder="請輸入要傳送給客戶的訊息內容..."
                  required
                />
              </div>

              {sendResult.text && (
                <div className={`p-3 border-2 border-black comic-box-sm flex items-center text-sm ${sendResult.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {sendResult.type === 'success' ? <CheckCircle2 className="w-4 h-4 mr-2 shrink-0" /> : <AlertCircle className="w-4 h-4 mr-2 shrink-0" />}
                  <span>{sendResult.text}</span>
                </div>
              )}

              <div className="pt-2 flex space-x-3 shrink-0">
                <button type="button" onClick={() => setIsMessageModalOpen(false)} className="flex-1 py-3 text-black font-black font-bold hover:bg-slate-100 border-2 border-black comic-box-sm transition-colors">
                  取消
                </button>
                <button type="submit" disabled={messageSending} className="flex-1 py-3 bg-green-400 hover:bg-green-300 text-black border-2 border-black text-white font-bold border-2 border-black comic-box-sm shadow-lg shadow-green-500/20 transition-colors flex justify-center items-center">
                  {messageSending ? <Loader2 className="w-5 h-5 animate-spin" /> : '傳送訊息'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
