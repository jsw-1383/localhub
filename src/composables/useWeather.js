import { ref } from 'vue';

function chooseWeatherIconByText(text) {
  if (!text) return '☁️';
  if (text.includes('비')) return '🌧️';
  if (text.includes('눈')) return '❄️';
  if (text.includes('맑음')) return '☀️';
  if (text.includes('구름많음') || text.includes('구름')) return '⛅';
  if (text.includes('흐림')) return '☁️';
  return '☁️';
}

function getLatestForecastBaseDateTime(now = new Date()) {
  const baseTimes = ['0200', '0500', '0800', '1100', '1400', '1700', '2000', '2300'];
  const hour = now.getHours();
  const minute = now.getMinutes();
  const latest = baseTimes.slice().reverse().find(time => {
    const baseHour = Number(time.slice(0, 2));
    return hour > baseHour || (hour === baseHour && minute >= 0);
  });

  if (latest) {
    return {
      baseDate: `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`,
      baseTime: latest
    };
  }

  const previousDay = new Date(now);
  previousDay.setDate(previousDay.getDate() - 1);
  return {
    baseDate: `${previousDay.getFullYear()}${String(previousDay.getMonth() + 1).padStart(2, '0')}${String(previousDay.getDate()).padStart(2, '0')}`,
    baseTime: '2300'
  };
}

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function parseShortTermWeather(response) {
  const items = response?.response?.body?.items?.item || [];
  const rows = Array.isArray(items) ? items : [items];
  const dailyMap = new Map();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  rows.forEach(item => {
    const fcstDate = item.fcstDate;
    if (!fcstDate) return;
    const date = new Date(`${fcstDate.slice(0,4)}-${fcstDate.slice(4,6)}-${fcstDate.slice(6,8)}`);
    date.setHours(0,0,0,0);
    if (date < today) return;

    const key = fcstDate;
    if (!dailyMap.has(key)) {
      dailyMap.set(key, { date, pty: '0', sky: '1' });
    }

    const entry = dailyMap.get(key);
    const category = item.category;
    const value = item.fcstValue;

    if (category === 'PTY') entry.pty = value;
    if (category === 'SKY') entry.sky = value;
  });

  return Array.from(dailyMap.values())
    .sort((a,b)=>a.date-b.date)
    .slice(0, 14) // 가져온 데이터 중 앞 2주 내로 제한
    .map(entry => {
      const weatherText = entry.pty !== '0' ? '비' : (entry.sky === '1' ? '맑음' : entry.sky === '3' ? '구름많음' : '흐림');
      return {
        date: entry.date,
        key: formatDateKey(entry.date),
        icon: chooseWeatherIconByText(weatherText),
        text: weatherText
      };
    });
}

function parseMidTermWeather(response) {
  const items = response?.response?.body?.items?.item;
  const item = Array.isArray(items) ? items[0] : items;
  if (!item) return [];

  const now = new Date();
  const entries = [];

  for (let offset = 1; offset <= 7; offset += 1) {
    const date = new Date(now);
    date.setDate(date.getDate() + offset);
    const day = date.getDate();
    // mid term keys in KMA are wf1 ~ wf7, but also wf{n}Am/Pm exist; choose wf{n}
    const key = `wf${offset}`;
    const forecastText = item[key] ? item[key].trim() : '';
    if (!forecastText) continue;
    entries.push({
      date,
      key: formatDateKey(date),
      icon: chooseWeatherIconByText(forecastText),
      text: forecastText
    });
  }

  return entries;
}

export function useWeather() {
  const loading = ref(false);
  const forecast = ref([]);
  const source = ref('');

  async function fetchShortTerm(nx = 67, ny = 100) {
    loading.value = true;
    forecast.value = [];
    try {
      const key = import.meta.env.VITE_WEATHER_SERVICE_KEY?.trim();
      if (key) {
        const now = new Date();
        const { baseDate, baseTime } = getLatestForecastBaseDateTime(now);
        const shortUrl = `/api/kma/vilage/VilageFcstInfoService_2.0/getVilageFcst?authKey=${key}&pageNo=1&numOfRows=1000&dataType=JSON&base_date=${baseDate}&base_time=${baseTime}&nx=${nx}&ny=${ny}`;
        const midUrl = `/api/kma/vilage/MidFcstInfoService/getMidLandFcst?authKey=${key}&pageNo=1&numOfRows=10&dataType=JSON&regId=11B00000&tmFc=${baseDate}0600`;
        const [shortRes, midRes] = await Promise.all([fetch(shortUrl), fetch(midUrl)]);
        if (shortRes.ok) {
          const shortJson = await shortRes.json();
          const parsedShort = parseShortTermWeather(shortJson) || [];
          let parsedMid = [];
          if (midRes.ok) {
            const midJson = await midRes.json();
            parsedMid = parseMidTermWeather(midJson) || [];
          }
          // merge short + mid, dedupe by key, prefer short entries when overlap
          const map = new Map();
          parsedShort.forEach(p => map.set(p.key, p));
          parsedMid.forEach(p => { if (!map.has(p.key)) map.set(p.key, p); });
          const merged = Array.from(map.values()).sort((a,b)=>a.date-b.date);
          if (merged.length) {
            forecast.value = merged;
            source.value = 'KMA';
            console.log('[useWeather] source=KMA, dates=', forecast.value.map(f=>f.key));
            return;
          }
        }
        // fallthrough to open-meteo if parsed empty
      }

      // Fallback to Open-Meteo (no API key required) for broad availability
      // Use Gwangju coordinates by default (lat:35.1595, lon:126.8526)
      const lat = 35.1595;
      const lon = 126.8526;
      const omUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode&timezone=Asia%2FSeoul`;
      const omRes = await fetch(omUrl);
      if (!omRes.ok) throw new Error('Open-Meteo 요청 실패');
      const omJson = await omRes.json();
      const dates = omJson.daily?.time || [];
      const codes = omJson.daily?.weathercode || [];
      const mapCodeToText = code => {
        // simplified mapping
        if ([61,63,65,80,81,82].includes(code)) return '비';
        if ([71,73,75,77,85,86].includes(code)) return '눈';
        if ([0].includes(code)) return '맑음';
        if ([1,2,3].includes(code)) return '구름많음';
        return '흐림';
      };
      forecast.value = dates.map((t, i) => {
        const d = new Date(t + 'T00:00:00');
        const text = mapCodeToText(codes[i]);
        return { date: d, key: formatDateKey(d), icon: chooseWeatherIconByText(text), text };
      });
      source.value = 'Open-Meteo';
      console.log('[useWeather] source=Open-Meteo, dates=', forecast.value.map(f=>f.key));
    } catch (e) {
      console.warn(e);
      forecast.value = [];
    } finally {
      loading.value = false;
    }
  }

  return { loading, forecast, fetchShortTerm, source };
}
