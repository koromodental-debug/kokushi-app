// ホーム画面 - 2つの入り口

import { useProgressStore } from '../store/useProgressStore';
import { getMeta } from '../services/questionService';

interface Props {
  onStartStudy: () => void;
  onStartSearch: () => void;
}

export function HomeScreen({ onStartStudy, onStartSearch }: Props) {
  const { currentStreak, todayAnswered, todayCorrect, dailyGoal, totalAnswered } = useProgressStore();
  const meta = getMeta();

  const progressPercent = Math.min((todayAnswered / dailyGoal) * 100, 100);
  const accuracyPercent = todayAnswered > 0 ? Math.round((todayCorrect / todayAnswered) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary to-blue-700 flex flex-col">
      {/* ヘッダー */}
      <header className="text-white text-center pt-12 pb-8 px-6">
        <h1 className="text-3xl font-bold mb-2">国試過去問</h1>
        <p className="text-blue-200 text-sm">
          {meta.yearRange.min}〜{meta.yearRange.max}回 / {meta.totalCount.toLocaleString()}問
        </p>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 bg-gray-100 rounded-t-3xl px-6 py-8">
        {/* ストリーク & 今日の進捗 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            {/* ストリーク */}
            <div className="flex items-center gap-3">
              <span className="text-4xl">🔥</span>
              <div>
                <p className="text-2xl font-bold text-gray-800">{currentStreak}</p>
                <p className="text-sm text-gray-500">日連続</p>
              </div>
            </div>

            {/* 累計 */}
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-800">{totalAnswered}</p>
              <p className="text-sm text-gray-500">累計解答数</p>
            </div>
          </div>

          {/* 今日の進捗バー */}
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>今日の進捗</span>
              <span>{todayAnswered} / {dailyGoal} 問</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {todayAnswered > 0 && (
              <p className="text-xs text-gray-500 mt-2 text-right">
                正答率 {accuracyPercent}%
              </p>
            )}
          </div>
        </div>

        {/* 2つの入り口 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* 学習する */}
          <button
            onClick={onStartStudy}
            className="bg-primary hover:bg-blue-700 text-white rounded-2xl p-6 text-center transition-all active:scale-95 shadow-lg"
          >
            <div className="text-4xl mb-3">📝</div>
            <p className="font-bold text-lg">学習する</p>
            <p className="text-blue-200 text-xs mt-1">自動で出題</p>
          </button>

          {/* 検索する */}
          <button
            onClick={onStartSearch}
            className="bg-white hover:bg-gray-50 text-gray-800 rounded-2xl p-6 text-center transition-all active:scale-95 shadow-lg border border-gray-200"
          >
            <div className="text-4xl mb-3">🔍</div>
            <p className="font-bold text-lg">検索する</p>
            <p className="text-gray-500 text-xs mt-1">自分で探す</p>
          </button>
        </div>

        {/* クイックアクション */}
        <div className="space-y-3">
          <button
            onClick={onStartStudy}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-4 px-6 text-left flex items-center justify-between transition-all active:scale-[0.98] shadow-md"
          >
            <div>
              <p className="font-bold">今日の目標を達成しよう</p>
              <p className="text-orange-200 text-sm">あと {Math.max(0, dailyGoal - todayAnswered)} 問</p>
            </div>
            <span className="text-2xl">→</span>
          </button>
        </div>
      </main>
    </div>
  );
}
