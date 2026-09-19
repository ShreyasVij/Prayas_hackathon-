"use client";

import { Appointment } from "../data";
import { Clock, User2, ArrowRight, CheckCircle2 } from "lucide-react";

interface AppointmentCardProps {
  appointment: Appointment;
  onMarkComplete?: (id: string) => void;
  onViewDetails?: (id: string) => void;
}

export default function AppointmentCard({
  appointment,
  onMarkComplete,
  onViewDetails,
}: AppointmentCardProps) {
  const statusStyles: Record<string, string> = {
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    upcoming: "bg-teal-50 text-teal-700 border-teal-200",
    ongoing: "bg-amber-50 text-amber-700 border-amber-200",
    completed: "bg-slate-100 text-zinc-600 border-slate-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    rejected: "bg-rose-50 text-rose-700 border-rose-200",
  };

  const statusLabels: Record<string, string> = {
    approved: "Approved",
    upcoming: "Upcoming",
    ongoing: "Ongoing",
    completed: "Completed",
    pending: "Pending Approval",
    rejected: "Rejected",
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 hover:shadow-md hover:border-teal-200 transition-all shadow-xs">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-teal-50 border border-teal-200/60 flex items-center justify-center flex-shrink-0 text-teal-700">
            <User2 className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-zinc-900">{appointment.patientName}</h4>
            <p className="text-xs text-zinc-500">
              {typeof appointment.age === "number" ? `${appointment.age} yrs` : "Age N/A"} &bull; {appointment.gender}
            </p>
          </div>
        </div>
        <span
          className={`
            px-2.5 py-0.5 rounded-full text-[11px] font-semibold border
            ${statusStyles[appointment.status] || "bg-slate-100 text-zinc-600 border-slate-200"}
          `}
        >
          {statusLabels[appointment.status] || appointment.status}
        </span>
      </div>

      <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 mb-3 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
        <Clock className="h-3.5 w-3.5 text-teal-600" />
        <span>Time Slot: {appointment.appointmentTime}</span>
      </div>

      {appointment.reason && (
        <p className="text-xs text-zinc-600 mb-3 line-clamp-2 italic">
          &ldquo;{appointment.reason}&rdquo;
        </p>
      )}

      <div className="flex gap-2 pt-1">
        {onViewDetails && (
          <button
            onClick={() => onViewDetails(appointment.id)}
            className="flex-1 px-3 py-2 text-xs font-semibold text-zinc-700 bg-slate-50 border border-slate-200 rounded-xl hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition-all flex items-center justify-center gap-1.5"
          >
            <span>Patient Record</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        )}
        {appointment.status !== "completed" && onMarkComplete && (
          <button
            onClick={() => onMarkComplete(appointment.id)}
            className="px-3 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Done</span>
          </button>
        )}
      </div>
    </div>
  );
}

