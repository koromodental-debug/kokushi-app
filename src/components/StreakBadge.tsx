// ストリーク表示コンポーネント

import { useProgressStore } from '../store/useProgressStore';

export function StreakBadge() {
  const { currentStreak, longestStreak } = useProgressStore();

  return (
    <div className="flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-200">
      <span className="text-xl">🔥</span>
      <div className="flex flex-col">
        <span className="text-orange-600 font-bold text-lg leading-tight">
          {currentStreak}
        </span>
        <span className="text-orange-400 text-xs leading-tight">
          日連続
        </span>
      </div>
      {currentStreak > 0 && currentStreak === longestStreak && (
        <span className="text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded ml-1">
          最高記録!
        </span>
      )}
    </div>
  );
}
