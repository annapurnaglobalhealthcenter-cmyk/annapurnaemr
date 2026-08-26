-- Core Roles and Permissions
CREATE TABLE public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.role_permissions (
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Extended User Profile
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    phone_number TEXT,
    department TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Roles Mapping
CREATE TABLE public.user_roles (
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- Enable RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Initial RLS Policies (Draft)
-- Only authenticated users can read roles and permissions
CREATE POLICY "Allow read access to authenticated users for roles"
    ON public.roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access to authenticated users for permissions"
    ON public.permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access to authenticated users for role_permissions"
    ON public.role_permissions FOR SELECT TO authenticated USING (true);

-- Users can read their own profile, admins can read all
CREATE POLICY "Users can read own profile"
    ON public.user_profiles FOR SELECT TO authenticated 
    USING (auth.uid() = id);

CREATE POLICY "Users can read own roles"
    ON public.user_roles FOR SELECT TO authenticated 
    USING (auth.uid() = user_id);

-- Note: We will need a function to check if a user is an admin to allow broader access,
-- but for now this sets up the fundamental schema.
