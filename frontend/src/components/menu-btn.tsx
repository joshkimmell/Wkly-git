import React, { useState, useRef } from 'react';
import menuIcon from '/images/button-menu.svg';
import menuOpenIcon from '/images/button-menu-open.svg';
import CSSTransition from 'react-transition-group/CSSTransition';

interface MenuBtnProps {
    className: string;
    children?: React.ReactNode;
    onClick?: () => void;
}

const MenuBtn: React.FC<MenuBtnProps> = ({ onClick, children, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
    if (onClick) onClick();
  };

  return (
    <div>
      <button onClick={handleToggle} className={`${className} transition-discrete`}>
        <img src={isOpen ? menuOpenIcon : menuIcon} alt="Menu" className="w-6 h-6" />
      </button>
      <CSSTransition
        in={isOpen}
        timeout={160}
        classNames="menu"
        mountOnEnter
        unmountOnExit
        nodeRef={nodeRef}
      >
        <div ref={nodeRef} className="children-container transition-discrete">
          {children}
        </div>
      </CSSTransition>
    </div>
  );
};

export default MenuBtn;
