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

  const { userId, text, imageUrl, title } = req.body;

  if (!userId || !text) {
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

    // 2. Construct the Line push message payload
    const flexContents = {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          {
            type: "text",
            text: text,
            wrap: true,
            size: "md",
            weight: "regular",
            color: "#333333"
          }
        ]
      }
    };

    let finalImageUrl = imageUrl;
    if (finalImageUrl && finalImageUrl.startsWith('internal://')) {
      const docId = finalImageUrl.replace('internal://', '');
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers.host;
      finalImageUrl = `${protocol}://${host}/api/image?id=${docId}`;
    }

    if (finalImageUrl && finalImageUrl.startsWith('http')) {
      flexContents.hero = {
        type: "image",
        url: finalImageUrl,
        size: "full",
        aspectRatio: "1.51:1",
        aspectMode: "cover"
      };
    }
    
    if (title) {
      flexContents.header = {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: title,
            weight: "bold",
            size: "xl",
            color: "#ffffff"
          }
        ],
        backgroundColor: "#00B900"
      };
    }

    const messagePayload = {
      to: userId,
      messages: [
        {
          type: "flex",
          altText: title || "系統通知",
          contents: flexContents
        }
      ]
    };

    // 3. Call Line Messaging API
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
