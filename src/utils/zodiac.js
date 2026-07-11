export const zodiacs = [
  { name: '摩羯座', en: 'capricorn', start: { m: 12, d: 22 }, end: { m: 1, d: 19 } },
  { name: '水瓶座', en: 'aquarius', start: { m: 1, d: 20 }, end: { m: 2, d: 18 } },
  { name: '雙魚座', en: 'pisces', start: { m: 2, d: 19 }, end: { m: 3, d: 20 } },
  { name: '牡羊座', en: 'aries', start: { m: 3, d: 21 }, end: { m: 4, d: 19 } },
  { name: '金牛座', en: 'taurus', start: { m: 4, d: 20 }, end: { m: 5, d: 20 } },
  { name: '雙子座', en: 'gemini', start: { m: 5, d: 21 }, end: { m: 6, d: 21 } },
  { name: '巨蟹座', en: 'cancer', start: { m: 6, d: 22 }, end: { m: 7, d: 22 } },
  { name: '獅子座', en: 'leo', start: { m: 7, d: 23 }, end: { m: 8, d: 22 } },
  { name: '處女座', en: 'virgo', start: { m: 8, d: 23 }, end: { m: 9, d: 22 } },
  { name: '天秤座', en: 'libra', start: { m: 9, d: 23 }, end: { m: 10, d: 23 } },
  { name: '天蠍座', en: 'scorpio', start: { m: 10, d: 24 }, end: { m: 11, d: 22 } },
  { name: '射手座', en: 'sagittarius', start: { m: 11, d: 23 }, end: { m: 12, d: 21 } }
];

export const getZodiac = (month, day) => {
  if (!month || !day) return null;
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  
  if (isNaN(m) || isNaN(d)) return null;

  for (const z of zodiacs) {
    if (z.start.m === m && d >= z.start.d) return z;
    if (z.end.m === m && d <= z.end.d) return z;
  }
  return null; // fallback
};
