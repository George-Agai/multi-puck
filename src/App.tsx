import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Landing from './pages/Home'
import GameScreen from './pages/GameScreen'
import Online from './components/online'
import './App.css'

function App() {
  return (
    <div>
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<Landing />} />
          <Route path='/offline' element={<GameScreen />} />
          <Route path='/online' element={<Online />} />
        </Routes>
      </BrowserRouter>
    </div>
  )
}

export default App
