import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  total: number;
  limit: number;
  offset: number;
  onPageChange: (newOffset: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  total,
  limit,
  offset,
  onPageChange,
}) => {
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const startItem = total === 0 ? 0 : offset + 1;
  const endItem = Math.min(offset + limit, total);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        borderTop: '1px solid #1E293B',
        backgroundColor: '#111827',
        borderBottomLeftRadius: '10px',
        borderBottomRightRadius: '10px',
      }}
    >
      <div style={{ fontSize: '12.5px', color: '#94A3B8' }}>
        Showing <strong style={{ color: '#F8FAFC' }}>{startItem}</strong> to{' '}
        <strong style={{ color: '#F8FAFC' }}>{endItem}</strong> of{' '}
        <strong style={{ color: '#F8FAFC' }}>{total}</strong> records
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          className="btn btn-secondary"
          style={{ padding: '6px 10px', fontSize: '12px' }}
          disabled={currentPage <= 1}
          onClick={() => onPageChange(Math.max(0, offset - limit))}
        >
          <ChevronLeft size={14} />
          <span>Previous</span>
        </button>

        <span style={{ fontSize: '12.5px', color: '#CBD5E1', padding: '0 6px', fontWeight: 600 }}>
          Page {currentPage} of {totalPages}
        </span>

        <button
          className="btn btn-secondary"
          style={{ padding: '6px 10px', fontSize: '12px' }}
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(offset + limit)}
        >
          <span>Next</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};
