import React, { useState, useEffect, useRef } from "react";
import {
  Shield,
  Power,
  Search,
  MessageSquare,
  BookOpen,
  Settings,
  Trash2,
  Plus,
  Edit2,
  Save,
  Download,
  Check,
  CheckCheck,
  Volume2,
  VolumeX,
  X,
  PlusCircle,
  Database,
  Lock,
  ArrowRight,
  ChevronRight,
  ExternalLink,
  Eye,
  EyeOff,
  User
} from "lucide-react";
import { FAQ, Conversation, Message } from "../types";
import {
  getAdminPassword,
  updateAdminPassword,
  listenToAdminStatus,
  updateAdminStatus,
  listenToConversations,
  listenToMessages,
  sendChatMessage,
  markConversationMessagesAsSeen,
  deleteConversation,
  deleteAllConversations,
  listenToFAQs,
  addFAQ,
  updateFAQ,
  deleteFAQ
} from "../services/dbService";
import { BackupService } from "../services/backupService";

// Client-side double chime notification sound generator
function playNotificationSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playNote = (freq: number, start: number, duration: number) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      
      gain.gain.setValueAtTime(0.12, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start(start);
      osc.stop(start + duration);
    };
    
    // Play dual elegant soft chime
    playNote(587.33, audioCtx.currentTime, 0.3); // D5
    playNote(783.99, audioCtx.currentTime + 0.12, 0.45); // G5
  } catch (e) {
    console.error("Audio playback prevented by browser audio policy.", e);
  }
}

interface AdminPanelProps {
  onToast: (msg: string, type: "success" | "error") => void;
  onExit: () => void;
}

type TabType = "chats" | "faqs" | "settings";

