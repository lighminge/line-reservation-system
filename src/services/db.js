import { collection, doc, setDoc, getDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";

// Get Line Settings
export const getLineSettings = async () => {
  try {
    const docRef = doc(db, "system_config", "line_settings");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching line settings:", error);
    return null;
  }
};

// Save Line Settings
export const saveLineSettings = async (liffId, channelAccessToken) => {
  try {
    const docRef = doc(db, "system_config", "line_settings");
    await setDoc(docRef, {
      liffId,
      channelAccessToken,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error saving line settings:", error);
    throw error;
  }
};

// Save or update user profile from LIFF
export const saveUserProfile = async (userId, displayName) => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        userId,
        displayName,
        createdAt: serverTimestamp()
      });
    } else {
      // Update name if changed
      await setDoc(userRef, { displayName }, { merge: true });
    }
  } catch (error) {
    console.error("Error saving user profile:", error);
    throw error;
  }
};

// Add a new reservation
export const addReservation = async (userId, reservationData) => {
  try {
    const reservationsRef = collection(db, "reservations");
    const docRef = await addDoc(reservationsRef, {
      userId,
      date: reservationData.date,
      time: reservationData.time,
      status: "confirmed", // or "pending" depending on business logic
      createdAt: serverTimestamp()
    });
    
    // Call our Vercel API to send Line message
    await fetch('/api/send-line-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        reservationId: docRef.id,
        date: reservationData.date,
        time: reservationData.time,
      }),
    });
    
    return docRef.id;
  } catch (error) {
    console.error("Error adding reservation:", error);
    throw error;
  }
};
