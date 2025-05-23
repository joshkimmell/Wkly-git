import { useState } from 'react';
import menuIcon from '../images/button-menu.svg';
import menuOpenIcon from '../images/button-menu-open.svg';
import { CSSTransition } from 'react-transition-group';


interface MenuBtnProps {
  onClick: () => void;
}

const MenuBtn: React.FC<MenuBtnProps> = ({ onClick }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = () => {
    // Toggle the menu open/close state
    setIsOpen(!isOpen);
    
    // Call the onClick prop to trigger the menu toggle
    onClick();
  };

  return (
    <div>
        <button onClick={handleClick} className="p-2 focus:outline-none">
        <img src={isOpen ? menuIcon : menuOpenIcon} alt="Menu" className="w-6 h-6" />
        </button>
        {/* <CSSTransition
            in={isOpen}
            timeout={300}
            classNames="menu"
            unmountOnExit
        >
            <div className="menu">
                
            </div>
        </CSSTransition> */}
    </div>
  );
};

export default MenuBtn;
