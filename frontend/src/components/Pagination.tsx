import React from 'react';
import { Menu, MenuButton, MenuItems } from '@headlessui/react';
import PageMenuItem from '@components/PageMenuItem';
import { ChevronDownIcon } from 'lucide-react'; 

type PaginationProps = {
  pages: string[]; // Array of raw page values (e.g., "2025-06-06", "2025-06", "2025")
  currentPage: string; // Currently selected page (raw value)
  onPageChange: (page: string) => void; // Callback to handle page change
  scope: 'week' | 'month' | 'year'; // Current scope
};

const Pagination: React.FC<PaginationProps> = ({ pages, currentPage, onPageChange, scope }) => {
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

  // Format page based on scope
  const formatPage = (page: string): string => {
    const [year, month, day] = page.split('-').map(Number); // Split and parse the date parts
    const date = new Date(year, (month || 1) - 1, day || 1); // Default month to 1 and day to 1 (month is 0-indexed)

    switch (scope) {
      case 'week':
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); // e.g., "June 6, 2025"
      case 'month':
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); // e.g., "June 2025"
      case 'year':
        return year.toString(); // e.g., "2025"
      default:
        return page;
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
      {/* {pages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`btn-primary ${
            page === currentPage ? 'bg-brand-50 text-gray-10 hover:bg-brand-80 hover:text-brand-10' : 'hidden'
          }`}
        >
          {formatPage(page)}
        </button>
      ))} */}
      {/* Dropdown Menu for Pages */}
      {/* <select
        value={currentPage}
        onChange={(e) => onPageChange(e.target.value)}
        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
      >
        {pages.map((page) => (
          <option key={page} value={page}>
            {formatPage(page)}
          </option>
        ))}
      </select> */}
      <Menu as="div" className="relative inline-block text-left">
      <div>
        <MenuButton className="btn-ghost">
          {formatPage(currentPage)}
          <ChevronDownIcon aria-hidden="true" className="-mr-1 size-5 text-gray-400" />
        </MenuButton>
      </div>

      <MenuItems
        transition
        className="z-10 mt-2 w-56 absolute origin-top-right rounded-sm bg-gray-10 dark:bg-gray-80 divide-y divide-gray-100 dark:divide-gray-70 shadow-lg ring-1 ring-black/5 transition focus:outline-hidden data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
      >
        <div className="py-1">
            {pages.map((page) => (
                <PageMenuItem
                    key={page}
                    value={page}
                    onClick={() => onPageChange(page)}
                    className={`${
                        page === currentPage
                            ? 'bg-brand-60 text-brand-10 hover:bg-brand-80 hover:text-brand-0 dark:bg-brand-70 dark:text-brand-10 dark:hover:bg-brand-80 dark:hover:text-brand-0'
                            : 'text-gray-70 hover:text-gray-80 bg-gray-10 hover:bg-gray-20 dark:text-gray-30 dark:hover:text-gray-10 dark:bg-gray-80 dark:hover:bg-gray-70'
                        } block px-4 py-2 text-sm`}
                >
                    {formatPage(page)}
                </PageMenuItem>
            ))}
        </div>
      </MenuItems>
    </Menu>
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