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

    // 2. Fetch pending events
    const eventsRef = collection(db, "events");
    const eventsSnap = await getDocs(eventsRef);
    const now = new Date();
    // Use Taipei time
    const taipeiTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Taipei"}));

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

    if (eventsToProcess.length === 0) {
      return res.status(200).json({ message: 'No events to process' });
    }

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

    const results = [];

    for (const ev of eventsToProcess) {
      let finalImageUrl = ev.imageUrl;
      if (finalImageUrl && finalImageUrl.startsWith('internal://')) {
        const docId = finalImageUrl.replace('internal://', '');
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers.host;
        finalImageUrl = `${protocol}://${host}/api/image?id=${docId}`;
      }

      const hasVariables = (ev.content || '').includes('{好友的顯示名稱}') || (ev.content || '').includes('{帳號名稱}') || 
                           (ev.messageTitle || '').includes('{好友的顯示名稱}') || (ev.messageTitle || '').includes('{帳號名稱}');

      let allSuccess = true;
      let targetUsers = ev.targetUsers || [];

      if (hasVariables) {
        // Send individually
        for (const u of targetUsers) {
          const t = (ev.messageTitle || '').replace(/{好友的顯示名稱}/g, u.displayName || '用戶').replace(/{帳號名稱}/g, u.displayName || '用戶');
          const txt = (ev.content || '').replace(/{好友的顯示名稱}/g, u.displayName || '用戶').replace(/{帳號名稱}/g, u.displayName || '用戶');
          
          const messagePayload = {
            to: u.userId,
            messages: [
              {
                type: "flex",
                altText: stripHtml(t) || "活動通知",
                contents: constructFlexContents(t, txt, finalImageUrl, ev.imageAspectRatio)
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
            console.error(`Failed to send event ${ev.id} to ${u.userId}:`, await lineResponse.text());
          }
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
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${lineChannelToken}`,
            },
            body: JSON.stringify(messagePayload),
          });
          if (!lineResponse.ok) allSuccess = false;
        } else if (targetUserIds.length > 1) {
          // Chunk by 500 for multicast
          const chunkSize = 500;
          for (let i = 0; i < targetUserIds.length; i += chunkSize) {
            const chunk = targetUserIds.slice(i, i + chunkSize);
            const chunkPayload = { ...messagePayload, to: chunk };
            
            const lineResponse = await fetch('https://api.line.me/v2/bot/message/multicast', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${lineChannelToken}`,
              },
              body: JSON.stringify(chunkPayload),
            });
            if (!lineResponse.ok) {
              allSuccess = false;
              console.error(`Failed multicast for event ${ev.id}:`, await lineResponse.text());
            }
          }
        }
      }

      // Mark as sent
      await updateDoc(doc(db, "events", ev.id), {
        status: 'sent',
        sentAt: taipeiTime.toISOString()
      });

      results.push({ id: ev.id, success: allSuccess });
    }

    return res.status(200).json({ message: 'Processed events', results });
  } catch (error) {
    console.error('Error in cron-events:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
