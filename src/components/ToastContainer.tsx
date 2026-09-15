import React from "react";
import { Check, AlertTriangle, X } from "lucide-react";
import { NotificationItem } from "../types";

interface ToastContainerProps {
  notifications: NotificationItem[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  notifications,
  onDismiss,
}) => {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full select-none pointer-events-none">
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className={`p-4 rounded-xl shadow-lg flex items-center justify-between gap-3 border transition-all duration-300 pointer-events-auto ${
            notif.type === "success"
              ? "bg-[#D1FAE5] border-[#10B981]/25 text-[#065F46]"
              : notif.type === "warning"
              ? "bg-[#FEF3C7] border-amber-200 text-[#92400E]"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-3">
            {notif.type === "success" && <Check className="w-5 h-5 text-[#10B981] shrink-0" />}
            {notif.type === "warning" && <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />}
            {notif.type === "error" && <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />}
            <div className="text-sm font-medium">{notif.message}</div>
          </div>

          <button
            onClick={() => onDismiss(notif.id)}
            className="p-1 text-current opacity-70 hover:opacity-100 rounded-lg hover:bg-black/5 transition cursor-pointer shrink-0"
            title="Fechar"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
