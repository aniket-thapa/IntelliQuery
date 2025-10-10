import ReactMarkdown from 'react-markdown';

export default function MarkdownRenderer({ content }) {
  if (!content) return null;

  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <ReactMarkdown
        components={{
          h1: ({ node, ...props }) => (
            <h1 className="text-xl font-semibold" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-lg font-semibold" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-md font-semibold" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
