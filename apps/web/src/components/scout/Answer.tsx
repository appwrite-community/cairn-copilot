import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Scout answers in short Markdown. Raw HTML is never rendered.
const components: Components = {
  p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => (
    <ul className="my-2 flex flex-col gap-1 pl-4 [&>li]:list-disc">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 flex flex-col gap-1 pl-4 [&>li]:list-decimal">{children}</ol>
  ),
  li: ({ children }) => <li className="pl-0.5 marker:text-subtle">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  h1: ({ children }) => <h3 className="mb-1 mt-3 text-sm font-semibold first:mt-0">{children}</h3>,
  h2: ({ children }) => <h3 className="mb-1 mt-3 text-sm font-semibold first:mt-0">{children}</h3>,
  h3: ({ children }) => <h3 className="mb-1 mt-3 text-sm font-semibold first:mt-0">{children}</h3>,
  h4: ({ children }) => <h4 className="mb-1 mt-3 text-sm font-semibold first:mt-0">{children}</h4>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="text-primary underline-offset-4 hover:underline"
    >
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded bg-raised px-1 py-0.5 font-mono text-[12px]">{children}</code>
  ),
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-left text-[13px]">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-border px-2.5 py-1.5 font-medium text-muted-foreground">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-border px-2.5 py-1.5 last:border-0">{children}</td>
  ),
};

export function Answer({ markdown }: { markdown: string }) {
  return (
    <div className="text-[14px] leading-[22px] text-[#dcdce2]">
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </Markdown>
    </div>
  );
}
