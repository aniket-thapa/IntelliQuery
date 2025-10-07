import { useState } from 'react';
import api from '../lib/api';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Mail, LoaderCircle } from 'lucide-react';

export default function RequestPasswordReset() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const res = await api.post('/auth/request-password-reset', { email });
      if (res.data.status) {
        setMessage('Password reset email sent! Please check your inbox.');
        setError('');
      } else {
        setError(res.data.error || 'Failed to send reset email.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error sending reset request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Forgot Password</CardTitle>
          <CardDescription>
            Enter your email and we'll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail
                  strokeWidth={1.5}
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
                />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="m@example.com"
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 mt-4">
            {message && <p className="text-sm text-green-500">{message}</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              )}
              {loading ? 'Sending link...' : 'Send Reset Link'}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Remember your password?{' '}
              <Link to="/login" className="underline hover:text-primary">
                Login
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
