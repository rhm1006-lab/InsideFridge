import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, Plus, Trash2, Mic, ChefHat, 
  Thermometer, Calendar, LayoutGrid, Refrigerator,
  ArrowUpAZ, Clock, Edit2, X, Check, Save,
  Snowflake, Sun, Search, CloudRain, Wind, Droplets,
  Volume2, AlertCircle, UserPlus, User, PackagePlus,
  Moon, ShoppingCart, ChevronDown, ChevronUp, Pencil,
  RefreshCw, Cloud, CloudLightning, Download, Upload,
  CalendarDays, Hourglass, AlertTriangle, Bell, BellOff, Youtube
} from 'lucide-react';
import { FridgeConfig, DoorConfig, FoodItem, SortMode, DoorType, UserProfile, RecipeSuggestion, WeatherData, BackupData } from './types';
import { DEFAULT_CATEGORIES, MOCK_WEATHER } from './constants';
import * as GeminiService from './services/geminiService';
import * as WeatherService from './services/weatherService';

// --- Helper Components ---

interface ModalProps {
  children?: React.ReactNode;
  onClose: () => void;
  title: string;
}

const Modal = ({ children, onClose, title }: ModalProps) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden animate-fade-in flex flex-col">
      <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0">
        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
          <X className="w-6 h-6 text-gray-500" />
        </button>
      </div>
      <div className="p-6 overflow-y-auto custom-scrollbar">
        {children}
      </div>
    </div>
  </div>
);

// --- Main Application ---

