import React, { useState, useMemo } from 'react';
import { Transaction } from './RecentTxTable';

interface ProblemTxTableProps {
  txs: Transaction[];
  pageSize?: number;
}

export const ProblemTxTable: React.FC<ProblemTxTableProps> = ({ 
  txs, 
  pageSize = 10 
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(txs.length / pageSize) || 1;

  const paginatedTxs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return txs.slice(start, start + pageSize);
  }, [txs, currentPage, pageSize]);

  return (
    <div className="w-full bg-white dark:bg-zinc-900 rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">All Transactions</h3>
        <span className="text-sm text-zinc-500">
          Showing {paginatedTxs.length ? (currentPage - 1) * pageSize + 1 : 0} - {Math.min(currentPage * pageSize, txs.length)} of {txs.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 uppercase">
              <th className="py-2 px-3">Tx Hash</th>
              <th className="py-2 px-3">Type</th>
              <th className="py-2 px-3">Amount</th>
              <th className="py-2 px-3">Status</th>
              <th className="py-2 px-3">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTxs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-sm text-zinc-400">
                  No transactions available.
                </td>
              </tr>
            ) : (
              paginatedTxs.map((tx) => (
                <tr key={tx.id} className="border-b border-zinc-100 dark:border-zinc-800/50 text-sm">
                  <td className="py-3 px-3 font-mono text-xs text-zinc-500">{tx.hash.slice(0, 10)}...</td>
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

      {/* Pagination Controls */}
      <div className="flex justify-between items-center mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 text-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded disabled:opacity-50 hover:bg-zinc-200 transition-colors"
        >
          Previous
        </button>
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="px-3 py-1 text-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded disabled:opacity-50 hover:bg-zinc-200 transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
};
