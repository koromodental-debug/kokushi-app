// チャット型UIの型定義

import type { Question } from './question';

// メッセージの種類
export type MessageType =
  | 'system'      // システムメッセージ（挨拶など）
  | 'question'    // 問題
  | 'choices'     // 選択肢（ボタン表示用）
  | 'user-answer' // ユーザーの回答
  | 'feedback'    // 正誤フィードバック
  | 'action';     // アクション選択（学習/検索など）

// メッセージ
export interface ChatMessage {
  id: string;
  type: MessageType;
  content: string;
  timestamp: Date;

  // 問題の場合
  question?: Question;

  // 選択肢の場合
  choices?: {
    key: string;
    label: string;
    action?: string;
  }[];

  // フィードバックの場合
  isCorrect?: boolean;
  correctAnswer?: string;
}
