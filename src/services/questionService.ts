// データ取得の抽象化層
// 将来的にAPIやDBに切り替える時はここだけ変更すればOK

import type { Question, QuestionsData } from '../types/question';
import questionsData from '../data/questions.json';
import explanationsData from '../data/explanations.json';

// 解説データの型
export interface Explanation {
  id: string;
  originalId: string;
  subject: string;
  dialogue: string;
  points: string | null;
  tableTitle: string | null;
  tableContent: string | null;
}

// 解説データをマップとして保持
const explanations = explanationsData as Record<string, Explanation>;

// 型アサーション
const data = questionsData as QuestionsData;

// 有効な問題のみフィルタリング（choices/questionTextが空のものを除外、採点除外問題は含める）
const validQuestions = data.questions.filter(q =>
  q.questionText &&
  q.choices &&
  Object.keys(q.choices).length > 0 &&
  (q.answer || q.isExcluded)  // 解答があるか、採点除外なら表示
);

// 全問題を取得
export function getAllQuestions(): Question[] {
  return validQuestions;
}

// メタデータを取得
export function getMeta() {
  return data.meta;
}

// 回次の範囲を取得
export function getYearRange(): [number, number] {
  return [data.meta.yearRange.min, data.meta.yearRange.max];
}

// セッション一覧を取得
export function getSessions(): string[] {
  return ['A', 'B', 'C', 'D'];
}

// 必修問題かどうかを判定
export function isHisshu(year: number, session: string, number: number): boolean {
  if (year === 102) {
    // A1〜25, B1〜25（計50問）
    return (session === 'A' || session === 'B') && number >= 1 && number <= 25;
  } else if (year >= 103 && year <= 110) {
    // A1〜35, B1〜35（計70問）
    return (session === 'A' || session === 'B') && number >= 1 && number <= 35;
  } else if (year >= 111 && year <= 113) {
    // A1〜40, B1〜40（計80問）
    return (session === 'A' || session === 'B') && number >= 1 && number <= 40;
  } else if (year >= 114) {
    // A1〜20, B1〜20, C1〜20, D1〜20（計80問）
    return ['A', 'B', 'C', 'D'].includes(session) && number >= 1 && number <= 20;
  }
  return false;
}

// 問題番号パターンを解析（112-B-48, 112B48, 112 B 48 など）
// 完全な形式（回次+セッション+問題番号）の場合のみマッチ
function parseQuestionId(text: string): { year: number; session: string; number: number } | null {
  // パターン: 数字2-3桁 + (区切り文字?) + アルファベット1文字 + (区切り文字?) + 数字1-3桁
  // 全て揃っている場合のみマッチ（部分入力は通常検索として扱う）
  const pattern = /^(\d{2,3})[\s\-_]*([a-dA-D])[\s\-_]*(\d{1,3})$/;
  const match = text.trim().match(pattern);

  if (match) {
    return {
      year: parseInt(match[1]),
      session: match[2].toUpperCase(),
      number: parseInt(match[3])
    };
  }
  return null;
}

