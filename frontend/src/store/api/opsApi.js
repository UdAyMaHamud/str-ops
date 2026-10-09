import { apiSlice } from "../apiSlice";

// Turnovers, smart-home alerts and maintenance tickets
export const opsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getTurnovers: builder.query({
      query: (property) => ({ url: "/turnover/all", params: { property } }),
      providesTags: [{ type: "Turnover", id: "LIST" }],
    }),
    updateTurnoverQc: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/turnover/${id}/qc`, method: "PATCH", body }),
      invalidatesTags: [{ type: "Turnover", id: "LIST" }, { type: "Overview", id: "LIST" }, "Home"],
    }),
    getAlerts: builder.query({
      query: (property) => ({ url: "/alert/all", params: { property } }),
      providesTags: [{ type: "Alert", id: "LIST" }],
    }),
    updateAlert: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/alert/${id}`, method: "PATCH", body }),
      invalidatesTags: [{ type: "Alert", id: "LIST" }, { type: "Overview", id: "LIST" }, "Home"],
    }),
    getTickets: builder.query({
      query: (property) => ({ url: "/ticket/all", params: { property } }),
      providesTags: [{ type: "Ticket", id: "LIST" }],
    }),
    updateTicket: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/ticket/${id}`, method: "PATCH", body }),
      invalidatesTags: [{ type: "Ticket", id: "LIST" }, { type: "Overview", id: "LIST" }, "Home"],
    }),
  }),
});

export const {
  useGetTurnoversQuery,
  useUpdateTurnoverQcMutation,
  useGetAlertsQuery,
  useUpdateAlertMutation,
  useGetTicketsQuery,
  useUpdateTicketMutation,
} = opsApi;
