import type { SourceEntry } from '../types';

interface SourcesListProps {
  sources: SourceEntry[];
}

export default function SourcesList({ sources }: SourcesListProps) {
  if (!sources.length) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Sources Consulted</h3>
      </div>

      <ul className="mt-4 space-y-2 ml-11">
        {sources.map((source, index) => (
          <li key={index} className="flex items-center gap-3">
            <span className="text-sm text-gray-400 w-5">{index + 1}</span>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              {source.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
