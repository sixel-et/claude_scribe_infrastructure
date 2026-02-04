import { useMemo, useCallback, useRef, useImperativeHandle, forwardRef, useState, useEffect } from 'react';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';

// Custom rehype plugin to add source position data attributes
function rehypeSourcePositions() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.position) {
        node.properties = node.properties || {};
        node.properties['data-source-start'] = node.position.start.offset;
        node.properties['data-source-end'] = node.position.end.offset;
        node.properties['data-source-line'] = node.position.start.line;
      }
    });
  };
}

// Process markdown to HTML with position tracking
function processMarkdown(markdown) {
  const processor = unified()
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeSourcePositions)
    .use(rehypeStringify, { allowDangerousHtml: true });

  const result = processor.processSync(markdown);
  return String(result);
}

export const MarkdownPreview = forwardRef(function MarkdownPreview({ content, onNavigateToSource }, ref) {
  const containerRef = useRef(null);

  // Debounce content to avoid re-parsing markdown on every keystroke
  const [debouncedContent, setDebouncedContent] = useState(content);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedContent(content);
    }, 300);
    return () => clearTimeout(timer);
  }, [content]);

  const html = useMemo(() => {
    if (!debouncedContent) return '';
    try {
      return processMarkdown(debouncedContent);
    } catch (err) {
      console.error('Markdown processing error:', err);
      return `<pre>${debouncedContent}</pre>`;
    }
  }, [debouncedContent]);

  // Expose scroll method via ref
  useImperativeHandle(ref, () => ({
    scrollToPosition(offset) {
      if (!containerRef.current) return;

      // Find element containing this offset
      const elements = containerRef.current.querySelectorAll('[data-source-start]');
      let bestMatch = null;
      let bestDistance = Infinity;

      for (const el of elements) {
        const start = parseInt(el.getAttribute('data-source-start'), 10);
        const end = parseInt(el.getAttribute('data-source-end'), 10);

        // Exact match or closest before
        if (start <= offset && offset <= end) {
          bestMatch = el;
          break;
        }

        const distance = Math.abs(start - offset);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestMatch = el;
        }
      }

      if (bestMatch) {
        bestMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Brief highlight
        bestMatch.style.outline = '2px solid #60a5fa';
        setTimeout(() => {
          bestMatch.style.outline = '';
        }, 1000);
      }
    }
  }), []);

  const handleClick = useCallback((e) => {
    // Find the nearest element with source position data
    let target = e.target;
    while (target && target !== e.currentTarget) {
      const start = target.getAttribute?.('data-source-start');
      const end = target.getAttribute?.('data-source-end');
      if (start !== null && end !== null) {
        const startPos = parseInt(start, 10);
        const endPos = parseInt(end, 10);
        if (!isNaN(startPos) && !isNaN(endPos) && onNavigateToSource) {
          onNavigateToSource(startPos, endPos);
        }
        return;
      }
      target = target.parentElement;
    }
  }, [onNavigateToSource]);

  return (
    <div
      ref={containerRef}
      className="h-full overflow-auto bg-gray-850 p-6"
      onClick={handleClick}
    >
      <div
        className="prose prose-invert prose-sm max-w-none markdown-preview"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
});
