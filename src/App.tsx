/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Search, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  BookOpen, 
  Mic, 
  User, 
  ChevronRight,
  Menu,
  X,
  Scale,
  Zap,
  GraduationCap,
  Save,
  MapPin,
  Globe,
  ExternalLink,
  Copy,
  ShieldAlert,
  Download,
  XCircle,
  Check,
  ArrowLeft,
  Handshake,
  MessageSquare,
  Info,
  Trash2,
  Archive,
  UserCheck,
  FileSearch
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { generarRelatoIA, consultarLeyIA, simularCasoIA } from './lib/gemini';
import ReactMarkdown from 'react-markdown';

// --- Components ---

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Algo salió mal.";
      try {
        const errorInfo = JSON.parse(this.state.error?.message || "{}");
        if (errorInfo.error && errorInfo.error.includes("insufficient permissions")) {
          errorMessage = "Error de permisos en la base de datos. Por favor, contacte al administrador.";
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-cyber-bg cyber-grid p-6 text-center">
          <div className="glass p-10 rounded-3xl border-cyber-red/30 max-w-md">
            <AlertTriangle size={48} className="text-cyber-red mx-auto mb-6" />
            <h2 className="text-2xl font-display font-black text-white mb-4 uppercase italic">Error del Sistema</h2>
            <p className="text-slate-400 mb-8 font-medium">{errorMessage}</p>
            <Button onClick={() => window.location.reload()} variant="primary" className="w-full">Reiniciar Aplicación</Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- Helper Components ---

const cn = (...inputs: any[]) => {
  return inputs.filter(Boolean).join(' ');
};

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, icon: Icon }: any) => {
  const variants: any = {
    primary: 'bg-cyber-blue text-white hover:bg-blue-600 cyber-glow-blue border border-cyber-blue/50',
    secondary: 'bg-transparent text-cyber-blue border border-cyber-blue/50 hover:bg-cyber-blue/10',
    ghost: 'bg-transparent text-slate-500 hover:bg-white/5 hover:text-white',
    danger: 'bg-cyber-red text-white hover:bg-red-600 cyber-glow-red border border-cyber-red/50',
    success: 'bg-cyber-green text-black font-bold hover:bg-emerald-400 cyber-glow-green',
    gold: 'bg-cyber-cyan text-black font-bold hover:bg-cyan-400 cyber-glow-cyan'
  };

  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'px-6 py-3 rounded-xl font-display font-bold transition-all flex items-center justify-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 uppercase tracking-widest text-[10px]',
        variants[variant],
        className
      )}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
};

const Card = ({ children, title, icon: Icon, className = '', delay = 0 }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className={cn('glass rounded-3xl overflow-hidden glass-hover border-white/5', className)}
  >
    {title && (
      <div className="px-6 py-5 border-b border-cyber-border bg-white/5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 glass rounded-lg flex items-center justify-center">
            {Icon && <Icon size={16} className="text-cyber-blue" />}
          </div>
          <h3 className="font-display font-black text-xs uppercase tracking-[0.2em] text-white">{title}</h3>
        </div>
        <div className="flex gap-1.5">
          <div className="w-1 h-1 rounded-full bg-cyber-blue/40" />
          <div className="w-1 h-1 rounded-full bg-cyber-blue/20" />
        </div>
      </div>
    )}
    <div className="p-6">{children}</div>
  </motion.div>
);

const NavItem = ({ active, onClick, icon: Icon, label }: any) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group relative overflow-hidden",
      active 
        ? "glass bg-cyber-blue/10 text-white cyber-glow-blue border-cyber-blue/30" 
        : "text-slate-500 hover:text-white hover:bg-white/5"
    )}
  >
    {active && (
      <motion.div 
        layoutId="nav-active"
        className="absolute left-0 top-0 bottom-0 w-1 bg-cyber-blue"
      />
    )}
    <Icon size={20} className={cn("transition-colors", active ? "text-cyber-blue" : "group-hover:text-cyber-blue")} />
    <span className="font-display font-bold text-xs uppercase tracking-[0.15em]">{label}</span>
    {active && <ChevronRight size={14} className="ml-auto text-cyber-blue" />}
  </button>
);

const QuickAction = ({ title, desc, icon: Icon, color, onClick }: any) => (
  <button 
    onClick={onClick}
    className="glass p-8 rounded-3xl text-left hover:cyber-glow-blue transition-all duration-500 group relative overflow-hidden border-white/5"
  >
    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 text-white shadow-2xl group-hover:scale-110 transition-all duration-500", color)}>
      <Icon size={28} />
    </div>
    <h3 className="font-display font-black text-xl text-white mb-2 uppercase tracking-tight italic group-hover:text-cyber-blue transition-colors">{title}</h3>
    <p className="text-xs text-slate-500 font-medium leading-relaxed uppercase tracking-wider">{desc}</p>
    
    <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
      <Zap size={16} className="text-cyber-blue animate-pulse" />
    </div>
  </button>
);

const AlertItem = ({ type, text }: any) => {
  const isWarning = type === 'warning' || type === 'danger';
  const Icon = isWarning ? AlertTriangle : Shield;
  
  return (
    <div className={cn(
      "p-4 rounded-2xl border flex gap-4 items-start transition-all",
      isWarning 
        ? "bg-cyber-red/5 border-cyber-red/20 text-cyber-red" 
        : "bg-cyber-blue/5 border-cyber-blue/20 text-cyber-blue"
    )}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <p className="text-xs font-medium leading-relaxed">{text}</p>
    </div>
  );
};

const CheckItem = ({ label }: any) => {
  const [checked, setChecked] = useState(false);
  return (
    <div 
      className={cn(
        "flex items-center gap-4 p-5 rounded-2xl glass transition-all duration-300 cursor-pointer border-white/5",
        checked ? "bg-cyber-green/10 border-cyber-green/30" : "hover:border-cyber-blue/30"
      )}
      onClick={() => setChecked(!checked)}
    >
      <div className={cn(
        "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-500",
        checked ? "bg-cyber-green border-cyber-green text-black" : "border-slate-700 rotate-45"
      )}>
        {checked && <Check size={16} strokeWidth={3} />}
      </div>
      <span className={cn("text-xs font-bold uppercase tracking-widest transition-colors", checked ? "text-cyber-green" : "text-slate-400")}>{label}</span>
    </div>
  );
};

const ScenarioCard = ({ title, difficulty, desc, onClick }: any) => {
  const diffColors: any = {
    'Básico': 'bg-cyber-green/10 text-cyber-green border-cyber-green/20',
    'Intermedio': 'bg-cyber-blue/10 text-cyber-blue border-cyber-blue/20',
    'Avanzado': 'bg-cyber-red/10 text-cyber-red border-cyber-red/20'
  };

  return (
    <div 
      onClick={onClick}
      className="glass p-8 rounded-3xl border-white/5 hover:cyber-glow-blue transition-all duration-500 cursor-pointer group flex flex-col h-full"
    >
      <div className="flex justify-between items-start mb-6">
        <h4 className="text-xl font-display font-black text-white group-hover:text-cyber-blue transition-colors uppercase tracking-tight italic">{title}</h4>
        <span className={cn("text-[10px] font-mono font-black px-3 py-1 rounded-full border uppercase tracking-widest", diffColors[difficulty])}>
          {difficulty}
        </span>
      </div>
      <p className="text-sm font-medium text-slate-500 group-hover:text-slate-300 transition-colors mb-8 leading-relaxed flex-1">{desc}</p>
      <Button variant="primary" onClick={onClick} className="w-full text-[10px] py-4 font-black uppercase tracking-[0.2em]" icon={Zap}>Iniciar Protocolo</Button>
    </div>
  );
};

// --- Main App ---

