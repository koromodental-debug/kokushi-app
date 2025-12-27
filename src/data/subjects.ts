// 歯科国試の科目定義
// Dental Youthからスクレイピングした科目名に対応

export interface Subject {
  id: string;
  name: string;       // データベースのcategoryと一致させる
  displayName: string; // 表示用の短い名前
  color: string;
}

export interface SubjectCategory {
  name: string;
  subjects: Subject[];
}

export const subjectCategories: SubjectCategory[] = [
  {
    name: '基礎系',
    subjects: [
      { id: 'anatomy', name: '解剖学', displayName: '解剖学', color: '#3B82F6' },
      { id: 'histology', name: '組織学', displayName: '組織学', color: '#6366F1' },
      { id: 'physiology', name: '生理学', displayName: '生理学', color: '#8B5CF6' },
      { id: 'biochemistry', name: '生化学', displayName: '生化学', color: '#A855F7' },
      { id: 'pathology', name: '病理学', displayName: '病理学', color: '#D946EF' },
      { id: 'microbiology', name: '微生物学', displayName: '微生物学', color: '#EC4899' },
      { id: 'pharmacology', name: '薬理学', displayName: '薬理学', color: '#F43F5E' },
      { id: 'materials', name: '歯科理工学', displayName: '理工学', color: '#EF4444' },
    ]
  },
  {
    name: '臨床系',
    subjects: [
      { id: 'operative', name: '保存修復学', displayName: '保存修復', color: '#F59E0B' },
      { id: 'endodontics', name: '歯内療法学', displayName: '歯内療法', color: '#EAB308' },
      { id: 'periodontics', name: '歯周病学', displayName: '歯周病', color: '#84CC16' },
      { id: 'crown_bridge', name: 'クラウンブリッジ', displayName: 'クラブリ', color: '#22C55E' },
      { id: 'partial_denture', name: '部分床義歯学', displayName: 'パーシャル', color: '#10B981' },
      { id: 'complete_denture', name: '全部床義歯学', displayName: 'フルデン', color: '#14B8A6' },
      { id: 'implant', name: '口腔インプラント学', displayName: 'インプラ', color: '#06B6D4' },
      { id: 'oral_surgery', name: '口腔外科学', displayName: '口外', color: '#0EA5E9' },
      { id: 'radiology', name: '歯科放射線学', displayName: '放射線', color: '#0284C7' },
      { id: 'anesthesia', name: '歯科麻酔学', displayName: '麻酔', color: '#2563EB' },
      { id: 'orthodontics', name: '矯正歯科学', displayName: '矯正', color: '#4F46E5' },
      { id: 'pedodontics', name: '小児歯科学', displayName: '小児', color: '#7C3AED' },
    ]
  },
  {
    name: '社会歯科・その他',
    subjects: [
      { id: 'hygiene', name: '衛生学', displayName: '衛生', color: '#9333EA' },
      { id: 'geriatric', name: '高齢者歯科学', displayName: '高齢者', color: '#C026D3' },
    ]
  }
];

// 全科目をフラットに取得
export function getAllSubjects(): Subject[] {
  return subjectCategories.flatMap(cat => cat.subjects);
}

// IDから科目を取得
export function getSubjectById(id: string): Subject | undefined {
  return getAllSubjects().find(s => s.id === id);
}

// 科目名から科目を取得
export function getSubjectByName(name: string): Subject | undefined {
  return getAllSubjects().find(s => s.name === name);
}
