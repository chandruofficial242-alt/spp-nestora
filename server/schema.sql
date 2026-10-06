-- ==============================================================================
-- SPP NESTORA — PRODUCTION POSTGRESQL DATABASE SCHEMA
-- "Find Your Place. Build Your Future."
-- High-Performance Relational Schema with Constraints, Indexes, and Audit Logs
-- ==============================================================================

-- Enable UUID extension if supported
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(32) NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (role IN ('customer', 'dealer', 'admin')),
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(64) NOT NULL,
    avatar TEXT,
    business_name VARCHAR(255),
    district VARCHAR(100),
    city VARCHAR(100),
    address TEXT,
    dealer_type VARCHAR(64) CHECK (dealer_type IN ('individual', 'agency', 'builder', 'promoter')),
    dealer_status VARCHAR(32) CHECK (dealer_status IN ('pending', 'verified', 'rejected', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_dealer_status ON users(dealer_status);

-- 2. PROPERTIES TABLE
CREATE TABLE IF NOT EXISTS properties (
    id VARCHAR(64) PRIMARY KEY,
    property_code VARCHAR(32) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    title_ta VARCHAR(500),
    description TEXT NOT NULL,
    description_ta TEXT,
    type VARCHAR(32) NOT NULL CHECK (type IN ('land_sale', 'house_sale', 'house_rent')),
    status VARCHAR(32) NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'available', 'under_discussion', 'sold', 'rented', 'hidden', 'rejected', 'archived')),
    price NUMERIC(15, 2) NOT NULL,
    price_negotiable BOOLEAN DEFAULT false,
    state VARCHAR(64) NOT NULL DEFAULT 'Tamil Nadu',
    district VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    taluk VARCHAR(100),
    area VARCHAR(150) NOT NULL,
    locality VARCHAR(150),
    address TEXT NOT NULL,
    pincode VARCHAR(16) NOT NULL,
    area_sqft NUMERIC(10, 2) NOT NULL,
    bedrooms INTEGER,
    bathrooms INTEGER,
    balconies INTEGER,
    floors INTEGER,
    facing VARCHAR(32),
    furnishing VARCHAR(32) CHECK (furnishing IN ('unfurnished', 'semi-furnished', 'fully-furnished')),
    parking VARCHAR(32) CHECK (parking IN ('none', 'bike', 'car', 'both')),
    water_source JSONB DEFAULT '[]'::jsonb,
    plot_dimensions VARCHAR(100),
    zoning_type VARCHAR(32) CHECK (zoning_type IN ('residential', 'commercial', 'agricultural', 'industrial')),
    dtcp_approved BOOLEAN DEFAULT false,
    rera_approved BOOLEAN DEFAULT false,
    patta_available BOOLEAN DEFAULT false,
    amenities JSONB DEFAULT '[]'::jsonb,
    video_url TEXT,
    dealer_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    dealer_name VARCHAR(255) NOT NULL,
    dealer_phone_private VARCHAR(32), -- PRIVATE: Stripped in all public responses
    dealer_email_private VARCHAR(255), -- PRIVATE: Stripped in all public responses
    verified BOOLEAN DEFAULT false,
    featured BOOLEAN DEFAULT false,
    views_count INTEGER DEFAULT 0,
    favorites_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(type);
CREATE INDEX IF NOT EXISTS idx_properties_district ON properties(district);
CREATE INDEX IF NOT EXISTS idx_properties_area ON properties(area);
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price);
CREATE INDEX IF NOT EXISTS idx_properties_dealer_id ON properties(dealer_id);
CREATE INDEX IF NOT EXISTS idx_properties_code ON properties(property_code);

-- 3. PROPERTY IMAGES TABLE
CREATE TABLE IF NOT EXISTS property_images (
    id VARCHAR(64) PRIMARY KEY,
    property_id VARCHAR(64) NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    is_cover BOOLEAN DEFAULT false,
    caption VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_property_images_prop_id ON property_images(property_id);

-- 4. CRM ENQUIRIES TABLE
CREATE TABLE IF NOT EXISTS enquiries (
    id VARCHAR(64) PRIMARY KEY,
    property_id VARCHAR(64) NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    property_code VARCHAR(32) NOT NULL,
    property_title VARCHAR(500) NOT NULL,
    property_price NUMERIC(15, 2) NOT NULL,
    property_district VARCHAR(100) NOT NULL,
    property_area VARCHAR(150) NOT NULL,
    dealer_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    customer_id VARCHAR(64),
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(32) NOT NULL,
    customer_email VARCHAR(255),
    message TEXT NOT NULL,
    channel VARCHAR(32) NOT NULL CHECK (channel IN ('call', 'whatsapp', 'form', 'site_visit')),
    status VARCHAR(32) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'follow_up', 'site_visit_scheduled', 'completed', 'closed')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status);
