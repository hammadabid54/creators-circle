import { Check } from 'lucide-react';
import { trustItems } from '@/lib/mock-data';

export function TrustStrip() {
  return (
    <div className="bg-anjuman-ink text-white">
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-7 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-medium">
        {trustItems.map((item) => (
          <div key={item} className="inline-flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-anjuman-yellow text-anjuman-ink flex items-center justify-center text-xs font-bold flex-shrink-0">
              <Check className="w-3 h-3" strokeWidth={3.5} />
            </span>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
