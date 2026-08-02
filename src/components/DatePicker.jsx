import React, { useState, useEffect } from 'react';

export default function DatePicker({ value, onChange, disabled = false, minYear = 2024, maxYear = 2030, clearable = true }) {
  const [internalYear, setInternalYear] = useState('');
  const [internalMonth, setInternalMonth] = useState('');
  const [internalDay, setInternalDay] = useState('');

  useEffect(() => {
    if (value) {
      const [y, m, d] = value.split('-');
      setInternalYear(y || '');
      setInternalMonth(m || '');
      setInternalDay(d || '');
    } else {
      setInternalYear('');
      setInternalMonth('');
      setInternalDay('');
    }
  }, [value]);

  const getDaysInMonth = (y, m) => {
    if (!y || !m) return 31;
    return new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
  };

  const handleUpdate = (y, m, d) => {
    setInternalYear(y);
    setInternalMonth(m);
    setInternalDay(d);
    
    if (y && m && d) {
       let finalDay = d;
       const maxD = getDaysInMonth(y, m);
       if (parseInt(d, 10) > maxD) {
          finalDay = maxD.toString().padStart(2, '0');
          setInternalDay(finalDay);
       }
       onChange(`${y}-${m}-${finalDay}`);
    } else {
       // if any field is cleared, emit empty so parent doesn't hold an invalid partial date
       // wait, if we emit empty, the parent will clear `value`, triggering `useEffect` to clear everything!
       // So we shouldn't emit empty unless ALL are cleared, or we just don't emit to parent until all 3 are set.
       if (!y && !m && !d) {
         onChange('');
       }
    }
  };

  return (
    <div className={`flex items-center gap-1 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <select
        value={internalYear}
        onChange={(e) => handleUpdate(e.target.value, internalMonth, internalDay)}
        disabled={disabled}
        className="border-2 border-black p-1 font-bold outline-none bg-white min-w-[70px] text-center text-sm"
      >
        <option value="">年</option>
        {Array.from({ length: maxYear - minYear + 1 }, (_, i) => {
          const y = (minYear + i).toString();
          return <option key={y} value={y}>{y}</option>;
        })}
      </select>
      <span className="font-black text-black">/</span>
      <select
        value={internalMonth}
        onChange={(e) => handleUpdate(internalYear, e.target.value, internalDay)}
        disabled={disabled}
        className="border-2 border-black p-1 font-bold outline-none bg-white min-w-[55px] text-center text-sm"
      >
        <option value="">月</option>
        {Array.from({ length: 12 }, (_, i) => {
          const m = (i + 1).toString().padStart(2, '0');
          return <option key={m} value={m}>{m}</option>;
        })}
      </select>
      <span className="font-black text-black">/</span>
      <select
        value={internalDay}
        onChange={(e) => handleUpdate(internalYear, internalMonth, e.target.value)}
        disabled={disabled}
        className="border-2 border-black p-1 font-bold outline-none bg-white min-w-[55px] text-center text-sm"
      >
        <option value="">日</option>
        {Array.from({ length: getDaysInMonth(internalYear, internalMonth) }, (_, i) => {
          const d = (i + 1).toString().padStart(2, '0');
          return <option key={d} value={d}>{d}</option>;
        })}
      </select>
      {clearable && (internalYear || internalMonth || internalDay) && (
        <button 
          type="button" 
          onClick={() => handleUpdate('','','')}
          className="ml-1 text-red-500 font-bold hover:underline text-xs"
        >
          清除
        </button>
      )}
    </div>
  );
}
