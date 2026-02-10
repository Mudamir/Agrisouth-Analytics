-- Add page.generate permission to the permissions table
-- This permission controls access to the Generate page

INSERT INTO permissions (permission_key, name, description, category, is_active)
VALUES (
  'page.generate',
  'Generate Documents',
  'Access to the Generate page for creating invoices and documents',
  'page_access',
  true
)
ON CONFLICT (permission_key) DO NOTHING;

-- Grant this permission to admin role by default
INSERT INTO role_permissions (role, permission_id, granted)
SELECT 
  'admin',
  id,
  true
FROM permissions
WHERE permission_key = 'page.generate'
ON CONFLICT (role, permission_id) DO NOTHING;

-- Grant this permission to manager role by default (same as data access)
INSERT INTO role_permissions (role, permission_id, granted)
SELECT 
  'manager',
  id,
  true
FROM permissions
WHERE permission_key = 'page.generate'
ON CONFLICT (role, permission_id) DO NOTHING;

