import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

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
  const { id } = req.query;

  if (!id) return res.status(400).send('Missing id');

  try {
    const imgRef = doc(db, "public_images", id);
    const imgSnap = await getDoc(imgRef);

    if (!imgSnap.exists()) {
      return res.status(404).send('Image not found');
    }

    const base64String = imgSnap.data().data;

    if (!base64String || !base64String.startsWith('data:image')) {
      return res.status(404).send('Invalid image data');
    }

    const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).send('Invalid base64 string');
    }

    const contentType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    return res.status(200).send(buffer);
  } catch (error) {
    console.error("Error serving image:", error);
    return res.status(500).send('Server Error');
  }
}
