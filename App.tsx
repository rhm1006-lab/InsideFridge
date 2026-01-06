import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, Plus, Trash2, Mic, ChefHat, 
  Thermometer, Calendar, LayoutGrid, Refrigerator,
  ArrowUpAZ, Clock, Edit2, X, Check, Save,
  Snowflake, Sun, Search, CloudRain, Wind, Droplets,
  Volume2, AlertCircle, UserPlus, User, PackagePlus,
  Moon, ShoppingCart, ChevronDown, ChevronUp, Pencil
} from 'lucide-react';
import { FridgeConfig, DoorConfig, FoodItem, SortMode, DoorType, UserProfile, RecipeSuggestion } from './types';
import { DEFAULT_CATEGORIES, MOCK_WEATHER } from './constants';
import * as GeminiService from './services/geminiService';

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
      <div className="p-6 overflow-y-auto">
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
  
  // Edit Item State
  const [isEditItemOpen, setIsEditItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editQty, setEditQty] = useState(1);
  const [editCat, setEditCat] = useState('');
  const [editDoor, setEditDoor] = useState('');

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
  const [newItemCat, setNewItemCat] = useState(categories[0]);
  const [newItemDoor, setNewItemDoor] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isPredictingCat, setIsPredictingCat] = useState(false);

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
    let sleepTimer: NodeJS.Timeout;
    if (isManuallyAwake && (currentTime.getHours() >= 22 || currentTime.getHours() < 7)) {
       // Go back to sleep after 30 seconds of inactivity
       sleepTimer = setTimeout(() => {
         setIsManuallyAwake(false);
         setIsSleepMode(true);
       }, 30000); 
    }
    return () => clearTimeout(sleepTimer);
  }, [isManuallyAwake, currentTime]);


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

  useEffect(() => {
    const timeout = setTimeout(() => {
      if(items.length > 0 && config.isSetup) fetchRecipes();
    }, 2000);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, config.isSetup, config.userProfiles]);

  // Auto Category Prediction
  useEffect(() => {
    if (!newItemName || newItemName.length < 2) return;
    
    const timeout = setTimeout(async () => {
      setIsPredictingCat(true);
      const predicted = await GeminiService.predictCategory(newItemName, categories);
      if (predicted) {
        setNewItemCat(predicted);
      }
      setIsPredictingCat(false);
    }, 800); 

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
    if (!newItemName) return;

    const item: FoodItem = {
      id: Date.now().toString() + Math.random().toString(),
      name: newItemName,
      quantity: newItemQty,
      category: newItemCat,
      doorId: newItemDoor || config.doors[0].id,
      entryDate: Date.now()
    };
    setItems(prev => [item, ...prev]);
    setNewItemName('');
    setIsAddItemOpen(false);
  };

  const openEditModal = (item: FoodItem) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditQty(item.quantity);
    setEditCat(item.category);
    setEditDoor(item.doorId);
    setIsEditItemOpen(true);
  };

  const handleUpdateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setItems(prev => prev.map(item => {
      if (item.id === editingItem.id) {
        return {
          ...item,
          name: editName,
          quantity: editQty,
          category: editCat,
          doorId: editDoor
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
        const newItems = parsedItems.map(p => ({
          id: Date.now().toString() + Math.random().toString(),
          name: p.name || '알 수 없음',
          quantity: p.quantity || 1,
          category: p.category || categories[0],
          doorId: newItemDoor || config.doors[0].id,
          entryDate: Date.now()
        }));
        setItems(prev => [...newItems, ...prev]);
        setIsAddItemOpen(false);
      }
    };

    recognition.onerror = () => setIsListening(false);
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
    
    return filtered.sort((a, b) => {
      switch (sortMode) {
        case 'name': return a.name.localeCompare(b.name);
        case 'oldest': return a.entryDate - b.entryDate;
        case 'recent': return b.entryDate - a.entryDate;
        case 'quantity': return b.quantity - a.quantity;
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
  const dateStr = currentTime.toLocaleDateString('ko-KR', { weekday: 'long', month: 'long', day: 'numeric' });
  const timeStr = currentTime.toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans flex flex-col">
      {/* --- Header --- */}
      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Refrigerator className="text-blue-500" />
            {config.name}
          </h1>
          <div className="flex items-center gap-4 text-slate-500 mt-1">
             <span className="text-xl font-medium">{dateStr}</span>
             <span className="w-px h-6 bg-slate-300"></span>
             <span className="font-mono text-3xl text-slate-800 font-bold tracking-tight">{timeStr}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          {/* Weather Widget */}
          <button 
            onClick={() => setIsWeatherOpen(true)}
            className="flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-full hover:bg-blue-100 transition group"
          >
            <div className="bg-white p-2 rounded-full shadow-sm group-hover:scale-110 transition">
              <Sun className="w-6 h-6 text-orange-400" />
            </div>
            <div className="text-left">
              <div className="text-lg font-bold text-slate-700">{MOCK_WEATHER.temp}°C {MOCK_WEATHER.condition}</div>
              <div className="text-xs text-slate-400">자세히 보기</div>
            </div>
          </button>

          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-3 hover:bg-slate-100 rounded-full transition"
          >
            <Settings className="w-8 h-8 text-slate-600" />
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
                      <h3 className="font-bold text-lg mb-1 leading-tight">{recipe.title}</h3>
                      <p className="text-sm text-indigo-100 line-clamp-2 mb-2">{recipe.description}</p>
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

        {/* Sorting & Global Controls */}
        <div className="flex justify-between items-center bg-white p-2 rounded-2xl shadow-sm">
          <div className="flex gap-2">
            {(['recent', 'oldest', 'name', 'quantity'] as SortMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setSortMode(mode)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                  sortMode === mode ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                정렬: {getSortLabel(mode)}
              </button>
            ))}
          </div>
          <button 
            onClick={() => setIsCategoryManagerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            <LayoutGrid className="w-4 h-4" />
            카테고리 관리
          </button>
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
            const visibleItems = isExpanded ? allItems : allItems.slice(0, 5);
            
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
                         {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                      <p className="text-xs text-slate-400">
                        {allItems.length}개 품목 {allItems.length > 5 && !isExpanded ? '(5개만 표시됨)' : ''}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setNewItemDoor(door.id);
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
                      <p>비어있음</p>
                    </div>
                  ) : (
                    visibleItems.map(item => {
                      const restrictionWarning = checkItemRestrictions(item.name);
                      return (
                        <div key={item.id} className="bg-white border border-slate-100 rounded-2xl p-3 flex justify-between items-center hover:shadow-md transition group relative">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-lg">
                              🍽️
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
                              <p className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full inline-block">{item.category}</p>
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
                  {allItems.length > 5 && !isExpanded && (
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
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              
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

              <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition">
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
               <button 
                 onClick={() => readRecipe(selectedRecipe)}
                 className="p-3 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition"
                 title="레시피 읽어주기"
               >
                 <Volume2 className="w-6 h-6" />
               </button>
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
            <Sun className="w-24 h-24 text-orange-400 mx-auto mb-4 animate-spin-slow" />
            <div className="text-5xl font-bold text-slate-800 mb-2">{MOCK_WEATHER.temp}°C</div>
            <div className="text-xl text-slate-500 mb-8">{MOCK_WEATHER.condition}</div>
            
            <div className="grid grid-cols-3 gap-4 mb-8">
               <div className="bg-slate-50 p-4 rounded-xl">
                  <Droplets className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                  <div className="text-sm text-gray-400">습도</div>
                  <div className="font-bold">{MOCK_WEATHER.humidity}%</div>
               </div>
               <div className="bg-slate-50 p-4 rounded-xl">
                  <Wind className="w-6 h-6 text-cyan-500 mx-auto mb-2" />
                  <div className="text-sm text-gray-400">바람</div>
                  <div className="font-bold">{MOCK_WEATHER.wind}</div>
               </div>
               <div className="bg-slate-50 p-4 rounded-xl">
                  <CloudRain className="w-6 h-6 text-gray-500 mx-auto mb-2" />
                  <div className="text-sm text-gray-400">미세먼지</div>
                  <div className="font-bold text-green-600">{MOCK_WEATHER.pm25}</div>
               </div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-xl text-blue-800">
               {MOCK_WEATHER.forecast}
            </div>
          </div>
        </Modal>
      )}

      {/* --- Category Manager Modal --- */}
      {isCategoryManagerOpen && (
        <Modal title="카테고리 관리" onClose={() => setIsCategoryManagerOpen(false)}>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
             <div className="flex gap-2">
               <input 
                 id="new-cat-input"
                 type="text" 
                 placeholder="새 카테고리 이름"
                 className="flex-1 border rounded-xl p-3 outline-none focus:border-blue-500"
                 onKeyDown={(e) => {
                   if(e.key === 'Enter') {
                     const val = e.currentTarget.value.trim();
                     if(val && !categories.includes(val)) {
                       setCategories([...categories, val]);
                       e.currentTarget.value = '';
                     }
                   }
                 }}
               />
               <button 
                 onClick={() => {
                   const input = document.getElementById('new-cat-input') as HTMLInputElement;
                   const val = input.value.trim();
                   if(val && !categories.includes(val)) {
                     setCategories([...categories, val]);
                     input.value = '';
                   }
                 }}
                 className="bg-blue-600 text-white px-4 rounded-xl font-bold"
               >
                 추가
               </button>
             </div>
             <div className="grid grid-cols-2 gap-2">
               {categories.map(cat => (
                 <div key={cat} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                   <span>{cat}</span>
                   <button 
                     onClick={() => setCategories(categories.filter(c => c !== cat))}
                     className="text-red-400 hover:text-red-600"
                     disabled={categories.length <= 1}
                   >
                     <X className="w-4 h-4" />
                   </button>
                 </div>
               ))}
             </div>
          </div>
        </Modal>
      )}

      {/* --- Settings Modal --- */}
      {isSettingsOpen && (
        <Modal title="냉장고 설정" onClose={() => setIsSettingsOpen(false)}>
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
               <button 
                 onClick={() => {
                   if(confirm("모든 데이터가 초기화됩니다. 계속하시겠습니까?")) {
                     localStorage.clear();
                     window.location.reload();
                   }
                 }}
                 className="text-red-500 text-sm hover:underline"
               >
                 모든 데이터 초기화
               </button>
            </div>

            <button onClick={() => setIsSettingsOpen(false)} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">
              변경사항 저장
            </button>
          </div>
        </Modal>
      )}

    </div>
  );
}