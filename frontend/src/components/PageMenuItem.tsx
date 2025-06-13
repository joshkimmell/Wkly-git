import React from 'react';
import { MenuItem } from '@headlessui/react';

type CustomMenuItemProps = {
  value: string; // The value associated with the menu item
  onClick: (value: string) => void; // Callback when the menu item is clicked
  className?: string; // Additional class names for styling
  children: React.ReactNode; // Content of the menu item
};

const CustomMenuItem: React.FC<CustomMenuItemProps> = ({ value, onClick, className, children }) => {
  return (
    <MenuItem
      as="li"
      // type="button"
      onClick={() => onClick(value)}
      className={({ active }: { active: boolean }) =>
        `btn-ghost ${
          active ? 'bg-gray-100 text-gray-10' : 'text-gray-70'
        } ${className}`
      }
    >
      {children}
    </MenuItem>
  );
};

export default CustomMenuItem;