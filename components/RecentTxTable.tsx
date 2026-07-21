import React from 'react';

export interface Transaction {
  id: string;
  hash: string;
  type: string;
  amount: string;
  timestamp: string;
  status: 'success' | 'pending' | 'failed';
}

interface RecentTxTableProps {
  txs: Transaction[];
  onViewAll?: () => void;
  maxRecent?: number;
}

export const RecentTxTable: React.FC<RecentTxTableProps> = ({ 
  txs, 
  onViewAll,
  maxRecent = 5 
}) => {
  const displayedTxs = txs.slice(0, maxRecent);

  return (
    <div className="w-full bg-white dark:bg-zinc-900 rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">Recent Transactions</h3>
        {txs.length > maxRecent && (
          <button 
            onClick={onViewAll}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            View All ({txs.length})
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 uppercase">
              <th className="py-2 px-3">Type</th>
              <th className="py-2 px-3">Amount</th>
              <th className="py-2 px-3">Status</th>
              <th className="py-2 px-3">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {displayedTxs.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-4 text-center text-sm text-zinc-400">
                  No recent transactions found.
                </td>
              </tr>
            ) : (
              displayedTxs.map((tx) => (
                <tr key={tx.id} className="border-b border-zinc-100 dark:border-zinc-800/50 text-sm">
                  <td className="py-3 px-3 font-medium text-zinc-700 dark:text-zinc-200">{tx.type}</td>
                  <td className="py-3 px-3 text-zinc-600 dark:text-zinc-300">{tx.amount}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-1 text-xs rounded-full font-semibold ${
                      tx.status === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      tx.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-zinc-400 text-xs">{tx.timestamp}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
