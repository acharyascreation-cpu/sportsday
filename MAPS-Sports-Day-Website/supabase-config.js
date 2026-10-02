// Paste the Project URL and publishable key from Supabase Dashboard > Project Settings > API.
// The publishable key is meant for browser use. Never put a secret/service_role key here.
window.SUPABASE_URL = "https://qzpibdzyxhmwcglaxcdq.supabase.co";
window.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_mOCDL-UOu1tBk-iCkMb8rQ_YhWHnjVr";

window.getSupabaseClient = function () {
    const url = window.SUPABASE_URL;
    const key = window.SUPABASE_PUBLISHABLE_KEY;

    if (!url || url.includes("YOUR_PROJECT_REF") || !key || key.includes("YOUR_SUPABASE")) {
        throw new Error("Add your Supabase Project URL and publishable key in supabase-config.js.");
    }
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
        throw new Error("The Supabase client library did not load. Check your internet connection and refresh.");
    }
    if (!window._sportsDaySupabaseClient) {
        window._sportsDaySupabaseClient = window.supabase.createClient(url, key);
    }
    return window._sportsDaySupabaseClient;
};