import React from 'react';
import { Menu, MenuButton, MenuItems } from '@headlessui/react';
import PageMenuItem from '@components/PageMenuItem';
import { ArrowLeft, ArrowRight, ChevronDownIcon, CalendarCheck } from 'lucide-react'; 
import { getWeekStartDate } from '@utils/functions';

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

    const isSmallScreen = window.innerWidth <= 420; // Check if the screen is small

    switch (scope) {
      case 'week':
        return isSmallScreen
          ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) // e.g., "Oct 5 25"
          : date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); // e.g., "October 6, 2025"
      case 'month':
        return isSmallScreen
          ? date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) // e.g., "Oct 25"
          : date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); // e.g., "October 2025"
      case 'year':
        return year.toString(); // e.g., "2025"
      default:
        return page;
    }
  };
  // Find the current page based on today's date.
  // For weekly scope, compute the week_start for today and use that value.
  const today = new Date();
  let currentPageFromToday: string | undefined;
  if (scope === 'week') {
    const desiredWeek = getWeekStartDate(today);
    // Prefer an existing page value instead of navigating to an empty week_start.
    // 1) exact match
    if (pages.includes(desiredWeek)) {
      currentPageFromToday = desiredWeek;
    } else {
      // 2) a page in the same month
      const monthPrefix = desiredWeek.slice(0, 7);
      const sameMonth = pages.find((p) => p.startsWith(monthPrefix));
      if (sameMonth) {
        currentPageFromToday = sameMonth;
      } else {
        // 3) the latest page <= today
        for (let i = pages.length - 1; i >= 0; i--) {
          const page = pages[i];
          const [year, month, day] = page.split('-').map(Number);
          const pageDate = new Date(year, (month || 1) - 1, day || 1);
          if (pageDate <= today) {
            currentPageFromToday = page;
            break;
          }
        }
        // 4) fallback to first available page if nothing matched
        if (!currentPageFromToday && pages.length > 0) currentPageFromToday = pages[0];
      }
    }
  } else {
    // For month/year, choose the latest page date that is <= today
    for (let i = pages.length - 1; i >= 0; i--) {
      const page = pages[i];
      const [year, month, day] = page.split('-').map(Number);
      const pageDate = new Date(year, (month || 1) - 1, day || 1);
      if (pageDate <= today) {
        currentPageFromToday = page;
        break;
      }
    }
  }

  return (
    <div className="flex items-center space-x-2">
      
      <button
        onClick={() => onPageChange(currentPageFromToday ?? currentPage)}
        disabled={currentPageFromToday === currentPage}
        title={`Current ${scope}`}
        aria-label={`Current ${scope}`}
        className="btn-ghost"
      >
        {/* Current {scope} */}
        <CalendarCheck className="w-5 h-5" />
        <span className="sr-only">Current {scope}</span>
      </button>
      
      <button
        onClick={handlePrevious}
        disabled={currentIndex <= 0}
        className="btn-ghost disabled:opacity-50"
        title={`Next ${scope}`}
        aria-label={`Next ${scope}`}
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="sr-only">Next {scope}</span>
      </button>
      
      <Menu as="div" className="relative inline-block items-center w-full sm:w-56 text-center">
      <div>
        <MenuButton
          className={`btn-ghost text-md sm:text-lg text-brand-60 hover:text-brand-80 dark:text-brand-20 dark:hover:text-brand-10 dark:hover:bg-gray-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-50 flex items-center justify-center w-full ${pages.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={pages.length === 0} // Disable the button if no pages are available
        >
          {pages.length > 0 ? formatPage(currentPage) : '––'}
          <ChevronDownIcon aria-hidden="true" className="mr-2 size-5" />
        </MenuButton>
      </div>

      <MenuItems
        transition
        className="z-10 mt-2 w-56 absolute origin-top-right divide-y divide-gray-100 dark:divide-gray-70 shadow-lg ring-1 ring-black/5 transition focus:outline-hidden data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
      >
        <div className="py-1">
            {pages.map((page) => (
                <PageMenuItem
                    key={page}
                    value={page}
                    onClick={() => onPageChange(page)}
                    className={`${
                        page === currentPage
                            ? 'bg-brand-80 hover:bg-brand-80 text-brand-10 hover:text-brand-20 dark:bg-brand-70 dark:text-brand-10 dark:hover:bg-brand-80 dark:hover:text-brand-0'
                            :  'text-gray-70 hover:text-gray-80 bg-gray-10 hover:bg-gray-20 dark:text-gray-30 dark:hover:text-gray-10 dark:bg-gray-80 dark:hover:bg-gray-70'
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
        title={`Previous ${scope}`}
        aria-label={`Previous ${scope}`}
      >
        <ArrowRight className="w-5 h-5" />
        <span className="sr-only">Previous {scope}</span>
      </button>
      
    </div>
  );
};

export default Pagination;