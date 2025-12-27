// フィード型UI - Xライクなタイムライン

import { useState, useEffect, useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';
import type { Question } from '../types/question';
import { getAllQuestions, filterQuestions, getYearRange, getExplanation } from '../services/questionService';
import { useCustomTabsStore } from '../store/useCustomTabsStore';
import { useSearchHistoryStore } from '../store/useSearchHistoryStore';
import { useFolderStore } from '../store/useFolderStore';
import { subjectCategories, getSubjectById } from '../data/subjects';

// 1回の読み込みで表示する問題数
const QUESTIONS_PER_LOAD = 20;

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

export function ChatUI() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [displayCount, setDisplayCount] = useState(QUESTIONS_PER_LOAD);
  const [imageGallery, setImageGallery] = useState<{ images: string[]; index: number } | null>(null);
  const [resetKey, setResetKey] = useState(0); // カードの状態リセット用

  // フィルター関連（初回起動時はモーダルを表示）
  const [showFilterModal, setShowFilterModal] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | { type: 'custom'; tabId: string } | { type: 'folder'; folderId: string }>('');
  const [activeYears, setActiveYears] = useState<number[]>([]);
  const [activeSortOrder, setActiveSortOrder] = useState<'newest' | 'random'>('newest');
  const [activeHisshuOnly, setActiveHisshuOnly] = useState(false);

  // カスタムタブ関連
  const [showAddTabModal, setShowAddTabModal] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // フォルダ作成
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);


  const mainRef = useRef<HTMLElement>(null);
  const lastScrollY = useRef(0);
  const [headerVisible, setHeaderVisible] = useState(true);


  const { tabs: customTabs } = useCustomTabsStore();
  const { history: searchHistory, addSearch, removeSearch: removeSearchHistory } = useSearchHistoryStore();
  const { folders, deleteFolder } = useFolderStore();

  // 初期読み込み
  useEffect(() => {
    loadQuestions('');
  }, []);

  // 問題を読み込み
  const loadQuestions = useCallback((
    filter: string | { type: 'custom'; tabId: string } | { type: 'folder'; folderId: string },
    years: number[] = [],
    sortOrder: 'newest' | 'random' = 'newest',
    hisshuOnly: boolean = false
  ) => {
    const allQ = getAllQuestions();
    const currentFolders = useFolderStore.getState().folders;

    let filtered: Question[];
    let useCustomSort = false; // フォルダなど独自ソートを使う場合

    if (typeof filter === 'string') {
      // 通常のキーワードフィルタ + 年度フィルタ + 必修フィルタ
      filtered = filterQuestions(allQ, filter, years, [], hisshuOnly);
    } else if (filter.type === 'folder') {
      // フォルダフィルタ（追加順の逆順＝新しいものが上）
      const folder = currentFolders.find(f => f.id === filter.folderId);
      if (folder) {
        const reversedIds = [...folder.questionIds].reverse();
        filtered = reversedIds
          .map(id => allQ.find(q => q.id === id))
          .filter((q): q is Question => q !== undefined);
        useCustomSort = true;
      } else {
        filtered = [];
      }
    } else {
      // カスタムタブのフィルタ
      const tab = customTabs.find(t => t.id === filter.tabId);
      if (tab) {
        // 選択された科目名を取得
        const subjectNames = tab.subjectIds.map(id => {
          const subject = getSubjectById(id);
          return subject ? subject.name : null;
        }).filter(Boolean) as string[];

        // categoryまたはkeywords配列にマッチする問題を抽出
        filtered = allQ.filter(q => {
          // categoryフィールドでマッチ
          if (q.category && subjectNames.includes(q.category)) {
            return true;
          }
          // keywordsフィールド（複数科目）でマッチ
          if (q.keywords && Array.isArray(q.keywords)) {
            return q.keywords.some(kw => subjectNames.includes(kw));
          }
          return false;
        });
      } else {
        filtered = allQ;
      }
    }

    // ソート処理
    let result: Question[];
    if (useCustomSort) {
      result = filtered;
    } else if (sortOrder === 'random') {
      result = [...filtered].sort(() => Math.random() - 0.5);
    } else {
      // 新しい順（year降順、session降順、number降順）
      result = [...filtered].sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        if (a.session !== b.session) return b.session.localeCompare(a.session);
        return b.number - a.number;
      });
    }

    setQuestions(result);
    setActiveFilter(filter);
    setActiveYears(years);
    setActiveSortOrder(sortOrder);
    setActiveHisshuOnly(hisshuOnly);
    setDisplayCount(QUESTIONS_PER_LOAD);
    setResetKey(prev => prev + 1); // カードの状態をリセット

    // 上にスクロール
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [customTabs]);

  // スクロール方向でヘッダー表示/非表示
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;

    const handleScroll = () => {
      const currentScrollY = main.scrollTop;
      const diff = currentScrollY - lastScrollY.current;

      if (diff < -5) {
        setHeaderVisible(true);
      } else if (diff > 5) {
        setHeaderVisible(false);
      }

      // 下部に近づいたら追加読み込み
      const { scrollTop, scrollHeight, clientHeight } = main;
      if (scrollHeight - scrollTop - clientHeight < 500) {
        setDisplayCount(prev => Math.min(prev + QUESTIONS_PER_LOAD, questions.length));
      }

      lastScrollY.current = currentScrollY;
    };

    main.addEventListener('scroll', handleScroll, { passive: true });
    return () => main.removeEventListener('scroll', handleScroll);
  }, [questions.length]);

  // 長押し処理
  const handleLongPressStart = () => {
    const timer = setTimeout(() => {
      setDeleteMode(true);
    }, 600);
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };


  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      {/* 上部: カテゴリタブ */}
      <div
        className={`fixed top-0 left-0 right-0 z-40 transition-transform duration-300 ${
          headerVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
        style={{
          backgroundColor: 'rgba(30, 30, 35, 0.85)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* タブ（フォルダ + 検索履歴） */}
        <div
          className={`max-w-2xl mx-auto flex overflow-x-auto scrollbar-hide ${deleteMode ? 'pt-3 pb-1' : ''}`}
          style={{ overflow: deleteMode ? 'visible' : undefined }}
        >
          {/* ブックマーク・フォルダタブ */}
          {folders.map((folder, index) => {
            const isActive = typeof activeFilter === 'object' && activeFilter.type === 'folder' && activeFilter.folderId === folder.id;
            const isBookmark = folder.id === 'bookmark';
            return (
              <div
                key={folder.id}
                className={`relative flex-shrink-0 ${deleteMode && !isBookmark ? 'animate-wiggle' : ''}`}
                style={{
                  animationDelay: deleteMode ? `${index * 0.05}s` : undefined,
                }}
              >
                {/* 削除ボタン - 削除モード時のみ（ブックマークは削除不可） */}
                {deleteMode && !isBookmark && (
                  <div
                    className="absolute -top-2 -left-1 z-50"
                    onClick={() => {
                      deleteFolder(folder.id);
                      if (isActive) {
                        loadQuestions('', [], activeSortOrder, activeHisshuOnly);
                      }
                      if (folders.length <= 2 && searchHistory.length === 0) {
                        setDeleteMode(false);
                      }
                    }}
                  >
                    <div className="w-5 h-5 bg-gray-800 rounded-full flex items-center justify-center shadow-lg cursor-pointer active:scale-90 transition-transform">
                      <span className="text-white text-xs font-bold leading-none">×</span>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => {
                    if (!deleteMode) {
                      loadQuestions({ type: 'folder', folderId: folder.id }, [], activeSortOrder, activeHisshuOnly);
                    }
                  }}
                  onTouchStart={!isBookmark ? handleLongPressStart : undefined}
                  onTouchEnd={!isBookmark ? handleLongPressEnd : undefined}
                  onTouchCancel={!isBookmark ? handleLongPressEnd : undefined}
                  onMouseDown={!isBookmark ? handleLongPressStart : undefined}
                  onMouseUp={!isBookmark ? handleLongPressEnd : undefined}
                  onMouseLeave={!isBookmark ? handleLongPressEnd : undefined}
                  className={`flex-shrink-0 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-blue-400 text-white'
                      : 'border-transparent text-gray-400 hover:text-gray-200'
                  } ${deleteMode && !isBookmark ? 'pointer-events-none' : ''}`}
                >
                  <span className="flex items-center gap-1.5">
                    {isBookmark ? (
                      <svg className="w-4 h-4" fill={isActive ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    ) : (
                      <span className="text-sm">{folder.name}</span>
                    )}
                    <span className="text-xs text-gray-400">{folder.questionIds.length}</span>
                  </span>
                </button>
              </div>
            );
          })}

          {/* フォルダ追加ボタン */}
          {!deleteMode && folders.length < 4 && (
            <button
              onClick={() => setShowCreateFolderModal(true)}
              className="flex-shrink-0 px-3 py-2.5 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          )}

          {/* 検索履歴タブ */}
          {searchHistory.map((keyword, index) => {
            const isActive = activeFilter === keyword;
            return (
              <div
                key={keyword}
                className={`relative flex-shrink-0 ${deleteMode ? 'animate-wiggle' : ''}`}
                style={{
                  animationDelay: deleteMode ? `${(folders.length + index) * 0.05}s` : undefined,
                }}
              >
                {/* 削除ボタン - 削除モード時のみ表示 */}
                {deleteMode && (
                  <div
                    className="absolute -top-2 -left-1 z-50"
                    onClick={() => {
                      removeSearchHistory(keyword);
                      if (activeFilter === keyword) {
                        loadQuestions('', [], activeSortOrder, activeHisshuOnly);
                      }
                      if (searchHistory.length <= 1 && folders.length === 0) {
                        setDeleteMode(false);
                      }
                    }}
                  >
                    <div className="w-5 h-5 bg-gray-800 rounded-full flex items-center justify-center shadow-lg cursor-pointer active:scale-90 transition-transform">
                      <span className="text-white text-xs font-bold leading-none">×</span>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => {
                    if (!deleteMode) {
                      loadQuestions(keyword, [], activeSortOrder, activeHisshuOnly);
                    }
                  }}
                  onTouchStart={handleLongPressStart}
                  onTouchEnd={handleLongPressEnd}
                  onTouchCancel={handleLongPressEnd}
                  onMouseDown={handleLongPressStart}
                  onMouseUp={handleLongPressEnd}
                  onMouseLeave={handleLongPressEnd}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-blue-400 text-white'
                      : 'border-transparent text-gray-400 hover:text-gray-200'
                  } ${deleteMode ? 'pointer-events-none' : ''}`}
                >
                  {keyword}
                </button>
              </div>
            );
          })}

          {/* 完了ボタン（削除モード時） */}
          {deleteMode && (
            <button
              onClick={() => setDeleteMode(false)}
              className="flex-shrink-0 px-4 py-2.5 text-blue-400 font-medium text-sm"
            >
              完了
            </button>
          )}
        </div>
      </div>

      {/* メインコンテンツ */}
      <main
        ref={mainRef}
        className="flex-1 overflow-y-auto pt-24 pb-6 px-4"
      >
        <div className="max-w-xl mx-auto">
          {questions.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              {typeof activeFilter === 'object' && activeFilter.type === 'folder' ? (
                <>
                  <div className="text-4xl mb-4">📁</div>
                  <p>フォルダが空です</p>
                  <p className="text-sm mt-2">問題のフォルダアイコンから追加できます</p>
                </>
              ) : (
                <p>該当する問題がありません</p>
              )}
            </div>
          ) : (
            <>
              {questions.slice(0, displayCount).map((question) => (
                <QuestionCard
                  key={`${resetKey}-${question.id}`}
                  question={question}
                  onImageClick={(images, index) => setImageGallery({ images, index })}
                />
              ))}

              {displayCount < questions.length && (
                <div className="py-8 text-center text-gray-500">
                  スクロールで続きを読み込み中...
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* 下からスライドアップする検索バー（ヘッダーと連動） */}
      <div
        className={`fixed left-0 right-0 bottom-0 z-40 flex justify-center px-4 pb-8 transition-transform duration-300 ${
          headerVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const input = e.currentTarget.querySelector('input');
            const keyword = input?.value.trim() || '';
            if (keyword) {
              addSearch(keyword);
            }
            loadQuestions(keyword, activeYears, activeSortOrder, activeHisshuOnly);
          }}
          className="w-full max-w-sm flex items-center gap-2 px-4 py-2.5 rounded-full"
          style={{
            backgroundColor: 'rgba(30, 30, 35, 0.85)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder=""
            defaultValue={typeof activeFilter === 'string' && activeFilter !== 'favorites' ? activeFilter : ''}
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-400 focus:outline-none"
          />
          {/* 検索ボタン */}
          <button
            type="submit"
            className="px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded-full hover:bg-blue-600 active:scale-95 transition-all"
          >
            検索
          </button>
          <button
            type="button"
            onClick={() => setShowFilterModal(true)}
            className="text-gray-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </button>
        </form>
      </div>


      {/* 画像ギャラリーモーダル */}
      {imageGallery && (
        <ImageGalleryModal
          images={imageGallery.images}
          initialIndex={imageGallery.index}
          onClose={() => setImageGallery(null)}
        />
      )}

      {/* フィルターモーダル */}
      {showFilterModal && (
        <FilterModal
          currentKeyword={typeof activeFilter === 'string' && activeFilter !== 'favorites' ? activeFilter : ''}
          currentYears={activeYears}
          currentSortOrder={activeSortOrder}
          currentHisshuOnly={activeHisshuOnly}
          onSubmit={(keyword, years, sortOrder, hisshuOnly) => {
            setShowFilterModal(false);
            // 検索キーワードがあれば履歴に追加
            if (keyword.trim()) {
              addSearch(keyword.trim());
            }
            loadQuestions(keyword, years, sortOrder, hisshuOnly);
          }}
          onClose={() => setShowFilterModal(false)}
        />
      )}

      {/* タブ追加モーダル */}
      {showAddTabModal && (
        <AddTabModal
          onClose={() => setShowAddTabModal(false)}
          onCreated={(tabId) => {
            setShowAddTabModal(false);
            loadQuestions({ type: 'custom', tabId }, [], activeSortOrder, activeHisshuOnly);
          }}
        />
      )}

      {/* フォルダ作成モーダル */}
      {showCreateFolderModal && (
        <CreateFolderModal
          onClose={() => setShowCreateFolderModal(false)}
          onCreated={() => {
            setShowCreateFolderModal(false);
          }}
        />
      )}
    </div>
  );
}

// 問題カードコンポーネント（閲覧モード）
interface QuestionCardProps {
  question: Question;
  onImageClick: (images: string[], index: number) => void;
}

function QuestionCard({ question, onImageClick }: QuestionCardProps) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showFullExplanation, setShowFullExplanation] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const { folders, addToFolder, removeFromFolder, getFoldersForQuestion } = useFolderStore();
  const questionFolders = getFoldersForQuestion(question.id);
  const q = question;
  const explanation = getExplanation(question.id);

  const handleScreenshot = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!cardRef.current || isCapturing) return;

    setIsCapturing(true);

    // DOMの更新を待つ
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      // 画像が2枚以上ある場合は横並びレイアウト
      const useHorizontalLayout = question.images.length >= 2;

      // メインラッパー
      const wrapper = document.createElement('div');
      wrapper.style.padding = '24px 48px 48px 48px';
      wrapper.style.backgroundColor = '#ffffff';
      wrapper.style.display = 'inline-block';
      wrapper.style.maxWidth = useHorizontalLayout ? '1200px' : '600px';

      if (useHorizontalLayout) {
        // 横並びレイアウト：左に問題文+選択肢、右に画像
        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.gap = '32px';
        container.style.alignItems = 'flex-start';

        // 左カラム（問題文+選択肢）
        const leftColumn = document.createElement('div');
        leftColumn.style.flex = '1';
        leftColumn.style.minWidth = '0';

        // ヘッダー
        const header = document.createElement('div');
        header.style.marginBottom = '12px';
        header.innerHTML = `<span style="font-weight: bold; color: #1f2937; font-size: 16px;">${question.id}</span>`;
        leftColumn.appendChild(header);

        // 問題文
        const questionText = document.createElement('p');
        questionText.style.color = '#1f2937';
        questionText.style.lineHeight = '1.6';
        questionText.style.whiteSpace = 'pre-wrap';
        questionText.style.marginBottom = '16px';
        questionText.textContent = question.questionText;
        leftColumn.appendChild(questionText);

        // 選択肢
        const choicesDiv = document.createElement('div');
        const sortedChoices = Object.entries(question.choices).sort(([a], [b]) => a.localeCompare(b));
        sortedChoices.forEach(([key, value]) => {
          const choiceDiv = document.createElement('div');
          choiceDiv.style.padding = '8px 12px';
          choiceDiv.style.color = '#1f2937';
          choiceDiv.innerHTML = `<span style="font-weight: 500; margin-right: 8px;">${key.toUpperCase()}.</span>${value}`;
          choicesDiv.appendChild(choiceDiv);
        });
        leftColumn.appendChild(choicesDiv);

        // 右カラム（画像）- グリッドレイアウトで表示
        const rightColumn = document.createElement('div');
        rightColumn.style.width = '450px';
        rightColumn.style.flexShrink = '0';
        rightColumn.style.display = 'grid';
        // 画像が3枚以上なら2列、それ以下なら1列
        rightColumn.style.gridTemplateColumns = question.images.length >= 3 ? 'repeat(2, 1fr)' : '1fr';
        rightColumn.style.gap = '8px';
        rightColumn.style.alignContent = 'start';

        question.images.forEach((src, idx) => {
          const img = document.createElement('img');
          img.src = src;
          img.alt = `図${idx + 1}`;
          img.style.width = '100%';
          img.style.height = 'auto';
          img.style.maxHeight = question.images.length >= 3 ? '200px' : '280px';
          img.style.objectFit = 'contain';
          img.style.borderRadius = '6px';
          img.style.border = '1px solid #e5e7eb';
          img.style.backgroundColor = '#f9fafb';
          rightColumn.appendChild(img);
        });

        container.appendChild(leftColumn);
        container.appendChild(rightColumn);
        wrapper.appendChild(container);
      } else {
        // 縦並びレイアウト（従来通り）
        const clone = cardRef.current.cloneNode(true) as HTMLElement;

        // ボタンを削除
        const excludeElements = clone.querySelectorAll('[data-screenshot-exclude]');
        excludeElements.forEach(el => el.remove());

        // 全ての選択肢のテキストを黒色に
        const choiceElements = clone.querySelectorAll('[data-choice]');
        choiceElements.forEach(el => {
          (el as HTMLElement).style.color = '#1f2937';
        });

        // 画像グリッドを元の画像に置き換え
        const imageContainers = clone.querySelectorAll('[data-image-grid]');
        imageContainers.forEach(container => {
          const el = container as HTMLElement;
          el.innerHTML = '';
          el.style.display = 'flex';
          el.style.flexDirection = 'column';
          el.style.gap = '12px';
          el.style.marginBottom = '12px';

          question.images.forEach((src, idx) => {
            const img = document.createElement('img');
            img.src = src;
            img.alt = `図${idx + 1}`;
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.style.borderRadius = '8px';
            img.style.border = '1px solid #e5e7eb';
            el.appendChild(img);
          });
        });

        wrapper.appendChild(clone);
      }

      document.body.appendChild(wrapper);

      const canvas = await html2canvas(wrapper, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      document.body.removeChild(wrapper);

      // ダウンロード
      const link = document.createElement('a');
      link.download = `${question.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Screenshot failed:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  const sortedChoices = Object.entries(q.choices).sort(([a], [b]) => a.localeCompare(b));

  return (
    <article
      ref={cardRef}
      className="border-b border-gray-100 py-4 cursor-pointer active:bg-gray-50 transition-colors"
      onClick={() => setShowAnswer(!showAnswer)}
    >
      {/* ヘッダー */}
      <div className="flex items-center gap-2 mb-2">
        <span className="font-bold text-gray-900">{q.id}</span>
        {q.category && (
          <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{q.category}</span>
        )}
      </div>

      {/* 問題文 */}
      <p className="text-gray-900 leading-relaxed whitespace-pre-wrap mb-3">
        {q.questionText}
      </p>

      {/* 画像 */}
      {q.images.length > 0 && (
        <div data-image-grid onClick={e => e.stopPropagation()}>
          <ImageGrid images={q.images} onImageClick={onImageClick} />
        </div>
      )}

      {/* 選択肢（計算問題以外） */}
      {getQuestionType(q) !== 'calculation' && (
        <div className="mt-3 space-y-1">
          {(() => {
            const questionType = getQuestionType(q);
            return sortedChoices.map(([key, value]) => {
              // 通常問題のみ選択肢のハイライトを適用
              const isCorrectAnswer = questionType === 'normal' && q.answer.toLowerCase().includes(key);
              return (
                <div
                  key={key}
                  data-choice
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
                    showAnswer && isCorrectAnswer
                      ? 'font-medium text-gray-900'
                      : showAnswer && questionType === 'normal'
                      ? 'text-gray-300'
                      : 'text-gray-800'
                  }`}
                >
                  <span className="font-medium mr-2">{key.toUpperCase()}.</span>
                  {value}
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* 正答表示（計算・並び替え問題用） */}
      {showAnswer && (() => {
        const questionType = getQuestionType(q);
        if (questionType === 'calculation') {
          return (
            <p className="mt-2 text-sm text-gray-500">
              正答: <span className="font-medium text-gray-700">{q.answer}</span>
            </p>
          );
        }
        if (questionType === 'ordering') {
          return (
            <p className="mt-2 text-sm text-gray-500">
              正答: <span className="font-medium text-gray-700">{formatOrderingAnswer(q.answer, q.choices)}</span>
            </p>
          );
        }
        return null;
      })()}

      {/* アクションボタン（Instagram風） */}
      <div className="flex items-center justify-end gap-3 mt-3 pt-2" onClick={(e) => e.stopPropagation()} data-screenshot-exclude>
        {/* ブックマーク・フォルダボタン */}
        {folders.map(folder => {
          const isInFolder = questionFolders.some(f => f.id === folder.id);
          const isBookmark = folder.id === 'bookmark';
          return (
            <button
              key={folder.id}
              onClick={() => {
                if (isInFolder) {
                  removeFromFolder(folder.id, question.id);
                } else {
                  addToFolder(folder.id, question.id);
                }
              }}
              className={`transition-all hover:scale-110 ${
                isInFolder ? 'text-blue-500' : 'text-gray-300 hover:text-gray-400'
              }`}
            >
              {isBookmark ? (
                <svg className="w-5 h-5" fill={isInFolder ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              ) : (
                <span className={`text-xs ${isInFolder ? 'font-medium' : ''}`}>
                  {folder.name}
                </span>
              )}
            </button>
          );
        })}
        {/* スクリーンショット保存ボタン */}
        <button
          onClick={handleScreenshot}
          disabled={isCapturing}
          className={`transition-all hover:scale-110 ${isCapturing ? 'text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* 解説（Instagram風 続きを読む） */}
      {explanation && (
        <div
          className="mt-2"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {showFullExplanation ? (
              <>
                {explanation.dialogue}
                {explanation.points && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs font-medium text-blue-600 mb-1">ポイント</p>
                    <p className="text-gray-700 whitespace-pre-wrap">{explanation.points}</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <span className="text-gray-500">
                  {explanation.dialogue.split('\n')[0].slice(0, 35)}...
                </span>
                <button
                  onClick={() => setShowFullExplanation(true)}
                  className="ml-1 text-gray-400"
                >
                  続きを読む
                </button>
              </>
            )}
          </div>
        </div>
      )}

          </article>
  );
}

// 画像グリッドコンポーネント
interface ImageGridProps {
  images: string[];
  onImageClick: (images: string[], index: number) => void;
}

function ImageGrid({ images, onImageClick }: ImageGridProps) {
  const count = images.length;

  if (count === 1) {
    return (
      <div className="mb-3">
        <img
          src={images[0]}
          alt="図1"
          className="max-w-full max-h-64 rounded-2xl border border-gray-200 cursor-pointer hover:opacity-95"
          onClick={() => onImageClick(images, 0)}
        />
      </div>
    );
  }

  if (count === 2) {
    return (
      <div className="flex gap-0.5 rounded-2xl overflow-hidden border border-gray-200 mb-3">
        {images.map((img, idx) => (
          <img
            key={idx}
            src={img}
            alt={`図${idx + 1}`}
            className="w-1/2 h-40 object-cover cursor-pointer hover:opacity-95"
            onClick={() => onImageClick(images, idx)}
          />
        ))}
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className="flex gap-0.5 rounded-2xl overflow-hidden border border-gray-200 h-48 mb-3">
        <img
          src={images[0]}
          alt="図1"
          className="w-1/2 h-full object-cover cursor-pointer hover:opacity-95"
          onClick={() => onImageClick(images, 0)}
        />
        <div className="w-1/2 flex flex-col gap-0.5">
          {images.slice(1).map((img, idx) => (
            <img
              key={idx}
              src={img}
              alt={`図${idx + 2}`}
              className="w-full h-1/2 object-cover cursor-pointer hover:opacity-95"
              onClick={() => onImageClick(images, idx + 1)}
            />
          ))}
        </div>
      </div>
    );
  }

  // 4枚以上
  return (
    <div className="grid grid-cols-2 gap-0.5 rounded-2xl overflow-hidden border border-gray-200 mb-3">
      {images.slice(0, 4).map((img, idx) => (
        <img
          key={idx}
          src={img}
          alt={`図${idx + 1}`}
          className="w-full h-28 object-cover cursor-pointer hover:opacity-95"
          onClick={() => onImageClick(images, idx)}
        />
      ))}
      {count > 4 && (
        <div className="col-span-2 text-center text-xs text-gray-500 py-1">+{count - 4}枚</div>
      )}
    </div>
  );
}

// 画像ギャラリーモーダル
interface ImageGalleryModalProps {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}

function ImageGalleryModal({ images, initialIndex, onClose }: ImageGalleryModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const goToPrev = () => setCurrentIndex(prev => (prev > 0 ? prev - 1 : prev));
  const goToNext = () => setCurrentIndex(prev => (prev < images.length - 1 ? prev + 1 : prev));

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? goToNext() : goToPrev();
    }
    setTouchStart(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex flex-col"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex items-center justify-between p-4 text-white">
        <button onClick={onClose} className="text-2xl">✕</button>
        {images.length > 1 && <span className="text-sm">{currentIndex + 1} / {images.length}</span>}
        <div className="w-8" />
      </div>

      <div className="flex-1 flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
        <img
          src={images[currentIndex]}
          alt={`図${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
        />
      </div>

      {images.length > 1 && (
        <>
          {currentIndex > 0 && (
            <button onClick={(e) => { e.stopPropagation(); goToPrev(); }} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/30 text-white flex items-center justify-center">‹</button>
          )}
          {currentIndex < images.length - 1 && (
            <button onClick={(e) => { e.stopPropagation(); goToNext(); }} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/30 text-white flex items-center justify-center">›</button>
          )}
          <div className="flex justify-center gap-2 pb-6">
            {images.map((_, idx) => (
              <button key={idx} onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }} className={`w-2 h-2 rounded-full ${idx === currentIndex ? 'bg-white' : 'bg-white/40'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// 並び順の型
type SortOrder = 'newest' | 'random';

// フィルターモーダル
interface FilterModalProps {
  currentKeyword: string;
  currentYears: number[];
  currentSortOrder: SortOrder;
  currentHisshuOnly: boolean;
  onSubmit: (keyword: string, years: number[], sortOrder: SortOrder, hisshuOnly: boolean) => void;
  onClose: () => void;
}

function FilterModal({ currentKeyword, currentYears, currentSortOrder, currentHisshuOnly, onSubmit, onClose }: FilterModalProps) {
  const [keyword, setKeyword] = useState(currentKeyword);
  const [selectedYears, setSelectedYears] = useState<number[]>(currentYears);
  const [sortOrder, setSortOrder] = useState<SortOrder>(currentSortOrder);
  const [hisshuOnly, setHisshuOnly] = useState(currentHisshuOnly);
  const [previewCount, setPreviewCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const [minYear, maxYear] = getYearRange();
  const years: number[] = [];
  for (let y = maxYear; y >= minYear; y--) {
    years.push(y);
  }

  const toggleYear = (year: number) => {
    setSelectedYears(prev =>
      prev.includes(year)
        ? prev.filter(y => y !== year)
        : [...prev, year].sort((a, b) => b - a)
    );
  };

  useEffect(() => {
    const allQ = getAllQuestions();
    const filtered = filterQuestions(allQ, keyword.trim(), selectedYears, [], hisshuOnly);
    setPreviewCount(filtered.length);
  }, [keyword, selectedYears, hisshuOnly]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(keyword.trim(), selectedYears, sortOrder, hisshuOnly);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6 bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-3xl p-6 animate-scale-up shadow-2xl relative"
        style={{ backgroundColor: 'rgba(30, 30, 35, 0.95)' }}
        onClick={e => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          {/* 検索入力 */}
          <div className="mb-4">
            <div className="relative flex items-center bg-white rounded-2xl">
              <svg className="w-5 h-5 text-gray-400 ml-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder="キーワードで検索"
                className="flex-1 pl-3 pr-2 py-4 bg-transparent text-base text-gray-900 placeholder-gray-400 focus:outline-none"
              />
              {/* 件数表示（入力欄内の右側） */}
              <span className={`text-xs font-medium px-3 ${previewCount === 0 ? 'text-red-500' : 'text-gray-500'}`}>
                {previewCount === 0 ? '該当なし' : `${previewCount.toLocaleString()}問`}
              </span>
              {keyword && (
                <button type="button" onClick={() => setKeyword('')} className="mr-3 w-5 h-5 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-gray-600 text-xs font-bold">✕</span>
                </button>
              )}
            </div>
            {/* 検索ボタン（横幅いっぱい） */}
            <button
              type="submit"
              className="w-full mt-4 py-3.5 bg-blue-500 text-white font-medium rounded-2xl hover:bg-blue-600 active:scale-[0.98] transition-all"
            >
              検索
            </button>
          </div>

          {/* 並び順 - セグメントコントロール */}
          <div className="mb-4">
            <div className="bg-white/10 p-1 rounded-full flex relative">
              {/* スライドするインジケーター */}
              <div
                className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] bg-white/20 rounded-full transition-transform duration-300 ease-out"
                style={{ transform: sortOrder === 'newest' ? 'translateX(0)' : 'translateX(100%)' }}
              />
              <button
                type="button"
                onClick={() => setSortOrder('newest')}
                className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-colors duration-300 relative z-10 ${
                  sortOrder === 'newest'
                    ? 'text-white'
                    : 'text-gray-400'
                }`}
              >
                新しい順
              </button>
              <button
                type="button"
                onClick={() => setSortOrder('random')}
                className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-colors duration-300 relative z-10 ${
                  sortOrder === 'random'
                    ? 'text-white'
                    : 'text-gray-400'
                }`}
              >
                ランダム
              </button>
            </div>
          </div>

          {/* 回次選択 */}
          <div>
            {/* プリセットボタン */}
            <div className="flex justify-center gap-2 mb-3">
              <button
                type="button"
                onClick={() => setSelectedYears([])}
                className={`px-4 py-2 text-xs rounded-full font-medium transition-all ${
                  selectedYears.length === 0
                    ? 'bg-white/20 text-white'
                    : 'bg-transparent text-gray-400 border border-gray-500'
                }`}
              >
                全範囲
              </button>
              <button
                type="button"
                onClick={() => setSelectedYears(years.slice(0, 5))}
                className={`px-4 py-2 text-xs rounded-full font-medium transition-all ${
                  selectedYears.length === 5 && selectedYears[0] === maxYear && !hisshuOnly
                    ? 'bg-white/20 text-white'
                    : 'bg-transparent text-gray-400 border border-gray-500'
                }`}
              >
                直近5回
              </button>
              <button
                type="button"
                onClick={() => setHisshuOnly(!hisshuOnly)}
                className={`px-4 py-2 text-xs rounded-full font-medium transition-all ${
                  hisshuOnly
                    ? 'bg-white/20 text-white'
                    : 'bg-transparent text-gray-400 border border-gray-500'
                }`}
              >
                必修
              </button>
            </div>
            {/* 年度グリッド（5列固定） */}
            <div className="grid grid-cols-5 gap-2">
              {years.map(year => {
                // 直近5回が選択されている場合は個別年度をハイライトしない
                const isRecent5 = selectedYears.length === 5 && selectedYears[0] === maxYear;
                const isSelected = !isRecent5 && selectedYears.includes(year);
                return (
                  <button
                    key={year}
                    type="button"
                    onClick={() => toggleYear(year)}
                    className={`py-2 text-xs rounded-full font-medium transition-all ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-transparent text-gray-400 border border-gray-500'
                    }`}
                  >
                    {year}
                  </button>
                );
              })}
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}

// タブ追加モーダル
interface AddTabModalProps {
  onClose: () => void;
  onCreated: (tabId: string) => void;
}

function AddTabModal({ onClose, onCreated }: AddTabModalProps) {
  const [tabName, setTabName] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set());
  const [previewCount, setPreviewCount] = useState(0);
  const { addTab } = useCustomTabsStore();

  // プレビュー件数を計算
  useEffect(() => {
    if (selectedSubjects.size === 0) {
      setPreviewCount(0);
      return;
    }

    const allQ = getAllQuestions();
    const subjectNames = [...selectedSubjects].map(id => {
      const subject = getSubjectById(id);
      return subject ? subject.name : null;
    }).filter(Boolean) as string[];

    const count = allQ.filter(q => {
      // categoryフィールドでマッチ
      if (q.category && subjectNames.includes(q.category)) {
        return true;
      }
      // keywordsフィールド（複数科目）でマッチ
      if (q.keywords && Array.isArray(q.keywords)) {
        return q.keywords.some(kw => subjectNames.includes(kw));
      }
      return false;
    }).length;

    setPreviewCount(count);
  }, [selectedSubjects]);

  // 科目の選択/解除
  const toggleSubject = (id: string) => {
    setSelectedSubjects(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // タブ作成
  const handleCreate = () => {
    if (selectedSubjects.size === 0) return;

    // タブ名が未入力なら選択科目から自動生成
    const name = tabName.trim() || [...selectedSubjects]
      .map(id => getSubjectById(id)?.displayName || '')
      .filter(Boolean)
      .slice(0, 2)
      .join('・') + (selectedSubjects.size > 2 ? '...' : '');

    // 最初に選択した科目の色を使用
    const firstSubject = getSubjectById([...selectedSubjects][0]);
    const color = firstSubject?.color || '#6366F1';

    addTab({
      name,
      subjectIds: [...selectedSubjects],
      color,
    });

    // 作成したタブのIDを取得（最新のもの）
    const tabs = useCustomTabsStore.getState().tabs;
    const newTab = tabs[tabs.length - 1];
    if (newTab) {
      onCreated(newTab.id);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-white w-full max-w-lg rounded-t-3xl p-6 pb-8 max-h-[85vh] flex flex-col animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
        <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">カスタムタブを作成</h3>

        {/* タブ名入力 */}
        <div className="mb-4">
          <input
            type="text"
            value={tabName}
            onChange={e => setTabName(e.target.value)}
            placeholder="タブ名（省略可）"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
          />
        </div>

        {/* 科目選択 */}
        <div className="flex-1 overflow-y-auto mb-4">
          {subjectCategories.map(category => (
            <div key={category.name} className="mb-4">
              <p className="text-xs text-gray-500 mb-2 font-medium">{category.name}</p>
              <div className="flex flex-wrap gap-2">
                {category.subjects.map(subject => {
                  const isSelected = selectedSubjects.has(subject.id);
                  return (
                    <button
                      key={subject.id}
                      onClick={() => toggleSubject(subject.id)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                        isSelected
                          ? 'text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      style={isSelected ? { backgroundColor: subject.color } : undefined}
                    >
                      {subject.displayName}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* プレビュー */}
        <p className="text-center text-sm text-gray-600 mb-4">
          {selectedSubjects.size > 0 ? (
            previewCount > 0 ? (
              <span className="text-primary font-medium">{previewCount.toLocaleString()}問</span>
            ) : (
              <span className="text-red-500">該当なし</span>
            )
          ) : (
            <span className="text-gray-400">科目を選択してください</span>
          )}
        </p>

        {/* ボタン */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="py-3 rounded-xl font-medium bg-gray-100 text-gray-600"
          >
            キャンセル
          </button>
          <button
            onClick={handleCreate}
            disabled={selectedSubjects.size === 0 || previewCount === 0}
            className={`py-3 rounded-xl font-bold ${
              selectedSubjects.size > 0 && previewCount > 0
                ? 'bg-primary text-white'
                : 'bg-gray-200 text-gray-400'
            }`}
          >
            作成
          </button>
        </div>
      </div>
    </div>
  );
}

// フォルダ作成モーダル（シンプル版）
interface CreateFolderModalProps {
  onClose: () => void;
  onCreated: (folderId: string) => void;
}

function CreateFolderModal({ onClose, onCreated }: CreateFolderModalProps) {
  const [folderName, setFolderName] = useState('');
  const { createFolder } = useFolderStore();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleCreate = () => {
    const name = folderName.trim();
    if (!name) return;
    const folderId = createFolder(name);
    onCreated(folderId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/10 backdrop-blur-[3px]" onClick={onClose}>
      <div
        className="w-full max-w-xs rounded-2xl p-5 animate-scale-up backdrop-blur-sm border border-white/30"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)' }}
        onClick={e => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          value={folderName}
          onChange={e => setFolderName(e.target.value.slice(0, 10))}
          placeholder="フォルダ名（10文字以内）"
          className="w-full px-4 py-3 bg-gray-50 rounded-xl text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyDown={e => {
            if (e.key === 'Enter' && folderName.trim()) {
              handleCreate();
            }
          }}
        />
        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl font-medium bg-gray-100 text-gray-600"
          >
            キャンセル
          </button>
          <button
            onClick={handleCreate}
            disabled={!folderName.trim()}
            className={`flex-1 py-2.5 rounded-xl font-medium ${
              folderName.trim()
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-400'
            }`}
          >
            作成
          </button>
        </div>
      </div>
    </div>
  );
}

