// 今日の進捗プログレスバー

import { useProgressStore } from '../store/useProgressStore';

export function DailyProgress() {
  const { todayAnswered, todayCorrect, dailyGoal } = useProgressStore();

  // 進捗率（100%上限）
  const progressPercent = Math.min((todayAnswered / dailyGoal) * 100, 100);
  const isGoalReached = todayAnswered >= dailyGoal;

  // 正答率
  const accuracyPercent = todayAnswered > 0
    ? Math.round((todayCorrect / todayAnswered) * 100)
    : 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">今日の進捗</span>
        <span className="text-sm text-gray-500">
          {todayAnswered} / {dailyGoal} 問
        </span>
      </div>

      {/* プログレスバー */}
      <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isGoalReached
              ? 'bg-gradient-to-r from-green-400 to-green-500'
              : 'bg-gradient-to-r from-blue-400 to-blue-500'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
        {/* 目標ライン */}
        {!isGoalReached && (
          <div className="absolute top-0 right-0 h-full w-0.5 bg-gray-300" />
        )}
      </div>

      {/* 統計 */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="text-gray-500">
            正解: <span className="font-medium text-green-600">{todayCorrect}</span>
          </span>
          <span className="text-gray-500">
            正答率: <span className="font-medium text-primary">{accuracyPercent}%</span>
          </span>
        </div>
        {isGoalReached && (
          <span className="text-green-600 font-medium flex items-center gap-1">
            <span>🎉</span> 目標達成!
          </span>
        )}
      </div>
    </div>
  );
}
