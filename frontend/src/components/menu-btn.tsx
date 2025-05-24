import React,{ useState } from 'react';
import menuIcon from '../images/button-menu.svg';
import menuOpenIcon from '../images/button-menu-open.svg';
import CSSTransition from 'react-transition-group/CSSTransition';
// import { Calendar, Award, LogOut, Home, Text } from 'lucide-react';
// import { Link } from 'react-router-dom';
// import supabase from '@lib/supabase';

// import { handleLogout } from '@utils/functions'; // Adjust the import path as necessary

interface MenuBtnProps {
    class: string; // Add class prop for styling
    onClick: () => void;
}

const MenuBtn: React.FC<MenuBtnProps> = ({ onClick, class: className }) => {
  const [isOpen, setIsOpen] = useState(false);
//   const nodeRef = useRef<HTMLDivElement>(null);

//   const handleLogout = async () => {
//       try {
//         if (!supabase) {
//           console.error('Supabase client is not initialized');
//           return;
//         }
//         const { error } = await supabase.auth.signOut();
//         if (error) throw error;
//         console.log('User logged out successfully');
//         window.location.href = '/auth'; // Redirect to the auth route
//       } catch (error) {
//         console.error('Error logging out:', error);
//       }
//     };

//   const handleClick = () => {
//     // Toggle the menu open/close state
//     if (!isOpen) {
//       setIsOpen(true);
//     } else {
//       setIsOpen(false);
//     }
//     // Call the onClick prop to trigger the menu toggle
//     onClick();
    
//   };

  return (
    <div>
        <button onClick={onClick} className="p-2 focus:outline-none">
        <img src={isOpen ? menuOpenIcon : menuIcon} alt="Menu" className="w-6 h-6" />
        </button>
        <CSSTransition
            in={isOpen}
            // nodeRef={nodeRef}
            onEnter={() => setIsOpen(true)}
            onExit={() => setIsOpen(false)}
            mountOnEnter
            unmountOnExit
            timeout={160}
            classNames="menu"
        >
            
        </CSSTransition>
    </div>
  );
};

export default MenuBtn;
