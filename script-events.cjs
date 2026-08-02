const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminEvents.jsx', 'utf8');

// 1. Import DatePicker
content = content.replace("import TimePicker from '../../components/TimePicker';", "import TimePicker from '../../components/TimePicker';\nimport DatePicker from '../../components/DatePicker';");

// 2. Replace the filter inputs
const oldFilter = `<div className="flex items-center gap-2">
                <span className="font-bold text-sm">期間:</span>
                <input 
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="p-1 border-2 border-black outline-none font-bold comic-box-sm bg-white text-sm"
                />
                <span className="font-bold">~</span>
                <input 
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="p-1 border-2 border-black outline-none font-bold comic-box-sm bg-white text-sm"
                />
              </div>`;

const newFilter = `<div className="flex flex-col xl:flex-row items-start xl:items-center gap-2">
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
              </div>`;

content = content.replace(oldFilter, newFilter);

// 3. Replace sendDate input
const oldSendDate = `<input 
                      type="date" 
                      value={sendDate} 
                      onChange={e => setSendDate(e.target.value)}
                      className="w-full p-3 border-2 border-black outline-none focus:border-green-500 comic-box-sm bg-white font-black text-lg shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                    />`;

const newSendDate = `<div className="w-full p-1 border-2 border-black bg-white comic-box-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] flex items-center h-[52px]">
                      <DatePicker 
                        value={sendDate}
                        onChange={(val) => setSendDate(val)}
                        clearable={false}
                      />
                    </div>`;

content = content.replace(oldSendDate, newSendDate);

// 4. Add the total matched users count
const oldButtons = `<div className="flex gap-2">
                  <button onClick={selectAllFiltered} className="flex-1 bg-white border-2 border-black comic-box-sm py-2 text-sm font-black hover:bg-cyan-50 shadow-[2px_2px_0_0_#000] active:scale-95 transition-transform">
                    全選
                  </button>
                  <button onClick={deselectAllFiltered} className="flex-1 bg-white border-2 border-black comic-box-sm py-2 text-sm font-black hover:bg-red-50 shadow-[2px_2px_0_0_#000] active:scale-95 transition-transform">
                    全不選
                  </button>
                </div>`;

const newButtons = `<div className="flex gap-2">
                  <button onClick={selectAllFiltered} className="flex-1 bg-white border-2 border-black comic-box-sm py-2 text-sm font-black hover:bg-cyan-50 shadow-[2px_2px_0_0_#000] active:scale-95 transition-transform">
                    全選
                  </button>
                  <button onClick={deselectAllFiltered} className="flex-1 bg-white border-2 border-black comic-box-sm py-2 text-sm font-black hover:bg-red-50 shadow-[2px_2px_0_0_#000] active:scale-95 transition-transform">
                    全不選
                  </button>
                </div>
                <div className="text-sm font-black text-blue-700 bg-blue-50 border-2 border-black p-2 comic-box-sm text-center shadow-[2px_2px_0_0_#000]">
                  目前符合條件的人員總數: {filteredUsers.length} 人
                </div>`;

content = content.replace(oldButtons, newButtons);

fs.writeFileSync('src/pages/admin/AdminEvents.jsx', content);
