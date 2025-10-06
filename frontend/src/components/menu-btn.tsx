import { MenuIcon } from 'lucide-react';
import React, { useState, useRef } from 'react';
import menuClosedIcon from '/images/button-menu.svg';
import menuOpenIcon from '/images/button-menu-open.svg';
import CSSTransition from 'react-transition-group/CSSTransition';

export interface MenuBtnProps {
    className: string;
    children?: React.ReactNode;
    onClick?: () => void;
    isOpen?: boolean;
    // menuIcon: () => JSX.Element; // Function to render the menu icon
}

const MenuBtn: React.FC<MenuBtnProps> = ({ onClick, children, className }) => {
  const [isOpen, setIsOpen] = useState(false); // Default state is closed
  const nodeRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => {
    setIsOpen((prev) => !prev); // Toggle menu state
    if (onClick) onClick();
  };

  const handleMenuClose = () => {
    setIsOpen(false); // Reset menu to default state
  };

  return (
    <div className='flex flex-col align-items-right'>
      <button onClick={handleToggle} className={`${className} transition-discrete`}>
        {isOpen ? (
          <img src={menuOpenIcon} alt="Menu Open" className="w-6 h-6" />
        ) : (
          <img src={menuClosedIcon} alt="Menu Closed" className="w-6 h-6" />
        )}
      </button>
      <CSSTransition
        in={isOpen}
        timeout={160}
        classNames="menu"
        mountOnEnter
        unmountOnExit
        nodeRef={nodeRef}
      >
        <div ref={nodeRef} className="children-container transition-discrete align-items-left absolute right-0 -bottom-40 z-50 bg-white dark:bg-gray-100 shadow-lg rounded-lg p-4">
          {React.Children.map(children, (child) =>
            React.cloneElement(child as React.ReactElement<any>, {
              onClick: handleMenuClose, // Close menu when a link is clicked
            })
          )}
        </div>
      </CSSTransition>
    </div>
  );
};

export default MenuBtn;
