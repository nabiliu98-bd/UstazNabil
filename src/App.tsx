import React, { useState, useEffect } from "react";
import { MessageSquare, Shield, HelpCircle, LogOut } from "lucide-react";
import StudentHome from "./components/StudentHome";
import StudentChat from "./components/StudentChat";
import AdminPanel from "./components/AdminPanel";
import Toast from "./components/Toast";
import { StudentInfo } from "./types";
import {
  initializeDatabase,
  listenToAdminStatus,
  createConversation
} from "./services/dbService";

export default function App() {
  const [viewState, setViewState] = useState<"student" | "admin">("student");
  const [studentSession, setStudentSession] = useState<{
    name: string;
    className: string;
    roll: string;
    conversationId: string;
  } | null>(null);

  const [adminStatus, setAdminStatus] = useState<"ONLINE" | "OFFLINE">("ONLINE");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // 1. Initialize Firestore Database on App Start
  useEffect(() => {
    initializeDatabase().then(() => {
      console.log("Firestore Seed initialized successfully.");
    });
  }, []);

  // 2. Listen to Admin Status ONLINE/OFFLINE Globally
  useEffect(() => {
    const unsubscribe = listenToAdminStatus((status) => {
      setAdminStatus(status);
    });
    return () => unsubscribe();
  }, []);

  // 3. Restore Student Session from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem("ustaz_nabil_session");
    if (saved) {
      try {
        const session = JSON.parse(saved);
        // Check if session is older than 24 hours
        const now = Date.now();
        const savedTime = session.createdAt || 0;
        const expiryTime = savedTime + 24 * 60 * 60 * 1000;
        
        if (now < expiryTime) {
          setStudentSession(session);
        } else {
          // Session expired, remove it
          localStorage.removeItem("ustaz_nabil_session");
          showToast("আপনার পূর্ববর্তী চ্যাট সেশন ২৪ ঘণ্টা পর শেষ হয়ে গেছে। দয়া করে নতুন করে শুরু করুন।", "error");
        }
      } catch (e) {
        localStorage.removeItem("ustaz_nabil_session");
      }
    }
  }, []);

  // Toast notifier helper
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
  };

  // Create conversation and start student chat
  const handleStartChat = async (info: StudentInfo) => {
    try {
      showToast("চ্যাট শুরু হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...", "success");
      const conversationId = await createConversation(info.name, info.className, info.roll);
      
      const session = {
        name: info.name,
        className: info.className,
        roll: info.roll,
        conversationId,
        createdAt: Date.now()
      };

      localStorage.setItem("ustaz_nabil_session", JSON.stringify(session));
      setStudentSession(session);
      showToast("সফলভাবে সংযুক্ত হয়েছে!", "success");
    } catch (error) {
      console.error(error);
      showToast("সংযুক্ত হতে ব্যর্থ হয়েছে। পুনরায় চেষ্টা করুন।", "error");
    }
  };

  // Exit student session
  const handleExitStudentChat = () => {
    if (confirm("আপনি কি নিশ্চিতভাবে এই চ্যাট সেশন থেকে বিদায় নিতে চান? আপনার ২৪ ঘণ্টার চ্যাটটি ডিভাইসে সেশন মুছে যাবে।")) {
      localStorage.removeItem("ustaz_nabil_session");
      setStudentSession(null);
      showToast("চ্যাট সেশন বন্ধ করা হয়েছে।", "success");
    }
  };

  return (
    <div id="app-root-theme" className="min-h-screen bg-white text-[#222222] flex flex-col justify-between selection:bg-[#0F6B43]/10 selection:text-[#0F6B43]">
      
      {/* Top Header */}
      <header id="app-global-header" className="border-b border-[#E5E5E5] bg-white sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🕌</span>
            <div>
              <h1 className="text-base font-bold font-sans text-[#222222] tracking-wide">উস্তায নাবিল</h1>
              <p className="text-[10px] text-[#666666] font-sans font-medium">মাদরাসা ছাত্র সাপোর্ট প্যানেল</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {viewState === "student" ? (
              <button
                id="header-teacher-btn"
                onClick={() => setViewState("admin")}
                className="bg-[#FAFAFA] hover:bg-gray-100 border border-[#E5E5E5] text-xs font-semibold text-[#222222] px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5 text-[#0F6B43]" />
                শিক্ষক প্রবেশদ্বার
              </button>
            ) : (
              <button
                id="header-student-btn"
                onClick={() => setViewState("student")}
                className="bg-[#0F6B43] hover:bg-[#1E8E5A] text-white text-xs font-semibold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                শিক্ষার্থী চ্যাট উইন্ডো
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Body Stage */}
      <main id="app-main-content" className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 flex flex-col justify-center">
        {viewState === "student" ? (
          studentSession ? (
            <div className="space-y-4">
              <StudentChat
                conversationId={studentSession.conversationId}
                studentInfo={{
                  name: studentSession.name,
                  className: studentSession.className,
                  roll: studentSession.roll
                }}
                adminStatus={adminStatus}
                onBack={handleExitStudentChat}
              />
              <div className="text-center">
                <button
                  id="student-session-quit"
                  onClick={handleExitStudentChat}
                  className="inline-flex items-center gap-1 text-xs text-[#D32F2F] hover:underline font-sans font-semibold cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  নতুন শিক্ষার্থীর চ্যাট ফরম শুরু করুন
                </button>
              </div>
            </div>
          ) : (
            <StudentHome onSubmit={handleStartChat} adminStatus={adminStatus} />
          )
        ) : (
          <AdminPanel onToast={showToast} onExit={() => setViewState("student")} />
        )}
      </main>

      {/* Elegant Footer */}
      <footer id="app-global-footer" className="bg-[#FAFAFA] border-t border-[#E5E5E5] py-5">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#666666] font-sans">
          <p>© {new Date().getFullYear()} উস্তায নাবিল মাদরাসা সাপোর্ট সিস্টেম। সর্বস্বত্ব সংরক্ষিত।</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-[#0F6B43] cursor-pointer">মাদরাসা নীতিমালা</span>
            <span>•</span>
            <button
              onClick={() => {
                setViewState("admin");
                showToast("অ্যাডমিন লগইন স্ক্রিন প্রদর্শিত হচ্ছে।", "success");
              }}
              className="hover:text-[#0F6B43] underline font-semibold focus:outline-none cursor-pointer"
            >
              শিক্ষক প্যানেল লগইন
            </button>
          </div>
        </div>
      </footer>

      {/* Custom Toast Alerts */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
