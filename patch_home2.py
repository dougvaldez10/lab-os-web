import re

with open("src/app/page.js", "r") as f:
    text = f.read()

def replace(old, new):
    global text
    if text.find(old) == -1:
        print("Not found:", repr(old[:50]))
    text = text.replace(old, new, 1)

replace('export default function Home() {', '''export default function Home() {
  const globalStyles = (
    <style dangerouslySetInnerHTML={{__html: `
      .glass-lines-bg {
        background-image: repeating-linear-gradient(
          to bottom,
          transparent,
          transparent 39px,
          rgba(0, 0, 0, 0.03) 40px
        );
        background-size: 100% 40px;
      }
      .mobile-scroll {
        scrollbar-width: none;
      }
      .mobile-scroll::-webkit-scrollbar {
        display: none;
      }
    `}} />
  );
''')

replace('''  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center">''', 
'''  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center relative overflow-hidden">
      {globalStyles}
      {/* CAPA 1: Fondo Líneas de Libreta */}
      <div className="absolute inset-0 glass-lines-bg z-0 pointer-events-none"></div>
      
      {/* CAPA 2: Vidrio Esmerilado Global */}
      <div className="absolute inset-0 bg-slate-50/15 backdrop-blur-[4px] z-10 pointer-events-none"></div>
      
      {/* CAPA 3: Contenedor Principal (z-20) */}
      <div className="w-full flex-1 flex flex-col items-center relative z-20 pointer-events-none">''')


with open("src/app/page.js", "w") as f:
    f.write(text)
print("Done patching wrapper.")
