import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState(localStorage.getItem("userName"));
  const [users, setUsers] = useState([]);
  const [myItems, setMyItems] = useState([]);
  const [selectedFamilyMember, setSelectedFamilyMember] = useState("");
  const [familyItems, setFamilyItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userName) {
      navigate("/");
    } else {
      fetchData();
    }
  }, [userName]);

  async function fetchData() {
    setIsLoading(true);
    try {
      const { data: allUsers } = await supabase.from("users").select("*");
      setUsers(allUsers || []);

      const me = allUsers.find((u) => u.name === userName);
      const { data: myData } = await supabase
        .from("wishlist_items")
        .select("*")
        .eq("ownerId", me.id);
      setMyItems(myData || []);

      const others = allUsers.filter((u) => u.name !== userName);
      setSelectedFamilyMember(others[0]?.name || "");

      const { data: allItems } = await supabase
        .from("wishlist_items")
        .select("*, ownerId (name, id)");
      setFamilyItems(allItems || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  function getMemberItems(memberName) {
    return familyItems.filter((i) => i.ownerId.name === memberName);
  }

  async function markPurchased(item) {
    const me = users.find((u) => u.name === userName);
    await supabase
      .from("wishlist_items")
      .update({ purchasedBy: me.id })
      .eq("id", item.id);
    fetchData();
  }

  async function unmarkPurchased(item) {
    await supabase
      .from("wishlist_items")
      .update({ purchasedBy: null })
      .eq("id", item.id);
    fetchData();
  }

  function isPurchased(item) {
    const me = users.find((u) => u.name === userName);
    if (!me) return false;
    return item.purchasedBy && item.ownerId.id !== me.id;
  }

  async function addMyItem() {
    const me = users.find((u) => u.name === userName);
    const itemName = window.prompt("What would you like for Christmas? 🎄🎁");
    if (!itemName?.trim()) return;

    await supabase.from("wishlist_items").insert({ ownerId: me.id, itemName });
    fetchData();
  }

  function logout() {
    localStorage.removeItem("userName");
    navigate("/");
  }

  const others = users.filter((u) => u.name !== userName);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-600">Loading your gift lists... 🎄</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow-md border-b px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">
          🎄 Family Gift Tracker
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-600">Welcome, {userName}!</span>
          <button
            onClick={logout}
            className="bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="flex gap-8 p-8 max-w-7xl mx-auto">
        {/* Left panel: My Wishlist */}
        <div className="w-96 bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">Your Wishlist</h2>
            <button
              onClick={addMyItem}
              className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <span>Add Gift Idea</span> 🎁
            </button>
          </div>

          {myItems.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Your list is empty! Add some gift ideas 🎁
            </p>
          ) : (
            <div className="space-y-4">
              {myItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-200 transition-colors"
                >
                  <p className="text-gray-700">{item.itemName}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main area: Family Wishlists */}
        <div className="flex-1 bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6">
            Family Wishlists
          </h2>

          <select
            className="w-full mb-6 p-3 border border-gray-300 rounded-lg bg-white text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            value={selectedFamilyMember}
            onChange={(e) => setSelectedFamilyMember(e.target.value)}
          >
            {others.map((u) => (
              <option key={u.id} value={u.name}>
                {u.name}&apos;s List
              </option>
            ))}
          </select>

          {getMemberItems(selectedFamilyMember).length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No items in {selectedFamilyMember}&apos;s list yet! 🎄
            </p>
          ) : (
            <div className="space-y-4">
              {getMemberItems(selectedFamilyMember).map((item) => {
                const purchased = isPurchased(item);
                return (
                  <div
                    key={item.id}
                    className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <p
                      className={`text-gray-700 ${
                        purchased ? "line-through text-gray-400" : ""
                      }`}
                    >
                      {item.itemName}
                    </p>
                    <button
                      onClick={() =>
                        purchased ? unmarkPurchased(item) : markPurchased(item)
                      }
                      className={`px-4 py-2 rounded-lg text-white ${
                        purchased
                          ? "bg-red-500 hover:bg-red-600"
                          : "bg-green-500 hover:bg-green-600"
                      } transition-colors flex items-center gap-2`}
                    >
                      {purchased ? "Unmark 🎁" : "I'll Get This! 🎄"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
