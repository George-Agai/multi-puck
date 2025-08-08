// import { Header } from '../components/header';
import { Hero } from '../components/hero';
import { Features } from '../components/features';
import { Footer } from '../components/footer';
import { Freedom } from '../components/freedom';
import { SecuritySection } from '../components/walletcontrol';
import { MiniappsSection } from '../components/miniapps';
import { SubscribeSection } from '../components/subscribe';

function Home() {

  return (
    <div>
      {/* <Header /> */}
      <Hero />
      <Features />
      <Freedom/>
      <SecuritySection/>
      <MiniappsSection/>
      <SubscribeSection/>
      <Footer />
    </div>
  )
}

export default Home
