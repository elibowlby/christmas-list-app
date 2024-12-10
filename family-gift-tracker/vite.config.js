import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  base: "/christmas-list-app/",
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
      "https://qaybgsgencwnbsolinyz.supabase.co"
    ),
    "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFheWJnc2dlbmN3bmJzb2xpbnl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM3ODgyNjQsImV4cCI6MjA0OTM2NDI2NH0.xE6o2cO3AspIqR0jLTb_xFiCF3jQ0AR6_8NWPdM4nRs"
    ),
    "import.meta.env.SENDGRID_API_KEY": JSON.stringify(
      "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"
    ),
  },
});
