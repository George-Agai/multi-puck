import { useInView } from '../hooks/useInView'
import bolt from '../assets/icons/bolt.webp'
import puzzle from '../assets/icons/puzzle.webp'
import prize from '../assets/icons/prize.webp'
import animals from '../assets/backgroundImages/animals.webp'
import shapes from '../assets/backgroundImages/shapes.webp'
import waves from '../assets/backgroundImages/waves.webp'

interface MiniAppFeature {
    title: string
    description: string
    icon: string
    bgColor: string
    bgImage: string
}

const miniAppFeatures: MiniAppFeature[] = [
    {
        title: 'Seamless Integrations',
        description: 'Tap into third-party micro-apps for payments, vouchers, and more.',
        icon: puzzle,
        bgColor: 'bg-blue-200',
        bgImage: animals
    },
    {
        title: 'Instant Access',
        description: 'Launch micro-apps right away—no extra registration required.',
        icon: bolt,
        bgColor: 'bg-yellow-200',
        bgImage: waves
    },
    {
        title: 'Daily Rewards',
        description: 'Complete simple tasks and earn stablecoin bonuses every day.',
        icon: prize,
        bgColor: 'bg-pink-300',
        bgImage: shapes
    },
]

export const MiniappsSection: React.FC = () => {

    const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.1 })

    return(
    <section className="px-1 py-6 bg-pink-100" ref={ref}>
        <div className="max-w-4xl mx-auto text-center mb-3">
            <p className="border border-orange-300 inline-block text-sm px-1 rounded-full bg-orange-200">Mini Apps</p>
            <h2 className={`${inView ? 'slide-in' : ''} text-3xl md:text-4xl font-bold my-1`}>
                Mini-Apps Hub
            </h2>
            <p className={`${inView ? 'slide-in' : ''} text-gray-600 mb-1`}>
                Everything you need to earn, spend & save—powered by our ecosystem. Your keys, your rules, your transactions
            </p>

            <button className="inline-block cursor-pointer bg-green-500 text-white px-1 py-0.5 rounded-full hover:bg-green-600 transition">
                Browse Mini-Apps →
            </button>
        </div>

        <div className="max-w-5xl mx-auto grid gap-3 grid-cols-1 sm:gap-2 sm:grid-cols-2 md:grid-cols-3">
            {miniAppFeatures.map((f) => (
                <div
                    key={f.title}
                    className="relative bg-white bg-cover bg-center rounded-xl shadow-md p-1.5 flex flex-col items-start"
                    style={{backgroundImage: `url(${f.bgImage})`}}
                >
                    <div className="absolute inset-0 backdrop-blur-xs bg-white/10 z-0 rounded-xl"></div>
                    <div className={`${f.bgColor} rounded-lg mb-1.5 inline-flex z-10`}>
                        <img className='w-3 h-3' alt='security_option' src={f.icon} />
                    </div>
                    <h3 className="text-xl text-black-500 font-bold mb-0.5 z-10">{f.title}</h3>
                    <p className="text-black-300 text-md z-10">{f.description}</p>
                </div>
            ))}
        </div>
    </section>
)}