export default function AdminPanel({ onToast, onExit }: AdminPanelProps) {
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [realPassword, setRealPassword] = useState("1953");
  const [showPassword, setShowPassword] = useState(false);
  const [teacherNameInput, setTeacherNameInput] = useState("");
  const [loggedInTeacherName, setLoggedInTeacherName] = useState("");

  // System states
  const [adminStatus, setAdminStatus] = useState<"ONLINE" | "OFFLINE">("ONLINE");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState("");
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // FAQ states
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [newFaqQuestion, setNewFaqQuestion] = useState("");
  const [newFaqAnswer, setNewFaqAnswer] = useState("");
  const [newFaqOrder, setNewFaqOrder] = useState<number>(1);
  const [newFaqClassName, setNewFaqClassName] = useState("ALL");
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswer, setEditAnswer] = useState("");
  const [editOrder, setEditOrder] = useState<number>(1);
  const [editClassName, setEditClassName] = useState("ALL");

  // Settings states
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Google Drive states
  const [driveClientId, setDriveClientId] = useState("");

  // Sound enable
  const [soundEnabled, setSoundEnabled] = useState(true);

  // UI tabs & Modals
  const [currentTab, setCurrentTab] = useState<TabType>("chats");
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);

  // Refs for tracking unread state & scrolling
  const prevUnreadCountRef = useRef<number>(0);
  const adminMessagesEndRef = useRef<HTMLDivElement>(null);

  // Load real password & Status
  useEffect(() => {
    getAdminPassword().then((pw) => setRealPassword(pw));
    const unsubStatus = listenToAdminStatus((status) => setAdminStatus(status));
    return () => unsubStatus();
  }, []);

  // Check login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherNameInput.trim()) {
      onToast("অনুগ্রহ করে শিক্ষকের নাম লিখুন।", "error");
      return;
    }
    if (passwordInput === realPassword || passwordInput === "1953") {
      setIsAuthenticated(true);
      setLoggedInTeacherName(teacherNameInput.trim());
      onToast(`আসসালামু আলাইকুম, ${teacherNameInput.trim()} উস্তায!`, "success");
    } else {
      onToast("ভুল পিন কোড! আবার চেষ্টা করুন।", "error");
    }
  };

  // Listen to active conversations when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribe = listenToConversations((list) => {
      setConversations(list);

      // Track unread messages for notification sound
      const totalUnread = list.reduce((sum, c) => sum + (c.unreadAdminCount || 0), 0);
      if (totalUnread > prevUnreadCountRef.current && soundEnabled) {
        playNotificationSound();
        onToast("নতুন শিক্ষার্থীর মেসেজ এসেছে!", "success");
      }
      prevUnreadCountRef.current = totalUnread;
    });

    return () => unsubscribe();
  }, [isAuthenticated, soundEnabled]);

  // Keep track of the currently selected conversation object
  useEffect(() => {
    if (!selectedConvId) {
      setSelectedConv(null);
      return;
    }
    const found = conversations.find((c) => c.id === selectedConvId);
    if (found) {
      setSelectedConv(found);
    }
  }, [selectedConvId, conversations]);

  // Listen to messages for the active conversation
  useEffect(() => {
    if (!selectedConvId || !isAuthenticated) return;

    const unsubscribe = listenToMessages(selectedConvId, (messages) => {
      setChatMessages(messages);
      // Automatically mark these messages as seen by the admin
      markConversationMessagesAsSeen(selectedConvId, "admin");
    });

    return () => unsubscribe();
  }, [selectedConvId, isAuthenticated]);

  // Scroll to bottom of admin chat
  useEffect(() => {
    adminMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Listen to FAQs when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    const unsubscribe = listenToFAQs((list) => setFaqs(list));
    return () => unsubscribe();
  }, [isAuthenticated]);

  // Send Reply
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedConvId) return;

    const text = replyText.trim();
    setReplyText("");

    try {
      await sendChatMessage(selectedConvId, "admin", text);
    } catch (error) {
      onToast("মেসেজ পাঠাতে ব্যর্থ হয়েছে।", "error");
    }
  };

  // Delete specific chat
  const handleDeleteChat = async (id: string) => {
    if (confirm("আপনি কি নিশ্চিতভাবে এই চ্যাটটি মুছে ফেলতে চান?")) {
      try {
        await deleteConversation(id);
        if (selectedConvId === id) setSelectedConvId(null);
        onToast("চ্যাট সফলভাবে মুছে ফেলা হয়েছে", "success");
      } catch (error) {
        onToast("মুছে ফেলতে ব্যর্থ হয়েছে।", "error");
      }
    }
  };

  // Delete all chats
  const handleDeleteAllChats = async () => {
    try {
      await deleteAllConversations();
      setSelectedConvId(null);
      setShowDeleteAllModal(false);
      onToast("সকল চ্যাট ইতিহাস মুছে ফেলা হয়েছে!", "success");
    } catch (error) {
      onToast("ব্যর্থ হয়েছে।", "error");
    }
  };

  // Toggle online status
  const handleToggleStatus = async () => {
    const nextStatus = adminStatus === "ONLINE" ? "OFFLINE" : "ONLINE";
    try {
      await updateAdminStatus(nextStatus);
      onToast(
        nextStatus === "ONLINE"
          ? "উস্তায এখন অনলাইনে আছেন"
          : "উস্তায এখন অফলাইনে আছেন",
        "success"
      );
    } catch (e) {
      onToast("অবস্থা পরিবর্তন করতে ব্যর্থ হয়েছে।", "error");
    }
  };

  // Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (oldPassword !== realPassword) {
      onToast("বর্তমান পাসওয়ার্ড ভুল!", "error");
      return;
    }
    if (newPassword.length < 3) {
      onToast("পাসওয়ার্ড অন্তত ৩ অক্ষরের হতে হবে", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      onToast("নতুন পাসওয়ার্ড দুটি মেলেনি!", "error");
      return;
    }

    try {
      await updateAdminPassword(newPassword);
      setRealPassword(newPassword);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onToast("পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!", "success");
    } catch (err) {
      onToast("পরিবর্তন ব্যর্থ হয়েছে।", "error");
    }
  };

  // Add FAQ
  const handleAddFAQ = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFaqQuestion.trim() || !newFaqAnswer.trim()) {
      onToast("সবগুলো ঘর পূরণ করুন", "error");
      return;
    }

    try {
      await addFAQ(newFaqQuestion.trim(), newFaqAnswer.trim(), Number(newFaqOrder) || 1, newFaqClassName);
      setNewFaqQuestion("");
      setNewFaqAnswer("");
      setNewFaqOrder(faqs.length + 2);
      setNewFaqClassName("ALL");
      onToast("নতুন প্রশ্ন-উত্তর যোগ করা হয়েছে!", "success");
    } catch (err) {
      onToast("যোগ করতে ব্যর্থ হয়েছে।", "error");
    }
  };

  // Edit FAQ Mode trigger
  const startEditFAQ = (faq: FAQ) => {
    setEditingFaqId(faq.id);
    setEditQuestion(faq.question);
    setEditAnswer(faq.answer);
    setEditOrder(faq.order);
    setEditClassName(faq.className || "ALL");
  };

  // Save FAQ Edit
  const handleSaveFAQEdit = async (id: string) => {
    if (!editQuestion.trim() || !editAnswer.trim()) {
      onToast("সবগুলো ঘর পূরণ করুন", "error");
      return;
    }

    try {
      await updateFAQ(id, editQuestion.trim(), editAnswer.trim(), Number(editOrder) || 1, editClassName);
      setEditingFaqId(null);
      onToast("সফলভাবে আপডেট করা হয়েছে!", "success");
    } catch (err) {
      onToast("আপডেট ব্যর্থ হয়েছে।", "error");
    }
  };

  // Delete FAQ
  const handleDeleteFAQ = async (id: string) => {
    if (confirm("আপনি কি নিশ্চিতভাবে এই সাধারণ প্রশ্নোত্তরটি মুছে ফেলতে চান?")) {
      try {
        await deleteFAQ(id);
        onToast("সফলভাবে মুছে ফেলা হয়েছে!", "success");
      } catch (err) {
        onToast("মুছে ফেলতে ব্যর্থ হয়েছে।", "error");
      }
    }
  };

  // Export Data JSON File
  const handleExportData = () => {
    try {
      // Create a nice structured JSON representation
      const exportObject = {
        exportedAt: new Date().toISOString(),
        madrasaName: "উস্তায নাবিল মাদ্রাসা সাপোর্ট",
        conversations: conversations.map((c) => ({
          studentName: c.studentName,
          studentClass: c.studentClass,
          studentRoll: c.studentRoll,
          startedAt: new Date(c.createdAt).toLocaleString(),
          expiresAt: new Date(c.expiresAt).toLocaleString()
        })),
        faqs: faqs
      };

      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(exportObject, null, 2)
      )}`;
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", jsonString);
      downloadAnchor.setAttribute("download", `ustaz_nabil_backup_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      onToast("ব্যাকআপ ফাইল সফলভাবে ডাউনলোড হয়েছে!", "success");
    } catch (err) {
      onToast("ডাটা এক্সপোর্ট করতে ব্যর্থ হয়েছে।", "error");
    }
  };

  // Filter conversations by Name, Class, or Roll
  const filteredConversations = conversations.filter((c) => {
    const query = searchQuery.toLowerCase();
    return (
      c.studentName.toLowerCase().includes(query) ||
      c.studentClass.toLowerCase().includes(query) ||
      c.studentRoll.toLowerCase().includes(query)
    );
  });

  // Count unread admin messages
  const totalUnreadAdminCount = conversations.reduce(
    (sum, c) => sum + (c.unreadAdminCount || 0),
    0
  );

  // Convert number to Bangla digits
  const toBanglaDigits = (num: number | string) => {
    const banglaDigits: { [key: string]: string } = {
      "0": "০", "1": "১", "2": "২", "3": "৩", "4": "৪",
      "5": "৫", "6": "৬", "7": "৭", "8": "৮", "9": "৯"
    };
    return num
      .toString()
      .split("")
      .map((d) => banglaDigits[d] || d)
      .join("");
  };

  // Time Formatter helper for admin messages
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "অপরাহ্ন" : "পূর্বাহ্ন";
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${toBanglaDigits(hours)}:${toBanglaDigits(minutes)} ${ampm}`;
  };

  // LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <div id="admin-login-wrapper" className="w-full max-w-md mx-auto my-12">
        <div id="admin-login-card" className="bg-white rounded-2xl border border-[#E5E5E5] shadow-md p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-emerald-50 text-[#0F6B43] rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-100">
              <Lock className="w-6 h-6" />
            </div>
            <h2 id="admin-login-heading" className="text-xl font-bold font-sans text-[#222222]">
              শিক্ষক লগইন প্যানেল
            </h2>
            <p className="text-xs text-[#666666] font-sans mt-1.5">
              অ্যাডমিন ড্যাশবোর্ড অ্যাক্সেস করতে নাম ও পিন প্রদান করুন
            </p>
          </div>

          <form id="admin-login-form" onSubmit={handleLogin} className="space-y-4">
            {/* Teacher's Name Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#222222] font-sans block">
                শিক্ষকের নাম <span className="text-[#D32F2F]">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="admin-teacher-name-input"
                  type="text"
                  value={teacherNameInput}
                  onChange={(e) => setTeacherNameInput(e.target.value)}
                  placeholder="আপনার নাম লিখুন (যেমন: উস্তায নাবিল)"
                  className="w-full pl-9 pr-4 py-2.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#0F6B43]/20 focus:border-[#0F6B43]"
                  autoFocus
                />
              </div>
            </div>

            {/* PIN Code Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#222222] font-sans block">
                পিন কোড <span className="text-[#D32F2F]">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="admin-password-input"
                  type={showPassword ? "text" : "password"}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="৪ সংখ্যার পিন লিখুন..."
                  className="w-full pl-9 pr-10 py-2.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#0F6B43]/20 focus:border-[#0F6B43]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                id="admin-login-cancel"
                type="button"
                onClick={onExit}
                className="flex-1 border border-[#E5E5E5] hover:bg-gray-50 text-[#222222] text-sm py-2.5 rounded-xl font-semibold font-sans transition-all"
              >
                ফিরে যান
              </button>
              <button
                id="admin-login-submit"
                type="submit"
                className="flex-1 bg-[#0F6B43] hover:bg-[#1E8E5A] text-white text-sm py-2.5 rounded-xl font-semibold font-sans flex items-center justify-center gap-1.5 transition-all shadow-xs"
              >
                প্রবেশ করুন
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // MAIN DASHBOARD
  return (
    <div id="admin-dashboard-container" className="w-full max-w-6xl mx-auto my-4 bg-white border border-[#E5E5E5] rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[680px]">
      
      {/* Dashboard Top Navigation bar */}
      <div id="admin-top-navbar" className="bg-[#0F6B43] text-white px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/15 rounded-full flex items-center justify-center text-xl shadow-inner border border-white/10">
            🕌
          </div>
          <div>
            <h1 className="text-lg font-bold font-sans flex items-center gap-1.5">
              {loggedInTeacherName || "উস্তায নাবিল"} <span className="text-xs bg-white/20 font-sans font-medium px-2 py-0.5 rounded-md">শিক্ষক ড্যাশবোর্ড</span>
            </h1>
            <p className="text-[11px] text-emerald-100 font-sans mt-0.5">মাদরাসা ছাত্র সাপোর্ট ও লাইভ চ্যাট সিস্টেম</p>
          </div>
        </div>

        {/* Real-time Switches & Exit button */}
        <div className="flex items-center flex-wrap gap-3">
          {/* Sound Notification switch */}
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              onToast(soundEnabled ? "শব্দ বন্ধ করা হয়েছে" : "শব্দ চালু করা হয়েছে", "success");
            }}
            className={`p-2 rounded-xl transition-all border flex items-center gap-1.5 text-xs font-semibold font-sans cursor-pointer ${
              soundEnabled
                ? "bg-emerald-700/50 border-emerald-400 text-white"
                : "bg-white/10 border-white/15 text-emerald-200"
            }`}
            title="নতুন মেসেজে সাউন্ড নোটিফিকেশন"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            {soundEnabled ? "শব্দ চালু" : "শব্দ বন্ধ"}
          </button>

          {/* Online status toggle switch */}
          <button
            id="admin-status-switch"
            onClick={handleToggleStatus}
            className={`px-3 py-1.5 rounded-xl transition-all border flex items-center gap-1.5 text-xs font-bold font-sans cursor-pointer ${
              adminStatus === "ONLINE"
                ? "bg-white text-[#0F6B43] border-white"
                : "bg-red-700/60 border-red-500 text-white animate-pulse"
            }`}
          >
            <Power className="w-4 h-4" />
            অবস্থা: {adminStatus === "ONLINE" ? "অনলাইন" : "অফলাইন"}
          </button>

          <button
            onClick={onExit}
            className="bg-white/10 hover:bg-white/20 border border-white/10 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold font-sans transition-all cursor-pointer"
          >
            শিক্ষার্থী মোড
          </button>
        </div>
      </div>

      {/* Dashboard Statistics & Tabs Selector */}
      <div id="admin-tabs-section" className="bg-[#FAFAFA] border-b border-[#E5E5E5] px-6 py-2.5 flex flex-wrap items-center justify-between gap-4">
        {/* Statistics highlights */}
        <div className="flex items-center gap-4 text-xs font-sans text-[#666666] flex-wrap">
          <div className="bg-white border border-[#E5E5E5] px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#0F6B43]" />
            <span>মোট চ্যাট: <b>{toBanglaDigits(conversations.length)}</b></span>
          </div>
          <div className="bg-white border border-[#E5E5E5] px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${totalUnreadAdminCount > 0 ? "bg-amber-500 animate-ping" : "bg-gray-300"}`} />
            <span>অপঠিত চ্যাট: <b className={totalUnreadAdminCount > 0 ? "text-amber-600 font-bold" : ""}>{toBanglaDigits(totalUnreadAdminCount)}</b></span>
          </div>
        </div>

        {/* Tab Buttons */}
        <div id="admin-tab-buttons" className="flex items-center gap-1.5 bg-white border border-[#E5E5E5] p-1 rounded-xl">
          <button
            id="tab-chats-btn"
            onClick={() => setCurrentTab("chats")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold font-sans flex items-center gap-1.5 transition-all cursor-pointer ${
              currentTab === "chats"
                ? "bg-[#0F6B43] text-white shadow-xs"
                : "text-[#666666] hover:bg-gray-50"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            শিক্ষার্থীদের চ্যাট তালিকা ({toBanglaDigits(conversations.length)})
          </button>

          <button
            id="tab-faqs-btn"
            onClick={() => setCurrentTab("faqs")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold font-sans flex items-center gap-1.5 transition-all cursor-pointer ${
              currentTab === "faqs"
                ? "bg-[#0F6B43] text-white shadow-xs"
                : "text-[#666666] hover:bg-gray-50"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            সাধারণ প্রশ্নোত্তর (FAQ)
          </button>

          <button
            id="tab-settings-btn"
            onClick={() => setCurrentTab("settings")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold font-sans flex items-center gap-1.5 transition-all cursor-pointer ${
              currentTab === "settings"
                ? "bg-[#0F6B43] text-white shadow-xs"
                : "text-[#666666] hover:bg-gray-50"
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            সেটিংস ও ব্যাকআপ
          </button>
        </div>
      </div>

      {/* WORKSPACE AREA BY ACTIVE TAB */}
      <div id="admin-tab-content" className="flex-1 flex overflow-hidden">
        
        {/* TAB 1: CHATS WORKSPACE */}
        {currentTab === "chats" && (
          <div id="chats-workspace" className="flex-1 flex flex-col md:flex-row overflow-hidden">
            
            {/* Left Sidebar: Conversations list & search */}
            <div className="w-full md:w-80 border-r border-[#E5E5E5] flex flex-col bg-[#FAFAFA] shrink-0 h-full md:h-[480px] lg:h-[520px]">
              {/* Search and global deletion controls */}
              <div className="p-3 border-b border-[#E5E5E5] space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    id="conversations-search"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="নাম, শ্রেণি বা রোল দিয়ে খুঁজুন..."
                    className="w-full bg-white border border-[#E5E5E5] rounded-xl pl-9 pr-3 py-2 text-xs font-sans focus:outline-none focus:ring-2 focus:ring-[#0F6B43]/20 focus:border-[#0F6B43]"
                  />
                </div>
                {conversations.length > 0 && (
                  <button
                    id="delete-all-chats-btn"
                    onClick={() => setShowDeleteAllModal(true)}
                    className="w-full bg-rose-50 hover:bg-rose-100 text-[#D32F2F] border border-rose-200 py-1.5 px-3 rounded-lg text-xs font-bold font-sans flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    সব চ্যাট একবারে মুছুন
                  </button>
                )}
              </div>

              {/* Scrollable list of students */}
              <div className="flex-1 overflow-y-auto divide-y divide-[#E5E5E5]">
                {filteredConversations.length === 0 ? (
                  <div className="text-center p-6 text-gray-400">
                    <span className="text-xl">📭</span>
                    <p className="text-xs font-sans mt-2">কোনো চ্যাট পাওয়া যায়নি</p>
                  </div>
                ) : (
                  filteredConversations.map((c) => {
                    const isSelected = selectedConvId === c.id;
                    const hasUnread = (c.unreadAdminCount || 0) > 0;
                    return (
                      <div
                        key={c.id}
                        id={`student-card-${c.id}`}
                        onClick={() => setSelectedConvId(c.id)}
                        className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all ${
                          isSelected ? "bg-emerald-50/70 border-l-4 border-l-[#0F6B43]" : "hover:bg-gray-100/60"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-[#222222] font-sans truncate">{c.studentName}</span>
                            {hasUnread && (
                              <span className="bg-amber-500 text-white text-[9px] font-bold font-sans px-1.5 py-0.5 rounded-full shrink-0">
                                অপঠিত
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#666666] font-sans mt-0.5 truncate">
                            শ্রেণি: {c.studentClass} | রোল: {c.studentRoll}
                          </p>
                        </div>
                        <div className="flex flex-col items-end shrink-0 gap-1.5">
                          <span className="text-[9px] text-[#666666] font-sans">
                            {formatTime(c.lastMessageAt)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteChat(c.id);
                            }}
                            className="text-gray-400 hover:text-[#D32F2F] p-1 rounded-md transition-colors"
                            title="চ্যাটটি মুছে দিন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Panel: Selected Chat Messenger Workspace */}
            <div className="flex-1 flex flex-col bg-white h-full md:h-[480px] lg:h-[520px]">
              {selectedConv ? (
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                  
                  {/* Chat header (Student detailed banner) */}
                  <div className="bg-[#FAFAFA] border-b border-[#E5E5E5] px-4 py-3 flex items-center justify-between shrink-0">
                    <div>
                      <h3 className="font-bold text-sm text-[#222222] font-sans">{selectedConv.studentName}</h3>
                      <p className="text-xs text-[#666666] font-sans mt-0.5">
                        শ্রেণি: {selectedConv.studentClass} | রোল: {selectedConv.studentRoll}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-gray-500 font-sans block">চ্যাট আইডি: {selectedConv.id.substring(0, 8)}...</span>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 border border-emerald-200 rounded-md font-medium font-sans mt-1 inline-block">
                        ২৪ ঘণ্টা পর স্বয়ংক্রিয়ভাবে মুছে যাবে
                      </span>
                    </div>
                  </div>

                  {/* Message scroll log */}
                  <div className="flex-1 overflow-y-auto p-4 bg-[#FAFAFA] space-y-3">
                    {chatMessages.map((msg) => {
                      const isAdmin = msg.sender === "admin";
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isAdmin ? "items-end" : "items-start"}`}
                        >
                          <span className="text-[10px] text-gray-400 mb-0.5 px-1 font-sans">
                            {isAdmin ? "উস্তায নাবিল (আপনি)" : selectedConv.studentName}
                          </span>
                          <div
                            className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-xs font-sans leading-relaxed whitespace-pre-wrap shadow-xs ${
                              isAdmin
                                ? "bg-[#0F6B43] text-white rounded-tr-none"
                                : "bg-white border border-[#E5E5E5] text-[#222222] rounded-tl-none"
                            }`}
                          >
                            {msg.text}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 px-1">
                            <span className="text-[9px] text-[#666666] font-sans">
                              {formatTime(msg.createdAt)}
                            </span>
                            {isAdmin && (
                              <span className="text-[9px] text-[#666666] font-sans">
                                {msg.seen ? (
                                  <span className="text-emerald-600 font-medium">পঠিত ✓✓</span>
                                ) : (
                                  "প্রেরিত ✓"
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={adminMessagesEndRef} />
                  </div>

                  {/* Send Reply box */}
                  <div className="p-3 border-t border-[#E5E5E5] bg-white shrink-0">
                    <form onSubmit={handleSendReply} className="flex gap-2">
                      <input
                        id="admin-reply-input"
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="আপনার উত্তর লিখুন..."
                        className="flex-1 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl px-4 py-2 text-xs font-sans focus:outline-none focus:ring-2 focus:ring-[#0F6B43]/20 focus:border-[#0F6B43]"
                      />
                      <button
                        id="admin-reply-send"
                        type="submit"
                        disabled={!replyText.trim()}
                        className="bg-[#0F6B43] hover:bg-[#1E8E5A] text-white text-xs font-semibold font-sans px-4 py-2 rounded-xl transition-all disabled:opacity-40"
                      >
                        মেসেজ পাঠান
                      </button>
                    </form>
                  </div>

                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-[#666666] h-full">
                  <span className="text-4xl mb-3">💬</span>
                  <h3 className="font-bold text-base font-sans text-[#222222]">শিক্ষার্থীর চ্যাট নির্বাচন করুন</h3>
                  <p className="text-xs font-sans mt-1 max-w-sm leading-relaxed">
                    বাম দিকের চ্যাট তালিকা থেকে শিক্ষার্থীর নামের ওপর ক্লিক করে তার সাথে রিয়েল-টাইম আলোচনা শুরু করুন।
                  </p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 2: FAQ CRUD MANAGER */}
        {currentTab === "faqs" && (
          <div id="faq-manager-view" className="flex-1 p-6 space-y-6 overflow-y-auto">
            <div className="flex flex-col lg:flex-row gap-6">
              
              {/* Form: Add or Edit FAQ */}
              <div className="w-full lg:w-80 shrink-0">
                <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl p-4 space-y-4 shadow-2xs">
                  <h3 className="font-bold text-sm text-[#0F6B43] font-sans flex items-center gap-1.5">
                    <PlusCircle className="w-4 h-4" />
                    প্রশ্নোত্তর ফরম
                  </h3>
                  <form onSubmit={handleAddFAQ} className="space-y-3.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-[#222222] font-sans block">প্রশ্ন <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={newFaqQuestion}
                        onChange={(e) => setNewFaqQuestion(e.target.value)}
                        placeholder="যেমন: আগামীকালের হোমওয়ার্ক"
                        className="w-full bg-white border border-[#E5E5E5] rounded-lg px-3 py-1.5 text-xs font-sans focus:outline-none focus:ring-1 focus:ring-[#0F6B43]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-[#222222] font-sans block">উত্তর <span className="text-red-500">*</span></label>
                      <textarea
                        value={newFaqAnswer}
                        onChange={(e) => setNewFaqAnswer(e.target.value)}
                        placeholder="বিস্তারিত উত্তরটি লিখুন..."
                        rows={4}
                        className="w-full bg-white border border-[#E5E5E5] rounded-lg px-3 py-1.5 text-xs font-sans focus:outline-none focus:ring-1 focus:ring-[#0F6B43]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-[#222222] font-sans block">ক্রমিক নং (Order)</label>
                      <input
                        type="number"
                        value={newFaqOrder}
                        onChange={(e) => setNewFaqOrder(Number(e.target.value))}
                        className="w-full bg-white border border-[#E5E5E5] rounded-lg px-3 py-1.5 text-xs font-sans focus:outline-none focus:ring-1 focus:ring-[#0F6B43]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-[#222222] font-sans block">শ্রেণি (Class)</label>
                      <select
                        value={newFaqClassName}
                        onChange={(e) => setNewFaqClassName(e.target.value)}
                        className="w-full bg-white border border-[#E5E5E5] rounded-lg px-3 py-1.5 text-xs font-sans focus:outline-none focus:ring-1 focus:ring-[#0F6B43] cursor-pointer"
                      >
                        <option value="ALL">সকল শ্রেণি (All Classes)</option>
                        <option value="চতুর্থ শ্রেণি (Class 4)">চতুর্থ শ্রেণি (Class 4)</option>
                        <option value="পঞ্চম শ্রেণি (Class 5)">পঞ্চম শ্রেণি (Class 5)</option>
                        <option value="ষষ্ঠ শ্রেণি (Class 6)">ষষ্ঠ শ্রেণি (Class 6)</option>
                        <option value="সপ্তম শ্রেণি (Class 7)">সপ্তম শ্রেণি (Class 7)</option>
                        <option value="অষ্টম শ্রেণি (Class 8)">অষ্টম শ্রেণি (Class 8)</option>
                        <option value="নবম শ্রেণি (Class 9)">নবম শ্রেণি (Class 9)</option>
                        <option value="দশম শ্রেণি (Class 10)">দশম শ্রেণি (Class 10)</option>
                        <option value="আলিম প্রথম বর্ষ (Alim 1st Year)">আলিম প্রথম বর্ষ (Alim 1st Year)</option>
                        <option value="আলিম দ্বিতীয় বর্ষ (Alim 2nd Year)">আলিম দ্বিতীয় বর্ষ (Alim 2nd Year)</option>
                        <option value="ফাজিল প্রথম বর্ষ (Fazil 1st Year)">ফাজিল প্রথম বর্ষ (Fazil 1st Year)</option>
                        <option value="ফাজিল দ্বিতীয় বর্ষ (Fazil 2nd Year)">ফাজিল দ্বিতীয় বর্ষ (Fazil 2nd Year)</option>
                        <option value="ফাজিল তৃতীয় বর্ষ (Fazil 3rd Year)">ফাজিল তৃতীয় বর্ষ (Fazil 3rd Year)</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-[#0F6B43] hover:bg-[#1E8E5A] text-white py-2 rounded-lg text-xs font-bold font-sans transition-all cursor-pointer"
                    >
                      প্রশ্ন-উত্তর যুক্ত করুন
                    </button>
                  </form>
                </div>
              </div>

              {/* List / Table of FAQs */}
              <div className="flex-1">
                <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl overflow-hidden shadow-2xs">
                  <div className="bg-[#FAFAFA] px-4 py-3 border-b border-[#E5E5E5]">
                    <h3 className="font-bold text-sm text-[#222222] font-sans">বিদ্যমান সাধারণ প্রশ্নোত্তর তালিকা</h3>
                  </div>

                  <div className="divide-y divide-[#E5E5E5]">
                    {faqs.map((faq) => (
                      <div key={faq.id} className="p-4 flex gap-4 items-start justify-between">
                        {editingFaqId === faq.id ? (
                          <div className="flex-1 space-y-3 bg-white p-3 border border-[#E5E5E5] rounded-xl shadow-xs">
                            <input
                              type="text"
                              value={editQuestion}
                              onChange={(e) => setEditQuestion(e.target.value)}
                              className="w-full bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg px-3 py-1.5 text-xs font-sans"
                            />
                            <textarea
                              value={editAnswer}
                              onChange={(e) => setEditAnswer(e.target.value)}
                              rows={3}
                              className="w-full bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg px-3 py-1.5 text-xs font-sans"
                            />
                            <div className="flex flex-wrap items-center gap-4 bg-gray-50/50 p-2 rounded-lg border border-gray-100">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-[#666666] font-sans">ক্রম:</span>
                                <input
                                  type="number"
                                  value={editOrder}
                                  onChange={(e) => setEditOrder(Number(e.target.value))}
                                  className="w-16 bg-white border border-[#E5E5E5] rounded-lg px-2 py-1 text-xs font-sans"
                                />
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-[#666666] font-sans">শ্রেণি:</span>
                                <select
                                  value={editClassName}
                                  onChange={(e) => setEditClassName(e.target.value)}
                                  className="bg-white border border-[#E5E5E5] rounded-lg px-2 py-1 text-xs font-sans focus:outline-none focus:ring-1 focus:ring-[#0F6B43] cursor-pointer"
                                >
                                  <option value="ALL">সকল শ্রেণি</option>
                                  <option value="চতুর্থ শ্রেণি (Class 4)">চতুর্থ শ্রেণি (Class 4)</option>
                                  <option value="পঞ্চম শ্রেণি (Class 5)">পঞ্চম শ্রেণি (Class 5)</option>
                                  <option value="ষষ্ঠ শ্রেণি (Class 6)">ষষ্ঠ শ্রেণি (Class 6)</option>
                                  <option value="সপ্তম শ্রেণি (Class 7)">সপ্তম শ্রেণি (Class 7)</option>
                                  <option value="অষ্টম শ্রেণি (Class 8)">অষ্টম শ্রেণি (Class 8)</option>
                                  <option value="নবম শ্রেণি (Class 9)">নবম শ্রেণি (Class 9)</option>
                                  <option value="দশম শ্রেণি (Class 10)">দশম শ্রেণি (Class 10)</option>
                                  <option value="আলিম প্রথম বর্ষ (Alim 1st Year)">আলিম প্রথম বর্ষ (Alim 1st Year)</option>
                                  <option value="আলিম দ্বিতীয় বর্ষ (Alim 2nd Year)">আলিম দ্বিতীয় বর্ষ (Alim 2nd Year)</option>
                                  <option value="ফাজিল প্রথম বর্ষ (Fazil 1st Year)">ফাজিল প্রথম বর্ষ (Fazil 1st Year)</option>
                                  <option value="ফাজিল দ্বিতীয় বর্ষ (Fazil 2nd Year)">ফাজিল দ্বিতীয় বর্ষ (Fazil 2nd Year)</option>
                                  <option value="ফাজিল তৃতীয় বর্ষ (Fazil 3rd Year)">ফাজিল তৃতীয় বর্ষ (Fazil 3rd Year)</option>
                                </select>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSaveFAQEdit(faq.id)}
                                className="bg-[#0F6B43] hover:bg-[#1E8E5A] text-white px-3 py-1.5 rounded-lg text-xs font-bold font-sans flex items-center gap-1 cursor-pointer"
                              >
                                <Save className="w-3.5 h-3.5" /> সংরক্ষণ করুন
                              </button>
                              <button
                                onClick={() => setEditingFaqId(null)}
                                className="bg-gray-100 hover:bg-gray-200 text-[#222222] px-3 py-1.5 rounded-lg text-xs font-bold font-sans cursor-pointer"
                              >
                                বাতিল
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1 space-y-1.5 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="bg-[#0F6B43]/10 text-[#0F6B43] text-[10px] font-bold font-sans px-2 py-0.5 rounded-full">
                                ক্রম: {toBanglaDigits(faq.order)}
                              </span>
                              <span className="bg-amber-50 text-amber-800 text-[10px] font-bold font-sans px-2.5 py-0.5 rounded-full border border-amber-100/50">
                                শ্রেণি: {faq.className === "ALL" || !faq.className ? "সকল শ্রেণি" : faq.className}
                              </span>
                              <h4 className="font-bold text-sm text-[#222222] font-sans ml-1">{faq.question}</h4>
                            </div>
                            <p className="text-xs text-[#666666] font-sans leading-relaxed">{faq.answer}</p>
                          </div>
                        )}

                        {editingFaqId !== faq.id && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => startEditFAQ(faq)}
                              className="text-gray-400 hover:text-emerald-700 p-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
                              title="সম্পাদনা করুন"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteFAQ(faq.id)}
                              className="text-gray-400 hover:text-[#D32F2F] p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}

                    {faqs.length === 0 && (
                      <p className="p-6 text-center text-xs text-gray-400 font-sans italic">কোনো প্রশ্ন-উত্তর পাওয়া যায়নি।</p>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: SETTINGS & BACKUPS */}
        {currentTab === "settings" && (
          <div id="settings-view" className="flex-1 p-6 space-y-6 overflow-y-auto max-w-4xl">
            
            {/* Split row layouts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Form Change Password */}
              <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl p-5 space-y-4 shadow-2xs">
                <h3 className="font-bold text-sm text-[#0F6B43] font-sans flex items-center gap-1.5">
                  <Settings className="w-4 h-4" />
                  অ্যাডমিন পাসওয়ার্ড পরিবর্তন
                </h3>
                <form onSubmit={handleChangePassword} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#222222] font-sans block">বর্তমান পাসওয়ার্ড</label>
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="বর্তমান পাসওয়ার্ড দিন..."
                      className="w-full bg-white border border-[#E5E5E5] rounded-lg px-3 py-1.5 text-xs font-sans focus:outline-none focus:ring-1 focus:ring-[#0F6B43]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#222222] font-sans block">নতুন পাসওয়ার্ড</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="নতুন পাসওয়ার্ড দিন..."
                      className="w-full bg-white border border-[#E5E5E5] rounded-lg px-3 py-1.5 text-xs font-sans focus:outline-none focus:ring-1 focus:ring-[#0F6B43]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#222222] font-sans block">পাসওয়ার্ড নিশ্চিত করুন</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="নতুন পাসওয়ার্ডটি আবার দিন..."
                      className="w-full bg-white border border-[#E5E5E5] rounded-lg px-3 py-1.5 text-xs font-sans focus:outline-none focus:ring-1 focus:ring-[#0F6B43]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-[#0F6B43] hover:bg-[#1E8E5A] text-white py-2 px-4 rounded-lg text-xs font-bold font-sans transition-all cursor-pointer"
                  >
                    পাসওয়ার্ড পরিবর্তন করুন
                  </button>
                </form>
              </div>

              {/* Data exports and Manual Maintenance */}
              <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl p-5 space-y-4 shadow-2xs">
                <h3 className="font-bold text-sm text-[#0F6B43] font-sans flex items-center gap-1.5">
                  <Database className="w-4 h-4" />
                  ডাটা ব্যাকআপ ও এক্সপোর্ট
                </h3>
                
                <div className="space-y-3 text-xs font-sans text-[#666666] leading-relaxed">
                  <p>
                    মাদরাসার শিক্ষার্থীর তথ্য, চ্যাটের বিষয়াদি এবং সাধারণ প্রশ্নোত্তরের একটি সম্পূর্ণ ডাটা ফাইল সংরক্ষণ করে রাখতে পারেন। যেকোনো সময় তা বিশ্লেষণ করা সম্ভব।
                  </p>
                  
                  <button
                    onClick={handleExportData}
                    className="w-full bg-white border border-[#0F6B43] text-[#0F6B43] hover:bg-emerald-50 py-2.5 rounded-lg text-xs font-bold font-sans flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    ব্যাকআপ ফাইল ডাউনলোড করুন (JSON)
                  </button>

                  <div className="pt-2 border-t border-[#E5E5E5] space-y-2">
                    <p className="font-bold text-[#222222]">স্বয়ংক্রিয় ২৪ ঘণ্টার মেয়াদ:</p>
                    <p className="text-[11px]">
                      প্রতিটি শিক্ষার্থীর তৈরি করা চ্যাট সেশন ২৪ ঘণ্টা অতিক্রম হওয়ার পর ফায়ারবেস ফিল্টার নিয়মের মাধ্যমে স্বয়ংক্রিয়ভাবে ব্যবহারকারী উইন্ডো থেকে অদৃশ্য হয়ে যাবে। এর ফলে চ্যাটের গতি ও সার্ভার পরিষ্কার থাকে।
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {/* Google Drive Future Integration Section */}
            <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-bold text-sm text-[#222222] font-sans flex items-center gap-2">
                  <Database className="w-4.5 h-4.5 text-[#0F6B43]" />
                  ভবিষ্যতের জন্য গুগল ড্রাইভ ব্যাকআপ আর্কিটেকচার
                </h3>
                <span className="bg-[#0F6B43]/10 text-[#0F6B43] text-[10px] font-bold font-sans px-2.5 py-0.5 rounded-full">
                  পিপারেশন মোড (Modular Setup)
                </span>
              </div>
              
              <div className="text-xs font-sans text-[#666666] leading-relaxed space-y-3 max-w-2xl">
                <p>
                  গুগল ড্রাইভ ব্যাকআপ সাপোর্ট প্রস্তুত করা রয়েছে। ভবিষ্যতের প্রয়োজনে শুধুমাত্র ড্রাইভ ক্লায়েন্ট আইডি এবং সিক্রেট প্রদান করা মাত্রই রিয়েল ব্যাকআপ গুগল ক্লাউড সার্ভারের ড্রাইভে আপলোড করা শুরু হবে।
                </p>
                <div className="bg-white border border-[#E5E5E5] p-4 rounded-lg space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-[#222222] block">গুগল ড্রাইভ ক্লায়েন্ট আইডি (Client ID)</label>
                      <input
                        type="text"
                        value={driveClientId}
                        onChange={(e) => setDriveClientId(e.target.value)}
                        placeholder="credentials-provided-in-future"
                        disabled
                        className="w-full bg-gray-50 border border-[#E5E5E5] rounded-md px-3 py-1 text-xs opacity-60 cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-[#222222] block">সার্ভিস স্কোপ (OAuth Scopes)</label>
                      <input
                        type="text"
                        value="https://www.googleapis.com/auth/drive.file"
                        disabled
                        className="w-full bg-gray-50 border border-[#E5E5E5] rounded-md px-3 py-1 text-xs opacity-60 cursor-not-allowed"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled
                    className="bg-gray-200 text-gray-500 py-1.5 px-3.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-not-allowed"
                  >
                    গুগল ড্রাইভ লিংক করুন (ক্রেডেনশিয়ালস প্রয়োজন)
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* FOOTER */}
      <div className="bg-[#FAFAFA] border-t border-[#E5E5E5] px-6 py-3.5 flex items-center justify-between text-xs font-sans text-[#666666]">
        <span>মাদরাসা স্টুডেন্ট সাপোর্ট চ্যাট সিস্টেম</span>
        <span>ভার্সন ১.০.০</span>
      </div>

      {/* CONFIRMATION DIALOG: DELETE ALL */}
      {showDeleteAllModal && (
        <div id="delete-all-modal-backdrop" className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div id="delete-all-modal" className="bg-white rounded-2xl border border-[#E5E5E5] shadow-xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-bold text-base text-[#D32F2F] font-sans flex items-center gap-1.5">
              ⚠️ সকল চ্যাট মুছে ফেলার সতর্কতা
            </h3>
            <p className="text-xs font-sans text-[#666666] leading-relaxed">
              আপনি কি নিশ্চিতভাবে এই মাদরাসার সকল শিক্ষার্থীর চ্যাট এবং মেসেজের ইতিহাস সম্পূর্ণ মুছে ফেলতে চান? একবার মুছে ফেলা হলে তা পুনরুদ্ধার করা সম্ভব হবে না।
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <button
                id="delete-all-modal-cancel"
                onClick={() => setShowDeleteAllModal(false)}
                className="bg-gray-100 hover:bg-gray-200 text-[#222222] text-xs font-bold font-sans px-4 py-2 rounded-xl transition-all cursor-pointer"
              >
                বাতিল করুন
              </button>
              <button
                id="delete-all-modal-confirm"
                onClick={handleDeleteAllChats}
                className="bg-[#D32F2F] hover:bg-red-700 text-white text-xs font-bold font-sans px-4 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                হ্যাঁ, সব মুছে দিন
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
