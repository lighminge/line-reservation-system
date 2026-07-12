import { Solar } from 'lunar-javascript';

// 將簡體節氣轉換為繁體
const JIEQI_TW = {
  '立春': '立春', '雨水': '雨水', '惊蛰': '驚蟄', '春分': '春分', '清明': '清明', '谷雨': '穀雨',
  '立夏': '立夏', '小满': '小滿', '芒种': '芒種', '夏至': '夏至', '小暑': '小暑', '大暑': '大暑',
  '立秋': '立秋', '处暑': '處暑', '白露': '白露', '秋分': '秋分', '寒露': '寒露', '霜降': '霜降',
  '立冬': '立冬', '小雪': '小雪', '大雪': '大雪', '冬至': '冬至', '小寒': '小寒', '大寒': '大寒'
};

// 台灣常見國定假日與紀念日 (國曆)
const SOLAR_HOLIDAYS_TW = {
  '01-01': '元旦',
  '02-28': '和平紀念日',
  '04-04': '兒童節',
  '05-01': '勞動節',
  '10-10': '國慶日'
};

// 台灣常見農曆節日 (農曆)
const LUNAR_HOLIDAYS_TW = {
  '01-01': '春節',
  '01-15': '元宵節',
  '05-05': '端午節',
  '07-15': '中元節',
  '08-15': '中秋節',
  '09-09': '重陽節'
};

export function getTaiwanHolidayInfo(date) {
  const solar = Solar.fromDate(date);
  const lunar = solar.getLunar();
  
  const solarMD = `${String(solar.getMonth()).padStart(2, '0')}-${String(solar.getDay()).padStart(2, '0')}`;
  const lunarMD = `${String(lunar.getMonth()).padStart(2, '0')}-${String(lunar.getDay()).padStart(2, '0')}`;
  
  // 除夕處理 (農曆12月的最後一天，可能是29或30)
  let isNewYearsEve = false;
  if (lunar.getMonth() === 12) {
    // 檢查明天是不是正月初一
    const tomorrowLunar = Solar.fromDate(new Date(date.getTime() + 86400000)).getLunar();
    if (tomorrowLunar.getMonth() === 1 && tomorrowLunar.getDay() === 1) {
      isNewYearsEve = true;
    }
  }

  let holidayText = '';
  let isSpecialDay = false; // 是否為放假等級的特殊節日 (紅底字)

  // 1. 先判斷農曆節日 (最優先)
  if (isNewYearsEve) {
    holidayText = '除夕';
    isSpecialDay = true;
  } else if (LUNAR_HOLIDAYS_TW[lunarMD]) {
    holidayText = LUNAR_HOLIDAYS_TW[lunarMD];
    if (['春節', '端午節', '中秋節'].includes(holidayText)) {
        isSpecialDay = true;
    }
  } 
  // 2. 判斷國曆節日
  else if (SOLAR_HOLIDAYS_TW[solarMD]) {
    holidayText = SOLAR_HOLIDAYS_TW[solarMD];
    isSpecialDay = true;
  }
  // 3. 判斷節氣 (清明可能是4/4或4/5)
  else if (lunar.getJieQi()) {
    const jieQiName = lunar.getJieQi();
    holidayText = JIEQI_TW[jieQiName] || jieQiName;
    if (holidayText === '清明') {
      isSpecialDay = true; // 清明節放假
    }
  }

  // 補足：母親節(5月第二個星期日)、父親節(8/8)
  if (!holidayText && solarMD === '08-08') {
    holidayText = '父親節';
  }
  if (!holidayText && solar.getMonth() === 5 && date.getDay() === 0) {
    const d = solar.getDay();
    if (d > 7 && d <= 14) {
      holidayText = '母親節';
    }
  }

  return {
    holidayText,
    isSpecialDay
  };
}
