
import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, Plus, Trash2, Mic, ChefHat, 
  Thermometer, Calendar, LayoutGrid, Refrigerator,
  ArrowUpAZ, Clock, Edit2, X, Check, Save,
  Snowflake, Sun, Search, CloudRain, Wind, Droplets,
  Volume2, AlertCircle, UserPlus, User, PackagePlus,
  Moon, ShoppingCart, ChevronDown, ChevronUp, Pencil,
  RefreshCw, Cloud, CloudLightning, Download, Upload,
  CalendarDays, Hourglass, AlertTriangle, Bell, BellOff, Youtube, Camera, ScanLine, GripVertical,
  Archive, Box, MoveHorizontal, ChevronsLeft, ChevronsRight, CheckSquare, Square
} from 'lucide-react';
import { FridgeConfig, DoorConfig, FoodItem, SortMode, DoorType, UserProfile, RecipeSuggestion, WeatherData, BackupData, Fridge } from './types';
import { DEFAULT_CATEGORIES, MOCK_WEATHER } from './constants';
import * as GeminiService from './services/geminiService';
import * as WeatherService from './services/weatherService';

// --- Helper Components ---

interface ModalProps {
  children?: React.ReactNode;
  onClose: () => void;
  title: string;
  zIndexClass?: string;
  maxWidthClass?: string;
}

