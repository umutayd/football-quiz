import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Categories from './pages/Categories';
import Quiz from './pages/Quiz';
import Results from './pages/Results';
import Leaderboard from './pages/Leaderboard';
import { VideoQuiz } from './pages/VideoQuiz/VideoQuiz';
import WhoAmI from './pages/WhoAmI';

// Import i18n configuration
import './services/i18n';

// Import global styles
import './styles/index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/quiz/:category/:difficulty" element={<Quiz />} />
        <Route path="/video-quiz" element={<VideoQuiz />} />
        <Route path="/ben-kimim" element={<WhoAmI />} />
        <Route path="/results" element={<Results />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
