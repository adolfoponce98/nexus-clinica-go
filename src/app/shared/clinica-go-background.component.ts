import { Component } from '@angular/core';
@Component({
  selector: 'app-clinica-go-background',
  standalone: true,
  template: `<div class="ambient-glow cyan" aria-hidden="true"></div>
    <div class="ambient-glow pink" aria-hidden="true"></div>
    <svg
      class="clinical-pattern"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern id="clinica-go-pattern" width="380" height="310" patternUnits="userSpaceOnUse">
          <g
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <g transform="translate(35 35) rotate(-12 30 30)">
              <path d="M5 3v19c0 23 33 23 33 0V3M2 3h7m25 0h8M22 40v12c0 24 36 24 36 0v-6" />
              <circle cx="58" cy="39" r="7" />
            </g>
            <g transform="translate(270 155) rotate(9 24 24)">
              <rect width="48" height="48" rx="13" fill="currentColor" fill-opacity=".2" />
              <path d="M24 12v24M12 24h24" stroke-width="2.8" />
            </g>
            <g transform="translate(170 43) rotate(9 25 30)">
              <rect x="2" y="5" width="46" height="60" rx="7" />
              <rect x="15" y="0" width="20" height="12" rx="3" />
              <path d="M10 37h10l6-12 8 25 6-13h8" />
            </g>
            <g transform="translate(85 200) rotate(-8 27 27)">
              <circle cx="27" cy="10" r="11" />
              <path d="M3 59v-7c0-30 48-30 48 0v7H3m16-27 8 15 8-15M39 43v10m-5-5h10" />
            </g>
            <g transform="translate(260 35)"><path d="M0 22h13l7-13 9 28 8-15h18" /></g>
            <g fill="currentColor" stroke="none">
              <circle cx="181" cy="222" r="1.6" />
              <circle cx="193" cy="222" r="1.6" />
              <circle cx="205" cy="222" r="1.6" />
              <circle cx="217" cy="222" r="1.6" />
            </g>
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#clinica-go-pattern)" />
    </svg>`,
  styles: [
    `
      :host {
        position: absolute;
        inset: 0;
        display: block;
        overflow: hidden;
        pointer-events: none;
        background:
          radial-gradient(ellipse at 12% 40%, #09b9cf14, transparent 48%),
          radial-gradient(ellipse at 92% 85%, #da57cc0d, transparent 42%),
          var(--bg-primary, #f8fafc);
      }
      :host-context(.dark) {
        --clinic-pattern-color: #55a9d1;
        --clinic-pattern-opacity: 0.11;
      }
      .ambient-glow {
        position: absolute;
        width: 380px;
        height: 380px;
        border-radius: 50%;
        filter: blur(65px);
      }
      .cyan {
        background: #1ac9d91a;
        top: 12%;
        left: -180px;
      }
      .pink {
        background: #e159d41a;
        right: -200px;
        bottom: 10%;
      }
      .clinical-pattern {
        position: absolute;
        inset: -20px;
        width: calc(100% + 40px);
        height: calc(100% + 40px);
        color: var(--clinic-pattern-color, #168bb0);
        opacity: var(--clinic-pattern-opacity, 0.15);
        animation: clinical-drift 26s ease-in-out infinite alternate;
      }
      @keyframes clinical-drift {
        to {
          transform: translate3d(0, -14px, 0);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .clinical-pattern {
          animation: none;
        }
      }
    `,
  ],
})
export class ClinicaGoBackgroundComponent {}
