import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.1.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Only POST allowed" }), {
        status: 405,
      });
    }

    const { name } = await req.json();
    if (!name) {
      return new Response(JSON.stringify({ error: "Name is required" }), {
        status: 400,
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
        { status: 500 }
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
            to: [
              {
                email: user.email, // From the user record in Supabase
              },
            ],
          },
        ],
        from: {
          email: "no-reply@yourdomain.com",
          name: "Family Gift Tracker",
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
          <p style="color: #666;">If you didn't request this PIN, please ignore this email.</p>
        </div>
      `,
          },
        ],
      }),
    });

    if (!emailResponse.ok) {
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 500,
      });
    }

    return new Response(JSON.stringify({ message: "PIN sent" }), {
      status: 200,
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
});
