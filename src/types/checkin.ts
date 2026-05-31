export type DailyCheckInType = "afternoon_gap_check";

export type DailyCheckIn = {
  id: string;
  date: string; // YYYY-MM-DD
  checkType: DailyCheckInType;

  // MVP fixed time: 16:00
  scheduledHour: 16;
  scheduledMinute: 0;

  checkedAt?: string;
  dismissedAt?: string;

  waterGapMl: number;
  fiberGapG: number;
  proteinGapG: number;

  note?: string;
  createdAt: string;
  updatedAt: string;
};
