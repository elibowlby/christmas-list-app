import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState, memo } from "react";
import Login from "./pages/Login";
import DashboardComponent from "./pages/Dashboard";

const Dashboard = memo(DashboardComponent);

function App() {
  return (
    <Router basename="/christmas-list-app">
      <div className="flex flex-col min-h-screen">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
