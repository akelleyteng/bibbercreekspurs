-- Admin communications (bulk emails sent by admins)
CREATE TABLE admin_communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES users(id),
  subject VARCHAR(100) NOT NULL,
  body TEXT NOT NULL,
  email_type VARCHAR(50) NOT NULL,
  recipient_group VARCHAR(50) NOT NULL,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  recipient_emails TEXT[],
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  attachments JSONB DEFAULT '[]'::jsonb,
  error_message TEXT,
  sent_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_comms_sender ON admin_communications(sender_id);
CREATE INDEX idx_admin_comms_sent_at ON admin_communications(sent_at DESC);

CREATE TRIGGER update_admin_communications_updated_at
  BEFORE UPDATE ON admin_communications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
