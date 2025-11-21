export const cardClasses = `shadow-sm rounded-lg p-4 flex flex-col h-full w-full`;
export const summaryClasses = `bg-transparent w-full p-4 sm:max-h-[100vh]`;
export const modalClasses = `bg-gray-10 dark:bg-gray-90 shadow-lg rounded-lg shadow-lg p-6 w-full md:w-2/3 lg:w-3/4 max-h-[80vh] overflow-y-auto`;
// Use Tailwind's color/opacity slash syntax for reliable overlay opacity
// Give the overlay a high z-index so it isn't covered by MUI AppBar or other fixed elements
// Use a dedicated CSS class for overlay visuals (wkly-overlay) and keep layout classes here
export const overlayClasses = `fixed inset-0 wkly-overlay`;
export const classTabItem = `
    tabs-container--list--item 
    inline-flex 
    items-center 
    justify-center 
    p-4 
    text-gray-80
    dark:text-gray-20
    hover:text-gray-90 
    dark:hover:text-gray-10
    active:text-brand-60 
    dark:active:text-brand-50 
    active:border-0
    group
  `;

export const classMenuItem = `
    menu-container--list--item 
    text-brand-80 
    dark:text-brand-10 
    hover:text-brand-90 
    dark:hover:text-brand-20 
    hover:bg-gray-20 
    dark:hover:bg-gray-80 
    flex 
    items-center 
    px-3 
    py-2 
    text-sm 
    font-medium
  `;

  export const objectCounter = `
    absolute 
    -top-1 
    -right-1 
    min-w-4 
    items-centered 
    text-sm 
    font-bold 
    text-gray-10 
    dark:text-gray-100 
    border-brand-30 
    dark:border-brand-90 
    bg-brand-80 
    dark:bg-brand-0 
    rounded-xl 
    px-2
  `;