CREATE INDEX IF NOT EXISTS idx_enquiries_dealer_id ON enquiries(dealer_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_prop_id ON enquiries(property_id);

-- 5. SITE VISITS TABLE
CREATE TABLE IF NOT EXISTS site_visits (
    id VARCHAR(64) PRIMARY KEY,
    property_id VARCHAR(64) NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    property_code VARCHAR(32) NOT NULL,
    property_title VARCHAR(500) NOT NULL,
    property_address TEXT NOT NULL,
    dealer_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    customer_id VARCHAR(64) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(32) NOT NULL,
    visit_date DATE NOT NULL,
    visit_time VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'scheduled', 'confirmed', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_site_visits_status ON site_visits(status);
CREATE INDEX IF NOT EXISTS idx_site_visits_customer_id ON site_visits(customer_id);
CREATE INDEX IF NOT EXISTS idx_site_visits_dealer_id ON site_visits(dealer_id);

-- 6. PAYMENTS TABLE (₹10 LISTING FEE)
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(100) UNIQUE NOT NULL,
    payment_id VARCHAR(100) UNIQUE,
    razorpay_signature VARCHAR(255),
    receipt_id VARCHAR(100) UNIQUE NOT NULL,
    property_id VARCHAR(64) NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    dealer_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(8) NOT NULL DEFAULT 'INR',
    status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
    fee_type VARCHAR(64) NOT NULL DEFAULT 'listing_fee',
    payment_method VARCHAR(64) DEFAULT 'razorpay',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_dealer_id ON payments(dealer_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);

-- 7. PROPERTY STATUS AUDIT HISTORY
CREATE TABLE IF NOT EXISTS status_history (
    id VARCHAR(64) PRIMARY KEY,
    property_id VARCHAR(64) NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    property_code VARCHAR(32) NOT NULL,
    previous_status VARCHAR(32) NOT NULL,
    new_status VARCHAR(32) NOT NULL,
    changed_by_user_id VARCHAR(64) NOT NULL,
    changed_by_role VARCHAR(32) NOT NULL,
    reason TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_status_history_prop_id ON status_history(property_id);

-- 8. TERMS ACCEPTANCES AUDIT LOG
CREATE TABLE IF NOT EXISTS terms_acceptances (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64),
    user_email VARCHAR(255),
    ip_address VARCHAR(64),
    terms_version VARCHAR(32) NOT NULL DEFAULT 'v1.0',
    language VARCHAR(8) NOT NULL DEFAULT 'en',
    accepted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. ADMIN CENTRALIZED SETTINGS TABLE
CREATE TABLE IF NOT EXISTS admin_settings (
    id VARCHAR(32) PRIMARY KEY DEFAULT 'main_settings',
    app_name VARCHAR(100) NOT NULL DEFAULT 'SPP Nestora',
    official_phone VARCHAR(32) NOT NULL DEFAULT '9715673055',
    official_phone_display VARCHAR(32) NOT NULL DEFAULT '+91 97156 73055',
    official_whatsapp VARCHAR(32) NOT NULL DEFAULT '919715673055',
    official_whatsapp_display VARCHAR(32) NOT NULL DEFAULT '+91 97156 73055',
    official_email VARCHAR(255) NOT NULL DEFAULT 'chandru.official242@gmail.com',
    support_hours VARCHAR(100) NOT NULL DEFAULT 'Mon - Sat: 9:00 AM - 8:00 PM IST',
    office_address TEXT NOT NULL DEFAULT 'SPP Nestora HQ, 4th Floor, Anna Salai Commercial Hub, Chennai, Tamil Nadu 600002',
    listing_fee_amount NUMERIC(10, 2) NOT NULL DEFAULT 10.00,
    currency_symbol VARCHAR(8) NOT NULL DEFAULT '₹',
    currency_code VARCHAR(8) NOT NULL DEFAULT 'INR',
    auto_approve_dealers BOOLEAN DEFAULT false,
    auto_approve_properties BOOLEAN DEFAULT false,
    banner_notice_en TEXT,
    banner_notice_ta TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    title_ta VARCHAR(255),
    message TEXT NOT NULL,
    message_ta TEXT,
    type VARCHAR(32) NOT NULL DEFAULT 'system',
    read BOOLEAN DEFAULT false,
    link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
