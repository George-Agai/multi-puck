import { useInView } from '../hooks/useInView'
import { Button } from './button'
import Shield from '../assets/icons/lock.webp'
import Chart from '../assets/icons/shield.webp'
import Cloud from '../assets/icons/disk.webp'

interface Feature {
    title: string
    description: string
    icon: string
    bgColor: string
}

const features: Feature[] = [
    {
        title: 'Biometric-secured transfers',
        description: 'Every payment is gated by your fingerprint or face ID.',
        icon: Shield,
        bgColor: 'bg-orange-300',
    },
    {
        title: 'Immutable audit trail',
        description: 'All activity is logged on-chain for total transparency.',
        icon: Chart,
        bgColor: 'bg-yellow-300',
    },
    {
        title: 'Google recovery',
        description: 'Restore your wallet instantly via your Google account.',
        icon: Cloud,
        bgColor: 'bg-pink-300',
    },
]

export const SecuritySection: React.FC = () => {
    const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.1 })

    return (
        <section className="px-1 pt-6 pb-5" ref={ref}>
            <div className="max-w-4xl mx-auto text-center">
                <p className="border border-orange-300 inline-block text-sm px-1 rounded-full bg-orange-200">Security</p>
                <h2 className={`text-3xl md:text-4xl font-bold my-1 ${inView ? 'slide-in' : ''}`}>
                    Absolute control, iron-clad security
                </h2>
                <p className={`text-gray-600 mb-4 md:mb-6 ${inView ? 'slide-in' : ''}`}>
                    Your keys, your rules—every transaction is in your hands.
                </p>
            </div>

            <div className="max-w-5xl mx-auto grid gap-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                {features.map((f) => (
                    <div
                        key={f.title}
                        className="bg-white rounded-xl shadow-md p-1.5 flex flex-col items-start"
                    >
                        <div
                            className={`${f.bgColor} rounded-lg mb-1.5 text-white inline-flex`}
                        >
                            <img className='w-4 h-4' alt='security_option' src={f.icon} />
                        </div>
                        <h3 className="text-xl font-semibold mb-0.5">{f.title}</h3>
                        <p className="text-gray-500 text-md">{f.description}</p>
                    </div>
                ))}
            </div>

            <div className='my-container flex align-center justify-center pt-2'>
                {/* <button className="relative z-10 px-2.5 py-1 font-semibold cursor-pointer border border-blue-500 bg-blue-500 text-white rounded-2xl hover:bg-transparent hover:text-blue-600 transition">
                    Download App
                </button> */}
                <Button/>
            </div>
        </section>
    )
}
