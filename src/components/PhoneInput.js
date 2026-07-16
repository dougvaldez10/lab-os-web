"use client";

import { useState, useEffect } from "react";

/**
 * Componente universal de entrada de teléfono.
 * Formatea en tiempo real como (663) 436 6694 y permite seleccionar país.
 * Devuelve el valor normalizado compatible con la API de WhatsApp (+521...).
 */
export default function PhoneInput({ value, onChange, placeholder = "663 436 6694" }) {
  const [countryCode, setCountryCode] = useState("+52");
  const [localNumber, setLocalNumber] = useState("");

  // Sincronizar el valor desde el padre (base de datos a local)
  useEffect(() => {
    if (value) {
      if (value.startsWith("+521")) {
        setCountryCode("+52");
        setLocalNumber(formatLocal(value.slice(4)));
      } else if (value.startsWith("+52")) {
        setCountryCode("+52");
        setLocalNumber(formatLocal(value.slice(3)));
      } else if (value.startsWith("+1")) {
        setCountryCode("+1");
        setLocalNumber(formatLocal(value.slice(2)));
      } else {
        // Fallback sin prefijo de cruz
        const cleaned = value.replace(/\D/g, "");
        if (cleaned.startsWith("521")) {
          setCountryCode("+52");
          setLocalNumber(formatLocal(cleaned.slice(3)));
        } else if (cleaned.startsWith("52")) {
          setCountryCode("+52");
          setLocalNumber(formatLocal(cleaned.slice(2)));
        } else if (cleaned.startsWith("1")) {
          setCountryCode("+1");
          setLocalNumber(formatLocal(cleaned.slice(1)));
        } else {
          setLocalNumber(formatLocal(cleaned));
        }
      }
    } else {
      setLocalNumber("");
    }
  }, [value]);

  // Formatea un string de dígitos a: (XXX) XXX XXXX
  const formatLocal = (val) => {
    const digits = val.replace(/\D/g, "");
    if (digits.length === 0) return "";
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
  };

  const handleInputChange = (e) => {
    const inputVal = e.target.value;
    const digitsOnly = inputVal.replace(/\D/g, "");
    
    // Limitar a 10 dígitos para números locales
    const truncatedDigits = digitsOnly.slice(0, 10);
    const formatted = formatLocal(truncatedDigits);
    setLocalNumber(formatted);

    // Enviar el valor normalizado al padre
    if (truncatedDigits.length > 0) {
      if (countryCode === "+52") {
        onChange(`+521${truncatedDigits}`);
      } else {
        onChange(`${countryCode}${truncatedDigits}`);
      }
    } else {
      onChange("");
    }
  };

  const handleCountryChange = (e) => {
    const newCode = e.target.value;
    setCountryCode(newCode);
    
    const digitsOnly = localNumber.replace(/\D/g, "");
    if (digitsOnly.length > 0) {
      if (newCode === "+52") {
        onChange(`+521${digitsOnly}`);
      } else {
        onChange(`${newCode}${digitsOnly}`);
      }
    }
  };

  return (
    <div className="flex gap-2 w-full">
      <select
        value={countryCode}
        onChange={handleCountryChange}
        className="bg-white border border-slate-200 rounded-xl px-2 py-2.5 text-sm focus:ring-2 focus:ring-rose-400 outline-none font-semibold text-slate-700 w-24 shrink-0 transition-all shadow-sm"
      >
        <option value="+52">🇲🇽 +52</option>
        <option value="+1">🇺🇸 +1</option>
      </select>
      <input
        type="text"
        value={localNumber}
        onChange={handleInputChange}
        placeholder={placeholder}
        className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-rose-400 outline-none text-slate-800 transition-all shadow-sm placeholder:text-slate-400"
      />
    </div>
  );
}
