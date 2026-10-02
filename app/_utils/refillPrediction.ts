import { dosesPerDay } from './dates';

export type RefillInfo = {
  medicineId: string;
  medicineName: string;
  quantityRemaining: number;
  refillThreshold: number;
  dosesPerDay: number;
  /** Estimated days until empty at current schedule */
  daysLeft: number | null;
  isLow: boolean;
  isCriticalLow: boolean;
};

export function predictRefill(med: {
  $id: string;
  medicineName: string;
  quantityRemaining?: number | string;
  quantity?: number | string;
  refillThreshold?: number | string;
  frequency?: string;
}): RefillInfo {
  const remaining = Number(med.quantityRemaining ?? med.quantity ?? 0);
  const threshold = Number(med.refillThreshold ?? 5);
  const dpd = dosesPerDay(med.frequency || 'Once a day') || 1;
  const daysLeft = dpd > 0 ? Math.floor(remaining / dpd) : null;

  return {
    medicineId: med.$id,
    medicineName: med.medicineName,
    quantityRemaining: remaining,
    refillThreshold: threshold,
    dosesPerDay: dpd,
    daysLeft,
    isLow: remaining <= threshold,
    isCriticalLow: remaining <= Math.max(1, Math.floor(threshold / 2)),
  };
}

/** Shareable refill list for pharmacy / family */
export function formatRefillShareList(items: RefillInfo[], patientLabel = 'Patient'): string {
  const lines = items.map((i) => {
    const days =
      i.daysLeft === null ? 'unknown days left' : i.daysLeft <= 0 ? 'OUT' : `~${i.daysLeft} day(s) left`;
    return `• ${i.medicineName}: ${i.quantityRemaining} left (${days})`;
  });
  return (
    `MedRem refill list — ${patientLabel}\n` +
    `${new Date().toLocaleDateString()}\n\n` +
    (lines.length ? lines.join('\n') : 'No medicines need refill.') +
    `\n\nPlease refill the items marked low/out. Thank you.`
  );
}