const Modal = ({ children, onClose, title, zIndexClass = "z-50", maxWidthClass = "max-w-lg" }: ModalProps) => (
  <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 ${zIndexClass}`}>
    <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidthClass} max-h-[90vh] overflow-hidden animate-fade-in flex flex-col`}>
      <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0">
        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
          <X className="w-6 h-6 text-gray-500" />
        </button>
      </div>
      <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
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
    let parsed: any = saved ? JSON.parse(saved) : { name: '나의 스마트 냉장고', doorCount: 2, doors: [], isSetup: false };
    
    // Migration Logic: Convert old single-fridge config to multi-fridge config
    if (!parsed.fridges || parsed.fridges.length === 0) {
      if (parsed.isSetup && parsed.doors && parsed.doors.length > 0) {
         const mainFridge: Fridge = {
           id: 'main-fridge-' + Date.now(),
           name: parsed.name || '메인 냉장고',
           doorCount: parsed.doorCount || 2,
           doors: parsed.doors
         };
         parsed.fridges = [mainFridge];
      } else {
        parsed.fridges = [];
      }
    }
    
    if (!parsed.userProfiles) parsed.userProfiles = [];
    return parsed as FridgeConfig;
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
  
  // Selected Fridge State
  const [selectedFridgeId, setSelectedFridgeId] = useState<string>(() => {
    return config.fridges.length > 0 ? config.fridges[0].id : '';
  });

  // Ensure selectedFridgeId is valid if config changes
  useEffect(() => {
    if (config.fridges.length > 0 && !config.fridges.find(f => f.id === selectedFridgeId)) {
      setSelectedFridgeId(config.fridges[0].id);
    }
  }, [config.fridges]);

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

  // Delete Item State (Modal)
  const [itemToDelete, setItemToDelete] = useState<{ id: string, name: string } | null>(null);

  // Delete Fridge State (Modal)
  const [fridgeToDelete, setFridgeToDelete] = useState<string | null>(null);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');

  // Add Fridge State (Inside Settings)
  const [isAddingFridge, setIsAddingFridge] = useState(false);
  const [newFridgeName, setNewFridgeName] = useState('');
  const [newFridgeDoorCount, setNewFridgeDoorCount] = useState<1|2|3|4>(2);

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

  // Receipt Scan State
  const [isAnalyzingReceipt, setIsAnalyzingReceipt] = useState(false);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  // Drag and Drop State
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  // Settings Reset & Backup State
  const [showResetVerify, setShowResetVerify] = useState(false);
  const [resetInput, setResetInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [settingsTab, setSettingsTab] = useState<'fridges' | 'profiles' | 'data'>('fridges');

  // Notification State
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'default'
  );

  // Move Items Modal State
  const [isMoveItemsModalOpen, setIsMoveItemsModalOpen] = useState(false);
  const [moveSourceFridgeId, setMoveSourceFridgeId] = useState('');
  const [moveTargetFridgeId, setMoveTargetFridgeId] = useState('');
  const [moveSearchQuery, setMoveSearchQuery] = useState('');
  const [checkedSourceItems, setCheckedSourceItems] = useState<Set<string>>(new Set());
  const [checkedTargetItems, setCheckedTargetItems] = useState<Set<string>>(new Set());

  // Cache for category predictions to save API calls
  const predictionCache = useRef<Record<string, string>>({});

  // --- UI Helpers ---

  const getCategoryIcon = (category: string) => {
    if (category.includes('잎채소')) return '🥬';
    if (category.includes('뿌리')) return '🥕';
    if (category.includes('열매')) return '🌶️';
    if (category.includes('버섯')) return '🍄';
    if (category.includes('열대')) return '🍌';
    if (category.includes('과일')) return '🍎';
    if (category.includes('소고기')) return '🥩';
    if (category.includes('돼지')) return '🥓';
    if (category.includes('닭')) return '🍗';
    if (category.includes('생선')) return '🐟';
    if (category.includes('우유')) return '🥛';
    if (category.includes('계란')) return '🥚';
    if (category.includes('두부')) return '🧊';
    if (category.includes('김치')) return '🥬';
    if (category.includes('반찬')) return '🍱';
    if (category.includes('소스')) return '🧂';
    if (category.includes('음료')) return '🥤';
    if (category.includes('빵')) return '🍞';
    if (category.includes('냉동')) return '🧊';
    if (category.includes('아이스크림')) return '🍦';
    return '📦';
  };

  const getWeatherIcon = (className: string) => {
    const code = weather.code;
    if (code === undefined) {
      if (weather.condition.includes('맑음')) return <Sun className={`${className} text-orange-500`} />;
      if (weather.condition.includes('구름') || weather.condition.includes('흐림')) return <Cloud className={`${className} text-gray-400`} />;
      if (weather.condition.includes('비')) return <CloudRain className={`${className} text-blue-400`} />;
      if (weather.condition.includes('눈')) return <Snowflake className={`${className} text-cyan-300`} />;
      return <Sun className={`${className} text-orange-500`} />;
    }

    if (code === 0 || code === 1) return <Sun className={`${className} text-orange-500`} />;
    if (code <= 3) return <Cloud className={`${className} text-gray-400`} />;
    if (code <= 48) return <Wind className={`${className} text-gray-400`} />;
    if (code <= 67 || (code >= 80 && code <= 82)) return <CloudRain className={`${className} text-blue-400`} />;
    if (code <= 77 || code >= 85) return <Snowflake className={`${className} text-cyan-300`} />;
    if (code >= 95) return <CloudLightning className={`${className} text-purple-500`} />;
    
    return <Sun className={`${className} text-orange-500`} />;
  };

  const getWeatherLargeIcon = () => {
     return getWeatherIcon("w-32 h-32 mx-auto mb-4 animate-bounce");
  };

  const getExpirationBadge = (days: number) => {
    if (days < 0) {
      return <span className="px-2 py-0.5 rounded text-xs font-bold bg-gray-800 text-white">만료됨</span>;
    } else if (days === 0) {
      return <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-600 animate-pulse">D-Day</span>;
    } else if (days <= 3) {
      return <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-600">D-{days}</span>;
    } else if (days <= 7) {
      return <span className="px-2 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-600">D-{days}</span>;
    } else {
      return <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-600">D-{days}</span>;
    }
  };

  // Persistence
  useEffect(() => localStorage.setItem('fridge_config', JSON.stringify(config)), [config]);
  useEffect(() => localStorage.setItem('fridge_items', JSON.stringify(items)), [items]);
  useEffect(() => localStorage.setItem('fridge_categories', JSON.stringify(categories)), [categories]);

  // Clock Tick & Sleep Mode Logic
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      const hour = now.getHours();
      const shouldSleep = hour >= 22 || hour < 7;
      
      if (shouldSleep && !isManuallyAwake) {
        setIsSleepMode(true);
      } else if (!shouldSleep) {
        setIsSleepMode(false);
        setIsManuallyAwake(false); 
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isManuallyAwake]);

  useEffect(() => {
    let sleepTimer: ReturnType<typeof setTimeout>;
    if (isManuallyAwake && (currentTime.getHours() >= 22 || currentTime.getHours() < 7)) {
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
          }
        },
        (error) => {
          console.warn("Location access denied, using mock weather", error);
        }
      );
    }
  }, []);

  // --- Logic Helpers ---

  const generateDefaultDoors = (count: number): DoorConfig[] => {
    const timestamp = Date.now();
    if (count === 1) {
      return [{ id: 'd1-' + timestamp, name: '메인', type: 'fridge' }];
    } else if (count === 2) {
      return [
        { id: 'd1-' + timestamp, name: '왼쪽 (냉장)', type: 'fridge' },
        { id: 'd2-' + timestamp, name: '오른쪽 (냉동)', type: 'freezer' }
      ];
    } else if (count === 3) {
      return [
        { id: 'd1-' + timestamp, name: '상단', type: 'fridge' },
        { id: 'd2-' + timestamp, name: '하단 좌 (냉동)', type: 'freezer' },
        { id: 'd3-' + timestamp, name: '하단 우 (상온)', type: 'pantry' }
      ];
    } else if (count === 4) {
      return [
        { id: 'd1-' + timestamp, name: '상단 좌', type: 'fridge' },
        { id: 'd2-' + timestamp, name: '상단 우', type: 'fridge' },
        { id: 'd3-' + timestamp, name: '하단 좌', type: 'freezer' },
        { id: 'd4-' + timestamp, name: '하단 우', type: 'freezer' }
      ];
    }
    return [];
  };

  // Initial Setup Logic
  const setupFirstFridge = (name: string, doorCount: 1|2|3|4) => {
     const doors = generateDefaultDoors(doorCount);
     const newFridge: Fridge = {
        id: 'fridge-' + Date.now(),
        name,
        doorCount,
        doors
     };
     setConfig(prev => ({ ...prev, fridges: [newFridge], isSetup: true }));
     setSelectedFridgeId(newFridge.id);
  };

  // --- Fridge Management Logic ---

  const handleStartAddFridge = () => {
    setIsAddingFridge(true);
    setNewFridgeName('새 냉장고');
    setNewFridgeDoorCount(2);
  };

  const handleSubmitAddFridge = () => {
    if (!newFridgeName.trim()) {
      alert("냉장고 이름을 입력해주세요.");
      return;
    }
    
    const doors = generateDefaultDoors(newFridgeDoorCount);
    const newFridge: Fridge = {
      id: 'fridge-' + Date.now(),
      name: newFridgeName,
      doorCount: newFridgeDoorCount,
      doors
    };
    
    setConfig(prev => ({ ...prev, fridges: [...prev.fridges, newFridge] }));
    if (!selectedFridgeId) setSelectedFridgeId(newFridge.id);
    
    // Reset state
    setIsAddingFridge(false);
    setNewFridgeName('');
  };

  const handleDeleteFridge = (id: string) => {
    if (config.fridges.length <= 1) {
      alert("최소 하나의 냉장고는 있어야 합니다.");
      return;
    }
    setDeleteConfirmationInput('');
    setFridgeToDelete(id);
  };

  const confirmDeleteFridge = () => {
    if (!fridgeToDelete) return;
    
    // Filter out items in this fridge
    const fridge = config.fridges.find(f => f.id === fridgeToDelete);
    if (fridge) {
      const doorIds = fridge.doors.map(d => d.id);
      setItems(prev => prev.filter(i => !doorIds.includes(i.doorId)));
    }
    
    setConfig(prev => ({ ...prev, fridges: prev.fridges.filter(f => f.id !== fridgeToDelete) }));
    if (selectedFridgeId === fridgeToDelete) {
      const nextFridge = config.fridges.find(f => f.id !== fridgeToDelete);
      if (nextFridge) setSelectedFridgeId(nextFridge.id);
    }
    setFridgeToDelete(null);
    setDeleteConfirmationInput('');
  };

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
       
       if (lastSent === todayStr) return;
       
       const expiring = items.filter(i => {
         if (!i.expirationDate) return false;
         const days = getDaysUntilExpiration(i.expirationDate);
         return days !== null && days <= 3; 
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
    
    const timer = setTimeout(checkExpirations, 3000); 
    const interval = setInterval(checkExpirations, 60 * 60 * 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [items, notificationPermission]);

  // --- Helpers for Category Prediction & Icons ---
  const checkLocalHeuristics = (name: string): string | null => {
    const n = name.replace(/\s+/g, '');
    if (n.includes('양배추')) return categories.find(c => c.includes('잎채소')) || '잎채소 (상추/깻잎 등)';
    if (n.includes('배추') || n.includes('김치') || n.includes('깍두기')) return categories.find(c => c.includes('김치')) || '김치/절임배추';
    if (n.includes('아이스크림')) return categories.find(c => c.includes('아이스크림')) || '아이스크림';
    if (n.includes('양파') || n.includes('마늘') || n.includes('감자') || n.includes('당근') || n.includes('고구마') || n.includes('무')) return categories.find(c => c.includes('뿌리채소')) || '뿌리채소 (감자/당근 등)';
    if (n.includes('대파') || n.includes('쪽파') || n.includes('상추') || n.includes('깻잎') || n.includes('시금치')) return categories.find(c => c.includes('잎채소')) || '잎채소 (상추/깻잎 등)';
    if (n.includes('고추') || n.includes('오이') || n.includes('호박') || n.includes('토마토') || n.includes('가지')) return categories.find(c => c.includes('열매채소')) || '열매채소 (고추/오이 등)';
    if (n.includes('버섯')) return categories.find(c => c.includes('버섯')) || '버섯류';
    if (n.includes('사과') || n.includes('배') || n.includes('포도') || n.includes('딸기') || n.includes('바나나') || n.includes('귤')) return categories.find(c => c.includes('과일')) || '과일 (사과/배 등)';
    if (n.includes('소고기') || n.includes('한우')) return categories.find(c => c.includes('소고기')) || '소고기';
    if (n.includes('돼지') || n.includes('삼겹살')) return categories.find(c => c.includes('돼지')) || '돼지고기';
    if (n.includes('닭') || n.includes('치킨')) return categories.find(c => c.includes('닭')) || '닭/오리고기';
    if (n.includes('생선') || n.includes('고등어') || n.includes('오징어')) return categories.find(c => c.includes('생선')) || '생선/해산물';
    if (n.includes('우유') || n.includes('치즈') || n.includes('요거트')) return categories.find(c => c.includes('우유')) || '우유/유제품';
    if (n.includes('계란') || n.includes('달걀')) return categories.find(c => c.includes('계란')) || '계란/알류';
    if (n.includes('두부') || n.includes('콩나물')) return categories.find(c => c.includes('두부')) || '두부/콩류';
    return null;
  };

  const getExpirationColor = (days: number) => {
    if (days < 0) return "text-red-600 font-bold";
    if (days <= 3) return "text-orange-600 font-bold";
    return "text-slate-500";
  };

  // Auto Category Prediction
  useEffect(() => {
    setNewItemCat('');
    const trimmedName = newItemName.trim();
    if (!trimmedName) return;

    const localPrediction = checkLocalHeuristics(trimmedName);
    if (localPrediction) {
      setNewItemCat(localPrediction);
      return;
    }

    if (predictionCache.current[trimmedName]) {
      setNewItemCat(predictionCache.current[trimmedName]);
      return;
    }
    
    const timeout = setTimeout(async () => {
      setIsPredictingCat(true);
      try {
        const predicted = await GeminiService.predictCategory(trimmedName, categories);
        if (predicted) {
          setNewItemCat(predicted);
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


  const handleAddItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newItemName || !newItemCat) return;

    const expiryTimestamp = newItemExpiry ? new Date(newItemExpiry).getTime() : undefined;
    
    // Default to first door of selected fridge if not specified
    let targetDoorId = newItemDoor;
    if (!targetDoorId) {
       const activeFridge = config.fridges.find(f => f.id === selectedFridgeId) || config.fridges[0];
       if (activeFridge && activeFridge.doors.length > 0) {
         targetDoorId = activeFridge.doors[0].id;
       }
    }

    const item: FoodItem = {
      id: Date.now().toString() + Math.random().toString(),
      name: newItemName,
      quantity: newItemQty,
      category: newItemCat,
      doorId: targetDoorId,
      entryDate: Date.now(),
      expirationDate: expiryTimestamp
    };
    setItems(prev => [item, ...prev]);
    setIsAddItemOpen(false);
    setNewItemExpiry('');
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
      
      const activeFridge = config.fridges.find(f => f.id === selectedFridgeId) || config.fridges[0];
      const defaultDoorId = activeFridge?.doors[0]?.id || '';

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
            doorId: newItemDoor || defaultDoorId,
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

  // --- Receipt Scan Logic ---
  const handleReceiptClick = () => {
    receiptInputRef.current?.click();
  };

  const handleReceiptChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzingReceipt(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const base64String = event.target?.result as string;
        // Remove data URL header (e.g., "data:image/jpeg;base64,")
        const base64Data = base64String.split(',')[1];
        
        const parsedItems = await GeminiService.parseReceipt(base64Data, categories);
        
        if (parsedItems.length > 0) {
           const activeFridge = config.fridges.find(f => f.id === selectedFridgeId) || config.fridges[0];
           // Default to user-selected door in modal, or active fridge's first door
           const currentDoorId = newItemDoor || activeFridge.doors[0].id;
           
           const newItems = parsedItems.map(p => {
             let expiryTimestamp = undefined;
             if (p.expirationDate) {
                try {
                   expiryTimestamp = new Date(p.expirationDate).getTime();
                } catch (e) { console.warn("Invalid date from AI", e); }
             }

             // Smart Door Selection Logic within CURRENT FRIDGE
             let finalDoorId = currentDoorId;
             
             if (p.storageType) {
                // Try to find a matching door in the CURRENT fridge
                const currentDoor = activeFridge.doors.find(d => d.id === currentDoorId);
                
                if (currentDoor && currentDoor.type !== p.storageType) {
                    const betterDoor = activeFridge.doors.find(d => d.type === p.storageType);
                    if (betterDoor) {
                        finalDoorId = betterDoor.id;
                    }
                }
             }

             return {
               id: Date.now().toString() + Math.random().toString(),
               name: p.name || '알 수 없음',
               quantity: p.quantity || 1,
               category: p.category || categories[0],
               doorId: finalDoorId,
               entryDate: Date.now(),
               expirationDate: expiryTimestamp
             };
           });
           
           setItems(prev => [...newItems, ...prev]);
           setIsAddItemOpen(false);
           
           const uniqueDoorIds = Array.from(new Set(newItems.map(i => i.doorId)));
           const doorNames = uniqueDoorIds.map(id => activeFridge.doors.find(d => d.id === id)?.name).join(', ');

           alert(`${newItems.length}개의 품목이 '${activeFridge.name}'에 추가되었습니다.\n(저장 위치: ${doorNames})`);
        } else {
           alert("영수증에서 식재료를 식별하지 못했습니다.");
        }
      } catch (error) {
        console.error("Receipt processing failed", error);
        alert("영수증 처리 중 오류가 발생했습니다.");
      } finally {
        setIsAnalyzingReceipt(false);
        if (receiptInputRef.current) receiptInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };


  const updateItemQty = (id: string, delta: number) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    const newQty = item.quantity + delta;

    if (newQty <= 0) {
      setItemToDelete({ id: item.id, name: item.name });
    } else {
      setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: newQty } : i));
    }
  };

  const requestDeleteItem = (item: FoodItem) => {
    setItemToDelete({ id: item.id, name: item.name });
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      setItems(prev => prev.filter(i => i.id !== itemToDelete.id));
      setItemToDelete(null);
    }
  };

  const cancelDelete = () => {
    setItemToDelete(null);
  };

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItemId(itemId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", itemId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetDoorId: string) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData("text/plain");
    
    if (itemId) {
      setItems(prev => prev.map(item => {
        if (item.id === itemId) {
          return { ...item, doorId: targetDoorId };
        }
        return item;
      }));
    }
    setDraggedItemId(null);
  };


  const toggleDoorExpansion = (doorId: string) => {
    setExpandedDoors(prev => 
      prev.includes(doorId) ? prev.filter(id => id !== doorId) : [...prev, doorId]
    );
  };

  const getFilteredAndSortedItems = (doorId: string) => {
    let filtered = items.filter(i => i.doorId === doorId);
    
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

  // --- Move Items Modal Logic ---
  const handleOpenMoveModal = () => {
    if (config.fridges.length < 2) return;
    setMoveSourceFridgeId(config.fridges[0].id);
    setMoveTargetFridgeId(config.fridges[1].id);
    setMoveSearchQuery('');
    setCheckedSourceItems(new Set());
    setCheckedTargetItems(new Set());
    setIsMoveItemsModalOpen(true);
  };

  const toggleItemSelection = (id: string, isSource: boolean) => {
    if (isSource) {
      setCheckedSourceItems(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    } else {
      setCheckedTargetItems(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }
  };

  const handleMoveItems = (direction: 'toRight' | 'toLeft') => {
    const targetFridgeId = direction === 'toRight' ? moveTargetFridgeId : moveSourceFridgeId;
    const sourceItemIds = direction === 'toRight' ? checkedSourceItems : checkedTargetItems;
    
    if (sourceItemIds.size === 0) return;

    const targetFridge = config.fridges.find(f => f.id === targetFridgeId);
    if (!targetFridge || targetFridge.doors.length === 0) return;

    setItems(prev => prev.map(item => {
      if (sourceItemIds.has(item.id)) {
        // Smart Door Matching Logic
        // 1. Find the current door to know its type
        const currentDoor = config.fridges.flatMap(f => f.doors).find(d => d.id === item.doorId);
        const idealType = currentDoor?.type || 'fridge';

        // 2. Find a matching door type in the target fridge
        let targetDoor = targetFridge.doors.find(d => d.type === idealType);
        
        // 3. Fallback to the first door if no matching type found
        if (!targetDoor) targetDoor = targetFridge.doors[0];

        return { ...item, doorId: targetDoor.id };
      }
      return item;
    }));

    // Clear selection after move
    if (direction === 'toRight') setCheckedSourceItems(new Set());
    else setCheckedTargetItems(new Set());
  };

  const getMoveModalGridItems = (fridgeId: string) => {
     const fridge = config.fridges.find(f => f.id === fridgeId);
     if (!fridge) return [];
     
     const doorIds = fridge.doors.map(d => d.id);
     let fridgeItems = items.filter(i => doorIds.includes(i.doorId));

     if (moveSearchQuery.trim()) {
       fridgeItems = fridgeItems.filter(i => i.name.toLowerCase().includes(moveSearchQuery.toLowerCase()));
     }
     
     return fridgeItems;
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
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // --- Views ---

  if (!config.isSetup) {
    // Initial Setup View
    // Using a temp state to manage the setup form before committing to config
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-2xl w-full p-8 rounded-3xl shadow-xl">
          <div className="text-center mb-8">
            <Refrigerator className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-slate-800">스마트 냉장고 매니저</h1>
            <p className="text-slate-500">패드에 부착하여 사용하는 스마트 식재료 관리 허브입니다.</p>
          </div>

          <div className="space-y-6">
            <SetupForm onComplete={(name, doors) => setupFirstFridge(name, doors)} />
          </div>
        </div>
      </div>
    );
  }

  // --- Derived State for Rendering ---
  
  // Decide which doors to show
  // If Searching: Show doors from ALL fridges that contain matching items
  // If Not Searching: Show doors from the SELECTED fridge
  
  let visibleDoors: { fridgeId: string, fridgeName: string, door: DoorConfig }[] = [];
  
  if (searchQuery.trim()) {
     // Global Search Mode
     const query = searchQuery.toLowerCase();
     
     config.fridges.forEach(fridge => {
       fridge.doors.forEach(door => {
         const hasMatchingItems = items.some(item => 
           item.doorId === door.id && (
             item.name.toLowerCase().includes(query) || 
             item.category.toLowerCase().includes(query)
           )
         );
         if (hasMatchingItems) {
           visibleDoors.push({ fridgeId: fridge.id, fridgeName: fridge.name, door });
         }
       });
     });
  } else {
     // Standard View Mode
     const activeFridge = config.fridges.find(f => f.id === selectedFridgeId);
     if (activeFridge) {
       visibleDoors = activeFridge.doors.map(door => ({
         fridgeId: activeFridge.id,
         fridgeName: activeFridge.name,
         door
       }));
     }
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
          
          {/* Fridge Tabs (Left of Search) */}
          <div className="flex gap-2 overflow-x-auto max-w-full xl:max-w-xs pb-2 xl:pb-0 shrink-0 custom-scrollbar">
             {config.fridges.map(fridge => (
               <button
                 key={fridge.id}
                 onClick={() => {
                   setSelectedFridgeId(fridge.id);
                   setSearchQuery(''); // Clear search when switching context
                 }}
                 className={`px-4 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition flex items-center gap-2 ${
                   selectedFridgeId === fridge.id && !searchQuery
                   ? 'bg-slate-800 text-white shadow-md' 
                   : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                 }`}
               >
                 <Refrigerator className="w-4 h-4" />
                 {fridge.name}
               </button>
             ))}
          </div>

          {/* Search Bar */}
          <div className="flex-1 w-full relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="모든 냉장고에서 식재료 검색..."
              className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:outline-none focus:border-blue-500 transition ${
                searchQuery ? 'bg-white border-blue-500 ring-2 ring-blue-100' : 'bg-slate-50 border-slate-200'
              }`}
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
              카테고리관리
            </button>
            {config.fridges.length >= 2 && (
              <button 
                onClick={handleOpenMoveModal}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 border border-slate-800 rounded-xl shrink-0 shadow-sm transition"
              >
                <MoveHorizontal className="w-4 h-4" />
                냉장고물건이동
              </button>
            )}
          </div>
        </div>

        {/* Fridge Grid Layout */}
        <div className={`grid gap-6 flex-1 min-h-0 overflow-y-auto pb-6 ${
          visibleDoors.length === 1 ? 'grid-cols-1' :
          visibleDoors.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
          'grid-cols-1 md:grid-cols-2 xl:grid-cols-2'
        }`}>
          {searchQuery && visibleDoors.length === 0 && (
             <div className="col-span-full flex flex-col items-center justify-center text-slate-400 min-h-[200px]">
                <Search className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-lg">모든 냉장고에서 검색 결과가 없습니다.</p>
             </div>
          )}

          {visibleDoors.map(({ fridgeId, fridgeName, door }) => {
            const allItems = getFilteredAndSortedItems(door.id);
            const isExpanded = expandedDoors.includes(door.id);
            const shouldShowAll = isExpanded || searchQuery.trim().length > 0;
            const visibleItems = shouldShowAll ? allItems : allItems.slice(0, 5);
            
            return (
              <div 
                key={door.id} 
                className={`bg-white rounded-3xl shadow-sm border flex flex-col overflow-hidden group/door transition-all ${
                  searchQuery ? 'border-blue-200 shadow-md ring-1 ring-blue-50' : 'border-slate-100'
                }`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, door.id)}
              >
                {/* Door Header */}
                <div className={`p-4 border-b border-slate-100 transition-colors flex justify-between items-center ${
                   draggedItemId ? 'bg-blue-50 border-blue-200' : 'bg-slate-50/50'
                }`}>
                  <div 
                    onClick={() => toggleDoorExpansion(door.id)}
                    className="flex items-center gap-3 cursor-pointer hover:opacity-70 transition flex-1"
                  >
                    <div className={`p-2 rounded-lg ${
                      door.type === 'freezer' ? 'bg-blue-100 text-blue-600' : 
                      door.type === 'pantry' ? 'bg-orange-100 text-orange-600' :
                      'bg-green-100 text-green-600'
                    }`}>
                      {door.type === 'freezer' ? <Snowflake className="w-5 h-5" /> : 
                       door.type === 'pantry' ? <Archive className="w-5 h-5" /> : 
                       <Refrigerator className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                         <h3 className="font-bold text-slate-700">
                           {searchQuery && <span className="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded mr-1 align-middle">{fridgeName}</span>}
                           {door.name}
                         </h3>
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
                      // Force select the fridge this door belongs to, and select this door
                      setSelectedFridgeId(fridgeId);
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
                <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[400px]">
                  {visibleItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 py-10">
                      <Search className="w-12 h-12 mb-2 opacity-20" />
                      <p>{searchQuery ? '검색 결과 없음' : '비어있음'}</p>
                    </div>
                  ) : (
                    visibleItems.map(item => {
                      const restrictionWarning = checkItemRestrictions(item.name);
                      const daysUntilExpiry = getDaysUntilExpiration(item.expirationDate);
                      
                      return (
                        <div 
                          key={item.id} 
                          className="bg-white border border-slate-100 rounded-2xl p-3 flex justify-between items-center hover:shadow-md transition group relative cursor-grab active:cursor-grabbing"
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, item.id)}
                        >
                          <div className="flex items-center gap-3">
                            <GripVertical className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
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
                              onClick={() => requestDeleteItem(item)}
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

      {/* --- Move Items Modal --- */}
      {isMoveItemsModalOpen && (
        <Modal 
          title="냉장고 물건 이동" 
          onClose={() => setIsMoveItemsModalOpen(false)} 
          maxWidthClass="max-w-6xl"
        >
          <div className="flex flex-col h-[70vh]">
             {/* Search */}
             <div className="mb-4 relative shrink-0">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
               <input 
                 type="text" 
                 placeholder="물건 검색..." 
                 value={moveSearchQuery}
                 onChange={(e) => setMoveSearchQuery(e.target.value)}
                 className="w-full pl-9 p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-blue-100 outline-none"
               />
             </div>

             <div className="flex flex-1 gap-4 min-h-0">
               {/* Left Panel: Source */}
               <div className="flex-1 flex flex-col bg-slate-50 rounded-2xl p-4 border border-slate-200">
                  <select 
                    value={moveSourceFridgeId}
                    onChange={(e) => {
                       const id = e.target.value;
                       setMoveSourceFridgeId(id);
                       // If source same as target, switch target
                       if (id === moveTargetFridgeId) {
                         const next = config.fridges.find(f => f.id !== id)?.id;
                         if (next) setMoveTargetFridgeId(next);
                       }
                    }}
                    className="w-full p-2 mb-4 rounded-lg border font-bold text-lg"
                  >
                    {config.fridges.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>

                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                     <table className="w-full text-sm text-left">
                       <thead className="text-xs text-slate-500 uppercase bg-slate-100 sticky top-0">
                         <tr>
                           <th className="p-2 rounded-tl-lg">선택</th>
                           <th className="p-2">번호</th>
                           <th className="p-2">품목명</th>
                           <th className="p-2">개수</th>
                           <th className="p-2 rounded-tr-lg">소비기한</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                         {getMoveModalGridItems(moveSourceFridgeId).map((item, idx) => (
                           <tr key={item.id} className="hover:bg-white transition cursor-pointer" onClick={() => toggleItemSelection(item.id, true)}>
                             <td className="p-2">
                               <div className={`w-5 h-5 border rounded flex items-center justify-center ${checkedSourceItems.has(item.id) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300'}`}>
                                 {checkedSourceItems.has(item.id) && <Check className="w-3 h-3" />}
                               </div>
                             </td>
                             <td className="p-2 text-slate-400">{idx + 1}</td>
                             <td className="p-2 font-medium">{item.name}</td>
                             <td className="p-2">{item.quantity}</td>
                             <td className="p-2 text-xs text-slate-500">
                               {item.expirationDate ? new Date(item.expirationDate).toLocaleDateString() : '-'}
                             </td>
                           </tr>
                         ))}
                         {getMoveModalGridItems(moveSourceFridgeId).length === 0 && (
                           <tr><td colSpan={5} className="p-4 text-center text-slate-400">물건이 없습니다.</td></tr>
                         )}
                       </tbody>
                     </table>
                  </div>
               </div>

               {/* Center Controls */}
               <div className="flex flex-col justify-center gap-4 shrink-0">
                  <button 
                    onClick={() => handleMoveItems('toRight')}
                    disabled={checkedSourceItems.size === 0}
                    className={`p-4 rounded-full transition shadow-md flex items-center justify-center ${
                      checkedSourceItems.size > 0 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <ChevronsRight className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={() => handleMoveItems('toLeft')}
                    disabled={checkedTargetItems.size === 0}
                    className={`p-4 rounded-full transition shadow-md flex items-center justify-center ${
                      checkedTargetItems.size > 0 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <ChevronsLeft className="w-6 h-6" />
                  </button>
               </div>

               {/* Right Panel: Target */}
               <div className="flex-1 flex flex-col bg-slate-50 rounded-2xl p-4 border border-slate-200">
                  <select 
                    value={moveTargetFridgeId}
                    onChange={(e) => setMoveTargetFridgeId(e.target.value)}
                    className="w-full p-2 mb-4 rounded-lg border font-bold text-lg"
                  >
                    {config.fridges
                      .filter(f => f.id !== moveSourceFridgeId)
                      .map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>

                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                     <table className="w-full text-sm text-left">
                       <thead className="text-xs text-slate-500 uppercase bg-slate-100 sticky top-0">
                         <tr>
                           <th className="p-2 rounded-tl-lg">선택</th>
                           <th className="p-2">번호</th>
                           <th className="p-2">품목명</th>
                           <th className="p-2">개수</th>
                           <th className="p-2 rounded-tr-lg">소비기한</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                         {getMoveModalGridItems(moveTargetFridgeId).map((item, idx) => (
                           <tr key={item.id} className="hover:bg-white transition cursor-pointer" onClick={() => toggleItemSelection(item.id, false)}>
                             <td className="p-2">
                               <div className={`w-5 h-5 border rounded flex items-center justify-center ${checkedTargetItems.has(item.id) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300'}`}>
                                 {checkedTargetItems.has(item.id) && <Check className="w-3 h-3" />}
                               </div>
                             </td>
                             <td className="p-2 text-slate-400">{idx + 1}</td>
                             <td className="p-2 font-medium">{item.name}</td>
                             <td className="p-2">{item.quantity}</td>
                             <td className="p-2 text-xs text-slate-500">
                               {item.expirationDate ? new Date(item.expirationDate).toLocaleDateString() : '-'}
                             </td>
                           </tr>
                         ))}
                         {getMoveModalGridItems(moveTargetFridgeId).length === 0 && (
                           <tr><td colSpan={5} className="p-4 text-center text-slate-400">물건이 없습니다.</td></tr>
                         )}
                       </tbody>
                     </table>
                  </div>
               </div>
             </div>

             <div className="mt-4 flex justify-end shrink-0">
               <button 
                 onClick={() => setIsMoveItemsModalOpen(false)}
                 className="px-6 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition"
               >
                 닫기
               </button>
             </div>
          </div>
        </Modal>
      )}

      {/* --- Delete Confirmation Modal (Items) --- */}
      {itemToDelete && (
         <Modal title="식재료 삭제 확인" onClose={cancelDelete}>
            <div className="space-y-6">
              <div className="bg-red-50 p-6 rounded-2xl flex flex-col items-center text-center">
                 <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                    <Trash2 className="w-8 h-8" />
                 </div>
                 <h3 className="text-xl font-bold text-slate-800 mb-2">
                   정말 삭제하시겠습니까?
                 </h3>
                 <p className="text-slate-600">
                   <strong>'{itemToDelete.name}'</strong> 식재료가 목록에서 영구적으로 제거됩니다.
                 </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <button 
                   onClick={cancelDelete}
                   className="py-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                 >
                   취소
                 </button>
                 <button 
                   onClick={confirmDelete}
                   className="py-4 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200 transition"
                 >
                   네, 삭제합니다
                 </button>
              </div>
            </div>
         </Modal>
      )}

      {/* --- Add Item Modal --- */}
      {isAddItemOpen && (
        <Modal title="새로운 식재료 보관하기" onClose={() => setIsAddItemOpen(false)}>
          <div className="space-y-6">
            
            {/* Input Triggers */}
            <div className="grid grid-cols-2 gap-4">
               {/* Voice Input Trigger */}
               <button
                 onClick={handleVoiceAdd}
                 disabled={isListening || isAnalyzingReceipt}
                 className={`flex flex-col items-center justify-center h-32 rounded-3xl transition-all ${
                   isListening 
                   ? 'bg-red-100 text-red-600 animate-pulse border-2 border-red-200' 
                   : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-2 border-transparent'
                 }`}
               >
                 <Mic className={`w-10 h-10 mb-2 ${isListening ? 'animate-bounce' : ''}`} />
                 <span className="text-xs font-bold">{isListening ? '듣고 있어요...' : '음성으로 추가'}</span>
               </button>

               {/* Receipt Input Trigger */}
               <button
                 onClick={handleReceiptClick}
                 disabled={isListening || isAnalyzingReceipt}
                 className={`flex flex-col items-center justify-center h-32 rounded-3xl transition-all ${
                   isAnalyzingReceipt
                   ? 'bg-green-100 text-green-600 animate-pulse border-2 border-green-200'
                   : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-2 border-transparent'
                 }`}
               >
                 {isAnalyzingReceipt ? (
                   <ScanLine className="w-10 h-10 mb-2 animate-spin-slow" />
                 ) : (
                   <Camera className="w-10 h-10 mb-2" />
                 )}
                 <span className="text-xs font-bold">{isAnalyzingReceipt ? '영수증 분석 중...' : '영수증 촬영/업로드'}</span>
               </button>
               <input 
                 type="file" 
                 ref={receiptInputRef} 
                 onChange={handleReceiptChange} 
                 accept="image/*" 
                 capture="environment"
                 className="hidden" 
               />
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
                      <option value="" disabled>위치 선택</option>
                      {/* Show doors from the selected fridge primarily, or all fridges? 
                          Let's show all fridges grouped by optgroup for flexibility */}
                      {config.fridges.map(fridge => (
                        <optgroup key={fridge.id} label={fridge.name}>
                          {fridge.doors.map(d => (
                            <option key={d.id} value={d.id}>{d.name} ({d.type === 'fridge' ? '냉장' : d.type === 'freezer' ? '냉동' : '상온'})</option>
                          ))}
                        </optgroup>
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
                      {config.fridges.map(fridge => (
                        <optgroup key={fridge.id} label={fridge.name}>
                          {fridge.doors.map(d => (
                            <option key={d.id} value={d.id}>{d.name} ({d.type === 'fridge' ? '냉장' : d.type === 'freezer' ? '냉동' : '상온'})</option>
                          ))}
                        </optgroup>
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
        <Modal title="환경 설정" onClose={() => {
           setIsSettingsOpen(false);
           setIsAddingFridge(false); // Reset add fridge mode
           setShowResetVerify(false);
           setResetInput('');
        }}>
          <div className="flex border-b mb-4">
             <button 
                className={`px-4 py-2 font-bold ${settingsTab === 'fridges' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}
                onClick={() => setSettingsTab('fridges')}
             >
                냉장고 관리
             </button>
             <button 
                className={`px-4 py-2 font-bold ${settingsTab === 'profiles' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}
                onClick={() => setSettingsTab('profiles')}
             >
                가족/알림
             </button>
             <button 
                className={`px-4 py-2 font-bold ${settingsTab === 'data' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}
                onClick={() => setSettingsTab('data')}
             >
                데이터
             </button>
          </div>

          <div className="space-y-6">
            
            {/* FRIDGES TAB */}
            {settingsTab === 'fridges' && (
              <>
                {!isAddingFridge ? (
                  <div className="bg-blue-50 p-4 rounded-xl flex items-center justify-between">
                     <div>
                        <h4 className="font-bold text-blue-900">새 냉장고 추가</h4>
                        <p className="text-xs text-blue-700">김치냉장고 등 서브 냉장고를 추가해보세요.</p>
                     </div>
                     <button onClick={handleStartAddFridge} className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700">
                        <Plus className="w-5 h-5" />
                     </button>
                  </div>
                ) : (
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-3">
                     <h4 className="font-bold text-blue-900">냉장고 정보 입력</h4>
                     <input 
                       type="text" 
                       value={newFridgeName}
                       onChange={(e) => setNewFridgeName(e.target.value)}
                       placeholder="예: 김치냉장고"
                       className="w-full border rounded-lg p-2 text-sm"
                     />
                     <div>
                       <label className="block text-xs font-semibold text-blue-800 mb-1">문 개수</label>
                       <div className="flex gap-2">
                         {[1, 2, 3, 4].map(num => (
                           <button
                             key={num}
                             onClick={() => setNewFridgeDoorCount(num as any)}
                             className={`flex-1 py-1 rounded text-sm font-bold border ${
                               newFridgeDoorCount === num 
                               ? 'bg-blue-600 text-white border-blue-600' 
                               : 'bg-white text-blue-600 border-blue-200'
                             }`}
                           >
                             {num}개
                           </button>
                         ))}
                       </div>
                     </div>
                     <div className="flex gap-2 pt-2">
                        <button onClick={() => setIsAddingFridge(false)} className="flex-1 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-600">취소</button>
                        <button onClick={handleSubmitAddFridge} className="flex-1 py-2 bg-blue-600 rounded-lg text-sm text-white font-bold">추가 완료</button>
                     </div>
                  </div>
                )}

                <div className="space-y-4">
                  {config.fridges.map((fridge, fIndex) => (
                    <div key={fridge.id} className="border rounded-xl p-4">
                       <div className="flex justify-between items-center mb-3">
                          <input 
                            type="text" 
                            value={fridge.name}
                            onChange={(e) => {
                               const newFridges = [...config.fridges];
                               newFridges[fIndex].name = e.target.value;
                               setConfig({...config, fridges: newFridges});
                            }}
                            className="font-bold text-lg border-b border-dashed focus:outline-none focus:border-blue-500 w-full mr-2"
                          />
                          <button 
                            onClick={() => handleDeleteFridge(fridge.id)}
                            className="text-red-400 hover:text-red-600 p-1"
                            title="냉장고 삭제"
                          >
                             <Trash2 className="w-5 h-5" />
                          </button>
                       </div>
                       
                       <div className="space-y-2 pl-2 border-l-2 border-slate-100">
                          {fridge.doors.map((door, dIndex) => (
                             <div key={door.id} className="flex gap-2 items-center">
                                <span className="text-xs text-slate-400 w-4">{dIndex + 1}</span>
                                <input 
                                  type="text" 
                                  value={door.name}
                                  onChange={(e) => {
                                    const newFridges = [...config.fridges];
                                    newFridges[fIndex].doors[dIndex].name = e.target.value;
                                    setConfig({...config, fridges: newFridges});
                                  }}
                                  className="flex-1 border rounded-lg p-1.5 text-sm"
                                />
                                <select
                                  value={door.type}
                                  onChange={(e) => {
                                    const newFridges = [...config.fridges];
                                    newFridges[fIndex].doors[dIndex].type = e.target.value as DoorType;
                                    setConfig({...config, fridges: newFridges});
                                  }}
                                  className="border rounded-lg p-1.5 text-xs bg-white"
                                >
                                  <option value="fridge">냉장실</option>
                                  <option value="freezer">냉동실</option>
                                  <option value="pantry">상온/실온</option>
                                </select>
                             </div>
                          ))}
                       </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* PROFILES TAB */}
            {settingsTab === 'profiles' && (
              <>
               <div>
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
                   <p className="text-xs text-red-500 mt-2 px-1">⚠️ 브라우저 설정에서 알림 권한이 차단되었습니다.</p>
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
              </>
            )}

            {/* DATA TAB */}
            {settingsTab === 'data' && (
              <>
                 <div>
                   <label className="block text-sm font-semibold text-slate-700 mb-2">우리집 이름 (메인 제목)</label>
                   <input 
                     type="text" 
                     value={config.name}
                     onChange={(e) => setConfig({...config, name: e.target.value})}
                     className="w-full border rounded-xl p-3 focus:border-blue-500 outline-none"
                   />
                 </div>

                 <div className="flex gap-4 pt-4 border-t">
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
                          초기화하려면 현재 우리집 이름 <strong>"{config.name}"</strong>을(를) 정확히 입력하세요.
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
              </>
            )}

            <button onClick={() => setIsSettingsOpen(false)} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-200 mt-4">
              닫기
            </button>
          </div>
        </Modal>
      )}

      {/* --- Delete Fridge Modal (Moved to bottom for stacking context) --- */}
      {fridgeToDelete && (
         <Modal title="냉장고 삭제 확인" onClose={() => setFridgeToDelete(null)} zIndexClass="z-[60]">
            <div className="space-y-6">
              <div className="bg-red-50 p-6 rounded-2xl flex flex-col items-center text-center">
                 <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                    <Trash2 className="w-8 h-8" />
                 </div>
                 <h3 className="text-xl font-bold text-slate-800 mb-2">
                   정말 삭제하시겠습니까?
                 </h3>
                 <p className="text-slate-600 text-sm mb-4">
                   선택한 냉장고와 <strong>보관된 모든 식재료</strong>가 영구적으로 삭제됩니다.<br/>
                   삭제하려면 냉장고 이름을 입력하세요.
                 </p>
                 
                 <div className="w-full bg-white p-3 rounded-xl border border-red-200">
                    <p className="text-xs text-slate-500 mb-1">삭제할 냉장고 이름</p>
                    <p className="font-bold text-slate-800 mb-2">
                      {config.fridges.find(f => f.id === fridgeToDelete)?.name}
                    </p>
                    <input 
                      type="text" 
                      value={deleteConfirmationInput}
                      onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                      placeholder="냉장고 이름을 정확히 입력"
                      className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:outline-none focus:border-red-500 text-center"
                    />
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <button 
                   onClick={() => setFridgeToDelete(null)}
                   className="py-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                 >
                   취소
                 </button>
                 <button 
                   onClick={confirmDeleteFridge}
                   disabled={deleteConfirmationInput.trim() !== config.fridges.find(f => f.id === fridgeToDelete)?.name.trim()}
                   className={`py-4 rounded-xl font-bold text-white transition shadow-lg ${
                     deleteConfirmationInput.trim() === config.fridges.find(f => f.id === fridgeToDelete)?.name.trim()
                     ? 'bg-red-600 hover:bg-red-700 shadow-red-200'
                     : 'bg-gray-300 cursor-not-allowed shadow-none'
                   }`}
                 >
                   삭제하기
                 </button>
              </div>
            </div>
         </Modal>
      )}

    </div>
  );
}

// --- Subcomponent: Initial Setup Form ---
function SetupForm({ onComplete }: { onComplete: (name: string, doorCount: 1|2|3|4) => void }) {
  const [name, setName] = useState('');
  const [doorCount, setDoorCount] = useState<1|2|3|4>(2);

  return (
    <>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">첫번째 냉장고 이름</label>
        <input 
          type="text" 
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border-2 border-slate-200 rounded-xl p-4 text-lg focus:border-blue-500 outline-none transition"
          placeholder="예: 주방 냉장고"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">문 개수</label>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map(num => (
            <button
              key={num}
              onClick={() => setDoorCount(num as 1|2|3|4)}
              className={`p-4 rounded-xl border-2 text-xl font-bold transition-all ${
                doorCount === num 
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
           if(name.trim()) onComplete(name, doorCount);
           else alert("냉장고 이름을 입력해주세요.");
        }}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl text-lg shadow-lg shadow-blue-200 transition-all mt-8"
      >
        시작하기
      </button>
    </>
  )
}
