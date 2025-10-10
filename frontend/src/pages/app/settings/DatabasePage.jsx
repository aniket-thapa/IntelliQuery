import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoaderCircle } from 'lucide-react';

export default function DatabasePage() {
  const [integration, setIntegration] = useState(null);
  const [form, setForm] = useState({ connectionUri: '', dbName: '' });
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchIntegration();
  }, []);

  const fetchIntegration = async () => {
    try {
      const res = await api.get('/integration');
      if (res.data.integration) {
        setIntegration(res.data.integration);
        setForm({
          connectionUri: res.data.integration.connectionUri,
          dbName: res.data.integration.dbName,
        });
      }
    } catch (error) {
      toast.error('Failed to fetch database settings.');
    } finally {
      setLoading(false);
    }
  };

  const maskUri = (uri) => {
    if (!uri || uri.length < 20) return uri;
    return `${uri.substring(0, 15)}...${uri.substring(uri.length - 15)}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      await api.put('/integration', { ...form, status: 'active' });
      toast.success('Database settings updated successfully!');
      fetchIntegration(); // Refresh data
    } catch (error) {
      toast.error('Update Failed', {
        description:
          error.response?.data?.error || 'Could not update settings.',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <LoaderCircle className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Database Connection</CardTitle>
          <CardDescription>
            Manage your MongoDB connection settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="connectionUri">Connection URI</Label>
            <Input
              id="connectionUri"
              value={form.connectionUri}
              onChange={(e) =>
                setForm({ ...form, connectionUri: e.target.value })
              }
              placeholder={maskUri(integration?.connectionUri)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Your current URI is masked for security. To update, paste the new
              full URI here.
            </p>
          </div>
          <div>
            <Label htmlFor="dbName">Database Name</Label>
            <Input
              id="dbName"
              value={form.dbName}
              onChange={(e) => setForm({ ...form, dbName: e.target.value })}
            />
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button type="submit" disabled={isUpdating}>
            {isUpdating && (
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save Changes
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
