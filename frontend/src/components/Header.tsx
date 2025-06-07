import MenuBtn from '@components/menu-btn';
import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Sun, Moon, Home, Award, Text, LogOut } from 'lucide-react';
import { classMenuItem } from '@styles/classes';
import supabase from '@lib/supabase';

type HeaderProps = {
  theme: 'theme-dark' | 'theme-light';
  toggleTheme: () => void;
//   onClick: () => void;
  isOpen: boolean;
  handleLogout: () => Promise<void>;
};

interface ThemeState {
    theme: 'theme-dark' | 'theme-light';
}

interface MenuState {
    isOpen: boolean;
}

interface HeaderInternalProps extends HeaderProps {}

const Header = ({}: HeaderInternalProps) => {
    const [themeState, setTheme] = useState<ThemeState['theme']>(
        window.matchMedia('(prefers-color-scheme: dark)').matches ? 'theme-dark' : 'theme-light'
    );
    const [menuOpen, setIsOpen] = useState<MenuState['isOpen']>(false);

    const handleLogoutInternal = async (): Promise<void> => {
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
        if (!menuOpen) {
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    };

    useEffect(() => {
        if (themeState === 'theme-dark') {
            document.body.classList.add('dark');
        } else {
            document.body.classList.remove('dark');
        }
    }, [themeState]);

    const toggleThemeInternal = (): void => {
        setTheme((prev) => (prev === 'theme-dark' ? 'theme-light' : 'theme-dark'));
    };

    return (
        <div className="header flex items-center dark">
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
                <div className="block sm:hidden">
                    <MenuBtn
                        className="header-brand--menu-btn btn-ghost justify-end"
                        onClick={handleClick}
                    />
                </div>
            </div>
            {menuOpen && (
                <div className="menu block sm:hidden">
                    <div className={`menu-container bg-white dark:bg-gray-100 text-brand-80 dark:text-brand-10 align-right`}>
                        <div className="menu-container--list align-flex-end justify-end flex flex-col space-y-2">
                            <Link to="/" className={`${classMenuItem}`}>
                                <Home className="w-5 h-5 mr-2" />
                                Goals
                            </Link>
                            <Link to="/accomplishments" className={`${classMenuItem}`}>
                                <Award className="w-5 h-5 mr-2" />
                                Accomplishments
                            </Link>
                            <Link to="/summaries" className={`${classMenuItem}`}>
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
            )}
        </div>
    );
};
        export default Header;
