import { useState, useEffect } from 'react';

export type DateRange = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'custom';

interface DateRangeFilterProps {
  onRangeChange: (start?: string, end?: string) => void;
}

export function DateRangeFilter({ onRangeChange }: DateRangeFilterProps) {
  const [range, setRange] = useState<DateRange>('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  useEffect(() => {
    applyRange(range);
  }, [range]);

  const applyRange = (selectedRange: DateRange) => {
    const now = new Date();
    let start: Date | undefined;
    let end: Date | undefined;

    // Reset times for consistent start of day logic
    const startOfDay = (d: Date) => {
      const copy = new Date(d);
      copy.setHours(0, 0, 0, 0);
      return copy;
    };

    switch (selectedRange) {
      case 'today':
        start = startOfDay(now);
        end = new Date(start);
        end.setDate(end.getDate() + 1);
        break;
      case 'yesterday':
        start = startOfDay(now);
        start.setDate(start.getDate() - 1);
        end = startOfDay(now);
        break;
      case 'last7days':
        start = startOfDay(now);
        start.setDate(start.getDate() - 7);
        end = new Date(startOfDay(now));
        end.setDate(end.getDate() + 1);
        break;
      case 'last30days':
        start = startOfDay(now);
        start.setDate(start.getDate() - 30);
        end = new Date(startOfDay(now));
        end.setDate(end.getDate() + 1);
        break;
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      case 'custom':
        if (customStart && customEnd) {
          start = new Date(customStart);
          end = new Date(customEnd);
          end.setDate(end.getDate() + 1); // Exclusive end date
        }
        break;
    }

    if (start && end) {
      onRangeChange(start.toISOString(), end.toISOString());
    } else {
      onRangeChange(undefined, undefined);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <select 
        value={range} 
        onChange={(e) => setRange(e.target.value as DateRange)}
        className="border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
      >
        <option value="today">Today</option>
        <option value="yesterday">Yesterday</option>
        <option value="last7days">Last 7 Days</option>
        <option value="last30days">Last 30 Days</option>
        <option value="thisMonth">This Month</option>
        <option value="custom">Custom Range</option>
      </select>
      
      {range === 'custom' && (
        <div className="flex space-x-2">
          <input 
            type="date" 
            value={customStart} 
            onChange={(e) => {
              setCustomStart(e.target.value);
              if (customEnd) applyRange('custom');
            }}
            className="border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm"
          />
          <span className="self-center text-gray-500">to</span>
          <input 
            type="date" 
            value={customEnd} 
            onChange={(e) => {
              setCustomEnd(e.target.value);
              if (customStart) applyRange('custom');
            }}
            className="border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm"
          />
        </div>
      )}
    </div>
  );
}
