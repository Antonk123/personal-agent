import { create } from "zustand";

export interface MessageRef {
  type: string;
  id: string;
  label: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  refs?: MessageRef[];
}

interface Conversation {
  id: string;
  title: string | null;
  updated_at: string;
}

interface ChatState {
  conversations: Conversation[];
  currentConversationId: string | null;
  messages: Message[];
  isLoading: boolean;
  error: string | null;

  setConversations: (conversations: Conversation[]) => void;
  setCurrentConversation: (id: string | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  renameConversation: (id: string, title: string) => void;
  removeConversation: (id: string) => void;
  popLastAssistantMessage: () => void;
  appendToLastMessage: (chunk: string) => void;
  updateLastMessageMeta: (meta: { id: string; refs?: MessageRef[] }) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  currentConversationId: null,
  messages: [],
  isLoading: false,
  error: null,

  setConversations: (conversations) => set({ conversations }),
  setCurrentConversation: (id) => set({ currentConversationId: id }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  reset: () => set({ messages: [], currentConversationId: null, error: null }),
  renameConversation: (id, title) =>
    set((state) => ({
      conversations: state.conversations.map((c) => (c.id === id ? { ...c, title } : c)),
    })),
  removeConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      currentConversationId:
        state.currentConversationId === id ? null : state.currentConversationId,
      messages: state.currentConversationId === id ? [] : state.messages,
    })),
  popLastAssistantMessage: () =>
    set((state) => {
      const lastIdx = state.messages.length - 1;
      if (lastIdx < 0 || state.messages[lastIdx].role !== "assistant") {
        return state;
      }
      return { messages: state.messages.slice(0, lastIdx) };
    }),
  appendToLastMessage: (chunk) =>
    set((state) => {
      const msgs = [...state.messages];
      const last = msgs[msgs.length - 1];
      if (last) msgs[msgs.length - 1] = { ...last, content: last.content + chunk };
      return { messages: msgs };
    }),
  updateLastMessageMeta: (meta) =>
    set((state) => {
      const msgs = [...state.messages];
      const last = msgs[msgs.length - 1];
      if (last) msgs[msgs.length - 1] = { ...last, id: meta.id, refs: meta.refs };
      return { messages: msgs };
    }),
}));
