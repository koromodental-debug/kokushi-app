// フラッシュカードの状態管理
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FlashcardState {
  // フラッシュカードに追加された問題ID
  cardIds: string[];
  // 追加
  addCard: (id: string) => void;
  // 削除
  removeCard: (id: string) => void;
  // 含まれているか確認
  hasCard: (id: string) => boolean;
  // 全削除
  clearAll: () => void;
}

export const useFlashcardStore = create<FlashcardState>()(
  persist(
    (set, get) => ({
      cardIds: [],

      addCard: (id) => set((state) => {
        if (state.cardIds.includes(id)) return state;
        return { cardIds: [...state.cardIds, id] };
      }),

      removeCard: (id) => set((state) => ({
        cardIds: state.cardIds.filter(cid => cid !== id)
      })),

      hasCard: (id) => get().cardIds.includes(id),

      clearAll: () => set({ cardIds: [] }),
    }),
    {
      name: 'kokushi-flashcards',
    }
  )
);
