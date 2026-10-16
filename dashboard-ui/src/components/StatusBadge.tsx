type Status = 'complete' | 'partial' | 'no-update' | 'on-leave' | 'pending' | 'overdue' | 'in-progress' | 'sent' | 'delivered' | 'active' | 'inactive' | 'received' | 'missing';

const config: Record<Status, { label: string; cls: string }> = {
  complete:    { label: 'Complete',    cls: 'bg-green-100 text-green-700 border-green-200' },
  partial:     { label: 'Partial',     cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  'no-update': { label: 'No Update',   cls: 'bg-red-100 text-red-600 border-red-200' },
  'on-leave':  { label: 'On Leave',    cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  pending:     { label: 'Pending',     cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  overdue:     { label: 'Overdue',     cls: 'bg-red-100 text-red-600 border-red-200' },
  'in-progress': { label: 'In Progress', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  sent:        { label: 'Sent',        cls: 'bg-blue-100 text-blue-600 border-blue-200' },
  delivered:   { label: 'Delivered',   cls: 'bg-green-100 text-green-600 border-green-200' },
  active:      { label: 'Active',      cls: 'bg-green-100 text-green-700 border-green-200' },
  inactive:    { label: 'Inactive',    cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  received:    { label: 'Received',    cls: 'bg-green-100 text-green-700 border-green-200' },
  missing:     { label: 'Missing',     cls: 'bg-red-100 text-red-600 border-red-200' },
};

export default function StatusBadge({ status }: { status: Status }) {
  const { label, cls } = config[status] ?? config['pending'];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {label}
    </span>
  );
}
