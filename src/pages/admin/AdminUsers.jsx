import { useState, useEffect, useRef } from 'react';
import { getAllUsers, saveAdminUser, deleteUser, uploadImage, getMessageTemplates } from '../../services/db';
import { Users, Plus, Edit2, Trash2, X, Loader2, UploadCloud, User, MessageSquare, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);

  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageTarget, setMessageTarget] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [messageSending, setMessageSending] = useState(false);
  const [sendResult, setSendResult] = useState({ text: '', type: '' });

  // Form state
  const [formData, setFormData] = useState({
    displayName: '',
    gender: '',
    birthday: '',
    interests: '',
    notes: '',
    pictureUrl: ''
  });
  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const data = await getAllUsers();
    setUsers(data);
    setLoading(false);
  };

  const handleOpenMessageModal = (user) => {
    setMessageTarget(user);
    setMessageText('');
    setSendResult({ text: '', type: '' });
    setIsMessageModalOpen(true);
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

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        displayName: user.displayName || '',
        gender: user.gender || '',
        birthday: user.birthday || '',
        interests: user.interests || '',
        notes: user.notes || '',
        pictureUrl: user.pictureUrl || ''
      });
      setImagePreview(user.pictureUrl || '');
    } else {
      setEditingUser(null);
      setFormData({ displayName: '', gender: '', birthday: '', interests: '', notes: '', pictureUrl: '' });
      setImagePreview('');
    }
    setImageFile(null);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let finalImageUrl = formData.pictureUrl;
      
      // Upload image if selected
      if (imageFile) {
        const path = `users/${Date.now()}_${imageFile.name}`;
        finalImageUrl = await uploadImage(imageFile, path);
      }
      
      await saveAdminUser(editingUser?.id, { ...formData, pictureUrl: finalImageUrl });
      
      await fetchUsers(); // Refresh the list
      handleCloseModal();
    } catch (error) {
      alert("儲存失敗: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("確定要刪除這位用戶嗎？")) {
      try {
        await deleteUser(id);
        await fetchUsers();
      } catch (error) {
        alert("刪除失敗");
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">用戶管理</h1>
          <p className="text-slate-500 mt-1">管理所有使用者的基本資料與照片</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl flex items-center space-x-2 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span>新增用戶</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm">
                <th className="p-4 font-semibold w-16">頭像</th>
                <th className="p-4 font-semibold">名稱</th>
                <th className="p-4 font-semibold">性別</th>
                <th className="p-4 font-semibold">生日</th>
                <th className="p-4 font-semibold hidden md:table-cell">興趣</th>
                <th className="p-4 font-semibold hidden lg:table-cell">備註</th>
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
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-500">目前尚無用戶資料</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      {user.pictureUrl ? (
                        <img src={user.pictureUrl} alt={user.displayName} className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-sm" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                          <User className="w-5 h-5" />
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{user.displayName || '未提供'}</div>
                      {user.lineGroup && (
                        <div className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full inline-block mt-1 font-medium border border-green-200">
                          Line 官方：{user.lineGroup}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-slate-600">{user.gender || '-'}</td>
                    <td className="p-4 text-slate-600">{user.birthday || '-'}</td>
                    <td className="p-4 text-slate-600 hidden md:table-cell">{user.interests || '-'}</td>
                    <td className="p-4 text-slate-600 max-w-[200px] truncate hidden lg:table-cell">{user.notes || '-'}</td>
                    <td className="p-4 text-right space-x-2">
                      {user.userId && (
                        <button onClick={() => handleOpenMessageModal(user)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="傳送訊息">
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => handleOpenModal(user)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(user.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50 shrink-0">
              <h2 className="text-xl font-bold text-slate-800 flex items-center">
                {editingUser ? '✏️ 編輯用戶' : '✨ 新增用戶'}
              </h2>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5">
              
              {/* Photo Upload Section */}
              <div className="flex flex-col items-center mb-6">
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
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 block mb-1">名稱 <span className="text-red-500">*</span></label>
                <input 
                  type="text" value={formData.displayName} onChange={e => setFormData({...formData, displayName: e.target.value})}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none bg-slate-50 focus:bg-white transition-colors" required
                  placeholder="輸入客戶名稱"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1">性別</label>
                  <select 
                    value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}
                    className="w-full p-3 rounded-xl border border-slate-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none bg-slate-50 focus:bg-white transition-colors appearance-none"
                  >
                    <option value="">未提供</option>
                    <option value="男">男</option>
                    <option value="女">女</option>
                    <option value="其他">其他</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1">生日</label>
                  <input 
                    type="date" value={formData.birthday} onChange={e => setFormData({...formData, birthday: e.target.value})}
                    className="w-full p-3 rounded-xl border border-slate-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none bg-slate-50 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 block mb-1">興趣 / 喜好</label>
                <input 
                  type="text" value={formData.interests} onChange={e => setFormData({...formData, interests: e.target.value})}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none bg-slate-50 focus:bg-white transition-colors" 
                  placeholder="例如：瑜珈, 游泳"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 block mb-1">備註</label>
                <textarea 
                  value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none bg-slate-50 focus:bg-white transition-colors h-24 resize-none" 
                  placeholder="客戶相關備註，例如消費習慣等"
                />
              </div>
              
              <div className="pt-4 flex space-x-3 shrink-0 pb-4">
                <button type="button" onClick={handleCloseModal} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">
                  取消
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-500/20 transition-colors flex justify-center items-center">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : '完成並儲存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {isMessageModalOpen && messageTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50 shrink-0">
              <h2 className="text-xl font-bold text-slate-800 flex items-center">
                <Send className="w-5 h-5 mr-2 text-green-500" />
                傳送訊息給 {messageTarget.displayName}
              </h2>
              <button onClick={() => setIsMessageModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSendMessage} className="p-6 space-y-5">
              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="text-sm font-bold text-slate-700">訊息內容</label>
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
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none bg-slate-50 focus:bg-white transition-colors h-40 resize-none" 
                  placeholder="請輸入要傳送給客戶的訊息內容..."
                  required
                />
              </div>

              {sendResult.text && (
                <div className={`p-3 rounded-xl flex items-center text-sm ${sendResult.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {sendResult.type === 'success' ? <CheckCircle2 className="w-4 h-4 mr-2 shrink-0" /> : <AlertCircle className="w-4 h-4 mr-2 shrink-0" />}
                  <span>{sendResult.text}</span>
                </div>
              )}

              <div className="pt-2 flex space-x-3 shrink-0">
                <button type="button" onClick={() => setIsMessageModalOpen(false)} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">
                  取消
                </button>
                <button type="submit" disabled={messageSending} className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-500/20 transition-colors flex justify-center items-center">
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
