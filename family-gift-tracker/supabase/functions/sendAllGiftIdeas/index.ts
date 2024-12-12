import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.1.1";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

serve(async (req) => {
  try {
    const { method } = req;

    if (method === "OPTIONS") {
      return new Response("OK", { headers: corsHeaders });
    }

    if (method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: corsHeaders,
      });
    }

    const { requesterEmail } = await req.json();

    // Verify that the requester is "Eli"
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("name, email")
      .eq("email", requesterEmail)
      .single();

    // Fetch all users
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, name, email");

    if (usersError) {
      console.error("Error fetching users:", usersError);
      return new Response("Internal Server Error", {
        status: 500,
        headers: corsHeaders,
      });
    }

    // Fetch all wishlist items
    const { data: allItems, error: itemsError } = await supabase
      .from("wishlist_items")
      .select("itemName, itemLink, itemNotes, ownerId (name)");

    if (itemsError) {
      console.error("Error fetching wishlist items:", itemsError);
      return new Response("Internal Server Error", {
        status: 500,
        headers: corsHeaders,
      });
    }

    // Generate email content
    const emailContent = generateChristmassyEmail(allItems);

    // Send email to all users
    for (const user of users) {
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
                subject:
                  "🎄 Complete Gift Ideas for the Season MOTHERF***ERS 🎁",
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

    return new Response("All gift ideas have been sent successfully!", {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response("Internal Server Error", {
      status: 500,
      headers: corsHeaders,
    });
  }
});

function generateChristmassyEmail(items: any[]): string {
  const formattedItems = items
    .map(
      (item) => `
    <li style="margin-bottom: 10px;">
      <strong>${item.itemName}</strong><br/>
      ${
        item.itemLink
          ? `<a href="${item.itemLink}" style="color: #ff0000;">View Item</a><br/>`
          : ""
      }
      ${item.itemNotes ? `<em>Notes:</em> ${item.itemNotes}` : ""}
      <p style="color: #008000;">— Added by ${item.ownerId.name}</p>
    </li>
  `
    )
    .join("");

  return `
    <div style="font-family: 'Verdana', sans-serif; background-color: #f9fafb; padding: 30px; max-width: 700px; margin: 0 auto; border: 2px solid #d9534f; border-radius: 15px;">
      <header style="text-align: center; border-bottom: 3px solid #d9534f; padding-bottom: 15px; margin-bottom: 20px;">
        <h1 style="color: #d9534f;">🎅 Merry Christmas from Family Gift Tracker! 🎄</h1>
      </header>
      <p style="font-size: 18px; color: #333;">Hello,</p>
      <p style="font-size: 18px; color: #333;">Here is the complete list of gift ideas from all your family members:</p>
      <ul style="list-style-type: none; padding: 0;">
        ${formattedItems}
      </ul>
      <p style="font-size: 18px; color: #333;">Wishing you a joyful holiday season! 🎁✨</p>
      <footer style="text-align: center; color: #777; font-size: 14px; margin-top: 30px;">
        If you have any questions, feel free to reach out.
      </footer>
    </div>
  `;
}
