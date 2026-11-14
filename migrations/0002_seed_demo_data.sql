-- INKVERSE Initial Demo Stories & Seed Data
-- Migration 0002

-- 1. Seed Initial Users
INSERT OR IGNORE INTO users (id, email, username, display_name, avatar_url, bio, role, status, points, level, interests, show_dislike_stats, created_at, updated_at) VALUES
('usr_shreeharsha', 'shreeharsha@inkverse.online', 'shreeharsha', 'Shree Harsha', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80', 'Founder & Chief Curator at INKVERSE. Passionate about distributed systems, elegant design, and empowering independent writers.', 'admin', 'active', 3850, 7, '["technology","programming","artificial-intelligence","startups"]', 1, 1700000000000, 1700000000000),
('usr_elena', 'elena_writes@inkverse.online', 'elena_writes', 'Elena Rostova', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80', 'Staff Distributed Systems Engineer. Writing about low-latency edge runtimes, consensus algorithms, and software craftsmanship.', 'user', 'active', 1450, 6, '["technology","programming","science"]', 1, 1700000000000, 1700000000000),
('usr_aris', 'aris_thorne@inkverse.online', 'aris_thorne', 'Dr. Aris Thorne', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80', 'AI Researcher & Cognitive Systems Scientist. Exploring neural network scaling laws, latent space representations, and multi-agent systems.', 'user', 'active', 920, 5, '["artificial-intelligence","science"]', 0, 1700000000000, 1700000000000),
('usr_sarah', 'sarah_lin@inkverse.online', 'sarah_lin', 'Sarah Lin', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80', 'Product Builder & Founder. Helping early-stage tech teams transform deep engineering innovations into loved consumer products.', 'user', 'active', 480, 4, '["startups","business","personal-development"]', 0, 1700000000000, 1700000000000),
('usr_alex', 'alex_reader@inkverse.online', 'alex_reader', 'Alex Vance', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80', 'Curious engineer, avid reader, and open-source contributor. Always exploring new horizons in computing.', 'user', 'active', 180, 3, '["technology","programming","lifestyle"]', 0, 1700000000000, 1700000000000);

-- 2. Seed Initial Blogs
INSERT OR IGNORE INTO blogs (
  id, author_id, title, slug, description, content, cover_image, category_id,
  status, published_at, reading_time_minutes, word_count, view_count, like_count, dislike_count,
  is_editor_pick, is_featured, seo_title, seo_description, created_at, updated_at
) VALUES
(
  'blog_edge_computing',
  'usr_elena',
  'The Anatomy of High-Performance Edge Computing',
  'anatomy-high-performance-edge-computing',
  'How global isolate-based runtimes, distributed SQLite, and zero-cold-start architectures are permanently transforming modern web scalability.',
  '<h1>The Paradigm Shift to Global Edge Runtimes</h1><p>For more than two decades, the dominant web deployment pattern was centralized: a cluster of containers or virtual machines running in a primary cloud region, backed by a relational database and fronted by a caching CDN.</p><p>While this model supported the first wave of cloud software, it carries fundamental physics limitations. Light in fiber travels roughly 200 kilometers per millisecond. For a user in Tokyo communicating with a server in Northern Virginia, the minimum round-trip time is bounded by latency of 150 to 200 milliseconds before application execution even begins.</p><h2>The Isolates Revolution</h2><p>Rather than deploying heavy Linux containers with individual operating system overheads, modern edge runtimes utilize lightweight V8 isolates. A single process can host thousands of isolates, each securely sandboxed with microsecond startup times and negligible memory footprints.</p><blockquote>"The fastest request is the one that never has to cross an ocean. Computing at the perimeter fundamentally shifts latency from hundreds of milliseconds to single digits."</blockquote><h2>Distributed Relational Data: The Final Frontier</h2><p>Historically, the hardest part of edge architectures was state. Read caches were easy, but write-heavy relational databases remained tied to a single primary data center. With technologies like Cloudflare D1 and replicated SQLite at the edge, transactions can occur close to where the user lives, replicating asynchronously and maintaining strict query integrity.</p><h3>Key Architectural Takeaways</h3><ul><li>Isolate-based runtimes eliminate cold starts and provide instantaneous scale.</li><li>Decentralized relational data brings transactional consistency to the perimeter.</li><li>Eliminating cross-regional hops drastically boosts Core Web Vitals and user conversion.</li></ul>',
  'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&auto=format&fit=crop&q=80',
  'cat_tech',
  'published',
  1700005000000,
  6,
  1120,
  1420,
  48,
  2,
  1,
  1,
  'The Anatomy of High-Performance Edge Computing | INKVERSE',
  'Discover how global isolate-based runtimes and distributed SQLite redefine web performance and eliminate cold starts.',
  1700005000000,
  1700005000000
),
(
  'blog_why_engineers_write',
  'usr_shreeharsha',
  'Why Great Engineers Write: The Superpower of Clear Communication',
  'why-great-engineers-write-clear-communication',
  'Code is written for machines to execute, but systems are designed for humans to understand. Why clear writing separates senior technologists from the rest.',
  '<h1>The Asynchronous Nature of Modern Engineering</h1><p>In distributed and remote organizations, your code only tells half the story. The decisions, trade-offs, constraints, and mental models behind that code are what determine whether an architecture thrives or collapses under technical debt.</p><h2>Writing as a Thinking Tool</h2><p>Many engineers assume that writing is merely a documentation artifact produced after the real work is finished. In reality, writing is the thinking process itself. When you force yourself to articulate a technical proposal in complete prose, fuzzy assumptions evaporate.</p><blockquote>"If you cannot explain an architecture in clear, concise prose without buzzwords, you do not yet understand the architecture."</blockquote><h2>Building Career Leverage Through Writing</h2><p>Code has linear leverage: it performs the task it was coded to do. Written thought has exponential leverage: a single well-crafted RFC or architectural essay can align hundreds of engineers across multiple time zones, prevent months of wasted engineering effort, and build your reputation across the wider global community.</p><h3>Practical Habits to Cultivate:</h3><ol><li>Write design docs before touching code.</li><li>Document the "why", not just the "how".</li><li>Share your post-mortems transparently.</li><li>Publish public technical essays to distill lessons learned.</li></ol>',
  'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1200&auto=format&fit=crop&q=80',
  'cat_dev',
  'published',
  1700010000000,
  5,
  890,
  3210,
  85,
  1,
  1,
  1,
  'Why Great Engineers Write | INKVERSE',
  'Why written communication is the ultimate lever for software architects and senior engineers.',
  1700010000000,
  1700010000000
),
(
  'blog_llm_attention',
  'usr_aris',
  'Demystifying Large Language Model Attention Mechanisms',
  'demystifying-llm-attention-mechanisms',
  'A rigorous visual and intuitive breakdown of scaled dot-product attention, multi-head projections, and rotary positional embeddings.',
  '<h1>From Vectors to Understanding</h1><p>At the heart of the modern generative artificial intelligence revolution lies a deceptively elegant mathematical operation: scaled dot-product attention. First popularized in the seminal paper <em>Attention Is All You Need</em>, this mechanism transformed natural language processing from sequential recurrent models into massively parallelizable transformer graphs.</p><h2>The Core Formula Explained</h2><p>The standard attention equation calculates compatibility scores between queries and keys:</p><pre><code>Attention(Q, K, V) = softmax((Q * K^T) / sqrt(d_k)) * V</code></pre><p>Here, queries (Q) represent what a token is looking for, keys (K) represent what tokens offer, and values (V) represent the actual substantive content passed forward into the next layer.</p><h2>Why Multi-Head Attention Matters</h2><p>A single attention head can only attend to one relationship at a time (for example, finding the subject of a sentence). Multi-head attention projects inputs into multiple distinct subspaces, allowing the model to simultaneously track syntactic dependencies, semantic affinity, and contextual disambiguation.</p>',
  'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200&auto=format&fit=crop&q=80',
  'cat_ai',
  'published',
  1700015000000,
  8,
  1450,
  2150,
  62,
  0,
  1,
  0,
  'Demystifying LLM Attention Mechanisms | INKVERSE',
  'An intuitive and mathematical walkthrough of transformer self-attention and multi-head projections.',
  1700015000000,
  1700015000000
),
(
  'blog_zero_to_one',
  'usr_sarah',
  'The Zero-to-One Product Compass: Building Software People Love',
  'zero-to-one-product-compass',
  'Essential product discovery frameworks for technical founders navigating the treacherous chasm between functional code and true product-market fit.',
  '<h1>The Fallacy of the Perfect Codebase</h1><p>Every year, thousands of brilliant engineering teams build exquisitely crafted architectures that solve problems nobody actually has. Product-market fit is not an engineering achievement; it is an exercise in rigorous empathy and rapid customer feedback loops.</p><h2>Focusing on the Core Loop</h2><p>Great products rarely succeed by offering forty features moderately well. They succeed because one specific workflow delivers undeniable delight in fewer clicks than the incumbent alternative.</p><blockquote>"Find the single action in your software that produces an undeniable ''Aha!'' moment, and ruthlessly eliminate every obstacle preceding it."</blockquote>',
  'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=1200&auto=format&fit=crop&q=80',
  'cat_startups',
  'published',
  1700020000000,
  4,
  720,
  890,
  34,
  0,
  0,
  0,
  'The Zero-to-One Product Compass | INKVERSE',
  'Frameworks for technical founders bridging the gap between code and customer delight.',
  1700020000000,
  1700020000000
);

-- 3. Seed Achievements & Badges for Users
INSERT OR IGNORE INTO user_achievements (id, user_id, achievement_id, awarded_at) VALUES
('uach_shree_first', 'usr_shreeharsha', 'ach_first_pub', 1700000000000),
('uach_shree_views', 'usr_shreeharsha', 'ach_views_1k', 1700000000000),
('uach_shree_choice', 'usr_shreeharsha', 'ach_editors_choice', 1700000000000),
('uach_elena_first', 'usr_elena', 'ach_first_pub', 1700000000000),
('uach_elena_views', 'usr_elena', 'ach_views_1k', 1700000000000),
('uach_elena_choice', 'usr_elena', 'ach_editors_choice', 1700000000000),
('uach_aris_first', 'usr_aris', 'ach_first_pub', 1700000000000),
('uach_aris_views', 'usr_aris', 'ach_views_1k', 1700000000000);

-- 4. Seed Followers
INSERT OR IGNORE INTO followers (follower_id, following_id, created_at) VALUES
('usr_alex', 'usr_elena', 1700000000000),
('usr_alex', 'usr_shreeharsha', 1700000000000),
('usr_sarah', 'usr_shreeharsha', 1700000000000),
('usr_elena', 'usr_shreeharsha', 1700000000000);

-- 5. Seed Points Ledger Entries
INSERT OR IGNORE INTO points_transactions (id, user_id, amount, transaction_type, reference_id, description, is_reversed, created_at) VALUES
('ptx_shree_01', 'usr_shreeharsha', 20, 'blog_published', 'blog_why_engineers_write', 'Published story "Why Great Engineers Write"', 0, 1700010000000),
('ptx_shree_02', 'usr_shreeharsha', 50, 'editors_pick', 'editor_pick_blog_why_engineers_write', 'Story "Why Great Engineers Write" featured as Editor''s Pick!', 0, 1700011000000),
('ptx_shree_03', 'usr_shreeharsha', 50, 'views_milestone', 'blog_why_engineers_write_views_1000', 'Reached 1,000 verified readers milestone', 0, 1700012000000),
('ptx_elena_01', 'usr_elena', 20, 'blog_published', 'blog_edge_computing', 'Published story "The Anatomy of High-Performance Edge Computing"', 0, 1700005000000),
('ptx_elena_02', 'usr_elena', 50, 'editors_pick', 'editor_pick_blog_edge_computing', 'Story "The Anatomy of High-Performance Edge Computing" featured as Editor''s Pick!', 0, 1700006000000);
