export default function GdprNotice() {
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-blue-900">GDPR Compliance</h4>
          <p className="text-sm text-blue-700 mt-1">
            This assistant automatically filters out personal data (names, addresses, contact information) from
            the generated summaries to ensure compliance with data protection regulations.
          </p>
        </div>
      </div>
    </div>
  );
}
