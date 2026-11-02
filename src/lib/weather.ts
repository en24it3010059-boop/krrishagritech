export interface GeoLocation {
  name: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
}

export interface CurrentWeather {
  temperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
}

export interface DailyForecast {
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  precipitation: number;
  windMax: number;
}

export interface Forecast {
  current: CurrentWeather;
  daily: DailyForecast[];
}

export interface WeatherAlert {
  id: string;
  date: string;
  severity: 'high' | 'medium';
  title: string;
  detail: string;
}

export type WeatherKind = 'clear' | 'partly' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'storm';

interface GeoApiResponse {
  results?: Record<string, unknown>[];
}

interface ForecastApiResponse {
  current?: Record<string, unknown>;
  daily?: Record<string, unknown[] | undefined>;
}

export function formatLocation(location: GeoLocation): string {
  return [location.name, location.region, location.country].filter(Boolean).join(', ');
}

export async function searchLocations(query: string): Promise<GeoLocation[]> {
  const params = new URLSearchParams({ name: query, count: '5', language: 'en', format: 'json' });
  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`);
  if (!response.ok) throw new Error('Location search is unavailable right now. Please try again.');

  const json = (await response.json()) as GeoApiResponse;
  return (json.results ?? []).flatMap((item) => {
    if (typeof item.name !== 'string' || typeof item.latitude !== 'number' || typeof item.longitude !== 'number') {
      return [];
    }
    return [
      {
        name: item.name,
        region: typeof item.admin1 === 'string' ? item.admin1 : '',
        country: typeof item.country === 'string' ? item.country : '',
        latitude: item.latitude,
        longitude: item.longitude,
      },
    ];
  });
}

function requireNumber(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error('Weather data came back in an unexpected format.');
  }
  return value;
}

export async function fetchForecast(latitude: number, longitude: number): Promise<Forecast> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max',
    timezone: 'auto',
    forecast_days: '7',
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!response.ok) throw new Error('Weather data is unavailable right now. Please try again.');

  const json = (await response.json()) as ForecastApiResponse;
  const { current, daily } = json;
  if (!current || !daily || !Array.isArray(daily.time)) {
    throw new Error('Weather data came back in an unexpected format.');
  }

  const days = daily.time.map((date, index) => ({
    date: String(date),
    weatherCode: requireNumber(daily.weather_code?.[index]),
    tempMax: requireNumber(daily.temperature_2m_max?.[index]),
    tempMin: requireNumber(daily.temperature_2m_min?.[index]),
    precipitation: requireNumber(daily.precipitation_sum?.[index]),
    windMax: requireNumber(daily.wind_speed_10m_max?.[index]),
  }));

  return {
    current: {
      temperature: requireNumber(current.temperature_2m),
      humidity: requireNumber(current.relative_humidity_2m),
      windSpeed: requireNumber(current.wind_speed_10m),
      weatherCode: requireNumber(current.weather_code),
    },
    daily: days,
  };
}

export function buildAlerts(daily: DailyForecast[]): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];

  for (const day of daily) {
    if (day.tempMin <= 2) {
      alerts.push({
        id: `frost-${day.date}`,
        date: day.date,
        severity: 'high',
        title: 'Frost risk',
        detail: `Overnight low of ${Math.round(day.tempMin)}°C. Cover sensitive seedlings and delay irrigation.`,
      });
    }
    if (day.tempMax >= 35) {
      alerts.push({
        id: `heat-${day.date}`,
        date: day.date,
        severity: 'high',
        title: 'Heat stress',
        detail: `Highs of ${Math.round(day.tempMax)}°C. Water early in the morning and provide shade where possible.`,
      });
    }
    if (day.precipitation >= 20) {
      alerts.push({
        id: `rain-${day.date}`,
        date: day.date,
        severity: 'medium',
        title: 'Heavy rain',
        detail: `About ${Math.round(day.precipitation)} mm expected. Check drainage and hold off on fertiliser.`,
      });
    }
    if (day.windMax >= 50) {
      alerts.push({
        id: `wind-${day.date}`,
        date: day.date,
        severity: 'medium',
        title: 'Strong winds',
        detail: `Gusts up to ${Math.round(day.windMax)} km/h. Secure greenhouse covers and stakes.`,
      });
    }
  }

  return alerts.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'high' ? -1 : 1));
}

export function describeWeatherCode(code: number): { label: string; kind: WeatherKind } {
  if (code === 0) return { label: 'Clear sky', kind: 'clear' };
  if (code <= 2) return { label: 'Partly cloudy', kind: 'partly' };
  if (code === 3) return { label: 'Overcast', kind: 'cloudy' };
  if (code === 45 || code === 48) return { label: 'Foggy', kind: 'fog' };
  if (code >= 51 && code <= 57) return { label: 'Drizzle', kind: 'rain' };
  if (code >= 61 && code <= 67) return { label: 'Rain', kind: 'rain' };
  if (code >= 71 && code <= 77) return { label: 'Snow', kind: 'snow' };
  if (code >= 80 && code <= 82) return { label: 'Showers', kind: 'rain' };
  if (code === 85 || code === 86) return { label: 'Snow showers', kind: 'snow' };
  if (code >= 95) return { label: 'Thunderstorm', kind: 'storm' };
  return { label: 'Mixed conditions', kind: 'cloudy' };
}
