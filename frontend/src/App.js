import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { NavBar } from "./components/NavBar";
import { Banner } from "./components/Banner";
import AnalysisPage from "./components/analysis"; // Import AnalysisPage
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

function App() {
  return (
    <Router>
      <div className="App">
        <NavBar />
        <Routes>
          <Route path="/" element={<Banner />} />
          <Route path="/analysis" element={<AnalysisPage />} /> {/* Add this route */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
