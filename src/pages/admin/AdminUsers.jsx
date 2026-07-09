import { useState, useEffect } from 'react';
import { getAllUsers, saveAdminUser, deleteUser } from '../../services/db';
import { Users, Plus, Edit2, Trash2, X, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    displayName: '',
    gender: '',
    birthday: '',
    interests: '',
    notes: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const data = await getAllUsers();
    setUsers(data);
    setLoading(false);
  };

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        displayName: user.displayName || '',
        gender: user.gender || '',
        birthday: user.birthday || '',
        interests: user.interests || '',
        notes: user.notes || ''
      });
    } else {
      setEditingUser(null);
      setFormData({ displayName: '', gender: '', birthday: '', interests: '', notes: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveAdminUser(editingUser?.id, formData);
      await fetchUsers();
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
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">用戶管理</h1>
          <p className="text-slate-500 mt-1">管理所有使用者的基本資料與備註</p>
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
                <th className="p-4 font-semibold">名稱</th>
                <th className="p-4 font-semibold">性別</th>
                <th className="p-4 font-semibold">生日</th>
                <th className="p-4 font-semibold">備註</th>
                <th className="p-4 font-semibold text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-500">目前尚無用戶資料</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-medium text-slate-800">{user.displayName || '未提供'}</td>
                    <td className="p-4 text-slate-600">{user.gender || '-'}</td>
                    <td className="p-4 text-slate-600">{user.birthday || '-'}</td>
                    <td className="p-4 text-slate-600 max-w-xs truncate">{user.notes || '-'}</td>
                    <td className="p-4 text-right space-x-2">
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
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">{editingUser ? '編輯用戶' : '新增用戶'}</h2>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1">名稱</label>
                <input 
                  type="text" value={formData.displayName} onChange={e => setFormData({...formData, displayName: e.target.value})}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-green-500 outline-none" required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1">性別</label>
                  <select 
                    value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}
                    className="w-full p-3 rounded-xl border border-slate-200 focus:border-green-500 outline-none bg-white"
                  >
                    <option value="">請選擇</option>
                    <option value="男">男</option>
                    <option value="女">女</option>
                    <option value="其他">其他</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1">生日</label>
                  <input 
                    type="date" value={formData.birthday} onChange={e => setFormData({...formData, birthday: e.target.value})}
                    className="w-full p-3 rounded-xl border border-slate-200 focus:border-green-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1">興趣</label>
                <input 
                  type="text" value={formData.interests} onChange={e => setFormData({...formData, interests: e.target.value})}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-green-500 outline-none" placeholder="例如：瑜珈, 游泳"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1">備註</label>
                <textarea 
                  value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-green-500 outline-none h-24 resize-none" placeholder="客戶相關備註"
                />
              </div>
              
              <div className="pt-4 flex space-x-3">
                <button type="button" onClick={handleCloseModal} className="flex-1 py-3 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">取消</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl shadow-md transition-colors flex justify-center items-center">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : '儲存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
