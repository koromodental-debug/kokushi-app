// フォルダの状態管理
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Folder {
  id: string;
  name: string;
  color: string;
  questionIds: string[];
  createdAt: number;
}

interface FolderState {
  folders: Folder[];
  // フォルダ作成
  createFolder: (name: string, color?: string) => string;
  // フォルダ削除
  deleteFolder: (folderId: string) => void;
  // フォルダ名変更
  renameFolder: (folderId: string, name: string) => void;
  // 問題をフォルダに追加
  addToFolder: (folderId: string, questionId: string) => void;
  // 問題をフォルダから削除
  removeFromFolder: (folderId: string, questionId: string) => void;
  // 問題がどのフォルダに含まれているか
  getFoldersForQuestion: (questionId: string) => Folder[];
  // フォルダ取得
  getFolder: (folderId: string) => Folder | undefined;
}

// デフォルトのブックマーク
export const defaultFolders: Folder[] = [
  { id: 'bookmark', name: 'ブックマーク', color: '#3B82F6', questionIds: [], createdAt: 0 },
];

export const useFolderStore = create<FolderState>()(
  persist(
    (set, get) => ({
      folders: defaultFolders,

      createFolder: (name, color = '#3B82F6') => {
        const id = `folder-${Date.now()}`;
        set((state) => ({
          folders: [
            ...state.folders,
            {
              id,
              name,
              color,
              questionIds: [],
              createdAt: Date.now(),
            },
          ],
        }));
        return id;
      },

      deleteFolder: (folderId) =>
        set((state) => ({
          folders: state.folders.filter((f) => f.id !== folderId),
        })),

      renameFolder: (folderId, name) =>
        set((state) => ({
          folders: state.folders.map((f) =>
            f.id === folderId ? { ...f, name } : f
          ),
        })),

      addToFolder: (folderId, questionId) =>
        set((state) => ({
          folders: state.folders.map((f) => {
            if (f.id !== folderId) return f;
            if (f.questionIds.includes(questionId)) return f;
            return { ...f, questionIds: [...f.questionIds, questionId] };
          }),
        })),

      removeFromFolder: (folderId, questionId) =>
        set((state) => ({
          folders: state.folders.map((f) =>
            f.id === folderId
              ? { ...f, questionIds: f.questionIds.filter((id) => id !== questionId) }
              : f
          ),
        })),

      getFoldersForQuestion: (questionId) =>
        get().folders.filter((f) => f.questionIds.includes(questionId)),

      getFolder: (folderId) => get().folders.find((f) => f.id === folderId),
    }),
    {
      name: 'kokushi-folders',
    }
  )
);
