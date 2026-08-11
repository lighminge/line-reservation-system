import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, getDocs, updateDoc } from "firebase/firestore";
import { parseHtmlToFlexContents, stripHtml } from "./utils/htmlToFlex.js";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyBTAycM2PAyE4afO4QvgUCA89qaL3a41As",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "line-reservation-system-4bd5c.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "line-reservation-system-4bd5c",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "line-reservation-system-4bd5c.appspot.com",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "336987178788",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:336987178788:web:7586a19f6a7350f4a86cd7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


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

export default async function handler(req, res) {
  try {
    // 1. Fetch Line Settings from Firestore
    const settingsRef = doc(db, "system_config", "line_settings");
    const settingsSnap = await getDoc(settingsRef);
    
    let lineChannelToken = null;
    
    if (settingsSnap.exists() && settingsSnap.data().configs) {
      const configs = settingsSnap.data().configs;
      const activeConfig = configs.find(c => c.isActive) || configs[0];
      if (activeConfig) {
        lineChannelToken = activeConfig.channelAccessToken;
      }
    }
    
    if (!lineChannelToken && settingsSnap.exists() && settingsSnap.data().channelAccessToken) {
      lineChannelToken = settingsSnap.data().channelAccessToken;
    }

    if (!lineChannelToken) {
      console.error("Line Channel Access Token not found.");
      return res.status(500).json({ message: 'System not configured properly' });
    }

    // Use Taipei time for all comparisons
    const now = new Date();
    const taipeiTimeStr = now.toLocaleString("en-US", {timeZone: "Asia/Taipei"});
    const taipeiTime = new Date(taipeiTimeStr);
    
    // Format YYYY-MM-DD
    const pad = n => (n < 10 ? '0' + n : n);
    const todayDateStr = `${taipeiTime.getFullYear()}-${pad(taipeiTime.getMonth()+1)}-${pad(taipeiTime.getDate())}`;
    const todayTimeStr = `${pad(taipeiTime.getHours())}:${pad(taipeiTime.getMinutes())}`;
    
    const tomorrow = new Date(taipeiTime);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDateStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth()+1)}-${pad(tomorrow.getDate())}`;

    const twoDaysAfter = new Date(taipeiTime);
    twoDaysAfter.setDate(twoDaysAfter.getDate() + 2);
    const twoDaysAfterStr = `${twoDaysAfter.getFullYear()}-${pad(twoDaysAfter.getMonth()+1)}-${pad(twoDaysAfter.getDate())}`;

    const threeDaysAfter = new Date(taipeiTime);
    threeDaysAfter.setDate(threeDaysAfter.getDate() + 3);
    const threeDaysAfterStr = `${threeDaysAfter.getFullYear()}-${pad(threeDaysAfter.getMonth()+1)}-${pad(threeDaysAfter.getDate())}`;

    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;

    const constructFlexContents = (msgTitle, msgText, finalImageUrl, imageAspectRatio) => {
      const flexContents = { type: "bubble" };
      if (msgText) {
        flexContents.body = {
          type: "box",
          layout: "vertical",
          spacing: "md",
          contents: parseHtmlToFlexContents(msgText, "#333333")
        };
      }
      if (finalImageUrl && finalImageUrl.startsWith('http')) {
        flexContents.hero = {
          type: "image",
          url: finalImageUrl,
          size: "full",
          aspectRatio: imageAspectRatio || "1.51:1",
          aspectMode: "cover"
        };
      }
      if (msgTitle) {
        flexContents.header = {
          type: "box",
          layout: "vertical",
          contents: parseHtmlToFlexContents(msgTitle, "#ffffff", "xl", "bold"),
          backgroundColor: "#00B900"
        };
      }
      return flexContents;
    };

    const resolveImg = (url) => {
      if (url && url.startsWith('internal://')) {
        return `${protocol}://${host}/api/image?id=${url.replace('internal://', '')}`;
      }
      return url;
    };

    const sendLineMessage = async (userId, title, text, imgUrl, aspectRatio = "1.51:1") => {
      const messagePayload = {
        to: userId,
        messages: [
          {
            type: "flex",
            altText: stripHtml(title) || "系統通知",
            contents: constructFlexContents(title, text, resolveImg(imgUrl), aspectRatio)
          }
        ]
      };
      return fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${lineChannelToken}`,
        },
        body: JSON.stringify(messagePayload),
      });
    };

    // =====================================
    // 2. Process Pending Events
    // =====================================
    const eventsRef = collection(db, "events");
    const eventsSnap = await getDocs(eventsRef);
    
    const eventsToProcess = [];
    eventsSnap.forEach(docSnap => {
      const ev = docSnap.data();
      if (ev.status === 'pending' && ev.sendDate && ev.sendTime) {
        const evDateTime = new Date(`${ev.sendDate}T${ev.sendTime}`);
        if (taipeiTime >= evDateTime) {
          eventsToProcess.push({ id: docSnap.id, ...ev });
        }
      }
    });

    const eventResults = [];
    for (const ev of eventsToProcess) {
      const finalImageUrl = resolveImg(ev.imageUrl);
      const hasVariables = (ev.content || '').includes('{好友的顯示名稱}') || (ev.content || '').includes('{帳號名稱}') || 
                           (ev.messageTitle || '').includes('{好友的顯示名稱}') || (ev.messageTitle || '').includes('{帳號名稱}');

      let allSuccess = true;
      let targetUsers = ev.targetUsers || [];

      if (hasVariables) {
        // Send individually
        for (const u of targetUsers) {
          const t = replaceDynamicVars(ev.messageTitle, { ...u, _displayName: u.displayName || '用戶' }, null);
          const txt = replaceDynamicVars(ev.content, { ...u, _displayName: u.displayName || '用戶' }, null);
          
          const lineResponse = await sendLineMessage(u.userId, t, txt, finalImageUrl, ev.imageAspectRatio);
          if (!lineResponse.ok) allSuccess = false;
        }
      } else {
        // Multicast
        const messagePayload = {
          messages: [
            {
              type: "flex",
              altText: stripHtml(ev.messageTitle) || "活動通知",
              contents: constructFlexContents(ev.messageTitle, ev.content, finalImageUrl, ev.imageAspectRatio)
            }
          ]
        };

        const targetUserIds = targetUsers.map(u => u.userId).filter(Boolean);
        if (targetUserIds.length === 1) {
          messagePayload.to = targetUserIds[0];
          const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${lineChannelToken}` },
            body: JSON.stringify(messagePayload),
          });
          if (!lineResponse.ok) allSuccess = false;
        } else if (targetUserIds.length > 1) {
          const chunkSize = 500;
          for (let i = 0; i < targetUserIds.length; i += chunkSize) {
            const chunk = targetUserIds.slice(i, i + chunkSize);
            const chunkPayload = { ...messagePayload, to: chunk };
            
            const lineResponse = await fetch('https://api.line.me/v2/bot/message/multicast', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${lineChannelToken}` },
              body: JSON.stringify(chunkPayload),
            });
            if (!lineResponse.ok) {
              allSuccess = false;
            }
          }
        }
      }

      await updateDoc(doc(db, "events", ev.id), {
        status: 'sent',
        sentAt: taipeiTime.toISOString()
      });
      eventResults.push({ id: ev.id, success: allSuccess });
    }

    // =====================================
    // 3. Process Reservation Reminders
    // =====================================
    const reminderResults = [];
    const reminderSettingsSnap = await getDoc(doc(db, "system_config", "reminder_settings"));
    
    if (reminderSettingsSnap.exists()) {
      const reminderSettings = reminderSettingsSnap.data();
      const checkDayBefore = reminderSettings.dayBefore?.enabled;
      const checkSameDay = reminderSettings.sameDay?.enabled;
      const checkTwoDaysBefore = reminderSettings.twoDaysBefore?.enabled;
      const checkThreeDaysBefore = reminderSettings.threeDaysBefore?.enabled;
      
      if (checkDayBefore || checkSameDay || checkTwoDaysBefore || checkThreeDaysBefore) {
        // Fetch message templates
        const templatesSnap = await getDoc(doc(db, "system_config", "message_templates"));
        const templates = templatesSnap.exists() ? templatesSnap.data() : {};
        
        // Fetch users map for names
        const usersSnap = await getDocs(collection(db, "users"));
        const usersMap = {};
        let useOriginal = templates.settings?.useOriginalLineNameForPush || false;
        usersSnap.forEach(doc => {
          const u = doc.data();
          let name = u.displayName || '用戶';
          if (useOriginal && u.originalLineName) name = u.originalLineName;
          u._displayName = name;
          usersMap[u.userId] = u;
        });

        // Fetch confirmed reservations
        const resSnap = await getDocs(collection(db, "reservations"));
        const reservations = [];
        resSnap.forEach(doc => {
          const r = doc.data();
          if (r.status === 'confirmed') reservations.push({ id: doc.id, ...r });
        });

        for (const res of reservations) {
          const resDate = res.date; // YYYY-MM-DD
          const uData = usersMap[res.userId] || { _displayName: '用戶' };
          let updateData = {};

          // Day Before Logic
          if (checkDayBefore && resDate === tomorrowDateStr && !res.reminderDayBeforeSent) {
            const dbTime = reminderSettings.dayBefore.time || '20:00';
            if (todayTimeStr >= dbTime) {
              const tmpl = templates.reminderDayBefore || {};
              const t = replaceDynamicVars(tmpl.title || '預約提醒', uData, res);
              const txt = replaceDynamicVars(tmpl.text || '提醒您明日的預約即將到來', uData, res);
              
              const sendRes = await sendLineMessage(res.userId, t, txt, tmpl.imageUrl);
              if (sendRes.ok) {
                updateData.reminderDayBeforeSent = true;
                reminderResults.push({ id: res.id, type: 'dayBefore', success: true });
              }
            }
          }
          
          // Same Day Logic
          if (checkSameDay && resDate === todayDateStr && !res.reminderSameDaySent) {
            const sdTime = reminderSettings.sameDay.time || '09:00';
            if (todayTimeStr >= sdTime) {
              const tmpl = templates.reminderSameDay || {};
              const t = replaceDynamicVars(tmpl.title || '今日預約', uData, res);
              const txt = replaceDynamicVars(tmpl.text || '提醒您今日的預約', uData, res);
              
              const sendRes = await sendLineMessage(res.userId, t, txt, tmpl.imageUrl);
              if (sendRes.ok) {
                updateData.reminderSameDaySent = true;
                reminderResults.push({ id: res.id, type: 'sameDay', success: true });
              }
            }
          }

          // Two Days Before Logic
          if (checkTwoDaysBefore && resDate === twoDaysAfterStr && !res.reminderTwoDaysBeforeSent) {
            const tdTime = reminderSettings.twoDaysBefore.time || '20:00';
            if (todayTimeStr >= tdTime) {
              const tmpl = templates.reminderTwoDaysBefore || {};
              const t = replaceDynamicVars(tmpl.title || '預約提醒', uData, res);
              const txt = replaceDynamicVars(tmpl.text || '提醒您後天有預約', uData, res);
              
              const sendRes = await sendLineMessage(res.userId, t, txt, tmpl.imageUrl);
              if (sendRes.ok) {
                updateData.reminderTwoDaysBeforeSent = true;
                reminderResults.push({ id: res.id, type: 'twoDaysBefore', success: true });
              }
            }
          }

          // Three Days Before Logic
          if (checkThreeDaysBefore && resDate === threeDaysAfterStr && !res.reminderThreeDaysBeforeSent) {
            const thdTime = reminderSettings.threeDaysBefore.time || '20:00';
            if (todayTimeStr >= thdTime) {
              const tmpl = templates.reminderThreeDaysBefore || {};
              const t = replaceDynamicVars(tmpl.title || '預約提醒', uData, res);
              const txt = replaceDynamicVars(tmpl.text || '提醒您三天後有預約', uData, res);
              
              const sendRes = await sendLineMessage(res.userId, t, txt, tmpl.imageUrl);
              if (sendRes.ok) {
                updateData.reminderThreeDaysBeforeSent = true;
                reminderResults.push({ id: res.id, type: 'threeDaysBefore', success: true });
              }
            }
          }

          if (Object.keys(updateData).length > 0) {
            await updateDoc(doc(db, "reservations", res.id), updateData);
          }
        }
      }
    }

    return res.status(200).json({ 
      message: 'Processed cron jobs successfully', 
      events: eventResults,
      reminders: reminderResults
    });
  } catch (error) {
    console.error('Error in cron jobs:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
