import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { buildAfternoonGapCheck, shouldShowAfternoonGapCheck } from "../domain/afternoonGapCheck";
import { calculateDailyTotal, calculateGap, calculateGoalProgress, calculateRecordNutrition, createIntakeRecordFromFood } from "../domain/calculations";
import { validateBackupPayload } from "../storage/backup";
import { repository } from "../storage/repository";
import {
  DEFAULT_APP_SETTINGS,
  DEFAULT_DAILY_GOAL,
  FOOD_CATEGORIES,
  FOOD_CATEGORY_LABELS,
  SERVING_UNITS,
  type AppSettings,
  type DailyCheckIn,
  type DailyGoal,
  type FoodCategory,
  type FoodItem,
  type IntakeRecord,
  type ServingUnit,
} from "../types";
import { addDays, formatHour, generateId, toDateKey } from "../utils/date";

type Page = "dashboard" | "add" | "daily" | "charts" | "foods" | "settings";

type AppState = {
  foods: FoodItem[];
  todayRecords: IntakeRecord[];
  selectedDateRecords: IntakeRecord[];
  goal: DailyGoal;
  settings: AppSettings;
  checkIn?: DailyCheckIn;
};

const today = () => toDateKey();

export function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [selectedDate, setSelectedDate] = useState(today());
  const [state, setState] = useState<AppState>({
    foods: [],
    todayRecords: [],
    selectedDateRecords: [],
    goal: DEFAULT_DAILY_GOAL,
    settings: DEFAULT_APP_SETTINGS,
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function refresh(date = selectedDate) {
    const currentDate = today();
    const [foods, todayRecords, selectedDateRecords, goal, settings, checkIn] = await Promise.all([
      repository.listFoods(),
      repository.listIntakeRecordsByDate(currentDate),
      repository.listIntakeRecordsByDate(date),
      repository.getDailyGoal(),
      repository.getSettings(),
      repository.getDailyCheckIn(currentDate, "afternoon_gap_check"),
    ]);
    setState({ foods, todayRecords, selectedDateRecords, goal, settings, checkIn });
  }

  useEffect(() => {
    repository.initialize().then(() => refresh()).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading) refresh(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    if (!message) return;
    const seconds = normalizeToastDuration(state.settings.toastDurationSeconds);
    const timer = window.setTimeout(() => setMessage(""), seconds * 1000);
    return () => window.clearTimeout(timer);
  }, [message, state.settings.toastDurationSeconds]);

  const pageTitle = {
    dashboard: "今日狀態",
    add: "新增紀錄",
    daily: "每日明細",
    charts: "趨勢",
    foods: "食物庫",
    settings: "設定",
  }[page];

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">健康紀錄</p>
          <h1>{pageTitle}</h1>
        </div>
        <div className="topbar-actions">
          {page === "add" && (
            <button type="submit" form="add-intake-form">
              儲存紀錄
            </button>
          )}
          <button className="ghost-button" type="button" onClick={() => setPage("foods")}>
            食物庫
          </button>
        </div>
      </header>

      {message && <div className="toast">{message}</div>}

      <main className="content">
        {loading ? (
          <section className="panel">載入中...</section>
        ) : (
          <>
            {page === "dashboard" && (
              <DashboardPage
                state={state}
                onNavigate={setPage}
                onRefresh={refresh}
                onMessage={setMessage}
              />
            )}
            {page === "add" && (
              <AddPage
                foods={state.foods}
                onSaved={async () => {
                  await refresh();
                  setMessage("已新增攝取紀錄");
                  setPage("dashboard");
                }}
              />
            )}
            {page === "daily" && (
              <DailyPage
                date={selectedDate}
                records={state.selectedDateRecords}
                goal={state.goal}
                onDateChange={setSelectedDate}
                onDeleted={async () => {
                  await refresh();
                  setMessage("已刪除紀錄");
                }}
                onUpdated={async () => {
                  await refresh();
                  setMessage("已更新紀錄");
                }}
              />
            )}
            {page === "charts" && <ChartsPage goal={state.goal} />}
            {page === "foods" && (
              <FoodPage
                foods={state.foods}
                onChanged={async () => {
                  await refresh();
                  setMessage("食物庫已更新");
                }}
              />
            )}
            {page === "settings" && (
              <SettingsPage
                goal={state.goal}
                settings={state.settings}
                onChanged={async () => {
                  await refresh();
                  setMessage("設定已更新");
                }}
              />
            )}
          </>
        )}
      </main>

      <nav className="bottom-nav" aria-label="主要導覽">
        {[
          ["dashboard", "今日"],
          ["add", "新增"],
          ["daily", "明細"],
          ["charts", "趨勢"],
          ["settings", "設定"],
        ].map(([key, label]) => (
          <button key={key} className={page === key ? "active" : ""} type="button" onClick={() => setPage(key as Page)}>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function DashboardPage({
  state,
  onNavigate,
  onRefresh,
  onMessage,
}: {
  state: AppState;
  onNavigate: (page: Page) => void;
  onRefresh: () => Promise<void>;
  onMessage: (message: string) => void;
}) {
  const currentDate = today();
  const total = calculateDailyTotal(currentDate, state.todayRecords);
  const progress = calculateGoalProgress(total, state.goal);
  const now = new Date();
  const showGap = shouldShowAfternoonGapCheck({
    currentDate,
    currentHour: now.getHours(),
    currentMinute: now.getMinutes(),
    enableAfternoonGapCheck: state.settings.enableAfternoonGapCheck,
    existingCheckIn: state.checkIn,
  });
  const checkIn = state.checkIn ?? buildAfternoonGapCheck({ id: generateId("check"), date: currentDate, records: state.todayRecords, goal: state.goal, nowIso: now.toISOString() });
  const complete = total.waterMl >= state.goal.waterMl && total.fiberG >= state.goal.fiberG && total.proteinG >= state.goal.proteinG;

  async function dismissGap(checked: boolean) {
    const saved = {
      ...checkIn,
      checkedAt: checked ? new Date().toISOString() : checkIn.checkedAt,
      dismissedAt: checked ? checkIn.dismissedAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await repository.saveDailyCheckIn(saved);
    await onRefresh();
    onMessage(checked ? "已完成 16:00 缺口檢查" : "今日不再提醒");
  }

  return (
    <section className="stack dashboard-stack">
      <div className="hero-panel">
        <div>
          <p>{currentDate}</p>
          <h2>{complete ? "今天三項目標都達成了" : "今天還可以再補一點"}</h2>
        </div>
        <button type="button" onClick={() => onNavigate("add")}>新增攝取</button>
      </div>
      <MetricCards total={total} goal={state.goal} progress={progress} />
      {showGap && (
        <div className="panel accent">
          <h2>16:00 缺口檢查</h2>
          <div className="gap-grid">
            <Gap label="水分" value={`${checkIn.waterGapMl} ml`} />
            <Gap label="纖維" value={`${checkIn.fiberGapG} g`} />
            <Gap label="蛋白質" value={`${checkIn.proteinGapG} g`} />
          </div>
          <div className="row gap-actions">
            <button type="button" onClick={() => dismissGap(true)}>我看過了</button>
            <button className="secondary" type="button" onClick={() => dismissGap(false)}>今日略過</button>
          </div>
        </div>
      )}
      <div className="quick-actions">
        <button type="button" onClick={() => onNavigate("daily")}>查看明細</button>
      </div>
    </section>
  );
}

function MetricCards({ total, goal, progress }: { total: ReturnType<typeof calculateDailyTotal>; goal: DailyGoal; progress: ReturnType<typeof calculateGoalProgress> }) {
  return (
    <div className="metric-grid">
      <Metric label="水分" value={`${total.waterMl} ml`} target={`${goal.waterMl} ml`} percent={progress.waterPercent} />
      <Metric label="膳食纖維" value={`${total.fiberG} g`} target={`${goal.fiberG} g`} percent={progress.fiberPercent} />
      <Metric label="蛋白質" value={`${total.proteinG} g`} target={`${goal.proteinG} g`} percent={progress.proteinPercent} />
    </div>
  );
}

function Metric({ label, value, target, percent }: { label: string; value: string; target: string; percent: number }) {
  return (
    <div className="metric-card">
      <div className="metric-header">
        <span>{label}</span>
        <strong>{Math.round(percent)}%</strong>
      </div>
      <p>{value}</p>
      <small>目標 {target}</small>
      <div className="progress"><span style={{ width: `${Math.min(percent, 100)}%` }} /></div>
    </div>
  );
}

function Gap({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function normalizeToastDuration(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_APP_SETTINGS.toastDurationSeconds;
  return Math.max(1, Math.min(120, Math.round(value)));
}

function AddPage({ foods, onSaved }: { foods: FoodItem[]; onSaved: () => Promise<void> }) {
  const [hour, setHour] = useState(new Date().getHours());
  const [category, setCategory] = useState<FoodCategory | "">("");
  const [foodName, setFoodName] = useState("");
  const [servingFoodId, setServingFoodId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const filteredFoods = foods.filter((food) => food.category === category);
  const foodGroups = groupFoodsByName(filteredFoods);
  const selectedGroup = foodGroups.find((group) => group.name === foodName);
  const selectedFood = selectedGroup?.foods.length === 1 ? selectedGroup.foods[0] : selectedGroup?.foods.find((food) => food.id === servingFoodId);
  const preview = selectedFood ? calculateRecordNutrition(selectedFood, quantity || 0) : { waterMl: 0, fiberG: 0, proteinG: 0 };

  async function save(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!selectedFood || quantity <= 0) return;
    const nowIso = new Date().toISOString();
    await repository.saveIntakeRecord(
      createIntakeRecordFromFood({
        id: generateId("intake"),
        date: today(),
        hour,
        food: selectedFood,
        quantity,
        note: note.trim() || undefined,
        nowIso,
      }),
    );
    await onSaved();
  }

  return (
    <form id="add-intake-form" className="panel form-panel" onSubmit={save}>
      <label>時間
        <select value={hour} onChange={(event) => setHour(Number(event.target.value))}>
          {Array.from({ length: 24 }, (_, index) => <option key={index} value={index}>{formatHour(index)}</option>)}
        </select>
      </label>
      <label>分類
        <select value={category} onChange={(event) => { setCategory(event.target.value as FoodCategory); setFoodName(""); setServingFoodId(""); }}>
          <option value="">選擇分類</option>
          {FOOD_CATEGORIES.map((item) => <option key={item} value={item}>{FOOD_CATEGORY_LABELS[item]}</option>)}
        </select>
      </label>
      <label>食物
        <select value={foodName} disabled={!category} onChange={(event) => { setFoodName(event.target.value); setServingFoodId(""); }}>
          <option value="">選擇食物</option>
          {foodGroups.map((group) => <option key={group.name} value={group.name}>{group.name}</option>)}
        </select>
      </label>
      {selectedGroup && selectedGroup.foods.length > 1 && (
        <label>份量選項
          <select value={servingFoodId} onChange={(event) => setServingFoodId(event.target.value)}>
            <option value="">選擇份量</option>
            {selectedGroup.foods.map((food) => <option key={food.id} value={food.id}>{food.servingName}</option>)}
          </select>
        </label>
      )}
      {selectedGroup && selectedGroup.foods.length === 1 && (
        <div className="hint">份量：{selectedGroup.foods[0].servingName}</div>
      )}
      <label>份量
        <input min="0.1" step="0.1" type="number" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} />
      </label>
      <div className="preview-strip">
        <span>水 {preview.waterMl} ml</span>
        <span>纖維 {preview.fiberG} g</span>
        <span>蛋白質 {preview.proteinG} g</span>
      </div>
      <label>備註
        <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} />
      </label>
    </form>
  );
}

function groupFoodsByName(foods: FoodItem[]): Array<{ name: string; foods: FoodItem[] }> {
  const groups = new Map<string, FoodItem[]>();
  foods.forEach((food) => {
    const group = groups.get(food.name) ?? [];
    group.push(food);
    groups.set(food.name, group);
  });

  return [...groups.entries()].map(([name, groupFoods]) => ({
    name,
    foods: groupFoods.slice().sort((a, b) => a.servingAmount - b.servingAmount || a.servingName.localeCompare(b.servingName)),
  }));
}

function DailyPage({ date, records, goal, onDateChange, onDeleted, onUpdated }: { date: string; records: IntakeRecord[]; goal: DailyGoal; onDateChange: (date: string) => void; onDeleted: () => Promise<void>; onUpdated: () => Promise<void> }) {
  const total = calculateDailyTotal(date, records);
  const gap = calculateGap(total, goal);

  async function updateRecord(record: IntakeRecord, quantity: number) {
    const ratio = quantity / record.quantity;
    await repository.saveIntakeRecord({
      ...record,
      quantity,
      waterMl: Math.round(record.waterMl * ratio * 10) / 10,
      fiberG: Math.round(record.fiberG * ratio * 10) / 10,
      proteinG: Math.round(record.proteinG * ratio * 10) / 10,
      updatedAt: new Date().toISOString(),
    });
    await onUpdated();
  }

  return (
    <section className="stack">
      <div className="panel form-panel">
        <label>日期
          <input type="date" value={date} onChange={(event) => onDateChange(event.target.value)} />
        </label>
        <div className="preview-strip">
          <span>水 {total.waterMl} ml</span>
          <span>纖維 {total.fiberG} g</span>
          <span>蛋白質 {total.proteinG} g</span>
        </div>
        <div className="hint">缺口：水 {gap.waterGapMl} ml，纖維 {gap.fiberGapG} g，蛋白質 {gap.proteinGapG} g</div>
      </div>
      <div className="timeline">
        {records.length === 0 && <div className="panel empty">這天還沒有紀錄</div>}
        {records.map((record) => (
          <article className="timeline-item" key={record.id}>
            <time>{formatHour(record.hour, record.minute)}</time>
            <div>
              <h3>{record.foodNameSnapshot}</h3>
              <p>{FOOD_CATEGORY_LABELS[record.categorySnapshot]} · {record.quantity} x {record.servingNameSnapshot}</p>
              <small>水 {record.waterMl} ml · 纖維 {record.fiberG} g · 蛋白質 {record.proteinG} g</small>
              {record.note && <p className="note">{record.note}</p>}
              <div className="row">
                <button className="secondary" type="button" onClick={() => {
                  const next = Number(window.prompt("更新份量", String(record.quantity)));
                  if (Number.isFinite(next) && next > 0) updateRecord(record, next);
                }}>編輯份量</button>
                <button className="danger" type="button" onClick={async () => {
                  if (window.confirm("刪除這筆攝取紀錄？")) {
                    await repository.deleteIntakeRecord(record.id);
                    await onDeleted();
                  }
                }}>刪除</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function FoodPage({ foods, onChanged }: { foods: FoodItem[]; onChanged: () => Promise<void> }) {
  const emptyFood = (): FoodItem => ({
    id: generateId("food"),
    name: "",
    category: FOOD_CATEGORIES[0],
    servingName: "1 份",
    servingAmount: 1,
    servingUnit: "serving",
    waterMl: 0,
    fiberG: 0,
    proteinG: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  const [draft, setDraft] = useState<FoodItem>(emptyFood);
  const [filter, setFilter] = useState<FoodCategory | "all">("all");
  const [search, setSearch] = useState("");
  const visibleFoods = foods.filter((food) => (filter === "all" || food.category === filter) && food.name.includes(search));
  const isEditing = foods.some((food) => food.id === draft.id);

  function resetDraft() {
    setDraft(emptyFood());
  }

  function startEditing(food: FoodItem) {
    setDraft(food);
    window.requestAnimationFrame(() => {
      document.getElementById("food-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function saveFood() {
    if (!draft.name.trim()) return;
    const now = new Date().toISOString();
    await repository.saveFood({ ...draft, name: draft.name.trim(), updatedAt: now, createdAt: draft.createdAt || now });
    resetDraft();
    await onChanged();
  }

  return (
    <section className="stack">
      <div id="food-editor" className={`panel form-panel food-editor ${isEditing ? "editing" : ""}`}>
        <div className="editor-header">
          <div>
            <h2>{isEditing ? "正在編輯食物" : "新增食物"}</h2>
            <p>{isEditing ? draft.name || "未命名食物" : "填寫資料後加入食物庫"}</p>
          </div>
          {isEditing && <button className="secondary" type="button" onClick={resetDraft}>取消編輯</button>}
        </div>
        <div className="two-col">
          <label>名稱<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
          <label>分類
            <select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as FoodCategory })}>
              {FOOD_CATEGORIES.map((item) => <option key={item} value={item}>{FOOD_CATEGORY_LABELS[item]}</option>)}
            </select>
          </label>
        </div>
        <div className="two-col">
          <label>份量名稱<input value={draft.servingName} onChange={(event) => setDraft({ ...draft, servingName: event.target.value })} /></label>
          <label>單位
            <select value={draft.servingUnit} onChange={(event) => setDraft({ ...draft, servingUnit: event.target.value as ServingUnit })}>
              {SERVING_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
            </select>
          </label>
        </div>
        <div className="three-col">
          <label>水 ml<input type="number" value={draft.waterMl} onFocus={(event) => event.currentTarget.select()} onChange={(event) => setDraft({ ...draft, waterMl: Number(event.target.value) })} /></label>
          <label>纖維 g<input type="number" value={draft.fiberG} onFocus={(event) => event.currentTarget.select()} onChange={(event) => setDraft({ ...draft, fiberG: Number(event.target.value) })} /></label>
          <label>蛋白質 g<input type="number" value={draft.proteinG} onFocus={(event) => event.currentTarget.select()} onChange={(event) => setDraft({ ...draft, proteinG: Number(event.target.value) })} /></label>
        </div>
        <label>備註<textarea rows={2} value={draft.note ?? ""} onChange={(event) => setDraft({ ...draft, note: event.target.value })} /></label>
        <button type="button" onClick={saveFood}>{isEditing ? "更新食物" : "新增食物"}</button>
      </div>
      <div className="filter-row">
        <input placeholder="搜尋食物" value={search} onChange={(event) => setSearch(event.target.value)} />
        <select value={filter} onChange={(event) => setFilter(event.target.value as FoodCategory | "all")}>
          <option value="all">全部</option>
          {FOOD_CATEGORIES.map((item) => <option key={item} value={item}>{FOOD_CATEGORY_LABELS[item]}</option>)}
        </select>
      </div>
      <div className="food-list">
        {visibleFoods.map((food) => (
          <article className="food-row" key={food.id}>
            <div>
              <h3>{food.name}</h3>
              <p>{FOOD_CATEGORY_LABELS[food.category]} · {food.servingName}</p>
              <small>水 {food.waterMl} ml · 纖維 {food.fiberG} g · 蛋白質 {food.proteinG} g</small>
            </div>
            <div className="row">
              <button className={draft.id === food.id ? "active-edit" : "secondary"} type="button" onClick={() => startEditing(food)}>
                {draft.id === food.id ? "編輯中" : "編輯"}
              </button>
              <button className="danger" type="button" onClick={async () => {
                if (window.confirm("刪除食物？既有歷史紀錄會保留。")) {
                  await repository.deleteFood(food.id);
                  await onChanged();
                }
              }}>刪除</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ChartsPage({ goal }: { goal: DailyGoal }) {
  const [records, setRecords] = useState<IntakeRecord[]>([]);
  const currentDate = today();
  useEffect(() => {
    repository.listIntakeRecordsByDateRange(addDays(currentDate, -29), currentDate).then(setRecords);
  }, []);
  const chartData = useMemo(() => Array.from({ length: 30 }, (_, index) => {
    const date = addDays(currentDate, index - 29);
    const total = calculateDailyTotal(date, records);
    return { ...total, date: date.slice(5), achieved: total.waterMl >= goal.waterMl && total.fiberG >= goal.fiberG && total.proteinG >= goal.proteinG ? 1 : 0 };
  }), [records, goal, currentDate]);
  const last7 = chartData.slice(-7);
  const avg7 = averageTotals(last7);
  const achievement14 = Math.round((chartData.slice(-14).filter((item) => item.achieved).length / 14) * 100);
  const insufficient = mostInsufficient(chartData.slice(-14), goal);
  const frequent = mostFrequentFoods(records);

  return (
    <section className="stack">
      <ChartPanel title="7 天趨勢" data={last7} />
      <ChartPanel title="30 天趨勢" data={chartData} />
      <div className="panel">
        <h2>洞察</h2>
        <div className="insight-grid">
          <Gap label="7 天平均水分" value={`${avg7.waterMl} ml`} />
          <Gap label="7 天平均纖維" value={`${avg7.fiberG} g`} />
          <Gap label="7 天平均蛋白質" value={`${avg7.proteinG} g`} />
          <Gap label="14 天達標率" value={`${achievement14}%`} />
          <Gap label="常不足項目" value={insufficient} />
          <Gap label="常吃食物" value={frequent || "尚無資料"} />
        </div>
      </div>
      <div className="panel chart-panel">
        <h2>每日達標</h2>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" interval={5} />
            <YAxis hide domain={[0, 1]} />
            <Tooltip />
            <Bar dataKey="achieved" fill="#18736f" name="達標" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function ChartPanel({ title, data }: { title: string; data: Array<Record<string, number | string>> }) {
  return (
    <div className="panel chart-panel">
      <h2>{title}</h2>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="waterMl" stroke="#18736f" name="水 ml" dot={false} />
          <Line type="monotone" dataKey="fiberG" stroke="#b15f20" name="纖維 g" />
          <Line type="monotone" dataKey="proteinG" stroke="#315f9f" name="蛋白質 g" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function SettingsPage({ goal, settings, onChanged }: { goal: DailyGoal; settings: AppSettings; onChanged: () => Promise<void> }) {
  const [goalDraft, setGoalDraft] = useState(goal);
  const [settingsDraft, setSettingsDraft] = useState(settings);

  useEffect(() => setGoalDraft(goal), [goal]);
  useEffect(() => setSettingsDraft(settings), [settings]);

  async function save() {
    const now = new Date().toISOString();
    await repository.saveDailyGoal({ ...goalDraft, updatedAt: now });
    await repository.saveSettings({ ...settingsDraft, toastDurationSeconds: normalizeToastDuration(settingsDraft.toastDurationSeconds), updatedAt: now });
    await onChanged();
  }

  async function exportJson() {
    const backup = await repository.exportBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `health-record-backup-${today()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importJson(file?: File) {
    if (!file) return;
    if (!window.confirm("匯入會合併 JSON 備份：相同資料會略過，有差異的項目才會更新。確定繼續？")) return;
    const text = await file.text();
    const payload = validateBackupPayload(JSON.parse(text));
    await repository.importBackup(payload);
    await onChanged();
  }

  return (
    <section className="stack">
      <PwaStatusPanel />
      <div className="panel form-panel">
        <div className="three-col">
          <label>水分目標<input type="number" value={goalDraft.waterMl} onChange={(event) => setGoalDraft({ ...goalDraft, waterMl: Number(event.target.value) })} /></label>
          <label>纖維目標<input type="number" value={goalDraft.fiberG} onChange={(event) => setGoalDraft({ ...goalDraft, fiberG: Number(event.target.value) })} /></label>
          <label>蛋白質目標<input type="number" value={goalDraft.proteinG} onChange={(event) => setGoalDraft({ ...goalDraft, proteinG: Number(event.target.value) })} /></label>
        </div>
        <label className="toggle">
          <input type="checkbox" checked={settingsDraft.enableAfternoonGapCheck} onChange={(event) => setSettingsDraft({ ...settingsDraft, enableAfternoonGapCheck: event.target.checked })} />
          啟用 16:00 缺口檢查
        </label>
        <label>通知顯示秒數
          <input min="1" max="120" step="1" type="number" value={settingsDraft.toastDurationSeconds} onChange={(event) => setSettingsDraft({ ...settingsDraft, toastDurationSeconds: Number(event.target.value) })} />
        </label>
        <button type="button" onClick={save}>儲存設定</button>
        <div className="divider" />
        <button className="secondary" type="button" onClick={exportJson}>匯出 JSON 備份</button>
        <label className="file-button">匯入 JSON 備份
          <input type="file" accept="application/json" onChange={(event) => importJson(event.target.files?.[0])} />
        </label>
        <button className="danger" type="button" onClick={async () => {
          if (window.confirm("清除所有資料並回復示範食物？")) {
            await repository.clearAllData();
            await onChanged();
          }
        }}>清除本機資料</button>
      </div>
    </section>
  );
}

function PwaStatusPanel() {
  const [status, setStatus] = useState({
    secure: false,
    supported: false,
    registered: false,
  });

  useEffect(() => {
    let mounted = true;
    async function loadStatus() {
      const supported = "serviceWorker" in navigator;
      const secure = window.isSecureContext;
      const registration = supported ? await navigator.serviceWorker.getRegistration() : undefined;
      if (mounted) {
        setStatus({
          secure,
          supported,
          registered: Boolean(registration?.active || navigator.serviceWorker.controller),
        });
      }
    }
    loadStatus();
    return () => {
      mounted = false;
    };
  }, []);

  const ready = status.secure && status.supported && status.registered;
  const copy = !status.secure
    ? "目前網址不是 HTTPS 或 localhost，手機瀏覽器不會啟用 service worker，因此加入主畫面後仍需要原伺服器在線。"
    : status.registered
      ? "service worker 已啟用，第一次完整載入後可離線開啟 app shell。"
      : "service worker 尚未完成註冊，請重新整理一次後再檢查。";

  return (
    <div className={`panel ${ready ? "status-ready" : "status-warning"}`}>
      <h2>離線狀態</h2>
      <p>{copy}</p>
      <div className="status-grid">
        <Gap label="安全來源" value={status.secure ? "是" : "否"} />
        <Gap label="瀏覽器支援" value={status.supported ? "是" : "否"} />
        <Gap label="快取服務" value={status.registered ? "已啟用" : "未啟用"} />
      </div>
    </div>
  );
}

function averageTotals(data: Array<{ waterMl: number; fiberG: number; proteinG: number }>) {
  const divisor = data.length || 1;
  return {
    waterMl: Math.round(data.reduce((sum, item) => sum + item.waterMl, 0) / divisor),
    fiberG: Math.round((data.reduce((sum, item) => sum + item.fiberG, 0) / divisor) * 10) / 10,
    proteinG: Math.round((data.reduce((sum, item) => sum + item.proteinG, 0) / divisor) * 10) / 10,
  };
}

function mostInsufficient(data: Array<{ waterMl: number; fiberG: number; proteinG: number }>, goal: DailyGoal) {
  const gaps = data.reduce(
    (acc, item) => ({
      water: acc.water + Math.max(goal.waterMl - item.waterMl, 0) / goal.waterMl,
      fiber: acc.fiber + Math.max(goal.fiberG - item.fiberG, 0) / goal.fiberG,
      protein: acc.protein + Math.max(goal.proteinG - item.proteinG, 0) / goal.proteinG,
    }),
    { water: 0, fiber: 0, protein: 0 },
  );
  const key = Object.entries(gaps).sort((a, b) => b[1] - a[1])[0]?.[0];
  return key === "water" ? "水分" : key === "fiber" ? "膳食纖維" : "蛋白質";
}

function mostFrequentFoods(records: IntakeRecord[]) {
  const counts = new Map<string, number>();
  records.forEach((record) => counts.set(record.foodNameSnapshot, (counts.get(record.foodNameSnapshot) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}
