/*
# AgriTech core schema: profiles, farms, crops, store, and orders

Plain-English summary
This migration creates everything the AgriTech platform stores: user profiles (with farmer or admin roles), one farm profile per farmer, crop tracking records, a catalog of farm resources, and orders placed from that catalog. It also seeds a starter set of store products.

1. New Tables
- `profiles`: one row per signed-in user. Holds full name and role (farmer or admin). Created automatically when someone signs up.
- `farms`: the farm profile for each user (name, location, coordinates, soil type, size). One farm per user.
- `crops`: crops a farmer is tracking, with planting date, growth stage, health status and notes.
- `products`: resources sold in the store (seeds, fertiliser, irrigation, testing kits). Price is stored in cents.
- `orders`: an order placed by a farmer, with status and total.
- `order_items`: the products in each order, with a snapshot of name and price at purchase time.

2. Functions
- `is_admin()`: returns true when the signed-in user has the admin role.
- `handle_new_user()`: trigger that creates a profile row for every new account.
- `place_order(p_items)`: validates the cart on the server, reads real prices, checks and reduces stock, and creates the order in one step.

3. Security
- Row Level Security is enabled on every table.
- Farmers can only read and change their own farm and crops.
- Farmers can only read their own profile and can only change their display name. Their role cannot be changed from the app.
- Farmers can see active products; only admins can create, edit or delete products.
- Farmers can see their own orders and can not edit them; only admins can change an order status, and only that column.
- Orders are created exclusively through `place_order`, so prices and stock can not be tampered with from the browser.
- Trigger and helper functions are not callable by anonymous or regular users directly.

4. Important notes
- Admin access is granted by setting a profile's role to admin in the database. It is not possible from the app itself.
- Seed products are inserted only when the products table is empty, so re-running this migration does not duplicate them.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'farmer' CHECK (role IN ('farmer', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS farms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  location_name text NOT NULL DEFAULT '',
  latitude double precision,
  longitude double precision,
  soil_type text NOT NULL DEFAULT '',
  size_acres numeric CHECK (size_acres IS NULL OR size_acres >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  variety text NOT NULL DEFAULT '',
  planted_on date,
  stage text NOT NULL DEFAULT 'planted' CHECK (stage IN ('planned', 'planted', 'growing', 'harvested')),
  health text NOT NULL DEFAULT 'good' CHECK (health IN ('good', 'watch', 'critical')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crops_user_id_idx ON crops (user_id);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  description text NOT NULL DEFAULT '',
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  total_cents integer NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders (user_id);

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  unit_price_cents integer NOT NULL CHECK (unit_price_cents >= 0),
  quantity integer NOT NULL CHECK (quantity > 0)
);
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items (order_id);

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$;

REVOKE EXECUTE ON FUNCTION is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

INSERT INTO profiles (id, full_name)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', '')
FROM auth.users
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION place_order(p_items jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_order_id uuid;
  v_total integer := 0;
  v_item jsonb;
  v_product products%ROWTYPE;
  v_qty integer;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to place an order';
  END IF;

  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Your cart is empty';
  END IF;

  INSERT INTO orders (user_id, total_cents) VALUES (v_user, 0)
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := (v_item->>'quantity')::integer;
    IF v_qty IS NULL OR v_qty < 1 OR v_qty > 99 THEN
      RAISE EXCEPTION 'Quantities must be between 1 and 99';
    END IF;

    SELECT * INTO v_product FROM products
    WHERE id = (v_item->>'product_id')::uuid
    FOR UPDATE;

    IF NOT FOUND OR NOT v_product.is_active THEN
      RAISE EXCEPTION 'One of the items in your cart is no longer available';
    END IF;

    IF v_product.stock < v_qty THEN
      RAISE EXCEPTION 'Not enough stock for %', v_product.name;
    END IF;

    UPDATE products SET stock = stock - v_qty WHERE id = v_product.id;

    INSERT INTO order_items (order_id, product_id, product_name, unit_price_cents, quantity)
    VALUES (v_order_id, v_product.id, v_product.name, v_product.price_cents, v_qty);

    v_total := v_total + v_product.price_cents * v_qty;
  END LOOP;

  UPDATE orders SET total_cents = v_total WHERE id = v_order_id;
  RETURN v_order_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION place_order(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION place_order(jsonb) TO authenticated;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON profiles TO authenticated;
GRANT UPDATE (full_name) ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON farms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON crops TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON products TO authenticated;
GRANT SELECT ON orders TO authenticated;
GRANT UPDATE (status) ON orders TO authenticated;
GRANT SELECT ON order_items TO authenticated;

DROP POLICY IF EXISTS "Users view own profile" ON profiles;
CREATE POLICY "Users view own profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins view all profiles" ON profiles;
CREATE POLICY "Admins view all profiles" ON profiles FOR SELECT
  TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Users update own profile name" ON profiles;
CREATE POLICY "Users update own profile name" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users select own farm" ON farms;
CREATE POLICY "Users select own farm" ON farms FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own farm" ON farms;
CREATE POLICY "Users insert own farm" ON farms FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own farm" ON farms;
CREATE POLICY "Users update own farm" ON farms FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own farm" ON farms;
CREATE POLICY "Users delete own farm" ON farms FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users select own crops" ON crops;
CREATE POLICY "Users select own crops" ON crops FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own crops" ON crops;
CREATE POLICY "Users insert own crops" ON crops FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own crops" ON crops;
CREATE POLICY "Users update own crops" ON crops FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own crops" ON crops;
CREATE POLICY "Users delete own crops" ON crops FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Signed-in users view active products" ON products;
CREATE POLICY "Signed-in users view active products" ON products FOR SELECT
  TO authenticated USING (is_active OR is_admin());

DROP POLICY IF EXISTS "Admins insert products" ON products;
CREATE POLICY "Admins insert products" ON products FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins update products" ON products;
CREATE POLICY "Admins update products" ON products FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins delete products" ON products;
CREATE POLICY "Admins delete products" ON products FOR DELETE
  TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Users view own orders" ON orders;
CREATE POLICY "Users view own orders" ON orders FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "Admins update order status" ON orders;
CREATE POLICY "Admins update order status" ON orders FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Users view own order items" ON order_items;
CREATE POLICY "Users view own order items" ON order_items FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
        AND (o.user_id = auth.uid() OR is_admin())
    )
  );

INSERT INTO products (name, category, description, price_cents, stock, image_url)
SELECT * FROM (VALUES
  ('Certified Hybrid Maize Seed (10kg)', 'Seeds', 'High-yield, drought-tolerant hybrid maize seed certified for commercial planting.', 4800, 40, 'https://images.pexels.com/photos/33786601/pexels-photo-33786601.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'),
  ('Organic Compost Blend (25kg)', 'Fertiliser', 'Nutrient-rich compost that improves soil structure and water retention.', 1650, 60, 'https://images.pexels.com/photos/33995853/pexels-photo-33995853.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'),
  ('Drip Irrigation Starter Kit', 'Irrigation', 'Covers up to half an acre with pressure regulators, filters and drip tape.', 12900, 15, 'https://images.pexels.com/photos/10606633/pexels-photo-10606633.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'),
  ('Soil Testing Kit (12 tests)', 'Soil Health', 'Measure pH, nitrogen, phosphorus and potassium in the field in minutes.', 3400, 25, 'https://images.pexels.com/photos/34411687/pexels-photo-34411687.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'),
  ('Neem-Based Bio Pesticide (1L)', 'Pest Control', 'Plant-based pesticide that controls aphids, whiteflies and caterpillars.', 1890, 45, 'https://images.pexels.com/photos/32077725/pexels-photo-32077725.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'),
  ('Tomato Seedling Trays (72 cell)', 'Seeds', 'Strong, healthy tomato seedlings ready for transplanting after 4 weeks.', 1290, 80, 'https://images.pexels.com/photos/6508406/pexels-photo-6508406.jpeg?auto=compress&cs=tinysrgb&h=650&w=940')
) AS seed(name, category, description, price_cents, stock, image_url)
WHERE NOT EXISTS (SELECT 1 FROM products);
