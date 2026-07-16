import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, MessageSquare, Save } from 'lucide-react';
import { getQuickReplies, saveQuickReplies } from '../services/db';
import RichTextEditor from './RichTextEditor';

export default function QuickRepliesModal({ isOpen, onClose, onSelect }) {
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editText, setEditText] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchReplies();
    }
  }, [isOpen]);

  const fetchReplies = async () => {
    setLoading(true);
    const data = await getQuickReplies();
    setReplies(data);
    setLoading(false);
  };

  const handleSave = async (id = null) => {
    if (!editTitle || !editText) return;
    
    let newReplies;
    if (id) {
      newReplies = replies.map(r => r.id === id ? { ...r, title: editTitle, text: editText } : r);
    } else {
      newReplies = [...replies, { id: Date.now().toString(), title: editTitle, text: editText }];
    }
    
    await saveQuickReplies(newReplies);
    setReplies(newReplies);
    setEditingId(null);
    setIsAdding(false);
    setEditTitle('');
    setEditText('');
  };

  const handleDelete = async (id) => {
    if (window.confirm('確定要刪除此常用訊息嗎？')) {
      const newReplies = replies.filter(r => r.id !== id);
      await saveQuickReplies(newReplies);
      setReplies(newReplies);
    }
  };

  const startEdit = (reply) => {
    setEditingId(reply.id);
    setEditTitle(reply.title);
    setEditText(reply.text);
    setIsAdding(false);
  };

  const startAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setEditTitle('');
    setEditText('');
  };

  const stripHtml = (html) => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white border-[4px] border-black shadow-[8px_8px_0_0_#000] max-w-2xl w-full flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b-2 border-black bg-blue-50 shrink-0">
          <h2 className="text-xl font-black flex items-center">
            <MessageSquare className="w-5 h-5 mr-2 text-blue-600" />
            常用訊息管理
          </h2>
          <button onClick={onClose} className="text-black hover:text-red-500 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-4 bg-white flex-1 overflow-y-auto space-y-4">
          {!isAdding && !editingId && (
            <button 
              onClick={startAdd}
              className="w-full py-3 bg-blue-500 hover:bg-blue-400 text-white font-black border-2 border-black comic-box-sm flex items-center justify-center mb-4"
            >
              <Plus className="w-5 h-5 mr-2" /> 新增常用訊息
            </button>
          )}

          {(isAdding || editingId) && (
            <div className="bg-slate-50 border-2 border-black p-4 comic-box-sm space-y-3 mb-4">
              <h3 className="font-black text-lg">{isAdding ? '新增常用訊息' : '編輯常用訊息'}</h3>
              <input 
                type="text" 
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                placeholder="輸入標題 (例如：歡迎光臨)"
                className="w-full p-2 border-2 border-black outline-none"
              />
              <RichTextEditor 
                value={editText}
                onChange={setEditText}
                placeholder="輸入內文說明 (支援變數：{好友的顯示名稱})"
                styleClass="h-48"
              />
              <div className="flex justify-end space-x-2">
                <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="px-4 py-2 border-2 border-black font-bold hover:bg-slate-200">取消</button>
                <button onClick={() => handleSave(editingId)} className="px-4 py-2 bg-green-500 text-white font-bold border-2 border-black hover:bg-green-400 flex items-center"><Save className="w-4 h-4 mr-2"/> 儲存</button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center p-8 font-bold">載入中...</div>
          ) : replies.length === 0 && !isAdding ? (
            <div className="text-center p-8 text-slate-500 font-bold border-2 border-dashed border-slate-300">目前沒有常用訊息，點擊上方按鈕新增！</div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {replies.map(reply => (
                <div key={reply.id} className="border-2 border-black p-3 flex justify-between items-start bg-white comic-box-sm group">
                  <div className="flex-1 mr-4 cursor-pointer" onClick={() => onSelect(reply.text)}>
                    <h4 className="font-black text-lg text-blue-700">{reply.title}</h4>
                    <p className="text-sm text-slate-600 line-clamp-2 mt-1">{stripHtml(reply.text)}</p>
                  </div>
                  <div className="flex space-x-2 opacity-50 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(reply)} className="p-2 hover:bg-yellow-100 text-yellow-600 border border-transparent hover:border-black rounded"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(reply.id)} className="p-2 hover:bg-red-100 text-red-600 border border-transparent hover:border-black rounded"><Trash2 className="w-4 h-4" /></button>
                    <button onClick={() => onSelect(reply.text)} className="p-2 bg-green-100 text-green-700 border border-black font-bold text-xs whitespace-nowrap">套用</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
