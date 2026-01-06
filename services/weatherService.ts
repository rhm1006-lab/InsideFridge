import { WeatherData } from "../types";

// WMO Weather interpretation codes (WW)
const WMO_CODES: Record<number, string> = {
  0: "맑음",
  1: "대체로 맑음",
  2: "구름 조금",
  3: "흐림",
  45: "안개",
  48: "안개",
  51: "이슬비",
  53: "이슬비",
  55: "이슬비",
  56: "진눈깨비",
  57: "진눈깨비",
  61: "약한 비",
  63: "비",
  65: "폭우",
  66: "진눈깨비",
  67: "진눈깨비",
  71: "약한 눈",
  73: "눈",
  75: "폭설",
  77: "눈",
  80: "소나기",
  81: "소나기",
  82: "폭우",
  85: "눈 소나기",
  86: "눈 소나기",
  95: "뇌우",
  96: "뇌우/우박",
  99: "뇌우/우박"
};

const getPm25Status = (pm25: number): string => {
  if (pm25 <= 15) return "좋음";
  if (pm25 <= 35) return "보통";
  if (pm25 <= 75) return "나쁨";
  return "매우 나쁨";
};

export const fetchWeatherData = async (lat: number, lon: number): Promise<WeatherData> => {
  try {
    // Open-Meteo does not require an API key for non-commercial use.
    // Fetching Weather and Air Quality in parallel
    const [weatherRes, airRes] = await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`),
      fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm2_5&timezone=auto`)
    ]);

    if (!weatherRes.ok || !airRes.ok) {
      throw new Error("Failed to fetch weather data");
    }

    const weatherData = await weatherRes.json();
    const airData = await airRes.json();

    const current = weatherData.current;
    const daily = weatherData.daily;
    const pm25 = airData.current.pm2_5;

    const code = current.weather_code;
    const condition = WMO_CODES[code] || "흐림";
    const minTemp = Math.round(daily.temperature_2m_min[0]);
    const maxTemp = Math.round(daily.temperature_2m_max[0]);
    
    return {
      temp: Math.round(current.temperature_2m),
      condition: condition,
      humidity: current.relative_humidity_2m,
      wind: `${current.wind_speed_10m}m/s`,
      pm25: getPm25Status(pm25),
      forecast: `오늘 예상 기온은 최저 ${minTemp}°C, 최고 ${maxTemp}°C 입니다. ${condition} 날씨가 이어질 전망입니다.`,
      code: code
    };
  } catch (error) {
    console.error("Weather fetch error:", error);
    // Return a fallback or throw, but here we will let the UI handle the error or stale state
    throw error;
  }
};