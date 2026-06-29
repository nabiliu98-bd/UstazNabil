import {
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  writeBatch,
  getDocs,
  limit
} from "firebase/firestore";
import { db } from "../firebase";
import { FAQ, Conversation, Message } from "../types";

// Collection Names
const SYSTEM_SETTINGS_COLL = "system_settings";
const FAQS_COLL = "faqs";
const CONVERSATIONS_COLL = "conversations";
const MESSAGES_COLL = "messages";

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write"
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// 1. Database Initialization (Seeding)
export async function initializeDatabase() {
  try {
    // Seed System Status & Password
    const statusDocRef = doc(db, SYSTEM_SETTINGS_COLL, "status");
    let statusSnap;
    try {
      statusSnap = await getDoc(statusDocRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${SYSTEM_SETTINGS_COLL}/status`);
      return;
    }

    if (!statusSnap.exists()) {
      try {
        await setDoc(statusDocRef, {
          adminStatus: "ONLINE",
          password: "1953", // Default password
          faqsCleared: true // For new databases, start empty
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `${SYSTEM_SETTINGS_COLL}/status`);
      }
    } else {
      // One-time deletion of existing seeded FAQs as requested by user
      const statusData = statusSnap.data();
      if (!statusData?.faqsCleared) {
        try {
          const faqsQuery = query(collection(db, FAQS_COLL));
          const faqsSnap = await getDocs(faqsQuery);
          if (!faqsSnap.empty) {
            const batch = writeBatch(db);
            faqsSnap.forEach((docSnap) => {
              batch.delete(docSnap.ref);
            });
            await batch.commit();
          }
          await updateDoc(statusDocRef, { faqsCleared: true });
          console.log("Successfully cleared existing FAQs as requested.");
        } catch (error) {
          // Soft warn if permissions are restricted (which is expected for non-admin student logins)
          console.warn("Could not auto-clear seeded FAQs on startup (normal for student sessions):", error);
        }
      }
    }
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
}

// 2. Admin System Status Listeners & Mutators
export function listenToAdminStatus(callback: (status: "ONLINE" | "OFFLINE") => void) {
  const statusDocRef = doc(db, SYSTEM_SETTINGS_COLL, "status");
  return onSnapshot(
    statusDocRef,
    (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data().adminStatus || "ONLINE");
      } else {
        callback("ONLINE");
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `${SYSTEM_SETTINGS_COLL}/status`);
    }
  );
}

export async function updateAdminStatus(status: "ONLINE" | "OFFLINE") {
  const statusDocRef = doc(db, SYSTEM_SETTINGS_COLL, "status");
  try {
    await updateDoc(statusDocRef, { adminStatus: status });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${SYSTEM_SETTINGS_COLL}/status`);
  }
}

export async function getAdminPassword(): Promise<string> {
  const statusDocRef = doc(db, SYSTEM_SETTINGS_COLL, "status");
  try {
    const docSnap = await getDoc(statusDocRef);
    if (docSnap.exists()) {
      return docSnap.data().password || "1953";
    }
    return "1953";
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${SYSTEM_SETTINGS_COLL}/status`);
    throw error;
  }
}

export async function updateAdminPassword(newPassword: string) {
  const statusDocRef = doc(db, SYSTEM_SETTINGS_COLL, "status");
  try {
    await updateDoc(statusDocRef, { password: newPassword });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${SYSTEM_SETTINGS_COLL}/status`);
  }
}

// 3. FAQ Management
export function listenToFAQs(callback: (faqs: FAQ[]) => void, className?: string) {
  const faqsQuery = query(collection(db, FAQS_COLL), orderBy("order", "asc"));
  return onSnapshot(
    faqsQuery,
    (querySnapshot) => {
      const faqs: FAQ[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (!className || !data.className || data.className === "ALL" || data.className === className) {
          faqs.push({
            id: docSnap.id,
            ...data
          } as FAQ);
        }
      });
      callback(faqs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, FAQS_COLL);
    }
  );
}

export async function addFAQ(question: string, answer: string, order: number, className: string) {
  const faqsColl = collection(db, FAQS_COLL);
  try {
    await addDoc(faqsColl, { question, answer, order, className });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, FAQS_COLL);
  }
}

export async function updateFAQ(id: string, question: string, answer: string, order: number, className: string) {
  const faqDocRef = doc(db, FAQS_COLL, id);
  try {
    await updateDoc(faqDocRef, { question, answer, order, className });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${FAQS_COLL}/${id}`);
  }
}

export async function deleteFAQ(id: string) {
  const faqDocRef = doc(db, FAQS_COLL, id);
  try {
    await deleteDoc(faqDocRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${FAQS_COLL}/${id}`);
  }
}

