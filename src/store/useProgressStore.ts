// 学習進捗の状態管理（ストリーク、今日の進捗など）

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ProgressState {
  // ストリーク関連
  currentStreak: number;        // 現在の連続日数
  lastStudyDate: string | null; // 最終学習日（YYYY-MM-DD）
  longestStreak: number;        // 最長記録

  // 今日の進捗
  todayAnswered: number;        // 今日解いた問題数
  todayCorrect: number;         // 今日の正解数
  dailyGoal: number;            // 1日の目標問題数

  // 累計
  totalAnswered: number;        // 累計解答数
  totalCorrect: number;         // 累計正解数

  // 解答した問題ID
  answeredQuestions: Set<string>;

  // アクション
  recordAnswer: (questionId: string, isCorrect: boolean) => void;
  setDailyGoal: (goal: number) => void;
  checkAndUpdateStreak: () => void;
}

// 今日の日付を取得（YYYY-MM-DD）
function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

// 昨日の日付を取得
function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      // 初期値
      currentStreak: 0,
      lastStudyDate: null,
      longestStreak: 0,
      todayAnswered: 0,
      todayCorrect: 0,
      dailyGoal: 20,
      totalAnswered: 0,
      totalCorrect: 0,
      answeredQuestions: new Set(),

      // 解答を記録
      recordAnswer: (questionId, isCorrect) => {
        const today = getToday();
        const state = get();

        // 日付が変わっていたらリセット
        const isNewDay = state.lastStudyDate !== today;

        set((prev) => ({
          todayAnswered: isNewDay ? 1 : prev.todayAnswered + 1,
          todayCorrect: isNewDay
            ? (isCorrect ? 1 : 0)
            : prev.todayCorrect + (isCorrect ? 1 : 0),
          totalAnswered: prev.totalAnswered + 1,
          totalCorrect: prev.totalCorrect + (isCorrect ? 1 : 0),
          lastStudyDate: today,
          answeredQuestions: new Set([...prev.answeredQuestions, questionId]),
        }));

        // ストリーク更新
        get().checkAndUpdateStreak();
      },

      // 目標設定
      setDailyGoal: (goal) => {
        set({ dailyGoal: goal });
      },

      // ストリークの確認・更新
      checkAndUpdateStreak: () => {
        const today = getToday();
        const yesterday = getYesterday();
        const state = get();

        if (state.lastStudyDate === today) {
          // 今日すでに学習済み → 何もしない（ストリーク維持）
          return;
        }

        if (state.lastStudyDate === yesterday) {
          // 昨日学習した → ストリーク継続
          const newStreak = state.currentStreak + 1;
          set({
            currentStreak: newStreak,
            longestStreak: Math.max(state.longestStreak, newStreak),
          });
        } else if (state.lastStudyDate === null) {
          // 初めての学習
          set({
            currentStreak: 1,
            longestStreak: Math.max(state.longestStreak, 1),
          });
        } else {
          // 1日以上空いた → ストリークリセット
          set({
            currentStreak: 1,
          });
        }
      },
    }),
    {
      name: 'kokushi-progress',
      // Setをシリアライズするためのカスタム処理
      partialize: (state) => ({
        ...state,
        answeredQuestions: [...state.answeredQuestions],
      }),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as object),
        answeredQuestions: new Set((persisted as any)?.answeredQuestions || []),
      }),
    }
  )
);
