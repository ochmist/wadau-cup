/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Silence the firebase-admin / undici peer-dep warnings that appear in
  // Next.js Edge Runtime checks — we only use firebase-admin in Node.js
  // API routes, never in the edge runtime or browser.
  serverExternalPackages: ["firebase-admin"],

  // Firebase client SDK accesses `location` at module evaluation time (for
  // its auth-redirect detection). Polyfill it for server-side bundles so
  // static generation doesn't throw a ReferenceError.
  webpack(config, { isServer, webpack }) {
    if (isServer) {
      config.plugins.push(
        new webpack.BannerPlugin({
          banner:
            'if(typeof window==="undefined"){globalThis.window=globalThis;}' +
            'if(typeof document==="undefined"){const _el=()=>({style:{},childNodes:[],appendChild(n){this.childNodes.push(n);return n;},removeChild(n){this.childNodes=this.childNodes.filter((c)=>c!==n);return n;},setAttribute(){},getAttribute(){return null;},addEventListener(){},removeEventListener(){},cloneNode(){return _el();}});globalThis.document={createElement:_el,createTextNode:(v="")=>({nodeValue:v,textContent:v}),getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],head:_el(),body:_el(),cookie:""};}' +
            'if(typeof MutationObserver==="undefined"){globalThis.MutationObserver=class{observe(){}disconnect(){}takeRecords(){return[];}};}' +
            'if(typeof location==="undefined"){globalThis.location={href:"http://localhost/",hash:"",pathname:"/",search:"",origin:"http://localhost",hostname:"localhost",protocol:"http:",port:"",host:"localhost"};}' +
            'if(typeof localStorage==="undefined"){globalThis.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{},clear:()=>{},length:0,key:()=>null};}' +
            'if(typeof sessionStorage==="undefined"){globalThis.sessionStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{},clear:()=>{},length:0,key:()=>null};}' +
            'if(typeof indexedDB==="undefined"){globalThis.indexedDB=null;}' +
            'if(typeof navigator==="undefined"){globalThis.navigator={userAgent:"",cookieEnabled:false};}',
          raw: true,
          entryOnly: false,
        }),
      );
    }
    return config;
  },

  // Production headers — basic security posture
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
