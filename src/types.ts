export interface StudentInfo {
  name: string;
  className: string;
  roll: string;
}

export interface Conversation {
  id: string;
  studentName: string;
  studentClass: string;
  studentRoll: string;
  createdAt: number; // timestamp in ms
  lastMessageAt: number; // timestamp in ms
  unreadAdminCount: number;
  unreadStudentCount: number;
  status: "active" | "completed";
  expiresAt: number; // timestamp in ms (24h after start or last message)
}

export interface Message {
  id: string;
  conversationId: string;
  sender: "student" | "admin";
  text: string;
  createdAt: number; // timestamp in ms
  seen: boolean;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  order: number;
  className: string;
}

export interface SystemStatus {
  adminStatus: "ONLINE" | "OFFLINE";
  adminPasswordHash: string; // we can use simple SHA-256 or plain text for simple madrasa app, plain text is easy to configure
}
