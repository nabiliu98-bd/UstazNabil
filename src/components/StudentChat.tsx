import React, { useState, useEffect, useRef } from "react";
import { Send, ArrowLeft, Loader2, BookOpen, Clock, AlertCircle, Sparkles } from "lucide-react";
import { FAQ, Message, StudentInfo } from "../types";
import {
  listenToMessages,
  sendChatMessage,
  markConversationMessagesAsSeen,
  listenToFAQs
} from "../services/dbService";

interface StudentChatProps {
  conversationId: string;
  studentInfo: StudentInfo;
  adminStatus: "ONLINE" | "OFFLINE";
  onBack: () => void;
}

export default function StudentChat({
  conversationId,
  studentInfo,
  adminStatus,
  onBack
}: StudentChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Filter FAQs specific to this student's class or general ALL classes
  const filteredFaqs = faqs.filter(
    (faq) => !faq.className || faq.className === "ALL" || faq.className === studentInfo.className
  );

  // 1. Listen to Real-time messages for this conversation
  useEffect(() => {
    setLoading(true);
    const unsubscribe = listenToMessages(conversationId, (loadedMessages) => {
      setMessages(loadedMessages);
      setLoading(false);

      // Auto mark messages from Admin as seen
      markConversationMessagesAsSeen(conversationId, "student");
    });

    return () => unsubscribe();
  }, [conversationId]);

  // 2. Listen to real-time FAQs in case they are updated
  useEffect(() => {
    const unsubscribe = listenToFAQs((loadedFaqs) => {
      setFaqs(loadedFaqs);
    }, studentInfo.className);
    return () => unsubscribe();
  }, [studentInfo.className]);

  // 3. Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 4. Handle student sending a typed message (only allowed when online)
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || sending || adminStatus === "OFFLINE") return;

    const textToSend = inputText.trim();
    setInputText("");
    setSending(true);

    try {
      await sendChatMessage(conversationId, "student", textToSend);
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSending(false);
    }
  };

  // 5. Handle student selecting an FAQ offline question
  const handleFAQSelect = async (faq: FAQ) => {
    if (sending) return;
    setSending(true);

    try {
      // Step A: Send the question as student
      await sendChatMessage(conversationId, "student", faq.question);
      
      // Step B: Automatically answer instantly as Admin with predefined FAQ answer
      await sendChatMessage(conversationId, "admin", faq.answer);
    } catch (error) {
      console.error("Failed to send FAQ message:", error);
    } finally {
      setSending(false);
    }
  };

  // Helper: Format message time to Bangla
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "অপরাহ্ন" : "পূর্বাহ্ন";
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    
    // Convert to Bangla digits
    const banglaDigits: { [key: string]: string } = {
      "0": "০", "1": "১", "2": "২", "3": "৩", "4": "৪",
      "5": "৫", "6": "৬", "7": "৭", "8": "৮", "9": "৯"
    };

    const convertToBangla = (str: string) =>
      str.split("").map((d) => banglaDigits[d] || d).join("");

    return `${convertToBangla(hours.toString())}:${convertToBangla(minutes)} ${ampm}`;
  };

  return (
    <div id="student-chat-container" className="w-full max-w-2xl mx-auto my-4 flex flex-col h-[650px] bg-white rounded-2xl border border-[#E5E5E5] shadow-sm overflow-hidden">
      {/* Chat Header */}
      <div id="student-chat-header" className="bg-[#0F6B43] text-white px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button
            id="student-chat-back-btn"
            onClick={onBack}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-all"
            title="ফিরে যান"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 id="student-chat-title" className="text-base font-bold font-sans">উস্তায নাবিল</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${adminStatus === "ONLINE" ? "bg-emerald-400 animate-pulse" : "bg-gray-300"}`} />
              <span className="text-xs text-emerald-100 font-sans">
                {adminStatus === "ONLINE" ? "অনলাইন" : "অফলাইন"}
              </span>
            </div>
          </div>
        </div>

        {/* Student identity badge */}
        <div id="student-identity-badge" className="text-right text-xs bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
          <p className="font-semibold font-sans text-white">{studentInfo.name}</p>
          <p className="text-[10px] text-emerald-100/80 font-sans">
            শ্রেণি: {studentInfo.className} | রোল: {studentInfo.roll}
          </p>
        </div>
      </div>

      {/* Messages Window */}
      <div id="chat-messages-area" className="flex-1 overflow-y-auto p-4 bg-[#FAFAFA] space-y-3.5">
        {loading ? (
          <div id="chat-loading" className="flex flex-col items-center justify-center h-full text-[#666666]">
            <Loader2 className="w-8 h-8 animate-spin text-[#0F6B43] mb-2" />
            <span className="text-sm font-sans">চ্যাট লোড হচ্ছে...</span>
          </div>
        ) : messages.length === 0 ? (
          <div id="chat-empty-state" className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3">
            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-[#0F6B43]">
              🕌
            </div>
            <h3 className="text-base font-bold text-[#222222] font-sans">উস্তাযের কাছে আপনার প্রশ্ন জিজ্ঞাসা করুন</h3>
            <p className="text-xs text-[#666666] font-sans max-w-sm leading-relaxed">
              {adminStatus === "ONLINE" 
                ? "নিচে মেসেজ লিখে উস্তাযের কাছে সরাসরি পাঠান। উস্তায দ্রুত উত্তর দেওয়ার চেষ্টা করবেন ইনশাআল্লাহ।"
                : "উস্তায বর্তমানে অফলাইনে আছেন। আপনি নিচে থেকে যেকোনো সাধারণ বিষয়ে প্রশ্ন সিলেক্ট করে তাৎক্ষণিক উত্তর পেতে পারেন।"}
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isStudent = msg.sender === "student";
            return (
              <div
                key={msg.id}
                id={`msg-${msg.id}`}
                className={`flex flex-col ${isStudent ? "items-end" : "items-start"}`}
              >
                {/* Sender Name Indicator */}
                <span className="text-[10px] text-gray-400 mb-1 px-1 font-sans">
                  {isStudent ? studentInfo.name : "উস্তায নাবিল"}
                </span>

                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] px-4 py-2.5 rounded-2xl shadow-sm leading-relaxed font-sans text-sm whitespace-pre-wrap ${
                    isStudent
                      ? "bg-[#0F6B43] text-white rounded-tr-none"
                      : "bg-white border border-[#E5E5E5] text-[#222222] rounded-tl-none"
                  }`}
                >
                  {msg.text}
                </div>

                {/* Status bar */}
                <div className="flex items-center gap-1.5 mt-1 px-1">
                  <span className="text-[10px] text-[#666666] font-sans">
                    {formatTime(msg.createdAt)}
                  </span>
                  {isStudent && (
                    <span className="text-[10px] font-sans text-emerald-600 font-medium">
                      {msg.seen ? "● পঠিত" : "● প্রেরিত"}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      {sending && (
        <div id="student-typing-indicator" className="bg-[#FAFAFA] px-4 py-1.5 flex items-center gap-2 text-xs text-[#666666] border-t border-[#E5E5E5]/50">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0F6B43]" />
          <span className="font-sans">প্রেরণ করা হচ্ছে...</span>
        </div>
      )}

      {/* Bottom Area: Input or Offline FAQ Drawer */}
      <div id="chat-input-area" className="border-t border-[#E5E5E5] bg-white p-3.5 space-y-3">
        {adminStatus === "ONLINE" ? (
          <div className="space-y-3">
            {/* Class-specific FAQs suggestions above typing input */}
            {filteredFaqs.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-gray-500 px-1">
                  <BookOpen className="w-3.5 h-3.5 text-[#0F6B43]" />
                  <span className="text-[11px] font-semibold font-sans">সাধারণ প্রশ্নোত্তর ({studentInfo.className}):</span>
                </div>
                <div id="faq-buttons-scroller-online" className="flex flex-wrap gap-1.5 max-h-[90px] overflow-y-auto py-1">
                  {filteredFaqs.map((faq) => (
                    <button
                      key={faq.id}
                      id={`faq-btn-online-${faq.id}`}
                      onClick={() => handleFAQSelect(faq)}
                      disabled={sending}
                      className="bg-emerald-50/30 hover:bg-emerald-50 hover:border-emerald-200 border border-[#E5E5E5]/60 text-[11px] font-medium font-sans text-[#222222] hover:text-[#0F6B43] py-1.5 px-3 rounded-full transition-all flex items-center gap-1 shadow-2xs disabled:opacity-50 active:scale-95 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      {faq.question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form id="chat-online-form" onSubmit={handleSend} className="flex gap-2 pt-1">
              <input
                id="chat-text-input"
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="এখানে আপনার প্রশ্ন লিখুন..."
                disabled={sending}
                className="flex-1 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl px-4 py-2.5 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#0F6B43]/20 focus:border-[#0F6B43] transition-all disabled:opacity-50"
              />
              <button
                id="chat-send-btn"
                type="submit"
                disabled={!inputText.trim() || sending}
                className="bg-[#0F6B43] hover:bg-[#1E8E5A] text-white p-2.5 rounded-xl transition-all disabled:opacity-40 flex items-center justify-center shadow-sm active:scale-95"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        ) : (
          <div id="chat-offline-faq-panel" className="space-y-3">
            {/* Offline Announcement Box */}
            <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3 flex gap-2.5 items-start">
              <AlertCircle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-xs font-bold font-sans">উস্তায বর্তমানে অফলাইনে আছেন।</p>
                <p className="text-[11px] font-sans text-amber-800">
                  নিচের সাধারণ বিষয়গুলো থেকে প্রশ্ন নির্বাচন করুন। তাৎক্ষণিক উত্তর পেয়ে যাবেন।
                </p>
              </div>
            </div>

            {/* Scrollable List of FAQs */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-gray-500 px-1">
                <BookOpen className="w-3.5 h-3.5 text-[#0F6B43]" />
                <span className="text-[11px] font-semibold font-sans">সাধারণ প্রশ্নোত্তর ({studentInfo.className}):</span>
              </div>
              <div id="faq-buttons-scroller" className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto pb-1.5">
                {filteredFaqs.map((faq) => (
                  <button
                    key={faq.id}
                    id={`faq-btn-${faq.id}`}
                    onClick={() => handleFAQSelect(faq)}
                    disabled={sending}
                    className="bg-[#FAFAFA] hover:bg-emerald-50 hover:border-emerald-200 border border-[#E5E5E5] text-xs font-medium font-sans text-[#222222] hover:text-[#0F6B43] py-2 px-3.5 rounded-full transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50 active:scale-95 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    {faq.question}
                  </button>
                ))}
                {filteredFaqs.length === 0 && (
                  <p className="text-[11px] text-gray-400 italic font-sans p-2">আপনার শ্রেণির জন্য কোনো সাধারণ প্রশ্নোত্তর পাওয়া যায়নি।</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
