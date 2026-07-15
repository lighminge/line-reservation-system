import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

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
      title: "預約成功確認",
      text: "您的預約已經審核通過！請準時抵達。",
      imageUrl: ""
    };

    if (templatesSnap.exists()) {
      if (req.body.type === 'submit' && templatesSnap.data().clientSuccess) {
        lineTemplate = templatesSnap.data().clientSuccess;
      } else if (templatesSnap.data().lineConfirm) {
        lineTemplate = templatesSnap.data().lineConfirm;
      }
    }

    // 2.5 Get user nickname for template variables
    let useOriginalName = false;
    if (templatesSnap.exists() && templatesSnap.data().settings) {
      useOriginalName = !!templatesSnap.data().settings.useOriginalLineNameForPush;
    }

    let nickname = "會員";
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

    let accountName = "系統";
    if (settingsSnap.exists() && settingsSnap.data().configs) {
      const configs = settingsSnap.data().configs;
      const activeConfig = configs.find(c => c.isActive) || configs[0];
      if (activeConfig && activeConfig.name) {
        accountName = activeConfig.name;
      }
    }

    let messageText = lineTemplate.text || "您好！我們已經收到您的預約。";
    messageText = messageText.replace(/{好友的顯示名稱}/g, nickname).replace(/{帳號名稱}/g, accountName);

    let finalImageUrl = lineTemplate.imageUrl;
    if (finalImageUrl && finalImageUrl.startsWith('internal://')) {
      const docId = finalImageUrl.replace('internal://', '');
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers.host;
      finalImageUrl = `${protocol}://${host}/api/image?id=${docId}`;
    }

    const titleText = lineTemplate.title || "預約成功通知";

    // Text details array to be reused
    const detailsBoxContents = [
      {
        type: "box",
        layout: "baseline",
        spacing: "sm",
        contents: [
          { type: "text", text: "日期", color: "#aaaaaa", size: "sm", flex: 1 },
          { type: "text", text: date, wrap: true, color: "#111111", weight: "bold", size: "sm", flex: 3 }
        ]
      },
      {
        type: "box",
        layout: "baseline",
        spacing: "sm",
        contents: [
          { type: "text", text: "時間", color: "#aaaaaa", size: "sm", flex: 1 },
          { type: "text", text: time, wrap: true, color: "#111111", weight: "bold", size: "sm", flex: 3 }
        ]
      },
      {
        type: "box",
        layout: "baseline",
        spacing: "sm",
        contents: [
          { type: "text", text: "項目", color: "#aaaaaa", size: "sm", flex: 1 },
          { type: "text", text: req.body.purpose || "一般預約", wrap: true, color: "#111111", weight: "bold", size: "sm", flex: 3 }
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
            { type: "text", text: titleText, weight: "bold", size: "xl", color: "#111111" },
            { type: "text", text: messageText, wrap: true, size: "sm", weight: "bold", color: "#111111" },
            { type: "separator", margin: "lg" },
            { type: "box", layout: "vertical", margin: "lg", spacing: "sm", contents: detailsBoxContents }
          ]
        },
        footer: {
          type: "box",
          layout: "vertical",
          contents: [
            { type: "text", text: "期待您的光臨！", align: "center", color: "#00B900", weight: "bold" }
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
            { type: "text", text: titleText, weight: "bold", size: "xl", color: "#ffffff" }
          ],
          backgroundColor: "#00B900"
        },
        body: {
          type: "box",
          layout: "vertical",
          spacing: "md",
          contents: [
            { type: "text", text: messageText, wrap: true, size: "sm", weight: "regular" },
            { type: "separator", margin: "lg" },
            { type: "box", layout: "vertical", margin: "lg", spacing: "sm", contents: detailsBoxContents }
          ]
        },
        footer: {
          type: "box",
          layout: "vertical",
          contents: [
            { type: "text", text: "期待您的光臨！", align: "center", color: "#00B900", weight: "bold" }
          ]
        }
      };
    }

    const messagePayload = {
      to: userId,
      messages: [
        {
          type: "flex",
          altText: lineTemplate.title || "預約成功通知",
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
