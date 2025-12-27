// 検索履歴の状態管理
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SearchHistoryState {
  // 検索履歴（新しい順）
  history: string[];
  // 検索を追加（重複は削除して先頭に）
  addSearch: (keyword: string) => void;
  // 検索を削除
  removeSearch: (keyword: string) => void;
  // 全削除
  clearAll: () => void;
}

const MAX_HISTORY = 20; // 最大保存件数

export const useSearchHistoryStore = create<SearchHistoryState>()(
  persist(
    (set) => ({
      history: [],

      addSearch: (keyword) => set((state) => {
        if (!keyword.trim()) return state;
        // 重複を削除して先頭に追加
        const filtered = state.history.filter(h => h !== keyword);
        const newHistory = [keyword, ...filtered].slice(0, MAX_HISTORY);
        return { history: newHistory };
      }),

      removeSearch: (keyword) => set((state) => ({
        history: state.history.filter(h => h !== keyword)
      })),

      clearAll: () => set({ history: [] }),
    }),
    {
      name: 'kokushi-search-history',
    }
  )
);
