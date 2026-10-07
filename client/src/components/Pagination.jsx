import React from 'react';

export const Pagination = ({ pagination, onPageChange }) => {
  if (!pagination || pagination.totalPages <= 1) return null;

  const { page, totalPages, total } = pagination;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 18,
        padding: '8px 4px',
        fontSize: '0.85rem',
        color: 'var(--slate-500)',
      }}
    >
      <div>
        Showing page <strong style={{ color: 'var(--slate-800)' }}>{page}</strong> of{' '}
        <strong style={{ color: 'var(--slate-800)' }}>{totalPages}</strong> ({total} total items)
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          className="btn btn-outline btn-sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <button
          className="btn btn-outline btn-sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
};
