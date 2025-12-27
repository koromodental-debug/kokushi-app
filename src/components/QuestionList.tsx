// 問題一覧コンポーネント

import { useStore } from '../store/useStore';
import { QuestionCard } from './QuestionCard';

export function QuestionList() {
  const { filteredQuestions, selectedQuestion, selectQuestion } = useStore();

  if (filteredQuestions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">検索結果がありません</p>
        <p className="text-sm mt-2">検索条件を変更してください</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 mb-4">
        {filteredQuestions.length.toLocaleString()} 件の問題
      </p>
      {filteredQuestions.slice(0, 100).map((question) => (
        <QuestionCard
          key={question.id}
          question={question}
          onClick={() => selectQuestion(question)}
          isSelected={selectedQuestion?.id === question.id}
        />
      ))}
      {filteredQuestions.length > 100 && (
        <p className="text-center text-sm text-gray-500 py-4">
          最初の100件を表示中（絞り込んでください）
        </p>
      )}
    </div>
  );
}
