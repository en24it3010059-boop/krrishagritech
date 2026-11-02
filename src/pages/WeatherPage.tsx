import { CloudRain, MapPin, RefreshCw, Sprout, Thermometer, Wind } from 'lucide-react';
import { describeWeatherCode, type DailyForecast, type WeatherAlert } from '@/lib/weather';
import { formatDate, formatWeekday } from '@/lib/format';
import type { PageKey } from '@/components/AppShell';
import { Badge, Button, Card, EmptyState, InlineAlert, LoadingState, PageHeader } from '@/components/ui';
import { WeatherIcon } from '@/components/WeatherIcon';
import { useFarmWeather } from '@/hooks/useFarmWeather';

const ALERT_STYLES: Record<WeatherAlert['severity'], { box: string; tone: 'red' | 'amber' }> = {
  high: { box: 'border-red-200 bg-red-50', tone: 'red' },
  medium: { box: 'border-amber-200 bg-amber-50', tone: 'amber' },
};

function AlertList({ alerts }: { alerts: WeatherAlert[] }) {
  if (alerts.length === 0) {
    return <InlineAlert tone="success">No frost, heat, heavy rain or strong wind warnings for the next 7 days.</InlineAlert>;
  }

  return (
    <ul className="space-y-3">
      {alerts.map((alert) => (
        <li key={alert.id} className={`rounded-xl border p-4 animate-fade-up ${ALERT_STYLES[alert.severity].box}`}>
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={ALERT_STYLES[alert.severity].tone}>{alert.severity === 'high' ? 'High priority' : 'Watch'}</Badge>
            <span className="text-sm font-semibold text-earth-900">{alert.title}</span>
            <span className="text-xs text-earth-500">{formatDate(alert.date)}</span>
          </div>
          <p className="mt-2 text-sm text-earth-700">{alert.detail}</p>
        </li>
      ))}
    </ul>
  );
}

function DayCard({ day }: { day: DailyForecast }) {
  const { kind, label } = describeWeatherCode(day.weatherCode);
  return (
    <div className="flex min-w-[7.5rem] flex-col items-center rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-earth-200/70 transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <p className="text-sm font-semibold text-earth-800">{formatWeekday(day.date)}</p>
      <WeatherIcon kind={kind} className="my-3 h-9 w-9 text-sky-600" />
      <p className="text-xs text-earth-500">{label}</p>
      <p className="mt-2 font-display text-lg font-bold text-earth-900">
        {Math.round(day.tempMax)}° <span className="font-medium text-earth-500">{Math.round(day.tempMin)}°</span>
      </p>
      <p className="mt-2 flex items-center gap-1 text-xs text-earth-600">
        <CloudRain className="h-3.5 w-3.5" aria-hidden="true" />
        {day.precipitation.toFixed(1)} mm
      </p>
      <p className="mt-1 flex items-center gap-1 text-xs text-earth-600">
        <Wind className="h-3.5 w-3.5" aria-hidden="true" />
        {Math.round(day.windMax)} km/h
      </p>
    </div>
  );
}

export default function WeatherPage({ onNavigate }: { onNavigate: (page: PageKey) => void }) {
  const { state, reload } = useFarmWeather();

  const refreshButton = (
    <Button variant="secondary" onClick={() => void reload()} loading={state.status === 'loading'}>
      {state.status !== 'loading' && <RefreshCw className="h-4 w-4" aria-hidden="true" />}
      Refresh
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Weather & alerts"
        description="A 7-day forecast for your farm with warnings for frost, heat, heavy rain and strong winds."
        actions={refreshButton}
      />

      {state.status === 'loading' && <LoadingState label="Fetching your forecast..." />}

      {state.status === 'error' && <InlineAlert tone="error">{state.message}</InlineAlert>}

      {state.status === 'ready' && !state.farm && (
        <EmptyState
          icon={Sprout}
          title="Set up your farm first"
          description="We need your farm's location to forecast the weather on your fields."
          action={<Button onClick={() => onNavigate('farm')}>Go to my farm</Button>}
        />
      )}

      {state.status === 'ready' && state.farm && !state.forecast && !state.weatherError && (
        <EmptyState
          icon={MapPin}
          title="Add your farm location"
          description="Pick your farm's town or region on the farm page to see its forecast."
          action={<Button onClick={() => onNavigate('farm')}>Update farm location</Button>}
        />
      )}

      {state.status === 'ready' && state.weatherError && (
        <div className="space-y-4">
          <InlineAlert tone="error">{state.weatherError}</InlineAlert>
          <Button variant="secondary" onClick={() => void reload()}>
            Try again
          </Button>
        </div>
      )}

      {state.status === 'ready' && state.forecast && (
        <div className="space-y-8">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <p className="text-sm font-medium text-earth-500">Right now at {state.farm?.name}</p>
              <div className="mt-4 flex items-center gap-4">
                <WeatherIcon kind={describeWeatherCode(state.forecast.current.weatherCode).kind} className="h-16 w-16 text-sky-600" />
                <div>
                  <p className="font-display text-5xl font-bold text-earth-900">{Math.round(state.forecast.current.temperature)}°C</p>
                  <p className="text-sm text-earth-600">{describeWeatherCode(state.forecast.current.weatherCode).label}</p>
                </div>
              </div>
              <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-earth-100 pt-5 text-sm">
                <div>
                  <dt className="flex items-center gap-1.5 text-earth-500">
                    <Thermometer className="h-4 w-4" aria-hidden="true" />
                    Humidity
                  </dt>
                  <dd className="mt-1 font-semibold text-earth-900">{Math.round(state.forecast.current.humidity)}%</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1.5 text-earth-500">
                    <Wind className="h-4 w-4" aria-hidden="true" />
                    Wind
                  </dt>
                  <dd className="mt-1 font-semibold text-earth-900">{Math.round(state.forecast.current.windSpeed)} km/h</dd>
                </div>
              </dl>
            </Card>

            <Card className="lg:col-span-2">
              <div className="mb-5 flex items-center justify-between gap-4">
                <h2 className="font-display text-lg font-semibold text-earth-900">Alerts for the next 7 days</h2>
                <Badge tone={state.alerts.length > 0 ? 'amber' : 'green'}>{state.alerts.length} active</Badge>
              </div>
              <AlertList alerts={state.alerts} />
            </Card>
          </div>

          <div>
            <h2 className="mb-4 font-display text-lg font-semibold text-earth-900">7-day forecast</h2>
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 lg:grid-cols-7">
              {state.forecast.daily.map((day) => (
                <DayCard key={day.date} day={day} />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
