// 学習モード - 考えなくていいUI

import { useState, useEffect, useCallback } from 'react';
import type { Question } from '../types/question';
import { getAllQuestions } from '../services/questionService';
import { useProgressStore } from '../store/useProgressStore';

interface Props {
  onExit: () => void;
}

export function StudyMode({ onExit }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoices, setSelectedChoices] = useState<Set<string>>(new Set());
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const { recordAnswer, todayAnswered, dailyGoal } = useProgressStore();

  // 問題をシャッフルして読み込み
  useEffect(() => {
    const allQuestions = getAllQuestions();
    const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
    setQuestions(shuffled);
  }, []);

  const currentQuestion = questions[currentIndex];

  // 次の問題へ
  const goToNext = useCallback(() => {
    setSelectedChoices(new Set());
    setIsAnswered(false);
    setIsCorrect(false);
    setCurrentIndex(prev => prev + 1);
  }, []);

  // 選択肢をタップ
  const handleChoiceClick = (key: string) => {
    if (isAnswered) return;

    setSelectedChoices(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        if (currentQuestion.choiceCount === 1) {
          next.clear();
        }
        next.add(key);
      }
      return next;
    });
  };

  // 解答を確定
  const handleSubmit = () => {
    if (selectedChoices.size === 0 || isAnswered || !currentQuestion) return;

    const correctAnswers = currentQuestion.answer.toLowerCase().split('').filter(c => /[a-e]/.test(c));
    const selectedArray = [...selectedChoices].sort();
    const correct =
      correctAnswers.length === selectedArray.length &&
      correctAnswers.every(c => selectedChoices.has(c));

    recordAnswer(currentQuestion.id, correct);
    setIsCorrect(correct);
    setIsAnswered(true);
  };

  // 選択肢のスタイル
  const getChoiceStyle = (key: string) => {
    const isSelected = selectedChoices.has(key);
    const isCorrectAnswer = currentQuestion?.answer.toLowerCase().includes(key);

    if (isAnswered) {
      if (isCorrectAnswer) {
        return 'border-green-500 bg-green-50';
      }
      if (isSelected && !isCorrectAnswer) {
        return 'border-red-500 bg-red-50';
      }
      return 'border-gray-200 bg-gray-50';
    }

    if (isSelected) {
      return 'border-primary bg-blue-50';
    }
    return 'border-gray-200 bg-white active:bg-gray-100';
  };

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  const sortedChoices = Object.entries(currentQuestion.choices).sort(
    ([a], [b]) => a.localeCompare(b)
  );

  const progressPercent = Math.min((todayAnswered / dailyGoal) * 100, 100);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={onExit}
          className="text-gray-600 hover:text-gray-800 font-medium"
        >
          ✕ 終了
        </button>
        <span className="text-sm text-gray-500">
          {currentQuestion.id}
        </span>
        <span className="text-sm font-medium text-primary">
          {todayAnswered} / {dailyGoal}
        </span>
      </header>

      {/* プログレスバー */}
      <div className="h-1 bg-gray-200">
        <div
          className="h-full bg-green-500 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* 問題エリア */}
      <main className="flex-1 overflow-y-auto p-4">
        {/* 問題文 */}
        <div className="bg-white rounded-xl p-5 mb-4 shadow-sm">
          <p className="text-gray-800 leading-relaxed">
            {currentQuestion.questionText}
          </p>
        </div>

        {/* 画像 */}
        {currentQuestion.images.length > 0 && (
          <div className="mb-4">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {currentQuestion.images.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`図${idx + 1}`}
                  className="h-32 w-auto rounded-lg border border-gray-200 cursor-pointer"
                  onClick={() => setSelectedImage(img)}
                />
              ))}
            </div>
          </div>
        )}

        {/* 選択肢 */}
        <div className="space-y-3">
          {currentQuestion.choiceCount > 1 && !isAnswered && (
            <p className="text-sm text-gray-500 text-center">
              {currentQuestion.choiceCount}つ選んでください
            </p>
          )}
          {sortedChoices.map(([key, value]) => {
            const isCorrectAnswer = currentQuestion.answer.toLowerCase().includes(key);
            const isSelected = selectedChoices.has(key);
            return (
              <button
                key={key}
                onClick={() => handleChoiceClick(key)}
                disabled={isAnswered}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${getChoiceStyle(key)}`}
              >
                <span className="font-bold mr-2 text-gray-500">{key.toUpperCase()}.</span>
                <span className="text-gray-800">{value}</span>
                {isAnswered && isCorrectAnswer && (
                  <span className="float-right text-green-600 font-bold">✓</span>
                )}
                {isAnswered && isSelected && !isCorrectAnswer && (
                  <span className="float-right text-red-600 font-bold">✗</span>
                )}
              </button>
            );
          })}
        </div>

        {/* 正解表示 */}
        {isAnswered && (
          <div className={`mt-4 p-4 rounded-xl ${isCorrect ? 'bg-green-100' : 'bg-red-100'}`}>
            <p className={`font-bold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
              {isCorrect ? '🎉 正解！' : '😢 不正解...'}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              正答: <span className="font-bold">{currentQuestion.answer}</span>
            </p>
          </div>
        )}
      </main>

      {/* フッター: アクションボタン */}
      <footer className="bg-white border-t border-gray-200 p-4">
        {!isAnswered ? (
          <button
            onClick={handleSubmit}
            disabled={selectedChoices.size === 0}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
              selectedChoices.size > 0
                ? 'bg-primary text-white active:bg-blue-700'
                : 'bg-gray-200 text-gray-400'
            }`}
          >
            解答する
          </button>
        ) : (
          <button
            onClick={goToNext}
            className="w-full py-4 rounded-xl font-bold text-lg bg-primary text-white active:bg-blue-700 transition-all"
          >
            次の問題 →
          </button>
        )}
      </footer>

      {/* 画像拡大モーダル */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt="拡大"
            className="max-w-full max-h-full object-contain"
          />
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white text-2xl"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
