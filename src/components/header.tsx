import { useState } from 'react';
import logo from '../assets/icons/coolcado.png'

export const Header: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <header className="relative my-container flex items-center justify-between p-1">
      <a className="flex items-center text-md font-semibold cursor-pointer" target='new' href="https://x.com/george__agai">
        <img src={logo} alt="logo" className='w-1.5 h-1.5'/>
        <span style={{marginTop: '5px'}}>CoolCado</span>
      </a>

      <button
        className="md:hidden text-2xl z-20"
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Close menu' : 'Open menu'}
      >
        {open ? '✕' : '☰'}
      </button>

      <nav
        className={`
          absolute top-0 right-0 rounded-lg flex flex-col items-left
          bg-white z-10 p-1.5 pr-3 shadow md:shadow-none
          transition-transform duration-200
          ${open ? 'translate-x-0' : 'translate-x-full'}
          md:static md:translate-x-0 md:flex-row md:bg-transparent md:backdrop-blur-0 md:p-0 md:space-y-0 md:flex md:items-center
        `}
      >
        <a href="#features" className="block py-1 px-2 hover:text-blue-600">Invite</a>
        <a href="#pricing" className="block py-1 px-2 hover:text-blue-600">How To Play</a>
        <a href="#contact" className="block py-1 px-2 hover:text-blue-600">Contact</a>
      </nav>
    </header>
  );
};