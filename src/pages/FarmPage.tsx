import { useState } from 'react';
import { MapPin, Pencil, Sprout } from 'lucide-react';
import type { Farm } from '@/lib/types';
import { useFarmWeather } from '@/hooks/useFarmWeather';
import { Button, Card, EmptyState, InlineAlert, LoadingState, PageHeader } from '@/components/ui';
import { FarmFormModal } from '@/components/FarmFormModal';

function FarmDetails({ farm }: { farm: Farm }) {
  const facts = [
    { label: 'Location', value: farm.location_name || 'Not set' },
    {
      label: 'Coordinates',
      value:
        farm.latitude !== null && farm.longitude !== null
          ? `${farm.latitude.toFixed(3)}, ${farm.longitude.toFixed(3)}`
          : 'Not set',
    },
    { label: 'Soil type', value: farm.soil_type || 'Not specified' },
    { label: 'Size', value: farm.size_acres !== null ? `${farm.size_acres} acres` : 'Not specified' },
  ];

  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-white">
          <Sprout className="h-6 w-6" aria-hidden="true" />
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold text-earth-900">{farm.name}</h2>
          <p className="flex items-center gap-1.5 text-sm text-earth-600">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {farm.location_name || 'Location not set'}
          </p>
        </div>
      </div>
      <dl className="mt-8 grid gap-6 border-t border-earth-100 pt-6 sm:grid-cols-2">
        {facts.map((fact) => (
          <div key={fact.label}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-earth-500">{fact.label}</dt>
            <dd className="mt-1 text-base font-medium text-earth-900">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

export default function FarmPage() {
  const { state, reload } = useFarmWeather();
  const [editing, setEditing] = useState(false);

  const farm = state.status === 'ready' ? state.farm : null;

  const editButton = farm ? (
    <Button variant="secondary" onClick={() => setEditing(true)}>
      <Pencil className="h-4 w-4" aria-hidden="true" />
      Edit farm
    </Button>
  ) : undefined;

  return (
    <>
      <PageHeader
        title="My farm"
        description="Your farm profile powers local weather forecasts and alerts."
        actions={editButton}
      />

      {state.status === 'loading' && <LoadingState label="Loading your farm..." />}

      {state.status === 'error' && (
        <div className="space-y-4">
          <InlineAlert tone="error">{state.message}</InlineAlert>
          <Button variant="secondary" onClick={() => void reload()}>
            Try again
          </Button>
        </div>
      )}

      {state.status === 'ready' &&
        (farm ? (
          <FarmDetails farm={farm} />
        ) : (
          <EmptyState
            icon={Sprout}
            title="Set up your farm"
            description="Add your farm's name, location and soil type so we can forecast weather for your fields."
            action={<Button onClick={() => setEditing(true)}>Create farm profile</Button>}
          />
        ))}

      {editing && (
        <FarmFormModal
          farm={farm}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            void reload();
          }}
        />
      )}
    </>
  );
}
