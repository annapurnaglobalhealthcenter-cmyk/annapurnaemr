import { login } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md border">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-blue-900">Annapurna EMR</h1>
          <p className="text-sm text-gray-500 mt-2">Sign in to your account</p>
        </div>

        <form action={login} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input id="email" name="email" type="email" required placeholder="doctor@annapurna.hospital" />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <a href="/reset-password" className="text-xs text-blue-600 hover:underline">Forgot password?</a>
            </div>
            <Input id="password" name="password" type="password" required />
          </div>

          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
            Sign In
          </Button>
        </form>
      </div>
    </div>
  )
}
