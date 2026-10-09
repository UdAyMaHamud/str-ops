import { apiSlice } from "../apiSlice";

// Guest site: stays, quotes, bookings, saved stays + staff booking requests
export const bookingApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getStay: builder.query({
      query: (id) => ({ url: `/public/stays/${id}` }),
      providesTags: (result, error, id) => [{ type: "Stay", id }],
    }),
    getQuote: builder.query({
      query: (params) => ({ url: "/public/quote", params }),
    }),
    createBooking: builder.mutation({
      query: (body) => ({ url: "/booking/create", method: "POST", body }),
      invalidatesTags: (result, error, { property }) => ["Trip", { type: "Stay", id: property }],
    }),
    getMyBookings: builder.query({
      query: () => ({ url: "/booking/my" }),
      providesTags: ["Trip"],
    }),
    cancelBooking: builder.mutation({
      query: (id) => ({ url: `/booking/${id}/cancel`, method: "PUT" }),
      invalidatesTags: ["Trip", "Stay"],
    }),
    reviewBooking: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/booking/${id}/review`, method: "POST", body }),
      invalidatesTags: ["Trip", "Stay"],
    }),
    getWishlist: builder.query({
      query: () => ({ url: "/booking/wishlist" }),
      providesTags: ["Wishlist"],
    }),
    toggleWishlist: builder.mutation({
      query: (property) => ({ url: "/booking/wishlist", method: "POST", body: { property } }),
      invalidatesTags: ["Wishlist"],
    }),
    decideBooking: builder.mutation({
      query: ({ id, decision }) => ({ url: `/booking/${id}/decide`, method: "PATCH", body: { decision } }),
      invalidatesTags: ["Home", { type: "Overview", id: "LIST" }, { type: "Thread", id: "LIST" }],
    }),
  }),
});

export const {
  useGetStayQuery,
  useGetQuoteQuery,
  useCreateBookingMutation,
  useGetMyBookingsQuery,
  useCancelBookingMutation,
  useReviewBookingMutation,
  useGetWishlistQuery,
  useToggleWishlistMutation,
  useDecideBookingMutation,
} = bookingApi;
