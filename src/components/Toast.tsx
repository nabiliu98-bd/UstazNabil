import React, { useEffect } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

export interface ToastProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      id="custom-toast"
      className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border transition-all duration-300 transform animate-bounce ${
        type === "success"
          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
          : "bg-rose-50 border-rose-200 text-rose-800"
      }`}
    >
      {type === "success" ? (
        <CheckCircle2 id="toast-success-icon" className="w-5 h-5 text-[#2E7D32]" />
      ) : (
        <AlertCircle id="toast-error-icon" className="w-5 h-5 text-[#D32F2F]" />
      )}
      <span id="toast-text" className="text-sm font-medium font-sans">{message}</span>
      <button
        id="toast-close-btn"
        onClick={onClose}
        className="text-gray-400 hover:text-gray-600 focus:outline-none"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
