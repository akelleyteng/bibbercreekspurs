-- Add approval workflow fields to blog_posts
ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- All existing posts were created by admins → auto-approve them
UPDATE blog_posts SET approval_status = 'APPROVED' WHERE deleted_at IS NULL AND approval_status = 'PENDING';

-- Blog guidelines document (single-row table)
CREATE TABLE IF NOT EXISTS blog_guidelines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content TEXT NOT NULL DEFAULT '',
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default guidelines if none exist
INSERT INTO blog_guidelines (content)
SELECT '<h2>Bibber Creek Spurs 4-H Club Blog Guidelines</h2>
<p>Welcome to the Bibber Creek Spurs 4-H Club blog! We love hearing from our members. Before submitting a post, please read and follow these guidelines:</p>
<h3>Content Standards</h3>
<ul>
  <li>Keep content appropriate for all ages and consistent with 4-H values.</li>
  <li>Write about 4-H projects, club events, animal care, achievements, or personal growth stories.</li>
  <li>Be kind and respectful — no bullying, name-calling, or negative content about others.</li>
  <li>Do not share personal information (phone numbers, home addresses, etc.) of yourself or others.</li>
</ul>
<h3>Photos &amp; Media</h3>
<ul>
  <li>Only use photos you have permission to share.</li>
  <li>Do not post photos that reveal personal locations or sensitive information.</li>
</ul>
<h3>Approval Process</h3>
<ul>
  <li>All member-submitted posts are reviewed by a club leader, admin, or your parent before going live.</li>
  <li>Posts that do not meet these guidelines will be returned with feedback.</li>
  <li>You may edit and resubmit a rejected post after making corrections.</li>
</ul>
<p>Questions? Reach out to a club leader. Happy writing!</p>'
WHERE NOT EXISTS (SELECT 1 FROM blog_guidelines);
