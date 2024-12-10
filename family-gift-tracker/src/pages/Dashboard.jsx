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

  useEffect(() => {
    if (!userName) {
      navigate("/");
    } else {
      fetchData();
    }
  }, [userName]);

  async function fetchData() {
    // Get all users
    const { data: allUsers } = await supabase.from("users").select("*");
    setUsers(allUsers || []);

    const me = allUsers.find((u) => u.name === userName);
    // Get my items
    const { data: myData } = await supabase
      .from("wishlist_items")
      .select("*")
      .eq("ownerId", me.id);
    setMyItems(myData || []);

    // Set default selected family member (someone else)
    const others = allUsers.filter((u) => u.name !== userName);
    setSelectedFamilyMember(others[0]?.name || "");

    // Fetch family items once we know user IDs
    const { data: allItems } = await supabase
      .from("wishlist_items")
      .select("*, ownerId (name, id)");
    setFamilyItems(allItems || []);
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

    const { data: updatedAllItems } = await supabase
      .from("wishlist_items")
      .select("*, ownerId (name, id)");
    setFamilyItems(updatedAllItems || []);
  }

  async function unmarkPurchased(item) {
    await supabase
      .from("wishlist_items")
      .update({ purchasedBy: null })
      .eq("id", item.id);
    const { data: updatedAllItems } = await supabase
      .from("wishlist_items")
      .select("*, ownerId (name, id)");
    setFamilyItems(updatedAllItems || []);
  }

  function isPurchased(item) {
    // Item is considered purchased if purchasedBy is not null and current user is not the owner.
    // The owner should not see that it is purchased.
    const me = users.find((u) => u.name === userName);
    if (!me) return false;

    // If I'm viewing another's list:
    // Show purchased if purchasedBy != null
    if (item.purchasedBy && item.ownerId.id !== me.id) {
      return true;
    }
    return false;
  }

  async function addMyItem() {
    const me = users.find((u) => u.name === userName);
    const itemName = prompt("Enter item name:");
    if (!itemName) return;
    await supabase.from("wishlist_items").insert({ ownerId: me.id, itemName });
    const { data: updatedMy } = await supabase
      .from("wishlist_items")
      .select("*")
      .eq("ownerId", me.id);
    setMyItems(updatedMy || []);
  }

  function logout() {
    localStorage.removeItem("userName");
    navigate("/");
  }

  const others = users.filter((u) => u.name !== userName);

  // src/pages/Dashboard.jsx - update the return section
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow-sm border-b px-4 py-3 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">Family Gift Tracker</h1>
        <button
          onClick={logout}
          className="text-red-600 hover:text-red-700 font-medium"
        >
          Log Out
        </button>
      </div>

      <div className="flex gap-6 p-6 max-w-7xl mx-auto">
        {/* Left panel: My Wishlist */}
        <div className="w-80 bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            Your Wishlist
          </h2>
          <div className="space-y-3">
            {myItems.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-gray-50 rounded-md border border-gray-200"
              >
                <p className="text-gray-700">{item.itemName}</p>
              </div>
            ))}
          </div>
          <button
            onClick={addMyItem}
            className="w-full mt-4 bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            + Add Item
          </button>
        </div>

        {/* Main area: Family Wishlists */}
        <div className="flex-1 bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            View Other&apos;s Wishlists
          </h2>
          <select
            className="w-full mb-4 p-2 border border-gray-300 rounded-md bg-white text-gray-700"
            value={selectedFamilyMember}
            onChange={(e) => setSelectedFamilyMember(e.target.value)}
          >
            {others.map((u) => (
              <option key={u.id} value={u.name}>
                {u.name}
              </option>
            ))}
          </select>

          <div className="space-y-3">
            {getMemberItems(selectedFamilyMember).map((item) => {
              const purchased = isPurchased(item);
              return (
                <div
                  key={item.id}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded-md border border-gray-200"
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
                    className={`px-3 py-1 rounded-md text-white ${
                      purchased
                        ? "bg-red-500 hover:bg-red-600"
                        : "bg-green-500 hover:bg-green-600"
                    } transition-colors`}
                  >
                    {purchased ? "Unmark" : "Mark as Purchased"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
