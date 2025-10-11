import MarkdownRenderer from './MarkdownRenderer';
import DataTable from './DataTable';
import CodeBlock from './CodeBlock';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Database } from 'lucide-react';
import ChartRenderer from './ChartRenderer';

export default function AIMessage({ data }) {
  let { finalAnswer, tableData, mongoQuery } = data?.data || data || {};

  if (!finalAnswer) finalAnswer = data?.text; // No result found case

  return (
    <div className="space-y-4">
      {/* 1. Render the main text answer */}
      <MarkdownRenderer content={finalAnswer} />

      {/* 2. Render chart if available */}
      {tableData?.visualization && (
        <ChartRenderer visualization={tableData.visualization} />
      )}

      {/* 3. Render the data table if available */}
      {tableData?.rows && tableData?.tableConfig && (
        <DataTable data={tableData.rows} tableConfig={tableData.tableConfig} />
      )}

      {/* 4. Put the generated query in a collapsible accordion */}
      {mongoQuery && (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger>
              <div className="flex items-center gap-2 text-sm">
                <Database className="h-4 w-4" />
                <span>View Generated Query</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <CodeBlock code={mongoQuery} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}
