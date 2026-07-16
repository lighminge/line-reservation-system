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

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { userId, userIds, targetUsers: inputTargetUsers, text, imageUrl, imageAspectRatio, title } = req.body;

  let targetUsers = [];
  if (inputTargetUsers && Array.isArray(inputTargetUsers) && inputTargetUsers.length > 0) {
    targetUsers = inputTargetUsers;
  } else if (userIds && Array.isArray(userIds) && userIds.length > 0) {
    targetUsers = userIds.map(id => ({ userId: id, displayName: '用戶' }));
  } else if (userId) {
    targetUsers = [{ userId, displayName: '用戶' }];
  }

  if (targetUsers.length === 0 || (!text && !imageUrl)) {
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
    
    if (!lineChannelToken && settingsSnap.exists() && settingsSnap.data().channelAccessToken) {
      lineChannelToken = settingsSnap.data().channelAccessToken;
    }

    if (!lineChannelToken) {
      console.error("Line Channel Access Token not found in Firestore system_config.");
      return res.status(500).json({ message: 'System not configured properly' });
    }

    let finalImageUrl = imageUrl;
    if (finalImageUrl && finalImageUrl.startsWith('internal://')) {
      const docId = finalImageUrl.replace('internal://', '');
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers.host;
      finalImageUrl = `${protocol}://${host}/api/image?id=${docId}`;
    }

    const constructFlexContents = (msgTitle, msgText) => {
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
          contents: parseHtmlToFlexContents(msgTitle, "#ffffff"),
          backgroundColor: "#00B900"
        };
      }
      return flexContents;
    };

    const hasVariables = (text || '').includes('{好友的顯示名稱}') || (text || '').includes('{帳號名稱}') || 
                         (title || '').includes('{好友的顯示名稱}') || (title || '').includes('{帳號名稱}');

    let allSuccess = true;
    let errorDetails = null;

    if (hasVariables) {
      // Send individually
      for (const u of targetUsers) {
        const t = (title || '').replace(/{好友的顯示名稱}/g, u.displayName || '用戶').replace(/{帳號名稱}/g, u.displayName || '用戶');
        const txt = (text || '').replace(/{好友的顯示名稱}/g, u.displayName || '用戶').replace(/{帳號名稱}/g, u.displayName || '用戶');
        
        const messagePayload = {
          to: u.userId,
          messages: [
            {
              type: "flex",
              altText: stripHtml(t) || "系統通知",
              contents: constructFlexContents(t, txt)
            }
          ]
        };

        const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${lineChannelToken}`,
          },
          body: JSON.stringify(messagePayload),
        });

        if (!lineResponse.ok) {
          allSuccess = false;
          errorDetails = await lineResponse.text();
          break;
        }
      }
    } else {
      // No variables, safe to multicast
      const messagePayload = {
        messages: [
          {
            type: "flex",
            altText: stripHtml(title) || "系統通知",
            contents: constructFlexContents(title, text)
          }
        ]
      };

      const targetUserIds = targetUsers.map(u => u.userId).filter(Boolean);
      if (targetUserIds.length === 1) {
        messagePayload.to = targetUserIds[0];
        const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${lineChannelToken}`,
          },
          body: JSON.stringify(messagePayload),
        });

        if (!lineResponse.ok) {
          allSuccess = false;
          errorDetails = await lineResponse.text();
        }
      } else {
        const chunkSize = 500;
        for (let i = 0; i < targetUserIds.length; i += chunkSize) {
          const chunk = targetUserIds.slice(i, i + chunkSize);
          messagePayload.to = chunk;
          
          const lineResponse = await fetch('https://api.line.me/v2/bot/message/multicast', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${lineChannelToken}`,
            },
            body: JSON.stringify(messagePayload),
          });

          if (!lineResponse.ok) {
            allSuccess = false;
            errorDetails = await lineResponse.text();
            break;
          }
        }
      }
    }

    if (!allSuccess) {
      console.error("Line API Error:", errorDetails);
      throw new Error(`Line API responded with error: ${errorDetails}`);
    }

    return res.status(200).json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    console.error("Error sending Line message:", error);
    return res.status(500).json({ success: false, message: 'Failed to send Line message', error: error.message });
  }
}
