"use client";

import { useState } from "react";
import { User, Mail, Lock, Building, RefreshCw, Sparkles, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { toast, Toaster } from "sonner";
import { registerSaaSUser } from "@/lib/auth";

export default function SaaSLogin() {
  const [nombre, setNombre] = useState("");
  const [laboratorio, setLaboratorio] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || !nombre || !laboratorio) {
      toast.error("Por favor completa todos los campos.");
      return;
    }
    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Creando tu espacio de trabajo...");
    
    try {
      const res = await registerSaaSUser(nombre, laboratorio, email, password);
      
      if (res.success) {
        toast.success("¡Laboratorio registrado con éxito!", { id: toastId });
        setTimeout(() => {
          window.location.href = '/admin'; // Redirige a su nuevo dashboard vacío
        }, 1500);
      } else {
        toast.error(res.error || "No se pudo registrar la cuenta.", { id: toastId });
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
      <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700 mt-8 mb-8">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-tr from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl flex items-center justify-center shadow-2xl mb-6">
            <Building className="text-blue-400" size={32} />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Crea tu Laboratorio</h1>
          <p className="text-slate-400 mt-2 text-center text-sm font-medium">Digitaliza y acelera todo tu flujo dental</p>
        </div>

        {/* Form Container */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Tu Nombre Completo</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User size={18} className="text-slate-500" />
                </div>
                <input 
                  type="text" 
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-white placeholder-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  placeholder="Ej. Douglas Valdez"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Nombre de tu Laboratorio</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Building size={18} className="text-slate-500" />
                </div>
                <input 
                  type="text" 
                  value={laboratorio}
                  onChange={(e) => setLaboratorio(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-white placeholder-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  placeholder="Ej. Legion Dental Lab"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Correo Electrónico</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail size={18} className="text-slate-500" />
                </div>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-white placeholder-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  placeholder="tu@correo.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Contraseña Segura</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock size={18} className="text-slate-500" />
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-white placeholder-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="mt-4 w-full bg-blue-600 text-white hover:bg-blue-500 font-black py-4 rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.2)] hover:shadow-[0_0_25px_rgba(37,99,235,0.4)] disabled:opacity-50"
            >
              {loading ? <RefreshCw size={20} className="animate-spin" /> : "Crear Laboratorio"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col gap-4 text-center">
             <Link href="/acceso" className="text-sm font-medium text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-1">
                <ChevronLeft size={16} /> Ya tengo una cuenta, iniciar sesión
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
