import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Landing from './pages/Home'
import GameScreen from './pages/GameScreen'
import './App.css'

function App() {
  return (
    <div>
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<Landing />} />
          <Route path='/offline' element={<GameScreen />} />
        </Routes>
      </BrowserRouter>
    </div>
  )
}

export default App
