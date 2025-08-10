import heroBg from '../assets/backgroundImages/hero-bg.webp';
import { Header } from './header';
import { Button } from './button';
import logo from '../assets/icons/logo.png'

export const Hero: React.FC = () => (
    <section className="h-[92vh] md:h-[100vh] full-container bg-cover bg-center text-center pb-12 bg-purple-200" style={{ backgroundImage: `url(${heroBg})` }}>
        <Header />
        <div className="slide-in mt-5 md:mt-1 flex flex-col items-center justify-center">
            <img src={logo} alt="logo" className='w-10 h-10' />
            <h1 className="text-8xl md:text-7xl font-bold">
                Multi
            </h1>
            <h1 className="text-8xl md:text-7xl font-bold mb-1">
                Puck
            </h1>
            <Button />
        </div>
    </section>
);
