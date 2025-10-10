import { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LoaderCircle } from 'lucide-react';
import api from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';

const STEPS = {
  LOADING: 0,
  CONNECT_DB: 1,
  PROVIDE_SCHEMA: 2,
  PROCESSING: 3,
};

export default function OnboardingPage() {
  const [step, setStep] = useState(STEPS.LOADING);
  const [dbForm, setDbForm] = useState({ connectionUri: '', dbName: '' });
  const [schemaJson, setSchemaJson] = useState('');
  const [loading, setLoading] = useState(false); // For form submissions
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { completeOnboarding, checkOnboardingStatus, user } = useAuth();

  useEffect(() => {
    const checkProgress = async () => {
      // The context now holds the status, but we can re-check for this page specifically
      const status = await checkOnboardingStatus();
      if (status.progress?.hasConnectedDb) {
        setStep(STEPS.PROVIDE_SCHEMA);
      } else {
        setStep(STEPS.CONNECT_DB);
      }
    };
    checkProgress();
  }, [checkOnboardingStatus]);

  const handleDbSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/integration', {
        tenantId: user.tenantId,
        ...dbForm,
      });
      toast.success('Database connected successfully!');
      setStep(STEPS.PROVIDE_SCHEMA);
    } catch (err) {
      console.error(err);
      const errorMsg =
        err.response?.data?.error || 'Failed to connect database.';
      setError(errorMsg);
      toast.error('Connection Failed', { description: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const handleSchemaSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const parsedSchema = JSON.parse(schemaJson);
      await api.post('/onboarding/schema', parsedSchema);

      // --- THE FIX ---
      // 1. Manually update the global state immediately.
      completeOnboarding();

      setStep(STEPS.PROCESSING);
      toast.success('Setup Complete!', {
        description: 'Redirecting you to the dashboard...',
      });

      // 2. Navigate. The PrivateRoute will now have the correct state.
      setTimeout(() => navigate('/app/dashboard', { replace: true }), 2000);
    } catch (err) {
      const errorMsg =
        err.response?.data?.error ||
        'Invalid JSON format or schema submission failed.';
      setError(errorMsg);
      toast.error('Schema Submission Failed', { description: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    switch (step) {
      case STEPS.LOADING:
        return (
          <div className="flex justify-center items-center p-10">
            <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
          </div>
        );
      case STEPS.CONNECT_DB:
        return (
          <form onSubmit={handleDbSubmit} className="space-y-4">
            <div>
              <Label htmlFor="connectionUri">MongoDB Connection URI</Label>
              <Input
                id="connectionUri"
                value={dbForm.connectionUri}
                onChange={(e) =>
                  setDbForm({ ...dbForm, connectionUri: e.target.value })
                }
                placeholder="mongodb+srv://..."
                required
              />
            </div>
            <div>
              <Label htmlFor="dbName">Database Name</Label>
              <Input
                id="dbName"
                value={dbForm.dbName}
                onChange={(e) =>
                  setDbForm({ ...dbForm, dbName: e.target.value })
                }
                placeholder="my_database"
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading && (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              )}
              Connect Database & Continue
            </Button>
          </form>
        );
      case STEPS.PROVIDE_SCHEMA:
        return (
          <form onSubmit={handleSchemaSubmit} className="space-y-4">
            <div>
              <Label htmlFor="schema">Database Schema JSON</Label>
              <Textarea
                id="schema"
                value={schemaJson}
                onChange={(e) => setSchemaJson(e.target.value)}
                rows={15}
                placeholder='{ "databaseName": "...", "collections": [...] }'
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading && (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              )}
              Submit Schema & Finish
            </Button>
          </form>
        );
      case STEPS.PROCESSING:
        return (
          <div className="text-center p-8 flex flex-col items-center gap-4">
            <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">
              Analyzing schema and generating embeddings... <br /> You will be
              redirected shortly.
            </p>
          </div>
        );
      default:
        return <p>An unexpected error occurred.</p>;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Setup Your AI Analyst</CardTitle>
          <CardDescription>
            {step === STEPS.CONNECT_DB &&
              'Step 1 of 2: Connect your MongoDB database.'}
            {step === STEPS.PROVIDE_SCHEMA &&
              'Step 2 of 2: Provide your database schema.'}
            {step === STEPS.PROCESSING &&
              'Final Step: We are setting things up for you!'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-sm text-center text-destructive mb-4">{error}</p>
          )}
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}
