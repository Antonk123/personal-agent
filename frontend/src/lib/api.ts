const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiClient {
  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("session_token");
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${path}`, { ...options, headers });

    if (response.status === 401) {
      localStorage.removeItem("session_token");
      window.location.href = "/auth/login";
      throw new Error("Unauthorized");
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth
  async requestMagicLink(email: string) {
    return this.request("/auth/magic-link", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async verifyToken(token: string) {
    return this.request<{ session_token: string; expires_at: string }>(
      `/auth/verify?token=${token}`
    );
  }

  async verifyCode(email: string, code: string) {
    return this.request<{ session_token: string; expires_at: string }>(
      "/auth/verify-code",
      {
        method: "POST",
        body: JSON.stringify({ email, code }),
      },
    );
  }

  // Chat
  async sendMessage(message: string, conversationId?: string) {
    return this.request<{
      conversation_id: string;
      response: string;
      tokens_used: number;
      refs: Array<{ type: string; id: string; label: string }>;
      message_id?: string;
    }>("/chat/", {
      method: "POST",
      body: JSON.stringify({ message, conversation_id: conversationId }),
    });
  }

  async getConversations() {
    return this.request<Array<{ id: string; title: string; updated_at: string }>>(
      "/chat/conversations"
    );
  }

  async getMessages(conversationId: string) {
    return this.request<
      Array<{
        id: string;
        role: string;
        content: string;
        created_at: string;
        refs?: Array<{ type: string; id: string; label: string }>;
      }>
    >(`/chat/conversations/${conversationId}/messages`);
  }

  async regenerateResponse(conversationId: string) {
    return this.request<{
      conversation_id: string;
      response: string;
      tokens_used: number;
      refs: Array<{ type: string; id: string; label: string }>;
      message_id?: string;
    }>(`/chat/conversations/${conversationId}/regenerate`, {
      method: "POST",
    });
  }

  async backfillTitles() {
    return this.request<{ updated: number }>("/chat/conversations/backfill-titles", {
      method: "POST",
    });
  }

  async renameConversation(conversationId: string, title: string) {
    return this.request<{ id: string; title: string }>(
      `/chat/conversations/${conversationId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ title }),
      },
    );
  }

  async deleteConversation(conversationId: string) {
    const token = this.getToken();
    const response = await fetch(`${API_URL}/chat/conversations/${conversationId}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok && response.status !== 204) {
      throw new Error(`HTTP ${response.status}`);
    }
  }

  // Memory
  async getMemoryStats() {
    return this.request<{ assignments: number; contacts: number; decisions: number }>(
      "/memory/stats"
    );
  }

  async getProfile() {
    return this.request<Record<string, any>>("/memory/profile");
  }

  async updateProfile(data: Record<string, unknown>) {
    return this.request("/memory/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async getAssignments() {
    return this.request<
      Array<{ id: string; name: string; role: string; client: string; phase: string; status: string }>
    >("/memory/assignments");
  }

  async createAssignment(data: Record<string, unknown>) {
    return this.request("/memory/assignments", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getAssignment(id: string) {
    return this.request<Record<string, any>>(`/memory/assignments/${id}`);
  }

  async addContact(assignmentId: string, data: Record<string, unknown>) {
    return this.request(`/memory/assignments/${assignmentId}/contacts`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async addDecision(assignmentId: string, data: Record<string, unknown>) {
    return this.request(`/memory/assignments/${assignmentId}/decisions`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Admin / export
  async exportData() {
    return this.request<Record<string, any>>("/admin/export");
  }

  async health() {
    return this.request<{ status: string }>("/health");
  }
}

export const api = new ApiClient();
