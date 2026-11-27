// The Smashy logo, back since round 1002 (Matthew, 2026-11-27: "bring the old logo and icons back until we get an
// artist"; rounds 860 to 1001 used a plain type wordmark): "SMASHY" in heavy serif capitals with a flame fill (black burning down to red
// and orange), a thick white band, a dark outline and a soft shadow, in the style of early-2000s
// fighting game logos. The diagonal cross through the S is Smashy's own mark.
//
// The letters are drawn shapes (outlined from Playfair Display Black), not text, so the logo needs
// no font. The white band and dark outline make it readable on light and dark backgrounds alike.
// The source artwork and the pictures used for icons and link previews live in assets/logo/.
//
// Size it with a text-size class, as before: the wordmark is 1.3em tall and its letters sit on the
// text baseline, so it lines up next to words ("Join Smashy").
import { useId } from "react";

// Each drawing is a stack: shadow, dark outline, white band, dark edge, flame fill, then the white
// cross over the S. `id` keeps the pieces' names unique when the logo appears twice on a page.

/** The full wordmark (1059 x 279 box; the letters' baseline is 42 units above the bottom edge). */
function Wordmark({ id }: { id: string }) {
  return (
    <svg
      viewBox="-5 -237 1059 279"
      aria-hidden="true"
      style={{ height: "1.3em", width: "4.934em", position: "relative", top: "0.196em", flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={`${id}-fire`} gradientUnits="userSpaceOnUse" x1="0" y1="-216.6" x2="0" y2="4">
          <stop offset="0" stopColor="#070606"/>
          <stop offset="0.36" stopColor="#1c0303"/>
          <stop offset="0.58" stopColor="#860909"/>
          <stop offset="0.8" stopColor="#d91d15"/>
          <stop offset="1" stopColor="#ff641c"/>
        </linearGradient>
        <filter id={`${id}-wobble`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.005 0.011" numOctaves="3" seed="11" result="n"/>
          <feDisplacementMap in="SourceGraphic" in2="n" scale="170" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
        <filter id={`${id}-ember`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.011 0.019" numOctaves="4" seed="4"/>
          <feColorMatrix values="0 0 0 0 0.86  0 0 0 0 0.1  0 0 0 0 0.05  3.4 0 0 0 -1.62"/>
        </filter>
        <filter id={`${id}-soft`} x="-10%" y="-10%" width="120%" height="130%">
          <feGaussianBlur stdDeviation="3"/>
        </filter>
        <path id={`${id}-s`} d="M90.6-216.6L90.6-216.6Q110.1-216.6 120.9-212.7Q131.7-208.8 139.2-204.6L139.2-204.6Q142.8-202.5 145.0-201.4Q147.3-200.4 149.4-200.4L149.4-200.4Q152.4-200.4 153.8-203.7Q155.1-207 156-213.6L156-213.6L162.9-213.6Q162.6-207.3 162.2-198.9Q161.7-190.5 161.5-176.7Q161.4-162.9 161.4-140.4L161.4-140.4L154.5-140.4Q153.3-156.9 146.8-172.5Q140.4-188.1 129.2-198.3Q117.9-208.5 102.3-208.5L102.3-208.5Q89.1-208.5 80.4-201.3Q71.7-194.1 71.7-180.6L71.7-180.6Q71.7-169.5 77.1-161.5Q82.5-153.6 94.0-144.9Q105.6-136.2 124.5-123L124.5-123Q138-113.7 148.9-104.4Q159.9-95.1 166.5-83.4Q173.1-71.7 173.1-55.2L173.1-55.2Q173.1-35.1 161.8-21.9Q150.6-8.7 132-2.3Q113.4 4.2 91.5 4.2L91.5 4.2Q71.1 4.2 58.9 0.6Q46.8-3 38.4-6.9L38.4-6.9Q31.8-11.1 28.2-11.1L28.2-11.1Q25.2-11.1 23.8-7.8Q22.5-4.5 21.6 2.1L21.6 2.1L14.7 2.1Q15.3-5.7 15.4-16.1Q15.6-26.4 15.8-42.9Q15.9-59.4 15.9-84.9L15.9-84.9L22.8-84.9Q24-63.9 29.5-45.6Q35.1-27.3 46.6-16.1Q58.2-4.8 77.4-4.8L77.4-4.8Q88.5-4.8 96.5-8.3Q104.4-11.7 108.9-18.3Q113.4-24.9 113.4-34.2L113.4-34.2Q113.4-46.8 107.7-56.3Q102-65.7 92.3-74.0Q82.5-82.2 69.6-90.6L69.6-90.6Q55.5-100.2 43.2-109.8Q30.9-119.4 23.6-131.4Q16.2-143.4 16.2-159.9L16.2-159.9Q16.2-179.7 26.7-192.2Q37.2-204.6 54.3-210.6Q71.4-216.6 90.6-216.6Z"/>
        <path id={`${id}-rest`} d="M395.5-161.4L395.5-161.4L395.5-156.9Q388.7-156.6 385.2-155.2Q381.6-153.7 380.5-149.7Q379.3-145.7 379.3-137.3L379.3-137.3L379.3-24.2Q379.3-16.0 380.6-11.9Q381.9-7.8 385.3-6.4Q388.7-5.0 395.5-4.6L395.5-4.6L395.5 0Q388.5-0.5 377.5-0.6Q366.6-0.7 355.2-0.7L355.2-0.7Q342.9-0.7 332.0-0.6Q321.2-0.5 314.6 0L314.6 0L314.6-4.6Q322.3-5.0 326.3-6.4Q330.3-7.8 331.7-11.9Q333.1-16.0 333.1-24.2L333.1-24.2L333.1-140.7L278.1-0.2L274.5-0.2L210.2-146.6L210.2-44.7Q210.2-29.4 211.4-21.3Q212.7-13.2 217.6-9.7Q222.5-6.2 233.2-4.6L233.2-4.6L233.2 0Q228.6-0.5 221.3-0.6Q214.0-0.7 207.7-0.7L207.7-0.7Q202.6-0.7 197.4-0.6Q192.2-0.5 188.7 0L188.7 0L188.7-4.6Q195.8-6.2 199.2-9.5Q202.6-12.8 203.8-20.1Q204.9-27.4 204.9-40.1L204.9-40.1L204.9-137.3Q204.9-145.7 203.8-149.7Q202.6-153.7 199.1-155.2Q195.6-156.6 188.7-156.9L188.7-156.9L188.7-161.4Q192.2-161.2 197.4-161.0Q202.6-160.7 207.7-160.7L207.7-160.7Q220.9-160.7 233.0-161.0Q245.1-161.2 254.9-161.4L254.9-161.4L298.0-64.5L335.3-160.7L355.2-160.7Q366.6-160.7 377.5-161.0Q388.5-161.2 395.5-161.4ZM488.7-161.4L488.7-161.4L543.8-19.2Q547.0-11.4 550.7-8.1Q554.3-4.8 557.3-4.6L557.3-4.6L557.3 0Q549.1-0.5 538.1-0.6Q527.2-0.7 515.8-0.7L515.8-0.7Q504.2-0.7 493.9-0.6Q483.6-0.5 477.5 0L477.5 0L477.5-4.6Q489.1-5.0 492.2-8.6Q495.3-12.1 490.7-23.7L490.7-23.7L477.3-61.1L431.2-61.1L427.3-50.8Q421.6-36.0 420.4-27.0Q419.1-18.0 421.4-13.2Q423.7-8.4 428.7-6.6Q433.7-4.8 440.6-4.6L440.6-4.6L440.6 0Q432.1-0.5 425.4-0.6Q418.7-0.7 410.7-0.7L410.7-0.7Q406.4-0.7 401.5-0.6Q396.6-0.5 393.1 0L393.1 0L393.1-4.6Q398.4-5.5 403.5-11.3Q408.6-17.1 414.1-31.2L414.1-31.2L464.7-161.4Q470.2-161.0 476.7-161.0Q483.2-161.0 488.7-161.4ZM433.0-65.7L475.7-65.7L454.9-122.7L433.0-65.7ZM620.6-164.6L620.6-164.6Q635.4-164.6 643.6-161.7Q651.8-158.7 657.5-155.5L657.5-155.5Q660.2-153.9 661.9-153.1Q663.6-152.3 665.2-152.3L665.2-152.3Q667.5-152.3 668.5-154.8Q669.6-157.3 670.3-162.3L670.3-162.3L675.5-162.3Q675.3-157.5 674.9-151.2Q674.6-144.8 674.5-134.3Q674.4-123.8 674.4-106.7L674.4-106.7L669.1-106.7Q668.2-119.2 663.3-131.1Q658.4-143.0 649.9-150.7Q641.3-158.5 629.4-158.5L629.4-158.5Q619.4-158.5 612.8-153.0Q606.2-147.5 606.2-137.3L606.2-137.3Q606.2-128.8 610.3-122.8Q614.4-116.7 623.2-110.1Q632.0-103.5 646.3-93.5L646.3-93.5Q656.6-86.4 664.9-79.3Q673.2-72.3 678.2-63.4Q683.3-54.5 683.3-42.0L683.3-42.0Q683.3-26.7 674.7-16.6Q666.2-6.6 652.0-1.7Q637.9 3.2 621.2 3.2L621.2 3.2Q605.7 3.2 596.5 0.5Q587.3-2.3 580.9-5.2L580.9-5.2Q575.9-8.4 573.1-8.4L573.1-8.4Q570.8-8.4 569.8-5.9Q568.8-3.4 568.1 1.6L568.1 1.6L562.9 1.6Q563.3-4.3 563.4-12.2Q563.6-20.1 563.7-32.6Q563.8-45.1 563.8-64.5L563.8-64.5L569.0-64.5Q569.9-48.6 574.2-34.7Q578.4-20.7 587.1-12.2Q595.9-3.6 610.5-3.6L610.5-3.6Q619.0-3.6 625.0-6.3Q631.0-8.9 634.5-13.9Q637.9-18.9 637.9-26.0L637.9-26.0Q637.9-35.6 633.5-42.8Q629.2-49.9 621.8-56.2Q614.4-62.5 604.6-68.9L604.6-68.9Q593.9-76.2 584.5-83.4Q575.2-90.7 569.6-99.9Q564.0-109.0 564.0-121.5L564.0-121.5Q564.0-136.6 572.0-146.0Q580.0-155.5 593.0-160.1Q606.0-164.6 620.6-164.6ZM791.4 0L791.4 0L791.4-4.6Q798.5-5.0 801.9-6.4Q805.3-7.8 806.5-11.9Q807.6-16.0 807.6-24.2L807.6-24.2L807.6-78.9L756.3-78.9L756.3-24.2Q756.3-16.0 757.6-11.9Q758.8-7.8 762.2-6.4Q765.7-5.0 772.5-4.6L772.5-4.6L772.5 0Q765.9-0.5 755.5-0.6Q745.1-0.7 734.4-0.7L734.4-0.7Q722.1-0.7 711.3-0.6Q700.5-0.5 693.8 0L693.8 0L693.8-4.6Q700.9-5.0 704.3-6.4Q707.8-7.8 708.9-11.9Q710.0-16.0 710.0-24.2L710.0-24.2L710.0-137.3Q710.0-145.7 708.9-149.7Q707.8-153.7 704.2-155.2Q700.7-156.6 693.8-156.9L693.8-156.9L693.8-161.4Q700.5-161.2 711.3-161.0Q722.1-160.7 734.4-160.7L734.4-160.7Q745.1-160.7 755.5-161.0Q765.9-161.2 772.5-161.4L772.5-161.4L772.5-156.9Q765.7-156.6 762.1-155.2Q758.6-153.7 757.5-149.7Q756.3-145.7 756.3-137.3L756.3-137.3L756.3-83.4L807.6-83.4L807.6-137.3Q807.6-145.7 806.5-149.7Q805.3-153.7 801.8-155.2Q798.3-156.6 791.4-156.9L791.4-156.9L791.4-161.4Q798.5-161.2 809.6-161.0Q820.6-160.7 831.8-160.7L831.8-160.7Q843.4-160.7 853.7-161.0Q863.9-161.2 870.1-161.4L870.1-161.4L870.1-156.9Q863.2-156.6 859.7-155.2Q856.2-153.7 855.0-149.7Q853.9-145.7 853.9-137.3L853.9-137.3L853.9-24.2Q853.9-16.0 855.2-11.9Q856.4-7.8 859.8-6.4Q863.2-5.0 870.1-4.6L870.1-4.6L870.1 0Q863.9-0.5 853.7-0.6Q843.4-0.7 831.8-0.7L831.8-0.7Q820.6-0.7 809.6-0.6Q798.5-0.5 791.4 0ZM1017.5-161.7L1017.5-161.7L1017.5-157.1Q1012.2-154.6 1006.3-147.6Q1000.4-140.7 993.3-126.8L993.3-126.8L972.1-84.8L972.1-24.2Q972.1-16.0 973.4-11.9Q974.6-7.8 978.0-6.4Q981.5-5.0 988.3-4.6L988.3-4.6L988.3 0Q981.7-0.5 970.7-0.6Q959.8-0.7 949.1-0.7L949.1-0.7Q937.5-0.7 926.6-0.6Q915.8-0.5 909.6 0L909.6 0L909.6-4.6Q916.7-5.0 920.1-6.4Q923.5-7.8 924.7-11.9Q925.8-16.0 925.8-24.2L925.8-24.2L925.8-66.1L883.6-144.1Q879.8-151.4 876.3-154.1Q872.9-156.9 870.4-156.9L870.4-156.9L870.4-161.7Q877.5-161.0 885.1-160.6Q892.8-160.3 901.9-160.3L901.9-160.3Q913.5-160.3 927.1-160.7Q940.6-161.2 952.0-161.7L952.0-161.7L952.0-156.9Q946.3-156.9 941.6-156.4Q936.8-156.0 934.7-154.2Q932.7-152.5 934.7-148.2L934.7-148.2L967.3-85.7L977.6-106.2Q987.2-125.2 988.2-136.1Q989.2-147.1 984.2-152.0Q979.2-156.9 970.1-157.1L970.1-157.1L970.1-161.7Q978.7-161.4 985.4-161.2Q992.2-161.0 999.9-161.0L999.9-161.0Q1004.5-161.0 1009.3-161.2Q1014.1-161.4 1017.5-161.7Z"/>
        <g id={`${id}-word`}><use href={`#${id}-s`}/><use href={`#${id}-rest`}/></g>
        <clipPath id={`${id}-clip`}><use href={`#${id}-s`}/><use href={`#${id}-rest`}/></clipPath>
        <mask id={`${id}-smask`} maskUnits="userSpaceOnUse" x="-5" y="-237" width="1059" height="279">
          <use href={`#${id}-s`} fill="#fff" stroke="#fff" strokeWidth="7" strokeLinejoin="round"/>
        </mask>
      </defs>
      <use href={`#${id}-word`} transform="translate(9 11)" fill="#000" stroke="#000" strokeWidth="32" strokeLinejoin="round" opacity="0.36" filter={`url(#${id}-soft)`}/>
      <use href={`#${id}-word`} fill="#2b2b2e" stroke="#2b2b2e" strokeWidth="32" strokeLinejoin="round"/>
      <use href={`#${id}-word`} fill="#fff" stroke="#fff" strokeWidth="23" strokeLinejoin="round"/>
      <use href={`#${id}-word`} fill="#0b0a0a" stroke="#0b0a0a" strokeWidth="6" strokeLinejoin="round"/>
      <g clipPath={`url(#${id}-clip)`}>
        <rect x="-225" y="-457" width="1499" height="719" fill={`url(#${id}-fire)`} filter={`url(#${id}-wobble)`}/>
        <rect x="-225" y="-457" width="1499" height="719" filter={`url(#${id}-ember)`} opacity="0.75"/>
      </g>
      <g mask={`url(#${id}-smask)`} fill="#fff">
        <rect x="-166.1" y="-111.2" width="520" height="10" transform="rotate(-30 93.9 -106.2)"/>
        <rect x="88.9" y="-366.2" width="10" height="520" transform="rotate(-30 93.9 -106.2)"/>
      </g>
    </svg>
  );
}

/** Just the S, in a square box (for small spaces). Drawn at the same scale as the wordmark's S. */
function Mark({ id }: { id: string }) {
  return (
    <svg
      viewBox="-52.1 -251.2 300 300"
      aria-hidden="true"
      style={{ height: "1.4em", width: "1.4em", position: "relative", top: "0.228em", flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={`${id}-fire`} gradientUnits="userSpaceOnUse" x1="0" y1="-216.6" x2="0" y2="4">
          <stop offset="0" stopColor="#070606"/>
          <stop offset="0.36" stopColor="#1c0303"/>
          <stop offset="0.58" stopColor="#860909"/>
          <stop offset="0.8" stopColor="#d91d15"/>
          <stop offset="1" stopColor="#ff641c"/>
        </linearGradient>
        <filter id={`${id}-wobble`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.0043 0.0096" numOctaves="3" seed="11" result="n"/>
          <feDisplacementMap in="SourceGraphic" in2="n" scale="195.5" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
        <filter id={`${id}-ember`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.0096 0.0165" numOctaves="4" seed="4"/>
          <feColorMatrix values="0 0 0 0 0.86  0 0 0 0 0.1  0 0 0 0 0.05  3.4 0 0 0 -1.62"/>
        </filter>
        <filter id={`${id}-soft`} x="-10%" y="-10%" width="120%" height="130%">
          <feGaussianBlur stdDeviation="3.5"/>
        </filter>
        <path id={`${id}-s`} d="M90.6-216.6L90.6-216.6Q110.1-216.6 120.9-212.7Q131.7-208.8 139.2-204.6L139.2-204.6Q142.8-202.5 145.0-201.4Q147.3-200.4 149.4-200.4L149.4-200.4Q152.4-200.4 153.8-203.7Q155.1-207 156-213.6L156-213.6L162.9-213.6Q162.6-207.3 162.2-198.9Q161.7-190.5 161.5-176.7Q161.4-162.9 161.4-140.4L161.4-140.4L154.5-140.4Q153.3-156.9 146.8-172.5Q140.4-188.1 129.2-198.3Q117.9-208.5 102.3-208.5L102.3-208.5Q89.1-208.5 80.4-201.3Q71.7-194.1 71.7-180.6L71.7-180.6Q71.7-169.5 77.1-161.5Q82.5-153.6 94.0-144.9Q105.6-136.2 124.5-123L124.5-123Q138-113.7 148.9-104.4Q159.9-95.1 166.5-83.4Q173.1-71.7 173.1-55.2L173.1-55.2Q173.1-35.1 161.8-21.9Q150.6-8.7 132-2.3Q113.4 4.2 91.5 4.2L91.5 4.2Q71.1 4.2 58.9 0.6Q46.8-3 38.4-6.9L38.4-6.9Q31.8-11.1 28.2-11.1L28.2-11.1Q25.2-11.1 23.8-7.8Q22.5-4.5 21.6 2.1L21.6 2.1L14.7 2.1Q15.3-5.7 15.4-16.1Q15.6-26.4 15.8-42.9Q15.9-59.4 15.9-84.9L15.9-84.9L22.8-84.9Q24-63.9 29.5-45.6Q35.1-27.3 46.6-16.1Q58.2-4.8 77.4-4.8L77.4-4.8Q88.5-4.8 96.5-8.3Q104.4-11.7 108.9-18.3Q113.4-24.9 113.4-34.2L113.4-34.2Q113.4-46.8 107.7-56.3Q102-65.7 92.3-74.0Q82.5-82.2 69.6-90.6L69.6-90.6Q55.5-100.2 43.2-109.8Q30.9-119.4 23.6-131.4Q16.2-143.4 16.2-159.9L16.2-159.9Q16.2-179.7 26.7-192.2Q37.2-204.6 54.3-210.6Q71.4-216.6 90.6-216.6Z"/>
        <g id={`${id}-word`}><use href={`#${id}-s`}/></g>
        <clipPath id={`${id}-clip`}><use href={`#${id}-s`}/></clipPath>
        <mask id={`${id}-smask`} maskUnits="userSpaceOnUse" x="-52.1" y="-251.2" width="300" height="300">
          <use href={`#${id}-s`} fill="#fff" stroke="#fff" strokeWidth="7" strokeLinejoin="round"/>
        </mask>
      </defs>
      <use href={`#${id}-word`} transform="translate(10.4 12.6)" fill="#000" stroke="#000" strokeWidth="36.8" strokeLinejoin="round" opacity="0.36" filter={`url(#${id}-soft)`}/>
      <use href={`#${id}-word`} fill="#2b2b2e" stroke="#2b2b2e" strokeWidth="36.8" strokeLinejoin="round"/>
      <use href={`#${id}-word`} fill="#fff" stroke="#fff" strokeWidth="26.5" strokeLinejoin="round"/>
      <use href={`#${id}-word`} fill="#0b0a0a" stroke="#0b0a0a" strokeWidth="6.9" strokeLinejoin="round"/>
      <g clipPath={`url(#${id}-clip)`}>
        <rect x="-272.1" y="-471.2" width="740" height="740" fill={`url(#${id}-fire)`} filter={`url(#${id}-wobble)`}/>
        <rect x="-272.1" y="-471.2" width="740" height="740" filter={`url(#${id}-ember)`} opacity="0.75"/>
      </g>
      <g mask={`url(#${id}-smask)`} fill="#fff">
        <rect x="-166.1" y="-111.7" width="520" height="11" transform="rotate(-30 93.9 -106.2)"/>
        <rect x="88.4" y="-366.2" width="11" height="520" transform="rotate(-30 93.9 -106.2)"/>
      </g>
    </svg>
  );
}

export default function Logo({
  className = "text-3xl",
  markOnly = false,
  label = "Smashy",
}: {
  className?: string;
  markOnly?: boolean; // just the S (for small spaces)
  label?: string;
}) {
  const id = `logo-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <span role="img" aria-label={label} className={`inline-flex items-baseline leading-none ${className}`}>
      {markOnly ? <Mark id={id} /> : <Wordmark id={id} />}
    </span>
  );
}
