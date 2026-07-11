import { collection, doc, setDoc, getDoc, getDocs, addDoc, deleteDoc, serverTimestamp, query, where } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebaseConfig";

// ==========================================
// Storage Upload
// ==========================================
export const uploadImage = async (file, path) => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("上傳超時：請確認 Firebase Storage 的 Rules 已設為允許讀寫 (allow read, write: if true;)，或檢查網路連線。"));
    }, 10000);

    const storageRef = ref(storage, path);
    uploadBytes(storageRef, file)
      .then(snapshot => getDownloadURL(snapshot.ref))
      .then(url => {
        clearTimeout(timeout);
        resolve(url);
      })
      .catch(error => {
        clearTimeout(timeout);
        let errorMsg = error.message;
        if (errorMsg.includes('unauthorized')) {
          errorMsg = "權限不足，請至 Firebase Console 開啟 Storage 的讀寫權限。";
        }
        reject(new Error(errorMsg));
      });
  });
};

// Get Line Settings
export const getLineSettings = async () => {
  try {
    const docRef = doc(db, "system_config", "line_settings");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      // Default structure if not found
      return { configs: [] };
    }
  } catch (error) {
    console.error("Error fetching line settings:", error);
    return { configs: [] };
  }
};

// Save Line Settings
export const saveLineSettings = async (settingsData) => {
  try {
    const docRef = doc(db, "system_config", "line_settings");
    await setDoc(docRef, {
      ...settingsData,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error("Error saving line settings:", error);
    throw error;
  }
};

// Admin Password
export const getAdminPassword = async () => {
  try {
    const docRef = doc(db, "system_config", "admin_settings");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists() && docSnap.data().password) {
      return docSnap.data().password;
    }
    // Fallback to env variable if not set in DB
    return import.meta.env.VITE_ADMIN_PASSWORD || '1234';
  } catch (error) {
    console.error("Error fetching admin password:", error);
    return import.meta.env.VITE_ADMIN_PASSWORD || '1234';
  }
};

export const saveAdminPassword = async (password) => {
  try {
    const docRef = doc(db, "system_config", "admin_settings");
    await setDoc(docRef, { password, updatedAt: serverTimestamp() }, { merge: true });
  } catch (error) {
    console.error("Error saving admin password:", error);
    throw error;
  }
};

// ==========================================
// Message Templates CRUD
// ==========================================
export const getMessageTemplates = async () => {
  try {
    const docRef = doc(db, "system_config", "message_templates");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    // Defaults
    return {
      clientSuccess: {
        title: "預約已送出！",
        text: "我們已經收到您的預約資訊。\n待管理員審核確認後，將會透過 Line 發送確認訊息給您。",
        imageUrl: ""
      },
      lineConfirm: {
        title: "預約成功確認",
        text: "您的預約已經審核通過！請準時抵達。",
        imageUrl: ""
      }
    };
  } catch (error) {
    console.error("Error fetching message templates:", error);
    return null;
  }
};

export const saveMessageTemplates = async (templates) => {
  try {
    const docRef = doc(db, "system_config", "message_templates");
    await setDoc(docRef, { ...templates, updatedAt: serverTimestamp() }, { merge: true });
  } catch (error) {
    console.error("Error saving message templates:", error);
    throw error;
  }
};

// ==========================================
// Dict Management (Tags and Interests)
// ==========================================
export const getDictTags = async () => {
  try {
    const docRef = doc(db, "system_config", "dict_tags");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists() && docSnap.data().tags) {
      return docSnap.data().tags;
    }
    return [];
  } catch (error) {
    console.error("Error fetching dict_tags:", error);
    return [];
  }
};

export const saveDictTags = async (tags) => {
  try {
    const docRef = doc(db, "system_config", "dict_tags");
    await setDoc(docRef, { tags, updatedAt: serverTimestamp() }, { merge: true });
  } catch (error) {
    console.error("Error saving dict_tags:", error);
    throw error;
  }
};

export const getDictInterests = async () => {
  try {
    const docRef = doc(db, "system_config", "dict_interests");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists() && docSnap.data().interests) {
      return docSnap.data().interests;
    }
    return [];
  } catch (error) {
    console.error("Error fetching dict_interests:", error);
    return [];
  }
};

export const saveDictInterests = async (interests) => {
  try {
    const docRef = doc(db, "system_config", "dict_interests");
    await setDoc(docRef, { interests, updatedAt: serverTimestamp() }, { merge: true });
  } catch (error) {
    console.error("Error saving dict_interests:", error);
    throw error;
  }
};

// ==========================================
// Client: User & Reservation
// ==========================================
export const saveUserProfile = async (userId, displayName, lineGroup = null, pictureUrl = null) => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      const data = {
        userId,
        displayName,
        createdAt: serverTimestamp()
      };
      if (lineGroup) data.lineGroup = lineGroup;
      if (pictureUrl) data.pictureUrl = pictureUrl;
      
      await setDoc(userRef, data);
    } else {
      // Update name and line config if changed
      const updateData = { displayName };
      if (lineGroup) updateData.lineGroup = lineGroup;
      
      // Only set pictureUrl if the database doesn't have one, or if we want to constantly update it
      // The requirement says: "當有新的使用者從line開啟預約畫面，然後新增到系統時，可以把該使用者的頭像圖片直接抓到到用戶管理的頭像裡來嗎"
      // If the user hasn't set one manually in admin, it's nice to keep it updated.
      if (pictureUrl && !userSnap.data().pictureUrl) {
        updateData.pictureUrl = pictureUrl;
      }
      
      await setDoc(userRef, updateData, { merge: true });
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

// Get Dictionary (for purposes)
export const getDictionary = async (type = "purposes") => {
  try {
    const docRef = doc(db, "system_config", `dict_${type}`);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().items || [];
    }
    return [];
  } catch (error) {
    console.error("Error fetching dictionary:", error);
    return [];
  }
};

export const saveDictionary = async (type = "purposes", items) => {
  try {
    const docRef = doc(db, "system_config", `dict_${type}`);
    await setDoc(docRef, { items, updatedAt: serverTimestamp() }, { merge: true });
  } catch (error) {
    console.error("Error saving dictionary:", error);
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
