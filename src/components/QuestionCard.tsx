// 問題カードコンポーネント

import type { Question } from '../types/question';

interface Props {
  question: Question;
  onClick: () => void;
  isSelected: boolean;
}

export function QuestionCard({ question, onClick, isSelected }: Props) {
  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-lg border cursor-pointer transition-all ${
        isSelected
          ? 'border-primary bg-blue-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-primary">
          {question.id}
        </span>
        <span className="text-xs text-gray-500">
          第{question.year}回 {question.session}問題
        </span>
      </div>

      {/* 問題文（最初の100文字） */}
      <p className="text-sm text-gray-700 line-clamp-2">
        {question.questionText}
      </p>

      {/* メタ情報 */}
      <div className="mt-2 flex items-center gap-2">
        {question.isExcluded && (
          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">
            採点除外
          </span>
        )}
        {question.hasFigure && (
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
            図あり
          </span>
        )}
        {question.choiceCount > 1 && (
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
            {question.choiceCount}つ選べ
          </span>
        )}
      </div>
    </div>
  );
}
