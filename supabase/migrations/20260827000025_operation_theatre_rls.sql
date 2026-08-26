-- Add RLS to OT Module

ALTER TABLE ot_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE ot_procedure_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE ot_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ot_pac_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ot_intraop_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ot_postop_records ENABLE ROW LEVEL SECURITY;

-- ot_rooms (Viewable by all logged-in, managed by Admin/OT Manager)
CREATE POLICY "Enable read access for all authenticated users on ot_rooms"
ON ot_rooms FOR SELECT TO authenticated USING (true);

-- ot_procedure_master (Viewable by all logged-in)
CREATE POLICY "Enable read access for all authenticated users on ot_procedure_master"
ON ot_procedure_master FOR SELECT TO authenticated USING (true);

-- ot_schedules (Viewable by authenticated, manageable by ot.manage)
CREATE POLICY "Enable read access for all authenticated users on ot_schedules"
ON ot_schedules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for ot.manage on ot_schedules"
ON ot_schedules FOR INSERT TO authenticated 
WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur JOIN role_permissions rp ON ur.role_id = rp.role_id JOIN permissions p ON rp.permission_id = p.id WHERE ur.user_id = auth.uid() AND p.code = 'ot.manage'));

CREATE POLICY "Enable update for ot.manage on ot_schedules"
ON ot_schedules FOR UPDATE TO authenticated 
USING (EXISTS (SELECT 1 FROM user_roles ur JOIN role_permissions rp ON ur.role_id = rp.role_id JOIN permissions p ON rp.permission_id = p.id WHERE ur.user_id = auth.uid() AND p.code = 'ot.manage'));

-- ot_pac_records
CREATE POLICY "Enable read access for all authenticated users on ot_pac_records"
ON ot_pac_records FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for ot.manage on ot_pac_records"
ON ot_pac_records FOR INSERT TO authenticated 
WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur JOIN role_permissions rp ON ur.role_id = rp.role_id JOIN permissions p ON rp.permission_id = p.id WHERE ur.user_id = auth.uid() AND p.code = 'ot.manage'));

-- ot_intraop_records
CREATE POLICY "Enable read access for all authenticated users on ot_intraop_records"
ON ot_intraop_records FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for ot.manage on ot_intraop_records"
ON ot_intraop_records FOR INSERT TO authenticated 
WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur JOIN role_permissions rp ON ur.role_id = rp.role_id JOIN permissions p ON rp.permission_id = p.id WHERE ur.user_id = auth.uid() AND p.code = 'ot.manage'));

-- ot_postop_records
CREATE POLICY "Enable read access for all authenticated users on ot_postop_records"
ON ot_postop_records FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for ot.manage on ot_postop_records"
ON ot_postop_records FOR INSERT TO authenticated 
WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur JOIN role_permissions rp ON ur.role_id = rp.role_id JOIN permissions p ON rp.permission_id = p.id WHERE ur.user_id = auth.uid() AND p.code = 'ot.manage'));
