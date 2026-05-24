import { Fragment, type ReactNode } from 'react';

/**
 * Tiny zero-dependency XML colorizer tuned for Apple plist files.
 * Splits the source into tokens and renders colored spans. Preserves all
 * whitespace verbatim (caller controls wrap via the wrapping <pre>).
 */
interface Props {
  xml: string;
  wrap: boolean;
  className?: string;
}

export function XmlHighlight({ xml, wrap, className }: Props) {
  return (
    <pre
      className={`text-[11px] font-mono leading-relaxed p-4 ${
        wrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'
      } ${className ?? ''}`}
    >
      {tokenize(xml).map((t, i) => (
        <Fragment key={i}>{renderToken(t)}</Fragment>
      ))}
    </pre>
  );
}

type TokenType = 'comment' | 'pi' | 'doctype' | 'tag' | 'text';
interface Token {
  type: TokenType;
  text: string;
}

function tokenize(s: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < s.length) {
    // Comments
    if (s.startsWith('<!--', i)) {
      const end = s.indexOf('-->', i);
      const fin = end === -1 ? s.length : end + 3;
      out.push({ type: 'comment', text: s.slice(i, fin) });
      i = fin;
      continue;
    }
    // Processing instructions <?xml ... ?>
    if (s.startsWith('<?', i)) {
      const end = s.indexOf('?>', i);
      const fin = end === -1 ? s.length : end + 2;
      out.push({ type: 'pi', text: s.slice(i, fin) });
      i = fin;
      continue;
    }
    // DOCTYPE
    if (s.startsWith('<!DOCTYPE', i)) {
      const end = s.indexOf('>', i);
      const fin = end === -1 ? s.length : end + 1;
      out.push({ type: 'doctype', text: s.slice(i, fin) });
      i = fin;
      continue;
    }
    // Tag
    if (s[i] === '<') {
      const end = s.indexOf('>', i);
      if (end === -1) {
        out.push({ type: 'text', text: s.slice(i) });
        break;
      }
      out.push({ type: 'tag', text: s.slice(i, end + 1) });
      i = end + 1;
      continue;
    }
    // Text
    const next = s.indexOf('<', i);
    const end = next === -1 ? s.length : next;
    out.push({ type: 'text', text: s.slice(i, end) });
    i = end;
  }
  return out;
}

function renderToken(t: Token): ReactNode {
  if (t.type === 'comment') {
    return <span className="text-muted-foreground italic opacity-70">{t.text}</span>;
  }
  if (t.type === 'pi' || t.type === 'doctype') {
    return <span className="text-muted-foreground/80">{t.text}</span>;
  }
  if (t.type === 'tag') return <TagToken text={t.text} />;
  return <span className="text-foreground/85">{t.text}</span>;
}

function TagToken({ text }: { text: string }) {
  // <name>, </name>, <name/>, <name attr="value">
  // Split into: '<' [/]?, name, attrs..., [/]?, '>'
  const m = /^(<\/?)([a-zA-Z][\w:-]*)([^<>]*)(\/?>)$/.exec(text);
  if (!m) {
    return <span className="text-foreground/85">{text}</span>;
  }
  const open = m[1];
  const name = m[2];
  const attrs = m[3];
  const close = m[4];
  return (
    <>
      <span className="text-muted-foreground/60">{open}</span>
      <span className="text-primary">{name}</span>
      {attrs ? <AttrChunk text={attrs} /> : null}
      <span className="text-muted-foreground/60">{close}</span>
    </>
  );
}

function AttrChunk({ text }: { text: string }) {
  // Simple attr regex: name="value" or name='value'
  const parts: ReactNode[] = [];
  const re = /(\s+)([a-zA-Z_][\w:-]*)(=)(["'])([^"']*)\4/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      parts.push(
        <span key={key++} className="text-foreground/85">
          {text.slice(last, m.index)}
        </span>,
      );
    }
    parts.push(<span key={key++}>{m[1]}</span>);
    parts.push(
      <span key={key++} className="text-foreground/90">
        {m[2]}
      </span>,
    );
    parts.push(
      <span key={key++} className="text-muted-foreground/60">
        {m[3]}
      </span>,
    );
    parts.push(
      <span key={key++} className="text-warning">
        {m[4]}
        {m[5]}
        {m[4]}
      </span>,
    );
    last = re.lastIndex;
  }
  if (last < text.length) {
    parts.push(
      <span key={key++} className="text-foreground/85">
        {text.slice(last)}
      </span>,
    );
  }
  return <>{parts}</>;
}
