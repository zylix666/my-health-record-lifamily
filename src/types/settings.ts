export type AppSettings = {
  id: "app_settings";

  locale: "zh-TW" | "en-US";

  // MVP: reminder card inside app only.
  enableAfternoonGapCheck: boolean;
  afternoonGapCheckHour: 16;
  afternoonGapCheckMinute: 0;

  createdAt: string;
  updatedAt: string;
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  id: "app_settings",
  locale: "zh-TW",
  enableAfternoonGapCheck: true,
  afternoonGapCheckHour: 16,
  afternoonGapCheckMinute: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
