/* eslint-disable react/prop-types */
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState(null);
  const [showForgotPinModal, setShowForgotPinModal] = useState(false);
  const [familyMembers, setFamilyMembers] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    async function fetchFamilyMembers() {
      const { data: users } = await supabase.from("users").select("name");
      setFamilyMembers(users.map((user) => user.name));
      setName(users[0]?.name || "");
    }
    fetchFamilyMembers();
  }, []);

  async function handleLogin() {
    setError(null);
    if (!name || !pin) {
      setError("Please enter both name and PIN");
      return;
    }

    try {
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("name", name)
        .eq("pin", pin)
        .single();

      if (userError || !user) {
        console.error("Login error:", userError);
        setError("Invalid PIN");
        return;
      }

      // If we got here, the login was successful
      localStorage.setItem("userName", name);
      // Add a small delay to ensure localStorage is set
      setTimeout(() => {
        navigate("/dashboard");
      }, 100);
    } catch (err) {
      console.error("Login error:", err);
      setError("An error occurred during login");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 overflow-x-hidden">
      {showForgotPinModal && (
        <ForgotPinModal
          name={name}
          onClose={() => setShowForgotPinModal(false)}
        />
      )}
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm border border-primary">
        <h1 className="text-3xl font-bold text-primary text-center mb-6">
          Family Gift Tracker
        </h1>

        <label className="block text-primary font-medium mb-2">
          Select Your Name
        </label>
        <select
          className="w-full p-2 mb-4 border border-primary rounded-md bg-white text-primary focus:outline-none focus:ring-2 focus:ring-secondary"
          value={name}
          onChange={(e) => setName(e.target.value)}
        >
          {familyMembers.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <label className="block text-primary font-medium mb-2">Enter PIN</label>
        <input
          type="password"
          className="w-full p-2 mb-4 border border-primary rounded-md bg-white text-primary focus:outline-none focus:ring-2 focus:ring-secondary"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
        />

        {error && <p className="text-secondary mb-4">{error}</p>}

        <button
          className="w-full bg-primary text-white p-3 rounded-md hover:bg-primary-hover transition-colors mb-4"
          onClick={handleLogin}
        >
          Login
        </button>

        <p
          className="text-sm text-center text-secondary hover:text-secondary-hover cursor-pointer"
          onClick={() => setShowForgotPinModal(true)}
        >
          Forgot your PIN?
        </p>
      </div>
    </div>
  );
}

function ForgotPinModal({ name, onClose }) {
  const [selectedName, setSelectedName] = useState(name);
  const [status, setStatus] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);

  useEffect(() => {
    async function fetchFamilyMembers() {
      const { data: users } = await supabase.from("users").select("name");
      setFamilyMembers(users.map((user) => user.name));
      setSelectedName(users[0]?.name || "");
    }
    fetchFamilyMembers();
  }, []);

  async function requestPin() {
    setStatus("Sending...");
    try {
      const res = await fetch(
        "https://qaybgsgencwnbsolinyz.supabase.co/functions/v1/requestPin",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ name: selectedName }),
        }
      );
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to send PIN");
      }

      setStatus("PIN sent! Check your email.");
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm border border-primary">
        <h2 className="text-2xl font-bold text-primary mb-4">Forgot PIN</h2>

        <label className="block text-primary font-medium mb-2">
          Select Your Name
        </label>
        <select
          className="w-full p-2 mb-4 border border-primary rounded-md bg-white text-primary focus:outline-none focus:ring-2 focus:ring-secondary"
          value={selectedName}
          onChange={(e) => setSelectedName(e.target.value)}
        >
          {familyMembers.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        {status && <p className="mb-4 text-secondary">{status}</p>}

        <div className="flex gap-3">
          <button
            className="flex-1 bg-secondary text-white p-3 rounded-md hover:bg-secondary-hover transition-colors"
            onClick={requestPin}
          >
            Send Me My PIN
          </button>
          <button
            className="flex-1 bg-gray-200 text-primary p-3 rounded-md hover:bg-gray-300 transition-colors"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
