import Home from './pages/Home'
import Summarie from './pages/Summarie'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
function App() {
  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/summarie" element={<Summarie />} />
        </Routes>
      </Router>
    </div>
  )
}

export default App
