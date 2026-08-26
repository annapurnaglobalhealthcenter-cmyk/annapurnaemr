import { createClient } from '../supabase/server'
import { redirect } from 'next/navigation'

/**
 * Checks if the current authenticated user has the specified permission.
 * Calls the `auth.has_permission` Postgres function we defined in the migration.
 */
export async function checkPermission(permissionName: string): Promise<boolean> {
  const supabase = await createClient()

  // Verify session first
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return false
  }

  // Call the secure RPC function
  const { data: hasPerm, error } = await supabase.rpc('has_permission', {
    required_permission: permissionName
  })

  if (error) {
    console.error('Permission check failed:', error)
    return false
  }

  return hasPerm as boolean
}

/**
 * Utility to enforce permission on a server component or action.
 * Throws a redirect to an unauthorized page if access is denied.
 */
export async function enforcePermission(permissionName: string) {
  const hasAccess = await checkPermission(permissionName)
  if (!hasAccess) {
    redirect('/unauthorized')
  }
}
