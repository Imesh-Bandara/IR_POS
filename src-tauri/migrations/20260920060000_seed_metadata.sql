-- Seed default categories
INSERT OR IGNORE INTO categories (id, name_en, name_si) VALUES 
('cat_general', 'General', 'සාමාන්‍ය'),
('cat_beverages', 'Beverages', 'බීම වර්ග'),
('cat_food', 'Food', 'ආහාර'),
('cat_vegetables', 'Vegetables', 'එළවළු'),
('cat_fruits', 'Fruits', 'පළතුරු'),
('cat_meat_seafood', 'Meat & Seafood', 'මස් සහ මුහුදු ආහාර'),
('cat_dairy_eggs', 'Dairy & Eggs', 'කිරි සහ බිත්තර'),
('cat_bakery', 'Bakery', 'බේකරි නිෂ්පාදන'),
('cat_snacks', 'Snacks & Sweets', 'කෙටි ආහාර සහ රසකැවිලි'),
('cat_personal_care', 'Personal Care', 'පෞද්ගලික සත්කාර'),
('cat_household', 'Household & Cleaning', 'ගෘහස්ථ සහ පිරිසිදු කිරීම්'),
('cat_baby_care', 'Baby Care', 'ළදරු සත්කාර');

-- Seed default brands
INSERT OR IGNORE INTO brands (id, name_en, name_si) VALUES 
('brand_none', 'No Brand', 'වෙළඳ නාමයක් නැත'),
('brand_coca_cola', 'Coca-Cola', 'කොකා-කෝලා'),
('brand_elephant_house', 'Elephant House', 'එලිෆන්ට් හවුස්'),
('brand_munchee', 'Munchee', 'මන්චි'),
('brand_maliban', 'Maliban', 'මැලිබන්'),
('brand_anchor', 'Anchor', 'ඇන්කර්'),
('brand_highland', 'Highland', 'හයිලන්ඩ්'),
('brand_kist', 'Kist', 'කිස්ට්'),
('brand_md', 'MD', 'එම්.ඩී.'),
('brand_prima', 'Prima', 'ප්‍රීමා'),
('brand_sunlight', 'Sunlight', 'සන්ලයිට්'),
('brand_signal', 'Signal', 'සිග්නල්'),
('brand_lifebuoy', 'Lifebuoy', 'ලයිෆ්බෝයි');

-- Seed default units
INSERT OR IGNORE INTO units (id, name_en, name_si, abbreviation) VALUES 
('unit_pcs', 'Pieces', 'කෑලි', 'pcs'),
('unit_kg', 'Kilograms', 'කිලෝග්‍රෑම්', 'kg'),
('unit_g', 'Grams', 'ග්‍රෑම්', 'g'),
('unit_l', 'Liters', 'ලීටර්', 'L'),
('unit_ml', 'Milliliters', 'මිලිලීටර්', 'ml'),
('unit_pack', 'Pack', 'පැකට්', 'pack'),
('unit_bottle', 'Bottle', 'බෝතල්', 'btl');
