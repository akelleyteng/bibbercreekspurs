-- Link social feed posts to blog posts (for auto-generated blog announcement posts)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS blog_post_id UUID REFERENCES blog_posts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_posts_blog_post_id ON posts(blog_post_id);
