import type { CommentStats } from '../types';

interface ApplicationInfoProps {
  reference: string;
  address: string;
  stats: CommentStats;
}

export default function ApplicationInfo({ reference, address, stats }: ApplicationInfoProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">{reference.toUpperCase()}</h2>
      <div className="flex items-center gap-2 text-gray-500 text-sm mb-6">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        {address}
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard icon="chat" label="Total" value={stats.total} color="gray" />
        <StatCard icon="x" label="Objections" value={stats.objections} color="red" />
        <StatCard icon="thumb-up" label="Support" value={stats.support} color="green" />
        <StatCard icon="minus" label="Neutral" value={stats.neutral} color="gray" />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  const colorMap: Record<string, { bg: string; text: string; iconColor: string }> = {
    red: { bg: 'bg-red-50', text: 'text-red-600', iconColor: 'text-red-500' },
    green: { bg: 'bg-green-50', text: 'text-green-600', iconColor: 'text-green-500' },
    gray: { bg: 'bg-gray-50', text: 'text-gray-700', iconColor: 'text-gray-400' },
  };

  const colors = colorMap[color] || colorMap.gray;

  const icons: Record<string, React.ReactNode> = {
    chat: (
      <svg className={`w-5 h-5 ${colors.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    x: (
      <svg className={`w-5 h-5 ${colors.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    'thumb-up': (
      <svg className={`w-5 h-5 ${colors.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
      </svg>
    ),
    minus: (
      <svg className={`w-5 h-5 ${colors.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
      </svg>
    ),
  };

  return (
    <div className={`${colors.bg} rounded-xl p-4 text-center`}>
      <div className="flex items-center justify-center gap-1.5 mb-1">
        {icons[icon]}
        <span className={`text-xs font-medium ${colors.text}`}>{label}</span>
      </div>
      <div className={`text-3xl font-bold ${colors.text}`}>{value}</div>
    </div>
  );
}
