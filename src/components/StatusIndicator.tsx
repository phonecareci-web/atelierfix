import React from 'react';
import {
  CheckCircle2,
  Clock,
  Inbox,
  PackageCheck,
  Search,
  Wrench,
  XCircle,
} from 'lucide-react';
import { RepairStatus } from '../types/repair';
import { STATUS_META } from '../lib/statusConfig';

interface StatusIndicatorProps {
  status: RepairStatus;
  compact?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  compact = false,
}) => {
  const meta = STATUS_META[status] || STATUS_META['Reçu'];

  const renderIcon = () => {
    const cls = 'h-3.5 w-3.5 shrink-0';
    switch (status) {
      case 'Reçu':
        return <Inbox className={cls} />;
      case 'En diagnostic':
        return <Search className={cls} />;
      case 'En attente pièce':
        return <Clock className={cls} />;
      case 'En réparation':
        return <Wrench className={cls} />;
      case 'Prêt':
        return <CheckCircle2 className={cls} />;
      case 'Livré':
        return <PackageCheck className={cls} />;
      case 'Annulé':
        return <XCircle className={cls} />;
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium ${meta.bgClass} ${meta.textClass} ${meta.borderClass} ${
        compact ? 'text-[11px]' : 'text-xs'
      }`}
    >
      {renderIcon()}
      <span>{meta.label}</span>
    </span>
  );
};
