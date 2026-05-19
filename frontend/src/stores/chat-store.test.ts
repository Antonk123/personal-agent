import { beforeEach, describe, expect, it } from "vitest";
import { useChatStore } from "./chat-store";

const initialState = useChatStore.getState();

describe("useChatStore", () => {
  beforeEach(() => {
    useChatStore.setState(initialState, true);
  });

  it("appends a message via addMessage", () => {
    useChatStore.getState().addMessage({
      id: "1",
      role: "user",
      content: "hej",
      created_at: "2026-05-19T10:00:00Z",
    });
    expect(useChatStore.getState().messages).toHaveLength(1);
    expect(useChatStore.getState().messages[0].content).toBe("hej");
  });

  it("reset clears messages, currentConversationId and error", () => {
    const store = useChatStore.getState();
    store.setCurrentConversation("abc");
    store.addMessage({
      id: "x",
      role: "assistant",
      content: "y",
      created_at: "2026-05-19T10:00:00Z",
    });
    store.setError("boom");

    useChatStore.getState().reset();
    const state = useChatStore.getState();
    expect(state.messages).toEqual([]);
    expect(state.currentConversationId).toBeNull();
    expect(state.error).toBeNull();
  });
});
