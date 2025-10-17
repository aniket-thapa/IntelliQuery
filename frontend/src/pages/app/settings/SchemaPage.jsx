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
import { LoaderCircle, Edit3, Eye } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function SchemaPage() {
  const [schemaJson, setSchemaJson] = useState('');
  const [originalSchemaJson, setOriginalSchemaJson] = useState('');
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [isChanged, setIsChanged] = useState(false);

  useEffect(() => {
    fetchSchema();
  }, []);

  const fetchSchema = async () => {
    try {
      const res = await api.get('/onboarding/schema');
      if (res.data.schema) {
        const formatted = JSON.stringify(
          {
            databaseName: res.data.schema.databaseName,
            collections: res.data.schema.collections,
          },
          null,
          2
        );
        setSchemaJson(formatted);
        setOriginalSchemaJson(formatted);
      }
    } catch (error) {
      toast.error('Failed to fetch database schema.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const newValue = e.target.value;
    setSchemaJson(newValue);
    setIsChanged(newValue.trim() !== originalSchemaJson.trim());
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
      setOriginalSchemaJson(schemaJson);
      setIsChanged(false);
      fetchSchema();
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
      <Card className="shadow-lg border border-border/60">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Database Schema</CardTitle>
              <CardDescription>
                Define the structure of your database. Updating the schema will
                re-process the AI's knowledge base.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditMode(!editMode)}
              className="gap-2"
            >
              {editMode ? (
                <>
                  <Eye className="h-4 w-4" /> View Mode
                </>
              ) : (
                <>
                  <Edit3 className="h-4 w-4" /> Edit Mode
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {editMode ? (
            <Textarea
              value={schemaJson}
              onChange={handleChange}
              rows={25}
              className="font-mono text-xs max-h-[80vh] rounded-md border border-input bg-muted/40 focus:ring-2 focus:ring-primary/40 transition-all duration-200"
              placeholder='{ "databaseName": "...", "collections": [...] }'
            />
          ) : (
            <div className="max-h-[80vh] overflow-auto rounded-md bg-muted/50 border border-border/50">
              <SyntaxHighlighter
                language="json"
                style={{
                  ...oneDark,

                  'code[class*="language-"]': {
                    ...oneDark['code[class*="language-"]'],
                    background: 'transparent',
                  },
                }}
                customStyle={{
                  margin: 0,
                  padding: '1rem',
                  background: 'transparent',
                  fontSize: '0.9rem',
                  lineHeight: '1.4',
                }}
              >
                {schemaJson}
              </SyntaxHighlighter>
            </div>
          )}
        </CardContent>

        {editMode && isChanged && (
          <CardFooter className="border-t px-6 py-4 flex justify-end">
            <Button type="submit" disabled={isUpdating}>
              {isUpdating && (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save and Re-process Schema
            </Button>
          </CardFooter>
        )}
      </Card>
    </form>
  );
}
