import { apiRequest } from "./client";
import type { ContactMessageCreateRequest, ContactMessageCreateResponse } from "../types";

export function createContactMessage(payload: ContactMessageCreateRequest) {
  return apiRequest<ContactMessageCreateResponse>("/api/contact/messages", {
    method: "POST",
    body: payload
  });
}

