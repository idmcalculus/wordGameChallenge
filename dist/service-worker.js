if(!self.define){let e,s={};const i=(i,n)=>(i=new URL(i+".js",n).href,s[i]||new Promise((s=>{if("document"in self){const e=document.createElement("script");e.src=i,e.onload=s,document.head.appendChild(e)}else e=i,importScripts(i),s()})).then((()=>{let e=s[i];if(!e)throw new Error(`Module ${i} didn’t register its module`);return e})));self.define=(n,c)=>{const o=e||("document"in self?document.currentScript.src:"")||location.href;if(s[o])return;let r={};const d=e=>i(e,o),f={module:{uri:o},exports:r,require:d};s[o]=Promise.all(n.map((e=>f[e]||d(e)))).then((e=>(c(...e),r)))}}define(["./workbox-c7969274"],(function(e){"use strict";self.skipWaiting(),e.clientsClaim(),e.precacheAndRoute([{url:"assets/favicon.ico",revision:"68b329da9893e34099c7d8ad5cb9c940"},{url:"assets/icons/icon-128x128.png",revision:"d41d8cd98f00b204e9800998ecf8427e"},{url:"assets/icons/icon-144x144.png",revision:"d41d8cd98f00b204e9800998ecf8427e"},{url:"assets/icons/icon-152x152.png",revision:"d41d8cd98f00b204e9800998ecf8427e"},{url:"assets/icons/icon-192x192.png",revision:"d41d8cd98f00b204e9800998ecf8427e"},{url:"assets/icons/icon-384x384.png",revision:"d41d8cd98f00b204e9800998ecf8427e"},{url:"assets/icons/icon-512x512.png",revision:"d41d8cd98f00b204e9800998ecf8427e"},{url:"assets/icons/icon-72x72.png",revision:"d41d8cd98f00b204e9800998ecf8427e"},{url:"assets/icons/icon-96x96.png",revision:"d41d8cd98f00b204e9800998ecf8427e"},{url:"css/main.2c3d8b95cbf1a927962a.css",revision:null},{url:"index.html",revision:"7016f8758c5a2761f110b5408e148567"},{url:"js/main.fdb4f94968c246205709.js",revision:null},{url:"js/main.fdb4f94968c246205709.js.LICENSE.txt",revision:"4e0e34f265fae8f33b01b27ae29d9d6f"},{url:"js/runtime.b42a968f7c9905b5b03e.js",revision:null},{url:"manifest.json",revision:"7b55618fb6030f2f60753f076be00deb"}],{}),e.registerRoute(/^https:\/\/api\.datamuse\.com\//,new e.StaleWhileRevalidate({cacheName:"api-cache",plugins:[new e.ExpirationPlugin({maxEntries:50,maxAgeSeconds:86400})]}),"GET")}));
//# sourceMappingURL=service-worker.js.map
