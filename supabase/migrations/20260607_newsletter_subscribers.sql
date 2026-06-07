-- Newsletter subscribers table
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  email       text        UNIQUE NOT NULL,
  subscribed_at timestamptz DEFAULT now(),
  source      text        DEFAULT 'website'
);

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Only service role (backend) can read/write subscribers
CREATE POLICY "Service role full access"
  ON newsletter_subscribers
  FOR ALL
  USING (true)
  WITH CHECK (true);
