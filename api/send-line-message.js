import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { parseHtmlToFlexContents, stripHtml } from "./utils/htmlToFlex.js";

// Initialize Firebase using environment variables or hardcoded values
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyBTAycM2PAyE4afO4QvgUCA89qaL3a41As",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "line-reservation-system-4bd5c.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "line-reservation-system-4bd5c",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "line-reservation-system-4bd5c.appspot.com",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "331480299639",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:331480299639:web:af13ad0ce3f830aca82e72"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


const getZodiac = (month, day) => {
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  if (isNaN(m) || isNaN(d)) return '';
  if ((m == 1 && d >= 20) || (m == 2 && d <= 18)) return '瘞渡摨?;
  if ((m == 2 && d >= 19) || (m == 3 && d <= 20)) return '??摨?;
  if ((m == 3 && d >= 21) || (m == 4 && d <= 19)) return '?∠?摨?;
  if ((m == 4 && d >= 20) || (m == 5 && d <= 20)) return '??摨?;
  if ((m == 5 && d >= 21) || (m == 6 && d <= 21)) return '??摨?;
  if ((m == 6 && d >= 22) || (m == 7 && d <= 22)) return '撌刻摨?;
  if ((m == 7 && d >= 23) || (m == 8 && d <= 22)) return '??摨?;
  if ((m == 8 && d >= 23) || (m == 9 && d <= 22)) return '?戊摨?;
  if ((m == 9 && d >= 23) || (m == 10 && d <= 23)) return '憭拍坐摨?;
  if ((m == 10 && d >= 24) || (m == 11 && d <= 22)) return '憭抵?摨?;
  if ((m == 11 && d >= 23) || (m == 12 && d <= 21)) return '撠?摨?;
  if ((m == 12 && d >= 22) || (m == 1 && d <= 19)) return '?拍劑摨?;
  return '';
};

