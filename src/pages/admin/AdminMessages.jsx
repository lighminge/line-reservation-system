import { useState, useEffect, useRef } from 'react';
import { MessageSquare, UploadCloud, Loader2, CheckCircle2, AlertCircle, Image as ImageIcon, BookmarkPlus } from 'lucide-react';
import { getMessageTemplates, saveMessageTemplates, uploadImage, resolveImageUrl } from '../../services/db';
import RichTextEditor from '../../components/RichTextEditor';
import QuickRepliesModal from '../../components/QuickRepliesModal';

export default function AdminMessages() {
  const [templates, setTemplates] = useState({
    clientSuccess: { title: '', text: '', imageUrl: '' },
    lineConfirm: { title: '', text: '', imageUrl: '' },
    adminCustomMessage: { title: '', text: '', imageUrl: '' },
    reminderDayBefore: { title: '', text: '', imageUrl: '' },
    reminderTwoDaysBefore: { title: '', text: '', imageUrl: '' },
    reminderThreeDaysBefore: { title: '', text: '', imageUrl: '' },
    reminderSameDay: { title: '', text: '', imageUrl: '' },
    settings: { useOriginalLineNameForPush: false }
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const clientFileRef = useRef(null);
  const lineFileRef = useRef(null);
  const customMessageFileRef = useRef(null);
  const dayBeforeFileRef = useRef(null);
  const twoDaysBeforeFileRef = useRef(null);
  const threeDaysBeforeFileRef = useRef(null);
  const sameDayFileRef = useRef(null);
  
  const [clientFile, setClientFile] = useState(null);
  const [lineFile, setLineFile] = useState(null);
  const [customMessageFile, setCustomMessageFile] = useState(null);
  const [dayBeforeFile, setDayBeforeFile] = useState(null);
  const [twoDaysBeforeFile, setTwoDaysBeforeFile] = useState(null);
  const [threeDaysBeforeFile, setThreeDaysBeforeFile] = useState(null);
  const [sameDayFile, setSameDayFile] = useState(null);
  
  const [clientPreview, setClientPreview] = useState('');
  const [linePreview, setLinePreview] = useState('');
  const [customMessagePreview, setCustomMessagePreview] = useState('');
  const [dayBeforePreview, setDayBeforePreview] = useState('');
  const [twoDaysBeforePreview, setTwoDaysBeforePreview] = useState('');
  const [threeDaysBeforePreview, setThreeDaysBeforePreview] = useState('');
  const [sameDayPreview, setSameDayPreview] = useState('');

  // Quick Replies Modal State
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [activeQrField, setActiveQrField] = useState('');
  
  const clientSuccessTitleRef = useRef(null);
  const lineConfirmTitleRef = useRef(null);
  const adminCustomTitleRef = useRef(null);
  const reminderDayBeforeTitleRef = useRef(null);
  const reminderTwoDaysBeforeTitleRef = useRef(null);
  const reminderThreeDaysBeforeTitleRef = useRef(null);
  const reminderSameDayTitleRef = useRef(null);
  const clientSuccessRef = useRef(null);
  const lineConfirmRef = useRef(null);
  const adminCustomRef = useRef(null);
  const reminderDayBeforeRef = useRef(null);
  const reminderTwoDaysBeforeRef = useRef(null);
  const reminderThreeDaysBeforeRef = useRef(null);
  const reminderSameDayRef = useRef(null); // 'clientSuccess', 'lineConfirm', 'adminCustom'

  // View Category State
  const [viewCategory, setViewCategory] = useState('RESERVATION');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    const data = await getMessageTemplates();
    if (data) {
      setTemplates(prev => ({
        ...prev,
        clientSuccess: { ...prev.clientSuccess, ...data.clientSuccess },
        lineConfirm: { ...prev.lineConfirm, ...data.lineConfirm },
        adminCustomMessage: { ...prev.adminCustomMessage, ...data.adminCustomMessage },
        reminderDayBefore: { ...prev.reminderDayBefore, ...data.reminderDayBefore },
        reminderTwoDaysBefore: { ...prev.reminderTwoDaysBefore, ...data.reminderTwoDaysBefore },
        reminderThreeDaysBefore: { ...prev.reminderThreeDaysBefore, ...data.reminderThreeDaysBefore },
        reminderSameDay: { ...prev.reminderSameDay, ...data.reminderSameDay },
        settings: { ...prev.settings, ...data.settings }
      }));
      if (data.clientSuccess?.imageUrl) {
        setClientPreview(await resolveImageUrl(data.clientSuccess.imageUrl));
      }
      if (data.lineConfirm?.imageUrl) {
        setLinePreview(await resolveImageUrl(data.lineConfirm.imageUrl));
      }
      if (data.adminCustomMessage?.imageUrl) {
        setCustomMessagePreview(await resolveImageUrl(data.adminCustomMessage.imageUrl));
      }
      if (data.reminderDayBefore?.imageUrl) { setDayBeforePreview(await resolveImageUrl(data.reminderDayBefore.imageUrl)); }
      if (data.reminderTwoDaysBefore?.imageUrl) { setTwoDaysBeforePreview(await resolveImageUrl(data.reminderTwoDaysBefore.imageUrl)); }
      if (data.reminderThreeDaysBefore?.imageUrl) { setThreeDaysBeforePreview(await resolveImageUrl(data.reminderThreeDaysBefore.imageUrl)); }
      if (data.reminderSameDay?.imageUrl) {
        setSameDayPreview(await resolveImageUrl(data.reminderSameDay.imageUrl));
      }
    }
    setLoading(false);
  };

  const handleImageChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'client') {
          setClientFile(file);
          setClientPreview(reader.result);
        } else if (type === 'line') {
          setLineFile(file);
          setLinePreview(reader.result);
        } else if (type === 'customMessage') {
          setCustomMessageFile(file);
          setCustomMessagePreview(reader.result);
        } else if (type === 'dayBefore') { setDayBeforeFile(file); setDayBeforePreview(reader.result); } else if (type === 'twoDaysBefore') { setTwoDaysBeforeFile(file); setTwoDaysBeforePreview(reader.result); } else if (type === 'threeDaysBefore') { setThreeDaysBeforeFile(file); setThreeDaysBeforePreview(reader.result); } else if (type === 'sameDay') {
          setSameDayFile(file);
          setSameDayPreview(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      let finalClientImg = templates.clientSuccess.imageUrl;
      let finalLineImg = templates.lineConfirm.imageUrl;
      let finalCustomImg = templates.adminCustomMessage?.imageUrl || '';
      let finalDayBeforeImg = templates.reminderDayBefore?.imageUrl || '';
      let finalTwoDaysBeforeImg = templates.reminderTwoDaysBefore?.imageUrl || '';
      let finalThreeDaysBeforeImg = templates.reminderThreeDaysBefore?.imageUrl || '';
      let finalSameDayImg = templates.reminderSameDay?.imageUrl || '';

      if (clientFile) {
        finalClientImg = await uploadImage(clientFile, `messages/${Date.now()}_client_${clientFile.name}`);
      }
      if (lineFile) {
        finalLineImg = await uploadImage(lineFile, `messages/${Date.now()}_line_${lineFile.name}`);
      }
      if (customMessageFile) {
        finalCustomImg = await uploadImage(customMessageFile, `messages/${Date.now()}_custom_${customMessageFile.name}`);
      }
      if (dayBeforeFile) { finalDayBeforeImg = await uploadImage(dayBeforeFile, `messages/${Date.now()}_dayBefore_${dayBeforeFile.name}`); }
      if (twoDaysBeforeFile) { finalTwoDaysBeforeImg = await uploadImage(twoDaysBeforeFile, `messages/${Date.now()}_twoDaysBefore_${twoDaysBeforeFile.name}`); }
      if (threeDaysBeforeFile) { finalThreeDaysBeforeImg = await uploadImage(threeDaysBeforeFile, `messages/${Date.now()}_threeDaysBefore_${threeDaysBeforeFile.name}`); }
      if (sameDayFile) {
        finalSameDayImg = await uploadImage(sameDayFile, `messages/${Date.now()}_sameDay_${sameDayFile.name}`);
      }

      const finalTemplates = {
        clientSuccess: { ...templates.clientSuccess, imageUrl: finalClientImg },
        lineConfirm: { ...templates.lineConfirm, imageUrl: finalLineImg },
        adminCustomMessage: { ...templates.adminCustomMessage, imageUrl: finalCustomImg },
        reminderDayBefore: { ...templates.reminderDayBefore, imageUrl: finalDayBeforeImg },
        reminderTwoDaysBefore: { ...templates.reminderTwoDaysBefore, imageUrl: finalTwoDaysBeforeImg },
        reminderThreeDaysBefore: { ...templates.reminderThreeDaysBefore, imageUrl: finalThreeDaysBeforeImg },
        reminderSameDay: { ...templates.reminderSameDay, imageUrl: finalSameDayImg },
        settings: { ...templates.settings }
      };

      await saveMessageTemplates(finalTemplates);
      
      setTemplates(finalTemplates);
      setClientFile(null);
      setLineFile(null);
      setCustomMessageFile(null);
      setDayBeforeFile(null);
      setTwoDaysBeforeFile(null);
      setThreeDaysBeforeFile(null);
      setSameDayFile(null);
      setMessage({ text: '訊息畫面設定儲存成功！', type: 'success' });
    } catch (error) {
      let errorMsg = error.message;
      if (errorMsg.includes('unauthorized')) {
        errorMsg += " (請檢查 Firebase Storage 的安全性規則是否允許寫入)";
      }
      setMessage({ text: '儲存失敗: ' + errorMsg, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 comic-theme">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-black font-black">預約訊息畫面管理</h1>
          <p className="text-black font-bold mt-2">自訂預約、客製推播與預約提醒的訊息內容。</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 p-2 border-2 border-black w-full md:w-auto comic-box-sm">
          <span className="font-black text-sm">設定類別：</span>
          <select 
            value={viewCategory}
            onChange={(e) => setViewCategory(e.target.value)}
            className="p-2 border-2 border-black font-black bg-white min-w-[150px] outline-none"
          >
            <option value="ALL">全部顯示</option>
            <option value="RESERVATION">預約 (成功與審核)</option>
            <option value="CUSTOM">客製化推播訊息</option>
            <option value="REMINDER">預約提醒 (前一日與當日)</option>
          </select>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {(viewCategory === 'ALL' || viewCategory === 'RESERVATION') && (
          <>
            {/* Client Web Success Screen */}
        <div className="bg-white comic-box flex flex-col">
          <div className="bg-blue-600 rounded-t-2xl p-5 text-  justify-between items-center shrink-0">
            <h2 className="text-lg font-bold flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              客戶預約成功推播 (LINE)
            </h2>
            <span className="text-blue-100 text-sm">客戶送出預約後收到</span>
          </div>
          
          <div className="p-6 md:p-8 space-y-6 flex-1 bg-slate-50">
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="text-sm font-semibold text-black font-black block">
                  主標題
                </label>
                <div className="flex items-center gap-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        clientSuccessTitleRef.current?.insertTextAtCursor(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="text-xs font-semibold text-black bg-yellow-300 hover:bg-yellow-400 px-2 py-1 rounded border-2 border-black shadow-[2px_2px_0_0_#000] outline-none cursor-pointer"
                  >
                    <option value="">+ 插入變數</option>
                    <option value="{好友的顯示名稱}">好友的名稱</option>
                    <option value="{預約日期}">預約日期</option>
                    <option value="{預約時段}">預約時段</option>
                    <option value="{預約項目}">預約項目</option>
                    <option value="{用戶性別}">用戶性別</option>
                    <option value="{用戶生日}">用戶生日</option>
                    <option value="{用戶星座}">用戶星座</option>
                  </select>
                </div>
              </div>
              <RichTextEditor ref={clientSuccessTitleRef} value={templates.clientSuccess.title}
                onChange={val => setTemplates({...templates, clientSuccess: {...templates.clientSuccess, title: val}})}
                placeholder="例如：預約已送出！"
                styleClass="h-24"
              />
            </div>
            
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="text-sm font-semibold text-black font-black block">
                  內文說明
                  <span className="text-xs text-blue-500 font-normal ml-2">支援變數：請使用上方選單插入</span>
                </label>
                <div className="flex items-center gap-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        clientSuccessRef.current?.insertTextAtCursor(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="text-xs font-semibold text-black bg-yellow-300 hover:bg-yellow-400 px-2 py-1 rounded border-2 border-black shadow-[2px_2px_0_0_#000] outline-none cursor-pointer"
                  >
                    <option value="">+ 插入變數</option>
                    <option value="{好友的顯示名稱}">好友的名稱</option>
                    <option value="{預約日期}">預約日期</option>
                    <option value="{預約時段}">預約時段</option>
                    <option value="{預約項目}">預約項目</option>
                    <option value="{用戶性別}">用戶性別</option>
                    <option value="{用戶生日}">用戶生日</option>
                    <option value="{用戶星座}">用戶星座</option>
                  </select>
                  <button 
                    type="button" 
                    onClick={() => { setActiveQrField('clientSuccess'); setQrModalOpen(true); }}
                    className="text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded border-2 border-black flex items-center shadow-[2px_2px_0_0_#000] active:shadow-[0_0_0_0_#000] active:translate-x-[2px] active:translate-y-[2px] transition-all"
                  >
                    <BookmarkPlus className="w-3 h-3 mr-1" /> 常用訊息
                  </button>
                </div>
              </div>
              <RichTextEditor ref={clientSuccessRef} 
                value={templates.clientSuccess.text}
                onChange={val => setTemplates({...templates, clientSuccess: {...templates.clientSuccess, text: val}})}
                placeholder="請輸入成功提示文字"
                styleClass="h-48"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-black font-black block mb-2">上方圖案 (選項)</label>
              <div 
                onClick={() => clientFileRef.current?.click()}
                className="w-full h-40 border-2 border-black comic-box-sm border-2 border-dashed border-black bg-white flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors overflow-hidden relative group"
              >
                {clientPreview ? (
                  <>
                    <img src={clientPreview} alt="Preview" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white font-medium flex items-center"><UploadCloud className="w-5 h-5 mr-2" /> 更換圖片</p>
                    </div>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-8 h-8 text-slate-400 mb-2 group-hover:text-blue-500" />
                    <span className="text-sm text-black font-bold group-hover:text-blue-600 font-medium">點擊上傳圖片</span>
                  </>
                )}
              </div>
              <input type="file" ref={clientFileRef} onChange={e => handleImageChange(e, 'client')} accept="image/jpeg, image/png, image/jpg" className="hidden" />
              {clientPreview && (
                <button type="button" onClick={() => { setClientPreview(''); setClientFile(null); setTemplates({...templates, clientSuccess: {...templates.clientSuccess, imageUrl: ''}}) }} className="text-red-500 text-xs mt-2 hover:underline">移除圖片</button>
              )}
              <div className="mt-3 bg-slate-100 p-3 border-2 border-black border border-black">
                <ul className="text-xs text-black font-bold space-y-1 list-disc list-inside">
                  <li><span className="font-semibold text-black font-black">支援檔案類型</span>：JPG, JPEG, PNG。</li>
                  <li><span className="font-semibold text-black font-black">檔案大小限制</span>：建議 1MB 以下，以確保載入速度。</li>
                  <li><span className="font-semibold text-black font-black">檔案比例建議</span>：推薦使用 20:13 (橫式) 比例，以達到最佳顯示效果。</li>
                  <li><span className="font-semibold text-black font-black">上傳設計建議</span>：由於推播文字會顯示在圖片下方，圖片可著重視覺氛圍呈現，不需包含過多說明文字或壓字。</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Line Flex Message Confirm */}
        <div className="bg-white comic-box flex flex-col">
          <div className="bg-green-600 rounded-t-2xl p-5 text-  justify-between items-center shrink-0">
            <h2 className="text-lg font-bold flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              Line 確認推播訊息
            </h2>
            <span className="text-green-100 text-sm">管理員點擊確認後發送</span>
          </div>
          
          <div className="p-6 md:p-8 space-y-6 flex-1 bg-slate-50">
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="text-sm font-semibold text-black font-black block">
                  主標題
                </label>
                <div className="flex items-center gap-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        lineConfirmTitleRef.current?.insertTextAtCursor(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="text-xs font-semibold text-black bg-yellow-300 hover:bg-yellow-400 px-2 py-1 rounded border-2 border-black shadow-[2px_2px_0_0_#000] outline-none cursor-pointer"
                  >
                    <option value="">+ 插入變數</option>
                    <option value="{好友的顯示名稱}">好友的名稱</option>
                    <option value="{預約日期}">預約日期</option>
                    <option value="{預約時段}">預約時段</option>
                    <option value="{預約項目}">預約項目</option>
                    <option value="{用戶性別}">用戶性別</option>
                    <option value="{用戶生日}">用戶生日</option>
                    <option value="{用戶星座}">用戶星座</option>
                  </select>
                </div>
              </div>
              <RichTextEditor ref={lineConfirmTitleRef} value={templates.lineConfirm.title}
                onChange={val => setTemplates({...templates, lineConfirm: {...templates.lineConfirm, title: val}})}
                placeholder="例如：預約成功確認"
                styleClass="h-24"
              />
            </div>
            
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="text-sm font-semibold text-black font-black block">
                  內文說明<br/><span className="text-xs font-normal text-slate-500">(下方會自動附上時間等資訊)</span>
                  <span className="text-xs text-green-600 font-normal ml-2">支援變數：請使用上方選單插入</span>
                </label>
                <div className="flex items-center gap-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        lineConfirmRef.current?.insertTextAtCursor(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="text-xs font-semibold text-black bg-yellow-300 hover:bg-yellow-400 px-2 py-1 rounded border-2 border-black shadow-[2px_2px_0_0_#000] outline-none cursor-pointer"
                  >
                    <option value="">+ 插入變數</option>
                    <option value="{好友的顯示名稱}">好友的名稱</option>
                    <option value="{預約日期}">預約日期</option>
                    <option value="{預約時段}">預約時段</option>
                    <option value="{預約項目}">預約項目</option>
                    <option value="{用戶性別}">用戶性別</option>
                    <option value="{用戶生日}">用戶生日</option>
                    <option value="{用戶星座}">用戶星座</option>
                  </select>
                  <button 
                    type="button" 
                    onClick={() => { setActiveQrField('lineConfirm'); setQrModalOpen(true); }}
                    className="text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded border-2 border-black flex items-center shadow-[2px_2px_0_0_#000] active:shadow-[0_0_0_0_#000] active:translate-x-[2px] active:translate-y-[2px] transition-all"
                  >
                    <BookmarkPlus className="w-3 h-3 mr-1" /> 常用訊息
                  </button>
                </div>
              </div>
              <RichTextEditor ref={lineConfirmRef} 
                value={templates.lineConfirm.text}
                onChange={val => setTemplates({...templates, lineConfirm: {...templates.lineConfirm, text: val}})}
                placeholder="例如：期待您的到來！"
                styleClass="h-48"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-black font-black block mb-2">卡片橫幅圖案 (選項)</label>
              <div 
                onClick={() => lineFileRef.current?.click()}
                className="w-full h-40 border-2 border-black comic-box-sm border-2 border-dashed border-black bg-white flex flex-col items-center justify-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors overflow-hidden relative group"
              >
                {linePreview ? (
                  <>
                    <img src={linePreview} alt="Preview" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white font-medium flex items-center"><UploadCloud className="w-5 h-5 mr-2" /> 更換圖片</p>
                    </div>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-8 h-8 text-slate-400 mb-2 group-hover:text-green-500" />
                    <span className="text-sm text-black font-bold group-hover:text-green-600 font-medium">點擊上傳圖片</span>
                  </>
                )}
              </div>
              <input type="file" ref={lineFileRef} onChange={e => handleImageChange(e, 'line')} accept="image/jpeg, image/png, image/jpg" className="hidden" />
              {linePreview && (
                <button type="button" onClick={() => { setLinePreview(''); setLineFile(null); setTemplates({...templates, lineConfirm: {...templates.lineConfirm, imageUrl: ''}}) }} className="text-red-500 text-xs mt-2 hover:underline">移除圖片</button>
              )}
              <div className="mt-3 bg-slate-100 p-3 border-2 border-black border border-black">
                <ul className="text-xs text-black font-bold space-y-1 list-disc list-inside">
                  <li><span className="font-semibold text-black font-black">支援檔案類型</span>：JPG, JPEG, PNG。</li>
                  <li><span className="font-semibold text-black font-black">檔案大小限制</span>：建議 1MB 以下，以確保載入速度。</li>
                  <li><span className="font-semibold text-black font-black">檔案比例建議</span>：推薦使用 20:13 (橫式) 比例，以達到最佳顯示效果。</li>
                  <li><span className="font-semibold text-black font-black">上傳設計建議</span>：由於推播文字會顯示在圖片下方，圖片可著重視覺氛圍呈現，不需包含過多說明文字或壓字。</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
          </>
        )}

        {(viewCategory === 'ALL' || viewCategory === 'CUSTOM') && (
          <>
            {/* Admin Custom Message (Users Page) */}
            <div className="bg-white comic-box flex flex-col lg:col-span-2">
          <div className="bg-yellow-500 rounded-t-2xl p-5 text-  border-black flex justify-between items-center shrink-0">
            <h2 className="text-lg font-black flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              用戶管理 - 客製化推播訊息
            </h2>
            <span className="text-yellow-900 font-bold text-sm">於「用戶管理」發送訊息時的預設範本</span>
          </div>
          
          <div className="p-6 md:p-8 space-y-6 flex-1 bg-slate-50 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-end mb-2">
                <label className="text-sm font-semibold text-black font-black block">
                  主標題
                </label>
                <div className="flex items-center gap-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        adminCustomTitleRef.current?.insertTextAtCursor(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="text-xs font-semibold text-black bg-yellow-300 hover:bg-yellow-400 px-2 py-1 rounded border-2 border-black shadow-[2px_2px_0_0_#000] outline-none cursor-pointer"
                  >
                    <option value="">+ 插入變數</option>
                    <option value="{好友的顯示名稱}">好友的名稱</option>
                    <option value="{預約日期}">預約日期</option>
                    <option value="{預約時段}">預約時段</option>
                    <option value="{預約項目}">預約項目</option>
                    <option value="{用戶性別}">用戶性別</option>
                    <option value="{用戶生日}">用戶生日</option>
                    <option value="{用戶星座}">用戶星座</option>
                  </select>
                </div>
              </div>
              <RichTextEditor ref={adminCustomTitleRef} value={templates.adminCustomMessage?.title || ''}
                  onChange={val => setTemplates({...templates, adminCustomMessage: {...templates.adminCustomMessage, title: val}})}
                  placeholder="例如：系統通知"
                  styleClass="h-24"
                />
              </div>
              
              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="text-sm font-semibold text-black font-black block">
                    預設內文說明
                    <span className="text-xs text-yellow-700 font-bold ml-2">支援變數：請使用上方選單插入</span>
                  </label>
                  <div className="flex items-center gap-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        adminCustomRef.current?.insertTextAtCursor(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="text-xs font-semibold text-black bg-yellow-300 hover:bg-yellow-400 px-2 py-1 rounded border-2 border-black shadow-[2px_2px_0_0_#000] outline-none cursor-pointer"
                  >
                    <option value="">+ 插入變數</option>
                    <option value="{好友的顯示名稱}">好友的名稱</option>
                    <option value="{預約日期}">預約日期</option>
                    <option value="{預約時段}">預約時段</option>
                    <option value="{預約項目}">預約項目</option>
                    <option value="{用戶性別}">用戶性別</option>
                    <option value="{用戶生日}">用戶生日</option>
                    <option value="{用戶星座}">用戶星座</option>
                  </select>
                  <button 
                    type="button" 
                    onClick={() => { setActiveQrField('adminCustom'); setQrModalOpen(true); }}
                    className="text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded border-2 border-black flex items-center shadow-[2px_2px_0_0_#000] active:shadow-[0_0_0_0_#000] active:translate-x-[2px] active:translate-y-[2px] transition-all"
                  >
                    <BookmarkPlus className="w-3 h-3 mr-1" /> 常用訊息
                  </button>
                </div>
                </div>
                <RichTextEditor 
                  ref={adminCustomRef} value={templates.adminCustomMessage?.text || ''}
                  onChange={val => setTemplates({...templates, adminCustomMessage: {...templates.adminCustomMessage, text: val}})}
                  placeholder="請輸入預設發送的內容"
                  styleClass="h-48"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-black font-black block mb-2">預設卡片橫幅圖案 (選項)</label>
              <div 
                onClick={() => customMessageFileRef.current?.click()}
                className="w-full h-40 border-2 border-black comic-box-sm border-2 border-dashed border-black bg-white flex flex-col items-center justify-center cursor-pointer hover:border-yellow-400 hover:bg-yellow-50 transition-colors overflow-hidden relative group"
              >
                {customMessagePreview ? (
                  <>
                    <img src={customMessagePreview} alt="Preview" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white font-medium flex items-center"><UploadCloud className="w-5 h-5 mr-2" /> 更換圖片</p>
                    </div>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-8 h-8 text-slate-400 mb-2 group-hover:text-yellow-600" />
                    <span className="text-sm text-black font-bold group-hover:text-yellow-700 font-medium">點擊上傳圖片</span>
                  </>
                )}
              </div>
              <input type="file" ref={customMessageFileRef} onChange={e => handleImageChange(e, 'customMessage')} accept="image/jpeg, image/png, image/jpg" className="hidden" />
              {customMessagePreview && (
                <button type="button" onClick={() => { setCustomMessagePreview(''); setCustomMessageFile(null); setTemplates({...templates, adminCustomMessage: {...templates.adminCustomMessage, imageUrl: ''}}) }} className="text-red-500 text-xs mt-2 hover:underline font-bold">移除圖片</button>
              )}
              <div className="mt-3 bg-slate-100 p-3 border-2 border-black border border-black">
                <ul className="text-xs text-black font-bold space-y-1 list-disc list-inside">
                  <li><span className="font-semibold text-black font-black">支援檔案類型</span>：JPG, JPEG, PNG。</li>
                  <li><span className="font-semibold text-black font-black">檔案大小限制</span>：建議 1MB 以下，以確保載入速度。</li>
                  <li><span className="font-semibold text-black font-black">檔案比例建議</span>：推薦使用 20:13 (橫式) 比例，以達到最佳顯示效果。</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
          </>
        )}

        {(viewCategory === 'ALL' || viewCategory === 'REMINDER') && (
          <>
        {/* Reminder Three Days Before */}
        <div className="bg-white comic-box flex flex-col">
          <div className="bg-blue-500 rounded-t-2xl p-5 text-  border-black flex justify-between items-center shrink-0">
            <h2 className="text-lg font-black flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              預約提醒 - 前三日
            </h2>
          </div>
          
          <div className="p-6 md:p-8 space-y-6 flex-1 bg-slate-50">
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="text-sm font-semibold text-black font-black block">
                  主標題
                </label>
                <div className="flex items-center gap-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        reminderThreeDaysBeforeTitleRef.current?.insertTextAtCursor(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="text-xs font-semibold text-black bg-yellow-300 hover:bg-yellow-400 px-2 py-1 rounded border-2 border-black shadow-[2px_2px_0_0_#000] outline-none cursor-pointer"
                  >
                    <option value="">+ 插入變數</option>
                    <option value="{好友的顯示名稱}">好友的名稱</option>
                    <option value="{預約日期}">預約日期</option>
                    <option value="{預約時段}">預約時段</option>
                    <option value="{預約項目}">預約項目</option>
                    <option value="{用戶性別}">用戶性別</option>
                    <option value="{用戶生日}">用戶生日</option>
                    <option value="{用戶星座}">用戶星座</option>
                  </select>
                </div>
              </div>
              <RichTextEditor ref={reminderThreeDaysBeforeTitleRef} value={templates.reminderThreeDaysBefore?.title || ''}
                onChange={val => setTemplates({...templates, reminderThreeDaysBefore: {...templates.reminderThreeDaysBefore, title: val}})}
                placeholder="例如：貼心提醒：明日預約"
                styleClass="h-24"
              />
            </div>
            
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="text-sm font-semibold text-black font-black block">
                  內文說明
                  <span className="text-xs text-blue-700 font-bold ml-2">支援變數：{'{好友的顯示名稱}'}</span>
                </label>
                <div className="flex items-center gap-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        reminderThreeDaysBeforeRef.current?.insertTextAtCursor(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="text-xs font-semibold text-black bg-yellow-300 hover:bg-yellow-400 px-2 py-1 rounded border-2 border-black shadow-[2px_2px_0_0_#000] outline-none cursor-pointer"
                  >
                    <option value="">+ 插入變數</option>
                    <option value="{好友的顯示名稱}">好友的名稱</option>
                    <option value="{預約日期}">預約日期</option>
                    <option value="{預約時段}">預約時段</option>
                    <option value="{預約項目}">預約項目</option>
                    <option value="{用戶性別}">用戶性別</option>
                    <option value="{用戶生日}">用戶生日</option>
                    <option value="{用戶星座}">用戶星座</option>
                  </select>
                  <button 
                    type="button" 
                    onClick={() => { setActiveQrField('reminderThreeDaysBefore'); setQrModalOpen(true); }}
                    className="text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded border-2 border-black flex items-center shadow-[2px_2px_0_0_#000] active:shadow-[0_0_0_0_#000] active:translate-x-[2px] active:translate-y-[2px] transition-all"
                  >
                    <BookmarkPlus className="w-3 h-3 mr-1" /> 常用訊息
                  </button>
                </div>
              </div>
              <RichTextEditor 
                ref={reminderThreeDaysBeforeRef} value={templates.reminderThreeDaysBefore?.text || ''}
                onChange={val => setTemplates({...templates, reminderThreeDaysBefore: {...templates.reminderThreeDaysBefore, text: val}})}
                placeholder="請輸入前三日的預約提醒內容"
                styleClass="h-48"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-black font-black block mb-2">上方圖案 (選項)</label>
              <div 
                onClick={() => threeDaysBeforeFileRef.current?.click()}
                className="w-full h-40 border-2 border-black comic-box-sm border-2 border-dashed border-black bg-white flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors overflow-hidden relative group"
              >
                {threeDaysBeforePreview ? (
                  <>
                    <img src={threeDaysBeforePreview} alt="Preview" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white font-medium flex items-center"><UploadCloud className="w-5 h-5 mr-2" /> 更換圖片</p>
                    </div>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-8 h-8 text-slate-400 mb-2 group-hover:text-blue-600" />
                    <span className="text-sm text-black font-bold group-hover:text-blue-700 font-medium">點擊上傳圖片</span>
                  </>
                )}
              </div>
              <input type="file" ref={threeDaysBeforeFileRef} onChange={e => handleImageChange(e, 'threeDaysBefore')} accept="image/jpeg, image/png, image/jpg" className="hidden" />
              {threeDaysBeforePreview && (
                <button type="button" onClick={() => { setThreeDaysBeforePreview(''); setThreeDaysBeforeFile(null); setTemplates({...templates, reminderThreeDaysBefore: {...templates.reminderThreeDaysBefore, imageUrl: ''}}) }} className="text-red-500 text-xs mt-2 hover:underline font-bold">移除圖片</button>
              )}
            </div>
          </div>
        </div>


        {/* Reminder Two Days Before */}
        <div className="bg-white comic-box flex flex-col">
          <div className="bg-indigo-500 rounded-t-2xl p-5 text-  border-black flex justify-between items-center shrink-0">
            <h2 className="text-lg font-black flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              預約提醒 - 前二日
            </h2>
          </div>
          
          <div className="p-6 md:p-8 space-y-6 flex-1 bg-slate-50">
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="text-sm font-semibold text-black font-black block">
                  主標題
                </label>
                <div className="flex items-center gap-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        reminderTwoDaysBeforeTitleRef.current?.insertTextAtCursor(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="text-xs font-semibold text-black bg-yellow-300 hover:bg-yellow-400 px-2 py-1 rounded border-2 border-black shadow-[2px_2px_0_0_#000] outline-none cursor-pointer"
                  >
                    <option value="">+ 插入變數</option>
                    <option value="{好友的顯示名稱}">好友的名稱</option>
                    <option value="{預約日期}">預約日期</option>
                    <option value="{預約時段}">預約時段</option>
                    <option value="{預約項目}">預約項目</option>
                    <option value="{用戶性別}">用戶性別</option>
                    <option value="{用戶生日}">用戶生日</option>
                    <option value="{用戶星座}">用戶星座</option>
                  </select>
                </div>
              </div>
              <RichTextEditor ref={reminderTwoDaysBeforeTitleRef} value={templates.reminderTwoDaysBefore?.title || ''}
                onChange={val => setTemplates({...templates, reminderTwoDaysBefore: {...templates.reminderTwoDaysBefore, title: val}})}
                placeholder="例如：貼心提醒：明日預約"
                styleClass="h-24"
              />
            </div>
            
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="text-sm font-semibold text-black font-black block">
                  內文說明
                  <span className="text-xs text-indigo-700 font-bold ml-2">支援變數：{'{好友的顯示名稱}'}</span>
                </label>
                <div className="flex items-center gap-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        reminderTwoDaysBeforeRef.current?.insertTextAtCursor(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="text-xs font-semibold text-black bg-yellow-300 hover:bg-yellow-400 px-2 py-1 rounded border-2 border-black shadow-[2px_2px_0_0_#000] outline-none cursor-pointer"
                  >
                    <option value="">+ 插入變數</option>
                    <option value="{好友的顯示名稱}">好友的名稱</option>
                    <option value="{預約日期}">預約日期</option>
                    <option value="{預約時段}">預約時段</option>
                    <option value="{預約項目}">預約項目</option>
                    <option value="{用戶性別}">用戶性別</option>
                    <option value="{用戶生日}">用戶生日</option>
                    <option value="{用戶星座}">用戶星座</option>
                  </select>
                  <button 
                    type="button" 
                    onClick={() => { setActiveQrField('reminderTwoDaysBefore'); setQrModalOpen(true); }}
                    className="text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded border-2 border-black flex items-center shadow-[2px_2px_0_0_#000] active:shadow-[0_0_0_0_#000] active:translate-x-[2px] active:translate-y-[2px] transition-all"
                  >
                    <BookmarkPlus className="w-3 h-3 mr-1" /> 常用訊息
                  </button>
                </div>
              </div>
              <RichTextEditor 
                ref={reminderTwoDaysBeforeRef} value={templates.reminderTwoDaysBefore?.text || ''}
                onChange={val => setTemplates({...templates, reminderTwoDaysBefore: {...templates.reminderTwoDaysBefore, text: val}})}
                placeholder="請輸入前二日的預約提醒內容"
                styleClass="h-48"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-black font-black block mb-2">上方圖案 (選項)</label>
              <div 
                onClick={() => twoDaysBeforeFileRef.current?.click()}
                className="w-full h-40 border-2 border-black comic-box-sm border-2 border-dashed border-black bg-white flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors overflow-hidden relative group"
              >
                {twoDaysBeforePreview ? (
                  <>
                    <img src={twoDaysBeforePreview} alt="Preview" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white font-medium flex items-center"><UploadCloud className="w-5 h-5 mr-2" /> 更換圖片</p>
                    </div>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-8 h-8 text-slate-400 mb-2 group-hover:text-indigo-600" />
                    <span className="text-sm text-black font-bold group-hover:text-indigo-700 font-medium">點擊上傳圖片</span>
                  </>
                )}
              </div>
              <input type="file" ref={twoDaysBeforeFileRef} onChange={e => handleImageChange(e, 'twoDaysBefore')} accept="image/jpeg, image/png, image/jpg" className="hidden" />
              {twoDaysBeforePreview && (
                <button type="button" onClick={() => { setTwoDaysBeforePreview(''); setTwoDaysBeforeFile(null); setTemplates({...templates, reminderTwoDaysBefore: {...templates.reminderTwoDaysBefore, imageUrl: ''}}) }} className="text-red-500 text-xs mt-2 hover:underline font-bold">移除圖片</button>
              )}
            </div>
          </div>
        </div>


        {/* Reminder Day Before */}
        <div className="bg-white comic-box flex flex-col">
          <div className="bg-purple-500 rounded-t-2xl p-5 text-  border-black flex justify-between items-center shrink-0">
            <h2 className="text-lg font-black flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              預約提醒 - 前一日
            </h2>
          </div>
          
          <div className="p-6 md:p-8 space-y-6 flex-1 bg-slate-50">
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="text-sm font-semibold text-black font-black block">
                  主標題
                </label>
                <div className="flex items-center gap-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        reminderDayBeforeTitleRef.current?.insertTextAtCursor(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="text-xs font-semibold text-black bg-yellow-300 hover:bg-yellow-400 px-2 py-1 rounded border-2 border-black shadow-[2px_2px_0_0_#000] outline-none cursor-pointer"
                  >
                    <option value="">+ 插入變數</option>
                    <option value="{好友的顯示名稱}">好友的名稱</option>
                    <option value="{預約日期}">預約日期</option>
                    <option value="{預約時段}">預約時段</option>
                    <option value="{預約項目}">預約項目</option>
                    <option value="{用戶性別}">用戶性別</option>
                    <option value="{用戶生日}">用戶生日</option>
                    <option value="{用戶星座}">用戶星座</option>
                  </select>
                </div>
              </div>
              <RichTextEditor ref={reminderDayBeforeTitleRef} value={templates.reminderDayBefore?.title || ''}
                onChange={val => setTemplates({...templates, reminderDayBefore: {...templates.reminderDayBefore, title: val}})}
                placeholder="例如：貼心提醒：明日預約"
                styleClass="h-24"
              />
            </div>
            
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="text-sm font-semibold text-black font-black block">
                  內文說明
                  <span className="text-xs text-purple-700 font-bold ml-2">支援變數：{'{好友的顯示名稱}'}</span>
                </label>
                <div className="flex items-center gap-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        reminderDayBeforeRef.current?.insertTextAtCursor(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="text-xs font-semibold text-black bg-yellow-300 hover:bg-yellow-400 px-2 py-1 rounded border-2 border-black shadow-[2px_2px_0_0_#000] outline-none cursor-pointer"
                  >
                    <option value="">+ 插入變數</option>
                    <option value="{好友的顯示名稱}">好友的名稱</option>
                    <option value="{預約日期}">預約日期</option>
                    <option value="{預約時段}">預約時段</option>
                    <option value="{預約項目}">預約項目</option>
                    <option value="{用戶性別}">用戶性別</option>
                    <option value="{用戶生日}">用戶生日</option>
                    <option value="{用戶星座}">用戶星座</option>
                  </select>
                  <button 
                    type="button" 
                    onClick={() => { setActiveQrField('reminderDayBefore'); setQrModalOpen(true); }}
                    className="text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded border-2 border-black flex items-center shadow-[2px_2px_0_0_#000] active:shadow-[0_0_0_0_#000] active:translate-x-[2px] active:translate-y-[2px] transition-all"
                  >
                    <BookmarkPlus className="w-3 h-3 mr-1" /> 常用訊息
                  </button>
                </div>
              </div>
              <RichTextEditor 
                ref={reminderDayBeforeRef} value={templates.reminderDayBefore?.text || ''}
                onChange={val => setTemplates({...templates, reminderDayBefore: {...templates.reminderDayBefore, text: val}})}
                placeholder="請輸入前一日的預約提醒內容"
                styleClass="h-48"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-black font-black block mb-2">上方圖案 (選項)</label>
              <div 
                onClick={() => dayBeforeFileRef.current?.click()}
                className="w-full h-40 border-2 border-black comic-box-sm border-2 border-dashed border-black bg-white flex flex-col items-center justify-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-colors overflow-hidden relative group"
              >
                {dayBeforePreview ? (
                  <>
                    <img src={dayBeforePreview} alt="Preview" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white font-medium flex items-center"><UploadCloud className="w-5 h-5 mr-2" /> 更換圖片</p>
                    </div>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-8 h-8 text-slate-400 mb-2 group-hover:text-purple-600" />
                    <span className="text-sm text-black font-bold group-hover:text-purple-700 font-medium">點擊上傳圖片</span>
                  </>
                )}
              </div>
              <input type="file" ref={dayBeforeFileRef} onChange={e => handleImageChange(e, 'dayBefore')} accept="image/jpeg, image/png, image/jpg" className="hidden" />
              {dayBeforePreview && (
                <button type="button" onClick={() => { setDayBeforePreview(''); setDayBeforeFile(null); setTemplates({...templates, reminderDayBefore: {...templates.reminderDayBefore, imageUrl: ''}}) }} className="text-red-500 text-xs mt-2 hover:underline font-bold">移除圖片</button>
              )}
            </div>
          </div>
        </div>


        {/* Reminder Same Day */}
        <div className="bg-white comic-box flex flex-col">
          <div className="bg-orange-500 rounded-t-2xl p-5 text-  border-black flex justify-between items-center shrink-0">
            <h2 className="text-lg font-black flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              預約提醒 - 當日
            </h2>
          </div>
          
          <div className="p-6 md:p-8 space-y-6 flex-1 bg-slate-50">
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="text-sm font-semibold text-black font-black block">
                  主標題
                </label>
                <div className="flex items-center gap-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        reminderSameDayTitleRef.current?.insertTextAtCursor(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="text-xs font-semibold text-black bg-yellow-300 hover:bg-yellow-400 px-2 py-1 rounded border-2 border-black shadow-[2px_2px_0_0_#000] outline-none cursor-pointer"
                  >
                    <option value="">+ 插入變數</option>
                    <option value="{好友的顯示名稱}">好友的名稱</option>
                    <option value="{預約日期}">預約日期</option>
                    <option value="{預約時段}">預約時段</option>
                    <option value="{預約項目}">預約項目</option>
                    <option value="{用戶性別}">用戶性別</option>
                    <option value="{用戶生日}">用戶生日</option>
                    <option value="{用戶星座}">用戶星座</option>
                  </select>
                </div>
              </div>
              <RichTextEditor ref={reminderSameDayTitleRef} value={templates.reminderSameDay?.title || ''}
                onChange={val => setTemplates({...templates, reminderSameDay: {...templates.reminderSameDay, title: val}})}
                placeholder="例如：今日預約提醒！"
                styleClass="h-24"
              />
            </div>
            
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="text-sm font-semibold text-black font-black block">
                  內文說明
                  <span className="text-xs text-orange-700 font-bold ml-2">支援變數：{'{好友的顯示名稱}'}</span>
                </label>
                <div className="flex items-center gap-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        reminderSameDayRef.current?.insertTextAtCursor(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="text-xs font-semibold text-black bg-yellow-300 hover:bg-yellow-400 px-2 py-1 rounded border-2 border-black shadow-[2px_2px_0_0_#000] outline-none cursor-pointer"
                  >
                    <option value="">+ 插入變數</option>
                    <option value="{好友的顯示名稱}">好友的名稱</option>
                    <option value="{預約日期}">預約日期</option>
                    <option value="{預約時段}">預約時段</option>
                    <option value="{預約項目}">預約項目</option>
                    <option value="{用戶性別}">用戶性別</option>
                    <option value="{用戶生日}">用戶生日</option>
                    <option value="{用戶星座}">用戶星座</option>
                  </select>
                  <button 
                    type="button" 
                    onClick={() => { setActiveQrField('reminderSameDay'); setQrModalOpen(true); }}
                    className="text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded border-2 border-black flex items-center shadow-[2px_2px_0_0_#000] active:shadow-[0_0_0_0_#000] active:translate-x-[2px] active:translate-y-[2px] transition-all"
                  >
                    <BookmarkPlus className="w-3 h-3 mr-1" /> 常用訊息
                  </button>
                </div>
              </div>
              <RichTextEditor 
                ref={reminderSameDayRef} value={templates.reminderSameDay?.text || ''}
                onChange={val => setTemplates({...templates, reminderSameDay: {...templates.reminderSameDay, text: val}})}
                placeholder="請輸入當日的預約提醒內容"
                styleClass="h-48"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-black font-black block mb-2">上方圖案 (選項)</label>
              <div 
                onClick={() => sameDayFileRef.current?.click()}
                className="w-full h-40 border-2 border-black comic-box-sm border-2 border-dashed border-black bg-white flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors overflow-hidden relative group"
              >
                {sameDayPreview ? (
                  <>
                    <img src={sameDayPreview} alt="Preview" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white font-medium flex items-center"><UploadCloud className="w-5 h-5 mr-2" /> 更換圖片</p>
                    </div>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-8 h-8 text-slate-400 mb-2 group-hover:text-orange-600" />
                    <span className="text-sm text-black font-bold group-hover:text-orange-700 font-medium">點擊上傳圖片</span>
                  </>
                )}
              </div>
              <input type="file" ref={sameDayFileRef} onChange={e => handleImageChange(e, 'sameDay')} accept="image/jpeg, image/png, image/jpg" className="hidden" />
              {sameDayPreview && (
                <button type="button" onClick={() => { setSameDayPreview(''); setSameDayFile(null); setTemplates({...templates, reminderSameDay: {...templates.reminderSameDay, imageUrl: ''}}) }} className="text-red-500 text-xs mt-2 hover:underline font-bold">移除圖片</button>
              )}
            </div>
          </div>
        </div>
          </>
        )}

        {/* Form Actions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-4 comic-box border-[3px] border-black">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={templates.settings?.useOriginalLineNameForPush || false}
                onChange={e => setTemplates({...templates, settings: { ...templates.settings, useOriginalLineNameForPush: e.target.checked }})}
                className="w-5 h-5 border-2 border-black accent-yellow-400"
              />
              <span className="font-black text-black">在推播訊息中，使用原本的 LINE 名稱 (取代系統自訂名稱)</span>
            </label>
            <p className="text-sm text-slate-600 mt-2 font-bold pl-8">若勾選，不論管理員是否修改過用戶名稱，推播中對應的 {'{好友的顯示名稱}'} 都將優先使用用戶的原始 LINE 名稱。</p>
          </div>

          {message.text && (
            <div className={`p-4 border-2 border-black comic-box-sm flex items-center mb-6 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 mr-2 shrink-0" /> : <AlertCircle className="w-5 h-5 mr-2 shrink-0" />}
              <span className="text-sm font-medium">{message.text}</span>
            </div>
          )}

          <button 
            type="submit" 
            disabled={saving}
            className="w-full md:w-auto md:min-w-[200px] mx-auto block bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white font-bold py-4 px-8 border-2 border-black comic-box-sm transition-colors shadow-lg shadow-slate-800/20"
          >
            <div className="flex items-center justify-center">
              {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              儲存所有訊息設定
            </div>
          </button>
        </div>
      </form>
      
      <QuickRepliesModal 
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        activeCategory={
          (activeQrField === 'reminderDayBefore' || activeQrField === 'reminderSameDay' || activeQrField === 'reminderTwoDaysBefore' || activeQrField === 'reminderThreeDaysBefore') 
            ? 'reservationReminder' 
            : activeQrField
        }
        onSelect={(text) => {
          if (activeQrField === 'clientSuccess') {
            setTemplates({...templates, clientSuccess: {...templates.clientSuccess, text}});
          } else if (activeQrField === 'lineConfirm') {
            setTemplates({...templates, lineConfirm: {...templates.lineConfirm, text}});
          } else if (activeQrField === 'adminCustom') {
            setTemplates({...templates, adminCustomMessage: {...templates.adminCustomMessage, text}});
          } else if (activeQrField === 'reminderDayBefore') { setTemplates({...templates, reminderDayBefore: {...templates.reminderDayBefore, text}}); } else if (activeQrField === 'reminderTwoDaysBefore') { setTemplates({...templates, reminderTwoDaysBefore: {...templates.reminderTwoDaysBefore, text}}); } else if (activeQrField === 'reminderThreeDaysBefore') { setTemplates({...templates, reminderThreeDaysBefore: {...templates.reminderThreeDaysBefore, text}}); } else if (activeQrField === 'reminderSameDay') {
            setTemplates({...templates, reminderSameDay: {...templates.reminderSameDay, text}});
          }
          setQrModalOpen(false);
        }}
      />
    </div>
  );
}
