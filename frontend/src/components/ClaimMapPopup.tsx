import React from 'react';
import { Claim } from '../types';
import { SeverityBadge } from './SeverityBadge';
import { StatusBadge } from './StatusBadge';

export function ClaimMapPopup({ claim }: { claim: Claim }) {
  return (
    <div className="p-1 min-w-[200px]">
      <div className="font-semibold text-sm mb-1">{claim.claim_id}</div>
      <div className="text-xs text-slate-600 mb-2">{claim.claimant_name}</div>
      <div className="flex gap-2 mb-2">
        <StatusBadge status={claim.status} />
        <SeverityBadge severity={claim.severity} />
      </div>
      <div className="text-xs text-slate-500">
        {claim.district}, {claim.state}
      </div>
    </div>
  );
}
