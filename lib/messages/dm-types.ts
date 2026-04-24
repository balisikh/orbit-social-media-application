export type DmThreadRow = {
  id: string;
  user_low: string;
  user_high: string;
  created_at: string;
  updated_at: string;
};

export type DmMessageRow = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type DmThreadSummary = DmThreadRow & {
  peer_id: string;
  peer_handle: string | null;
  peer_display_name: string | null;
  last_preview: string;
  last_at: string | null;
};
