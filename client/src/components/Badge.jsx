import React from 'react';

export const Badge = ({ status, children }) => {
  const text = children || status || 'Pending';
  const lower = String(text).toLowerCase();

  let variantClass = 'badge-neutral';

  if (['open', 'selected', 'hire', 'completed', 'available'].includes(lower)) {
    variantClass = 'badge-success';
  } else if (['shortlisted', 'scheduled', 'moderate'].includes(lower)) {
    variantClass = 'badge-primary';
  } else if (['hold', 'pending', 'rescheduled'].includes(lower)) {
    variantClass = 'badge-warning';
  } else if (['rejected', 'cancelled', 'closed', 'busy'].includes(lower)) {
    variantClass = 'badge-danger';
  } else if (['applied', 'draft', 'technical', 'hr'].includes(lower)) {
    variantClass = 'badge-info';
  } else if (['recruiter', 'interviewer', 'candidate'].includes(lower)) {
    variantClass = 'badge-purple';
  }

  return <span className={`badge ${variantClass}`}>{text}</span>;
};
