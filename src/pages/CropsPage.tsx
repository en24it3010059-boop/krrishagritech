import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Pencil, Plus, Trash2, Wheat } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getErrorMessage, formatDate } from '@/lib/format';
import { CROP_HEALTH, CROP_STAGES } from '@/lib/labels';
import type { Crop, CropHealth, CropStage } from '@/lib/types';
import { Badge, Button, Card, EmptyState, InlineAlert, LoadingState, Modal, PageHeader } from '@/components/ui';
import { CropFormModal } from '@/components/CropFormModal';

const STAGE_TONES: Record<CropStage, 'neutral' | 'sky' | 'green' | 'amber'> = {
  planned: 'neutral',
  planted: 'sky',
  growing: 'green',
  harvested: 'amber',
};

const HEALTH_TONES: Record<CropHealth, 'green' | 'amber' | 'red'> = {
  good: 'green',
  watch: 'amber',
  critical: 'red',
};

type Editor = { mode: 'create' } | { mode: 'edit'; crop: Crop };

function CropCard({ crop, onEdit, onDelete }: { crop: Crop; onEdit: () => void; onDelete: () => void }) {
  const stageLabel = CROP_STAGES.find((stage) => stage.value === crop.stage)?.label ?? crop.stage;
  const healthLabel = CROP_HEALTH.find((health) => health.value === crop.health)?.label ?? crop.health;

  return (
    <Card className="flex flex-col transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-lg font-semibold text-earth-900">{crop.name}</h3>
          <p className="truncate text-sm text-earth-500">{crop.variety || 'No variety noted'}</p>
        </div>
        <Badge tone={HEALTH_TONES[crop.health]}>{healthLabel}</Badge>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge tone={STAGE_TONES[crop.stage]}>{stageLabel}</Badge>
        {crop.planted_on && (
          <span className="flex items-center gap-1.5 text-xs text-earth-500">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            Planted {formatDate(crop.planted_on)}
          </span>
        )}
      </div>

      {crop.notes && <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-earth-700">{crop.notes}</p>}

      <div className="mt-auto flex gap-2 pt-6">
        <Button variant="secondary" onClick={onEdit} className="flex-1 py-2">
          <Pencil className="h-4 w-4" aria-hidden="true" />
          Edit
        </Button>
        <Button variant="ghost" onClick={onDelete} className="py-2 text-red-700 hover:bg-red-50" aria-label={`Delete ${crop.name}`}>
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </Card>
  );
}

export default function CropsPage() {
  const [crops, setCrops] = useState<Crop[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Crop | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadCrops = useCallback(async () => {
    const { data, error } = await supabase.from('crops').select('*').order('created_at', { ascending: false });
    if (error) {
      setLoadError(getErrorMessage(error));
      return;
    }
    setLoadError(null);
    setCrops((data as Crop[]) ?? []);
  }, []);

  useEffect(() => {
    void loadCrops();
  }, [loadCrops]);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const { error } = await supabase.from('crops').delete().eq('id', pendingDelete.id);
      if (error) throw error;
      setPendingDelete(null);
      await loadCrops();
    } catch (caught) {
      setDeleteError(getErrorMessage(caught));
    } finally {
      setDeleting(false);
    }
  };

  const healthyCount = crops?.filter((crop) => crop.health === 'good').length ?? 0;
  const attentionCount = crops?.filter((crop) => crop.health !== 'good').length ?? 0;
  const growingCount = crops?.filter((crop) => crop.stage === 'growing' || crop.stage === 'planted').length ?? 0;

  return (
    <>
      <PageHeader
        title="Crops"
        description="Track every crop from planting to harvest and keep an eye on its health."
        actions={
          <Button onClick={() => setEditor({ mode: 'create' })}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add crop
          </Button>
        }
      />

      {loadError && (
        <div className="mb-6">
          <InlineAlert tone="error">{loadError}</InlineAlert>
        </div>
      )}

      {crops && crops.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-3 text-sm">
          <span className="rounded-full bg-white px-4 py-2 font-medium text-earth-800 ring-1 ring-earth-200">
            {crops.length} tracked
          </span>
          <span className="rounded-full bg-white px-4 py-2 font-medium text-earth-800 ring-1 ring-earth-200">
            {growingCount} in the ground
          </span>
          <span className="rounded-full bg-emerald-50 px-4 py-2 font-medium text-emerald-800 ring-1 ring-emerald-200">
            {healthyCount} healthy
          </span>
          <span className="rounded-full bg-amber-50 px-4 py-2 font-medium text-amber-900 ring-1 ring-amber-200">
            {attentionCount} need attention
          </span>
        </div>
      )}

      {!crops && !loadError && <LoadingState label="Loading your crops..." />}

      {crops && crops.length === 0 && (
        <EmptyState
          icon={Wheat}
          title="No crops yet"
          description="Add the crops you are growing to track their stage and health over the season."
          action={
            <Button onClick={() => setEditor({ mode: 'create' })}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add your first crop
            </Button>
          }
        />
      )}

      {crops && crops.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {crops.map((crop) => (
            <CropCard
              key={crop.id}
              crop={crop}
              onEdit={() => setEditor({ mode: 'edit', crop })}
              onDelete={() => {
                setDeleteError(null);
                setPendingDelete(crop);
              }}
            />
          ))}
        </div>
      )}

      {editor && (
        <CropFormModal
          crop={editor.mode === 'edit' ? editor.crop : null}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            void loadCrops();
          }}
        />
      )}

      {pendingDelete && (
        <Modal title="Remove this crop?" description={`"${pendingDelete.name}" will be removed from your tracker.`} onClose={() => setPendingDelete(null)}>
          <div className="space-y-5">
            {deleteError && <InlineAlert tone="error">{deleteError}</InlineAlert>}
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setPendingDelete(null)}>
                Keep crop
              </Button>
              <Button variant="danger" loading={deleting} onClick={confirmDelete}>
                Remove crop
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
