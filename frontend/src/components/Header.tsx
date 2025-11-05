import MenuBtn, { MenuBtnProps } from '@components/menu-btn';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import menuClosedIcon from '/images/button-menu.svg';
import { Sun, Moon, Home, Award, Text } from 'lucide-react';
import { classMenuItem } from '@styles/classes';
// supabase client not needed here; use useAuth hook's session instead
import useAuth from '@hooks/useAuth';
import { Menu, MenuItem } from '@mui/material';
import Modal from 'react-modal';
import { ARIA_HIDE_APP } from '@lib/modal';
import { modalClasses, overlayClasses } from '@styles/classes';
import Avatar from '@components/Avatar';
import ProfileManagement from './ProfileManagement';




// Exported flag so other modules can decide whether to render the menu
// Exported helper so other modules can check whether the menu should be hidden.
// We export a function so the value is derived at call time from the current location.
export function isMenuHidden(): boolean {
    try {
        return typeof window !== 'undefined' && window.location.pathname === '/profile';
    } catch (e) {
        return false;
    }
}

// Update `HeaderProps` to make `isOpen` optional
interface HeaderProps {
    theme: 'theme-dark' | 'theme-light';
    toggleTheme: () => void;
    isOpen?: boolean; // Made optional
    handleLogout?: () => Promise<void>; // Optional logout function
}

// Theme is provided by the parent App via props; avoid local ThemeState here.

// interface MenuState {
//     isOpen: boolean;
// }

// Update the `Header` component to conditionally require `handleLogout`
const Header = ({ isOpen = false, ...props }: HeaderProps) => {
    // navigation not required in this component
    const [menuOpen, setIsOpen] = useState<MenuBtnProps['isOpen']>(isOpen);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
    const { session } = useAuth();
    // use the module-level `isMenuHidden` exported above

    // const handleLogoutInternal = async (): Promise<void> => {
    //     if (!isAuthenticated || !props.handleLogout) return;
    //     try {
    //         if (!supabase) {
    //             console.error('Supabase client is not initialized');
    //             return;
    //         }
    //         const { error } = await supabase.auth.signOut();
    //         if (error) throw error;
    //         console.log('User logged out successfully');
    //         window.location.href = '/auth'; // Redirect to the auth route
    //     } catch (error) {
    //         console.error('Error logging out:', error);
    //     }
    // };
    

    const handleClick = (): void => {
        setIsOpen((prev) => !prev); 
        // if (menuOpen !== true) {
        //     setIsOpen(true);
        // }
        // else {
        //     setIsOpen(false);
        // }   
    };

    const handleMenuItemClick = (): void => {
        setIsOpen(false); // Close the menu when a menu item is selected
        menuClosedIcon; // Reset the menu icon to menuClosedIcon
        handleClick;
        console.log({isOpen});
        // You can add any additional logic here if needed});
    };

    // The app-level `theme` and `toggleTheme` are provided via props.
    // Avoid maintaining a separate local themeState here which can diverge
    // from the app-level state. Use the passed-in props directly.

    // Derive authentication state from the session provided by the auth hook.
    // This avoids making unauthenticated calls on mount which produced noisy
    // console errors when the app is rendered on the login screen.
    useEffect(() => {
        setIsAuthenticated(!!session);
    }, [session]);

    const toggleThemeInternal = (): void => {
        // Delegate to the app-level toggle so MUI provider and DOM stay in sync.
        props.toggleTheme();
    };

    const handleMenuOpen = (event: React.MouseEvent<HTMLLabelElement>) => {
        setMenuAnchor(event.currentTarget as HTMLElement);
    };

    const handleMenuClose = () => {
        setMenuAnchor(null);
    };

    const handleLogout = async () => {
        if (props.handleLogout) {
            await props.handleLogout();
        }
        handleMenuClose();
    };

    return (
        <div className={`header flex items-center dark relative ${menuOpen ? 'header-expanded top-0' : ''}`}>
            
            <div className="header-brand">
                <div className="header-brand--logo-container relative pr-6 flex items-end h-16">
                    <button
                        onClick={toggleThemeInternal}
                        className="btn-ghost ml-4 p-2 rounded absolute top-0 right-0"
                        aria-label="Toggle theme"
                    >
                        {props.theme === 'theme-dark' ? (
                            <Sun className="w-5 h-5 stroke-gray-10 hover:stroke-gray-30 focus:outline-none" />
                        ) : (
                            <Moon className="w-5 h-5 stroke-gray-10 hover:stroke-gray-30 focus:outline-none" />
                        )}
                    </button>
                    <Link
                        to="/"
                        className="header-brand--logo relative overflow-hidden w-full sm:w-auto flex items-end justify-center h-full"
                        style={{ minHeight: '3rem' }} // optional: ensures height
                    >
                        <img
                            src="/images/logo-large.svg"
                            className="mask-clip-border absolute bottom-0 left-1/2 -translate-x-1/2 h-8 sm:h-12 w-auto"
                            style={{ maxWidth: '90%' }}
                            alt="Logo"
                        />
                    </Link>
                </div>
                {isAuthenticated && (
                    <>
                    {/* <div className='flex flex-col gap-2'> */}
                    <div className='absolute top-8 sm:top-10 right-3 sm:right-10'>
                         
                        <Avatar
                            isEdit={false}
                            onClick={handleMenuOpen}
                            size='sm'
                        />
                        <Menu
                            anchorEl={menuAnchor}
                            open={Boolean(menuAnchor)}
                            onClose={handleMenuClose}
                            onClick={handleMenuClose}
                            className='p-4'
                        >
                            <label className="px-4 pb-4" htmlFor="profile-menu">{session?.user?.email}</label>
                            <MenuItem onClick={() => setIsProfileOpen(true)}>Edit Profile</MenuItem>
                            {/* <MenuItem onClick={() => console.log('Preferences')}>Preferences</MenuItem> */}
                            <MenuItem onClick={handleLogout}>Log Out</MenuItem>
                        </Menu>
                    </div>
                    {!isMenuHidden() && (
                        <div className="relative sm:hidden">
                            <MenuBtn
                                className="header-brand--menu-btn btn-ghost justify-start top-16"
                                onClick={handleClick}
                                isOpen={menuOpen}
                            >
                                
                                            <Link onClick={handleMenuItemClick} to="/" className={`${classMenuItem}`}>
                                                <Home className="w-5 h-5 mr-2" />
                                                Goals
                                            </Link>
                                            <Link onClick={handleMenuItemClick} to="/summaries" className={`${classMenuItem}`}>
                                                <Text className="w-5 h-5 mr-2" />
                                                Summaries
                                            </Link>
                                            
                            </MenuBtn>
                        
                        </div>
                        )}
                        <Modal
                            isOpen={isProfileOpen}
                            id='Profile'
                            ariaHideApp={ARIA_HIDE_APP}
                            className={`fixed inset-0 flex items-center justify-center z-50`}
                            overlayClassName={`${overlayClasses}`}
                        >
                            {isProfileOpen && (
                                <div className={`${modalClasses}`}>
                                    <ProfileManagement onClose={() => setIsProfileOpen(false)} />
                                </div>
                            )}
                        </Modal>
                        
                    </>
                )}
            </div>           
        </div>
    );
};
        export default Header;
