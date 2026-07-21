import React from 'react';

export const Skeleton: React.FC<{ className?: string, style?: React.CSSProperties }> = ({ className = '', style }) => {
  return (
    <div className={`animate-pulse bg-outline-variant/30 rounded ${className}`} style={style} />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-surface border border-outline-variant rounded-xl p-6 shadow-sm w-full">
      <div className="flex items-center gap-4 mb-4">
        <Skeleton className="w-10 h-10 rounded-full shrink-0" />
        <div className="flex flex-col gap-2 w-full">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <Skeleton className="h-3 w-full mb-2" />
      <Skeleton className="h-3 w-5/6" />
    </div>
  );
}

export function SkeletonListRow() {
  return (
    <div className="flex items-center gap-4 px-6 py-4 w-full">
      <Skeleton className="w-5 h-5 rounded-sm shrink-0" />
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-4 w-1/6 ml-auto" />
      <Skeleton className="h-8 w-20 rounded-lg shrink-0 ml-4" />
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="w-full h-full flex flex-col gap-4">
      <Skeleton className="h-4 w-1/4 mb-2" />
      <div className="flex-1 flex items-end gap-2 w-full h-full pt-4">
        {[...Array(7)].map((_, i) => (
          <Skeleton key={i} className={`w-full rounded-t-md`} style={{ height: `${Math.max(20, Math.random() * 100)}%` }} />
        ))}
      </div>
    </div>
  );
}
