const fs = require('fs');

const getZodiacStr = `
const getZodiac = (month, day) => {
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  if (isNaN(m) || isNaN(d)) return '';
  if ((m == 1 && d >= 20) || (m == 2 && d <= 18)) return '水瓶座';
  if ((m == 2 && d >= 19) || (m == 3 && d <= 20)) return '雙魚座';
  if ((m == 3 && d >= 21) || (m == 4 && d <= 19)) return '牡羊座';
  if ((m == 4 && d >= 20) || (m == 5 && d <= 20)) return '金牛座';
  if ((m == 5 && d >= 21) || (m == 6 && d <= 21)) return '雙子座';
  if ((m == 6 && d >= 22) || (m == 7 && d <= 22)) return '巨蟹座';
  if ((m == 7 && d >= 23) || (m == 8 && d <= 22)) return '獅子座';
  if ((m == 8 && d >= 23) || (m == 9 && d <= 22)) return '處女座';
  if ((m == 9 && d >= 23) || (m == 10 && d <= 23)) return '天秤座';
  if ((m == 10 && d >= 24) || (m == 11 && d <= 22)) return '天蠍座';
  if ((m == 11 && d >= 23) || (m == 12 && d <= 21)) return '射手座';
  if ((m == 12 && d >= 22) || (m == 1 && d <= 19)) return '摩羯座';
  return '';
};

const replaceDynamicVars = (text, user, res) => {
  if (!text) return '';
  let result = text;
  
  // User Variables
  const uName = user?._displayName || '用戶';
  const uGender = user?.gender || '';
  const uBirthday = user?.birthday || '';
  let uZodiac = '';
  if (uBirthday) {
    const parts = uBirthday.split('-');
    if (parts.length === 3) uZodiac = getZodiac(parts[1], parts[2]);
  }
  
  result = result.replace(/{好友的顯示名稱}/g, uName);
  result = result.replace(/{帳號名稱}/g, uName);
  result = result.replace(/{用戶性別}/g, uGender);
  result = result.replace(/{用戶生日}/g, uBirthday);
  result = result.replace(/{用戶星座}/g, uZodiac);
  
  // Reservation Variables
  const rDate = res?.date || '';
  const rTime = res?.time || '';
  const rPurpose = res?.purpose || '';
  
  result = result.replace(/{預約日期}/g, rDate);
  result = result.replace(/{預約時段}/g, rTime);
  result = result.replace(/{預約項目}/g, rPurpose);
  
  return result;
};
`;

// -------------------------
// 1. Update cron-events.js
// -------------------------
let cronCode = fs.readFileSync('api/cron-events.js', 'utf8');

// Insert helper functions before the handler
cronCode = cronCode.replace("export default async function handler(req, res) {", getZodiacStr + "\nexport default async function handler(req, res) {");

// In events section, replace targetUsers map:
cronCode = cronCode.replace(
  "const t = (ev.messageTitle || '').replace(/{好友的顯示名稱}/g, u.displayName || '用戶').replace(/{帳號名稱}/g, u.displayName || '用戶');\n          const txt = (ev.content || '').replace(/{好友的顯示名稱}/g, u.displayName || '用戶').replace(/{帳號名稱}/g, u.displayName || '用戶');",
  "const t = replaceDynamicVars(ev.messageTitle, { ...u, _displayName: u.displayName || '用戶' }, null);\n          const txt = replaceDynamicVars(ev.content, { ...u, _displayName: u.displayName || '用戶' }, null);"
);

// In reminders section, usersMap logic to save the full user object
cronCode = cronCode.replace(
  `        usersSnap.forEach(doc => {
          const u = doc.data();
          let name = u.displayName || '用戶';
          if (useOriginal && u.originalLineName) name = u.originalLineName;
          usersMap[u.userId] = name;
        });`,
  `        usersSnap.forEach(doc => {
          const u = doc.data();
          let name = u.displayName || '用戶';
          if (useOriginal && u.originalLineName) name = u.originalLineName;
          u._displayName = name;
          usersMap[u.userId] = u;
        });`
);

// Change `uName = usersMap[res.userId] || '用戶';` to `uData = usersMap[res.userId] || { _displayName: '用戶' };`
cronCode = cronCode.replace(
  "const uName = usersMap[res.userId] || '用戶';",
  "const uData = usersMap[res.userId] || { _displayName: '用戶' };"
);

