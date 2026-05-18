export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("session_token");
}

export function setSession(token: string) {
  localStorage.setItem("session_token", token);
}

export function clearSession() {
  localStorage.removeItem("session_token");
}
