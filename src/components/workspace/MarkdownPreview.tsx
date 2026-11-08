import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Raw HTML in notes is NOT rendered (no rehype-raw), and react-markdown's default
 * URL transform strips javascript: links, so note content can't inject script.
 */
export function MarkdownPreview({ source }: { source: string }) {
  if (!source.trim()) {
    return <p className="text-sm text-muted">Nothing to preview yet.</p>;
  }
  return (
    <div className="note-md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer nofollow" />,
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
