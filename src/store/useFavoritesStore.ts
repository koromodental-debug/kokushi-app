// お気に入りの状態管理
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FavoritesState {
  // お気に入りに追加された問題ID
  favoriteIds: string[];
  // 追加
  addFavorite: (id: string) => void;
  // 削除
  removeFavorite: (id: string) => void;
  // 切り替え
  toggleFavorite: (id: string) => void;
  // 含まれているか確認
  isFavorite: (id: string) => boolean;
  // 全削除
  clearAll: () => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favoriteIds: [],

      addFavorite: (id) => set((state) => {
        if (state.favoriteIds.includes(id)) return state;
        return { favoriteIds: [...state.favoriteIds, id] };
      }),

      removeFavorite: (id) => set((state) => ({
        favoriteIds: state.favoriteIds.filter(fid => fid !== id)
      })),

      toggleFavorite: (id) => {
        const state = get();
        if (state.favoriteIds.includes(id)) {
          set({ favoriteIds: state.favoriteIds.filter(fid => fid !== id) });
        } else {
          set({ favoriteIds: [...state.favoriteIds, id] });
        }
      },

      isFavorite: (id) => get().favoriteIds.includes(id),

      clearAll: () => set({ favoriteIds: [] }),
    }),
    {
      name: 'kokushi-favorites',
    }
  )
);
