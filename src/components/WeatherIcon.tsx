import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun, type LucideIcon } from 'lucide-react';
import type { WeatherKind } from '@/lib/weather';

const WEATHER_ICONS: Record<WeatherKind, LucideIcon> = {
  clear: Sun,
  partly: CloudSun,
  cloudy: Cloud,
  fog: CloudFog,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
};

export function WeatherIcon({ kind, className = '' }: { kind: WeatherKind; className?: string }) {
  const Icon = WEATHER_ICONS[kind];
  return <Icon className={className} aria-hidden="true" />;
}
