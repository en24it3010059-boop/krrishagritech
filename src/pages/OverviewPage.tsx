import { useEffect, useState, type ReactNode } from 'react';
import { AlertTriangle, ArrowRight, CloudSun, MapPin, Package, ShoppingBag, Wheat, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/format';
import { describeWeatherCode } from '@/lib/weather';
import type { PageKey } from '@/components/AppShell';
import { Badge, Button, Card, InlineAlert, LoadingState, PageHeader } from '@/components/ui';
import { WeatherIcon } from '@/components/WeatherIcon';
import { useFarmWeather } from '@/hooks/useFarmWeather';
import type { CropHealth, CropStage, OrderStatus } from '@/lib/types';

interface CropSummary {
  stage: CropStage;
  health: CropHealth;
}

interface Summary {
  activeCrops: number;
  needsAttention: number;
  openOrders: number;
}

const OPEN_ORDER_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'shipped'];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function StatCard({ label, value, hint, icon, tone }: { label: string; value: string; hint: string; icon: ReactNode; tone: string }) {
  return (
    <Card className="flex items-start gap-4 p-5">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}>{icon}</div>
      <div>
        <p className="text-sm font-medium text-earth-600">{label}</p>
        <p className="font-display text-2xl font-bold text-earth-900">{value}</p>
        <p className="text-xs text-earth-500">{hint}</p>
      </div>
    </Card>
  );
}

const QUICK_ACTIONS: { page: PageKey; label: string; icon: LucideIcon }[] = [
  { page: 'crops', label: 'Log a crop', icon: Wheat },
  { page: 'weather', label: 'Check the forecast', icon: CloudSun },
  { page: 'store', label: 'Shop resources', icon: ShoppingBag },
  { page: 'orders', label: 'Track orders', icon: Package },
];

export default function OverviewPage({ onNavigate }: { onNavigate: (page: PageKey) => void }) {
  const { profile } = useAuth();
  const { state: farmWeather } = useFarmWeather();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const [cropsResult, ordersResult] = await Promise.all([
        supabase.from('crops').select('stage, health'),
        supabase.from('orders').select('status'),
      ]);
      if (cancelled) return;

      if (cropsResult.error || ordersResult.error) {
        setSummaryError(getErrorMessage(cropsResult.error ?? ordersResult.error));
        return;
      }

      const crops = (cropsResult.data ?? []) as CropSummary[];
      const orders = (ordersResult.data ?? []) as { status: OrderStatus }[];
      setSummary({
        activeCrops: crops.filter((crop) => crop.stage !== 'harvested').length,
        needsAttention: crops.filter((crop) => crop.health !== 'good').length,
        openOrders: orders.filter((order) => OPEN_ORDER_STATUSES.includes(order.status)).length,
      });
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const firstName = profile?.full_name.split(' ')[0] || 'there';
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const farm = farmWeather.status === 'ready' ? farmWeather.farm : null;
  const forecast = farmWeather.status === 'ready' ? farmWeather.forecast : null;
  const weatherError = farmWeather.status === 'ready' ? farmWeather.weatherError : null;
  const alertCount = farmWeather.status === 'ready' ? farmWeather.alerts.length : null;

  return (
    <>
      <PageHeader title={`${getGreeting()}, ${firstName}`} description={today} />

      {summaryError && (
        <div className="mb-6">
          <InlineAlert tone="error">{summaryError}</InlineAlert>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active crops"
          value={summary ? String(summary.activeCrops) : '-'}
          hint="Planned, planted or growing"
          icon={<Wheat className="h-5 w-5 text-primary-700" aria-hidden="true" />}
          tone="bg-primary-50"
        />
        <StatCard
          label="Needs attention"
          value={summary ? String(summary.needsAttention) : '-'}
          hint="Crops marked watch or critical"
          icon={<AlertTriangle className="h-5 w-5 text-amber-700" aria-hidden="true" />}
          tone="bg-amber-50"
        />
        <StatCard
          label="Weather alerts"
          value={alertCount === null ? '-' : String(alertCount)}
          hint="Next 7 days for your farm"
          icon={<CloudSun className="h-5 w-5 text-sky-700" aria-hidden="true" />}
          tone="bg-sky-50"
        />
        <StatCard
          label="Open orders"
          value={summary ? String(summary.openOrders) : '-'}
          hint="Pending, confirmed or shipping"
          icon={<Package className="h-5 w-5 text-earth-700" aria-hidden="true" />}
          tone="bg-earth-100"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-lg font-semibold text-earth-900">Today's weather</h2>
            {forecast && (
              <Button variant="ghost" onClick={() => onNavigate('weather')} className="px-2 py-1">
                Full forecast <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>

          {farmWeather.status === 'loading' && <LoadingState label="Checking the sky..." />}
          {farmWeather.status === 'error' && <div className="mt-4"><InlineAlert tone="error">{farmWeather.message}</InlineAlert></div>}
          {farmWeather.status === 'ready' && !farm && (
            <p className="mt-4 text-sm text-earth-600">Set up your farm location to see live weather for your fields.</p>
          )}
          {farmWeather.status === 'ready' && farm && !forecast && !weatherError && (
            <p className="mt-4 text-sm text-earth-600">Add your farm's location to see live weather for your fields.</p>
          )}
          {weatherError && <div className="mt-4"><InlineAlert tone="error">{weatherError}</InlineAlert></div>}
          {forecast && (
            <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                <WeatherIcon kind={describeWeatherCode(forecast.current.weatherCode).kind} className="h-14 w-14 text-sky-600" />
                <div>
                  <p className="font-display text-4xl font-bold text-earth-900">{Math.round(forecast.current.temperature)}°C</p>
                  <p className="text-sm text-earth-600">{describeWeatherCode(forecast.current.weatherCode).label}</p>
                </div>
              </div>
              <div className="grid flex-1 grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-earth-500">Humidity</p>
                  <p className="font-semibold text-earth-900">{Math.round(forecast.current.humidity)}%</p>
                </div>
                <div>
                  <p className="text-earth-500">Wind</p>
                  <p className="font-semibold text-earth-900">{Math.round(forecast.current.windSpeed)} km/h</p>
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-lg font-semibold text-earth-900">Your farm</h2>
            {farm && <Badge tone="green">Active</Badge>}
          </div>
          {farm ? (
            <div className="mt-4 space-y-3 text-sm">
              <p className="font-semibold text-earth-900">{farm.name}</p>
              <p className="flex items-start gap-2 text-earth-600">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-earth-400" aria-hidden="true" />
                {farm.location_name || 'Location not set'}
              </p>
              <p className="text-earth-600">
                Soil: <span className="font-medium text-earth-800">{farm.soil_type || 'Not specified'}</span>
              </p>
              <Button variant="secondary" className="mt-2 w-full" onClick={() => onNavigate('farm')}>
                Manage farm
              </Button>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-earth-600">Create your farm profile to unlock weather alerts tailored to your land.</p>
              <Button className="w-full" onClick={() => onNavigate('farm')}>
                Set up my farm
              </Button>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 font-display text-lg font-semibold text-earth-900">Quick actions</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {QUICK_ACTIONS.map(({ page, label, icon: Icon }) => (
            <button
              key={page}
              type="button"
              onClick={() => onNavigate(page)}
              className="group flex items-center gap-3 rounded-2xl bg-white p-4 text-left text-sm font-semibold text-earth-800 shadow-sm ring-1 ring-earth-200/70 transition duration-200 hover:-translate-y-0.5 hover:shadow-md hover:ring-primary-300"
            >
              <Icon className="h-5 w-5 text-primary-600 transition group-hover:scale-110" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
