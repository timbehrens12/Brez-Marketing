import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/landing/**/*.{js,ts,jsx,tsx,mdx}", // Explicitly added
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}", // Added src just in case
    "*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
  	extend: {
  		colors: {
            // Custom Landing Page Colors - Defined first to ensure availability
            brand: '#FF1F1F',       
            'brand-dark': '#8a0a0a', 
            charcoal: '#0A0A0C',    
            silver: '#C0C0C0',
            white: '#FFFFFF',
            
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
        fontFamily: {
            sans: ['var(--font-sans)', 'Inter', 'sans-serif'],
            mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
            display: ['var(--font-display)', 'Syncopate', 'sans-serif'],
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
            glitch: {
                '2%, 64%': { transform: 'translate(2px,0) skew(0deg)' },
                '4%, 60%': { transform: 'translate(-2px,0) skew(0deg)' },
                '62%': { transform: 'translate(0,0) skew(5deg)' },
            },
            shine: {
                '0%': { backgroundPosition: '200% center' },
                '100%': { backgroundPosition: '-200% center' },
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
            'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            'glitch': 'glitch 1s linear infinite',
            'shine': 'shine 3s linear infinite',
  		}
  	}
  },
  // Safelist critical classes to ensure they are generated
  safelist: [
    'text-brand',
    'bg-brand',
    'border-brand',
    'bg-charcoal',
    'text-silver',
    'font-display',
    'font-mono',
    'bg-brand/10',
    'bg-brand/20',
    'border-brand/30',
    'border-brand/50',
    'hover:border-brand/50',
    'group-hover:text-brand',
  ],
  plugins: [require("tailwindcss-animate")],
};
export default config;
