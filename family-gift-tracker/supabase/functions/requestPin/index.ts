// supabase/functions/requestPin/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.1.1";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Only POST allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { name } = await req.json();
    if (!name) {
      return new Response(JSON.stringify({ error: "Name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("name", name)
      .single();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newPin = String(Math.floor(100000 + Math.random() * 900000));
    const { error: updateError } = await supabase
      .from("users")
      .update({ pin: newPin })
      .eq("id", user.id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Failed to update user PIN" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const emailResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sendgridApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: user.email }],
          },
        ],
        from: {
          email: "bajablast@bajablast@bowlby-bowl-full-of-jelly.com", // Must be verified in SendGrid
          name: "Baja Blast",
        },
        subject: "Your Family Gift Tracker PIN",
        content: [
          {
            type: "text/html",
            value: `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #2563eb;">Family Gift Tracker</h1>
      <p>Hello ${name},</p>
      <p>Your new PIN is: <strong>${newPin}</strong></p>
      <p>Use this PIN to log in to your account.</p>
      <div style="margin: 20px 0;">
        <img src="https://i.pinimg.com/736x/ac/66/53/ac66534653f81ed5263111d3a653de63.jpg" alt="Holiday Meme" style="max-width: 100%; border-radius: 8px;">
        <p style="color: #666; font-style: italic; margin-top: 8px;">Just kidding! Santa might not give you anything, but at least you got your PIN back! 🎅😈🎁</p>
      </div>
      <p style="color: #666;">If you didn't request this PIN, please ignore this email.</p>
    </div>
    `,
          },
        ],
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("SendGrid Error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: errorText }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ message: "PIN sent" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
