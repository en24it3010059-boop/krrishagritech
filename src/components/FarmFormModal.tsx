import { useState, type FormEvent } from 'react';
import { MapPin, Search, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/format';
import { SOIL_TYPES } from '@/lib/labels';
import { formatLocation, searchLocations, type GeoLocation } from '@/lib/weather';
import type { Farm } from '@/lib/types';
import { Button, Field, InlineAlert, Modal, inputClass } from '@/components/ui';

interface FarmFormModalProps {
  farm: Farm | null;
  onClose: () => void;
  onSaved: (farm: Farm) => void;
}

export function FarmFormModal({ farm, onClose, onSaved }: FarmFormModalProps) {
  const [name, setName] = useState(farm?.name ?? '');
  const [soilType, setSoilType] = useState(farm?.soil_type || SOIL_TYPES[0]);
  const [sizeAcres, setSizeAcres] = useState(farm?.size_acres !== null && farm?.size_acres !== undefined ? String(farm.size_acres) : '');
  const [location, setLocation] = useState<GeoLocation | null>(
    farm && farm.latitude !== null && farm.longitude !== null
      ? { name: farm.location_name, region: '', country: '', latitude: farm.latitude, longitude: farm.longitude }
      : null,
  );
  const [locationName, setLocationName] = useState(farm?.location_name ?? '');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoLocation[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearching(true);
    setError(null);
    try {
      setResults(await searchLocations(trimmed));
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setSearching(false);
    }
  };

  const selectLocation = (option: GeoLocation) => {
    setLocation(option);
    setLocationName(formatLocation(option));
    setResults(null);
    setQuery('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Give your farm a name.');
      return;
    }
    if (!location) {
      setError('Search for your farm town or region and pick it from the list so we can forecast your weather.');
      return;
    }

    const trimmedSize = sizeAcres.trim();
    const parsedSize = trimmedSize === '' ? null : Number(trimmedSize);
    if (parsedSize !== null && (!Number.isFinite(parsedSize) || parsedSize < 0)) {
      setError('Farm size must be a positive number of acres.');
      return;
    }

    const payload = {
      name: trimmedName,
      location_name: locationName,
      latitude: location.latitude,
      longitude: location.longitude,
      soil_type: soilType,
      size_acres: parsedSize,
    };

    setSaving(true);
    setError(null);
    try {
      const request = farm
        ? supabase.from('farms').update(payload).eq('id', farm.id).select('*').single()
        : supabase.from('farms').insert(payload).select('*').single();
      const { data, error: saveError } = await request;
      if (saveError) throw saveError;
      onSaved(data as Farm);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={farm ? 'Edit farm profile' : 'Create your farm'}
      description="We use your location to forecast weather and send alerts for your fields."
      onClose={onClose}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <Field label="Farm name" htmlFor="farm-name">
          <input id="farm-name" className={inputClass} value={name} onChange={(event) => setName(event.target.value)} placeholder="Sunrise Valley Farm" />
        </Field>

        <div className="space-y-3">
          <Field label="Farm location" htmlFor="location-search" hint="Search for the nearest town or region.">
            <div className="flex gap-2">
              <input
                id="location-search"
                className={inputClass}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void handleSearch();
                  }
                }}
                placeholder="Search a town or region"
              />
              <Button variant="secondary" onClick={handleSearch} loading={searching} className="shrink-0">
                {!searching && <Search className="h-4 w-4" aria-hidden="true" />}
                Search
              </Button>
            </div>
          </Field>

          {results && results.length === 0 && (
            <p className="text-sm text-earth-600">No matches found. Try a nearby town or a larger city.</p>
          )}
          {results && results.length > 0 && (
            <ul className="divide-y divide-earth-100 overflow-hidden rounded-lg border border-earth-200 animate-fade-in">
              {results.map((option) => (
                <li key={`${option.latitude}-${option.longitude}`}>
                  <button
                    type="button"
                    onClick={() => selectLocation(option)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-earth-800 transition hover:bg-primary-50"
                  >
                    <MapPin className="h-4 w-4 shrink-0 text-primary-600" aria-hidden="true" />
                    {formatLocation(option)}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {location && (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-900">
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary-600" aria-hidden="true" />
                {locationName}
              </span>
              <button
                type="button"
                onClick={() => {
                  setLocation(null);
                  setLocationName('');
                }}
                aria-label="Clear location"
                className="rounded p-1 text-primary-700 transition hover:bg-primary-100"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Soil type" htmlFor="soil-type">
            <select id="soil-type" className={inputClass} value={soilType} onChange={(event) => setSoilType(event.target.value)}>
              {SOIL_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Size (acres)" htmlFor="farm-size">
            <input
              id="farm-size"
              inputMode="decimal"
              className={inputClass}
              value={sizeAcres}
              onChange={(event) => setSizeAcres(event.target.value)}
              placeholder="e.g. 12.5"
            />
          </Field>
        </div>

        {error && <InlineAlert tone="error">{error}</InlineAlert>}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {farm ? 'Save changes' : 'Create farm'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
