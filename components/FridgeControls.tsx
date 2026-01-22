
import React from 'react';
import { Refrigerator, Search, Mic, LayoutGrid, MoveHorizontal, Merge } from 'lucide-react';
import { Fridge, SortMode } from '../types';

interface FridgeControlsProps {
  fridges: Fridge[];
  selectedFridgeId: string;
  onSelectFridge: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isVoiceSearching: boolean;
  onVoiceSearch: () => void;
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
  onOpenCategoryManager: () => void;
  onOpenMoveModal: () => void;
  onOpenMergeModal: () => void;
  showMoveButton: boolean;
}

export const FridgeControls = ({
  fridges,
  selectedFridgeId,
  onSelectFridge,
  searchQuery,
  onSearchChange,
  isVoiceSearching,
  onVoiceSearch,
  sortMode,
  onSortChange,
  onOpenCategoryManager,
  onOpenMoveModal,
  onOpenMergeModal,
  showMoveButton
}: FridgeControlsProps) => {
  return (
    <div className="bg-white p-3 rounded-2xl shadow-sm flex flex-col xl:flex-row gap-4 items-center">
      
      {/* Fridge Tabs */}
      <div className="flex gap-2 overflow-x-auto max-w-full xl:max-w-xs pb-2 xl:pb-0 shrink-0 custom-scrollbar">
         {fridges.map(fridge => (
           <button
             key={fridge.id}
             onClick={() => onSelectFridge(fridge.id)}
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
          onChange={e => onSearchChange(e.target.value)}
          placeholder="모든 냉장고에서 식재료 검색..."
          className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:outline-none focus:border-blue-500 transition ${
            searchQuery ? 'bg-white border-blue-500 ring-2 ring-blue-100' : 'bg-slate-50 border-slate-200'
          }`}
        />
        <button 
          onClick={onVoiceSearch}
          className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition ${
            isVoiceSearching ? 'text-red-500 bg-red-50 animate-pulse' : 'text-slate-400 hover:text-blue-500 hover:bg-blue-50'
          }`}
          title="음성 검색"
        >
          <Mic className="w-5 h-5" />
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex gap-2 w-full xl:w-auto overflow-x-auto pb-1 xl:pb-0 justify-start xl:justify-end">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
          {(['recent', 'oldest', 'name', 'quantity', 'expiration'] as SortMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => onSortChange(mode)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                sortMode === mode ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {mode === 'recent' ? '최신순' : mode === 'oldest' ? '오래된순' : mode === 'name' ? '이름순' : mode === 'quantity' ? '수량순' : '소비기한순'}
            </button>
          ))}
        </div>
        <button 
          onClick={onOpenCategoryManager}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-xl shrink-0"
        >
          <LayoutGrid className="w-4 h-4" />
          카테고리관리
        </button>
        <button 
          onClick={onOpenMergeModal}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-200 hover:bg-slate-300 border border-slate-200 rounded-xl shrink-0 shadow-sm transition"
        >
          <Merge className="w-4 h-4" />
          물건합치기
        </button>
        {showMoveButton && (
          <button 
            onClick={onOpenMoveModal}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 border border-slate-800 rounded-xl shrink-0 shadow-sm transition"
          >
            <MoveHorizontal className="w-4 h-4" />
            냉장고물건이동
          </button>
        )}
      </div>
    </div>
  );
};
