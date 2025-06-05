import React,{ useState } from 'react';
import menuIcon from '/images/button-menu.svg';
import menuOpenIcon from '/images/button-menu-open.svg';
import CSSTransition from 'react-transition-group/CSSTransition';
// import { is } from 'date-fns/locale';
// import { Calendar, Award, LogOut, Home, Text } from 'lucide-react';
// import { Link } from 'react-router-dom';
// import supabase from '../../frontend/src/lib/supabase';

// import { handleLogout } from '@utils/functions'; // Adjust the import path as necessary

interface MenuBtnProps {
    className: string; // Add class prop for styling
    children?: React.ReactNode; // Optional children prop
    onClick: () => void;
}
// const Component = ({ children }: Props) => <div>{children}</div>

const MenuBtn: React.FC<MenuBtnProps> = ({ onClick, children, className }) => {
  const [isOpen, setIsOpen] = useState(false);


  return (
    <div>
        <button onClick={onClick} className={`${className} transition-all transition-discrete`}>
        <img src={isOpen ? menuOpenIcon : menuIcon} alt="Menu" className="w-6 h-6" />
        <CSSTransition
            in={!isOpen}
            onEnter={() => setIsOpen(true)}
            onExit={() => setIsOpen(false)}
            // transition="fade"
            mountOnEnter
            unmountOnExit
            timeout={160}
            classNames="menu"
            >
          <div className="children-container transition-all transition-discrete">
            {children}
          </div>
        </CSSTransition>
          </button>
    </div>
  );
};

export default MenuBtn;
