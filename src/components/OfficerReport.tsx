import { useState } from 'react';
import type { OfficerReportSection } from '../types';

interface OfficerReportProps {
  sections: OfficerReportSection[];
}

const categoryLabels: Record<string, string> = {
  Objection: 'objecting to',
  Support: 'supporting',
  Neutral: 'commenting on',
};

export default function OfficerReport({ sections }: OfficerReportProps) {
  const [copied, setCopied] = useState(false);

  const generateText = () => {
    return sections
      .filter((s) => s.count > 0)
      .map((section) => {
        const label = categoryLabels[section.category] || 'commenting on';
        const lines = section.grounds.map((g) => `  \u2022 ${g}`).join('\n');
        return `${section.count} letters of representation received ${label} the proposal on the following grounds:\n${lines}`;
      })
      .join('\n\n');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">For use in Officer's Reports</h3>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <p className="text-gray-500 text-sm mb-6 ml-11">Formatted text summary ready for official reports.</p>

      <div className="bg-gray-50 rounded-xl p-6 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
        {sections
          .filter((s) => s.count > 0)
          .map((section, i) => {
            const label = categoryLabels[section.category] || 'commenting on';
            return (
              <div key={i} className={i > 0 ? 'mt-4' : ''}>
                <p>
                  {section.count} letters of representation received {label} the proposal on the
                  following grounds:
                </p>
                <ul className="mt-1 ml-1">
                  {section.grounds.map((ground, j) => (
                    <li key={j}>&bull; {ground}</li>
                  ))}
                </ul>
              </div>
            );
          })}
      </div>
    </div>
  );
}