const replaceDynamicVars = (text, user, res) => {
  if (!text) return '';
  let result = text;
  
  // User Variables
  const uName = user?._displayName || '?冽';
  const uGender = user?.gender || '';
  const uBirthday = user?.birthday || '';
  let uZodiac = '';
  if (uBirthday) {
    const parts = uBirthday.split('-');
    if (parts.length === 3) uZodiac = getZodiac(parts[1], parts[2]);
  }
  
  result = result.replace(/{憟賢??＊蝷箏?蝔惦/g, uName);
  result = result.replace(/{撣唾??迂}/g, uName);
  result = result.replace(/{?冽?批}/g, uGender);
  result = result.replace(/{?冽?}/g, uBirthday);
  result = result.replace(/{?冽?漣}/g, uZodiac);
  
  // Reservation Variables
  const rDate = res?.date || '';
  const rTime = res?.time || '';
  const rPurpose = res?.purpose || '';
  
  result = result.replace(/{???交?}/g, rDate);
  result = result.replace(/{???挾}/g, rTime);
  result = result.replace(/{???}/g, rPurpose);
  
  return result;
};

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { userId, reservationId, date, time } = req.body;

  if (!userId || !date || !time) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

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
    
    // Fallback for old structure or missing token
    if (!lineChannelToken && settingsSnap.exists() && settingsSnap.data().channelAccessToken) {
      lineChannelToken = settingsSnap.data().channelAccessToken;
    }

    if (!lineChannelToken) {
      console.error("Line Channel Access Token not found in Firestore system_config.");
      return res.status(500).json({ message: 'System not configured properly' });
    }

    // 2. Fetch Message Templates from Firestore
    const templatesRef = doc(db, "system_config", "message_templates");
    const templatesSnap = await getDoc(templatesRef);
    
    let lineTemplate = {
      title: "????蝣箄?",
      text: "?函???撌脩?撖拇??嚗?皞??菟???,
      imageUrl: ""
    };

    if (templatesSnap.exists()) {
      const allTemplates = templatesSnap.data();
      if (req.body.type === 'submit' && allTemplates.clientSuccess) {
        lineTemplate = allTemplates.clientSuccess;
      } else if (req.body.type && allTemplates[req.body.type]) {
        lineTemplate = allTemplates[req.body.type];
      } else if (allTemplates.lineConfirm) {
        lineTemplate = allTemplates.lineConfirm;
      }
    }

    // 2.5 Get user nickname for template variables
    let useOriginalName = false;
    if (templatesSnap.exists() && templatesSnap.data().settings) {
      useOriginalName = !!templatesSnap.data().settings.useOriginalLineNameForPush;
    }

    let nickname = "?";
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const uData = userSnap.data();
      if (useOriginalName && uData.originalLineName) {
        nickname = uData.originalLineName;
      } else if (uData.displayName) {
        nickname = uData.displayName;
      }
    }

    let accountName = "蝟餌絞";
    if (settingsSnap.exists() && settingsSnap.data().configs) {
      const configs = settingsSnap.data().configs;
      const activeConfig = configs.find(c => c.isActive) || configs[0];
      if (activeConfig && activeConfig.name) {
        accountName = activeConfig.name;
      }
    }

    let messageText = lineTemplate.text || "?典末嚗??歇蝬?唳??蝝?;
    messageText = messageText.replace(/{憟賢??＊蝷箏?蝔惦/g, nickname).replace(/{撣唾??迂}/g, accountName);

    let finalImageUrl = lineTemplate.imageUrl;
    if (finalImageUrl && finalImageUrl.startsWith('internal://')) {
      const docId = finalImageUrl.replace('internal://', '');
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers.host;
      finalImageUrl = `${protocol}://${host}/api/image?id=${docId}`;
    }

    let titleText = lineTemplate.title || "?????";
    titleText = titleText.replace(/{憟賢??＊蝷箏?蝔惦/g, nickname).replace(/{撣唾??迂}/g, accountName);

    // Text details array to be reused
    const detailsBoxContents = [
      {
        type: "box",
        layout: "baseline",
        spacing: "sm",
        contents: [
          { type: "text", text: "?交?", color: "#aaaaaa", size: "sm", flex: 1 },
          { type: "text", text: date, wrap: true, color: "#111111", weight: "bold", size: "sm", flex: 3 }
        ]
      },
      {
        type: "box",
        layout: "baseline",
        spacing: "sm",
        contents: [
          { type: "text", text: "??", color: "#aaaaaa", size: "sm", flex: 1 },
          { type: "text", text: time, wrap: true, color: "#111111", weight: "bold", size: "sm", flex: 3 }
        ]
      },
      {
        type: "box",
        layout: "baseline",
        spacing: "sm",
        contents: [
          { type: "text", text: "?", color: "#aaaaaa", size: "sm", flex: 1 },
          { type: "text", text: req.body.purpose || "銝?祇?蝝?, wrap: true, color: "#111111", weight: "bold", size: "sm", flex: 3 }
        ]
      }
    ];

    let flexContents = {};

    if (finalImageUrl && finalImageUrl.startsWith('http')) {
      // Hero Image Design
      flexContents = {
        type: "bubble",
        hero: {
          type: "image",
          url: finalImageUrl,
          size: "full",
          aspectRatio: "20:13",
          aspectMode: "cover"
        },
        body: {
          type: "box",
          layout: "vertical",
          spacing: "md",
          contents: [
            ...parseHtmlToFlexContents(titleText, "#111111", "xl", "bold"),
            ...parseHtmlToFlexContents(messageText, "#111111", "md", "regular"),
            { type: "separator", margin: "lg" },
            { type: "box", layout: "vertical", margin: "lg", spacing: "sm", contents: detailsBoxContents }
          ]
        },
        footer: {
          type: "box",
          layout: "vertical",
          contents: [
            { type: "text", text: "???函??嚗?, align: "center", color: "#00B900", weight: "bold" }
          ]
        }
      };
    } else {
      // Fallback Default Design without Image
      flexContents = {
        type: "bubble",
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            ...parseHtmlToFlexContents(titleText, "#ffffff", "xl", "bold")
          ],
          backgroundColor: "#00B900"
        },
        body: {
          type: "box",
          layout: "vertical",
          spacing: "md",
          contents: [
            ...parseHtmlToFlexContents(messageText, "#333333"),
            { type: "separator", margin: "lg" },
            { type: "box", layout: "vertical", margin: "lg", spacing: "sm", contents: detailsBoxContents }
          ]
        },
        footer: {
          type: "box",
          layout: "vertical",
          contents: [
            { type: "text", text: "???函??嚗?, align: "center", color: "#00B900", weight: "bold" }
          ]
        }
      };
    }

    const messagePayload = {
      to: userId,
      messages: [
        {
          type: "flex",
          altText: stripHtml(titleText) || "?????",
          contents: flexContents
        }
      ]
    };

    // 4. Call Line Messaging API
    const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lineChannelToken}`,
      },
      body: JSON.stringify(messagePayload),
    });

    if (!lineResponse.ok) {
      const errorData = await lineResponse.text();
      console.error("Line API Error:", errorData);
      throw new Error(`Line API responded with ${lineResponse.status}`);
    }

    return res.status(200).json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    console.error("Error sending Line message:", error);
    return res.status(500).json({ success: false, message: 'Failed to send Line message', error: error.message });
  }
}
