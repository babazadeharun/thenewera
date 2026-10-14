// Synthetic local fixtures, not copies of user or production assets.
const http=require('node:http');
http.createServer((req,res)=>{
 res.setHeader('Content-Type','image/svg+xml');
 if(req.url==='/dark-logo.svg')return res.end('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="85"><text x="8" y="57" fill="#071b29" font-size="52" font-family="Arial" font-weight="bold">NEW ERA</text><text x="10" y="80" fill="#071b29" font-size="12" letter-spacing="5">MARKETING AGENCY</text></svg>');
 const mobile=req.url==='/bright-mobile.svg';
 res.end(`<svg xmlns="http://www.w3.org/2000/svg" width="${mobile?900:1500}" height="1000" viewBox="0 0 1500 1000"><rect width="1500" height="1000" fill="#fff"/><ellipse cx="1000" cy="340" rx="180" ry="230" fill="#0b91a0"/><path d="M650 680 Q700 480 1000 480 Q1250 480 1350 680Z" fill="#077f93"/><rect x="830" y="260" width="360" height="60" rx="20" fill="#ffe34b"/><path d="M520 540 L1160 600 L1100 890 L470 830Z" fill="#071a23"/><path d="M490 850 L1100 910 L970 960 L350 890Z" fill="#66868d"/></svg>`);
}).listen(3199,'127.0.0.1');
