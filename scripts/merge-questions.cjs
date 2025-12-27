#!/usr/bin/env node
/**
 * 過去問JSONを統合してquestions.jsonを生成
 * 画像マッピングも読み込んで画像パスを追加
 */

const fs = require('fs');
const path = require('path');

// パス設定
const jsonDataDir = path.join(__dirname, '../../json_data');
const outputPath = path.join(__dirname, '../src/data/questions.json');

// 出力ディレクトリ作成
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 画像マッピングを読み込み
const imageMapping = {};
const mappingFiles = fs.readdirSync(jsonDataDir)
  .filter(f => f.endsWith('_画像マッピング.json'));

console.log(`${mappingFiles.length}個の画像マッピングを読み込み中...`);

for (const file of mappingFiles) {
  // ファイル名から回次を抽出（例: "118回_画像マッピング.json" → 118）
  const year = parseInt(file.match(/\d+/)[0]);
  const filePath = path.join(jsonDataDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  // 問題IDごとに画像パスを設定
  for (const [questionId, images] of Object.entries(data)) {
    // 画像パスを生成（例: "/images/118回_Web画像/118A7.png"）
    imageMapping[questionId] = images.map(img =>
      `/images/${year}回_Web画像/${img}`
    );
  }
}

console.log(`  画像付き問題数: ${Object.keys(imageMapping).length}`);

// 全問題を格納
const allQuestions = [];

// 問題JSONファイルを読み込み
const files = fs.readdirSync(jsonDataDir)
  .filter(f => f.endsWith('_Web取得.json'))
  .sort();

console.log(`${files.length}個の問題JSONを処理中...`);

for (const file of files) {
  const filePath = path.join(jsonDataDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  for (const q of data) {
    // 回次を抽出（例: "118A" → 118）
    const year = parseInt(q.exam_code.match(/\d+/)[0]);
    const session = q.exam_code.replace(/\d+/, '');

    // 画像パスを取得
    const imagePaths = imageMapping[q.full_code] || [];

    // 採点除外判定（answerが空または未定義）
    const isExcluded = !q.answer || q.answer.trim() === '';

    // アプリ用の形式に変換
    allQuestions.push({
      id: q.full_code,
      year: year,
      session: session,
      number: q.number,
      questionText: q.question_text,
      choices: q.choices,
      choiceCount: q.choice_count,
      answer: q.answer || '',
      hasFigure: q.has_figure || imagePaths.length > 0,
      figureRefs: q.figure_refs || [],
      images: imagePaths,
      isExcluded: isExcluded,
      // 将来追加用のフィールド（空で初期化）
      category: null,
      subcategory: null,
      keywords: []
    });
  }
}

// 回次・番号でソート
allQuestions.sort((a, b) => {
  if (a.year !== b.year) return a.year - b.year;
  if (a.session !== b.session) return a.session.localeCompare(b.session);
  return a.number - b.number;
});

// 画像付き問題数をカウント
const withImages = allQuestions.filter(q => q.images.length > 0).length;

// 出力データ構造
const output = {
  meta: {
    version: "1.1.0",
    lastUpdated: new Date().toISOString().split('T')[0],
    totalCount: allQuestions.length,
    withImagesCount: withImages,
    yearRange: {
      min: Math.min(...allQuestions.map(q => q.year)),
      max: Math.max(...allQuestions.map(q => q.year))
    }
  },
  questions: allQuestions
};

// 書き出し
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

console.log(`完了！`);
console.log(`  総問題数: ${output.meta.totalCount}`);
console.log(`  画像付き: ${output.meta.withImagesCount}`);
console.log(`  対象回次: ${output.meta.yearRange.min}回〜${output.meta.yearRange.max}回`);
console.log(`  出力先: ${outputPath}`);
