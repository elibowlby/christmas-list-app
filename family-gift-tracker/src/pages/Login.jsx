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
    <div className="h-screen flex items-center justify-center bg-gray-100">
      {showForgotPinModal && (
        <ForgotPinModal
          name={name}
          onClose={() => setShowForgotPinModal(false)}
        />
      )}
      <div className="bg-white p-8 rounded shadow w-full max-w-sm">
        <h1 className="text-2xl mb-4 font-bold text-center">
          Family Gift Tracker
        </h1>

        <label className="block mb-2">Select Your Name</label>
        <select
          className="w-full border mb-4 p-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
        >
          {familyMembers.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <label className="block mb-2">Enter PIN</label>
        <input
          className="w-full border mb-2 p-2"
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
        />

        {error && <p className="text-red-600 mb-2">{error}</p>}

        <button
          className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700 mb-2"
          onClick={handleLogin}
        >
          Login
        </button>

        <p
          className="text-sm text-center text-blue-600 cursor-pointer"
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
    const res = await fetch(
      "https://qaybgsgencwnbsolinyz.supabase.co/functions/v1/requestPin",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: selectedName }),
      }
    );
    const json = await res.json();
    if (json.error) {
      setStatus(`Error: ${json.error}`);
    } else {
      setStatus("PIN sent! Check your email.");
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-4 rounded shadow w-full max-w-sm">
        <h2 className="text-xl font-bold mb-4">Forgot PIN</h2>

        <label className="block mb-2">Select Your Name</label>
        <select
          className="w-full border mb-4 p-2"
          value={selectedName}
          onChange={(e) => setSelectedName(e.target.value)}
        >
          {familyMembers.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        {status && <p className="mb-2 text-blue-600">{status}</p>}

        <div className="flex space-x-2">
          <button
            className="flex-1 bg-blue-600 text-white p-2 rounded"
            onClick={requestPin}
          >
            Send Me My PIN
          </button>
          <button className="flex-1 bg-gray-300 p-2 rounded" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
