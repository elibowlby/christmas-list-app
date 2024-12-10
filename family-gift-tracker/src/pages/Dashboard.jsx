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
    const me = users.find((u) => u.name === userName);
    if (item.purchasedBy !== me.id) {
      console.error("You do not have permission to unmark this item.");
      return;
    }
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
    const itemLink = window.prompt("Add a link for the item (optional):");
    const itemNotes = window.prompt("Add notes for the item (optional):");
    if (!itemName?.trim()) return;

    await supabase
      .from("wishlist_items")
      .insert({ ownerId: me.id, itemName, itemLink, itemNotes });
    fetchData();
  }

  async function editItemLink(item) {
    const newLink = window.prompt(
      "Edit the link for this item:",
      item.itemLink || ""
    );
    const newNotes = window.prompt(
      "Edit the notes for this item:",
      item.itemNotes || ""
    );
    if (newLink === null && newNotes === null) return;

    await supabase
      .from("wishlist_items")
      .update({ itemLink: newLink, itemNotes: newNotes })
      .eq("id", item.id);
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
    <div className="min-h-screen bg-gray-100 overflow-x-hidden">
      <div className="bg-white shadow-md border-b px-6 py-4 flex flex-col md:flex-row justify-between items-center">
        <h1 className="text-3xl font-bold text-primary">
          🎄 Family Gift Tracker
        </h1>
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <span className="text-secondary">Welcome, {userName}!</span>
          <button
            onClick={logout}
            className="bg-secondary text-white px-4 py-2 rounded-lg hover:bg-secondary-hover transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8 p-4 md:p-8 max-w-7xl mx-auto overflow-x-hidden">
        {/* Left panel: My Wishlist */}
        <div className="w-full md:w-96 bg-white rounded-xl shadow-sm p-6 flex-shrink-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-primary">Your Wishlist</h2>
            <button
              onClick={addMyItem}
              className="bg-secondary text-white p-3 rounded-lg hover:bg-secondary-hover transition-colors flex items-center gap-2"
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
                  className="p-4 bg-background rounded-lg shadow hover:shadow-lg transition-shadow duration-300 flex flex-col border border-primary"
                >
                  <div className="flex justify-between items-center">
                    <p className="text-gray-800 font-semibold">
                      {item.itemName}
                    </p>
                    <button
                      onClick={() => editItemLink(item)}
                      className="bg-accent text-white px-3 py-1 rounded hover:bg-accent-hover transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                  {item.itemLink && (
                    <a
                      href={
                        item.itemLink.startsWith("http")
                          ? item.itemLink
                          : `https://${item.itemLink}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-secondary underline mt-2"
                    >
                      View Item
                    </a>
                  )}
                  {item.itemNotes && (
                    <p className="text-gray-600 mt-2 italic">
                      {item.itemNotes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main area: Family Wishlists */}
        <div className="flex-1 bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-2xl font-bold text-primary mb-6">
            Family Wishlists
          </h2>

          <select
            className="w-full mb-6 p-3 border border-primary rounded-lg bg-white text-primary focus:border-secondary focus:ring-2 focus:ring-secondary"
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
                const isOwnPurchase =
                  item.purchasedBy ===
                  users.find((u) => u.name === userName)?.id;

                return (
                  <div
                    key={item.id}
                    className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-background rounded-lg shadow hover:shadow-lg transition-shadow duration-300 border border-primary"
                  >
                    <div className="flex-1">
                      <p
                        className={`text-gray-800 font-medium ${
                          purchased ? "line-through text-gray-400" : ""
                        }`}
                      >
                        {item.itemName}
                      </p>
                      {item.itemNotes && (
                        <p className="text-gray-600 mt-1 italic">
                          {item.itemNotes}
                        </p>
                      )}
                      {item.itemLink && (
                        <a
                          href={
                            item.itemLink.startsWith("http")
                              ? item.itemLink
                              : `https://${item.itemLink}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-secondary underline text-sm mt-1 block"
                        >
                          View Item
                        </a>
                      )}
                    </div>
                    {purchased && isOwnPurchase ? (
                      <button
                        onClick={() => unmarkPurchased(item)}
                        className={`mt-2 md:mt-0 px-4 py-2 rounded-lg text-white bg-secondary hover:bg-secondary-hover transition-colors flex items-center gap-2`}
                      >
                        Unmark 🎁
                      </button>
                    ) : !purchased ? (
                      <button
                        onClick={() => markPurchased(item)}
                        className={`mt-2 md:mt-0 px-4 py-2 rounded-lg text-white bg-primary hover:bg-primary-hover transition-colors flex items-center gap-2`}
                      >
                        I'll Get This! 🎄
                      </button>
                    ) : null}
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
