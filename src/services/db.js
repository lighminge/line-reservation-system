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
      throw new Error("Firestore 中找不到系統設定檔 (system_config/line_settings)。如果您剛剛有儲存，可能是資料庫權限不足導致儲存失敗但未報錯。");
    }
  } catch (error) {
    console.error("Error fetching line settings:", error);
    throw error;
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

// Add a new reservation (from client)
export const addReservation = async (userId, reservationData) => {
  try {
    const reservationsRef = collection(db, "reservations");
    const docRef = await addDoc(reservationsRef, {
      userId,
      date: reservationData.date,
      time: reservationData.time,
      purpose: reservationData.purpose || "",
      status: "pending", // Waiting for admin confirmation
      createdAt: serverTimestamp()
    });
    
    return docRef.id;
  } catch (error) {
    console.error("Error adding reservation:", error);
    throw error;
  }
};


// ==========================================
// Admin: Users CRUD
// ==========================================
export const getAllUsers = async () => {
  try {
    const q = collection(db, "users");
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
};

export const saveAdminUser = async (userId, userData) => {
  try {
    if (userId) {
      const docRef = doc(db, "users", userId);
      await setDoc(docRef, { ...userData, updatedAt: serverTimestamp() }, { merge: true });
    } else {
      await addDoc(collection(db, "users"), {
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error("Error saving user:", error);
    throw error;
  }
};

export const deleteUser = async (userId) => {
  try {
    await deleteDoc(doc(db, "users", userId));
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
};

// ==========================================
// Admin: Availability CRUD
// ==========================================
export const getAvailability = async (monthStr) => {
  // monthStr e.g. "2026-07"
  try {
    const q = query(collection(db, "availability"), where("month", "==", monthStr));
    const querySnapshot = await getDocs(q);
    const data = {};
    querySnapshot.forEach((doc) => {
      data[doc.data().date] = { id: doc.id, ...doc.data() };
    });
    return data;
  } catch (error) {
    console.error("Error fetching availability:", error);
    return {};
  }
};

export const saveAvailability = async (availabilityId, data) => {
  try {
    if (availabilityId) {
      const docRef = doc(db, "availability", availabilityId);
      await setDoc(docRef, { ...data, updatedAt: serverTimestamp() }, { merge: true });
    } else {
      await addDoc(collection(db, "availability"), {
        ...data,
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error("Error saving availability:", error);
    throw error;
  }
};

// ==========================================
// Admin: Reservations CRUD
// ==========================================
export const getAdminReservations = async () => {
  try {
    const q = collection(db, "reservations");
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching reservations:", error);
    return [];
  }
};

export const updateReservationStatus = async (reservationId, status) => {
  try {
    const docRef = doc(db, "reservations", reservationId);
    await setDoc(docRef, { status, updatedAt: serverTimestamp() }, { merge: true });
  } catch (error) {
    console.error("Error updating reservation status:", error);
    throw error;
  }
};
