import type { DailyCheckIn, DailyGoal, IntakeRecord } from "../types";
import { calculateDailyTotal, calculateGap } from "./calculations";

export function shouldShowAfternoonGapCheck(params: {
  currentDate: string;
  currentHour: number;
  currentMinute: number;
  enableAfternoonGapCheck: boolean;
  existingCheckIn?: DailyCheckIn;
}): boolean {
  if (!params.enableAfternoonGapCheck) return false;
  if (params.currentHour < 16) return false;
  if (params.existingCheckIn?.checkedAt || params.existingCheckIn?.dismissedAt) return false;
  return true;
}

export function buildAfternoonGapCheck(params: {
  id: string;
  date: string;
  records: IntakeRecord[];
  goal: DailyGoal;
  nowIso: string;
}): DailyCheckIn {
  const total = calculateDailyTotal(params.date, params.records);
  const gap = calculateGap(total, params.goal);

  return {
    id: params.id,
    date: params.date,
    checkType: "afternoon_gap_check",
    scheduledHour: 16,
    scheduledMinute: 0,
    ...gap,
    createdAt: params.nowIso,
    updatedAt: params.nowIso,
  };
}
