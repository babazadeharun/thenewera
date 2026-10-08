const BLOCKED_TAGS = /<\/?(?:script|style|iframe|object|embed|form|input|button|textarea|select|meta|link|base|svg|math)[^>]*>/gi;
const EVENT_ATTR = /\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const DANGEROUS_URL = /(href|src|action|formaction|poster)\s*=\s*("|')\s*(?:javascript:|data:text\/html|vbscript:)[^"']*(\2)/gi;
export function sanitizeEmailHtml(html:string) {
  return html.replace(BLOCKED_TAGS,'').replace(EVENT_ATTR,'').replace(DANGEROUS_URL,'$1=$2#$2').replace(/<a\b([^>]*?)target=/gi,'<a$1target=');
}
