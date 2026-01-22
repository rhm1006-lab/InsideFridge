
import React from 'react';
import { Settings, Calendar, MapPin, Droplets, Wind, Sun, Cloud, CloudRain, Snowflake, CloudLightning } from 'lucide-react';
import { WeatherData } from '../types';
import { FlipDigit } from './FlipDigit';

interface HeaderProps {
  currentTime: Date;
  weather: WeatherData;
  onOpenSettings: () => void;
  onOpenWeather: () => void;
}

export const Header = ({ currentTime, weather, onOpenSettings, onOpenWeather }: HeaderProps) => {
  const hours = currentTime.getHours();
  const minutes = currentTime.getMinutes();
  const seconds = currentTime.getSeconds();
  
  // Solar Date Formatting
  const year = currentTime.getFullYear();
  const month = currentTime.getMonth() + 1;
  const day = currentTime.getDate();
  const weekday = currentTime.toLocaleDateString('ko-KR', { weekday: 'long' });
  const solarDate = `${year}년 ${month}월 ${day}일 ${weekday}`;

  // Lunar Date Formatting (using Intl API)
  let lunarDateStr = "";
  try {
    const lunarFormatter = new Intl.DateTimeFormat('ko-KR', {
      calendar: 'chinese',
      month: 'numeric',
      day: 'numeric'
    });
    // Intl output is typically like "12월 23일"
    const lunarRaw = lunarFormatter.format(currentTime);
    lunarDateStr = ` (음력 ${lunarRaw})`;
  } catch (e) {
    // Fallback if chinese calendar is not supported in environment
    lunarDateStr = "";
  }

  const getWeatherIcon = (className: string, code?: number) => {
    const c = code !== undefined ? code : weather.code;
    
    if (c === undefined) {
      if (weather.condition.includes('맑음')) return <Sun className={`${className} text-orange-500`} />;
      if (weather.condition.includes('구름') || weather.condition.includes('흐림')) return <Cloud className={`${className} text-gray-400`} />;
      if (weather.condition.includes('비')) return <CloudRain className={`${className} text-blue-400`} />;
      if (weather.condition.includes('눈')) return <Snowflake className={`${className} text-cyan-300`} />;
      return <Sun className={`${className} text-orange-500`} />;
    }

    if (c === 0 || c === 1) return <Sun className={`${className} text-orange-500`} />;
    if (c <= 3) return <Cloud className={`${className} text-gray-400`} />;
    if (c <= 48) return <Wind className={`${className} text-gray-400`} />;
    if (c <= 67 || (c >= 80 && c <= 82)) return <CloudRain className={`${className} text-blue-400`} />;
    if (c <= 77 || c >= 85) return <Snowflake className={`${className} text-cyan-300`} />;
    if (c >= 95) return <CloudLightning className={`${className} text-purple-500`} />;
    
    return <Sun className={`${className} text-orange-500`} />;
  };

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap lg:flex-nowrap justify-between items-center sticky top-0 z-20 shadow-md gap-4">
      {/* Left: Expanded Flip Clock */}
      <div className="flex flex-col gap-2 shrink-0">
         <div className="flex items-center gap-3">
            <FlipDigit value={hours} />
            <div className="flex flex-col gap-3">
               <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
               <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
            </div>
            <FlipDigit value={minutes} />
            <div className="flex flex-col gap-3">
               <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
               <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
            </div>
            <FlipDigit value={seconds} />
         </div>
         <div className="text-lg text-slate-700 font-bold pl-1 tracking-wide flex items-center gap-2 mt-1">
            <Calendar className="w-5 h-5 text-slate-400" /> 
            {solarDate}
            <span className="text-slate-400 font-medium text-base ml-1">{lunarDateStr}</span>
         </div>
      </div>

      {/* Right: Compact Smart Weather Card */}
      <div className="flex items-center gap-3 shrink-0 ml-auto lg:ml-0">
         <div 
           onClick={onOpenWeather}
           className="bg-white rounded-2xl p-4 shadow-lg border border-slate-100 w-auto min-w-[320px] text-slate-800 relative overflow-hidden group flex flex-col justify-center h-28 cursor-pointer transition hover:shadow-xl"
         >
             <div className="relative z-10 flex items-center justify-between gap-6">
               {/* Left: Location & Details */}
               <div>
                  <h3 className="text-lg font-bold mb-1 flex items-center gap-1.5 text-slate-900">
                     <MapPin className="w-4 h-4 text-blue-600" />
                     <span className="tracking-wide truncate max-w-[120px]">
                       {weather.code !== undefined ? '현재 날씨' : '날씨 로딩'}
                     </span>
                  </h3>
                  <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                     <span className="flex items-center gap-1"><Droplets className="w-3 h-3 text-blue-500" /> {weather.humidity}%</span>
                     <span className="flex items-center gap-1"><Wind className="w-3 h-3 text-cyan-500" /> {weather.wind}</span>
                     <span className={`px-1.5 py-0.5 rounded ${weather.pm25 === '좋음' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                       미세먼지 {weather.pm25}
                     </span>
                  </div>
               </div>

               {/* Center: Current Temp */}
               <div className="flex flex-col items-center">
                  <span className="text-5xl font-bold tracking-tighter leading-none text-slate-900">{weather.temp}°</span>
                  <span className="text-slate-500 text-xs font-bold mt-1">{weather.condition}</span>
               </div>

               {/* Right: Icon */}
               <div className="pl-2">
                  {getWeatherIcon("w-12 h-12 text-slate-800")}
               </div>
             </div>
         </div>

         {/* Settings Button */}
         <button 
            onClick={onOpenSettings}
            className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition shadow-sm border border-slate-200 h-min"
         >
            <Settings className="w-6 h-6" />
         </button>
      </div>
    </header>
  );
};
