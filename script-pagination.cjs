const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminEvents.jsx', 'utf8');

// 1. States
content = content.replace(
  "const [userFilterTag, setUserFilterTag] = useState('');",
  "const [userFilterTag, setUserFilterTag] = useState('');\n  const [modalUserPage, setModalUserPage] = useState(1);\n  const [modalUserPageSize, setModalUserPageSize] = useState(10);"
);

// 2. Logic
const searchTarget = `  const toggleUser = (userId) => {`;
const logicBlock = `  const modalTotalPages = Math.ceil(filteredUsers.length / modalUserPageSize) || 1;
  const paginatedUsers = filteredUsers.slice((modalUserPage - 1) * modalUserPageSize, modalUserPage * modalUserPageSize);

  useEffect(() => {
    if (modalUserPage > modalTotalPages) {
      setModalUserPage(modalTotalPages);
    }
  }, [filteredUsers.length, modalUserPageSize, modalUserPage, modalTotalPages]);

`;
content = content.replace(searchTarget, logicBlock + searchTarget);

// 3. onChange reset
content = content.replace(
  /onChange=\{\(e\) => setUserSearchTerm\(e\.target\.value\)\}/g,
  `onChange={(e) => { setUserSearchTerm(e.target.value); setModalUserPage(1); }}`
);
content = content.replace(
  /onChange=\{\(e\) => setUserFilterTag\(e\.target\.value\)\}/g,
  `onChange={(e) => { setUserFilterTag(e.target.value); setModalUserPage(1); }}`
);

// 4. UI + mapping
const oldListHeader = `<div className="flex-1 overflow-y-auto border-2 border-black comic-box-sm bg-white min-h-[200px] md:max-h-[600px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]">
                  {filteredUsers.map(u => {`;

const newListHeader = `<div className="flex-1 flex flex-col min-h-[200px] md:max-h-[600px]">
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
                    {paginatedUsers.map(u => {`;

content = content.replace(oldListHeader, newListHeader);

// Ensure the closing tags are correct. The original code has:
//                   {filteredUsers.length === 0 && (
//                     <div className="p-8 text-center text-slate-400 text-sm font-bold">
//                       沒有找到符合的用戶
//                     </div>
//                   )}
//                 </div>
// I added `<div className="flex-1 flex flex-col...">`, so I need to append an extra `</div>` around there.
content = content.replace(
  `{filteredUsers.length === 0 && (
                    <div className="p-8 text-center text-slate-400 text-sm font-bold">
                      沒有找到符合的用戶
                    </div>
                  )}
                </div>`,
  `{filteredUsers.length === 0 && (
                      <div className="p-8 text-center text-slate-400 text-sm font-bold">
                        沒有找到符合的用戶
                      </div>
                    )}
                  </div>
                </div>`
);

fs.writeFileSync('src/pages/admin/AdminEvents.jsx', content);
