
import React from 'react';
import { DEFAULT_CATEGORIES } from '../constants';

export const getCategoryIcon = (category: string) => {
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

export const getExpirationBadge = (days: number) => {
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

export const getDaysUntilExpiration = (expiryDate?: number) => {
  if (!expiryDate) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  
  const diffTime = expiry.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// --- Optimization: Local Heuristics for Categories ---
export const predictCategoryLocally = (itemName: string): string | null => {
  const n = itemName.replace(/\s+/g, ''); // Remove spaces for matching

  const keywordMap: Record<string, string[]> = {
    "잎채소 (상추/깻잎 등)": ["상추", "깻잎", "시금치", "양배추", "치커리", "케일", "부추", "미나리", "청경채", "쑥갓", "배추", "봄동"],
    "뿌리채소 (감자/당근 등)": ["감자", "당근", "고구마", "무", "양파", "마늘", "생강", "연근", "우엉", "도라지", "더덕", "비트"],
    "열매채소 (고추/오이 등)": ["고추", "오이", "호박", "가지", "토마토", "방울토마토", "피망", "파프리카", "옥수수", "콩"],
    "버섯류": ["버섯", "표고", "팽이", "느타리", "새송이", "양송이", "목이"],
    "과일 (사과/배 등)": ["사과", "배", "포도", "딸기", "복숭아", "자두", "감", "귤", "오렌지", "수박", "참외", "메론", "키위"],
    "열대과일": ["바나나", "파인애플", "망고", "아보카도", "레몬", "라임"],
    "소고기": ["소고기", "한우", "등심", "안심", "채끝", "차돌", "양지", "사태", "갈비", "불고기"],
    "돼지고기": ["돼지", "삼겹살", "목살", "항정살", "등갈비", "앞다리", "뒷다리", "제육", "베이컨", "햄", "소시지"],
    "닭/오리고기": ["닭", "치킨", "오리", "훈제오리", "닭가슴살", "닭다리", "삼계탕"],
    "생선/해산물": ["생선", "고등어", "갈치", "조기", "오징어", "낙지", "쭈꾸미", "문어", "새우", "게", "조개", "굴", "전복", "미역", "김", "멸치"],
    "우유/유제품": ["우유", "치즈", "요거트", "버터", "생크림", "유산균"],
    "계란/알류": ["계란", "달걀", "메추리알"],
    "두부/콩류": ["두부", "순두부", "콩나물", "숙주", "유부"],
    "김치/절임배추": ["김치", "깍두기", "석박지", "동치미", "겉절이"],
    "반찬류": ["반찬", "장아찌", "젓갈", "무침", "조림", "볶음"],
    "소스/드레싱/양념": ["소스", "드레싱", "양념", "장", "케찹", "마요네즈", "식초", "기름", "오일", "소금", "설탕", "후추"],
    "음료/주류": ["물", "음료", "주스", "콜라", "사이다", "커피", "맥주", "소주", "와인", "막걸리"],
    "빵/떡/간식": ["빵", "떡", "과자", "초콜릿", "사탕", "케이크", "샌드위치", "토스트"],
    "냉동 육류/생선": ["냉동", "얼린"],
    "아이스크림": ["아이스크림", "하드", "빙수"]
  };

  for (const category of DEFAULT_CATEGORIES) {
    const keywords = keywordMap[category];
    if (keywords) {
      for (const keyword of keywords) {
        if (n.includes(keyword)) {
          return category;
        }
      }
    }
  }

  return null;
};
