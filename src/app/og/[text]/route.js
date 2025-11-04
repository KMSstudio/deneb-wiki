// app/og/[text]/route.js

export const runtime = 'edge';
import { ImageResponse } from 'next/og';

// CACHE (HTTP-loaded)
const fontCache = new Map();
const HANGUL_RE = /[\u3130-\u318F\uAC00-\uD7A3]/;

function publicBase(urlObj){
  const path = urlObj.pathname;
  const i = path.indexOf('/og/');
  const prefix = i >= 0 ? path.slice(0, i) : '';
  return `${urlObj.origin}${prefix}`;
}

async function loadFontHTTP(urlObj, family, file){
  const key = `http:${family}@${file}`;
  if(fontCache.has(key)) return fontCache.get(key);
  const base = publicBase(urlObj);
  const fontUrl = `${base}/fonts/${file}`;
  const res = await fetch(fontUrl);
  if(!res.ok) throw new Error(`Font 404: ${fontUrl}`);
  const data = await res.arrayBuffer();
  const font = { name: family, data, weight: 400, style: 'normal' };
  fontCache.set(key, font); return font;
}

export async function GET(req, { params }) {
  /* INPUTS */
  const url = new URL(req.url), q = url.searchParams;
  const raw = (await params).text ?? '';
  const text = decodeURIComponent(raw).trim().slice(0,120) || '...';
  const width = clampInt(q.get('w') ?? '1200', 128, 4096);
  const height = clampInt(q.get('h') ?? '630', 128, 4096);
  const baseSize = clampInt(q.get('size') ?? '92', 16, 256);
  const fg = (q.get('fg') || '#111111')+'';
  const bg = (q.get('bg') || '#ffffff')+'';
  const weight = (q.get('weight') || '700')+'';

  /* FONT PICK & LOAD (HTTP under /fonts) */
  const hasKR = HANGUL_RE.test(text);
  const pick = hasKR
    ? { family:'KoPub Batang', file:'KopubWorldBatang.ttf' }
    : { family:'Times New Roman', file:'TimesNewRoman.ttf' };

  let fonts = [];
  try { fonts = [await loadFontHTTP(url, pick.family, pick.file)]; } catch(_) {}

  /* LAYOUT */
  const size =
    text.length > 80 ? Math.max(32, Math.floor(baseSize*0.6)) :
    text.length > 50 ? Math.max(40, Math.floor(baseSize*0.75)) : baseSize;
  const family = fonts.length ? pick.family : (hasKR ? 'sans-serif' : 'serif');

  /* RENDER */
  const res = new ImageResponse(
    (
      <div style={{display:'flex',width:'100%',height:'100%',background:bg,alignItems:'center',justifyContent:'center',padding:'6%'}}>
        <div style={{fontFamily:family,fontSize:size,fontWeight:weight,color:fg,whiteSpace:'pre-wrap',textAlign:'center',lineHeight:1.2,wordBreak:'keep-all'}}>
          {text}
        </div>
      </div>
    ),
    { width, height, fonts }
  );

  res.headers.set('Content-Type','image/png');
  res.headers.set('Cache-Control','public, max-age=31536000, immutable');
  return res;
}

function clampInt(v,min,max){ const n=parseInt(v,10); if(Number.isNaN(n))return min; return Math.max(min,Math.min(max,n)); }
