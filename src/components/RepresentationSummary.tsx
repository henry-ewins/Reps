import type { CategorySummary } from '../types';

interface RepresentationSummaryProps {
  summaries: CategorySummary[];
}

const categoryStyles: Record<string, { badge: string; text: string }> = {
  Objection: { badge: 'bg-red-100 text-red-700', text: 'text-gray-700' },
  Support: { badge: 'bg-green-100 text-green-700', text: 'text-gray-700' },
  Neutral: { badge: 'bg-gray-100 text-gray-700', text: 'text-gray-700' },
};

export default function RepresentationSummary({ summaries }: RepresentationSummaryProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Representation Summary</h3>
      <p className="text-gray-500 text-sm mb-6">Material planning considerations extracted from public comments.</p>

      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 w-32">Category</th>
            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3">Summary of Comments</th>
          </tr>
        </thead>
        <tbody>
          {summaries.map((item, index) => {
            const style = categoryStyles[item.category] || categoryStyles.Neutral;
            return (
              <tr key={index} className="border-b border-gray-50 last:border-0">
                <td className="py-4 pr-4 align-top">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${style.badge}`}>
                    {item.category}
                  </span>
                </td>
                <td className={`py-4 text-sm leading-relaxed ${style.text}`}>
                  {item.summary}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
