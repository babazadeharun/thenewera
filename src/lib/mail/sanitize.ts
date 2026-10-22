import sanitizeHtml from 'sanitize-html';

/** Parse HTML before checking attributes and decoded URL protocols. */
export function sanitizeEmailHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: ['p','br','div','span','strong','b','em','i','u','s','blockquote','pre','code','hr','h1','h2','h3','h4','h5','h6','ul','ol','li','table','thead','tbody','tfoot','tr','td','th','a','img'],
    allowedAttributes: {
      '*': ['style','title','dir'], a: ['href','title','target','rel'],
      img: ['src','alt','width','height','title','referrerpolicy'],
      table: ['width','cellpadding','cellspacing','border'], td: ['colspan','rowspan','width','align'], th: ['colspan','rowspan','width','align'],
    },
    allowedSchemes: ['https','http','mailto'], allowedSchemesByTag: { img: ['https','http'] }, allowProtocolRelative: false,
    allowedStyles: { '*': {
      color: [/^#[\da-f]{3,8}$/i, /^[a-z]+$/i, /^rgba?\([\d\s,.%]+\)$/i],
      'background-color': [/^#[\da-f]{3,8}$/i, /^[a-z]+$/i, /^rgba?\([\d\s,.%]+\)$/i],
      'text-align': [/^(left|right|center|justify)$/], 'font-size': [/^\d{1,3}(px|pt|em|rem|%)$/],
      'font-weight': [/^(normal|bold|[1-9]00)$/], 'font-style': [/^(normal|italic)$/],
      'text-decoration': [/^(none|underline|line-through)$/], 'border-collapse': [/^(collapse|separate)$/],
      padding: [/^[\d.]+(px|pt|em|rem|%)(\s+[\d.]+(px|pt|em|rem|%)){0,3}$/],
    } },
    transformTags: {
      a: (_tag, attrs) => ({ tagName: 'a', attribs: { ...attrs, target: '_blank', rel: 'noopener noreferrer' } }),
      img: (_tag, attrs) => ({ tagName: 'img', attribs: { ...attrs, referrerpolicy: 'no-referrer' } }),
    },
  });
}
