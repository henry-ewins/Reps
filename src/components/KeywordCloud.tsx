import type { KeywordEntry } from '../types';

interface KeywordCloudProps {
  keywords: KeywordEntry[];
}

const COLORS = [
  'text-indigo-600',
  'text-red-500',
  'text-green-600',
  'text-blue-600',
  'text-purple-600',
  'text-orange-500',
  'text-teal-600',
  'text-pink-500',
  'text-cyan-600',
  'text-amber-600',
];

export default function KeywordCloud({ keywords }: KeywordCloudProps) {
  if (!keywords.length) return null;

  const maxCount = Math.max(...keywords.map((k) => k.count));
  const minCount = Math.min(...keywords.map((k) => k.count));
  const range = maxCount - minCount || 1;

  // Shuffle keywords for visual variety
  const shuffled = [...keywords].sort(() => Math.random() - 0.5);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Keyword Cloud</h3>
      </div>
      <p className="text-gray-500 text-sm mb-6 ml-11">Most frequently used words in representation letters.</p>

      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 py-4">
        {shuffled.map((keyword, index) => {
          const normalized = (keyword.count - minCount) / range;
          const fontSize = 0.85 + normalized * 1.5; // 0.85rem to 2.35rem
          const color = COLORS[index % COLORS.length];

          return (
            <span
              key={keyword.word}
              className={`font-semibold ${color} transition-transform hover:scale-110 cursor-default`}
              style={{ fontSize: `${fontSize}rem` }}
              title={`Used ${keyword.count} times`}
            >
              {keyword.word}
            </span>
          );
        })}
      </div>
    </div>
  );
}
