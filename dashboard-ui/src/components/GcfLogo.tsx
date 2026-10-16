interface GcfLogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'icon';
}

export default function GcfLogo({ size = 'md', variant = 'full' }: GcfLogoProps) {
  const iconSizes = { sm: 32, md: 44, lg: 64 };
  const s = iconSizes[size];

  const icon = (
    <svg width={s} height={s} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Sky background */}
      <rect width="64" height="64" rx="10" fill="#e8f5e9"/>
      {/* Sun rays */}
      <circle cx="32" cy="20" r="8" fill="#f59e0b" opacity="0.9"/>
      <line x1="32" y1="6" x2="32" y2="10" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="46" y1="10" x2="43" y2="13" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="50" y1="20" x2="46" y2="20" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="18" y1="10" x2="21" y2="13" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="14" y1="20" x2="18" y2="20" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Mountains */}
      <polygon points="4,52 20,28 36,52" fill="#15803d"/>
      <polygon points="16,52 34,30 52,52" fill="#16a34a"/>
      <polygon points="30,52 46,34 62,52" fill="#22c55e" opacity="0.8"/>
      {/* Water / wave */}
      <path d="M0 52 Q16 46 32 52 Q48 58 64 52 L64 64 L0 64 Z" fill="#2563eb" opacity="0.85"/>
      <path d="M0 56 Q16 51 32 56 Q48 61 64 56" stroke="#3b82f6" strokeWidth="1.5" fill="none" opacity="0.6"/>
    </svg>
  );

  if (variant === 'icon') return icon;

  const textSizes = {
    sm: { title: 'text-sm font-bold', sub: 'text-[9px]' },
    md: { title: 'text-base font-bold', sub: 'text-[10px]' },
    lg: { title: 'text-xl font-bold', sub: 'text-xs' },
  };

  return (
    <div className="flex items-center gap-2.5">
      {icon}
      <div>
        <div className={`${textSizes[size].title} text-white leading-tight`}>GCF Knuckles</div>
        <div className={`${textSizes[size].sub} text-green-300 leading-tight tracking-wide uppercase`}>Project</div>
      </div>
    </div>
  );
}
