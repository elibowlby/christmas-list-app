import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  base: "/christmas-list-app/",
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify("<VITE_SUPABASE_URL>"),
    "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(
      "<VITE_SUPABASE_ANON_KEY>"
    ),
    "import.meta.env.SENDGRID_API_KEY": JSON.stringify("<SENDGRID_API_KEY>"),
  },
});
