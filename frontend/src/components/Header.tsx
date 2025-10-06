import MenuBtn, { MenuBtnProps } from '@components/menu-btn';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import menuClosedIcon from '/images/button-menu.svg';
import menuOpenIcon from '/images/button-menu-open.svg';
import { Sun, Moon, Home, Award, Text, LogOut } from 'lucide-react';
import { classMenuItem } from '@styles/classes';
import supabase from '@lib/supabase';

// Update `HeaderProps` to make `isOpen` optional
interface HeaderProps {
  theme: 'theme-dark' | 'theme-light';
  toggleTheme: () => void;
  isOpen?: boolean; // Made optional
  handleLogout?: () => Promise<void>; // Optional logout function
}

interface ThemeState {
    theme: 'theme-dark' | 'theme-light';
}

// interface MenuState {
//     isOpen: boolean;
// }

// Update the `Header` component to conditionally require `handleLogout`
const Header = ({ isOpen = false, ...props }: HeaderProps) => {
    const [themeState, setTheme] = useState<ThemeState['theme']>(
        localStorage.getItem('theme') as ThemeState['theme'] ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    );
    const [menuOpen, setIsOpen] = useState<MenuBtnProps['isOpen']>(isOpen);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const handleLogoutInternal = async (): Promise<void> => {
        if (!isAuthenticated || !props.handleLogout) return;
        try {
            if (!supabase) {
                console.error('Supabase client is not initialized');
                return;
            }
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            console.log('User logged out successfully');
            window.location.href = '/auth'; // Redirect to the auth route
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

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

    useEffect(() => {
        // Set the initial `data-theme` attribute based on the theme state
        document.documentElement.setAttribute('data-theme', themeState);

        if (themeState === 'theme-dark') {
            document.body.classList.add('dark');
        } else {
            document.body.classList.remove('dark');
        }
    }, [themeState]);

    useEffect(() => {
        const checkAuthStatus = async () => {
            try {
                const { data: session, error: sessionError } = await supabase.auth.getSession();
                if (sessionError || !session?.session) {
                    console.error('No active session found:', sessionError?.message);
                    setIsAuthenticated(false);
                    return;
                }

                const { data: { user }, error: userError } = await supabase.auth.getUser();
                if (userError) {
                    console.error('Error fetching user:', userError.message);
                    setIsAuthenticated(false);
                    return;
                }

                setIsAuthenticated(!!user);
            } catch (err) {
                console.error('Unexpected error during auth check:', err);
                setIsAuthenticated(false);
            }
        };
        checkAuthStatus();
    }, []);

    const toggleThemeInternal = (): void => {
        const newTheme = themeState === 'theme-dark' ? 'theme-light' : 'theme-dark';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);

        // Update the `data-theme` attribute on the `html` element
        document.documentElement.setAttribute('data-theme', newTheme);
    };

    return (
        <div className={`header flex items-center dark relative ${menuOpen ? 'header-expanded' : ''}`} style={{ top: 0 }}>
            {/* {menuOpen === true ? (<p>Menu Open</p>) : (<p>Menu Closed</p>)} */}
            <div className="header-brand">
                <div className="header-brand--logo-container relative pr-6 flex items-end h-16">
                    <button
                        onClick={toggleThemeInternal}
                        className="btn-ghost ml-4 p-2 rounded absolute top-0 right-0"
                        aria-label="Toggle theme"
                    >
                        {themeState === 'theme-dark' ? (
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
                    <div className="block sm:hidden">
                        <MenuBtn
                            className="header-brand--menu-btn btn-ghost justify-end"
                            onClick={handleClick}
                            isOpen={menuOpen}
                        >
                            
                            {/* <div className="menu left-0 top-full w-full sm:hidden"> */}
                                {/* <div className="menu-container fixed align-left z-10 top-0 right-0 h-full w-64 bg-white dark:bg-gray-100 text-brand-80 dark:text-brand-10 shadow-lg transform transition-transform duration-300 ease-in-out" style={{ transform: menuOpen ? 'translateX(0)' : 'translateX(100%)' }}> */}
                                {/* <div className={`menu-container bg-white dark:bg-gray-100 text-brand-80 dark:text-brand-10 align-right`}> */}
                                    {/* <img
                                        src={menuOpen ? menuOpenIcon : menuClosedIcon}
                                        alt="Menu"
                                        className="w-6 h-6"
                                    /> */}
                                    {/* <div className="menu-container--list align-flex-end justify-end flex flex-col space-y-2"> */}
                                        <Link onClick={handleMenuItemClick} to="/" className={`${classMenuItem}`}>
                                            <Home className="w-5 h-5 mr-2" />
                                            Goals
                                        </Link>
                                        <Link onClick={handleMenuItemClick} to="/accomplishments" className={`${classMenuItem}`}>
                                            <Award className="w-5 h-5 mr-2" />
                                            Accomplishments
                                        </Link>
                                        <Link onClick={handleMenuItemClick} to="/summaries" className={`${classMenuItem}`}>
                                            <Text className="w-5 h-5 mr-2" />
                                            Summaries
                                        </Link>
                                        <Link
                                            to="#"
                                            onClick={handleLogoutInternal}
                                            className={`${classMenuItem}`}
                                        >
                                            <LogOut className="w-5 h-5 mr-2" />
                                            Log out
                                        </Link>
                                    {/* </div> */}
                                {/* </div> */}
                            {/* </div> */}
                        </MenuBtn>
                    </div>
                )}
            </div>
            {/* {menuOpen && isAuthenticated && (
                <div className="menu left-0 top-full w-full sm:hidden">
                    <div className={`menu-container bg-white dark:bg-gray-100 text-brand-80 dark:text-brand-10 align-right`}>
                        <div className="menu-container--list align-flex-end justify-end flex flex-col space-y-2">
                            <Link onClick={handleMenuItemClick} to="/" className={`${classMenuItem}`}>
                                <Home className="w-5 h-5 mr-2" />
                                Goals
                            </Link>
                            <Link onClick={handleMenuItemClick} to="/accomplishments" className={`${classMenuItem}`}>
                                <Award className="w-5 h-5 mr-2" />
                                Accomplishments
                            </Link>
                            <Link onClick={handleMenuItemClick} to="/summaries" className={`${classMenuItem}`}>
                                <Text className="w-5 h-5 mr-2" />
                                Summaries
                            </Link>
                            <Link
                                to="#"
                                onClick={handleLogoutInternal}
                                className={`${classMenuItem}`}
                            >
                                <LogOut className="w-5 h-5 mr-2" />
                                Log out
                            </Link>
                        </div>
                    </div>
                </div>
            )} */}
        </div>
    );
};
        export default Header;