// 4. Conversations Management
export async function createConversation(name: string, className: string, roll: string): Promise<string> {
  const now = Date.now();
  const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours expiry
  const conversationsColl = collection(db, CONVERSATIONS_COLL);
  try {
    const newDocRef = await addDoc(conversationsColl, {
      studentName: name,
      studentClass: className,
      studentRoll: roll,
      createdAt: now,
      lastMessageAt: now,
      unreadAdminCount: 0,
      unreadStudentCount: 0,
      status: "active",
      expiresAt: expiresAt
    });
    return newDocRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, CONVERSATIONS_COLL);
    throw error;
  }
}

export function listenToConversations(callback: (conversations: Conversation[]) => void) {
  const conversationsQuery = query(
    collection(db, CONVERSATIONS_COLL),
    orderBy("lastMessageAt", "desc")
  );

  return onSnapshot(
    conversationsQuery,
    (querySnapshot) => {
      const list: Conversation[] = [];
      const now = Date.now();
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Client-side expiry filtering of 24h
        if (data.expiresAt > now) {
          list.push({
            id: docSnap.id,
            ...data
          } as Conversation);
        }
      });
      callback(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, CONVERSATIONS_COLL);
    }
  );
}

export function listenToSingleConversation(id: string, callback: (conv: Conversation | null) => void) {
  const docRef = doc(db, CONVERSATIONS_COLL, id);
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        callback({ id: docSnap.id, ...docSnap.data() } as Conversation);
      } else {
        callback(null);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `${CONVERSATIONS_COLL}/${id}`);
    }
  );
}

export async function deleteConversation(id: string) {
  try {
    // Delete the conversation document
    await deleteDoc(doc(db, CONVERSATIONS_COLL, id));
    
    // Also delete all messages of this conversation
    const messagesQuery = query(collection(db, MESSAGES_COLL), where("conversationId", "==", id));
    const messagesSnap = await getDocs(messagesQuery);
    const batch = writeBatch(db);
    messagesSnap.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, CONVERSATIONS_COLL);
  }
}

export async function deleteAllConversations() {
  try {
    // Retrieve all conversations
    const conversationsSnap = await getDocs(collection(db, CONVERSATIONS_COLL));
    const batch = writeBatch(db);
    conversationsSnap.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();

    // Also delete all messages
    const messagesSnap = await getDocs(collection(db, MESSAGES_COLL));
    const messagesBatch = writeBatch(db);
    messagesSnap.forEach((docSnap) => {
      messagesBatch.delete(docSnap.ref);
    });
    await messagesBatch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, CONVERSATIONS_COLL);
  }
}

// 5. Messages Management
export function listenToMessages(conversationId: string, callback: (messages: Message[]) => void) {
  const messagesQuery = query(
    collection(db, MESSAGES_COLL),
    where("conversationId", "==", conversationId),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(
    messagesQuery,
    (querySnapshot) => {
      const messages: Message[] = [];
      querySnapshot.forEach((docSnap) => {
        messages.push({
          id: docSnap.id,
          ...docSnap.data()
        } as Message);
      });
      callback(messages);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, MESSAGES_COLL);
    }
  );
}

export async function sendChatMessage(conversationId: string, sender: "student" | "admin", text: string) {
  const now = Date.now();
  const messagesColl = collection(db, MESSAGES_COLL);
  
  try {
    // Create message document
    await addDoc(messagesColl, {
      conversationId,
      sender,
      text,
      createdAt: now,
      seen: false
    });

    // Update conversation document's last message timestamp & increment unread counts
    const convRef = doc(db, CONVERSATIONS_COLL, conversationId);
    const convSnap = await getDoc(convRef);
    if (convSnap.exists()) {
      const data = convSnap.data();
      const updateData: any = {
        lastMessageAt: now,
        // Let it refresh the expiration 24 hours from the last message interaction
        expiresAt: now + 24 * 60 * 60 * 1000
      };

      if (sender === "student") {
        updateData.unreadAdminCount = (data.unreadAdminCount || 0) + 1;
      } else {
        updateData.unreadStudentCount = (data.unreadStudentCount || 0) + 1;
      }

      await updateDoc(convRef, updateData);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, MESSAGES_COLL);
  }
}

export async function markConversationMessagesAsSeen(conversationId: string, viewer: "student" | "admin") {
  try {
    // Query unseen messages for this conversation sent by the OTHER party
    const senderToMark = viewer === "student" ? "admin" : "student";
    const messagesQuery = query(
      collection(db, MESSAGES_COLL),
      where("conversationId", "==", conversationId),
      where("sender", "==", senderToMark),
      where("seen", "==", false)
    );

    const querySnapshot = await getDocs(messagesQuery);
    if (!querySnapshot.empty) {
      const batch = writeBatch(db);
      querySnapshot.forEach((docSnap) => {
        batch.update(docSnap.ref, { seen: true });
      });
      await batch.commit();
    }

    // Reset the unread count in the conversation document
    const convRef = doc(db, CONVERSATIONS_COLL, conversationId);
    if (viewer === "student") {
      await updateDoc(convRef, { unreadStudentCount: 0 });
    } else {
      await updateDoc(convRef, { unreadAdminCount: 0 });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, MESSAGES_COLL);
  }
}
