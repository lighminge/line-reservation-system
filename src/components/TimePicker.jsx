import React from 'react';

export default function TimePicker({ value = '00:00', onChange, disabled = false }) {
  const parseTime = (timeStr) => {
    if (!timeStr) return { ampm: 'AM', hour: '12', min: '00' };
    let [h, m] = timeStr.split(':');
    let hr = parseInt(h, 10);
    let ampm = hr >= 12 ? 'PM' : 'AM';
    if (hr > 12) hr -= 12;
    if (hr === 0) hr = 12;
    return { ampm, hour: hr.toString().padStart(2, '0'), min: m };
  };

  const { ampm, hour, min } = parseTime(value);

  const formatTime = (newAmpm, newHour, newMin) => {
    let hr = parseInt(newHour, 10);
    if (newAmpm === 'PM' && hr < 12) hr += 12;
    if (newAmpm === 'AM' && hr === 12) hr = 0;
    return `${hr.toString().padStart(2, '0')}:${newMin}`;
  };

  const handleChange = (field, val) => {
    let newAmpm = ampm;
    let newHour = hour;
    let newMin = min;

    if (field === 'ampm') newAmpm = val;
    if (field === 'hour') newHour = val;
    if (field === 'min') newMin = val;

    onChange(formatTime(newAmpm, newHour, newMin));
  };

  return (
    <div className={`flex items-center gap-1 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <select
        value={ampm}
        onChange={(e) => handleChange('ampm', e.target.value)}
        disabled={disabled}
        className="border-2 border-black p-1 font-bold outline-none bg-white min-w-[50px] text-center"
      >
        <option value="AM">上午</option>
        <option value="PM">下午</option>
      </select>
      <select
        value={hour}
        onChange={(e) => handleChange('hour', e.target.value)}
        disabled={disabled}
        className="border-2 border-black p-1 font-bold outline-none bg-white min-w-[50px] text-center"
      >
        {Array.from({ length: 12 }, (_, i) => {
          const h = (i + 1).toString().padStart(2, '0');
          return <option key={h} value={h}>{h}</option>;
        })}
      </select>
      <span className="font-black text-black">:</span>
      <select
        value={min}
        onChange={(e) => handleChange('min', e.target.value)}
        disabled={disabled}
        className="border-2 border-black p-1 font-bold outline-none bg-white min-w-[50px] text-center"
      >
        {Array.from({ length: 60 }, (_, i) => {
          const m = i.toString().padStart(2, '0');
          return <option key={m} value={m}>{m}</option>;
        })}
      </select>
    </div>
  );
}
