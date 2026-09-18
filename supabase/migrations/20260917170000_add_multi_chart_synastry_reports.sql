-- Seed the ten new multi-chart Unfiltered Series products.
-- Prices remain catalog-controlled and are never used for admin authorization.
INSERT INTO public.report_products
  (id, title, tagline, category, icon, adult, price_cents, is_free, is_published, sort_order, slug)
VALUES
  ('synastry-power-dynamics', 'THE POWER DYNAMICS FILE™', 'Where influence, autonomy, and control collide between two or more charts.', 'Unfiltered Series', '♜', false, 9900, false, true, 1000, 'synastry-power-dynamics'),
  ('synastry-emotional-weather', 'THE EMOTIONAL WEATHER REPORT™', 'The emotional climate created when two or more inner worlds meet.', 'Unfiltered Series', '☾', false, 9900, false, true, 1001, 'synastry-emotional-weather'),
  ('synastry-communication-code', 'THE COMMUNICATION CODE™', 'What the charts say about how people connect, clash, clarify, and misread.', 'Unfiltered Series', '☿', false, 9900, false, true, 1002, 'synastry-communication-code'),
  ('synastry-attraction-architecture', 'THE ATTRACTION ARCHITECTURE™', 'The chart mechanics behind fascination, desire, chemistry, and distance.', 'Unfiltered Series', '♀', false, 9900, false, true, 1003, 'synastry-attraction-architecture'),
  ('synastry-karmic-patterns', 'THE KARMIC THREADS FILE™', 'Symbolic patterns of familiarity, repetition, and growth across two or more charts.', 'Unfiltered Series', '☊', false, 9900, false, true, 1004, 'synastry-karmic-patterns'),
  ('synastry-friendship-alliance', 'THE FRIENDSHIP ALLIANCE™', 'How two or more charts build trust, loyalty, laughter, and shared purpose.', 'Unfiltered Series', '♧', false, 9900, false, true, 1005, 'synastry-friendship-alliance'),
  ('synastry-ambition-coalition', 'THE AMBITION COALITION™', 'What happens when two or more ambitions occupy the same room.', 'Unfiltered Series', '⚒', false, 9900, false, true, 1006, 'synastry-ambition-coalition'),
  ('synastry-vulnerability-mirror', 'THE VULNERABILITY MIRROR™', 'Where closeness, defenses, trust, and emotional exposure meet.', 'Unfiltered Series', '◇', false, 9900, false, true, 1007, 'synastry-vulnerability-mirror'),
  ('synastry-conflict-repair', 'THE CONFLICT & REPAIR ATLAS™', 'Map the friction points—and the evidence-based routes back to connection.', 'Unfiltered Series', '⚔', false, 9900, false, true, 1008, 'synastry-conflict-repair'),
  ('synastry-composite-family', 'THE CONSTELLATION BETWEEN US™', 'A whole-system reading of the bonds, roles, and patterns among multiple charts.', 'Unfiltered Series', '✦', false, 9900, false, true, 1009, 'synastry-composite-family')
ON CONFLICT (id) DO NOTHING;

-- Keep any newly seeded slugs available to the existing unique slug index.
UPDATE public.report_products
SET slug = id
WHERE id IN (
  'synastry-power-dynamics',
  'synastry-emotional-weather',
  'synastry-communication-code',
  'synastry-attraction-architecture',
  'synastry-karmic-patterns',
  'synastry-friendship-alliance',
  'synastry-ambition-coalition',
  'synastry-vulnerability-mirror',
  'synastry-conflict-repair',
  'synastry-composite-family'
) AND slug IS NULL;
