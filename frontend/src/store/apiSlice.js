import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { logout } from "./slices/authSlice";

// Tokens live in httpOnly cookies (X_AS-TOKEN / R_FS-TOKEN), so they ride along with
// credentials: 'include' and JavaScript never reads them.
const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
  credentials: "include",
});

// ====== On 401: try the refresh cookie once, retry, otherwise sign out locally
const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);
  const url = typeof args === "string" ? args : args.url;

  // Credential calls (sign in, OTP...) never refresh; the profile check does, so a session
  // survives the 2h access token as long as the 10-day refresh cookie is valid
  const isAuthCall = url.startsWith("/auth/");
  const canRefresh = !isAuthCall || url === "/auth/profile";

  if (result.error && result.error.status === 401 && canRefresh) {
    const refreshResult = await baseQuery({ url: "/auth/refreshtoken", method: "POST" }, api, extraOptions);
    if (refreshResult.data) {
      result = await baseQuery(args, api, extraOptions);
    } else if (!isAuthCall) {
      api.dispatch(logout());
    }
  }
  return result;
};

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Stay", "Trip", "Wishlist", "Home", "Eod", "User", "Overview", "Property", "Thread", "Draft", "Turnover", "Alert", "Ticket", "Screening", "Claim", "Escalation"],
  endpoints: () => ({}),
});
