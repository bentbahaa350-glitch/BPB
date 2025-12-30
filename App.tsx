
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

// مصفوفة الصور التوضيحية المقدمة
const STATIC_WORKOUT_IMAGES = [
  "https://i.top4top.io/p_3650ji51o1.png",
  "https://k.top4top.io/p_3650zzsce1.png",
  "https://b.top4top.io/p_3650u0xcs1.png",
  "https://d.top4top.io/p_3650ufsba1.png",
  "https://j.top4top.io/p_3650wcsey1.png",
  "https://c.top4top.io/p_3650nh0a01.png",
  "https://e.top4top.io/p_36508l2j51.png",
  "https://k.top4top.io/p_3650mxvwn1.png",
  "https://a.top4top.io/p_3650fk57m1.png",
  "https://d.top4top.io/p_3650ozdi01.png",
  "https://g.top4top.io/p_3650p17sf1.png",
  "https://l.top4top.io/p_365053nf31.png",
  "https://d.top4top.io/p_36503hdjr1.png",
  "https://f.top4top.io/p_3650zvrhm1.png",
  "https://e.top4top.io/p_3650vkzjt1.png",
  "https://g.top4top.io/p_3650wlsnh1.png"
];

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
            assignWorkoutIllustrations(sectionId, section);
          }
        }
      });
    }
  }, [messages]);

  // وظيفة لاختيار صورة ثابتة بناءً على اسم التمرين (لضمان الثبات والملاءمة)
  const getStaticImageForExercise = (name: string) => {
    // نقوم بعمل "Hash" بسيط لاسم التمرين لاختيار صورة من المصفوفة
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash << 5) - hash + name.charCodeAt(i);
      hash |= 0; 
    }
    const index = Math.abs(hash) % STATIC_WORKOUT_IMAGES.length;
    return STATIC_WORKOUT_IMAGES[index];
  };

  const assignWorkoutIllustrations = async (sectionId: string, content: string) => {
    const exerciseMatches = content.match(/\[(.*?)\]/g);
    if (!exerciseMatches) return;

    setIsGeneratingImages(prev => new Set(prev).add(sectionId));
    const names = exerciseMatches.map(m => m.replace(/[\[\]]/g, ''));
    
    // بدلاً من التوليد، نقوم بتعيين الصور من المصفوفة الثابتة
    const newMappings: Record<string, string> = {};
    names.forEach(name => {
      if (!exerciseImages[name]) {
        newMappings[name] = getStaticImageForExercise(name);
      }
    });

    if (Object.keys(newMappings).length > 0) {
      setExerciseImages(prev => ({ ...prev, ...newMappings }));
    }

    setIsGeneratingImages(prev => {
      const next = new Set(prev);
      next.delete(sectionId);
      return next;
    });
  };

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

  const downloadSingleImage = (e: React.MouseEvent, url: string, name: string) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = url;
    link.target = "_blank";
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
      
      {/* Profile / Initial Form Modal */}
      {isProfileOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-xl rounded-[2.5rem] p-8 shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-y-auto max-h-[95vh] scrollbar-hide relative">
            
            {messages.length > 0 && (
              <button 
                onClick={() => setIsProfileOpen(false)}
                className="absolute top-6 left-6 p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-all text-slate-500"
              >
                <X size={20} />
              </button>
            )}

            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-emerald-500/20 rotate-3">
                <UserCircle size={32} className="text-white dark:text-slate-900" />
              </div>
              <h2 className="text-2xl font-black mb-1 tracking-tight text-slate-900 dark:text-slate-100">
                {messages.length === 0 ? 'الملف الشخصي الرياضي' : 'تعديل بياناتك'}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs">حافظ على بياناتك دقيقة للحصول على أفضل النتائج</p>
            </div>
            
            <form onSubmit={messages.length === 0 ? handleInitialSubmit : handleUpdateProfile} className="space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block text-center">صورة الجسم</span>
                  <div className="relative group">
                    <input type="file" ref={formBodyInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'body')} />
                    {!formBodyImage ? (
                      <button type="button" onClick={() => formBodyInputRef.current?.click()} className="w-full aspect-[4/5] border-2 border-dashed border-emerald-500/20 bg-emerald-500/5 rounded-3xl flex flex-col items-center justify-center gap-2 hover:border-emerald-500 hover:bg-emerald-500/10 transition-all group">
                        <Camera size={32} className="text-emerald-500 group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">اضغط للرفع</span>
                      </button>
                    ) : (
                      <div className="relative aspect-[4/5] w-full rounded-3xl overflow-hidden border-2 border-emerald-500 shadow-2xl group-hover:scale-[1.02] transition-transform">
                        <img src={formBodyImage} className="w-full h-full object-cover" alt="Body" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                          <button type="button" onClick={() => formBodyInputRef.current?.click()} className="bg-white text-slate-900 p-2 rounded-full shadow-xl"><RotateCcw size={16} /></button>
                        </div>
                        <button type="button" onClick={() => setFormBodyImage(null)} className="absolute top-3 left-3 bg-red-500 text-white rounded-full p-1.5 shadow-lg"><X size={14} /></button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block text-center">أحدث وجبة</span>
                  <div className="relative group">
                    <input type="file" ref={formMealInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'meal')} />
                    {!formMealImage ? (
                      <button type="button" onClick={() => formMealInputRef.current?.click()} className="w-full aspect-[4/5] border-2 border-dashed border-orange-500/20 bg-orange-500/5 rounded-3xl flex flex-col items-center justify-center gap-2 hover:border-orange-500 hover:bg-orange-500/10 transition-all group">
                        <Utensils size={32} className="text-orange-500 group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] font-bold text-orange-600 dark:text-orange-400 uppercase">اضغط للرفع</span>
                      </button>
                    ) : (
                      <div className="relative aspect-[4/5] w-full rounded-3xl overflow-hidden border-2 border-orange-500 shadow-2xl group-hover:scale-[1.02] transition-transform">
                        <img src={formMealImage} className="w-full h-full object-cover" alt="Meal" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                          <button type="button" onClick={() => formMealInputRef.current?.click()} className="bg-white text-slate-900 p-2 rounded-full shadow-xl"><RotateCcw size={16} /></button>
                        </div>
                        <button type="button" onClick={() => setFormMealImage(null)} className="absolute top-3 left-3 bg-red-500 text-white rounded-full p-1.5 shadow-lg"><X size={14} /></button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1"><Scale size={12} /> السن</label>
                  <input type="number" required value={formData.age} onChange={e => setFormData({...formData, age: +e.target.value})} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-center text-lg font-bold outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1"><Scale size={12} /> الوزن</label>
                  <input type="number" required value={formData.weight} onChange={e => setFormData({...formData, weight: +e.target.value})} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-center text-lg font-bold outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1"><Ruler size={12} /> الطول</label>
                  <input type="number" required value={formData.height} onChange={e => setFormData({...formData, height: +e.target.value})} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-center text-lg font-bold outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">المستوى الرياضي</label>
                  <select 
                    value={formData.level} 
                    onChange={e => setFormData({...formData, level: e.target.value})}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option>مبتدئ</option>
                    <option>متوسط</option>
                    <option>متقدم</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">الهدف الأساسي</label>
                  <input 
                    type="text" required value={formData.goal} 
                    onChange={e => setFormData({...formData, goal: e.target.value})} 
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-emerald-500" 
                    placeholder="مثال: خسارة دهون وبناء عضلات"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">أيام التفرغ للتدريب</label>
                  <input 
                    type="text" required value={formData.availableDays} 
                    onChange={e => setFormData({...formData, availableDays: e.target.value})} 
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-emerald-500" 
                    placeholder="مثال: 4 أيام (سبت، أحد، ثلاثاء، أربعاء)"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                {messages.length === 0 ? (
                  <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-5 rounded-[2rem] shadow-2xl shadow-emerald-600/20 transition-all flex items-center justify-center gap-3 text-lg group">
                    ابدأ التغيير الآن <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                  </button>
                ) : (
                  <>
                    <button type="submit" className="flex-1 bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white font-black py-5 rounded-[2rem] shadow-xl transition-all flex items-center justify-center gap-3">
                      <Save size={20} /> حفظ البيانات
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        const confirmMsg = "كابتن، لقد حدثت بياناتي، هل يمكنك مراجعة البرنامج وتعديله بناءً على البيانات الجديدة؟";
                        const imagesToSend: string[] = [];
                        if (formBodyImage) imagesToSend.push(formBodyImage);
                        if (formMealImage) imagesToSend.push(formMealImage);
                        setIsProfileOpen(false);
                        processMessage(confirmMsg, imagesToSend);
                      }}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-5 rounded-[2rem] shadow-2xl shadow-emerald-600/20 transition-all flex items-center justify-center gap-3"
                    >
                      <RotateCcw size={20} /> تحديث البرنامج
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      <header className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 z-10 shadow-md transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 rotate-3"><Dumbbell className="text-white dark:text-slate-900" size={20} /></div>
          <div>
            <h1 className="font-bold text-lg leading-none tracking-tight text-slate-900 dark:text-slate-100"><span className="text-emerald-500 dark:text-emerald-400 font-black">BPB</span> l Build Perfect Body</h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-1 uppercase tracking-widest font-bold">Your sports coach</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            {isDarkMode ? <Sun size={22} /> : <Moon size={22} />}
          </button>
          <button onClick={() => setIsProfileOpen(true)} className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 group relative">
            <UserCircle size={22} />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900"></span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-8 scrollbar-hide bg-slate-50 dark:bg-slate-950/50 transition-colors">
        {messages.length === 0 && !isLoading && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-6">
            <div className="w-24 h-24 bg-emerald-500/10 rounded-[2.5rem] flex items-center justify-center text-emerald-500 border-4 border-emerald-500/20 animate-bounce">
              <Sparkles size={48} />
            </div>
            <div className="max-w-xs space-y-2">
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">مرحباً بك في نظام التغيير</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">اضغط على زر الملف الشخصي بالأعلى لبدء تصميم برنامجك المخصص بناءً على تحليلات الذكاء الاصطناعي</p>
            </div>
            <button onClick={() => setIsProfileOpen(true)} className="bg-emerald-600 text-white px-8 py-4 rounded-full font-black shadow-xl shadow-emerald-600/20 flex items-center gap-2 hover:scale-105 transition-all">
              بدء التحليل <ChevronLeft size={20} />
            </button>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-start' : 'items-stretch'} animate-fade-in`}>
            {msg.role === 'user' ? (
              <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm text-slate-900 dark:text-slate-100 rounded-[2rem] rounded-tr-none p-5 max-w-[85%] shadow-xl border border-slate-200 dark:border-slate-700/50">
                {msg.images && msg.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {msg.images.map((img, iIdx) => (
                      <img key={iIdx} src={img} className="w-24 h-24 object-cover rounded-xl border-2 border-slate-200 dark:border-slate-700 shadow-xl" alt="User upload" />
                    ))}
                  </div>
                )}
                <p className="text-sm leading-relaxed">{msg.content}</p>
              </div>
            ) : (
              <div className="space-y-8">
                {parseSections(msg.content).map((section, sIdx) => {
                  const [title, ...bodyLines] = section.split('\n');
                  const sectionId = `section-${idx}-${sIdx}`;
                  const cleanTitle = title.replace('## ', '');
                  const isTraining = cleanTitle.includes('التدريبي');
                  const exercises = section.match(/\[(.*?)\]/g)?.map(m => m.replace(/[\[\]]/g, '')) || [];
                  
                  return (
                    <div key={sIdx} id={sectionId} className={`rounded-[2.5rem] border p-8 shadow-2xl relative overflow-hidden bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 transition-all hover:bg-slate-100/50 dark:hover:bg-slate-900/60 group`}>
                      <div className="flex items-center justify-between mb-6 border-b border-slate-100 dark:border-slate-800 pb-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner group-hover:scale-110 transition-transform">{getSectionIcon(cleanTitle)}</div>
                          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{cleanTitle}</h2>
                        </div>
                        <button onClick={() => exportAsImage(sectionId, cleanTitle)} className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 dark:hover:bg-emerald-600 hover:text-white transition-all rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-white shadow-lg" title="تحميل البرنامج كصورة">
                          <Download size={20} />
                        </button>
                      </div>

                      <div className="text-sm space-y-3 mb-6 leading-relaxed text-slate-600 dark:text-slate-300">
                        {bodyLines.map((line, lIdx) => (
                          <p key={lIdx} className={line.includes('✅') ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''}>
                            {line.replace(/\[.*?\]/g, (m) => m.replace(/[\[\]]/g, ''))}
                          </p>
                        ))}
                      </div>

                      {isTraining && exercises.length > 0 && (
                        <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800/50">
                          <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.3em] flex items-center gap-2">
                              <ImageIcon size={16} /> دليل الحركات التوضيحية
                            </h3>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                            {exercises.map((ex, eIdx) => (
                              <div key={eIdx} className="relative aspect-square rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 overflow-hidden group/img shadow-2xl hover:border-emerald-500/50 transition-all">
                                {exerciseImages[ex] && (
                                  <>
                                    <img src={exerciseImages[ex]} className="w-full h-full object-cover animate-fade-in" alt={ex} />
                                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover/img:opacity-100 transition-all flex items-center justify-center backdrop-blur-[2px]">
                                      <button 
                                        onClick={(e) => downloadSingleImage(e, exerciseImages[ex], ex)}
                                        className="p-4 bg-emerald-600 text-white rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center gap-2 font-bold text-xs"
                                      >
                                        <Download size={20} /> حفظ
                                      </button>
                                    </div>
                                    <div className="absolute bottom-0 inset-x-0 bg-white/80 dark:bg-slate-950/80 p-3 text-[10px] font-black text-center text-emerald-600 dark:text-emerald-400 border-t border-emerald-500/20 uppercase tracking-wider backdrop-blur-md">
                                      {ex}
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-4 px-4 text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em]">
              {msg.role === 'user' && 'Athlete Input'}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-center p-12">
            <div className="flex flex-col items-center gap-4">
               <div className="relative">
                 <div className="absolute inset-0 bg-emerald-500 rounded-full blur-2xl opacity-20 animate-pulse"></div>
                 <div className="relative bg-white dark:bg-slate-900 border border-emerald-500/20 px-10 py-5 rounded-full flex items-center gap-4 shadow-2xl">
                   <Loader2 className="animate-spin text-emerald-600 dark:text-emerald-500" size={28} />
                   <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 tracking-[0.2em] uppercase">Processing Workout Data...</span>
                 </div>
               </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      <footer className="p-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-[0_-15px_30px_rgba(0,0,0,0.1)] dark:shadow-[0_-15px_30px_rgba(0,0,0,0.4)] backdrop-blur-lg transition-colors">
        {selectedImage && (
          <div className="mb-6 relative inline-block animate-fade-in group">
            <img src={selectedImage} className="w-28 h-28 object-cover rounded-3xl border-2 border-emerald-500 shadow-2xl transition-transform group-hover:scale-105" />
            <button onClick={() => setSelectedImage(null)} className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-2 shadow-xl hover:scale-125 transition-all"><X size={16} /></button>
          </div>
        )}
        <form onSubmit={handleSendMessage} className="flex gap-4 mb-4">
          <input type="file" ref={fileInputRef} onChange={(e) => handleImageUpload(e, 'chat')} accept="image/*" className="hidden" />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="p-5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-3xl text-slate-500 dark:text-slate-400 transition-all border border-slate-200 dark:border-slate-700 shadow-xl active:scale-90"><Camera size={28} /></button>
          <input 
            type="text" value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="اطلب تعديل، تحليل وجبة، أو سؤال تدريبي..."
            className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-[1.8rem] py-5 px-8 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 transition-all shadow-inner text-right font-medium placeholder:text-slate-400 dark:placeholder:text-slate-600" dir="rtl"
          />
          <button type="submit" disabled={isLoading || (!input.trim() && !selectedImage)} className="p-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-3xl shadow-xl shadow-emerald-600/30 active:scale-90 transition-all disabled:opacity-30 disabled:grayscale">
            <Send size={28} />
          </button>
        </form>
        <div className="text-center text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em]">
          Development l <a href="https://hamzahub.shop" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:text-emerald-400 hover:underline transition-all">HAMZA Hilal</a>
        </div>
      </footer>
    </div>
  );
};

export default App;
