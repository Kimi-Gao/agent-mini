export interface AgentMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  /** Unix epoch timestamp in milliseconds. */
  timestamp?: number;
}

export interface AgentState {
  id: string;
  messages: AgentMessage[];
  status: "idle" | "running" | "stopped";
}
