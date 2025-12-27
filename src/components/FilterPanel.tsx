// フィルタパネルコンポーネント

import { useStore } from '../store/useStore';
import { getYearRange, getSessions } from '../services/questionService';

export function FilterPanel() {
  const { filter, toggleYear, selectAllYears, clearAllYears, toggleSession } = useStore();
  const [minYear, maxYear] = getYearRange();
  const sessions = getSessions();

  // 年度リストを生成（降順）
  const years: number[] = [];
  for (let y = maxYear; y >= minYear; y--) {
    years.push(y);
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
      {/* 回次フィルタ */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">
            回次 {filter.selectedYears.length > 0 && (
              <span className="text-primary">({filter.selectedYears.length}件選択中)</span>
            )}
          </label>
          <div className="flex gap-2">
            <button
              onClick={selectAllYears}
              className="text-xs text-primary hover:underline"
            >
              全選択
            </button>
            <button
              onClick={clearAllYears}
              className="text-xs text-gray-500 hover:underline"
            >
              クリア
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {years.map((year) => (
            <button
              key={year}
              onClick={() => toggleYear(year)}
              className={`px-2.5 py-1 text-sm rounded-md font-medium transition-colors ${
                filter.selectedYears.includes(year)
                  ? 'bg-primary text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          未選択の場合は全回次が対象
        </p>
      </div>

      {/* セッションフィルタ */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          セッション
        </label>
        <div className="flex gap-2">
          {sessions.map((session) => (
            <button
              key={session}
              onClick={() => toggleSession(session)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter.sessions.includes(session)
                  ? 'bg-primary text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {session}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          未選択の場合は全セッションが対象
        </p>
      </div>
    </div>
  );
}
