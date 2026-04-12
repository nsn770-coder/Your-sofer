'use client';
import type { OrderStatus } from '@/app/ops/types';
import { STATUS_LABELS } from '@/app/ops/types';

const STATUS_STYLES: Record<OrderStatus, string> = {
  new_order: 'bg-blue-100 text-blue-800 border-blue-200',
  awaiting_review: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  assigned: 'bg-purple-100 text-purple-800 border-purple-200',
  in_fulfillment: 'bg-orange-100 text-orange-800 border-orange-200',
  waiting_supplier: 'bg-amber-100 text-amber-800 border-amber-200',
  stam_processing: 'bg-amber-100 text-amber-900 border-amber-300',
  stam_sent_checking: 'bg-yellow-100 text-yellow-900 border-yellow-300',
  stam_approved: 'bg-teal-100 text-teal-800 border-teal-200',
  fulfillment_ready: 'bg-teal-100 text-teal-900 border-teal-300',
  ready_for_shipment: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  shipped: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  delivered: 'bg-green-100 text-green-800 border-green-200',
  completed: 'bg-green-200 text-green-900 border-green-400',
  delayed: 'bg-red-100 text-red-800 border-red-200',
  blocked: 'bg-red-200 text-red-900 border-red-400',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
};

interface Props {
  status: OrderStatus;
  small?: boolean;
}

export default function StatusBadge({ status, small }: Props) {
  const style = STATUS_STYLES[status] || 'bg-gray-100 text-gray-600 border-gray-200';
  const label = STATUS_LABELS[status] || status;

  return (
    <span
      className={`inline-flex items-center border rounded-full font-medium whitespace-nowrap ${style} ${
        small ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
    >
      {label}
    </span>
  );
}
