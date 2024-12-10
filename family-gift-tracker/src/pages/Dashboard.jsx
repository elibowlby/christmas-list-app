import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [users, setUsers] = useState([]);
  const [myItems, setMyItems] = useState([]);
  // Update initial state to check localStorage
  const [selectedFamilyMember, setSelectedFamilyMember] = useState(
    localStorage.getItem("selectedFamilyMember") || ""
  );
  const [familyItems, setFamilyItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // New state for copy confirmation
  const [copyStatus, setCopyStatus] = useState("");

  // New state variables for collapsible sections
  const [isMyWishlistCollapsed, setIsMyWishlistCollapsed] = useState(true);
  const [isFamilyWishlistCollapsed, setIsFamilyWishlistCollapsed] =
    useState(true);

  // Add effect to save selection to localStorage
  useEffect(() => {
    if (selectedFamilyMember) {
      localStorage.setItem("selectedFamilyMember", selectedFamilyMember);
    }
  }, [selectedFamilyMember]);

  useEffect(() => {
    const storedUserName = localStorage.getItem("userName");
    if (!storedUserName) {
      navigate("/");
      return;
    }
    setUserName(storedUserName);
    fetchData(storedUserName); // Pass userName directly to fetchData
  }, [navigate]);

  // Modify fetchData to preserve selection
  async function fetchData(currentUserName = userName) {
    // Accept userName as parameter
    if (!currentUserName) {
      console.error("No username provided");
      navigate("/");
      return;
    }

    setIsLoading(true);
    try {
      const { data: allUsers } = await supabase.from("users").select("*");
      if (!allUsers?.length) {
        console.error("No users found");
        navigate("/");
        return;
      }
      setUsers(allUsers);

      const me = allUsers.find((u) => u.name === currentUserName);
      if (!me) {
        console.error("User not found:", currentUserName);
        navigate("/");
        return;
      }

      // Fetch my items
      const { data: myData } = await supabase
        .from("wishlist_items")
        .select("*")
        .eq("ownerId", me.id);
      setMyItems(myData || []);

      // Only set initial selected family member if none is selected
      const others = allUsers.filter((u) => u.name !== currentUserName);
      if (!selectedFamilyMember) {
        const storedMember = localStorage.getItem("selectedFamilyMember");
        setSelectedFamilyMember(
          storedMember && others.some((u) => u.name === storedMember)
            ? storedMember
            : others[0]?.name || ""
        );
      }

      // Fetch all items with owner information
      const { data: allItems } = await supabase.from("wishlist_items").select(`
          *,
          owner:ownerId (
            id,
            name
          )
        `);

      // Transform the data to match the expected structure
      const transformedItems =
        allItems?.map((item) => ({
          ...item,
          ownerId: item.owner, // Restructure to match previous format
        })) || [];

      setFamilyItems(transformedItems);
    } catch (error) {
      console.error("Error fetching data:", error);
      navigate("/");
    } finally {
      setIsLoading(false);
    }
  }

  function getMemberItems(memberName) {
    return (
      familyItems.filter((item) => item.ownerId?.name === memberName) || []
    );
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
    // Ensure that only the link and notes can be edited
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

  // Add cleanup on logout
  function logout() {
    localStorage.removeItem("userName");
    localStorage.removeItem("selectedFamilyMember"); // Add this line
    navigate("/");
  }

  // Replace exportList with copyList
  const copyList = (items, memberName) => {
    if (items.length === 0) {
      alert(`${memberName}'s list is empty!`);
      return;
    }

    const formattedList =
      `🎄 ${memberName}'s Wishlist 🎁\n\n` +
      items
        .map((item, index) => {
          const purchased = isPurchased(item);
          return `${index + 1}. ${item.itemName}${
            purchased ? " (Already being gifted by someone)" : ""
          }\n   Link: ${item.itemLink || "N/A"}\n   Notes: ${
            item.itemNotes || "N/A"
          }\n`;
        })
        .join("\n");

    navigator.clipboard
      .writeText(formattedList)
      .then(() => {
        setCopyStatus("Copied to clipboard!");
        setTimeout(() => setCopyStatus(""), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
        setCopyStatus("Failed to copy.");
        setTimeout(() => setCopyStatus(""), 2000);
      });
  };

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
            <div className="flex items-center">
              {/* Toggle button visible only on mobile */}
              <button
                className="md:hidden text-primary focus:outline-none p-1 mr-2"
                onClick={() => setIsMyWishlistCollapsed(!isMyWishlistCollapsed)}
              >
                {isMyWishlistCollapsed ? "▼" : "▲"}
              </button>
              <h2 className="text-2xl font-bold text-primary">Your Wishlist</h2>
            </div>
            <button
              onClick={addMyItem}
              className="bg-secondary text-white p-3 rounded-lg hover:bg-secondary-hover transition-colors flex items-center gap-2 ml-2"
            >
              <span>Add Gift Idea</span> 🎁
            </button>
          </div>

          {/* Conditionally render My Wishlist content based on collapse state on mobile */}
          <div
            className={`${isMyWishlistCollapsed ? "hidden" : "block"} md:block`}
          >
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
                    <div className="flex items-start justify-between mb-2">
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
                        className="text-secondary underline mt-2 mb-2"
                      >
                        View Item
                      </a>
                    )}
                    {item.itemNotes && (
                      <p className="text-gray-600 mt-2 italic mb-2">
                        {item.itemNotes}
                      </p>
                    )}
                    {/* Adjust spacing to match title and button */}
                    <div className="flex justify-between items-center mt-2">
                      {/* Spacer to align the button */}
                      <div className="flex-1"></div>
                      {/* "I'll Get This" button */}
                      {!item.itemLink && <div className="pb-4"></div>}
                      <button
                        onClick={() => markPurchased(item)}
                        className={`px-4 py-2 rounded-lg text-white bg-primary hover:bg-primary-hover transition-colors flex items-center gap-2`}
                      >
                        I&apos;ll Get This! 🎄
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main area: Family Wishlists */}
        <div className="flex-1 bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              {/* Toggle button visible only on mobile */}
              <button
                className="md:hidden text-primary focus:outline-none p-1 mr-2"
                onClick={() =>
                  setIsFamilyWishlistCollapsed(!isFamilyWishlistCollapsed)
                }
              >
                {isFamilyWishlistCollapsed ? "▼" : "▲"}
              </button>
              <h2 className="text-2xl font-bold text-primary">
                Family Wishlists
              </h2>
            </div>
          </div>

          {/* Conditionally render Family Wishlists content based on collapse state on mobile */}
          <div
            className={`${
              isFamilyWishlistCollapsed ? "hidden" : "block"
            } md:block`}
          >
            <div className="flex justify-between items-center mb-4">
              <select
                className="w-full mb-0 p-3 border border-primary rounded-lg bg-white text-primary focus:border-secondary focus:ring-2 focus:ring-secondary"
                value={selectedFamilyMember}
                onChange={(e) => setSelectedFamilyMember(e.target.value)}
              >
                {others.map((u) => (
                  <option key={u.id} value={u.name}>
                    {u.name}&apos;s List
                  </option>
                ))}
              </select>
              <button
                onClick={() =>
                  copyList(
                    getMemberItems(selectedFamilyMember),
                    selectedFamilyMember
                  )
                }
                className="ml-4 bg-accent text-white px-4 py-2 rounded-lg hover:bg-accent-hover transition-colors"
              >
                Copy List 📋
              </button>
            </div>

            {copyStatus && <p className="text-green-500 mb-4">{copyStatus}</p>}

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
                          <p className="text-gray-600 mt-1 italic mb-2 md:mb-0">
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
                            className="text-secondary underline text-sm mt-1 mb-4 md:mb-0 block"
                          >
                            View Item
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2 md:mt-0">
                        {purchased && isOwnPurchase ? (
                          <button
                            onClick={() => unmarkPurchased(item)}
                            className={`px-4 py-2 rounded-lg text-white bg-secondary hover:bg-secondary-hover transition-colors flex items-center gap-2`}
                          >
                            Unmark 🎁
                          </button>
                        ) : purchased && !isOwnPurchase ? (
                          <button
                            onClick={() =>
                              alert(
                                "You cannot unmark this item since someone else has already marked it."
                              )
                            }
                            disabled
                            className={`px-4 py-2 rounded-lg text-white bg-secondary opacity-50 cursor-not-allowed`}
                          >
                            Unmark 🎁
                          </button>
                        ) : (
                          <button
                            onClick={() => markPurchased(item)}
                            className={`px-4 py-2 rounded-lg text-white bg-primary hover:bg-primary-hover transition-colors flex items-center gap-2`}
                          >
                            I&apos;ll Get This! 🎄
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
