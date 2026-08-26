-- Operation Theatre (OT) Module

CREATE TABLE ot_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Active', -- Active, Maintenance, Out of Order
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ot_procedure_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_duration_minutes INTEGER DEFAULT 60,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ot_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    ot_room_id UUID REFERENCES ot_rooms(id),
    procedure_id UUID REFERENCES ot_procedure_master(id),
    primary_surgeon_id UUID REFERENCES user_profiles(id),
    anesthetist_id UUID REFERENCES user_profiles(id),
    scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
    scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'Scheduled', -- Scheduled, PAC_Cleared, In_Progress, Recovery, Completed, Cancelled
    admission_id UUID REFERENCES admissions(id) ON DELETE SET NULL, -- Optional, if part of an IPD admission
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ot_pac_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID UNIQUE REFERENCES ot_schedules(id) ON DELETE CASCADE,
    anesthetist_id UUID REFERENCES user_profiles(id),
    asa_grade VARCHAR(50),
    allergies_reviewed BOOLEAN DEFAULT false,
    airway_assessment TEXT,
    anesthesia_plan TEXT,
    fitness_status VARCHAR(50) DEFAULT 'Fit', -- Fit, Unfit, Review
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ot_intraop_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID UNIQUE REFERENCES ot_schedules(id) ON DELETE CASCADE,
    patient_in_time TIMESTAMP WITH TIME ZONE,
    anesthesia_start_time TIMESTAMP WITH TIME ZONE,
    incision_time TIMESTAMP WITH TIME ZONE,
    surgery_end_time TIMESTAMP WITH TIME ZONE,
    patient_out_time TIMESTAMP WITH TIME ZONE,
    anesthesia_type VARCHAR(100),
    surgical_notes TEXT,
    implants_used TEXT,
    complications TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ot_postop_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID UNIQUE REFERENCES ot_schedules(id) ON DELETE CASCADE,
    pacu_in_time TIMESTAMP WITH TIME ZONE,
    pacu_out_time TIMESTAMP WITH TIME ZONE,
    recovery_score INTEGER,
    post_op_orders TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO ot_rooms (name, department) VALUES 
('OT-1 (Cardiac)', 'Cardiology'),
('OT-2 (General)', 'General Surgery'),
('OT-3 (Ortho)', 'Orthopedics');

INSERT INTO ot_procedure_master (code, name, base_duration_minutes) VALUES
('PROC001', 'Appendectomy', 60),
('PROC002', 'CABG', 240),
('PROC003', 'Total Knee Replacement', 120),
('PROC004', 'Laparoscopic Cholecystectomy', 90);
