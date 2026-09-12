import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const defaultComponents = {
  h1: ({ children }) => (
    <h1 className="mt-8 mb-3 text-[26px] font-bold tracking-tight text-slate-900 first:mt-0 leading-snug">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-8 mb-3 text-[20px] font-bold text-slate-900 first:mt-0 pb-2 border-b border-slate-200 leading-snug">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-6 mb-2 text-[16px] font-semibold text-indigo-900 first:mt-0 tracking-wide">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="my-3 text-[16px] leading-[1.8] text-slate-700">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="my-3.5 ml-5 list-disc space-y-2 text-[16px] leading-7 text-slate-700 marker:text-indigo-400">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-3.5 ml-5 list-decimal space-y-2 text-[16px] leading-7 text-slate-700 marker:text-indigo-500 marker:font-semibold">{children}</ol>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
  em: ({ children }) => <em className="italic text-slate-600">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="my-5 rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 text-[15px] leading-7 text-slate-700 not-italic">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-8 border-slate-200" />,
  a: ({ href, children }) => (
    <a href={href} className="text-indigo-600 underline underline-offset-2" target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
  pre: ({ children }) => (
    <pre className="my-5 overflow-x-auto rounded-2xl bg-slate-50 border border-slate-200 px-5 py-4 font-mono text-[12.5px] leading-6 text-slate-700 whitespace-pre">
      {children}
    </pre>
  ),
  code: ({ className, children }) => {
    const inline = !className;
    if (inline) {
      return (
        <code className="rounded-md bg-indigo-50 px-1.5 py-0.5 font-mono text-[13px] text-indigo-800">
          {children}
        </code>
      );
    }
    return <code className="font-mono">{children}</code>;
  },
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full border-collapse text-left text-[14px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-slate-50">{children}</thead>,
  th: ({ children }) => (
    <th className="border-b border-slate-200 px-3 py-2 font-semibold text-slate-800">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border-t border-slate-100 px-3 py-2 align-top text-slate-700">{children}</td>
  ),
};

function looksLikeMarkdown(text) {
  return (
    /^(#{1,6}\s+\S)/m.test(text)
    || /^```/m.test(text)
    || /^>\s+\S/m.test(text)
    || /^(\s{0,3})([-*+]|\d+\.)\s+\S/m.test(text)
    || /\[[^\]]+\]\([^)]+\)/.test(text)
    || /\*\*[^*\n]{1,80}\*\*/.test(text)
    || /__[^_\n]{1,80}__/.test(text)
    || (/^\|.+\|/m.test(text) && /^\s*\|?\s*:?-{3,}/m.test(text))
  );
}

const readerComponents = {
  h1: ({ children }) => (
    <h1 className="mt-10 mb-4 text-[1.65em] font-semibold tracking-tight first:mt-0 leading-tight">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-10 mb-4 text-[1.22em] font-semibold first:mt-0 leading-snug pb-2 border-b border-slate-200">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-8 mb-2 text-[1.05em] font-semibold first:mt-0 text-indigo-950">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="my-3.5 leading-[1.85]">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="my-4 ml-5 list-disc space-y-2.5 leading-[1.85] marker:text-indigo-400">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-4 ml-5 list-decimal space-y-2.5 leading-[1.85] marker:text-indigo-500">{children}</ol>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-slate-800">{children}</strong>,
  em: ({ children }) => <em className="italic text-slate-600">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="my-6 rounded-xl border border-indigo-100 bg-indigo-50/80 px-5 py-3.5 not-italic text-slate-700">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-10 border-slate-200" />,
  a: ({ href, children }) => (
    <a href={href} className="text-indigo-600 underline decoration-indigo-200 underline-offset-4" target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
  pre: ({ children }) => (
    <pre className="my-6 overflow-x-auto rounded-2xl bg-slate-50 border border-slate-200 px-5 py-5 font-mono text-[12.5px] leading-6 text-slate-700 whitespace-pre">
      {children}
    </pre>
  ),
  code: ({ className, children }) => {
    const inline = !className;
    if (inline) {
      return (
        <code className="rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-[0.86em] text-indigo-700">
          {children}
        </code>
      );
    }
    return <code className="font-mono">{children}</code>;
  },
  table: ({ children }) => (
    <div className="my-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full border-collapse text-left text-[0.92em]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-slate-50">{children}</thead>,
  th: ({ children }) => (
    <th className="border-b border-slate-200 px-3 py-2.5 font-semibold text-slate-800">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border-t border-slate-100 px-3 py-2.5 align-top text-slate-600">{children}</td>
  ),
};

const paperComponents = {
  h1: ({ children }) => (
    <h1 className="mt-8 mb-4 text-[28px] font-serif font-bold tracking-tight text-slate-900 first:mt-0 leading-snug">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-8 mb-3 text-[22px] font-serif font-bold text-slate-900 first:mt-0 pb-2 border-b border-blue-200 leading-snug">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-6 mb-2 text-[18px] font-serif font-semibold text-indigo-950 first:mt-0">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="my-3.5 font-serif text-[17px] md:text-[18px] leading-[1.85] text-slate-800">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="my-4 ml-5 list-disc space-y-2 font-serif text-[17px] leading-8 text-slate-800 marker:text-indigo-400">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-4 ml-5 list-decimal space-y-2 font-serif text-[17px] leading-8 text-slate-800 marker:text-indigo-500">{children}</ol>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
  em: ({ children }) => <em className="italic text-slate-600">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="my-5 rounded-xl border border-yellow-300/80 bg-yellow-100/70 px-4 py-3 font-serif text-[16px] leading-7 text-slate-800 not-italic">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-8 border-blue-200 border-dashed" />,
  a: ({ href, children }) => (
    <a href={href} className="text-indigo-600 underline underline-offset-2" target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
  pre: ({ children }) => (
    <pre className="my-5 overflow-x-auto rounded-2xl bg-amber-50/80 border border-amber-200/70 px-5 py-4 font-mono text-[13px] leading-6 text-slate-700 whitespace-pre">
      {children}
    </pre>
  ),
  code: ({ className, children }) => {
    const inline = !className;
    if (inline) {
      return (
        <code className="rounded-md bg-yellow-100 px-1.5 py-0.5 font-mono text-[14px] text-indigo-900">
          {children}
        </code>
      );
    }
    return <code className="font-mono">{children}</code>;
  },
  table: ({ children }) => (
    <div className="my-5 overflow-x-auto rounded-xl border border-amber-200 bg-[#fffdf6]">
      <table className="w-full border-collapse text-left text-[15px] font-serif">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-yellow-50">{children}</thead>,
  th: ({ children }) => (
    <th className="border-b border-amber-200 px-3 py-2 font-semibold text-slate-800">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border-t border-amber-100 px-3 py-2 align-top text-slate-700">{children}</td>
  ),
};

export default function LessonMarkdown({ children, variant = "default", tables = true }) {
  const text = children == null ? "" : String(children);
  const reader = variant === "reader";
  const paper = variant === "paper";
  if (!text.trim()) {
    return <p className={reader || paper ? "opacity-50" : "text-slate-400"}>Nothing to preview yet.</p>;
  }

  const components = paper ? paperComponents : reader ? readerComponents : defaultComponents;
  const wrapClass = paper ? "lesson-paper-prose max-w-none" : reader ? "lesson-reader-prose max-w-none" : "lesson-md max-w-none";

  if (!looksLikeMarkdown(text)) {
    return (
      <pre className={paper
        ? "whitespace-pre-wrap break-words font-serif text-[17px] leading-8 text-slate-800"
        : reader
          ? "whitespace-pre-wrap break-words leading-[1.7] text-slate-700 font-mono text-[14px]"
          : "whitespace-pre-wrap break-words text-[15px] leading-7 text-slate-700 font-mono"}
      >
        {text}
      </pre>
    );
  }

  return (
    <div className={wrapClass}>
      <ReactMarkdown
        remarkPlugins={[[remarkGfm, { tables }]]}
        components={components}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
