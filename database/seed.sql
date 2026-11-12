-- ============================================================
-- BookNest seed data (static data only — no secrets)
-- Idempotent via INSERT OR IGNORE.
-- Demo user accounts are created in server/seed.js because their
-- passwords must be bcrypt-hashed at runtime.
-- ============================================================

INSERT OR IGNORE INTO category (id, name, slug) VALUES
  (1, 'Computer Science',     'computer-science'),
  (2, 'Mathematics',          'mathematics'),
  (3, 'Business & Economics', 'business-economics'),
  (4, 'Engineering',          'engineering'),
  (5, 'Design & Media',       'design-media'),
  (6, 'Languages & Humanities','languages-humanities');

INSERT OR IGNORE INTO book
  (id, title, author, category_id, format, price, condition, stock, description) VALUES

  -- Computer Science
  (1,  'Introduction to Algorithms', 'Thomas H. Cormen', 1, 'used', 220, 'good', 2,
       'The classic algorithms reference used across CS programmes; covers analysis, data structures and graph algorithms.'),
  (2,  'Clean Code: A Handbook of Agile Software Craftsmanship', 'Robert C. Martin', 1, 'used', 180, 'like-new', 1,
       'Practical guidance on writing readable, maintainable code, with worked refactoring examples.'),
  (3,  'Structure and Interpretation of Computer Programs', 'Harold Abelson & Gerald Jay Sussman', 1, 'digital', 120, NULL, 0,
       'The MIT introduction to programming that builds computational thinking from first principles.'),
  (4,  'Database Systems: The Complete Book', 'Hector Garcia-Molina', 1, 'digital', 150, NULL, 0,
       'A thorough treatment of relational design, transactions and query processing.'),
  (5,  'Operating System Concepts', 'Abraham Silberschatz', 1, 'used', 200, 'acceptable', 3,
       'Processes, memory, storage and security explained with the classic dinosaur-cover text.'),
  (6,  'The Pragmatic Programmer', 'Andrew Hunt & David Thomas', 1, 'digital', 130, NULL, 0,
       'Timeless career-level advice on tools, testing and craftsmanship for working developers.'),

  -- Mathematics
  (7,  'Calculus: Early Transcendentals', 'James Stewart', 2, 'used', 250, 'good', 2,
       'A standard first-year calculus text with clear examples and a large exercise bank.'),
  (8,  'Linear Algebra Done Right', 'Sheldon Axler', 2, 'digital', 140, NULL, 0,
       'A proof-focused introduction to vector spaces and linear maps, avoiding determinant-centric proofs.'),
  (9,  'Discrete Mathematics and Its Applications', 'Kenneth H. Rosen', 2, 'used', 210, 'like-new', 1,
       'Logic, sets, combinatorics and graph theory aimed at computing students.'),
  (10, 'Probability and Statistics for Engineers and Scientists', 'Ronald E. Walpole', 2, 'digital', 160, NULL, 0,
       'Applied probability and inference with engineering and science datasets.'),
  (11, 'A Book of Abstract Algebra', 'Charles C. Pinter', 2, 'digital', 110, NULL, 0,
       'A gentle, example-driven route into groups, rings and fields.'),

  -- Business & Economics
  (12, 'Principles of Economics', 'N. Gregory Mankiw', 3, 'used', 240, 'good', 2,
       'The widely used introductory economics text covering micro and macro fundamentals.'),
  (13, 'Corporate Finance', 'Stephen A. Ross', 3, 'digital', 190, NULL, 0,
       'Valuation, capital budgeting and risk from the classic finance curriculum.'),
  (14, 'Marketing Management', 'Philip Kotler', 3, 'used', 260, 'acceptable', 1,
       'Segmentation, positioning and the marketing mix, with contemporary case studies.'),
  (15, 'Financial Accounting: An Integrated Approach', 'Ken Trotman', 3, 'digital', 170, NULL, 0,
       'Recording, reporting and analysing business transactions for beginners.'),
  (16, 'Organizational Behavior', 'Stephen P. Robbins', 3, 'digital', 150, NULL, 0,
       'Motivation, teams, leadership and culture inside modern organisations.'),

  -- Engineering
  (17, 'Engineering Mechanics: Statics', 'R. C. Hibbeler', 4, 'used', 230, 'good', 2,
       'Force systems, equilibrium and structural analysis for first-year mechanics.'),
  (18, 'Fundamentals of Electric Circuits', 'Charles K. Alexander', 4, 'used', 210, 'acceptable', 1,
       'Circuit laws, network theorems and AC analysis with worked solutions.'),
  (19, 'Fluid Mechanics', 'Frank M. White', 4, 'digital', 180, NULL, 0,
       'Fluid properties, statics and dynamics, with engineering applications.'),
  (20, 'Thermodynamics: An Engineering Approach', 'Yunus A. Cengel', 4, 'digital', 200, NULL, 0,
       'Energy, entropy and cycles presented through an intuitive engineering lens.'),
  (21, 'Materials Science and Engineering: An Introduction', 'William D. Callister', 4, 'used', 240, 'like-new', 1,
       'Structure, properties and processing of materials across all classes.'),

  -- Design & Media
  (22, 'The Design of Everyday Things', 'Don Norman', 5, 'digital', 120, NULL, 0,
       'Affordances, signifiers and human-centred design explained through everyday objects.'),
  (23, 'Don''t Make Me Think', 'Steve Krug', 5, 'used', 100, 'like-new', 1,
       'A short, practical classic on web usability and intuitive navigation.'),
  (24, 'Thinking with Type', 'Ellen Lupton', 5, 'digital', 130, NULL, 0,
       'Typography fundamentals — letter, text and grid — for print and screen.'),
  (25, 'Interaction Design: Beyond Human-Computer Interaction', 'Helen Sharp, Yvonne Rogers & Jenny Preece', 5, 'used', 220, 'good', 2,
       'The interaction-design lifecycle, from requirements to evaluation.'),
  (26, 'Graphic Design: The New Basics', 'Ellen Lupton & Jennifer Cole Phillips', 5, 'digital', 140, NULL, 0,
       'Visual form, hierarchy and colour for beginning designers.'),

  -- Languages & Humanities
  (27, 'Academic Writing: A Handbook for International Students', 'Stephen Bailey', 6, 'digital', 120, NULL, 0,
       'Essay structure, citation and academic style for university-level writing.'),
  (28, 'The Elements of Style', 'William Strunk Jr. & E. B. White', 6, 'digital', 80, NULL, 0,
       'The concise guide to clear, correct English prose.'),
  (29, 'English Grammar in Use', 'Raymond Murphy', 6, 'used', 150, 'good', 3,
       'Self-study grammar reference with exercises, popular with non-native speakers.'),
  (30, 'How to Read a Book', 'Mortimer J. Adler & Charles Van Doren', 6, 'used', 90, 'acceptable', 1,
       'A systematic method for reading for understanding across genres.');