// Update Day Before Logic replacing variables
cronCode = cronCode.replace(
  "const t = (tmpl.title || '預約提醒').replace(/{好友的顯示名稱}/g, uName);\n              const txt = (tmpl.text || '提醒您明日的預約即將到來').replace(/{好友的顯示名稱}/g, uName);",
  "const t = replaceDynamicVars(tmpl.title || '預約提醒', uData, res);\n              const txt = replaceDynamicVars(tmpl.text || '提醒您明日的預約即將到來', uData, res);"
);

// Update Same Day Logic
cronCode = cronCode.replace(
  "const t = (tmpl.title || '今日預約').replace(/{好友的顯示名稱}/g, uName);\n              const txt = (tmpl.text || '提醒您今日的預約').replace(/{好友的顯示名稱}/g, uName);",
  "const t = replaceDynamicVars(tmpl.title || '今日預約', uData, res);\n              const txt = replaceDynamicVars(tmpl.text || '提醒您今日的預約', uData, res);"
);

// Update Two Days Before Logic
cronCode = cronCode.replace(
  "const t = (tmpl.title || '預約提醒').replace(/{好友的顯示名稱}/g, uName);\n              const txt = (tmpl.text || '提醒您後天有預約').replace(/{好友的顯示名稱}/g, uName);",
  "const t = replaceDynamicVars(tmpl.title || '預約提醒', uData, res);\n              const txt = replaceDynamicVars(tmpl.text || '提醒您後天有預約', uData, res);"
);

// Update Three Days Before Logic
cronCode = cronCode.replace(
  "const t = (tmpl.title || '預約提醒').replace(/{好友的顯示名稱}/g, uName);\n              const txt = (tmpl.text || '提醒您三天後有預約').replace(/{好友的顯示名稱}/g, uName);",
  "const t = replaceDynamicVars(tmpl.title || '預約提醒', uData, res);\n              const txt = replaceDynamicVars(tmpl.text || '提醒您三天後有預約', uData, res);"
);

fs.writeFileSync('api/cron-events.js', cronCode);


// ----------------------------------
// 2. Update send-line-message.js
// ----------------------------------
let sendCode = fs.readFileSync('api/send-line-message.js', 'utf8');

// Insert helper functions before the handler
sendCode = sendCode.replace("export default async function handler(req, res) {", getZodiacStr + "\nexport default async function handler(req, res) {");

// It fetches user name logic:
sendCode = sendCode.replace(
  `    const userSnap = await getDoc(doc(db, "users", userId));
    if (userSnap.exists()) {
      const u = userSnap.data();
      if (useOriginal && u.originalLineName) {
        displayName = u.originalLineName;
      } else if (u.displayName) {
        displayName = u.displayName;
      }
    }`,
  `    let uData = { _displayName: displayName };
    const userSnap = await getDoc(doc(db, "users", userId));
    if (userSnap.exists()) {
      const u = userSnap.data();
      if (useOriginal && u.originalLineName) {
        displayName = u.originalLineName;
      } else if (u.displayName) {
        displayName = u.displayName;
      }
      uData = { ...u, _displayName: displayName };
    }`
);

// In the code where title and text are modified, there are multiple places:
// `title = (targetTemplate.title || '系統通知').replace(/{好友的顯示名稱}/g, displayName).replace(/{帳號名稱}/g, displayName);`
// `text = (targetTemplate.text || '').replace(/{好友的顯示名稱}/g, displayName).replace(/{帳號名稱}/g, displayName);`
sendCode = sendCode.replace(
  "title = (targetTemplate.title || '系統通知').replace(/{好友的顯示名稱}/g, displayName).replace(/{帳號名稱}/g, displayName);",
  "title = replaceDynamicVars(targetTemplate.title || '系統通知', uData, req.body.reservation);"
);
sendCode = sendCode.replace(
  "text = (targetTemplate.text || '').replace(/{好友的顯示名稱}/g, displayName).replace(/{帳號名稱}/g, displayName);",
  "text = replaceDynamicVars(targetTemplate.text || '', uData, req.body.reservation);"
);

// There is also custom message logic:
sendCode = sendCode.replace(
  "title = (customTitle || '系統通知').replace(/{好友的顯示名稱}/g, displayName).replace(/{帳號名稱}/g, displayName);",
  "title = replaceDynamicVars(customTitle || '系統通知', uData, req.body.reservation);"
);
sendCode = sendCode.replace(
  "text = (customText || '').replace(/{好友的顯示名稱}/g, displayName).replace(/{帳號名稱}/g, displayName);",
  "text = replaceDynamicVars(customText || '', uData, req.body.reservation);"
);

fs.writeFileSync('api/send-line-message.js', sendCode);
