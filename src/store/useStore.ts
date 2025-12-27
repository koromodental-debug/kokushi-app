// Zustandによる状態管理

import { create } from 'zustand';
import type { Question, FilterState } from '../types/question';
import { getAllQuestions, filterQuestions, getYearRange } from '../services/questionService';

interface AppState {
  // データ
  allQuestions: Question[];
  filteredQuestions: Question[];

  // フィルタ状態
  filter: FilterState;

  // UI状態
  selectedQuestion: Question | null;
  showAnswer: boolean;

  // アクション
  setSearchText: (text: string) => void;
  toggleYear: (year: number) => void;
  selectAllYears: () => void;
  clearAllYears: () => void;
  toggleSession: (session: string) => void;
  selectQuestion: (question: Question | null) => void;
  toggleAnswer: () => void;
  applyFilter: () => void;
}

const [minYear, maxYear] = getYearRange();

export const useStore = create<AppState>((set, get) => ({
  // 初期データ
  allQuestions: getAllQuestions(),
  filteredQuestions: getAllQuestions(),

  // 初期フィルタ
  filter: {
    searchText: '',
    selectedYears: [],  // 空の場合は全年度が対象
    sessions: [],
  },

  // UI初期状態
  selectedQuestion: null,
  showAnswer: false,

  // アクション
  setSearchText: (text) => {
    set((state) => ({
      filter: { ...state.filter, searchText: text }
    }));
    get().applyFilter();
  },

  toggleYear: (year) => {
    set((state) => {
      const current = state.filter.selectedYears;
      const newYears = current.includes(year)
        ? current.filter(y => y !== year)
        : [...current, year].sort((a, b) => b - a);  // 降順ソート
      return {
        filter: { ...state.filter, selectedYears: newYears }
      };
    });
    get().applyFilter();
  },

  selectAllYears: () => {
    const years: number[] = [];
    for (let y = maxYear; y >= minYear; y--) {
      years.push(y);
    }
    set((state) => ({
      filter: { ...state.filter, selectedYears: years }
    }));
    get().applyFilter();
  },

  clearAllYears: () => {
    set((state) => ({
      filter: { ...state.filter, selectedYears: [] }
    }));
    get().applyFilter();
  },

  toggleSession: (session) => {
    set((state) => {
      const current = state.filter.sessions;
      const newSessions = current.includes(session)
        ? current.filter(s => s !== session)
        : [...current, session];
      return {
        filter: { ...state.filter, sessions: newSessions }
      };
    });
    get().applyFilter();
  },

  selectQuestion: (question) => {
    set({ selectedQuestion: question, showAnswer: false });
  },

  toggleAnswer: () => {
    set((state) => ({ showAnswer: !state.showAnswer }));
  },

  applyFilter: () => {
    const { allQuestions, filter } = get();
    const filtered = filterQuestions(
      allQuestions,
      filter.searchText,
      filter.selectedYears,
      filter.sessions
    );
    set({ filteredQuestions: filtered });
  },
}));
