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
    // Call a custom RPC or method to validate the PIN:
    const { data, error } = await supabase.rpc("validate_pin", {
      user_name: name,
      user_pin: pin,
    });
    if (error || !data) {
      setError("Invalid PIN");
      return;
    }
    // If valid, store the name in localStorage as a session
    localStorage.setItem("userName", name);
    navigate("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      {showForgotPinModal && (
        <ForgotPinModal
          name={name}
          onClose={() => setShowForgotPinModal(false)}
        />
      )}
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-800 text-center mb-6">
          Family Gift Tracker
        </h1>

        <label className="block text-gray-700 font-medium mb-2">
          Select Your Name
        </label>
        <select
          className="w-full p-2 mb-4 border border-gray-300 rounded-md bg-white text-gray-700"
          value={name}
          onChange={(e) => setName(e.target.value)}
        >
          {familyMembers.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <label className="block text-gray-700 font-medium mb-2">
          Enter PIN
        </label>
        <input
          type="password"
          className="w-full p-2 mb-4 border border-gray-300 rounded-md bg-white text-gray-700"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
        />

        {error && <p className="text-red-600 mb-4">{error}</p>}

        <button
          className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition-colors mb-4"
          onClick={handleLogin}
        >
          Login
        </button>

        <p
          className="text-sm text-center text-blue-600 hover:text-blue-700 cursor-pointer"
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
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Forgot PIN</h2>

        <label className="block text-gray-700 font-medium mb-2">
          Select Your Name
        </label>
        <select
          className="w-full p-2 mb-4 border border-gray-300 rounded-md bg-white text-gray-700"
          value={selectedName}
          onChange={(e) => setSelectedName(e.target.value)}
        >
          {familyMembers.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        {status && <p className="mb-4 text-blue-600">{status}</p>}

        <div className="flex gap-3">
          <button
            className="flex-1 bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition-colors"
            onClick={requestPin}
          >
            Send Me My PIN
          </button>
          <button
            className="flex-1 bg-gray-200 text-gray-700 p-2 rounded-md hover:bg-gray-300 transition-colors"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
