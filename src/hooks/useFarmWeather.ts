import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/format';
import type { Farm } from '@/lib/types';
import { buildAlerts, fetchForecast, type Forecast, type WeatherAlert } from '@/lib/weather';

export type FarmWeatherState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      farm: Farm | null;
      forecast: Forecast | null;
      weatherError: string | null;
      alerts: WeatherAlert[];
    };

export function useFarmWeather() {
  const [state, setState] = useState<FarmWeatherState>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });

    const { data, error } = await supabase.from('farms').select('*').maybeSingle();
    if (error) {
      setState({ status: 'error', message: getErrorMessage(error) });
      return;
    }

    const farm = (data as Farm | null) ?? null;
    if (!farm || farm.latitude === null || farm.longitude === null) {
      setState({ status: 'ready', farm, forecast: null, weatherError: null, alerts: [] });
      return;
    }

    try {
      const forecast = await fetchForecast(farm.latitude, farm.longitude);
      setState({
        status: 'ready',
        farm,
        forecast,
        weatherError: null,
        alerts: buildAlerts(forecast.daily),
      });
    } catch (caught) {
      setState({ status: 'ready', farm, forecast: null, weatherError: getErrorMessage(caught), alerts: [] });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { state, reload: load };
}
