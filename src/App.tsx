import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./Home";
import PlayerView from "./PlayerView";
import MonitorView from "./MonitorView";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/play" element={<PlayerView />} />
        <Route path="/monitor" element={<MonitorView />} />
      </Routes>
    </Router>
  );
}

export default App;
