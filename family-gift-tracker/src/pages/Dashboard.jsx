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

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-white border-b p-4 flex justify-between">
        <h1 className="text-xl font-bold">Family Gift Tracker</h1>
        <button onClick={logout} className="text-red-600">
          Log Out
        </button>
      </div>
      <div className="flex flex-1">
        {/* Left panel: My Wishlist */}
        <div className="w-64 bg-gray-50 border-r p-4 hidden md:block">
          <h2 className="text-lg font-bold mb-4">Your Wishlist</h2>
          {myItems.map((item) => (
            <div className="border p-2 mb-2" key={item.id}>
              <p>{item.itemName}</p>
              {/* Optionally add edit/delete */}
            </div>
          ))}
          <button
            onClick={addMyItem}
            className="w-full mt-2 bg-blue-500 text-white p-2 rounded"
          >
            + Add Item
          </button>
        </div>

        {/* Main area: Family Wishlists */}
        <div className="flex-1 p-4">
          <h2 className="text-lg font-bold mb-2">View Other&#39s Wishlists</h2>
          <select
            className="border p-2 mb-4"
            value={selectedFamilyMember}
            onChange={(e) => setSelectedFamilyMember(e.target.value)}
          >
            {others.map((u) => (
              <option key={u.id} value={u.name}>
                {u.name}
              </option>
            ))}
          </select>

          {getMemberItems(selectedFamilyMember).map((item) => {
            const purchased = isPurchased(item);
            return (
              <div
                className="border p-2 mb-2 flex justify-between items-center"
                key={item.id}
              >
                <div>
                  <p className={purchased ? "line-through" : ""}>
                    {item.itemName}
                  </p>
                </div>
                <div>
                  {!purchased ? (
                    <button
                      className="bg-green-500 text-white p-1 px-2 rounded"
                      onClick={() => markPurchased(item)}
                    >
                      Mark as Purchased
                    </button>
                  ) : (
                    <button
                      className="bg-red-500 text-white p-1 px-2 rounded"
                      onClick={() => unmarkPurchased(item)}
                    >
                      Unmark
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
