
import React from 'react';
import { Search, Snowflake, Refrigerator, Archive, ChevronUp, ChevronDown, PackagePlus, GripVertical, AlertCircle, Pencil, Trash2 } from 'lucide-react';
import { DoorConfig, FoodItem, SortMode, UserProfile } from '../types';
import { getCategoryIcon, getExpirationBadge, getDaysUntilExpiration } from '../utils/displayHelpers';

interface FridgeGridProps {
  visibleDoors: { fridgeId: string, fridgeName: string, door: DoorConfig }[];
  items: FoodItem[];
  searchQuery: string;
  sortMode: SortMode;
  userProfiles: UserProfile[];
  expandedDoors: string[];
  draggedItemId: string | null;
  onToggleDoor: (doorId: string) => void;
  onAddItemClick: (fridgeId: string, doorId: string) => void;
  onUpdateItemQty: (id: string, delta: number) => void;
  onEditItem: (item: FoodItem) => void;
  onDeleteItem: (item: FoodItem) => void;
  onDragStart: (e: React.DragEvent, itemId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetDoorId: string) => void;
}

export const FridgeGrid = ({
  visibleDoors,
  items,
  searchQuery,
  sortMode,
  userProfiles,
  expandedDoors,
  draggedItemId,
  onToggleDoor,
  onAddItemClick,
  onUpdateItemQty,
  onEditItem,
  onDeleteItem,
  onDragStart,
  onDragOver,
  onDrop
}: FridgeGridProps) => {

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

  const checkItemRestrictions = (itemName: string) => {
     if (!userProfiles || userProfiles.length === 0) return null;
     
     const warnings: string[] = [];
     userProfiles.forEach(user => {
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

  return (
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
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, door.id)}
          >
            {/* Door Header */}
            <div className={`p-4 border-b border-slate-100 transition-colors flex justify-between items-center ${
               draggedItemId ? 'bg-blue-50 border-blue-200' : 'bg-slate-50/50'
            }`}>
              <div 
                onClick={() => onToggleDoor(door.id)}
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
                onClick={() => onAddItemClick(fridgeId, door.id)}
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
                      onDragStart={(e) => onDragStart(e, item.id)}
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
                            onClick={() => onUpdateItemQty(item.id, -1)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-md transition text-slate-500"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-bold text-slate-700">{item.quantity}</span>
                          <button 
                            onClick={() => onUpdateItemQty(item.id, 1)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-md transition text-slate-500"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => onEditItem(item)}
                          className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Pencil className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => onDeleteItem(item)}
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
                   onClick={() => onToggleDoor(door.id)}
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
  );
};
