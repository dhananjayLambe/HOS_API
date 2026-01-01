import axiosClient from "./axiosClient";

export interface SupportTicket {
  id: string;
  ticket_number: string;
  user_role: string;
  created_by: string;
  created_by_name?: string;
  doctor?: string;
  doctor_name?: string;
  clinic?: string;
  clinic_name?: string;
  subject: string;
  description: string;
  category: "technical" | "billing" | "appointment" | "prescription" | "account" | "other";
  priority: "low" | "medium" | "high" | "critical";
  status: "open" | "in_progress" | "waiting_for_user" | "resolved" | "closed";
  assigned_to?: string;
  assigned_to_name?: string;
  created_at: string;
  updated_at: string;
  attachments?: SupportTicketAttachment[];
  comments?: SupportTicketComment[];
  attachments_count?: number;
  comments_count?: number;
}

export interface SupportTicketAttachment {
  id: string;
  file: string;
  file_url: string;
  file_name: string;
  file_size: number;
  uploaded_at: string;
}

export interface SupportTicketComment {
  id: string;
  message: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
}

export interface CreateSupportTicketRequest {
  subject: string;
  description: string;
  category: "technical" | "billing" | "appointment" | "prescription" | "account" | "other";
  priority?: "low" | "medium" | "high" | "critical";
  clinic?: string;
}

export interface SupportTicketListResponse {
  status: string;
  message: string;
  data: {
    tickets: SupportTicket[];
    pagination: {
      total_tickets: number;
      total_pages: number;
      current_page: number;
      page_size: number;
      has_next: boolean;
      has_previous: boolean;
    };
  };
}

export interface SupportTicketResponse {
  status: string;
  message: string;
  data: SupportTicket;
}

export interface SupportTicketFilterParams {
  status?: string;
  priority?: string;
  category?: string;
  ticket_number?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}

/**
 * Create a new support ticket
 */
export async function createSupportTicket(
  data: CreateSupportTicketRequest
): Promise<SupportTicketResponse> {
  const response = await axiosClient.post("/support/tickets", data);
  return response.data;
}

/**
 * Get list of support tickets with optional filters
 */
export async function getSupportTickets(
  filters?: SupportTicketFilterParams
): Promise<SupportTicketListResponse> {
  const params = new URLSearchParams();
  
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.append(key, value.toString());
      }
    });
  }

  const queryString = params.toString();
  const url = `/support/tickets${queryString ? `?${queryString}` : ""}`;
  
  const response = await axiosClient.get(url);
  return response.data;
}

/**
 * Get a single support ticket by ID
 */
export async function getSupportTicket(ticketId: string): Promise<SupportTicketResponse> {
  const response = await axiosClient.get(`/support/tickets/${ticketId}`);
  return response.data;
}

/**
 * Upload attachment to a support ticket
 */
export async function uploadTicketAttachment(
  ticketId: string,
  file: File
): Promise<{ status: string; message: string; data: SupportTicketAttachment }> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await axiosClient.post(
    `/support/tickets/${ticketId}/attachments`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
}

/**
 * Add a comment to a support ticket
 */
export async function addTicketComment(
  ticketId: string,
  message: string
): Promise<{ status: string; message: string; data: SupportTicketComment }> {
  const response = await axiosClient.post(`/support/tickets/${ticketId}/comments`, {
    message,
  });
  return response.data;
}

/**
 * Update support ticket (admin/helpdesk only)
 */
export async function updateSupportTicket(
  ticketId: string,
  data: {
    status?: string;
    priority?: string;
    assigned_to?: string;
    category?: string;
    subject?: string;
    description?: string;
  }
): Promise<SupportTicketResponse> {
  const response = await axiosClient.patch(
    `/support/tickets/${ticketId}`,
    data
  );
  return response.data;
}

