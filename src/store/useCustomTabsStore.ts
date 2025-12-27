// カスタムタブの状態管理
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CustomTab {
  id: string;
  name: string;
  subjectIds: string[]; // 選択された科目のID配列
  color: string;
  createdAt: number;
}

interface CustomTabsState {
  tabs: CustomTab[];
  addTab: (tab: Omit<CustomTab, 'id' | 'createdAt'>) => void;
  removeTab: (id: string) => void;
  updateTab: (id: string, updates: Partial<Omit<CustomTab, 'id' | 'createdAt'>>) => void;
}

export const useCustomTabsStore = create<CustomTabsState>()(
  persist(
    (set) => ({
      tabs: [],

      addTab: (tab) => set((state) => ({
        tabs: [...state.tabs, {
          ...tab,
          id: `custom_${Date.now()}`,
          createdAt: Date.now(),
        }]
      })),

      removeTab: (id) => set((state) => ({
        tabs: state.tabs.filter(t => t.id !== id)
      })),

      updateTab: (id, updates) => set((state) => ({
        tabs: state.tabs.map(t =>
          t.id === id ? { ...t, ...updates } : t
        )
      })),
    }),
    {
      name: 'kokushi-custom-tabs',
    }
  )
);
