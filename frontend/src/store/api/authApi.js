import { apiSlice } from "../apiSlice";

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    signUp: builder.mutation({
      query: (body) => ({ url: "/auth/signup", method: "POST", body }),
    }),
    verifyOtp: builder.mutation({
      query: (body) => ({ url: "/auth/verifyotp", method: "POST", body }),
    }),
    resendOtp: builder.mutation({
      query: (email) => ({ url: "/auth/resendotp", method: "POST", body: { email } }),
    }),
    signIn: builder.mutation({
      query: (body) => ({ url: "/auth/signin", method: "POST", body }),
    }),
    googleAuth: builder.mutation({
      // Accepts the Google credential, or { credential, as } when signing up
      query: (arg) => ({ url: "/auth/google", method: "POST", body: typeof arg === "string" ? { credential: arg } : arg }),
    }),
    forgotPassword: builder.mutation({
      query: (email) => ({ url: "/auth/forgotpassword", method: "POST", body: { email } }),
    }),
    resetPassword: builder.mutation({
      query: (body) => ({ url: "/auth/resetpassword", method: "POST", body }),
    }),
    logout: builder.mutation({
      query: () => ({ url: "/auth/logout", method: "POST" }),
    }),
    getProfile: builder.query({
      query: () => ({ url: "/auth/profile" }),
    }),
    getSetupStatus: builder.query({
      query: () => ({ url: "/system/setup" }),
      providesTags: ["Home"],
    }),
    syncHostaway: builder.mutation({
      query: () => ({ url: "/system/hostaway/sync", method: "POST" }),
      invalidatesTags: ["Home", { type: "Property", id: "LIST" }, { type: "Overview", id: "LIST" }],
    }),
    getSystemInfo: builder.query({
      query: () => ({ url: "/system/info" }),
    }),
  }),
});

export const {
  useSignUpMutation,
  useVerifyOtpMutation,
  useResendOtpMutation,
  useSignInMutation,
  useGoogleAuthMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useLogoutMutation,
  useGetProfileQuery,
  useGetSystemInfoQuery,
  useGetSetupStatusQuery,
  useSyncHostawayMutation,
} = authApi;
