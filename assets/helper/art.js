/* The helper character (issue #12): the café's head barista, Jesica (EN) / Ülkü (TR). Original artwork, drawn as an
   inline SVG so the poses can be animated with CSS (see css/helper.css). Loaded as a script so it also works from file://.
   Parts with classes: .arm-a / .arm-b (viewer's left / right arm, rotate at the shoulder), .eyes / .eyes-happy, .brows,
   .m-smile / .m-open / .m-o (mouths), #hlName (the name badge). Light comes from the upper left like everywhere else. */
const HELPER_ART = `<svg class="helper-art" viewBox="0 0 160 222" aria-hidden="true">
  <defs>
    <linearGradient id="hlHair" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3a2318"/><stop offset=".32" stop-color="#5e3622"/><stop offset=".62" stop-color="#b9783f"/><stop offset="1" stop-color="#e6b670"/>
    </linearGradient>
    <radialGradient id="hlSkin" cx=".38" cy=".34" r=".75"><stop offset="0" stop-color="#fbe2c8"/><stop offset=".6" stop-color="#f0caa4"/><stop offset="1" stop-color="#d9a77f"/></radialGradient>
    <linearGradient id="hlTop" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a4240"/><stop offset=".5" stop-color="#2b2524"/><stop offset="1" stop-color="#171313"/></linearGradient>
    <linearGradient id="hlApron" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ecd3ab"/><stop offset=".55" stop-color="#d7ad7a"/><stop offset="1" stop-color="#b98652"/></linearGradient>
  </defs>
  <g class="hl-body">
    <!-- long hair behind the shoulders: dark roots fading to caramel and honey ends -->
    <path d="M44 66 Q34 120 30 196 Q56 206 80 204 Q104 206 130 196 Q126 120 116 66 Z" fill="url(#hlHair)" stroke="#4b2e2b" stroke-width="3" stroke-linejoin="round"/>
    <!-- black top -->
    <path d="M24 222 L26 168 Q30 140 60 132 L100 132 Q130 140 134 168 L136 222 Z" fill="url(#hlTop)" stroke="#4b2e2b" stroke-width="3" stroke-linejoin="round"/>
    <!-- apron in the café's wood/cream tones, with straps, a pocket and the name badge -->
    <path d="M50 152 L110 152 L116 222 L44 222 Z" fill="url(#hlApron)" stroke="#4b2e2b" stroke-width="3" stroke-linejoin="round"/>
    <path d="M56 152 L64 132 M104 152 L96 132" stroke="#b98652" stroke-width="5" stroke-linecap="round"/>
    <path d="M58 196 h44 v18 h-44z" fill="none" stroke="#a5743f" stroke-width="2"/>
    <rect x="58" y="160" width="44" height="15" rx="4" fill="#fffaf3" stroke="#4b2e2b" stroke-width="2"/>
    <text id="hlName" x="80" y="171" text-anchor="middle" font-family="Nunito, system-ui, sans-serif" font-weight="800" font-size="9" fill="#4b2e2b">Jesica</text>
    <!-- neck -->
    <path d="M70 108 h20 v28 q-10 6 -20 0z" fill="#e2b48e" stroke="#4b2e2b" stroke-width="3"/>
    <!-- head -->
    <ellipse cx="80" cy="80" rx="34" ry="38" fill="url(#hlSkin)" stroke="#4b2e2b" stroke-width="3"/>
    <!-- face -->
    <g class="brows" stroke="#5e3622" stroke-width="3" stroke-linecap="round" fill="none">
      <path class="brow-a" d="M56 64 Q64 60 72 63"/><path class="brow-b" d="M88 63 Q96 60 104 64"/>
    </g>
    <g class="eyes">
      <ellipse cx="66" cy="83" rx="5.2" ry="5.8" fill="#fffdf9"/><ellipse cx="94" cy="83" rx="5.2" ry="5.8" fill="#fffdf9"/>
      <circle cx="66.5" cy="83.5" r="3.6" fill="#6b4226"/><circle cx="94.5" cy="83.5" r="3.6" fill="#6b4226"/>
      <circle cx="66.5" cy="83.5" r="1.8" fill="#2a1810"/><circle cx="94.5" cy="83.5" r="1.8" fill="#2a1810"/>
      <circle cx="65.2" cy="82" r="1.2" fill="#fff"/><circle cx="93.2" cy="82" r="1.2" fill="#fff"/>
    </g>
    <g class="eyes-happy" stroke="#4b2e2b" stroke-width="3" stroke-linecap="round" fill="none">
      <path d="M60 85 Q66 78 72 85"/><path d="M88 85 Q94 78 100 85"/>
    </g>
    <path d="M81 88 Q85 96 79 98" stroke="#c48a64" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <ellipse cx="58" cy="97" rx="6.5" ry="4" fill="#f4a9a0" opacity=".6"/><ellipse cx="102" cy="97" rx="6.5" ry="4" fill="#f4a9a0" opacity=".6"/>
    <path class="m-smile" d="M71 104 Q80 111 89 104" stroke="#4b2e2b" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path class="m-open" d="M71 103 Q80 116 89 103 Q80 106 71 103Z" fill="#8a3a33" stroke="#4b2e2b" stroke-width="2.5" stroke-linejoin="round"/>
    <ellipse class="m-o" cx="80" cy="106" rx="4" ry="4.5" fill="#8a3a33" stroke="#4b2e2b" stroke-width="2.5"/>
    <!-- big round thick black glasses with little gold hinges: her signature -->
    <g class="glasses">
      <circle cx="66" cy="83" r="14" fill="rgba(210,232,240,.16)" stroke="#1d1715" stroke-width="4.5"/>
      <circle cx="94" cy="83" r="14" fill="rgba(210,232,240,.16)" stroke="#1d1715" stroke-width="4.5"/>
      <path d="M78 82 Q80 79 82 82" stroke="#1d1715" stroke-width="4" fill="none"/>
      <path d="M52 81 L46 78 M108 81 L114 78" stroke="#1d1715" stroke-width="4" stroke-linecap="round"/>
      <circle cx="52" cy="81" r="2.2" fill="#e0b44a"/><circle cx="108" cy="81" r="2.2" fill="#e0b44a"/>
      <path d="M58 75 Q61 72 65 71" stroke="#fff" stroke-width="2" stroke-linecap="round" fill="none" opacity=".75"/>
      <path d="M86 75 Q89 72 93 71" stroke="#fff" stroke-width="2" stroke-linecap="round" fill="none" opacity=".75"/>
    </g>
    <!-- hair in front: parted in the middle, strands framing the face -->
    <path d="M80 42 Q54 40 46 64 Q40 94 44 132 Q50 108 52 86 Q56 60 80 47 Z" fill="url(#hlHair)" stroke="#4b2e2b" stroke-width="3" stroke-linejoin="round"/>
    <path d="M80 42 Q106 40 114 64 Q120 94 116 132 Q110 108 108 86 Q104 60 80 47 Z" fill="url(#hlHair)" stroke="#4b2e2b" stroke-width="3" stroke-linejoin="round"/>
    <path d="M62 50 Q70 44 78 45" stroke="rgba(255,225,180,.55)" stroke-width="3" stroke-linecap="round" fill="none"/>
    <path d="M48 88 Q47 104 48 118" stroke="rgba(255,225,180,.4)" stroke-width="2.5" stroke-linecap="round" fill="none"/>
  </g>
  <!-- arms: hang at the sides, rotate at the shoulder for the poses -->
  <g class="arm arm-a">
    <path d="M30 148 Q22 176 28 206 L44 206 Q42 178 48 150 Z" fill="url(#hlTop)" stroke="#4b2e2b" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="36" cy="211" r="8.5" fill="#f0caa4" stroke="#4b2e2b" stroke-width="3"/>
    <path class="finger" d="M36 211 l0 14" stroke="#4b2e2b" stroke-width="7" stroke-linecap="round"/>
    <path class="finger" d="M36 211 l0 14" stroke="#f0caa4" stroke-width="3.5" stroke-linecap="round"/>
  </g>
  <g class="arm arm-b">
    <path d="M130 148 Q138 176 132 206 L116 206 Q118 178 112 150 Z" fill="url(#hlTop)" stroke="#4b2e2b" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="124" cy="211" r="8.5" fill="#f0caa4" stroke="#4b2e2b" stroke-width="3"/>
    <path class="finger" d="M124 211 l0 14" stroke="#4b2e2b" stroke-width="7" stroke-linecap="round"/>
    <path class="finger" d="M124 211 l0 14" stroke="#f0caa4" stroke-width="3.5" stroke-linecap="round"/>
  </g>
</svg>`;
