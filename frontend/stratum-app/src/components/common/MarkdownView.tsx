import React, { useEffect, useState } from 'react';
import { Platform, View, Text } from 'react-native';

let ReactMarkdown: any = null;
let remarkGfm: any = null;
let remarkMath: any = null;
let rehypeKatex: any = null;
let rehypeRaw: any = null;

export default function MarkdownView({ content }: { content: string }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (Platform.OS === 'web') {
          if (!ReactMarkdown) ReactMarkdown = (await import('react-markdown')).default;
          if (!remarkGfm) remarkGfm = (await import('remark-gfm')).default;
          try { if (!rehypeRaw) rehypeRaw = (await import('rehype-raw')).default; } catch {}
          try { if (!remarkMath) remarkMath = (await import('remark-math')).default; } catch {}
          try { if (!rehypeKatex) rehypeKatex = (await import('rehype-katex')).default; } catch {}
        }
      } finally {
        if (mounted) setReady(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (Platform.OS !== 'web') return <Text style={{ color: '#EAEAEA' }}>{content}</Text>;
  if (!ready || !ReactMarkdown) return <Text style={{ color: '#9A9A9A' }}>Loading…</Text>;

  return (
    <View style={{ width: '100%' }}>
      <ReactMarkdown
        className="markdown-body"
        remarkPlugins={[remarkGfm, remarkMath].filter(Boolean)}
        rehypePlugins={[rehypeRaw, rehypeKatex].filter(Boolean)}
        skipHtml={false}
      >
        {content}
      </ReactMarkdown>
    </View>
  );
}
