
import React from 'react';
import { ChefHat, RefreshCw, AlertCircle } from 'lucide-react';
import { RecipeSuggestion } from '../types';

interface AIChefRecommendationsProps {
  recipes: RecipeSuggestion[];
  isGeneratingRecipes: boolean;
  hasItems: boolean;
  onFetchRecipes: () => void;
  onSelectRecipe: (recipe: RecipeSuggestion) => void;
}

export const AIChefRecommendations = ({ 
  recipes, 
  isGeneratingRecipes, 
  hasItems, 
  onFetchRecipes, 
  onSelectRecipe 
}: AIChefRecommendationsProps) => {
  return (
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
            {!isGeneratingRecipes && hasItems && (
               <button 
                 onClick={onFetchRecipes}
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
                  onClick={() => onSelectRecipe(recipe)}
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
               <button onClick={onFetchRecipes} className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-50 transition">
                 메뉴 추천받기
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
