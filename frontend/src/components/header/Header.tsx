/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link, useNavigate } from 'react-router-dom';
import logo from '../../assets/Logo.png';
import { useStore } from '../../context/StoreContext';
import { FcGoogle } from 'react-icons/fc';
import { useRef, useState, useEffect } from 'react';
import { CgProfile } from 'react-icons/cg';
import { customerMenuItems, adminMenuItems } from '../../utils/constants';
import AuthApi from '../../api/auth';
import { FiChevronDown, FiLogOut, FiShoppingCart } from 'react-icons/fi';
import { slugify } from '../../utils/utils';
import type { CategoryConfig } from '../../types/appContentTypes';
import { GrFavorite } from 'react-icons/gr';
import { FaChevronRight } from 'react-icons/fa';

const Header = () => {
  const { user, siteContent, setSelectedCategory, wishlistCount, cartCount } =
    useStore();
  const { loginWithGoogle, logout } = AuthApi();
  const navigate = useNavigate();
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileNavRef = useRef<HTMLDivElement | null>(null);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const toggleMenu = () => {
    setIsVisible(true);
    setIsMenuOpen((prev) => !prev);
  };
  const closeMenu = () => setIsMenuOpen(false);
  const toggleMobileNav = () => {
    setIsVisible(true);
    setIsMobileNavOpen((prev) => !prev);
  };
  const closeMobileNav = () => setIsMobileNavOpen(false);

  const [mobileOpenCategory, setMobileOpenCategory] = useState<string | null>(
    null,
  );
  const menuItems = user.role === 'admin' ? adminMenuItems : customerMenuItems;
  const dropdownMenuItems = user.loggedIn
    ? menuItems.filter(
        (item) => item.name !== 'Favorites' && item.name !== 'Cart',
      )
    : [];

  const handleNav = (name: string, slug: string = 'all') => {
    setSelectedCategory(name);
    navigate(`/category/${slug}`);
    closeMobileNav();
    setIsMenuOpen(false);
  };

  const parentCategories = (siteContent?.categories ?? [])
    .filter((cat: CategoryConfig) => cat.type !== 'subcategory')
    .map((cat: CategoryConfig) => ({
      label: cat.name,
      name: cat.name,
      slug: slugify(cat.slug || cat.name),
      isCat: true,
      subcategories: (siteContent?.categories ?? []).filter(
        (item: CategoryConfig) =>
          item.type === 'subcategory' && item.parentId === cat._id,
      ),
    }));

  const navigationCategories = [
    {
      label: 'All',
      name: 'All',
      slug: 'all',
      isCat: true,
      subcategories: [],
    },
    ...parentCategories.slice(0, 6),
  ];

  const overflowCategories = parentCategories.slice(6);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsideProfileMenu = profileMenuRef.current?.contains(target);
      const clickedInsideMobileNav = mobileNavRef.current?.contains(target);

      if (!clickedInsideProfileMenu && !clickedInsideMobileNav) {
        setIsMenuOpen(false);
        setIsMobileNavOpen(false);
      }
    };

    if (isMenuOpen || isMobileNavOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen, isMobileNavOpen]);

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (isMenuOpen || isMobileNavOpen) {
        setIsVisible(true);
        lastScrollY = currentScrollY;
        return;
      }

      const scrollingDown = currentScrollY > lastScrollY && currentScrollY > 80;
      setIsVisible(!scrollingDown || currentScrollY <= 80);
      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isMenuOpen, isMobileNavOpen]);

  return (
    <div
      className={`sticky top-0 z-50 w-full py-4 flex flex-col items-center gap-4 border-b border-(--color-accent-light) bg-(--color-surface) shadow-sm transition-transform duration-300 ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}
    >
      <div className="lg:flex lg:justify-around lg:px-4 w-full">
        {window.innerWidth > 768 && (
          <Link to="/" className="w-[10em]">
            <img src={logo} alt="Sri Naveena Sweets logo" className="w-full" />
          </Link>
        )}

        <div className="flex-col justify-center pb-4 lg:flex hidden">
          <nav className="hidden lg:flex justify-center gap-8 xl:gap-12 pb-2.5 pt-2.5 bg-linear-to-r from-transparent via-maroon-50/20 to-transparent">
            {navigationCategories.map((item: any) => {
              const hasSubmenu = Boolean(item.subcategories?.length);

              return (
                <div key={item.label} className="relative group">
                  <button
                    onClick={() => {
                      if (item.isCat) {
                        handleNav(item.name, item.slug);
                      } else {
                        navigate('/');
                      }
                    }}
                    className="text-[clamp(0.65rem,0.95vw,0.95rem)] whitespace-nowrap tracking-[0.2em] uppercase font-semibold text-(--color-primary-dark) hover:text-(--color-primary) transition-colors relative py-1.5 cursor-pointer"
                  >
                    {item.label}
                  </button>

                  {hasSubmenu && (
                    <div className="absolute left-1/2 top-full mt-3 w-60 -translate-x-1/2 rounded-2xl border border-(--color-accent-light) bg-(--color-surface) p-2.5 shadow-[0_18px_45px_rgba(95,16,33,0.12)] opacity-0 invisible translate-y-2 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-200 z-50 backdrop-blur-sm">
                      {item.subcategories?.map((subcat: CategoryConfig) => (
                        <button
                          key={subcat._id}
                          onClick={() =>
                            handleNav(
                              subcat.name,
                              slugify(subcat.slug || subcat.name),
                            )
                          }
                          className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-(--color-text) transition-colors cursor-pointer whitespace-nowrap hover:bg-(--color-accent-light) hover:text-(--color-primary-dark)"
                        >
                          {subcat.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {overflowCategories.length > 0 && (
              <div className="relative group/more">
                <button
                  type="button"
                  className="flex items-center gap-1 text-[clamp(0.65rem,0.95vw,0.95rem)] whitespace-nowrap tracking-[0.2em] uppercase font-semibold text-(--color-primary-dark) hover:text-(--color-primary) transition-colors relative py-1.5 cursor-pointer"
                >
                  <span>More</span>
                  <FiChevronDown className="h-3.5 w-3.5" />
                </button>

                <div className="absolute left-1/2 top-full mt-3 min-w-60 -translate-x-1/2 rounded-2xl border border-(--color-accent-light) bg-(--color-surface) p-2.5 shadow-[0_18px_45px_rgba(95,16,33,0.12)] opacity-0 invisible translate-y-2 group-hover/more:opacity-100 group-hover/more:visible group-hover/more:translate-y-0 transition-all duration-200 z-50 backdrop-blur-sm">
                  {overflowCategories.map((item: any) => {
                    const hasSubmenu = Boolean(item.subcategories?.length);

                    return (
                      <div key={item.label} className="relative group/submenu">
                        <button
                          onClick={() => {
                            if (item.isCat) {
                              handleNav(item.name, item.slug);
                            }
                          }}
                          className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium text-(--color-text) transition-colors cursor-pointer whitespace-nowrap hover:bg-(--color-accent-light) hover:text-(--color-primary-dark)"
                        >
                          <span>{item.label}</span>
                          {hasSubmenu && (
                            <FaChevronRight className="h-3.5 w-3.5 text-(--color-primary-dark)" />
                          )}
                        </button>

                        {hasSubmenu && (
                          <div className="absolute left-full top-0 ml-2 min-w-56 rounded-2xl border border-(--color-accent-light) bg-(--color-surface) p-2.5 shadow-[0_18px_45px_rgba(95,16,33,0.12)] opacity-0 invisible translate-y-2 group-hover/submenu:opacity-100 group-hover/submenu:visible group-hover/submenu:translate-y-0 transition-all duration-200 z-60 backdrop-blur-sm">
                            {item.subcategories?.map(
                              (subcat: CategoryConfig) => (
                                <button
                                  key={subcat._id}
                                  onClick={() =>
                                    handleNav(
                                      subcat.name,
                                      slugify(subcat.slug || subcat.name),
                                    )
                                  }
                                  className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-(--color-text) transition-colors cursor-pointer whitespace-nowrap hover:bg-(--color-accent-light) hover:text-(--color-primary-dark)"
                                >
                                  {subcat.name}
                                </button>
                              ),
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </nav>
        </div>

        <div className="flex flex-col gap-2 px-4 justify-center">
          <div className="flex lg:justify-end justify-between cursor-default pr-2">
            {window.innerWidth < 768 && (
              <Link to="/" className="w-32">
                <img
                  src={logo}
                  alt="Sri Naveena Sweets logo"
                  className="w-full"
                />
              </Link>
            )}
            <div className="flex flex-col lg:gap-1 lg:justify-between items-end justify-end font-normal ">
              {user.loggedIn ? (
                <div className="relative flex text-center items-center gap-1">
                  {user.role === 'customer' && (
                    <>
                      <Link
                        to="/favorites"
                        className="ml-2 rounded-full bg-transparent! text-gray-700 transition hover:bg-gray-50"
                      >
                        <span className="flex h-9 w-9 relative items-center justify-center rounded-full text-2xl">
                          <GrFavorite />
                          {wishlistCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full text-white bg-red-500 text-[8px] flex items-center justify-center font-bold">
                              {wishlistCount}
                            </span>
                          )}
                        </span>
                      </Link>
                      <Link
                        to="/cart"
                        className="ml-2 rounded-full bg-transparent! text-gray-700 transition hover:bg-gray-50"
                      >
                        <span className="flex h-9 w-9 relative items-center justify-center rounded-full text-2xl ">
                          <FiShoppingCart />
                          {cartCount > 0 && (
                            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full text-white bg-red-500 text-[9px] sm:text-[10px] font-bold flex items-center justify-center">
                              {cartCount}
                            </span>
                          )}
                        </span>
                      </Link>
                    </>
                  )}
                  <div
                    ref={profileMenuRef}
                    className="relative flex text-center"
                  >
                    <button
                      type="button"
                      onClick={toggleMenu}
                      aria-haspopup="true"
                      aria-expanded={isMenuOpen ? 'true' : undefined}
                      className="ml-2 rounded-full bg-transparent! text-gray-700 transition hover:bg-gray-50"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full text-2xl">
                        <CgProfile />
                      </span>
                    </button>

                    {isMenuOpen && (
                      <div className="absolute right-0 top-full z-50 mt-2 min-w-45 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                        {dropdownMenuItems.map((item) => (
                          <Link
                            key={item.name}
                            to={`/${item.to}`}
                            onClick={closeMenu}
                            className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 transition hover:bg-gray-100"
                          >
                            <span className="min-w-6 text-lg">{item.icon}</span>
                            <span className="flex-1 text-left">
                              {item.name}
                            </span>
                          </Link>
                        ))}

                        <button
                          type="button"
                          onClick={logout}
                          className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 transition hover:bg-gray-100"
                        >
                          <span className="min-w-6 text-lg">
                            <FiLogOut />
                          </span>
                          Logout
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <button
                  onClick={loginWithGoogle}
                  className="flex items-center gap-1 bg-google-button-blue rounded-full p-0.5 bg-transparent! transition-colors duration-300 hover:bg-google-button-blue-hover hover:underline"
                >
                  <span className="text-black tracking-wider">
                    Signin with{' '}
                  </span>
                  <div className="flex items-center justify-center bg-white w-5 h-5 rounded-full">
                    <FcGoogle />
                  </div>
                </button>
              )}
            </div>
          </div>

          <div ref={mobileNavRef} className="lg:hidden flex flex-col gap-2">
            <button
              type="button"
              onClick={toggleMobileNav}
              className="flex items-center justify-between rounded-full border border-(--color-accent-light) bg-white! px-4 py-2 text-sm font-semibold text-(--color-text) shadow-sm"
            >
              <span>Menu</span>
              <FiChevronDown
                className={`transition-transform ${isMobileNavOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isMobileNavOpen && (
              <div className="flex flex-col gap-1 rounded-xl border border-(--color-accent-light) bg-white p-2 shadow-sm">
                <button
                  onClick={() => handleNav('All', 'all')}
                  className="flex-1 py-2 text-left text-xs font-semibold uppercase tracking-[0.2em] text-(--color-primary-dark) cursor-pointer"
                >
                  All
                </button>
                {(siteContent?.categories ?? [])
                  .filter((cat: any) => cat.type !== 'subcategory')
                  .map((cat: any) => {
                    const subcategories = (
                      siteContent?.categories ?? []
                    ).filter(
                      (item: any) =>
                        item.type === 'subcategory' &&
                        item.parentId === cat._id,
                    );
                    const isOpen = mobileOpenCategory === cat._id;

                    return (
                      <div key={cat._id}>
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() =>
                              handleNav(cat.name, slugify(cat.slug || cat.name))
                            }
                            className="flex-1 text-left py-2 text-maroon-800 text-xs tracking-wider cursor-pointer"
                          >
                            {cat.name}
                          </button>
                          {subcategories.length > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMobileOpenCategory(isOpen ? null : cat._id);
                              }}
                              className="p-2 text-gold-500"
                              aria-label={`Toggle ${cat.name} subcategories`}
                            >
                              <FaChevronRight
                                className={`h-3.5 w-3.5 transition-transform ${
                                  isOpen ? 'rotate-90' : ''
                                }`}
                              />
                            </button>
                          )}
                        </div>
                        {isOpen && subcategories.length > 0 && (
                          <div className="pb-2 pl-3 space-y-1">
                            {subcategories.map((subcat: any) => (
                              <button
                                key={subcat._id}
                                onClick={() =>
                                  handleNav(
                                    subcat.name,
                                    slugify(subcat.slug || subcat.name),
                                  )
                                }
                                className="block w-full rounded-md px-2 py-1.5 text-left text-[11px] text-maroon-700 hover:bg-gold-50 transition-colors cursor-pointer"
                              >
                                {subcat.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
