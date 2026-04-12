'use client';
import type { AuditEntry } from '@/app/ops/types';

interface Props {
  entries: AuditEntry[];
}

function formatTimestamp(ts: any): string {
  if (!ts) return '—';
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function actionIcon(action: string): string {
  if (action.includes('סטטוס')) return '🔄';
  if (action.includes('הוקצה') || action.includes('שיוך')) return '👤';
  if (action.includes('הערה')) return '💬';
  if (action.includes('עדיפות')) return '⭐';
  if (action.includes('מעקב') || action.includes('tracking')) return '📦';
  if (action.includes('נוצר') || action.includes('נוצרה')) return '✨';
  if (action.includes('תקשורת')) return '📞';
  if (action.includes('דגל') || action.includes('עיכוב') || action.includes('חסימה')) return '🚩';
  return '📝';
}

export default function AuditTimeline({ entries }: Props) {
  if (!entries.length) {
    return (
      <div className="text-center text-gray-400 py-8 text-sm">אין פעילות עדיין</div>
    );
  }

  return (
    <div className="relative" dir="rtl">
      {/* Vertical line */}
      <div className="absolute right-5 top-0 bottom-0 w-0.5 bg-gray-200" />

      <div className="space-y-4">
        {entries.map((entry) => (
          <div key={entry.id} className="flex gap-4 relative">
            {/* Icon bubble */}
            <div className="relative z-10 flex-shrink-0 w-10 h-10 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center text-base">
              {actionIcon(entry.action)}
            </div>

            {/* Content */}
            <div className="flex-1 bg-gray-50 rounded-lg p-3 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-semibold text-gray-800 text-sm">{entry.action}</span>
                  {entry.oldValue !== undefined && entry.newValue !== undefined && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      {typeof entry.oldValue === 'string' && typeof entry.newValue === 'string' ? (
                        <span>
                          <span className="line-through text-red-400">{entry.oldValue}</span>
                          {' → '}
                          <span className="text-green-600">{entry.newValue}</span>
                        </span>
                      ) : null}
                    </div>
                  )}
                  {entry.newValue && typeof entry.newValue === 'string' && entry.oldValue === undefined && (
                    <div className="text-xs text-green-600 mt-0.5">{entry.newValue}</div>
                  )}
                </div>
                <div className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                  {formatTimestamp(entry.timestamp)}
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-1">{entry.userName}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
