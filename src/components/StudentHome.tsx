import React, { useState } from "react";
import { User, BookOpen, Hash, ArrowRight } from "lucide-react";
import { StudentInfo } from "../types";

interface StudentHomeProps {
  onSubmit: (info: StudentInfo) => void;
  adminStatus: "ONLINE" | "OFFLINE";
}

export default function StudentHome({ onSubmit, adminStatus }: StudentHomeProps) {
  const [name, setName] = useState("");
  const [className, setClassName] = useState("");
  const [roll, setRoll] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("আপনার নাম লিখুন");
      return;
    }
    if (!className.trim()) {
      setError("আপনার শ্রেণি লিখুন");
      return;
    }
    if (!roll.trim()) {
      setError("আপনার রোল লিখুন");
      return;
    }

    setError("");
    onSubmit({
      name: name.trim(),
      className: className.trim(),
      roll: roll.trim()
    });
  };

  return (
    <div id="student-home-container" className="w-full max-w-md mx-auto my-8">
      <div
        id="student-home-card"
        className="bg-white rounded-2xl border border-[#E5E5E5] shadow-sm overflow-hidden"
      >
        {/* Card Header */}
        <div id="student-home-header" className="bg-[#0F6B43] px-6 py-8 text-center text-white relative">
          <div className="absolute inset-0 bg-radial-gradient from-[#1E8E5A]/20 to-transparent pointer-events-none" />
          <div
            id="logo-icon"
            className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20 shadow-inner"
          >
            <span className="text-3xl">🕌</span>
          </div>
          <h1 id="app-title-main" className="text-2xl font-bold font-sans tracking-wide">
            উস্তায নাবিল
          </h1>
          <p id="app-subtitle-main" className="text-sm text-emerald-100/90 font-sans mt-2">
            "আপনার প্রশ্ন সরাসরি উস্তাযের কাছে পাঠান"
          </p>
        </div>

        {/* Form Body */}
        <form id="student-login-form" onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div
              id="student-login-error"
              className="bg-rose-50 text-[#D32F2F] px-4 py-3 rounded-lg border border-rose-200 text-sm font-sans flex items-center gap-2"
            >
              <span className="font-bold">⚠️</span> {error}
            </div>
          )}

          {/* Admin Status Badge */}
          <div id="admin-status-bar" className="flex items-center justify-between bg-[#FAFAFA] p-3 rounded-xl border border-[#E5E5E5]">
            <span className="text-xs text-[#666666] font-sans">উস্তাযের অবস্থা:</span>
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  adminStatus === "ONLINE" ? "bg-[#2E7D32] animate-pulse" : "bg-gray-400"
                }`}
              />
              <span className={`text-xs font-semibold font-sans ${
                adminStatus === "ONLINE" ? "text-[#2E7D32]" : "text-gray-500"
              }`}>
                {adminStatus === "ONLINE" ? "অনলাইন (সরাসরি চ্যাট)" : "অফলাইন (প্রশ্নোত্তর মোড)"}
              </span>
            </div>
          </div>

          {/* Name Input */}
          <div className="space-y-1.5">
            <label id="label-student-name" className="text-xs font-medium text-[#222222] font-sans block">
              শিক্ষার্থীর নাম <span className="text-[#D32F2F]">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <User className="h-4 w-4 text-gray-400" />
              </div>
              <input
                id="input-student-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="যেমন: মুহাম্মদ আলী"
                className="w-full pl-10 pr-4 py-2.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#0F6B43]/20 focus:border-[#0F6B43] transition-all"
              />
            </div>
          </div>

          {/* Class Select Input */}
          <div className="space-y-1.5">
            <label id="label-student-class" className="text-xs font-medium text-[#222222] font-sans block">
              শ্রেণি <span className="text-[#D32F2F]">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <BookOpen className="h-4 w-4 text-gray-400" />
              </div>
              <select
                id="input-student-class"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#0F6B43]/20 focus:border-[#0F6B43] transition-all appearance-none cursor-pointer text-[#222222]"
              >
                <option value="">শ্রেণি নির্বাচন করুন</option>
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
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                <span className="text-xs">▼</span>
              </div>
            </div>
          </div>

          {/* Roll Input */}
          <div className="space-y-1.5">
            <label id="label-student-roll" className="text-xs font-medium text-[#222222] font-sans block">
              রোল <span className="text-[#D32F2F]">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Hash className="h-4 w-4 text-gray-400" />
              </div>
              <input
                id="input-student-roll"
                type="text"
                value={roll}
                onChange={(e) => setRoll(e.target.value)}
                placeholder="যেমন: ১২"
                className="w-full pl-10 pr-4 py-2.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#0F6B43]/20 focus:border-[#0F6B43] transition-all"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            id="student-login-submit"
            type="submit"
            className="w-full bg-[#0F6B43] hover:bg-[#1E8E5A] text-white py-3 px-4 rounded-xl text-sm font-semibold font-sans flex items-center justify-center gap-2 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#0F6B43] focus:ring-offset-2 active:scale-98"
          >
            চ্যাট শুরু করুন
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>

      {/* Madrasa Rules Note */}
      <div id="student-home-footer" className="text-center mt-6 text-xs text-[#666666] font-sans leading-relaxed">
        নিরাপত্তা ও শৃঙ্খলার স্বার্থে চ্যাট হিস্ট্রি ২৪ ঘণ্টা পর স্বয়ংক্রিয়ভাবে মুছে যাবে। <br />
        অহেতুক বা অপ্রাসঙ্গিক প্রশ্ন করা থেকে বিরত থাকুন।
      </div>
    </div>
  );
}
