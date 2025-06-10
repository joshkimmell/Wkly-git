import React from 'react';

type PaginationProps = {
  pages: string[]; // Array of formatted page values (e.g., "June 2025", "2025-06")
  currentPage: string; // Currently selected page (formatted)
  onPageChange: (page: string) => void; // Callback to handle page change
};

const Pagination: React.FC<PaginationProps> = ({ pages, currentPage, onPageChange }) => {
  const currentIndex = pages.indexOf(currentPage);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      onPageChange(pages[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (currentIndex < pages.length - 1) {
      onPageChange(pages[currentIndex + 1]);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={handlePrevious}
        disabled={currentIndex <= 0}
        className="btn-ghost disabled:opacity-50"
      >
        Previous
      </button>
      {pages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`px-3 py-1 rounded-md ${
            page === currentPage ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          {page}
        </button>
      ))}
      <button
        onClick={handleNext}
        disabled={currentIndex === pages.length - 1}
        className="btn-ghost disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
};

export default Pagination;