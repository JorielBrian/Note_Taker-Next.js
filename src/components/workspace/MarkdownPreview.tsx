import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Raw HTML in notes is NOT rendered (no rehype-raw), and react-markdown's default
 * URL transform strips javascript: links, so note content can't inject script.
 */
export function MarkdownPreview({
  source,
  onTaskToggle,
  taskToggleDisabled = false,
}: {
  source: string;
  onTaskToggle?: (index: number, checked: boolean) => void;
  taskToggleDisabled?: boolean;
}) {
  if (!source.trim()) {
    return <p className="text-sm text-muted">Nothing to preview yet.</p>;
  }

  // remark-gfm renders task-list markers as checkbox inputs in source order.
  // Keep the index local to this render so it resets whenever the Markdown changes.
  let taskIndex = 0;

  return (
    <div className="note-md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer nofollow" />,
          input: ({ node: _node, type, checked, disabled: _disabled, ...props }) => {
            if (type !== 'checkbox') {
              return <input {...props} type={type} checked={checked} />;
            }

            const index = taskIndex++;
            return (
              <input
                {...props}
                type="checkbox"
                checked={Boolean(checked)}
                disabled={!onTaskToggle || taskToggleDisabled}
                aria-label={`Toggle task ${index + 1}`}
                onChange={(event) => onTaskToggle?.(index, event.currentTarget.checked)}
              />
            );
          },
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
