// components/Price.jsx
'use client';

import { fromYER, formatNumber } from '@/lib/rates';

export default function Price({ priceYER }) {
  const yer = Number(priceYER || 0);
  const sar = fromYER(yer, 'SAR');
  const usd = fromYER(yer, 'USD');

  return (
    <div>
      <div style={{ fontWeight:800, fontSize:18 }}>{formatNumber(yer)} <span className="muted">ريال يمني</span></div>
      <div className="muted" style={{ fontSize:13 }}>
        {formatNumber(sar)} SAR · {formatNumber(usd)} USD
      </div>
    </div>
  );
}
