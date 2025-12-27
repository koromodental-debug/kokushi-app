// 問題詳細コンポーネント

import { useState, useEffect } from 'react';
import type { Question } from '../types/question';
import { useProgressStore } from '../store/useProgressStore';

interface Props {
  question: Question;
  showAnswer: boolean;
  onToggleAnswer: () => void;
}

// 問題タイプの判定
type QuestionType = 'calculation' | 'ordering' | 'normal';

function getQuestionType(question: Question): QuestionType {
  const answer = question.answer;

  // 計算問題: 答えが数字のみ
  if (/^[0-9.]+$/.test(answer.trim())) {
    return 'calculation';
  }

  // 並び替え問題: 答えが5文字のa-e（順序が重要）
  if (/^[A-Ea-e]{5}$/.test(answer)) {
    return 'ordering';
  }

  return 'normal';
}

// 並び替え問題の答えを読みやすい形式に変換
function formatOrderingAnswer(answer: string, choices: Record<string, string>): string {
  return answer
    .toLowerCase()
    .split('')
    .map(key => choices[key] || key.toUpperCase())
    .join('→');
}

export function QuestionDetail({ question, showAnswer, onToggleAnswer }: Props) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedChoices, setSelectedChoices] = useState<Set<string>>(new Set());
  const [hasAnswered, setHasAnswered] = useState(false);
  const { recordAnswer, answeredQuestions } = useProgressStore();

  // 問題が変わったらリセット
  useEffect(() => {
    setSelectedChoices(new Set());
    setHasAnswered(answeredQuestions.has(question.id));
  }, [question.id, answeredQuestions]);

  // 選択肢をアルファベット順にソート
  const sortedChoices = Object.entries(question.choices).sort(
    ([a], [b]) => a.localeCompare(b)
  );

  // 選択肢をクリック
  const handleChoiceClick = (key: string) => {
    if (hasAnswered || showAnswer) return;

    setSelectedChoices(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        // 単一選択の場合はクリア
        if (question.choiceCount === 1) {
          next.clear();
        }
        next.add(key);
      }
      return next;
    });
  };

  // 解答を確定
  const handleSubmitAnswer = () => {
    if (selectedChoices.size === 0 || hasAnswered) return;

    // 正解判定
    const correctAnswers = question.answer.toLowerCase().split('').filter(c => /[a-e]/.test(c));
    const selectedArray = [...selectedChoices].sort();
    const isCorrect =
      correctAnswers.length === selectedArray.length &&
      correctAnswers.every(c => selectedChoices.has(c));

    // 進捗を記録
    recordAnswer(question.id, isCorrect);
    setHasAnswered(true);
    onToggleAnswer(); // 正答を表示
  };

  // 問題タイプを取得
  const questionType = getQuestionType(question);

  // 通常問題の場合の正解判定
  const isCorrectChoice = (key: string): boolean => {
    if (questionType !== 'normal') return false;
    return question.answer.toLowerCase().includes(key);
  };

  // 選択肢のスタイルを決定
  const getChoiceStyle = (key: string) => {
    const isSelected = selectedChoices.has(key);
    const isCorrect = isCorrectChoice(key);

    if (showAnswer || hasAnswered) {
      // 計算問題・並び替え問題では選択肢のハイライトなし
      if (questionType !== 'normal') {
        return 'border-gray-200 bg-gray-50';
      }
      if (isCorrect) {
        return 'border-green-500 bg-green-50';
      }
      if (isSelected && !isCorrect) {
        return 'border-red-500 bg-red-50';
      }
      return 'border-gray-200 bg-gray-50';
    }

    if (isSelected) {
      return 'border-primary bg-blue-50';
    }
    return 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100 cursor-pointer';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-primary">{question.id}</h2>
          {question.isExcluded && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-medium">
              採点除外
            </span>
          )}
          {hasAnswered && !question.isExcluded && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
              解答済み
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {question.images.length > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
              画像 {question.images.length}枚
            </span>
          )}
          <span className="text-sm text-gray-500">
            第{question.year}回 {question.session}問題 問{question.number}
          </span>
        </div>
      </div>

      {/* 問題文 */}
      <div className="mb-6">
        <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
          {question.questionText}
        </p>
      </div>

      {/* 画像表示 */}
      {question.images.length > 0 && (
        <div className="mb-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {question.images.map((img, idx) => (
              <div
                key={idx}
                className="relative cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setSelectedImage(img)}
              >
                <img
                  src={img}
                  alt={`図${idx + 1}`}
                  className="w-full h-auto rounded-lg border border-gray-200 shadow-sm"
                  loading="lazy"
                />
                <span className="absolute bottom-1 right-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                  図{idx + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 画像拡大モーダル */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={selectedImage}
              alt="拡大画像"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-2 right-2 bg-white/90 text-gray-800 w-8 h-8 rounded-full flex items-center justify-center hover:bg-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 選択肢 */}
      <div className="space-y-2 mb-6">
        {question.choiceCount > 1 && !hasAnswered && !showAnswer && (
          <p className="text-sm text-gray-500 mb-2">
            {question.choiceCount}つ選んでください（選択中: {selectedChoices.size}）
          </p>
        )}
        {sortedChoices.map(([key, value]) => {
          const isCorrect = isCorrectChoice(key);
          const isSelected = selectedChoices.has(key);
          return (
            <div
              key={key}
              onClick={() => handleChoiceClick(key)}
              className={`p-3 rounded-lg border transition-colors ${getChoiceStyle(key)}`}
            >
              <span className="font-medium mr-2">{key}.</span>
              <span>{value}</span>
              {/* 通常問題のみ✓/✗マークを表示 */}
              {questionType === 'normal' && (showAnswer || hasAnswered) && isCorrect && (
                <span className="ml-2 text-green-600 font-bold">✓</span>
              )}
              {questionType === 'normal' && (showAnswer || hasAnswered) && isSelected && !isCorrect && (
                <span className="ml-2 text-red-600 font-bold">✗</span>
              )}
            </div>
          );
        })}
      </div>

      {/* ボタン */}
      {!hasAnswered && !showAnswer ? (
        <div className="flex gap-3">
          <button
            onClick={handleSubmitAnswer}
            disabled={selectedChoices.size === 0}
            className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
              selectedChoices.size > 0
                ? 'bg-primary text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            解答する
          </button>
          <button
            onClick={onToggleAnswer}
            className="px-6 py-3 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
          >
            正答を見る
          </button>
        </div>
      ) : (
        <button
          onClick={onToggleAnswer}
          className="w-full py-3 rounded-lg font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
        >
          {showAnswer ? '正答を隠す' : '正答を表示'}
        </button>
      )}

      {/* 正答 */}
      {(showAnswer || hasAnswered) && (
        <div className={`mt-4 p-4 rounded-lg border ${
          question.isExcluded
            ? 'bg-red-50 border-red-200'
            : 'bg-green-50 border-green-200'
        }`}>
          {question.isExcluded ? (
            <p className="text-red-700">
              <span className="font-bold">この問題は採点除外となりました</span>
            </p>
          ) : questionType === 'calculation' ? (
            <p className="text-gray-800">
              <span className="font-bold">正答: </span>
              <span className="text-green-700 font-bold text-lg">{question.answer}</span>
            </p>
          ) : questionType === 'ordering' ? (
            <div className="text-gray-800">
              <p className="mb-1">
                <span className="font-bold">正答: </span>
                <span className="text-green-700 font-bold">{question.answer}</span>
              </p>
              <p className="text-sm text-gray-600">
                （{formatOrderingAnswer(question.answer, question.choices)}）
              </p>
            </div>
          ) : (
            <p className="text-gray-800">
              <span className="font-bold">正答: </span>
              <span className="text-green-700 font-bold">{question.answer}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