export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  const [workMode, setWorkMode] = useState(false);
  const [portalKey, setPortalKey] = useState(0);
  const [placa, setPlaca] = useState<string>(localStorage.getItem('user_placa') || '');
  const [showPlacaModal, setShowPlacaModal] = useState(false);
  const [zonaAtencion, setZonaAtencion] = useState<string>(localStorage.getItem('user_zona') || '');
  const [showZonaModal, setShowZonaModal] = useState(false);

  const [showDescargosInfo, setShowDescargosInfo] = useState(false);
  const [relatosCache, setRelatosCache] = useState<any[]>([]);

  // IA State
  const [articulo, setArticulo] = useState('');
  const [numeral, setNumeral] = useState('');
  const [paragrafo, setParagrafo] = useState('');
  const [contexto, setContexto] = useState('');
  const [ciudadano, setCiudadano] = useState({ nombre: '', tipoDoc: 'CC', numDoc: '' });
  const [relatoGenerado, setRelatoGenerado] = useState<string | null>(null);
  const [descargos, setDescargos] = useState('');
  const [mediacion, setMediacion] = useState(false);

  // Auto-activate mediation for specific behaviors
  useEffect(() => {
    const mediationArticles = ['27', '33', '35', '92', '93', '103', '111', '139', '140', '146'];
    const mediationNumerals = ['1', '2', '3', '4'];
    
    if (mediationArticles.includes(articulo)) {
      if (articulo === '27') {
        if (mediationNumerals.includes(numeral)) setMediacion(true);
      } else {
        // For other articles, maybe any numeral or specific ones? 
        // User said "verifica todos los articulos", usually these articles are mediation-friendly.
        setMediacion(true);
      }
    }
  }, [articulo, numeral]);
  const [consultaLey, setConsultaLey] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);
  const [consultando, setConsultando] = useState(false);
  const [location, setLocation] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleString('es-CO', { hour12: false }));
  const [misProcedimientos, setMisProcedimientos] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);

  // Simulation State
  const [selectedScenario, setSelectedScenario] = useState<any | null>(null);
  const [simResponse, setSimResponse] = useState<string | null>(null);
  const [userSimAction, setUserSimAction] = useState('');
  const [simHistory, setSimHistory] = useState<any[]>([]);
  const [simulando, setSimulando] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }));
    }, 1000);
    
    let watchId: number;
    if (navigator.geolocation) {
      // Use watchPosition for real-time high-accuracy tracking
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)} (Precisión: ${accuracy.toFixed(1)}m)`);
        },
        (err) => {
          console.warn("Geolocation error:", err);
          setLocation("Ubicación no disponible (permiso denegado)");
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    }

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        // Check if placa exists
        const savedPlaca = localStorage.getItem(`placa_${u.uid}`);
        if (savedPlaca) {
          setPlaca(savedPlaca);
          // Check for zona after placa is confirmed
          const savedZona = localStorage.getItem(`zona_${u.uid}`);
          if (savedZona) {
            setZonaAtencion(savedZona);
          } else {
            setShowZonaModal(true);
          }
        } else {
          setShowPlacaModal(true);
        }

        // Check if first time
        const hasSeenTutorial = localStorage.getItem(`tutorial_seen_${u.uid}`);
        if (!hasSeenTutorial) {
          setShowTutorial(true);
        }

        // Load user procedures
        const q = query(collection(db, 'reports'), where('userId', '==', u.uid), orderBy('fecha', 'desc'));
        onSnapshot(q, (snapshot) => {
          setMisProcedimientos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, 'reports');
        });
      }
    });
    return () => {
      unsubscribe();
      clearInterval(timer);
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleGenerarRelato = async () => {
    if (!articulo || !ciudadano.nombre) return;
    setGenerando(true);
    try {
      const res = await generarRelatoIA(articulo, numeral, paragrafo, contexto, ciudadano, location, currentTime, descargos, mediacion, zonaAtencion);
      const relato = res || 'No se pudo generar el relato.';
      setRelatoGenerado(relato);
      
      // Add to cache
      setRelatosCache(prev => [{
        id: Date.now(),
        articulo,
        numeral,
        ciudadano: ciudadano.nombre,
        relato,
        fecha: new Date().toISOString(),
        location,
        zonaAtencion
      }, ...prev]);
    } catch (error) {
      console.error(error);
    } finally {
      setGenerando(false);
    }
  };

  const handleLimpiarRelato = () => {
    setRelatoGenerado(null);
    setArticulo('');
    setNumeral('');
    setParagrafo('');
    setContexto('');
    setDescargos('');
    setMediacion(false);
    setCiudadano({ nombre: '', tipoDoc: 'CC', numDoc: '' });
  };

  const handleConsultarLey = async () => {
    if (!articulo) return;
    setConsultando(true);
    try {
      const res = await consultarLeyIA(articulo, numeral);
      setConsultaLey(res || 'No se encontró información.');
    } catch (error) {
      console.error(error);
    } finally {
      setConsultando(false);
    }
  };

  const tutorialSteps = [
    {
      title: "¡Bienvenido al Asistente Policial!",
      content: "Esta herramienta ha sido diseñada para fortalecer su servicio en calle, brindándole apoyo jurídico y técnico en tiempo real basado en la Ley 1801.",
      target: "dashboard",
      icon: Shield
    },
    {
      title: "Generador de Relatos",
      content: "Aquí podrá redactar informes técnicos impecables. La IA le ayudará a estructurar los hechos, citar la norma y blindar su procedimiento jurídicamente.",
      target: "relato",
      icon: FileText
    },
    {
      title: "Módulo de Comparendo",
      content: "Consulte cualquier artículo de la Ley 1801. Obtendrá la interpretación jurídica, táctica y el procedimiento paso a paso para no cometer errores.",
      target: "comparendo",
      icon: Search
    },
    {
      title: "Simulador de Casos",
      content: "Entrene en escenarios reales. El instructor IA evaluará sus decisiones y le dará retroalimentación pedagógica para mejorar su actuación policial.",
      target: "simulador",
      icon: GraduationCap
    },
    {
      title: "Defensa Disciplinaria",
      content: "Encuentre material de descarga, checklists de legalidad y tips para proteger su carrera frente al nuevo régimen disciplinario 2026.",
      target: "disciplinario",
      icon: Scale
    }
  ];

  const nextTutorialStep = () => {
    if (tutorialStep < tutorialSteps.length - 1) {
      const nextStep = tutorialStep + 1;
      setTutorialStep(nextStep);
      setActiveTab(tutorialSteps[nextStep].target);
    } else {
      finishTutorial();
    }
  };

  const finishTutorial = () => {
    setShowTutorial(false);
    if (user) {
      localStorage.setItem(`tutorial_seen_${user.uid}`, 'true');
    }
    setActiveTab('dashboard');
  };

  const handleSavePlaca = (val: string) => {
    if (!val || !user) return;
    setPlaca(val);
    localStorage.setItem(`placa_${user.uid}`, val);
    setShowPlacaModal(false);
    
    // After saving placa, check if we need to ask for zona
    const savedZona = localStorage.getItem(`zona_${user.uid}`);
    if (!savedZona) {
      setShowZonaModal(true);
    }
  };

  const handleSaveZona = (val: string) => {
    if (!val || !user) return;
    setZonaAtencion(val);
    localStorage.setItem(`zona_${user.uid}`, val);
    setShowZonaModal(false);
  };

  const handleSimulacion = async (action?: string) => {
    const finalAction = action || userSimAction;
    if (!finalAction || !selectedScenario) return;
    setSimulando(true);
    try {
      const res = await simularCasoIA(selectedScenario.desc, finalAction, simHistory);
      setSimResponse(res);
      setSimHistory([...simHistory, { role: 'user', content: finalAction }, { role: 'assistant', content: res }]);
    } catch (error) {
      console.error(error);
    } finally {
      setSimulando(false);
    }
  };

  const handleSaveReport = async () => {
    if (!relatoGenerado || !user) return;
    const path = 'reports';
    try {
      await addDoc(collection(db, path), {
        userId: user.uid,
        articulo,
        numeral,
        ciudadano: ciudadano.nombre,
        relato: relatoGenerado,
        descargos,
        mediacion,
        fecha: new Date().toISOString(),
        location
      });
      alert("Informe guardado con éxito en su historial.");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-cyber-bg cyber-grid">
      <div className="relative">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="w-24 h-24 rounded-full border-t-2 border-r-2 border-cyber-blue"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Shield size={32} className="text-cyber-blue animate-pulse" />
        </div>
      </div>
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mt-6 font-mono text-xs tracking-[0.3em] text-cyber-blue uppercase"
      >
        Iniciando Sistemas...
      </motion.p>
    </div>
  );

  if (!user) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-cyber-bg cyber-grid p-6 text-center relative overflow-hidden">
      <div className="scanline" />
      
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-12 relative z-10"
      >
        <div className="relative mx-auto mb-6 w-24 h-24">
          <div className="w-full h-full glass rounded-3xl flex items-center justify-center cyber-glow-blue rotate-3">
            <Shield size={48} className="text-cyber-blue" />
          </div>
          <div className="absolute -bottom-2 -right-2 p-2 glass rounded-xl bg-cyber-bg border border-cyber-blue/50">
            <UserCheck size={24} className="text-cyber-blue" />
          </div>
        </div>
        <h1 className="text-5xl font-display font-black text-white mb-4 tracking-tighter uppercase italic">
          OPERATIVE <span className="text-cyber-blue not-italic font-light">APP</span>
        </h1>
        <p className="text-slate-400 max-w-md mx-auto font-medium leading-relaxed">
          Next-generation operative assistant for the National Police of Colombia.
        </p>
      </motion.div>
      
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="relative z-10"
      >
        <Card className="max-w-sm w-full p-8 text-center border-cyber-blue/30">
          <h2 className="font-display text-xl font-bold mb-8 text-white uppercase tracking-widest">Acceso Institucional</h2>
          <Button onClick={handleLogin} className="w-full py-4 text-lg" icon={User}>
            Identificarse con Google
          </Button>
          <div className="mt-8 pt-6 border-t border-white/5">
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
              Protocolo de Seguridad Ley 1581
            </p>
          </div>
        </Card>
      </motion.div>

      {/* Background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyber-blue/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyber-cyan/5 blur-[120px] rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-cyber-bg text-slate-200 flex flex-col md:flex-row cyber-grid relative">
      <div className="scanline" />
      
      {/* Mobile Header */}
      <div className="md:hidden glass border-x-0 border-t-0 p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Shield size={24} className="text-cyber-blue" />
          <span className="font-display font-black tracking-tighter uppercase italic">Ley 1801 AI</span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 glass rounded-lg">
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Onboarding Tutorial Overlay */}
      <AnimatePresence>
        {showTutorial && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              className="glass rounded-[2.5rem] shadow-2xl max-w-xl w-full overflow-hidden border-cyber-blue/30"
            >
              <div className="bg-cyber-blue/10 p-10 text-center relative border-b border-cyber-border">
                <div className="w-24 h-24 glass rounded-3xl mx-auto mb-8 flex items-center justify-center cyber-glow-blue rotate-3">
                  {React.createElement(tutorialSteps[tutorialStep].icon, { size: 48, className: "text-cyber-blue" })}
                </div>
                <h3 className="text-3xl font-display font-black text-white uppercase tracking-tighter italic leading-none">
                  {tutorialSteps[tutorialStep].title}
                </h3>
                <div className="absolute top-6 right-8 font-mono font-black text-[10px] text-cyber-blue tracking-[0.3em]">
                  PHASE {tutorialStep + 1} // {tutorialSteps.length}
                </div>
              </div>
              
              <div className="p-10">
                <p className="text-slate-400 text-lg font-medium leading-relaxed text-center mb-10">
                  {tutorialSteps[tutorialStep].content}
                </p>
                
                <div className="flex gap-4">
                  <Button 
                    variant="ghost" 
                    onClick={finishTutorial}
                    className="flex-1 py-5"
                  >
                    Omitir
                  </Button>
                  <Button 
                    variant="primary" 
                    onClick={nextTutorialStep}
                    className="flex-[2] py-5"
                    icon={ChevronRight}
                  >
                    {tutorialStep === tutorialSteps.length - 1 ? 'Iniciar Protocolo' : 'Siguiente Fase'}
                  </Button>
                </div>
              </div>
              
              <div className="bg-white/5 p-6 flex justify-center gap-3">
                {tutorialSteps.map((_, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "h-1 rounded-full transition-all duration-500",
                      i === tutorialStep ? "w-12 bg-cyber-blue" : "w-3 bg-slate-800"
                    )}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-0 z-[60] md:relative md:z-auto glass md:bg-transparent border-y-0 border-l-0 w-72 transition-transform duration-500 transform md:translate-x-0 flex flex-col",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-8 hidden md:flex items-center gap-4 border-b border-cyber-border">
          <div className="relative">
            <div className="p-2.5 glass rounded-xl cyber-glow-blue rotate-3">
              <Shield size={28} className="text-cyber-blue" />
            </div>
            <div className="absolute -bottom-1 -right-1 p-1 glass rounded-lg bg-cyber-bg border border-cyber-blue/50">
              <UserCheck size={12} className="text-cyber-blue" />
            </div>
          </div>
          <div>
            <h1 className="font-display font-black text-xl leading-none tracking-tighter uppercase italic text-white">
              APP <span className="text-cyber-blue not-italic font-light">OPERATIVO</span><br/>
              <span className="text-slate-500 not-italic font-bold text-[10px] tracking-[0.2em]">POLICÍA NACIONAL</span>
            </h1>
          </div>
        </div>

        <nav className="p-6 space-y-3 flex-1">
          <NavItem active={activeTab === 'dashboard'} onClick={() => {setActiveTab('dashboard'); setSidebarOpen(false);}} icon={Zap} label="Dashboard" />
          <NavItem active={activeTab === 'relato'} onClick={() => {setActiveTab('relato'); setSidebarOpen(false);}} icon={FileText} label="Generador de Relatos" />
          <NavItem active={activeTab === 'comparendo'} onClick={() => {setActiveTab('comparendo'); setSidebarOpen(false);}} icon={Globe} label="Portal RNMC" />
          <NavItem active={activeTab === 'disciplinario'} onClick={() => {setActiveTab('disciplinario'); setSidebarOpen(false);}} icon={Scale} label="Blindaje Operativo" />
          <NavItem active={activeTab === 'archivo'} onClick={() => {setActiveTab('archivo'); setSidebarOpen(false);}} icon={Archive} label="Archivo de Comparendos" />
          <NavItem active={activeTab === 'simulador'} onClick={() => {setActiveTab('simulador'); setSidebarOpen(false);}} icon={GraduationCap} label="Simulador Táctico" />
          
          <div className="pt-6 mt-6 border-t border-cyber-border">
            <button 
              onClick={() => { setShowTutorial(true); setTutorialStep(0); setActiveTab('dashboard'); setSidebarOpen(false); }}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-cyber-blue hover:bg-cyber-blue/10 transition-all group"
            >
              <Zap size={20} className="animate-pulse" />
              <span className="font-display font-bold text-xs uppercase tracking-widest">Reiniciar Guía</span>
            </button>
          </div>
        </nav>

        <div className="p-6 border-t border-cyber-border bg-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl glass flex items-center justify-center text-cyber-blue font-display font-black text-lg cyber-glow-blue">
              {user.displayName?.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-display font-bold truncate text-white">{user.displayName}</p>
              <button onClick={() => auth.signOut()} className="text-[10px] font-mono font-bold text-cyber-blue uppercase tracking-widest hover:text-white transition-colors">Desconectar</button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 md:p-10 relative z-10">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dash" 
              initial={{ opacity: 0, x: -20 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: 20 }}
              className="max-w-7xl mx-auto w-full"
            >
              <header className="mb-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                <div>
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 mb-4"
                  >
                    <span className="px-3 py-1 glass rounded-full text-[10px] font-mono font-bold text-cyber-blue uppercase tracking-widest">
                      Sistema Activo
                    </span>
                    <span className="w-2 h-2 rounded-full bg-cyber-green animate-pulse" />
                  </motion.div>
                  <h2 className="text-4xl md:text-5xl font-display font-black text-white tracking-tighter uppercase italic leading-none">
                    Consola de <span className="text-cyber-blue not-italic font-light">Operaciones Policiales</span>
                  </h2>
                  <p className="text-slate-400 font-mono text-xs mt-4 tracking-widest uppercase">
                    ID Agente: {placa || user.uid.slice(0, 8)} | Sector: Colombia
                  </p>
                </div>
                
                <div 
                  className="glass p-6 rounded-2xl flex flex-col sm:flex-row items-center gap-8 min-w-full sm:min-w-[320px] cursor-pointer hover:border-cyber-blue/50 transition-all group"
                  onClick={() => setShowZonaModal(true)}
                >
                  <div className="flex-1 w-full sm:w-auto text-center sm:text-left">
                    <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-2">Cronómetro Local</p>
                    <p className="text-xl font-mono font-medium text-white tracking-tight">{currentTime.split(',')[1]}</p>
                    <p className="text-[10px] font-mono text-cyber-blue mt-1">{currentTime.split(',')[0]}</p>
                  </div>
                  <div className="hidden sm:block w-px h-12 bg-cyber-border" />
                  <div className="flex-1 w-full sm:w-auto text-center sm:text-left">
                    <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-2">Dirección / Zona</p>
                    <p className="text-xs font-mono text-white leading-tight truncate max-w-full sm:max-w-[120px] group-hover:text-cyber-blue transition-colors">
                      {zonaAtencion || location.split('(')[0] || "Definir Zona"}
                    </p>
                    <div className="flex items-center justify-center sm:justify-start gap-1 mt-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyber-green animate-ping" />
                      <span className="text-[9px] font-mono text-cyber-green uppercase">Zona de Atención</span>
                    </div>
                  </div>
                </div>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <QuickAction 
                  title="Generar Relato" 
                  desc="Reporte Legal con IA" 
                  icon={FileText} 
                  color="bg-cyber-blue"
                  onClick={() => setActiveTab('relato')}
                />
                <QuickAction 
                  title="Consultar Ley" 
                  desc="Base de Datos Legal" 
                  icon={Search} 
                  color="bg-cyber-cyan"
                  onClick={() => setActiveTab('comparendo')}
                />
                <QuickAction 
                  title="Entrenamiento" 
                  desc="Simulador Táctico" 
                  icon={GraduationCap} 
                  color="bg-cyber-green"
                  onClick={() => setActiveTab('simulador')}
                />
                <QuickAction 
                  title="Defensa" 
                  desc="Protección Jurídica" 
                  icon={Scale} 
                  color="bg-cyber-red"
                  onClick={() => setActiveTab('disciplinario')}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <Card title="Directivas de Procedimiento" icon={AlertTriangle}>
                    <div className="space-y-4">
                      <AlertItem 
                        type="warning" 
                        text="PROTOCOLO 2026: El Artículo 35.2 requiere validación biométrica o registro fílmico ininterrumpido durante el abordaje inicial." 
                      />
                      <AlertItem 
                        type="info" 
                        text="SISTEMA: Base de datos de jurisprudencia actualizada. Sentencia C-253/19 integrada en el motor de análisis." 
                      />
                      <AlertItem 
                        type="danger" 
                        text="ALERTA: Se detectó un incremento del 15% en nulidades por errores en la lectura de derechos en el Sector 4." 
                      />
                    </div>
                  </Card>

                  <Card title="Facultades de Registro (Ley 1801)" icon={ShieldAlert} className="mt-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 glass rounded-2xl border-white/5 hover:border-cyber-blue/30 transition-colors group">
                        <p className="text-xs font-mono font-black text-cyber-blue uppercase mb-1 group-hover:cyber-glow-blue">Art. 158</p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold leading-tight">Registro de Personas</p>
                      </div>
                      <div className="p-4 glass rounded-2xl border-white/5 hover:border-cyber-blue/30 transition-colors group">
                        <p className="text-xs font-mono font-black text-cyber-blue uppercase mb-1 group-hover:cyber-glow-blue">Art. 159</p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold leading-tight">Registro de Vehículos</p>
                      </div>
                      <div className="p-4 glass rounded-2xl border-white/5 hover:border-cyber-blue/30 transition-colors group">
                        <p className="text-xs font-mono font-black text-cyber-blue uppercase mb-1 group-hover:cyber-glow-blue">Art. 160</p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold leading-tight">Registro Establecimientos</p>
                      </div>
                      <div className="p-4 glass rounded-2xl border-white/5 hover:border-cyber-blue/30 transition-colors group">
                        <p className="text-xs font-mono font-black text-cyber-blue uppercase mb-1 group-hover:cyber-glow-blue">Art. 161</p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold leading-tight">Registro Bienes Muebles</p>
                      </div>
                    </div>
                  </Card>
                </div>

                <div className="lg:col-span-1">
                  <Card title="Registros Recientes" icon={CheckCircle}>
                    <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                      {relatosCache.length > 0 ? relatosCache.map((p, i) => (
                        <motion.div 
                          key={p.id} 
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          onClick={() => setSelectedReport(p)}
                          className="p-4 glass rounded-xl glass-hover flex justify-between items-center cursor-pointer group border-white/5"
                        >
                          <div className="overflow-hidden">
                            <p className="text-sm font-display font-bold text-white group-hover:text-cyber-blue transition-colors truncate">Art. {p.articulo} - {p.ciudadano}</p>
                            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-1">{new Date(p.fecha).toLocaleTimeString()}</p>
                          </div>
                          <ChevronRight size={16} className="text-slate-600 group-hover:text-cyber-blue transition-all group-hover:translate-x-1" />
                        </motion.div>
                      )) : (
                        <div className="text-center py-12 text-slate-500">
                          <div className="w-12 h-12 glass rounded-full mx-auto mb-4 flex items-center justify-center opacity-20">
                            <FileText size={24} />
                          </div>
                          <p className="text-xs font-mono uppercase tracking-widest">Sin registros</p>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            </motion.div>
          )}
          {activeTab === 'relato' && (
            <motion.div 
              key="relato" 
              initial={{ opacity: 0, scale: 0.98 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.98 }}
              className="max-w-7xl mx-auto w-full"
            >
              <header className="mb-10 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6 w-full sm:w-auto">
                  <div className="w-14 h-14 glass rounded-2xl flex items-center justify-center cyber-glow-blue rotate-3 shrink-0">
                    <FileText className="text-cyber-blue" size={32} />
                  </div>
                  <div>
                    <h2 className="text-3xl md:text-4xl font-display font-black text-white tracking-tighter uppercase italic leading-none">
                      Generador de <span className="text-cyber-blue not-italic font-light">Relatos</span>
                    </h2>
                    <p className="text-slate-500 font-mono text-xs mt-2 tracking-widest uppercase">Protocolo de Redacción Técnica v4.2</p>
                  </div>
                </div>
                <a 
                  href="https://rnmc2web.policia.gov.co:4443/Login" 
                  target="_blank" 
                  rel="noreferrer"
                  className="px-6 py-4 glass rounded-xl flex items-center justify-center gap-3 text-cyber-blue hover:bg-cyber-blue hover:text-white transition-all border border-cyber-blue/30 group"
                >
                  <Globe size={18} className="group-hover:rotate-12 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Portal RNMC Oficial</span>
                </a>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 space-y-6">
                  <Card title="Sujeto de Intervención" icon={User}>
                    <div className="space-y-5">
                      <div>
                        <label className="block text-[10px] font-mono font-bold text-cyber-blue uppercase mb-2 tracking-widest flex items-center justify-between">
                          Nombre Completo
                          <button onClick={() => copyToClipboard(ciudadano.nombre)} className="text-slate-500 hover:text-cyber-blue transition-colors">
                            <Copy size={12} />
                          </button>
                        </label>
                        <input 
                          type="text" 
                          placeholder="IDENTIFICAR CIUDADANO" 
                          className="w-full p-3 glass rounded-xl text-sm font-medium outline-none focus:border-cyber-blue transition-all text-white placeholder:text-slate-600"
                          value={ciudadano.nombre}
                          onChange={(e) => setCiudadano({...ciudadano, nombre: e.target.value})}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-1">
                          <label className="block text-[10px] font-mono font-bold text-cyber-blue uppercase mb-2 tracking-widest">Tipo</label>
                          <select 
                            className="w-full p-3 glass rounded-xl text-sm font-medium outline-none focus:border-cyber-blue transition-all text-white appearance-none cursor-pointer"
                            value={ciudadano.tipoDoc}
                            onChange={(e) => setCiudadano({...ciudadano, tipoDoc: e.target.value})}
                          >
                            <option value="CC">CC</option>
                            <option value="CE">CE</option>
                            <option value="PPT">PPT</option>
                            <option value="Pasaporte">PAS</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[10px] font-mono font-bold text-cyber-blue uppercase mb-2 tracking-widest flex items-center justify-between">
                            Identificación
                            <button onClick={() => copyToClipboard(ciudadano.numDoc)} className="text-slate-500 hover:text-cyber-blue transition-colors">
                              <Copy size={12} />
                            </button>
                          </label>
                          <input 
                            type="text" 
                            placeholder="NÚMERO" 
                            className="w-full p-3 glass rounded-xl text-sm font-medium outline-none focus:border-cyber-blue transition-all text-white placeholder:text-slate-600"
                            value={ciudadano.numDoc}
                            onChange={(e) => setCiudadano({...ciudadano, numDoc: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card title="Parámetros de Ley" icon={Scale}>
                    <div className="space-y-5">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] font-mono font-bold text-cyber-blue uppercase mb-2 tracking-widest">Artículo</label>
                          <input 
                            type="text" 
                            placeholder="ART" 
                            className="w-full p-3 glass rounded-xl text-sm font-mono outline-none focus:border-cyber-blue transition-all text-white placeholder:text-slate-600"
                            value={articulo}
                            onChange={(e) => setArticulo(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono font-bold text-cyber-blue uppercase mb-2 tracking-widest">Numeral</label>
                          <input 
                            type="text" 
                            placeholder="NUM" 
                            className="w-full p-3 glass rounded-xl text-sm font-mono outline-none focus:border-cyber-blue transition-all text-white placeholder:text-slate-600"
                            value={numeral}
                            onChange={(e) => setNumeral(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono font-bold text-cyber-blue uppercase mb-2 tracking-widest">Parágrafo</label>
                          <input 
                            type="text" 
                            placeholder="PAR" 
                            className="w-full p-3 glass rounded-xl text-sm font-mono outline-none focus:border-cyber-blue transition-all text-white placeholder:text-slate-600"
                            value={paragrafo}
                            onChange={(e) => setParagrafo(e.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono font-bold text-cyber-blue uppercase mb-2 tracking-widest">Contexto de los Hechos</label>
                        <textarea 
                          placeholder="DESCRIBA LA CONDUCTA OBSERVADA..." 
                          className="w-full p-4 glass rounded-xl h-32 text-sm font-medium outline-none focus:border-cyber-blue transition-all text-white placeholder:text-slate-600 resize-none"
                          value={contexto}
                          onChange={(e) => setContexto(e.target.value)}
                        />
                      </div>

                      <div className="space-y-4 pt-2">
                        <div className={cn(
                          "flex items-center justify-between p-4 glass rounded-xl border-white/5 transition-all duration-500",
                          mediacion ? "border-cyber-green/30 shadow-[0_0_15px_rgba(0,255,157,0.1)]" : ""
                        )}>
                          <div className="flex items-center gap-3">
                            <Handshake size={18} className={mediacion ? "text-cyber-green animate-pulse" : "text-slate-500"} />
                            <div>
                              <p className="text-xs font-bold text-white uppercase tracking-wider">Mediación Policial</p>
                              <p className="text-[10px] text-slate-500 uppercase">¿Se aplicó mediación?</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => setMediacion(!mediacion)}
                            className={cn(
                              "w-12 h-6 rounded-full transition-all relative",
                              mediacion ? "bg-cyber-green" : "bg-slate-700"
                            )}
                          >
                            <div className={cn(
                              "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                              mediacion ? "right-1" : "left-1"
                            )} />
                          </button>
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono font-bold text-cyber-blue uppercase mb-2 tracking-widest flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <MessageSquare size={12} />
                              Descargos / Manifestación (Art. 222)
                            </span>
                            <button 
                              onClick={() => setShowDescargosInfo(!showDescargosInfo)}
                              className="text-slate-500 hover:text-cyber-blue transition-colors"
                            >
                              <Info size={14} />
                            </button>
                          </label>
                          
                          <AnimatePresence>
                            {showDescargosInfo && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="p-3 mb-2 glass border-cyber-blue/20 rounded-lg text-[10px] text-slate-400 leading-relaxed">
                                  En garantía al debido proceso (Art. 222), se debe escuchar al presunto infractor. 
                                  El sistema redactará esto automáticamente como una manifestación oficial.
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <textarea 
                            placeholder="LO QUE EL CIUDADANO MANIFIESTA..." 
                            className="w-full p-4 glass rounded-xl h-24 text-sm font-medium outline-none focus:border-cyber-blue transition-all text-white placeholder:text-slate-600 resize-none"
                            value={descargos}
                            onChange={(e) => setDescargos(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button 
                          onClick={handleGenerarRelato} 
                          className="flex-1 py-4 text-sm uppercase tracking-[0.2em] font-black" 
                          variant="primary"
                          disabled={generando || !articulo || !ciudadano.nombre || !contexto}
                          icon={generando ? undefined : Zap}
                        >
                          {generando ? 'PROCESSING AI CORE...' : 'EXECUTE DRAFTING'}
                        </Button>
                        <Button 
                          onClick={handleLimpiarRelato} 
                          className="py-4 px-4" 
                          variant="secondary"
                          icon={Trash2}
                        />
                      </div>
                    </div>
                  </Card>
                </div>

                <div className="lg:col-span-8">
                  {relatoGenerado ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 glass p-4 rounded-2xl border-cyber-blue/20">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-cyber-green/20 flex items-center justify-center">
                            <CheckCircle size={16} className="text-cyber-green" />
                          </div>
                          <span className="text-xs font-mono font-bold text-white uppercase tracking-widest">Report Generated Successfully</span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="success" icon={Save} onClick={handleSaveReport} className="text-[10px] py-2 px-4 uppercase tracking-widest">Archive</Button>
                          <Button variant="secondary" icon={Copy} onClick={() => copyToClipboard(relatoGenerado)} className="text-[10px] py-2 px-4 uppercase tracking-widest">Copy</Button>
                          <Button variant="gold" icon={ExternalLink} onClick={() => {
                            if (navigator.share) {
                              navigator.share({
                                title: 'Police Report',
                                text: relatoGenerado
                              });
                            } else {
                              copyToClipboard(relatoGenerado);
                              alert('Copied to clipboard');
                            }
                          }} className="text-[10px] py-2 px-4 uppercase tracking-widest">Share</Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-6">
                        {relatoGenerado.split(/(?=^# |^## |^\d\.)/m).map((section, idx) => {
                          if (!section.trim()) return null;
                          
                          const sectionConfigs = [
                            { title: 'Legal Basis', icon: BookOpen, color: 'text-cyber-blue' },
                            { title: 'Technical Narrative', icon: FileText, color: 'text-cyber-cyan' },
                            { title: 'Tactical Protocol', icon: Shield, color: 'text-cyber-green' },
                            { title: 'Disciplinary Analysis', icon: Scale, color: 'text-cyber-red' }
                          ];

                          const config = sectionConfigs[idx % sectionConfigs.length];

                          return (
                            <Card 
                              key={idx}
                              title={config.title} 
                              icon={config.icon}
                              delay={idx * 0.1}
                            >
                              <div className="prose prose-invert prose-sm max-w-none font-medium leading-relaxed text-slate-300">
                                <ReactMarkdown>{section}</ReactMarkdown>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    </motion.div>
                  ) : (
                    <div className="h-full min-h-[600px] glass rounded-3xl border-dashed border-cyber-border flex flex-col items-center justify-center p-12 text-center group">
                      <div className="w-24 h-24 glass rounded-full flex items-center justify-center mb-8 group-hover:cyber-glow-blue transition-all duration-500">
                        <FileText size={40} className="text-slate-600 group-hover:text-cyber-blue transition-colors" />
                      </div>
                      <h3 className="text-2xl font-display font-bold text-white mb-4 uppercase tracking-widest">Consola en Espera</h3>
                      <p className="text-slate-500 max-w-sm font-medium leading-relaxed">
                        Ingrese los parámetros operativos en el panel lateral para iniciar el motor de redacción institucional.
                      </p>
                      <div className="mt-12 grid grid-cols-3 gap-8 opacity-20">
                        <div className="w-12 h-1 bg-cyber-blue rounded-full" />
                        <div className="w-12 h-1 bg-cyber-blue rounded-full" />
                        <div className="w-12 h-1 bg-cyber-blue rounded-full" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'comparendo' && (
            <motion.div 
              key="comparendo" 
              initial={{ opacity: 0, scale: 0.98 }} 
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-7xl mx-auto w-full"
            >
              <header className="mb-10 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6 w-full sm:w-auto">
                  <div className="w-14 h-14 glass rounded-2xl flex items-center justify-center cyber-glow-blue rotate-3 shrink-0">
                    <Globe className="text-cyber-blue" size={32} />
                  </div>
                  <div>
                    <h2 className="text-3xl md:text-4xl font-display font-black text-white tracking-tighter uppercase italic leading-none">
                      Portal <span className="text-cyber-blue not-italic font-light">RNMC</span>
                    </h2>
                    <p className="text-slate-500 font-mono text-xs mt-2 tracking-widest uppercase">Registro Nacional de Medidas Correctivas</p>
                  </div>
                </div>
                <Button 
                  variant={workMode ? 'danger' : 'primary'}
                  onClick={() => setWorkMode(!workMode)}
                  className="px-8 py-4 text-xs uppercase tracking-[0.2em] font-black"
                  icon={Zap}
                >
                  {workMode ? 'Cerrar Consola' : 'Modo Operativo'}
                </Button>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 space-y-6">
                  <Card title="Recursos Internos" icon={Globe}>
                    <div className="space-y-4">
                      <a 
                        href="https://rnmc2web.policia.gov.co:4443/Login" 
                        target="_blank" 
                        rel="noreferrer"
                        className="w-full py-4 glass rounded-xl flex items-center justify-center gap-3 text-cyber-blue hover:bg-cyber-blue hover:text-white transition-all border border-cyber-blue/30 group"
                      >
                        <Globe size={18} className="group-hover:rotate-12 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Portal RNMC Oficial</span>
                      </a>

                      <a 
                        href="https://srvcnpc.policia.gov.co/PSC/frm_cnp_consulta.aspx" 
                        target="_blank" 
                        rel="noreferrer"
                        className="w-full py-4 glass rounded-xl flex items-center justify-center gap-3 text-cyber-green hover:bg-cyber-green hover:text-black transition-all border border-cyber-green/30 group"
                      >
                        <UserCheck size={18} className="group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Verificación Ciudadana</span>
                      </a>

                      <a 
                        href="https://oscarbasico.wixsite.com/polijudicial/formatos-fpj-blanco" 
                        target="_blank" 
                        rel="noreferrer"
                        className="w-full py-4 glass rounded-xl flex items-center justify-center gap-3 text-cyber-cyan hover:bg-cyber-cyan hover:text-black transition-all border border-cyber-cyan/30 group"
                      >
                        <FileSearch size={18} className="group-hover:-translate-y-1 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Formatos FPJ Blanco</span>
                      </a>
                    </div>
                  </Card>

                  <Card title="Consulta de Norma" icon={Scale}>
                    <div className="space-y-5">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-mono font-bold text-cyber-blue uppercase mb-2 tracking-widest">Artículo</label>
                          <input 
                            type="text" 
                            placeholder="ART" 
                            className="w-full p-3 glass rounded-xl text-sm font-mono outline-none focus:border-cyber-blue transition-all text-white placeholder:text-slate-600"
                            value={articulo}
                            onChange={(e) => setArticulo(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono font-bold text-cyber-blue uppercase mb-2 tracking-widest">Numeral</label>
                          <input 
                            type="text" 
                            placeholder="NUM" 
                            className="w-full p-3 glass rounded-xl text-sm font-mono outline-none focus:border-cyber-blue transition-all text-white placeholder:text-slate-600"
                            value={numeral}
                            onChange={(e) => setNumeral(e.target.value)}
                          />
                        </div>
                      </div>
                      <Button 
                        onClick={handleConsultarLey} 
                        className="w-full py-4 text-sm uppercase tracking-[0.2em] font-black" 
                        variant="primary"
                        disabled={consultando || !articulo}
                        icon={consultando ? undefined : Search}
                      >
                        {consultando ? 'CONSULTANDO...' : 'BUSCAR NORMA'}
                      </Button>
                    </div>
                  </Card>
                </div>

                <div className="lg:col-span-8">
                  {consultaLey ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      <Card title="Análisis Jurídico" icon={Scale}>
                        <div className="prose prose-invert prose-sm max-w-none font-medium leading-relaxed text-slate-300">
                          <ReactMarkdown>{consultaLey}</ReactMarkdown>
                        </div>
                      </Card>
                    </motion.div>
                  ) : (
                    <div className="h-full min-h-[400px] glass rounded-3xl border-dashed border-cyber-border flex flex-col items-center justify-center p-12 text-center group">
                      <div className="w-20 h-20 glass rounded-full flex items-center justify-center mb-6 group-hover:cyber-glow-blue transition-all duration-500">
                        <Search size={32} className="text-slate-600 group-hover:text-cyber-blue transition-colors" />
                      </div>
                      <h3 className="text-xl font-display font-bold text-white mb-2 uppercase tracking-widest">Base de Datos Lista</h3>
                      <p className="text-slate-500 max-w-xs font-medium leading-relaxed text-sm">
                        Consulte artículos específicos para interpretación legal y táctica inmediata.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'disciplinario' && (
            <motion.div 
              key="disc" 
              initial={{ opacity: 0, scale: 0.98 }} 
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-7xl mx-auto w-full"
            >
              <header className="mb-10 flex flex-col md:flex-row items-center gap-6">
                <div className="w-14 h-14 glass rounded-2xl flex items-center justify-center cyber-glow-blue rotate-3 shrink-0">
                  <ShieldAlert className="text-cyber-blue" size={32} />
                </div>
                <div>
                  <h2 className="text-3xl md:text-4xl font-display font-black text-white tracking-tighter uppercase italic leading-none">
                    Blindaje <span className="text-cyber-blue not-italic font-light">Operativo</span>
                  </h2>
                  <p className="text-slate-500 font-mono text-xs mt-2 tracking-widest uppercase">Centro de Protección Institucional y Blindaje Operativo</p>
                </div>
              </header>
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 space-y-6">
                  <Card title="Estado de Blindaje" icon={Shield}>
                    <div className="space-y-6">
                      <div className="p-8 glass rounded-3xl border-cyber-green/20 bg-cyber-green/5 text-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-cyber-green/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <p className="text-[10px] font-mono font-bold text-cyber-green uppercase tracking-[0.3em] mb-4">Índice de Legalidad</p>
                        <div className="relative inline-block mb-4">
                          <svg className="w-32 h-32 transform -rotate-90">
                            <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-800" />
                            <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={364.4} strokeDashoffset={364.4 * (1 - 0.98)} className="text-cyber-green" />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-3xl font-display font-black text-white">98%</span>
                          </div>
                        </div>
                        <p className="text-xl font-display font-black text-white italic uppercase tracking-tighter">Óptimo</p>
                        <p className="text-[10px] text-slate-500 mt-2 uppercase font-bold">Procedimientos Blindados</p>
                      </div>
                      <div className="space-y-3">
                        <AlertItem type="info" text="Su perfil cumple con los estándares de legalidad operativa 2026." />
                        <AlertItem type="warning" text="Recordatorio: El registro fílmico es obligatorio según Directiva 012." />
                      </div>
                    </div>
                  </Card>

                  <Card title="Recursos de Descarga" icon={FileSearch}>
                    <div className="space-y-3">
                      {[
                        { label: 'Minuta de Descargos Art. 222', type: 'Word' },
                        { label: 'Recurso de Apelación', type: 'PDF' },
                        { label: 'Acción de Tutela (Debido Proceso)', type: 'Word' },
                        { label: 'Modelo de Informe Investigativo', type: 'PDF' }
                      ].map((doc, i) => (
                        <div 
                          key={i} 
                          onClick={() => {
                            copyToClipboard(`Recurso: ${doc.label}`);
                            alert(`Simulando descarga de: ${doc.label}`);
                          }}
                          className="flex items-center justify-between p-4 glass rounded-xl glass-hover group cursor-pointer border-white/5"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-cyber-blue/20 transition-colors">
                              <FileText className="text-cyber-blue" size={16} />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-white uppercase truncate">{doc.label}</p>
                              <p className="text-[8px] font-mono text-slate-500 uppercase">{doc.type}</p>
                            </div>
                          </div>
                          <Download size={14} className="text-slate-600 group-hover:text-cyber-blue transition-transform group-hover:-translate-y-0.5" />
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>

                <div className="lg:col-span-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card title="Checklist de Legalidad" icon={CheckCircle}>
                      <div className="space-y-3">
                        <CheckItem label="Identificación plena del infractor" />
                        <CheckItem label="Motivación clara del procedimiento" />
                        <CheckItem label="Garantía del derecho a la defensa" />
                        <CheckItem label="Relato técnico sin juicios de valor" />
                        <CheckItem label="Uso de lenguaje institucional" />
                        <CheckItem label="Registro inmediato en sistema" />
                      </div>
                    </Card>

                    <Card title="Biblioteca Normativa" icon={BookOpen}>
                      <div className="space-y-3">
                        {[
                          { label: 'Ley 1801 de 2016 (Actualizada)', size: '2.8 MB' },
                          { label: 'Manual de Patrullaje 2026', size: '5.4 MB' },
                          { label: 'Régimen Disciplinario Ley 2196', size: '3.2 MB' },
                          { label: 'Sentencias Hito Corte Const.', size: '1.5 MB' }
                        ].map((doc, i) => (
                          <div 
                            key={i} 
                            onClick={() => {
                              copyToClipboard(`Consulta: ${doc.label}`);
                              alert(`Abriendo documento: ${doc.label}`);
                            }}
                            className="flex items-center justify-between p-4 glass rounded-xl glass-hover group cursor-pointer border-white/5"
                          >
                            <div className="flex items-center gap-3">
                              <BookOpen className="text-cyber-cyan" size={16} />
                              <p className="text-[10px] font-bold text-white uppercase truncate">{doc.label}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[8px] font-mono text-slate-600 uppercase">{doc.size}</span>
                              <Download size={14} className="text-slate-600 group-hover:text-cyber-cyan" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>

                  <Card title="Análisis de Riesgos Disciplinarios" icon={AlertTriangle} className="border-cyber-red/20">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <h4 className="text-[10px] font-mono font-black text-cyber-red uppercase mb-4 tracking-widest">Factores de Nulidad Comunes</h4>
                        <ul className="space-y-4">
                          {[
                            'Vicios en la descripción técnica de la conducta',
                            'Errores en la plena identificación del sujeto',
                            'Indebida fundamentación del artículo/numeral',
                            'Omitir la escucha en descargos (Art. 222)'
                          ].map((text, i) => (
                            <li key={i} className="flex gap-4 items-start group">
                              <div className="w-5 h-5 rounded-full bg-cyber-red/10 flex items-center justify-center shrink-0 mt-0.5">
                                <X size={12} className="text-cyber-red" />
                              </div>
                              <p className="text-xs font-medium text-slate-400 group-hover:text-white transition-colors">{text}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="p-6 glass rounded-2xl bg-white/5 border-white/5">
                        <h4 className="text-[10px] font-mono font-black text-cyber-green uppercase mb-4 tracking-widest">Tips de Protección</h4>
                        <ul className="space-y-4">
                          {[
                            'Use siempre la tercera persona en el relato',
                            'Describa hechos, no suposiciones',
                            'Registre la hora militar exacta del inicio',
                            'Mencione los medios de policía utilizados'
                          ].map((text, i) => (
                            <li key={i} className="flex gap-4 items-start group">
                              <div className="w-5 h-5 rounded-full bg-cyber-green/10 flex items-center justify-center shrink-0 mt-0.5">
                                <Check size={12} className="text-cyber-green" />
                              </div>
                              <p className="text-xs font-medium text-slate-400 group-hover:text-white transition-colors">{text}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'simulador' && (
            <motion.div 
              key="sim" 
              initial={{ opacity: 0, scale: 0.98 }} 
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-7xl mx-auto w-full relative"
            >
              {/* Maintenance Mode Overlay */}
              <div className="absolute inset-0 z-50 glass rounded-[2.5rem] flex flex-col items-center justify-center p-10 text-center border-cyber-blue/30 bg-black/60 backdrop-blur-md">
                <div className="w-24 h-24 glass rounded-3xl flex items-center justify-center cyber-glow-blue mb-8 rotate-3">
                  <Zap size={48} className="text-cyber-blue animate-pulse" />
                </div>
                <h3 className="text-4xl font-display font-black text-white uppercase tracking-tighter italic mb-4">Módulo en Mantenimiento</h3>
                <p className="text-slate-400 text-lg font-medium max-w-md mx-auto mb-8">
                  Estamos actualizando los escenarios tácticos con la nueva jurisprudencia 2026. El simulador volverá a estar en línea pronto.
                </p>
                <div className="flex items-center gap-3 px-6 py-3 glass rounded-full border-cyber-blue/20">
                  <div className="w-2 h-2 rounded-full bg-cyber-blue animate-ping" />
                  <span className="text-xs font-mono font-bold text-cyber-blue uppercase tracking-[0.3em]">Actualizando Protocolos...</span>
                </div>
              </div>

              <header className="mb-10 flex flex-col sm:flex-row items-center justify-between gap-6 opacity-20 grayscale">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 glass rounded-2xl flex items-center justify-center cyber-glow-blue rotate-3">
                    <GraduationCap className="text-cyber-blue" size={32} />
                  </div>
                  <div>
                    <h2 className="text-4xl font-display font-black text-white tracking-tighter uppercase italic leading-none">
                      Simulador <span className="text-cyber-blue not-italic font-light">Táctico</span>
                    </h2>
                    <p className="text-slate-500 font-mono text-xs mt-2 tracking-widest uppercase">Entrenamiento Didáctico v2.0</p>
                  </div>
                </div>
                {selectedScenario && (
                  <Button variant="secondary" onClick={() => { setSelectedScenario(null); setSimResponse(null); setSimHistory([]); setUserSimAction(''); }} icon={ArrowLeft} className="px-6 py-3 uppercase tracking-widest text-[10px]">
                    Volver a Escenarios
                  </Button>
                )}
              </header>

              {!selectedScenario ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    { 
                      title: "Consumo de Bebidas", 
                      difficulty: "Básico", 
                      desc: "Ciudadano consumiendo licor en parque infantil.",
                      options: [
                        "Realizar registro y aplicar Art. 33 Num. 2",
                        "Solicitar retiro del lugar sin medida correctiva",
                        "Aplicar comparendo por Art. 140 Num. 7"
                      ]
                    },
                    { 
                      title: "Riña en Vía Pública", 
                      difficulty: "Intermedio", 
                      desc: "Dos ciudadanos en confrontación física.",
                      options: [
                        "Uso de la fuerza inmediata y traslado",
                        "Mediación policial y Art. 27 Num. 1",
                        "Solo amonestación verbal"
                      ]
                    },
                    { 
                      title: "Porte de Armas", 
                      difficulty: "Avanzado", 
                      desc: "Hallazgo de elemento cortopunzante en transporte.",
                      options: [
                        "Incautación y Art. 27 Num. 6",
                        "Decomiso sin registro en sistema",
                        "Traslado por protección"
                      ]
                    },
                    { 
                      title: "Ruido Residencial", 
                      difficulty: "Básico", 
                      desc: "Fiesta con alto volumen a las 02:00 horas en zona residencial.",
                      options: [
                        "Ingresar al domicilio por fuerza",
                        "Mediación y aplicación del Art. 33 Num. 1",
                        "Desactivación temporal de la fuente de ruido"
                      ]
                    },
                    { 
                      title: "Obstrucción a la Autoridad", 
                      difficulty: "Intermedio", 
                      desc: "Ciudadano se niega a identificarse durante un registro.",
                      options: [
                        "Traslado para procedimiento de identificación",
                        "Aplicación de Art. 35 Num. 1 y Art. 35 Num. 3",
                        "Uso de la fuerza para obtener el documento"
                      ]
                    },
                    { 
                      title: "Caninos Peligrosos", 
                      difficulty: "Intermedio", 
                      desc: "Perro de raza fuerte sin bozal en vía pública.",
                      options: [
                        "Incautación del animal",
                        "Aplicación de Art. 126 y amonestación",
                        "Multa general tipo 4"
                      ]
                    }
                  ].map((s, idx) => (
                    <ScenarioCard 
                      key={idx}
                      {...s}
                      onClick={() => setSelectedScenario(s)}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-5 space-y-6">
                    <Card title="Situación en Campo" icon={Shield}>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-display font-bold text-white uppercase tracking-tight">{selectedScenario.title}</h3>
                          <span className="text-[10px] font-mono font-black px-3 py-1 rounded-full bg-cyber-blue/10 text-cyber-blue border border-cyber-blue/20 uppercase">
                            {selectedScenario.difficulty}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-400 leading-relaxed">{selectedScenario.desc}</p>
                      </div>
                    </Card>

                    <Card title="¿Cuál es su acción?" icon={Zap}>
                      <div className="space-y-3">
                        {selectedScenario.options.map((opt: string, i: number) => {
                          const isSelected = userSimAction === opt;
                          return (
                            <button 
                              key={i}
                              onClick={() => {
                                setUserSimAction(opt);
                                handleSimulacion(opt);
                              }}
                              disabled={simulando}
                              className={cn(
                                "w-full p-5 glass rounded-2xl text-left text-xs font-bold uppercase tracking-widest transition-all border flex items-center gap-4 group",
                                isSelected 
                                  ? "border-cyber-blue bg-cyber-blue/10 text-cyber-blue cyber-glow-blue" 
                                  : "text-slate-300 hover:text-cyber-blue hover:border-cyber-blue/50 border-white/5"
                              )}
                            >
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                                isSelected ? "bg-cyber-blue text-black" : "bg-white/5 group-hover:bg-cyber-blue/20"
                              )}>
                                {i + 1}
                              </div>
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </Card>
                  </div>

                  <div className="lg:col-span-7">
                    {simHistory.length > 0 ? (
                      <div className="space-y-6 max-h-[700px] overflow-y-auto pr-4 custom-scrollbar">
                        {simHistory.map((msg, i) => (
                          <motion.div 
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                              "p-6 rounded-3xl border shadow-2xl",
                              msg.role === 'user' 
                                ? "glass border-cyber-blue/20 bg-cyber-blue/5" 
                                : "glass border-cyber-green/20 bg-cyber-green/5"
                            )}
                          >
                            <div className="flex items-center gap-3 mb-4">
                              <div className={cn(
                                "w-8 h-8 rounded-xl flex items-center justify-center",
                                msg.role === 'user' ? "bg-cyber-blue/20 text-cyber-blue" : "bg-cyber-green/20 text-cyber-green"
                              )}>
                                {msg.role === 'user' ? <Shield size={16} /> : <GraduationCap size={16} />}
                              </div>
                              <span className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-slate-500">
                                {msg.role === 'user' ? 'Acción Elegida' : 'Evaluación IA'}
                              </span>
                            </div>
                            <div className="prose prose-invert prose-sm max-w-none font-medium text-slate-300 leading-relaxed">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-full min-h-[500px] glass rounded-3xl border-dashed border-cyber-border flex flex-col items-center justify-center p-12 text-center group">
                        <div className="w-24 h-24 glass rounded-full flex items-center justify-center mb-8 group-hover:cyber-glow-blue transition-all duration-500">
                          <GraduationCap size={40} className="text-slate-600 group-hover:text-cyber-blue transition-colors" />
                        </div>
                        <h3 className="text-2xl font-display font-bold text-white mb-4 uppercase tracking-widest">Centro de Evaluación</h3>
                        <p className="text-slate-500 max-w-sm font-medium leading-relaxed">
                          Seleccione una de las opciones tácticas para recibir retroalimentación institucional inmediata.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'archivo' && (
            <motion.div 
              key="archivo" 
              initial={{ opacity: 0, scale: 0.98 }} 
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-7xl mx-auto w-full"
            >
              <header className="mb-10 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6 w-full sm:w-auto">
                  <div className="w-14 h-14 glass rounded-2xl flex items-center justify-center cyber-glow-blue rotate-3 shrink-0">
                    <Archive className="text-cyber-blue" size={32} />
                  </div>
                  <div>
                    <h2 className="text-3xl md:text-4xl font-display font-black text-white tracking-tighter uppercase italic leading-none">
                      Archivo de <span className="text-cyber-blue not-italic font-light">Comparendos</span>
                    </h2>
                    <p className="text-slate-500 font-mono text-xs mt-2 tracking-widest uppercase">Registros Recientes (Sesión Actual)</p>
                  </div>
                </div>
              </header>

              <div className="grid grid-cols-1 gap-6">
                {misProcedimientos.length > 0 ? (
                  misProcedimientos.map((relato) => (
                    <Card key={relato.id} title={`Procedure: ${relato.ciudadano} (${relato.numDoc || 'N/A'})`} icon={FileText}>
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 p-4 glass rounded-2xl border-white/5">
                        <div className="flex gap-6">
                          <div>
                            <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1">Article</p>
                            <p className="text-sm font-display font-bold text-white">{relato.articulo}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1">Numeral</p>
                            <p className="text-sm font-display font-bold text-white">{relato.numeral}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1">Date</p>
                            <p className="text-sm font-display font-bold text-white">{new Date(relato.fecha).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="secondary" icon={Copy} onClick={() => copyToClipboard(relato.relato)}>Copy</Button>
                          <Button variant="primary" icon={ExternalLink} onClick={() => setSelectedReport(relato)}>View Details</Button>
                          <Button variant="danger" icon={Trash2} onClick={async () => {
                            const path = `reports/${relato.id}`;
                            try {
                              await deleteDoc(doc(db, 'reports', relato.id));
                            } catch (e) {
                              handleFirestoreError(e, OperationType.DELETE, path);
                            }
                          }} className="px-3 py-2" />
                        </div>
                      </div>
                      <div className="max-h-32 overflow-hidden relative">
                        <div className="prose prose-invert prose-sm text-slate-400 line-clamp-3">
                          <ReactMarkdown>{relato.relato}</ReactMarkdown>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/20 to-transparent" />
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="h-full min-h-[400px] glass rounded-3xl border-dashed border-cyber-border flex flex-col items-center justify-center p-12 text-center">
                    <div className="w-20 h-20 rounded-full glass flex items-center justify-center mb-6 text-slate-700">
                      <Archive size={40} />
                    </div>
                    <h3 className="text-xl font-display font-black text-white uppercase italic mb-2 tracking-tight">Archivo Vacío</h3>
                    <p className="text-slate-500 text-xs uppercase tracking-widest max-w-xs">Los relatos generados en esta sesión aparecerán aquí automáticamente.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="mt-20 pt-8 border-t border-cyber-border flex flex-col md:flex-row justify-between items-center gap-4 opacity-40">
          <div className="flex items-center gap-4">
            <Shield size={16} className="text-cyber-blue" />
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em]">
              Creado por Juan Zambrano | App Operativo v4.2.0
            </p>
          </div>
          <div className="flex gap-6">
            <p className="text-[10px] font-mono uppercase tracking-widest">Protocolo Ley 1801</p>
            <p className="text-[10px] font-mono uppercase tracking-widest">© 2026 Todos los derechos reservados</p>
          </div>
        </footer>

        {/* Placa Modal */}
        <AnimatePresence>
          {showPlacaModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 40 }}
                animate={{ scale: 1, y: 0 }}
                className="glass rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden border-cyber-blue/30 p-10 text-center"
              >
                <div className="w-20 h-20 glass rounded-3xl mx-auto mb-8 flex items-center justify-center cyber-glow-blue rotate-3">
                  <UserCheck size={40} className="text-cyber-blue" />
                </div>
                <h3 className="text-2xl font-display font-black text-white uppercase tracking-tighter italic mb-4">Identificación de Agente</h3>
                <p className="text-slate-400 text-sm font-medium mb-8">Por favor, ingrese su número de placa institucional para personalizar su consola operativa.</p>
                
                <input 
                  type="text" 
                  placeholder="NÚMERO DE PLACA" 
                  autoFocus
                  className="w-full p-4 glass rounded-2xl text-center text-xl font-display font-bold tracking-[0.3em] outline-none focus:border-cyber-blue transition-all text-white placeholder:text-slate-700 mb-6"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSavePlaca((e.target as HTMLInputElement).value);
                    }
                  }}
                />
                
                <Button 
                  variant="primary" 
                  onClick={() => {
                    const input = document.querySelector('input[placeholder="NÚMERO DE PLACA"]') as HTMLInputElement;
                    handleSavePlaca(input.value);
                  }}
                  className="w-full py-4"
                  icon={Check}
                >
                  Confirmar Identidad
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Zona Modal */}
        <AnimatePresence>
          {showZonaModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 40 }}
                animate={{ scale: 1, y: 0 }}
                className="glass rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden border-cyber-blue/30 p-10 text-center"
              >
                <div className="w-20 h-20 glass rounded-3xl mx-auto mb-8 flex items-center justify-center cyber-glow-blue rotate-3">
                  <MapPin size={40} className="text-cyber-blue" />
                </div>
                <h3 className="text-2xl font-display font-black text-white uppercase tracking-tighter italic mb-4">Zona de Atención</h3>
                <p className="text-slate-400 text-sm font-medium mb-8">Defina su sector, cuadrante o zona de patrullaje actual para el registro de procedimientos.</p>
                
                <input 
                  type="text" 
                  placeholder="EJ: CUADRANTE 12 - CENTRO" 
                  autoFocus
                  defaultValue={zonaAtencion}
                  className="w-full p-4 glass rounded-2xl text-center text-xl font-display font-bold tracking-widest outline-none focus:border-cyber-blue transition-all text-white placeholder:text-slate-700 mb-6"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveZona((e.target as HTMLInputElement).value);
                    }
                  }}
                />
                
                <Button 
                  variant="primary" 
                  onClick={() => {
                    const input = document.querySelector('input[placeholder="EJ: CUADRANTE 12 - CENTRO"]') as HTMLInputElement;
                    handleSaveZona(input.value);
                  }}
                  className="w-full py-4"
                  icon={Check}
                >
                  Establecer Zona
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Report Modal */}
      <AnimatePresence>
        {selectedReport && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setSelectedReport(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 40 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.9, y: 40 }}
              className="glass w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border-cyber-blue/20"
              onClick={(e) => e.stopPropagation()}
            >
              <header className="p-8 border-b border-cyber-border flex justify-between items-center bg-white/5">
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 glass rounded-2xl flex items-center justify-center cyber-glow-blue">
                    <FileText className="text-cyber-blue" size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-display font-black text-white tracking-tighter uppercase italic">Expediente <span className="text-cyber-blue not-italic font-light">Digital</span></h3>
                    <p className="text-[10px] font-mono text-cyber-blue font-bold tracking-widest uppercase mt-1">UUID: {selectedReport.id}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedReport(null)} className="p-3 glass rounded-xl hover:bg-cyber-red/20 hover:text-cyber-red transition-all">
                  <X size={24} />
                </button>
              </header>
              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                  <div className="p-5 glass rounded-2xl border-white/5">
                    <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-2">Ciudadano</p>
                    <p className="font-display font-bold text-white uppercase">{selectedReport.ciudadano}</p>
                  </div>
                  <div className="p-5 glass rounded-2xl border-white/5">
                    <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-2">Fecha de Registro</p>
                    <p className="font-display font-bold text-white uppercase">{new Date(selectedReport.fecha).toLocaleDateString()}</p>
                  </div>
                  <div className="p-5 glass rounded-2xl border-white/5">
                    <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-2">Fundamento Legal</p>
                    <p className="font-display font-bold text-white uppercase">Art. {selectedReport.articulo} • Num. {selectedReport.numeral}</p>
                  </div>
                  <div className="p-5 glass rounded-2xl border-white/5">
                    <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-2">Ubicación</p>
                    <p className="font-display font-bold text-white uppercase truncate">{selectedReport.location}</p>
                  </div>
                </div>
                <div className="prose prose-invert prose-sm max-w-none font-medium text-slate-300 leading-relaxed">
                  <ReactMarkdown>{selectedReport.relato}</ReactMarkdown>
                </div>
              </div>
              <footer className="p-8 border-t border-cyber-border flex justify-end gap-4 bg-white/5">
                <Button variant="secondary" onClick={() => setSelectedReport(null)} className="px-8 py-3 uppercase tracking-widest text-[10px]">Cerrar</Button>
                <Button 
                  variant="primary" 
                  icon={Download} 
                  onClick={() => {
                    const element = document.createElement("a");
                    const file = new Blob([selectedReport.relato], {type: 'text/plain'});
                    element.href = URL.createObjectURL(file);
                    element.download = `reporte_${selectedReport.ciudadano}_${selectedReport.id.slice(0,5)}.txt`;
                    document.body.appendChild(element);
                    element.click();
                  }}
                  className="px-8 py-3 uppercase tracking-widest text-[10px]"
                >
                  Exportar Protocolo
                </Button>
              </footer>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