// 部分的な問題番号パターンを解析（112, 112B など入力途中）
// 戻り値: years配列で複数回次にマッチ可能
function parsePartialQuestionId(text: string): { years: number[]; session?: string } | null {
  const trimmed = text.trim();

  // パターン1: 回次+セッション（112B, 112-B など）
  const patternWithSession = /^(\d{2,3})[\s\-_]*([a-dA-D])[\s\-_]*$/i;
  const matchWithSession = trimmed.match(patternWithSession);
  if (matchWithSession) {
    const year = parseInt(matchWithSession[1]);
    if (year >= 100 && year <= 130) {
      return {
        years: [year],
        session: matchWithSession[2].toUpperCase()
      };
    }
  }

  // パターン2: 3桁の回次（102〜118の範囲）
  const patternYearFull = /^(\d{3})$/;
  const matchYearFull = trimmed.match(patternYearFull);
  if (matchYearFull) {
    const year = parseInt(matchYearFull[1]);
    if (year >= 100 && year <= 130) {
      return { years: [year] };
    }
  }

  // パターン3: 2桁の部分入力（10→100-109, 11→110-118 など）
  const patternYearPartial = /^(\d{2})$/;
  const matchYearPartial = trimmed.match(patternYearPartial);
  if (matchYearPartial) {
    const prefix = parseInt(matchYearPartial[1]);
    // 10 → 100-109, 11 → 110-119, 12 → 120-129 の範囲で該当回次を返す
    if (prefix >= 10 && prefix <= 13) {
      const years: number[] = [];
      for (let i = 0; i <= 9; i++) {
        const year = prefix * 10 + i;
        if (year >= 102 && year <= 118) { // 実際のデータ範囲
          years.push(year);
        }
      }
      if (years.length > 0) {
        return { years };
      }
    }
  }

  return null;
}

// 問題をフィルタリング
export function filterQuestions(
  questions: Question[],
  searchText: string,
  selectedYears: number[],
  sessions: string[],
  hisshuOnly: boolean = false
): Question[] {
  const trimmedSearch = searchText.trim();

  // 問題番号形式かチェック（112-B-48 など）- 他のフィルタより優先
  const parsed = parseQuestionId(trimmedSearch);
  if (parsed) {
    return questions.filter(q => {
      const yearMatch = q.year === parsed.year;
      const sessionMatch = q.session === parsed.session;
      const numberMatch = q.number === parsed.number;
      return yearMatch && sessionMatch && numberMatch;
    });
  }

  // 問題ID完全一致（118A1 など）- 他のフィルタより優先
  if (trimmedSearch) {
    const exactMatch = questions.filter(q => q.id.toLowerCase() === trimmedSearch.toLowerCase());
    if (exactMatch.length > 0) {
      return exactMatch;
    }
  }

  // 部分的な問題番号形式（11, 112, 112B など入力途中）- 他のフィルタより優先
  const partialParsed = parsePartialQuestionId(trimmedSearch);
  if (partialParsed) {
    return questions.filter(q => {
      const yearMatch = partialParsed.years.includes(q.year);
      const sessionMatch = partialParsed.session ? q.session === partialParsed.session : true;
      return yearMatch && sessionMatch;
    });
  }

  return questions.filter(q => {
    // 必修フィルタ
    if (hisshuOnly && !isHisshu(q.year, q.session, q.number)) {
      return false;
    }

    // 回次フィルタ（複数選択）
    if (selectedYears.length > 0 && !selectedYears.includes(q.year)) {
      return false;
    }

    // セッションフィルタ
    if (sessions.length > 0 && !sessions.includes(q.session)) {
      return false;
    }

    // テキスト検索
    if (trimmedSearch) {

      // スペース区切りで複数キーワード（AND検索）※半角・全角両対応
      const keywords = trimmedSearch.split(/[\s　]+/).filter(k => k.length > 0);

      // 全てのキーワードにマッチする必要あり（AND検索）
      const matchesAll = keywords.every(keyword => {
        const lowerKeyword = keyword.toLowerCase();
        const inQuestion = q.questionText.toLowerCase().includes(lowerKeyword);
        const inChoices = Object.values(q.choices).some(
          c => c.toLowerCase().includes(lowerKeyword)
        );
        return inQuestion || inChoices;
      });

      if (!matchesAll) {
        return false;
      }
    }

    return true;
  });
}

// 解説を取得
export function getExplanation(questionId: string): Explanation | null {
  // IDを正規化（ハイフン除去など）
  const normalizedId = questionId.replace(/[-\s]/g, '');
  return explanations[normalizedId] || null;
}

// 解説があるかチェック
export function hasExplanation(questionId: string): boolean {
  const normalizedId = questionId.replace(/[-\s]/g, '');
  return normalizedId in explanations;
}
