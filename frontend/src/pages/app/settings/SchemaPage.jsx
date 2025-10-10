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
import { Textarea } from '@/components/ui/textarea';
import { LoaderCircle } from 'lucide-react';

export default function SchemaPage() {
  const [schema, setSchema] = useState(null);
  const [schemaJson, setSchemaJson] = useState('');
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchSchema();
  }, []);

  const fetchSchema = async () => {
    try {
      const res = await api.get('/onboarding/schema');
      if (res.data.schema) {
        setSchema(res.data.schema);
        // Pretty-print the JSON for the textarea
        setSchemaJson(
          JSON.stringify(
            {
              databaseName: res.data.schema.databaseName,
              collections: res.data.schema.collections,
            },
            null,
            2
          )
        );
      }
    } catch (error) {
      toast.error('Failed to fetch database schema.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const parsedSchema = JSON.parse(schemaJson);
      await api.put('/onboarding/schema', parsedSchema);
      toast.success('Schema Updated!', {
        description: 'Embeddings are now being re-processed in the background.',
      });
      fetchSchema(); // Refresh data
    } catch (error) {
      toast.error('Update Failed', {
        description:
          error.response?.data?.error ||
          'Invalid JSON format or failed to update.',
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
          <CardTitle>Database Schema</CardTitle>
          <CardDescription>
            Define the structure of your database. Updating the schema will
            re-process the AI's knowledge base.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={schemaJson}
            onChange={(e) => setSchemaJson(e.target.value)}
            rows={25}
            placeholder='{ "databaseName": "...", "collections": [...] }'
          />
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button type="submit" disabled={isUpdating}>
            {isUpdating && (
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save and Re-process Schema
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
