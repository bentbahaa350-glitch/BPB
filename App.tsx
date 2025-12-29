import React, { useState, useEffect, useRef } from 'react';
import { HamzaCoach } from './geminiService';
import { UserData, ChatMessage } from './types';
import { 
  Dumbbell, 
  Utensils, 
  Camera, 
  Send, 
  Loader2, 
  Activity, 
  Target,
  ChevronLeft,
  Info,
  Download,
  UserCircle,
  Scale,
  Ruler,
  Calendar,
  Image as ImageIcon,
  X,
  Apple,
  ClipboardList,
  Calculator,
  Sparkles,
  Sun,
  Moon,
  Settings,
  Save,
  RotateCcw
} from 'lucide-react';
import * as htmlToImage from 'html-to-image';

const App: React.FC = () => {
  const [isProfileOpen, setIsProfileOpen] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });
  
  // صور الملف الشخصي
  const [formBodyImage, setFormBodyImage] = useState<string | null>(null);
  const [formMealImage, setFormMealImage] = useState<string | null>(null);
  
  const [exerciseImages, setExerciseImages] = useState<Record<string, string>>({});
  const [isGeneratingImages, setIsGeneratingImages] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState<UserData>({
    age: 25,
    weight: 70,
    height: 175,
    level: 'مبتدئ',
    goal: 'خسارة دهون وبناء عضلات',
    availableDays: '4 أيام (سبت، أحد، ثلاثاء، أربعاء)'
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formBodyInputRef = useRef<HTMLInputElement>(null);
  const formMealInputRef = useRef<HTMLInputElement>(null);
  const coachRef = useRef(new HamzaCoach());

  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === 'assistant') {
      const sections = parseSections(lastMsg.content);
      sections.forEach((section, sIdx) => {
        if (section.includes('البرنامج التدريبي')) {
          const sectionId = `section-${messages.length - 1}-${sIdx}`;
          if (!isGeneratingImages.has(sectionId)) {
            autoGenerateIllustrations(sectionId, section);
          }
        }
      });
    }
  }, [messages]);

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProfileOpen(false);
    
    const initialPrompt = `أهلاً كابتن، هذه بياناتي: السن ${formData.age}، الوزن ${formData.weight}كجم، الطول ${formData.height}سم. مستواي ${formData.level} وهدفي ${formData.goal}. لقد أرفقت صورتي الشخصية ${formMealImage ? 'وصورة لوجبتي المعتادة' : ''}، حلل جسمي وصمم لي البرنامج الكامل بالصور.`;
    
    const imagesToSend: string[] = [];
    if (formBodyImage) imagesToSend.push(formBodyImage);
    if (formMealImage) imagesToSend.push(formMealImage);
    
    processMessage(initialPrompt, imagesToSend);
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProfileOpen(false);
    // Just updates state, doesn't automatically trigger a new plan unless user wants
  };

  const processMessage = async (text: string, images?: string[]) => {
    const userMsg: ChatMessage = { role: 'user', content: text, images: images };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    try {
      const base64Array = images?.map(img => img.split(',')[1]);
      const history = messages.slice(-5);
      const reply = await coachRef.current.getResponse(history, text, base64Array);
      setMessages(prev => [...prev, { role: 'assistant', content: reply || "خطأ في الاتصال." }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "عذراً يا بطل، حاول مرة أخرى." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const autoGenerateIllustrations = async (sectionId: string, content: string) => {
    const exerciseMatches = content.match(/\[(.*?)\]/g);
    if (!exerciseMatches) return;

    setIsGeneratingImages(prev => new Set(prev).add(sectionId));
    const names = exerciseMatches.map(m => m.replace(/[\[\]]/g, ''));
    
    for (const name of names) {
      if (!exerciseImages[name]) {
        const img = await coachRef.current.generateExerciseImage(name);
        if (img) {
          setExerciseImages(prev => ({ ...prev, [name]: img }));
        }
      }
    }
    setIsGeneratingImages(prev => {
      const next = new Set(prev);
      next.delete(sectionId);
      return next;
    });
  };

  const downloadSingleImage = (e: React.MouseEvent, base64: string, name: string) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = base64;
    link.download = `BPB-Exercise-${name}.png`;
    link.click();
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() && !selectedImage) return;
    const curIn = input; const curImg = selectedImage;
    setInput(''); setSelectedImage(null);
    await processMessage(curIn, curImg ? [curImg] : undefined);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'chat' | 'body' | 'meal') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (target === 'chat') setSelectedImage(reader.result as string);
        else if (target === 'body') setFormBodyImage(reader.result as string);
        else if (target === 'meal') setFormMealImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const exportAsImage = async (elementId: string, filename: string) => {
    const node = document.getElementById(elementId);
    if (!node || isExporting) return;
    setIsExporting(elementId);
    try {
      await new Promise(r => setTimeout(r, 500));
      const dataUrl = await htmlToImage.toPng(node, { backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc', pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) { console.error(e); }
    finally { setIsExporting(null); }
  };

  const parseSections = (content: string) => content.split(/(?=## )/).map(s => s.trim()).filter(s => s.length > 0);

  const getSectionIcon = (title: string) => {
    if (title.includes('الحسابات')) return <Calculator className="text-blue-500 dark:text-blue-400" />;
    if (title.includes('التدريبي')) return <Dumbbell className="text-emerald-500 dark:text-emerald-400" />;
    if (title.includes('الغذائي')) return <Utensils className="text-orange-500 dark:text-orange-400" />;
    if (title.includes('الوجبة')) return <Apple className="text-red-500 dark:text-red-400" />;
    return <ClipboardList className="text-slate-500 dark:text-slate-400" />;
  };

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  return (
    <div className={`flex flex-col h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 max-w-4xl mx-auto shadow-2xl relative overflow-hidden font-['Cairo'] transition-colors duration-300`}>
      {/* ... نفس الكود فوق كما هو ... */}

      <footer className="p-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-[0_-15px_30px_rgba(0,0,0,0.1)] dark:shadow-[0_-15px_30px_rgba(0,0,0,0.4)] backdrop-blur-lg transition-colors">
        {selectedImage && (
          <div className="mb-6 relative inline-block animate-fade-in group">
            <img src={selectedImage} className="w-28 h-28 object-cover rounded-3xl border-2 border-emerald-500 shadow-2xl transition-transform group-hover:scale-105" />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-2 shadow-xl hover:scale-125 transition-all"
            >
              <X size={16} />
            </button>
          </div>
        )}
        <form onSubmit={handleSendMessage} className="flex gap-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleImageUpload(e, 'chat')}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-3xl text-slate-500 dark:text-slate-400 transition-all border border-slate-200 dark:border-slate-700 shadow-xl active:scale-90"
          >
            <Camera size={28} />
          </button>
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="اطلب تعديل، تحليل وجبة، أو سؤال تدريبي..."
            className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-[1.8rem] py-5 px-8 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 transition-all shadow-inner text-right font-medium placeholder:text-slate-400 dark:placeholder:text-slate-600"
            dir="rtl"
          />
          <button
            type="submit"
            disabled={isLoading || (!input.trim() && !selectedImage)}
            className="p-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-3xl shadow-xl shadow-emerald-600/30 active:scale-90 transition-all disabled:opacity-30 disabled:grayscale"
          >
            <Send size={28} />
          </button>
        </form>

        {/* سطر التطوير */}
        <div className="mt-4 text-center text-[11px] text-slate-400 dark:text-slate-500">
          تطوير{" "}
          <a
            href="https://hamzahilal.art"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-500 dark:hover:text-emerald-400 underline decoration-dotted"
          >
            HAMZA Hilal
          </a>
        </div>
      </footer>
    </div>
  );
};

export default App;
