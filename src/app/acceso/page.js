"use client";

import { useState } from "react";
import { Lock, Mail, RefreshCw, ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { toast, Toaster } from "sonner";
import { loginSaaSUser } from "@/lib/auth";

export default function SaaSLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Por favor ingresa tu correo y contraseña.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Autenticando...");
    
    try {
      const res = await loginSaaSUser(email, password);
      
      if (res.success) {
        toast.success("¡Bienvenido!", { id: toastId });
        // Redirección basada en el rol
        setTimeout(() => {
          if (res.is_superadmin) {
            window.location.href = '/saas';
          } else {
            window.location.href = '/admin'; // Lab Owner dashboard
          }
        }, 1000);
      } else {
        toast.error(res.error || "Credenciales incorrectas.", { id: toastId });
        setLoading(false);
      }
    } catch (err) {
      toast.error("Error de servidor.", { id: toastId });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      <Toaster position="top-center" />
      
      {/* Background Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-rose-500/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 bg-[#D4AF37]/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-tr from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl flex items-center justify-center shadow-2xl mb-6">
            <Sparkles className="text-[#D4AF37]" size={32} />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Lab OS <span className="text-rose-400">Master</span></h1>
          <p className="text-slate-400 mt-2 text-center text-sm font-medium">Panel de Acceso para Dueños y Administradores</p>
        </div>

        {/* Form Container */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Correo Electrónico</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail size={18} className="text-slate-500" />
                </div>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl pl-11 pr-4 py-3.5 text-white placeholder-slate-600 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none transition-all"
                  placeholder="admin@laboratorio.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock size={18} className="text-slate-500" />
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl pl-11 pr-4 py-3.5 text-white placeholder-slate-600 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none transition-all"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="mt-4 w-full bg-white text-slate-950 hover:bg-slate-200 font-black py-4 rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] disabled:opacity-50"
            >
              {loading ? <RefreshCw size={20} className="animate-spin text-slate-500" /> : "Acceder al Panel"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col gap-4 text-center">
             <Link href="/registro" className="text-sm font-semibold text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-1">
                ¿Aún no tienes cuenta? <span className="text-[#D4AF37]">Regístrate aquí</span> <ChevronRight size={14} className="text-[#D4AF37]" />
             </Link>
             <Link href="/" className="text-xs font-medium text-slate-600 hover:text-slate-400 transition-colors">
                Volver a la estación de trabajo local
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
