import { useInView } from '../hooks/useInView'
import { useNavigate } from 'react-router-dom';

export const Button: React.FC = () => {
    const [ref, inView] = useInView<HTMLButtonElement>({ threshold: 0.1 })
    const navigate = useNavigate()

    return (
        <button
            ref={ref}
            onClick={() => navigate('/offline')}
            className={`
    transform transition-transform duration-500 ease-out
    px-4 py-1 mt-1 mb-1 font-semibold cursor-pointer
    border-1 border-black/60 border-b-4 border-b-black/60
    bg-orange-300 text-black/70 text-xl rounded-2xl
    hover:bg-transparent hover:text-blue-600 transition
    ${inView ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
  `}
        >
            PLAY OFFLINE
        </button>

    );
};
