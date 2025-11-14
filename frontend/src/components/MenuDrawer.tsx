import * as React from 'react';
import { useState } from 'react';
import MenuBtn, { MenuBtnProps } from '@components/menu-btn';
import { styled, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import MuiAppBar, { AppBarProps as MuiAppBarProps } from '@mui/material/AppBar';
import { Menu, MenuItem } from '@mui/material';
import Toolbar from '@mui/material/Toolbar';
import CssBaseline from '@mui/material/CssBaseline';
import List from '@mui/material/List';
import Typography from '@mui/material/Typography';
import ProfileManagement from './ProfileManagement';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import { ChevronLeft, ChevronRight, Home, MenuIcon, Moon, Sun, Text } from 'lucide-react';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import useAuth from '@hooks/useAuth';
import Modal from 'react-modal';
import Avatar from '@components/Avatar';
import { ARIA_HIDE_APP, useOverlayDebug } from '@lib/modal';
import { modalClasses, overlayClasses } from '@styles/classes';
import { HeaderProps } from './Header';
import { Link } from 'react-router-dom';
import Logo from '@components/Logo';


const drawerWidth = 240;

// const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })<{
//   open?: boolean;
// }>(({ theme }) => ({
//   flexGrow: 1,
//   padding: theme.spacing(3),
//   transition: theme.transitions.create('margin', {
//     easing: theme.transitions.easing.sharp,
//     duration: theme.transitions.duration.leavingScreen,
//   }),
//   marginRight: -drawerWidth,
//   /**
//    * This is necessary to enable the selection of content. In the DOM, the stacking order is determined
//    * by the order of appearance. Following this rule, elements appearing later in the markup will overlay
//    * those that appear earlier. Since the Drawer comes after the Main content, this adjustment ensures
//    * proper interaction with the underlying content.
//    */
//   position: 'relative',
//   variants: [
//     {
//       props: ({ open }) => open,
//       style: {
//         transition: theme.transitions.create('margin', {
//           easing: theme.transitions.easing.easeOut,
//           duration: theme.transitions.duration.enteringScreen,
//         }),
//         marginRight: 0,
//       },
//     },
//   ],
// }));

interface AppBarProps extends MuiAppBarProps {
  open?: boolean;
}

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})<AppBarProps>(({ theme }) => ({
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  variants: [
    {
      props: ({ open }) => open,
      style: {
        width: `calc(100% - ${drawerWidth}px)`,
        transition: theme.transitions.create(['margin', 'width'], {
          easing: theme.transitions.easing.easeOut,
          duration: theme.transitions.duration.enteringScreen,
        }),
        marginRight: drawerWidth,
      },
    },
  ],
}));

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
  justifyContent: 'flex-start',
}));

export default function PersistentDrawerRight({...props }: HeaderProps) {
  const theme = useTheme();
  const [open, setOpen] = React.useState(false);

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
const { session } = useAuth();
const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

    // Dev-only overlay debug
    useOverlayDebug(isProfileOpen);

const handleMenuOpen = (event: React.MouseEvent<HTMLLabelElement>) => {
        setMenuAnchor(event.currentTarget as HTMLElement);
    };
const toggleThemeInternal = (): void => {
        // Delegate to the app-level toggle so MUI provider and DOM stay in sync.
        props.toggleTheme();
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
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar className='header-brand--logo-container' position="fixed" open={open}>
        <Toolbar className='justify-between gap-4'>
          {/* <Typography variant="h6" noWrap sx={{ flexGrow: 1 }} component="div">
            Persistent drawer
            </Typography> */}
            {/* <div className="header-brand--logo-container relative pr-6 flex items-end "> */}
            <div>
                
                <Link
                    to="/"
                    className="header-brand--logo overflow-hidden flex-0 w-auto block items-end justify-start h-[3.5rem]"
                    style={{ minHeight: '2rem' }} // optional: ensures height
                >

                    {/* <span className="mask-clip-border absolute bottom-0 left-1/2 -translate-x-1/2 h-8 sm:h-12 w-auto"> */}
                    <span className="mask-clip-border h-auto w-full">
                    <Logo
                        aria-label="Wkly logo"
                        style={{ color: 'var(--brand-30)' }}
                        className="min-w-[134px] w-1/2 h-full pt-3"
                    />
                    </span>
                    

                </Link>
            </div>
                    <div className='flex flex-row w-auto gap-2 items-center'>    
                        <IconButton
                            onClick={toggleThemeInternal}
                            className="btn-ghost ml-4 p-2 rounded"
                            aria-label="Toggle theme"
                        >
                            {props.theme === 'theme-dark' ? (
                                <Sun className="w-5 h-5 stroke-gray-10 hover:stroke-gray-30 focus:outline-none" />
                            ) : (
                                <Moon className="w-5 h-5 stroke-gray-10 hover:stroke-gray-30 focus:outline-none" />
                            )}
                        </IconButton>
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
                        

                        <IconButton
                            color="inherit"
                            aria-label="open drawer"
                            edge="end"
                            onClick={handleDrawerOpen}
                            sx={[open && { display: 'none' }]}
                        >
                            <MenuIcon />
                        </IconButton>

                    </div>        
        </Toolbar>
      </AppBar>
      {/* <Main open={open}>
        <DrawerHeader />
        Main content goes here.
      </Main> */}
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
          },
        }}
        variant="persistent"
        anchor="right"
        open={open}
      >
        <DrawerHeader>
          <IconButton onClick={handleDrawerClose}>
            {theme.direction === 'rtl' ? <ChevronLeft /> : <ChevronRight />}
          </IconButton>
        </DrawerHeader>
        <Divider />
        <List>
                
                            {/* <Link onClick={handleMenuItemClick} to="/" className={`${classMenuItem}`}>
                                <Home className="w-5 h-5 mr-2" />
                                Goals
                            </Link>
                            <Link onClick={handleMenuItemClick} to="/summaries" className={`${classMenuItem}`}>
                                <Text className="w-5 h-5 mr-2" />
                                Summaries
                            </Link> */}
                            

          {['Goals', 'Summaries'].map((text, index) => (
            <ListItem key={text} disablePadding>
              <ListItemButton href={index % 2 === 0 ? "/" : "/summaries"} className='gap-0'>
                <ListItemIcon>
                  {index % 2 === 0 ? <Home className='w-4 h-4' /> : <Text className='w-4 h-4' />}
                </ListItemIcon>
                <ListItemText primary={text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>
    </Box>
  );
}