export default function App() {
  // State
  const [config, setConfig] = useState<FridgeConfig>(() => {
    const saved = localStorage.getItem('fridge_config');
    const parsed = saved ? JSON.parse(saved) : { name: '나의 스마트 냉장고', doorCount: 2, doors: [], isSetup: false };
    if (!parsed.userProfiles) parsed.userProfiles = [];
    return parsed;
  });

  const [items, setItems] = useState<FoodItem[]>(() => {
    const saved = localStorage.getItem('fridge_items');
    return saved ? JSON.parse(saved) : [];
  });

  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('fridge_categories');
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  });

  const [currentTime, setCurrentTime] = useState(new Date());

  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWeatherOpen, setIsWeatherOpen] = useState(false);
  
  // Weather State
  const [weather, setWeather] = useState<WeatherData>(MOCK_WEATHER);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isVoiceSearching, setIsVoiceSearching] = useState(false);

  // Edit Item State
  const [isEditItemOpen, setIsEditItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editQty, setEditQty] = useState(1);
  const [editCat, setEditCat] = useState('');
  const [editDoor, setEditDoor] = useState('');
  const [editExpiry, setEditExpiry] = useState(''); // YYYY-MM-DD string

  // Category Management State
  const [newCategoryInput, setNewCategoryInput] = useState('');

  // UI State for Door Expansion
  const [expandedDoors, setExpandedDoors] = useState<string[]>([]);
  
  // Sleep Mode State
  const [isSleepMode, setIsSleepMode] = useState(false);
  const [isManuallyAwake, setIsManuallyAwake] = useState(false);
  
  // Recipe State
  const [recipes, setRecipes] = useState<RecipeSuggestion[]>([]);
  const [isGeneratingRecipes, setIsGeneratingRecipes] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeSuggestion | null>(null);
  
  // Add Item State
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemCat, setNewItemCat] = useState(''); // Initialized as empty
  const [newItemDoor, setNewItemDoor] = useState('');
  const [newItemExpiry, setNewItemExpiry] = useState(''); // YYYY-MM-DD string
  const [isListening, setIsListening] = useState(false);
  const [isPredictingCat, setIsPredictingCat] = useState(false);

  // Settings Reset & Backup State
  const [showResetVerify, setShowResetVerify] = useState(false);
  const [resetInput, setResetInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notification State
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'default'
  );

  // Cache for category predictions to save API calls
  const predictionCache = useRef<Record<string, string>>({});

  // Persistence
  useEffect(() => localStorage.setItem('fridge_config', JSON.stringify(config)), [config]);
  useEffect(() => localStorage.setItem('fridge_items', JSON.stringify(items)), [items]);
  useEffect(() => localStorage.setItem('fridge_categories', JSON.stringify(categories)), [categories]);

  // Clock Tick & Sleep Mode Logic
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      // Sleep Mode Logic: Sleep between 22:00 (10 PM) and 07:00 (7 AM)
      const hour = now.getHours();
      const shouldSleep = hour >= 22 || hour < 7;
      
      if (shouldSleep && !isManuallyAwake) {
        setIsSleepMode(true);
      } else if (!shouldSleep) {
        setIsSleepMode(false);
        setIsManuallyAwake(false); // Reset manual awake when day starts
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isManuallyAwake]);

  // Auto-sleep timer when manually woken up during sleep hours
  useEffect(() => {
    let sleepTimer: ReturnType<typeof setTimeout>;
    if (isManuallyAwake && (currentTime.getHours() >= 22 || currentTime.getHours() < 7)) {
       // Go back to sleep after 30 seconds of inactivity
       sleepTimer = setTimeout(() => {
         setIsManuallyAwake(false);
         setIsSleepMode(true);
       }, 30000); 
    }
    return () => clearTimeout(sleepTimer);
  }, [isManuallyAwake, currentTime]);

  // Fetch Weather Logic
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const data = await WeatherService.fetchWeatherData(latitude, longitude);
            setWeather(data);
          } catch (error) {
            console.error("Failed to update weather", error);
            // Fallback to mock data is implicit since state initialized with it
          }
        },
        (error) => {
          console.warn("Location access denied, using mock weather", error);
        }
      );
    }
  }, []);

  // Initial Setup of doors if empty
  useEffect(() => {
    if (config.isSetup && config.doors.length === 0) {
      generateDefaultDoors(config.doorCount);
    }
  }, [config.isSetup, config.doorCount]);

  // AI Recipes
  const fetchRecipes = async () => {
    if (items.length === 0) return;
    setIsGeneratingRecipes(true);
    const hour = new Date().getHours();
    let timeOfDay = '저녁';
    if (hour < 11) timeOfDay = '아침';
    else if (hour < 15) timeOfDay = '점심';

    const suggestions = await GeminiService.getRecipeSuggestions(items, timeOfDay, config.userProfiles);
    setRecipes(suggestions);
    setIsGeneratingRecipes(false);
  };

  // --- Logic Helpers ---
  const getDaysUntilExpiration = (expiryDate?: number) => {
    if (!expiryDate) return null;
    const now = new Date();
    // Normalize to start of day for accurate D-day calculation
    now.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    
    const diffTime = expiry.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // --- Notification Logic ---
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert("이 브라우저는 알림을 지원하지 않습니다.");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
       new Notification("알림이 설정되었습니다.", { body: "이제 소비기한 임박 식재료 알림을 받으실 수 있습니다." });
    }
  };

  useEffect(() => {
    if (notificationPermission !== 'granted') return;

    const checkExpirations = () => {
       const lastSent = localStorage.getItem('last_notification_date');
       const now = new Date();
       const todayStr = now.toDateString();
       
       // Only send notifications once per day
       if (lastSent === todayStr) return;
       
       const expiring = items.filter(i => {
         if (!i.expirationDate) return false;
         const days = getDaysUntilExpiration(i.expirationDate);
         return days !== null && days <= 3; // Expired or <= 3 days left
       });
       
       if (expiring.length > 0) {
          const expiredCount = expiring.filter(i => (getDaysUntilExpiration(i.expirationDate!) || 0) < 0).length;
          const soonCount = expiring.length - expiredCount;

          if (expiredCount === 0 && soonCount === 0) return;

          let body = "";
           if (expiredCount > 0 && soonCount > 0) {
               body = `소비기한 만료 ${expiredCount}개, 임박 ${soonCount}개 식재료가 있습니다.`;
           } else if (expiredCount > 0) {
               body = `소비기한이 지난 식재료 ${expiredCount}개가 있습니다.`;
           } else {
                body = `소비기한 임박 식재료 ${soonCount}개가 있습니다. 빨리 드시는 게 좋겠어요!`;
           }
           
           new Notification("냉장고 알림", { body });
           localStorage.setItem('last_notification_date', todayStr);
       }
    };
    
    // Check shortly after load and then every hour
    const timer = setTimeout(checkExpirations, 3000); 
    const interval = setInterval(checkExpirations, 60 * 60 * 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [items, notificationPermission]);

  // --- Helpers for Category Prediction & Icons ---
  // ... (checkLocalHeuristics and getCategoryIcon implementation unchanged)
  const checkLocalHeuristics = (name: string): string | null => {
    const n = name.replace(/\s+/g, '');
    
    // Complex/Longer matches first to avoid incorrect substrings
    if (n.includes('양배추')) return categories.find(c => c.includes('잎채소')) || '잎채소 (상추/깻잎 등)';
    if (n.includes('배추') || n.includes('김치') || n.includes('깍두기')) return categories.find(c => c.includes('김치')) || '김치/절임배추';
    if (n.includes('아이스크림')) return categories.find(c => c.includes('아이스크림')) || '아이스크림';
    
    // Root Veg
    if (n.includes('양파') || n.includes('마늘') || n.includes('감자') || n.includes('당근') || n.includes('고구마') || n.includes('무') || n.includes('연근') || n.includes('우엉')) return categories.find(c => c.includes('뿌리채소')) || '뿌리채소 (감자/당근 등)';
    
    // Leaf Veg
    if (n.includes('대파') || n.includes('쪽파') || n.includes('상추') || n.includes('깻잎') || n.includes('시금치') || n.includes('부추') || n.includes('쑥갓') || n.includes('치커리')) return categories.find(c => c.includes('잎채소')) || '잎채소 (상추/깻잎 등)';

    // Fruit Veg
    if (n.includes('고추') || n.includes('오이') || n.includes('호박') || n.includes('토마토') || n.includes('가지') || n.includes('피망') || n.includes('파프리카')) return categories.find(c => c.includes('열매채소')) || '열매채소 (고추/오이 등)';
    
    // Mushrooms
    if (n.includes('버섯') || n.includes('팽이') || n.includes('표고') || n.includes('송이') || n.includes('느타리')) return categories.find(c => c.includes('버섯')) || '버섯류';

    // Fruits
    if (n.includes('사과') || n.includes('배') || n.includes('포도') || n.includes('딸기') || n.includes('바나나') || n.includes('귤') || n.includes('오렌지') || n.includes('복숭아') || n.includes('자두') || n.includes('감') || n.includes('수박') || n.includes('참외') || n.includes('키위') || n.includes('망고') || n.includes('파인애플') || n.includes('체리') || n.includes('블루베리')) {
        if (n.includes('망고') || n.includes('파인애플') || n.includes('바나나')) return categories.find(c => c.includes('열대')) || '열대과일';
        return categories.find(c => c.includes('과일')) || '과일 (사과/배 등)';
    }

    // Meat/Seafood
    if (n.includes('소고기') || n.includes('한우') || n.includes('스테이크') || n.includes('차돌') || n.includes('양지')) return categories.find(c => c.includes('소고기')) || '소고기';
    if (n.includes('돼지') || n.includes('삼겹살') || n.includes('목살') || n.includes('햄') || n.includes('소시지') || n.includes('베이컨') || n.includes('스팸')) return categories.find(c => c.includes('돼지')) || '돼지고기';
    if (n.includes('닭') || n.includes('치킨') || n.includes('오리')) return categories.find(c => c.includes('닭')) || '닭/오리고기';
    if (n.includes('생선') || n.includes('고등어') || n.includes('오징어') || n.includes('새우') || n.includes('갈치') || n.includes('조기') || n.includes('멸치') || n.includes('참치') || n.includes('낙지') || n.includes('문어') || n.includes('게') || n.includes('조개') || n.includes('전복')) return categories.find(c => c.includes('생선')) || '생선/해산물';
    
    // Dairy/Eggs/Tofu
    if (n.includes('우유') || n.includes('치즈') || n.includes('요거트') || n.includes('버터') || n.includes('크림')) return categories.find(c => c.includes('우유')) || '우유/유제품';
    if (n.includes('계란') || n.includes('달걀') || n.includes('메추리알')) return categories.find(c => c.includes('계란')) || '계란/알류';
    if (n.includes('두부') || n.includes('콩나물') || n.includes('콩')) return categories.find(c => c.includes('두부')) || '두부/콩류';
    
    // Drinks/Snacks/Others
    if (n.includes('물') || n.includes('주스') || n.includes('콜라') || n.includes('사이다') || n.includes('맥주') || n.includes('소주') || n.includes('커피') || n.includes('탄산')) return categories.find(c => c.includes('음료')) || '음료/주류';
    if (n.includes('빵') || n.includes('케이크') || n.includes('샌드위치') || n.includes('떡') || n.includes('과자') || n.includes('초콜릿') || n.includes('쿠키')) return categories.find(c => c.includes('빵')) || '빵/떡/간식';
    if (n.includes('냉동') || n.includes('만두') || n.includes('피자') || n.includes('돈까스')) return categories.find(c => c.includes('냉동 간편식')) || '냉동 간편식';
    if (n.includes('소스') || n.includes('장') || n.includes('케첩') || n.includes('마요네즈') || n.includes('오일') || n.includes('식용유') || n.includes('간장') || n.includes('식초')) return categories.find(c => c.includes('소스')) || '소스/드레싱/양념';

    return null;
  };

  const getCategoryIcon = (category: string) => {
    if (category.includes('잎채소')) return '🥬';
    if (category.includes('뿌리')) return '🥕';
    if (category.includes('열매')) return '🥒';
    if (category.includes('버섯')) return '🍄';
    if (category.includes('과일')) return '🍎';
    if (category.includes('열대')) return '🍌';
    if (category.includes('소고기')) return '🥩';
    if (category.includes('돼지')) return '🥓';
    if (category.includes('닭') || category.includes('오리')) return '🍗';
    if (category.includes('생선') || category.includes('해산물')) return '🐟';
    if (category.includes('우유') || category.includes('유제품')) return '🥛';
    if (category.includes('계란') || category.includes('알류')) return '🥚';
    if (category.includes('두부') || category.includes('콩')) return '🫘';
    if (category.includes('김치')) return '🥬';
    if (category.includes('반찬')) return '🍱';
    if (category.includes('소스') || category.includes('양념')) return '🥫';
    if (category.includes('음료') || category.includes('주류')) return '🥤';
    if (category.includes('빵') || category.includes('떡')) return '🍞';
    if (category.includes('냉동')) return '❄️';
    if (category.includes('아이스크림')) return '🍦';
    return '📦';
  };

  const getWeatherIcon = (sizeClass: string = "w-6 h-6") => {
    const code = weather.code;
    const c = sizeClass;
    if (code === undefined) return <Sun className={`${c} text-orange-400`} />;
    
    if (code <= 1) return <Sun className={`${c} text-orange-400`} />;
    if (code <= 3) return <Cloud className={`${c} text-gray-400`} />;
    if (code <= 48) return <Cloud className={`${c} text-slate-300`} />;
    if (code <= 67) return <CloudRain className={`${c} text-blue-400`} />;
    if (code <= 77) return <Snowflake className={`${c} text-sky-200`} />;
    if (code <= 82) return <CloudRain className={`${c} text-blue-600`} />;
    if (code <= 86) return <Snowflake className={`${c} text-sky-300`} />;
    if (code <= 99) return <CloudLightning className={`${c} text-purple-500`} />;
    return <Sun className={`${c} text-orange-400`} />;
  };

  const getWeatherLargeIcon = () => {
    const code = weather.code;
    if (code === undefined) return <Sun className="w-24 h-24 text-orange-400 mx-auto mb-4 animate-spin-slow" />;
    
    if (code <= 1) return <Sun className="w-24 h-24 text-orange-400 mx-auto mb-4 animate-spin-slow" />;
    if (code <= 3) return <Cloud className="w-24 h-24 text-gray-400 mx-auto mb-4" />;
    if (code <= 48) return <Cloud className="w-24 h-24 text-slate-300 mx-auto mb-4" />;
    if (code <= 67) return <CloudRain className="w-24 h-24 text-blue-400 mx-auto mb-4" />;
    if (code <= 77) return <Snowflake className="w-24 h-24 text-sky-200 mx-auto mb-4" />;
    if (code <= 82) return <CloudRain className="w-24 h-24 text-blue-600 mx-auto mb-4" />;
    if (code <= 86) return <Snowflake className="w-24 h-24 text-sky-300 mx-auto mb-4" />;
    if (code <= 99) return <CloudLightning className="w-24 h-24 text-purple-500 mx-auto mb-4" />;
    return <Sun className="w-24 h-24 text-orange-400 mx-auto mb-4" />;
  };

  const getExpirationColor = (days: number) => {
    if (days < 0) return "text-red-600 font-bold";
    if (days <= 3) return "text-orange-600 font-bold";
    return "text-slate-500";
  };

  const getExpirationBadge = (days: number) => {
    if (days < 0) return <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-xs font-bold">만료됨 ({Math.abs(days)}일 지남)</span>;
    if (days === 0) return <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded text-xs font-bold animate-pulse">오늘 만료</span>;
    if (days <= 3) return <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded text-xs font-bold">D-{days}</span>;
    return <span className="text-slate-400 text-xs">D-{days}</span>;
  };

  // Auto Category Prediction
  useEffect(() => {
    setNewItemCat('');

    const trimmedName = newItemName.trim();
    if (!trimmedName) return;

    // 1. Try local heuristics first to save API quota
    const localPrediction = checkLocalHeuristics(trimmedName);
    if (localPrediction) {
      setNewItemCat(localPrediction);
      return;
    }

    // 2. Check Cache
    if (predictionCache.current[trimmedName]) {
      setNewItemCat(predictionCache.current[trimmedName]);
      return;
    }
    
    // 3. Fallback to API with a longer debounce (1000ms) to prevent quota errors
    const timeout = setTimeout(async () => {
      setIsPredictingCat(true);
      try {
        const predicted = await GeminiService.predictCategory(trimmedName, categories);
        if (predicted) {
          setNewItemCat(predicted);
          // Cache the result
          predictionCache.current[trimmedName] = predicted;
        }
      } catch (error) {
        console.error("Prediction failed", error);
      } finally {
        setIsPredictingCat(false);
      }
    }, 1000); 

    return () => clearTimeout(timeout);
  }, [newItemName, categories]);


  // --- Logic Helpers ---

  const generateDefaultDoors = (count: number) => {
    const newDoors: DoorConfig[] = [];
    if (count === 1) {
      newDoors.push({ id: 'd1', name: '메인 냉장고', type: 'fridge' });
    } else if (count === 2) {
      newDoors.push({ id: 'd1', name: '왼쪽 냉장실', type: 'fridge' });
      newDoors.push({ id: 'd2', name: '오른쪽 냉동실', type: 'freezer' });
    } else if (count === 4) {
      newDoors.push({ id: 'd1', name: '상단 왼쪽', type: 'fridge' });
      newDoors.push({ id: 'd2', name: '상단 오른쪽', type: 'fridge' });
      newDoors.push({ id: 'd3', name: '하단 왼쪽', type: 'freezer' });
      newDoors.push({ id: 'd4', name: '하단 오른쪽', type: 'freezer' });
    }
    setConfig(prev => ({ ...prev, doors: newDoors }));
    setNewItemDoor(newDoors[0]?.id || '');
  };

  const handleAddItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newItemName || !newItemCat) return;

    const expiryTimestamp = newItemExpiry ? new Date(newItemExpiry).getTime() : undefined;

    const item: FoodItem = {
      id: Date.now().toString() + Math.random().toString(),
      name: newItemName,
      quantity: newItemQty,
      category: newItemCat,
      doorId: newItemDoor || config.doors[0].id,
      entryDate: Date.now(),
      expirationDate: expiryTimestamp
    };
    setItems(prev => [item, ...prev]);
    // Do not clear state here to prevent modal flashing/reopening perception
    setIsAddItemOpen(false);
    setNewItemExpiry(''); // Reset expiry
  };

  const openEditModal = (item: FoodItem) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditQty(item.quantity);
    setEditCat(item.category);
    setEditDoor(item.doorId);
    setEditExpiry(item.expirationDate ? new Date(item.expirationDate).toISOString().split('T')[0] : '');
    setIsEditItemOpen(true);
  };

  const handleUpdateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    
    const expiryTimestamp = editExpiry ? new Date(editExpiry).getTime() : undefined;

    setItems(prev => prev.map(item => {
      if (item.id === editingItem.id) {
        return {
          ...item,
          name: editName,
          quantity: editQty,
          category: editCat,
          doorId: editDoor,
          expirationDate: expiryTimestamp
        };
      }
      return item;
    }));
    setIsEditItemOpen(false);
    setEditingItem(null);
  };

  const handleVoiceAdd = async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("이 브라우저는 음성 인식을 지원하지 않습니다.");
      return;
    }

    setIsListening(true);
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR'; 
    recognition.start();

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      
      const parsedItems = await GeminiService.parseVoiceInput(transcript, categories);
      
      if (parsedItems.length > 0) {
        const newItems = parsedItems.map(p => {
          let expiryTimestamp = undefined;
          if (p.expirationDate) {
             try {
                expiryTimestamp = new Date(p.expirationDate).getTime();
             } catch (e) { console.warn("Invalid date from AI", e); }
          }
          return {
            id: Date.now().toString() + Math.random().toString(),
            name: p.name || '알 수 없음',
            quantity: p.quantity || 1,
            category: p.category || categories[0],
            doorId: newItemDoor || config.doors[0].id,
            entryDate: Date.now(),
            expirationDate: expiryTimestamp
          };
        });
        setItems(prev => [...newItems, ...prev]);
        setIsAddItemOpen(false);
      }
    };

    recognition.onerror = () => setIsListening(false);
  };

  // --- Voice Search Logic ---
  const handleVoiceSearch = async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("이 브라우저는 음성 검색을 지원하지 않습니다.");
      return;
    }

    setIsVoiceSearching(true);
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR'; 
    recognition.start();

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
      setIsVoiceSearching(false);
    };

    recognition.onerror = () => setIsVoiceSearching(false);
    recognition.onend = () => setIsVoiceSearching(false);
  };

  const updateItemQty = (id: string, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        return newQty <= 0 ? null : { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean) as FoodItem[]);
  };

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const toggleDoorExpansion = (doorId: string) => {
    setExpandedDoors(prev => 
      prev.includes(doorId) ? prev.filter(id => id !== doorId) : [...prev, doorId]
    );
  };

  const getFilteredAndSortedItems = (doorId: string) => {
    let filtered = items.filter(i => i.doorId === doorId);
    
    // Apply Search Query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(query) || 
        item.category.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => {
      switch (sortMode) {
        case 'name': return a.name.localeCompare(b.name);
        case 'oldest': return a.entryDate - b.entryDate;
        case 'recent': return b.entryDate - a.entryDate;
        case 'quantity': return b.quantity - a.quantity;
        case 'expiration': 
          // Items with expiry come first, sorted ASC. Items without expiry come last.
          if (a.expirationDate && b.expirationDate) return a.expirationDate - b.expirationDate;
          if (a.expirationDate) return -1;
          if (b.expirationDate) return 1;
          return 0;
        default: return 0;
      }
    });
  };
  
  const getSortLabel = (mode: SortMode) => {
    switch(mode) {
      case 'recent': return '최신순';
      case 'oldest': return '오래된순';
      case 'name': return '이름순';
      case 'quantity': return '수량순';
      case 'expiration': return '소비기한순';
      default: return mode;
    }
  };

  const readRecipe = (recipe: RecipeSuggestion) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const text = `${recipe.title} 레시피를 읽어드릴게요. ${recipe.description}. 준비물은 ${recipe.ingredients.map(i => i.name).join(', ')} 입니다. 조리 순서는 다음과 같습니다. ${recipe.steps.join('. ')}`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ko-KR';
      window.speechSynthesis.speak(utterance);
    }
  };

  const checkItemRestrictions = (itemName: string) => {
     if (!config.userProfiles || config.userProfiles.length === 0) return null;
     
     const warnings: string[] = [];
     config.userProfiles.forEach(user => {
       const restrictions = user.restrictions.split(',').map(r => r.trim());
       restrictions.forEach(r => {
         if (r && itemName.includes(r)) {
           warnings.push(`${user.name}(${r})`);
         }
       });
     });
     
     if (warnings.length > 0) return warnings.join(', ');
     return null;
  };
  
  const handleHardReset = () => {
    if (resetInput.trim() === config.name.trim()) {
      localStorage.clear();
      window.location.reload();
    } else {
      alert("냉장고 이름이 일치하지 않습니다.");
    }
  };

  const handleAddCategory = () => {
    if (newCategoryInput && !categories.includes(newCategoryInput)) {
      setCategories([...categories, newCategoryInput]);
      setNewCategoryInput('');
    }
  };

  const handleDeleteCategory = (cat: string) => {
    if(confirm(`'${cat}' 카테고리를 삭제하시겠습니까?`)) {
      setCategories(categories.filter(c => c !== cat));
    }
  };

  // --- Export / Import Data ---

  const handleExportData = () => {
    const backup: BackupData = {
      config,
      items,
      categories,
      version: 1,
      timestamp: Date.now()
    };
    
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `smart-fridge-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        // Simple validation
        if (!json.config || !Array.isArray(json.items) || !Array.isArray(json.categories)) {
          throw new Error("잘못된 백업 파일 형식입니다.");
        }

        if (confirm(`백업 파일(${new Date(json.timestamp).toLocaleDateString()} 생성)을 복원하시겠습니까?\n현재 데이터는 모두 덮어씌워집니다.`)) {
           setConfig(json.config);
           setItems(json.items);
           setCategories(json.categories);
           alert("데이터가 성공적으로 복원되었습니다.");
           setIsSettingsOpen(false);
        }
      } catch (error) {
        console.error(error);
        alert("백업 파일을 읽는 중 오류가 발생했습니다. 올바른 JSON 파일인지 확인해주세요.");
      }
      // Reset input so same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // --- Views ---

  if (!config.isSetup) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-2xl w-full p-8 rounded-3xl shadow-xl">
          <div className="text-center mb-8">
            <Refrigerator className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-slate-800">스마트 냉장고 매니저</h1>
            <p className="text-slate-500">패드에 부착하여 사용하는 스마트 식재료 관리 허브입니다.</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">냉장고 이름</label>
              <input 
                type="text" 
                value={config.name}
                onChange={(e) => setConfig({...config, name: e.target.value})}
                className="w-full border-2 border-slate-200 rounded-xl p-4 text-lg focus:border-blue-500 outline-none transition"
                placeholder="예: 우리집 냉장고"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">문 개수 설정</label>
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 4].map(num => (
                  <button
                    key={num}
                    onClick={() => {
                      setConfig({...config, doorCount: num as 1|2|4});
                    }}
                    className={`p-6 rounded-xl border-2 text-xl font-bold transition-all ${
                      config.doorCount === num 
                      ? 'border-blue-500 bg-blue-50 text-blue-600' 
                      : 'border-slate-200 hover:border-blue-200'
                    }`}
                  >
                    {num}개
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                generateDefaultDoors(config.doorCount);
                setConfig(prev => ({ ...prev, isSetup: true }));
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl text-lg shadow-lg shadow-blue-200 transition-all mt-8"
            >
              관리 시작하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Sleep Mode Overlay
  if (isSleepMode) {
    return (
      <div 
        onClick={() => {
          setIsManuallyAwake(true);
          setIsSleepMode(false);
        }}
        className="fixed inset-0 bg-black text-white flex flex-col items-center justify-center cursor-pointer z-50 animate-fade-in"
      >
        <Moon className="w-16 h-16 mb-6 text-slate-600" />
        <div className="text-8xl font-bold font-mono text-slate-400">
           {currentTime.toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className="text-xl text-slate-600 mt-4">
           {currentTime.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}
        </div>
        <p className="mt-12 text-slate-800 animate-pulse">화면을 터치하면 켜집니다</p>
      </div>
    );
  }

  // Header Data
  const year = currentTime.getFullYear();
  const month = currentTime.getMonth() + 1;
  const day = currentTime.getDate();
  const weekday = currentTime.toLocaleDateString('ko-KR', { weekday: 'long' });
  
  const dateStr = `${year}년 ${month}월 ${day}일 ${weekday}`;
  const timeStr = currentTime.toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Add Item Validation
  const isAddItemValid = newItemName.trim().length > 0 && newItemCat.length > 0;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans flex flex-col">
      {/* --- Header --- */}
      <header className="bg-white border-b border-slate-200 px-8 py-6 flex justify-between items-center sticky top-0 z-20">
        {/* Left: Time & Date */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1 opacity-60">
            <Refrigerator className="w-5 h-5" />
            <span className="font-bold text-sm tracking-wide">{config.name}</span>
          </div>
          <div className="text-7xl font-black text-slate-900 font-mono leading-none tracking-tighter">
            {timeStr}
          </div>
          <div className="text-2xl font-bold text-slate-500 mt-2">
            {dateStr}
          </div>
        </div>

        {/* Right: Weather & Settings */}
        <div className="flex items-center gap-8">
          <button 
            onClick={() => setIsWeatherOpen(true)}
            className="flex items-center gap-4 text-right group"
          >
            <div className="flex flex-col items-end">
              <div className="text-5xl font-bold text-slate-800 leading-none group-hover:text-blue-600 transition">
                {weather.temp}°
              </div>
              <div className="text-lg text-slate-500 font-medium flex items-center gap-1">
                {weather.condition}
                <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-400">
                   {weather.pm25}
                </span>
              </div>
            </div>
            <div className="group-hover:scale-110 transition duration-300">
              {getWeatherIcon("w-16 h-16")}
            </div>
          </button>

          <div className="w-px h-16 bg-slate-200"></div>

          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-4 hover:bg-slate-50 rounded-2xl transition group"
          >
            <Settings className="w-8 h-8 text-slate-400 group-hover:text-slate-800 group-hover:rotate-45 transition duration-300" />
          </button>
        </div>
      </header>

      {/* --- Main Content --- */}
      <main className="flex-1 p-6 overflow-hidden flex flex-col gap-6">
        
        {/* Top Section: AI Recommendations */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <ChefHat className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                <ChefHat className="w-6 h-6" />
                AI 셰프 추천 메뉴
                {isGeneratingRecipes && <span className="text-sm font-normal opacity-75 animate-pulse ml-2">생각 중...</span>}
                {!isGeneratingRecipes && items.length > 0 && (
                   <button 
                     onClick={fetchRecipes}
                     className="p-1.5 bg-white/20 hover:bg-white/30 rounded-full transition ml-auto flex items-center gap-1 text-sm font-normal"
                     title="레시피 새로고침"
                   >
                     <RefreshCw className="w-4 h-4 text-white" />
                     새로고침
                   </button>
                )}
              </h2>
              
              {recipes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {recipes.map((recipe, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => setSelectedRecipe(recipe)}
                      className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 hover:bg-white/20 transition cursor-pointer relative group"
                    >
                      <div className="flex justify-between items-start mb-2">
                         <span className="text-xs font-bold bg-indigo-800/50 px-2 py-1 rounded text-indigo-100">
                           {recipe.timeOfDay}
                         </span>
                         {recipe.warning && (
                           <AlertCircle className="w-5 h-5 text-red-300 animate-pulse" />
                         )}
                      </div>
                      <h3 className="font-bold text-lg mb-2 leading-tight">{recipe.title}</h3>
                      {/* Description removed for compactness */}
                      <div className="flex items-center gap-2 text-xs opacity-80">
                         <span>🔥 {recipe.calories} kcal</span>
                         <span>•</span>
                         <span>재료 {recipe.matchPercentage}% 활용</span>
                      </div>
                      <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition rounded-xl" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-4">
                   <p className="opacity-90">냉장고에 식재료를 추가하여 가족을 위한 맞춤 메뉴를 추천받아보세요!</p>
                   <button onClick={fetchRecipes} className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-50 transition">
                     메뉴 추천받기
                   </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search & Sorting & Global Controls */}
        <div className="bg-white p-3 rounded-2xl shadow-sm flex flex-col xl:flex-row gap-4 items-center">
          {/* Search Bar */}
          <div className="flex-1 w-full relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="식재료 또는 카테고리 검색..."
              className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition"
            />
            <button 
              onClick={handleVoiceSearch}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition ${
                isVoiceSearching ? 'text-red-500 bg-red-50 animate-pulse' : 'text-slate-400 hover:text-blue-500 hover:bg-blue-50'
              }`}
              title="음성 검색"
            >
              <Mic className="w-5 h-5" />
            </button>
          </div>

          <div className="flex gap-2 w-full xl:w-auto overflow-x-auto pb-1 xl:pb-0 justify-start xl:justify-end">
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
              {(['recent', 'oldest', 'name', 'quantity', 'expiration'] as SortMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setSortMode(mode)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                    sortMode === mode ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {getSortLabel(mode)}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setIsCategoryManagerOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-xl shrink-0"
            >
              <LayoutGrid className="w-4 h-4" />
              카테고리 관리
            </button>
          </div>
        </div>

        {/* Fridge Grid Layout */}
        <div className={`grid gap-6 flex-1 min-h-0 ${
          config.doorCount === 1 ? 'grid-cols-1' :
          config.doorCount === 2 ? 'grid-cols-2' :
          'grid-cols-2 grid-rows-2'
        }`}>
          {config.doors.map((door) => {
            const allItems = getFilteredAndSortedItems(door.id);
            const isExpanded = expandedDoors.includes(door.id);
            // If searching, show all matches. If not searching, use expand logic.
            const shouldShowAll = isExpanded || searchQuery.trim().length > 0;
            const visibleItems = shouldShowAll ? allItems : allItems.slice(0, 5);
            
            return (
              <div key={door.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
                {/* Door Header */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <div 
                    onClick={() => toggleDoorExpansion(door.id)}
                    className="flex items-center gap-2 cursor-pointer hover:opacity-70 transition flex-1"
                  >
                    <div className={`p-2 rounded-lg ${door.type === 'freezer' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                      {door.type === 'freezer' ? <Snowflake className="w-5 h-5" /> : <Refrigerator className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                         <h3 className="font-bold text-slate-700">{door.name}</h3>
                         {!searchQuery && (isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />)}
                      </div>
                      <p className="text-xs text-slate-400">
                        {allItems.length}개 품목 {allItems.length > 5 && !shouldShowAll ? '(5개만 표시됨)' : ''}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setNewItemName('');
                      setNewItemCat('');
                      setNewItemQty(1);
                      setNewItemDoor(door.id);
                      setNewItemExpiry('');
                      setIsAddItemOpen(true);
                    }}
                    className="px-4 py-2 bg-slate-800 text-white border border-slate-800 rounded-xl hover:bg-slate-700 transition shadow-sm font-bold text-sm flex items-center gap-2"
                  >
                    <PackagePlus className="w-4 h-4" /> 보관
                  </button>
                </div>

                {/* Door Content List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {visibleItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300">
                      <Search className="w-12 h-12 mb-2 opacity-20" />
                      <p>{searchQuery ? '검색 결과 없음' : '비어있음'}</p>
                    </div>
                  ) : (
                    visibleItems.map(item => {
                      const restrictionWarning = checkItemRestrictions(item.name);
                      const daysUntilExpiry = getDaysUntilExpiration(item.expirationDate);
                      
                      return (
                        <div key={item.id} className="bg-white border border-slate-100 rounded-2xl p-3 flex justify-between items-center hover:shadow-md transition group relative">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-lg shrink-0">
                              {getCategoryIcon(item.category)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-slate-800">{item.name}</p>
                                {restrictionWarning && (
                                  <div className="group/warn relative">
                                    <AlertCircle className="w-4 h-4 text-red-500" />
                                    <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 w-max bg-red-600 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover/warn:opacity-100 transition z-20">
                                      {restrictionWarning} 섭취 주의
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <p className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full inline-block">{item.category}</p>
                                {daysUntilExpiry !== null && (
                                  <div className="flex items-center gap-1">
                                     {getExpirationBadge(daysUntilExpiry)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center bg-slate-50 rounded-lg p-1">
                              <button 
                                onClick={() => updateItemQty(item.id, -1)}
                                className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-md transition text-slate-500"
                              >
                                -
                              </button>
                              <span className="w-8 text-center font-bold text-slate-700">{item.quantity}</span>
                              <button 
                                onClick={() => updateItemQty(item.id, 1)}
                                className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-md transition text-slate-500"
                              >
                                +
                              </button>
                            </div>
                            <button
                              onClick={() => openEditModal(item)}
                              className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition"
                            >
                              <Pencil className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => deleteItem(item.id)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                  {allItems.length > 5 && !shouldShowAll && (
                     <button 
                       onClick={() => toggleDoorExpansion(door.id)}
                       className="w-full text-center text-sm text-slate-500 py-2 hover:bg-slate-50 rounded-xl"
                     >
                       + {allItems.length - 5}개 더보기
                     </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* --- Add Item Modal --- */}
      {isAddItemOpen && (
        <Modal title="새로운 식재료 보관하기" onClose={() => setIsAddItemOpen(false)}>
          <div className="space-y-6">
            
            {/* Voice Input Trigger */}
            <div className="flex justify-center">
              <button
                onClick={handleVoiceAdd}
                disabled={isListening}
                className={`flex flex-col items-center justify-center w-32 h-32 rounded-full transition-all ${
                  isListening 
                  ? 'bg-red-100 text-red-600 animate-pulse border-4 border-red-200' 
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-4 border-transparent'
                }`}
              >
                <Mic className={`w-10 h-10 mb-2 ${isListening ? 'animate-bounce' : ''}`} />
                <span className="text-xs font-bold">{isListening ? '듣고 있어요...' : '터치하여 말하기'}</span>
              </button>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">또는 직접 입력하기</span>
              </div>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">식재료</label>
                <div className="relative">
                  <input 
                    autoFocus
                    type="text" 
                    value={newItemName}
                    onChange={e => setNewItemName(e.target.value)}
                    className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none pr-10"
                    placeholder="예: 우유, 사과"
                  />
                  {isPredictingCat && (
                    <div className="absolute right-3 top-3.5 animate-spin">
                      <Clock className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">수량</label>
                  <input 
                    type="number" 
                    min="1"
                    value={newItemQty}
                    onChange={e => setNewItemQty(parseInt(e.target.value))}
                    className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">카테고리</label>
                  <select 
                    value={newItemCat}
                    onChange={e => setNewItemCat(e.target.value)}
                    className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="" disabled>카테고리 선택</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">보관 위치</label>
                    <select
                      value={newItemDoor}
                      onChange={e => setNewItemDoor(e.target.value)}
                      className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      {config.doors.map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.type === 'fridge' ? '냉장' : '냉동'})</option>
                      ))}
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">소비기한 (선택)</label>
                    <input 
                      type="date" 
                      value={newItemExpiry}
                      onChange={e => setNewItemExpiry(e.target.value)}
                      className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    />
                 </div>
              </div>

              <button 
                type="submit" 
                disabled={!isAddItemValid}
                className={`w-full py-4 rounded-xl font-bold text-lg transition ${
                   isAddItemValid 
                   ? 'bg-slate-900 text-white hover:bg-slate-800' 
                   : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
              >
                보관하기
              </button>
            </form>
          </div>
        </Modal>
      )}

      {/* --- Edit Item Modal --- */}
      {isEditItemOpen && (
        <Modal title="식재료 정보 수정" onClose={() => setIsEditItemOpen(false)}>
           <form onSubmit={handleUpdateItem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">식재료</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">수량</label>
                  <input 
                    type="number" 
                    min="1"
                    value={editQty}
                    onChange={e => setEditQty(parseInt(e.target.value))}
                    className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">카테고리</label>
                  <select 
                    value={editCat}
                    onChange={e => setEditCat(e.target.value)}
                    className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">보관 위치</label>
                    <select
                      value={editDoor}
                      onChange={e => setEditDoor(e.target.value)}
                      className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      {config.doors.map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.type === 'fridge' ? '냉장' : '냉동'})</option>
                      ))}
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">소비기한</label>
                    <input 
                      type="date" 
                      value={editExpiry}
                      onChange={e => setEditExpiry(e.target.value)}
                      className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    />
                 </div>
              </div>

              <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition">
                수정 완료
              </button>
            </form>
        </Modal>
      )}

      {/* --- Recipe Detail Modal --- */}
      {selectedRecipe && (
        <Modal title={selectedRecipe.title} onClose={() => {
           window.speechSynthesis.cancel(); 
           setSelectedRecipe(null);
        }}>
          <div className="space-y-6">
            {selectedRecipe.warning && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
                 <AlertCircle className="w-6 h-6 shrink-0" />
                 <div>
                   <h4 className="font-bold">주의: 식이 제한 알림</h4>
                   <p className="text-sm">{selectedRecipe.warning}</p>
                 </div>
              </div>
            )}

            <div className="flex justify-between items-start">
               <div>
                  <p className="text-gray-600 mb-2">{selectedRecipe.description}</p>
                  <div className="flex gap-4 text-sm text-gray-500">
                     <span>🔥 {selectedRecipe.calories} kcal</span>
                     <span>🕒 {selectedRecipe.timeOfDay} 메뉴</span>
                  </div>
               </div>
               <div className="flex gap-2">
                 <button 
                   onClick={() => readRecipe(selectedRecipe)}
                   className="p-3 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition"
                   title="레시피 읽어주기"
                 >
                   <Volume2 className="w-6 h-6" />
                 </button>
                 <a 
                   href={`https://www.youtube.com/results?search_query=${encodeURIComponent(selectedRecipe.youtubeQuery || selectedRecipe.title)}`}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="p-3 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition flex items-center justify-center"
                   title="유튜브 영상 검색"
                 >
                   <Youtube className="w-6 h-6" />
                 </a>
               </div>
            </div>
            
            <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <Youtube className="w-8 h-8 text-red-600" />
                  <div>
                    <h4 className="font-bold text-slate-800">이 요리, 영상으로 배워보세요</h4>
                    <p className="text-sm text-slate-500">인기 유튜브 조리법 영상을 찾아드립니다.</p>
                  </div>
               </div>
               <a 
                   href={`https://www.youtube.com/results?search_query=${encodeURIComponent(selectedRecipe.youtubeQuery || selectedRecipe.title)}`}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm transition shadow-sm"
               >
                 영상 보기
               </a>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3 border-b pb-2">
                <h3 className="font-bold text-lg">준비물</h3>
                <div className="flex gap-4 text-xs font-medium">
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div>보유 중</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div>구매 필요</span>
                </div>
              </div>
              <ul className="grid grid-cols-3 gap-2">
                {selectedRecipe.ingredients.map((ing, i) => (
                  <li key={i} className="flex items-center gap-2 text-gray-700 bg-slate-50 p-2 rounded-lg text-sm">
                    <div className={`shrink-0 w-2 h-2 rounded-full ${ing.isAvailable ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className={`truncate ${!ing.isAvailable ? 'text-red-600 font-medium' : ''}`}>
                      {ing.name}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-3 border-b pb-2">상세 조리 순서</h3>
              <ol className="space-y-6">
                {selectedRecipe.steps.map((step, i) => (
                   <li key={i} className="flex gap-4">
                     <span className="flex-shrink-0 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-sm">{i+1}</span>
                     <p className="text-gray-700 mt-1 leading-relaxed">{step}</p>
                   </li>
                ))}
              </ol>
            </div>
          </div>
        </Modal>
      )}

      {/* --- Weather Modal --- */}
      {isWeatherOpen && (
        <Modal title="현재 날씨 상세" onClose={() => setIsWeatherOpen(false)}>
          <div className="text-center py-6">
            {getWeatherLargeIcon()}
            <div className="text-5xl font-bold text-slate-800 mb-2">{weather.temp}°C</div>
            <div className="text-xl text-slate-500 mb-8">{weather.condition}</div>
            
            <div className="grid grid-cols-3 gap-4 mb-8">
               <div className="bg-slate-50 p-4 rounded-xl">
                  <Droplets className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                  <div className="text-sm text-gray-400">습도</div>
                  <div className="font-bold">{weather.humidity}%</div>
               </div>
               <div className="bg-slate-50 p-4 rounded-xl">
                  <Wind className="w-6 h-6 text-cyan-500 mx-auto mb-2" />
                  <div className="text-sm text-gray-400">바람</div>
                  <div className="font-bold">{weather.wind}</div>
               </div>
               <div className="bg-slate-50 p-4 rounded-xl">
                  <CloudRain className="w-6 h-6 text-gray-500 mx-auto mb-2" />
                  <div className="text-sm text-gray-400">미세먼지</div>
                  <div className={`font-bold ${weather.pm25 === '좋음' || weather.pm25 === '보통' ? 'text-green-600' : 'text-red-600'}`}>{weather.pm25}</div>
               </div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-xl text-blue-800">
               {weather.forecast}
            </div>
          </div>
        </Modal>
      )}

      {/* --- Category Manager Modal --- */}
      {isCategoryManagerOpen && (
        <Modal title="카테고리 관리" onClose={() => setIsCategoryManagerOpen(false)}>
           <div className="space-y-4">
             <div className="flex gap-2">
               <input 
                 type="text" 
                 value={newCategoryInput}
                 onChange={e => setNewCategoryInput(e.target.value)}
                 className="flex-1 border rounded-xl p-3 focus:outline-none focus:border-blue-500"
                 placeholder="새 카테고리 이름"
               />
               <button 
                 onClick={handleAddCategory}
                 disabled={!newCategoryInput.trim()}
                 className={`px-4 rounded-xl font-bold text-white transition ${
                   newCategoryInput.trim() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300'
                 }`}
               >
                 추가
               </button>
             </div>
             
             <div className="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
               {categories.map(cat => (
                 <div key={cat} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                   <span className="font-medium text-slate-700">{cat}</span>
                   <button 
                     onClick={() => handleDeleteCategory(cat)}
                     className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                     title="삭제"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                 </div>
               ))}
             </div>
           </div>
        </Modal>
      )}

      {/* --- Settings Modal --- */}
      {isSettingsOpen && (
        <Modal title="냉장고 설정" onClose={() => {
           setIsSettingsOpen(false);
           setShowResetVerify(false);
           setResetInput('');
        }}>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                <Refrigerator className="w-5 h-5" /> 문 설정
              </h3>
              <div className="space-y-3">
                {config.doors.map(door => (
                  <div key={door.id} className="flex gap-2 items-center">
                    <input 
                      type="text" 
                      value={door.name}
                      onChange={(e) => {
                        const newDoors = config.doors.map(d => d.id === door.id ? {...d, name: e.target.value} : d);
                        setConfig({...config, doors: newDoors});
                      }}
                      className="flex-1 border rounded-lg p-2 text-sm"
                    />
                    <select
                      value={door.type}
                      onChange={(e) => {
                        const newDoors = config.doors.map(d => d.id === door.id ? {...d, type: e.target.value as DoorType} : d);
                        setConfig({...config, doors: newDoors});
                      }}
                      className="border rounded-lg p-2 text-sm bg-white"
                    >
                      <option value="fridge">냉장실</option>
                      <option value="freezer">냉동실</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="pt-4 border-t">
               <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                 <Bell className="w-5 h-5" /> 알림 설정
               </h3>
               <div className="bg-slate-50 p-4 rounded-xl flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-slate-700">소비기한 임박 알림</h4>
                    <p className="text-sm text-slate-500">소비기한 3일 전부터 매일 알림을 보냅니다.</p>
                  </div>
                  <button 
                    onClick={requestNotificationPermission}
                    disabled={notificationPermission === 'granted'}
                    className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 ${
                      notificationPermission === 'granted' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {notificationPermission === 'granted' ? (
                      <><Check className="w-4 h-4" /> 알림 켜짐</>
                    ) : (
                      <><Bell className="w-4 h-4" /> 알림 켜기</>
                    )}
                  </button>
               </div>
               {notificationPermission === 'denied' && (
                 <p className="text-xs text-red-500 mt-2 px-1">⚠️ 브라우저 설정에서 알림 권한이 차단되었습니다. 설정을 변경해주세요.</p>
               )}
            </div>

            <div className="pt-4 border-t">
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                <User className="w-5 h-5" /> 가족 및 식이 제한
              </h3>
              <div className="space-y-4">
                {config.userProfiles.map(profile => (
                  <div key={profile.id} className="bg-slate-50 p-3 rounded-xl flex items-start gap-2">
                     <div className="flex-1 space-y-2">
                        <input 
                          type="text" 
                          placeholder="이름 (예: 아빠)" 
                          value={profile.name}
                          onChange={(e) => {
                            const newProfiles = config.userProfiles.map(p => p.id === profile.id ? {...p, name: e.target.value} : p);
                            setConfig({...config, userProfiles: newProfiles});
                          }}
                          className="w-full border rounded p-1 text-sm font-bold"
                        />
                        <input 
                          type="text" 
                          placeholder="못 먹는 음식 (예: 우유, 땅콩)" 
                          value={profile.restrictions}
                          onChange={(e) => {
                            const newProfiles = config.userProfiles.map(p => p.id === profile.id ? {...p, restrictions: e.target.value} : p);
                            setConfig({...config, userProfiles: newProfiles});
                          }}
                          className="w-full border rounded p-1 text-sm text-red-600 bg-red-50/50 placeholder-red-200"
                        />
                     </div>
                     <button 
                       onClick={() => {
                         const newProfiles = config.userProfiles.filter(p => p.id !== profile.id);
                         setConfig({...config, userProfiles: newProfiles});
                       }}
                       className="p-1 text-gray-400 hover:text-red-500"
                     >
                       <X className="w-4 h-4" />
                     </button>
                  </div>
                ))}
                <button 
                  onClick={() => {
                    const newProfile: UserProfile = { id: Date.now().toString(), name: '', restrictions: '' };
                    setConfig({...config, userProfiles: [...config.userProfiles, newProfile]});
                  }}
                  className="w-full py-2 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-blue-500 hover:text-blue-500 flex items-center justify-center gap-2 font-bold"
                >
                  <UserPlus className="w-4 h-4" /> 가족 구성원 추가
                </button>
              </div>
            </div>
            
            <div className="pt-4 border-t">
               <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                 <Settings className="w-5 h-5" /> 데이터 관리
               </h3>
               <div className="flex gap-4">
                 <button 
                   onClick={handleExportData}
                   className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition"
                 >
                   <Download className="w-5 h-5" />
                   백업 (내보내기)
                 </button>
                 <button 
                   onClick={handleImportClick}
                   className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition"
                 >
                   <Upload className="w-5 h-5" />
                   복원 (가져오기)
                 </button>
                 <input 
                   type="file" 
                   ref={fileInputRef} 
                   onChange={handleFileChange} 
                   accept=".json" 
                   className="hidden" 
                 />
               </div>
            </div>

            <div className="pt-4 border-t">
               {!showResetVerify ? (
                 <button 
                   onClick={() => setShowResetVerify(true)}
                   className="text-red-500 text-sm hover:underline w-full text-left font-bold"
                 >
                   ⚠️ 모든 데이터 초기화
                 </button>
               ) : (
                 <div className="bg-red-50 p-4 rounded-xl border border-red-100 space-y-3 animate-fade-in">
                    <h4 className="font-bold text-red-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      데이터 초기화 확인
                    </h4>
                    <p className="text-sm text-red-600">
                      초기화하려면 현재 냉장고 이름 <strong>"{config.name}"</strong>을(를) 정확히 입력하세요.
                    </p>
                    <input 
                      type="text" 
                      value={resetInput}
                      onChange={e => setResetInput(e.target.value)}
                      className="w-full border border-red-200 rounded-lg p-2 text-sm focus:outline-none focus:border-red-500"
                      placeholder={config.name}
                    />
                    <div className="flex gap-2">
                      <button 
                        onClick={handleHardReset}
                        disabled={resetInput.trim() !== config.name.trim()}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold text-white transition ${
                          resetInput.trim() === config.name.trim() ? 'bg-red-600 hover:bg-red-700 shadow-md' : 'bg-gray-300 cursor-not-allowed'
                        }`}
                      >
                        초기화 실행
                      </button>
                      <button 
                        onClick={() => {
                          setShowResetVerify(false);
                          setResetInput('');
                        }}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                      >
                        취소
                      </button>
                    </div>
                 </div>
               )}
            </div>

            <button onClick={() => setIsSettingsOpen(false)} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-200">
              변경사항 저장
            </button>
          </div>
        </Modal>
      )}

    </div>
  );
}