import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.1.1";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

serve(async () => {
  try {
    const { data: newItems, error } = await supabase
      .from("wishlist_items")
      .select("id, itemName, itemLink, itemNotes, ownerId, created_at")
      .gte(
        "created_at",
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      );

    if (error) {
      console.error("Error fetching new items:", error);
      return new Response("Internal Server Error", { status: 500 });
    }

    if (!newItems || newItems.length === 0) {
      return new Response("No new items to send.", { status: 200 });
    }

    // Fetch all users
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, name, email");

    if (usersError) {
      console.error("Error fetching users:", usersError);
      return new Response("Internal Server Error", { status: 500 });
    }

    if (!users || users.length === 0) {
      console.error("No users found.");
      return new Response("No users to send emails to.", { status: 200 });
    }

    // Group new items by owner
    const itemsByOwner = newItems.reduce((acc: Record<string, any[]>, item) => {
      if (!acc[item.ownerId]) {
        acc[item.ownerId] = [];
      }
      acc[item.ownerId].push(item);
      return acc;
    }, {});

    // Send summary to each user excluding their own items
    for (const user of users) {
      const otherItems = newItems.filter((item) => item.ownerId !== user.id);
      if (otherItems.length === 0) continue;

      const emailContent = generateEmailContent(user.name, otherItems);

      const emailResponse = await fetch(
        "https://api.sendgrid.com/v3/mail/send",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sendgridApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            personalizations: [
              {
                to: [{ email: user.email }],
                subject: "Daily Summary of New Gift Ideas",
              },
            ],
            from: {
              email: "bajablast@bowlby-bowl-full-of-jelly.com",
              name: "Baja Blast from Family Gift Tracker",
            },
            content: [
              {
                type: "text/html",
                value: emailContent,
              },
            ],
          }),
        }
      );

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error(`SendGrid Error for user ${user.email}:`, errorText);
      }
    }

    return new Response("Daily summaries sent.", { status: 200 });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
});

function generateEmailContent(userName: string, items: any[]): string {
  const formattedItems = items
    .map(
      (item) => `
    <li>
      <strong>${item.itemName}</strong><br/>
      ${item.itemLink ? `<a href="${item.itemLink}">View Item</a><br/>` : ""}
      ${item.itemNotes ? `<em>Notes:</em> ${item.itemNotes}` : ""}
    </li>
  `
    )
    .join("");

  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0f8ff; padding: 20px; max-width: 600px; margin: 0 auto; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <header style="text-align: center; border-bottom: 2px solid #4a90e2; padding-bottom: 10px; margin-bottom: 20px;">
        <h1 style="color: #4a90e2;">🎄 Daily Gift Ideas Summary 🎁</h1>
      </header>
      <p style="font-size: 16px; color: #333;">Hello ${userName},</p>
      <p style="font-size: 16px; color: #333;">Here are the new gift ideas added by your family members today:</p>
      <ul style="list-style-type: none; padding: 0;">
        ${formattedItems}
      </ul>
      <p style="font-size: 16px; color: #333;">Happy gifting! 🛍️</p>
      <footer style="text-align: center; color: #666; font-size: 12px; margin-top: 30px;">
        If you have any questions, feel free to reach out.
      </footer>
    </div>
  `;
}
