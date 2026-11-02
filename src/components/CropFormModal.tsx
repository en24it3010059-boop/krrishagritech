import { useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/format';
import { CROP_HEALTH, CROP_STAGES } from '@/lib/labels';
import type { Crop, CropHealth, CropStage } from '@/lib/types';
import { Button, Field, InlineAlert, Modal, inputClass } from '@/components/ui';

interface CropFormModalProps {
  crop: Crop | null;
  onClose: () => void;
  onSaved: () => void;
}

export function CropFormModal({ crop, onClose, onSaved }: CropFormModalProps) {
  const [name, setName] = useState(crop?.name ?? '');
  const [variety, setVariety] = useState(crop?.variety ?? '');
  const [plantedOn, setPlantedOn] = useState(crop?.planted_on ?? '');
  const [stage, setStage] = useState<CropStage>(crop?.stage ?? 'planted');
  const [health, setHealth] = useState<CropHealth>(crop?.health ?? 'good');
  const [notes, setNotes] = useState(crop?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Enter a name for this crop.');
      return;
    }

    const payload = {
      name: trimmedName,
      variety: variety.trim(),
      planted_on: plantedOn || null,
      stage,
      health,
      notes: notes.trim(),
    };

    setSaving(true);
    setError(null);
    try {
      const request = crop
        ? supabase.from('crops').update(payload).eq('id', crop.id)
        : supabase.from('crops').insert(payload);
      const { error: saveError } = await request;
      if (saveError) throw saveError;
      onSaved();
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={crop ? 'Edit crop' : 'Add a crop'} description="Keep track of what is growing and how it is doing." onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Crop name" htmlFor="crop-name">
            <input id="crop-name" className={inputClass} value={name} onChange={(event) => setName(event.target.value)} placeholder="Maize" />
          </Field>
          <Field label="Variety" htmlFor="crop-variety">
            <input id="crop-variety" className={inputClass} value={variety} onChange={(event) => setVariety(event.target.value)} placeholder="Hybrid 513" />
          </Field>
          <Field label="Planting date" htmlFor="crop-planted">
            <input id="crop-planted" type="date" className={inputClass} value={plantedOn} onChange={(event) => setPlantedOn(event.target.value)} />
          </Field>
          <Field label="Growth stage" htmlFor="crop-stage">
            <select id="crop-stage" className={inputClass} value={stage} onChange={(event) => setStage(event.target.value as CropStage)}>
              {CROP_STAGES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Health" htmlFor="crop-health">
            <select id="crop-health" className={inputClass} value={health} onChange={(event) => setHealth(event.target.value as CropHealth)}>
              {CROP_HEALTH.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Notes" htmlFor="crop-notes" hint="Pests spotted, fertiliser applied, anything to remember.">
          <textarea id="crop-notes" rows={4} className={inputClass} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </Field>

        {error && <InlineAlert tone="error">{error}</InlineAlert>}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {crop ? 'Save changes' : 'Add crop'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
