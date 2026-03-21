
import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface MarkdownRendererProps {
  content: string;
  highlightText?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, highlightText }) => {

  // Clean content and apply highlighting
  const processedContent = useMemo(() => {
    if (!content) return "";

    let processed = content;

    // --- PHASE 1: STRUCTURE MAPPING (OCR Specific) ---

    // 1. Remove Coordinate/Detection tags FIRST (they are noise)
    processed = processed.replace(/<\|det\|>.*?<\|\/det\|>/gs, '');
    processed = processed.replace(/&lt;\|det\|&gt;.*?&lt;\|\/det\|&gt;/gs, '');
    processed = processed.replace(/<\|(box|quad)\|>/g, '');
    processed = processed.replace(/<\|\/(box|quad)\|>/g, '');

    // 2. Semantic Mapping: Title -> H1
    processed = processed.replace(/<\|ref\|>title<\|\/ref\|>\s*/gi, '\n# ');
    processed = processed.replace(/&lt;\|ref\|&gt;title&lt;\|\/ref\|&gt;\s*/gi, '\n# ');

    // 3. Semantic Mapping: Subtitle -> H2
    processed = processed.replace(/<\|ref\|>subtitle<\|\/ref\|>\s*/gi, '\n## ');
    processed = processed.replace(/&lt;\|ref\|&gt;subtitle&lt;\|\/ref\|&gt;\s*/gi, '\n## ');

    // 4. Semantic Mapping: Text -> Plain (Remove tag)
    processed = processed.replace(/<\|ref\|>text<\|\/ref\|>\s*/gi, '');
    processed = processed.replace(/&lt;\|ref\|&gt;text&lt;\|\/ref\|&gt;\s*/gi, '');

    // 5. Generic Unwrap
    processed = processed.replace(/<\|ref\|>(.*?)<\|\/ref\|>/gs, '');
    processed = processed.replace(/&lt;\|ref\|&gt;(.*?)&lt;\|\/ref\|&gt;/gs, '');

    // --- PHASE 2: LATEX SYMBOL TO MARKDOWN CONVERSION ---

    // 1. Convert decorative LaTeX bullets to Markdown bullets
    const bulletPattern = /(?:\\\(|\\\[|\s|^)\\?(diamond|star|bigstar|clubsuit|spadesuit|heartsuit|diamondsuit|bullet|circ)(?:\\\)|\\\]|\s|$)/gi;
    processed = processed.replace(bulletPattern, '\n- ');

    // 2. Remove hallucinated slash commands
    processed = processed.replace(/^\s*\\\s+/gm, '');

    // --- PHASE 3: MEDICAL & MATH LATEX REPAIR (ENHANCED) ---

    // 1. Wrap bare LaTeX that includes \times, scientific notation, or units in $...$
    // Pattern matches things like: 0.5\times 10^{9} or \leq 5%
    // We look for sequences containing \times, \leq, \geq, ^{, etc that are NOT surrounded by $

    // A. Fix scientific notation: 0.5\times 10^{9} -> $0.5\times 10^{9}$
    // Capture group 1: The math expression
    processed = processed.replace(
      /(?<!\$)((\d+(\.\d+)?\s*\\times\s*10\^\{[^}]+\})|(\d+(\.\d+)?\s*\\times\s*10\d+))(?!\$)/gi,
      '$$$1$$'
    );

    // B. Fix operators with numbers: \leq 20, > 50%
    processed = processed.replace(
      /(?<!\$)((\\[lg]eq?|\\approx|\\sim)\s*\d+(\.\d+)?\s*[%a-zA-Z]*)(?!\$)/gi,
      '$$$1$$'
    );

    // C. Fix fractions like 10^9 / L
    processed = processed.replace(
      /(?<!\$)(10\^\{[^}]+\}\s*\/\s*[a-zA-Z]+)(?!\$)/gi,
      '$$$1$$'
    );

    // D. Fix "(\mathrm{pT}3)" -> "($\mathrm{pT}3$)"
    processed = processed.replace(/(?<!\$)\s*(\\mathrm\{[^}]+\})\s*(?!\$)/g, '$$$1$$');

    // E. General cleanup for \times if missed above (bare \times between numbers)
    processed = processed.replace(/(?<!\$|\d)(\d+(\.\d+)?\s*\\times\s*\d+(\.\d+)?)(?!\$|\d)/gi, '$$$1$$');

    // 2. Fix broken "10 9" -> 10^9
    processed = processed.replace(/10\s+([0-9])(?!\d)/g, '10^{$1}');

    // 3. Fix Circled Numbers artifacts
    processed = processed.replace(/\(\s*([①-⑩])\s*\)/g, '$1');

    // 4. Fix double parentheses around math: (( $...$ )) -> ($...$)
    // Or ((0.5...)) -> (0.5...) if we just wrapped it
    processed = processed.replace(/\(\(\s*(\$[^$]+\$)\s*\)\)/g, '($1)');

    // 5. Fix superscripts
    processed = processed.replace(/\\\(\^\{(.*?)\}\\\)/g, '<sup>$1</sup>');
    processed = processed.replace(/\\\^\{(.*?)\}/g, '<sup>$1</sup>');

    // --- PHASE 4: MARKDOWN NORMALIZATION ---

    // Force Headers to new lines
    processed = processed.replace(/([^\n])\s*(#{1,6}\s)/g, '$1\n\n$2');
    processed = processed.replace(/^(#{1,6})(?=[^#\s])/gm, '$1 ');

    // --- PHASE 5: HIGHLIGHTING ---
    if (highlightText && highlightText.trim().length >= 2) {
      try {
        const escapedText = highlightText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedText})`, 'gi');
        processed = processed.replace(regex, '<mark>$1</mark>');
      } catch (e) {
        console.warn("Highlighting failed regex", e);
      }
    }

    return processed;
  }, [content, highlightText]);

  return (
    <div className="markdown-body prose prose-slate prose-sm max-w-none prose-headings:font-bold prose-h1:text-xl prose-h2:text-lg prose-p:text-slate-700 prose-a:text-accent font-sans">
      <ReactMarkdown
        rehypePlugins={[rehypeRaw, rehypeKatex]}
        remarkPlugins={[remarkGfm, remarkMath]}
        components={{
          table: ({node, ...props}) => (
            <div className="overflow-x-auto my-4">
              <table {...props} className="min-w-full border-collapse border border-slate-200" />
            </div>
          ),
          td: ({node, ...props}) => (
            <td {...props} className="border border-slate-300 px-4 py-2 text-sm text-slate-700" />
          ),
          th: ({node, ...props}) => (
             <th {...props} className="border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 text-left" />
          ),
          sup: ({node, ...props}) => (
            <sup {...props} className="text-[10px] text-slate-500 font-medium align-super ml-0.5 select-none" />
          )
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
