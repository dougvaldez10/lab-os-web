"use client";
import { LogOut } from "lucide-react";
import { logoutUser } from "@/lib/auth";

export default function LogoutButton() {
  return (
    <button 
      onClick={async () => { await logoutUser(); window.location.href = '/'; }} 
      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-red-500 hover:text-white transition-colors font-medium w-full"
    >
      <LogOut size={16} />
      Cerrar Sesión
    </button>
  );
}
