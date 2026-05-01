import asyncio
from playwright.async_api import async_playwright

# Nordic Tech Palette - Stockholm winter, code aesthetic
COLORS = {
    "primary": "#2E4A62",      # Deep fjord blue
    "secondary": "#4A6B82",    # Slate blue
    "accent": "#5B8FA8",       # Nordic teal
    "light": "#8BAFC4",        # Ice blue
    "pale": "#B8D4E3",         # Pale ice
    "dark": "#1A2F3D",         # Deep navy
    "bg": "#E8F1F5",           # Light ice bg
    "gold": "#C4A35A",         # Subtle Nordic gold accent
}

def cover_svg():
    return f"""
    <svg xmlns="http://www.w3.org/2000/svg" width="794" height="1123">
        <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="{COLORS['dark']}" />
                <stop offset="50%" stop-color="{COLORS['primary']}" />
                <stop offset="100%" stop-color="{COLORS['secondary']}" />
            </linearGradient>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="{COLORS['accent']}" stop-opacity="0.3" />
                <stop offset="100%" stop-color="{COLORS['light']}" stop-opacity="0.05" />
            </linearGradient>
            <radialGradient id="glow" cx="30%" cy="30%">
                <stop offset="0%" stop-color="{COLORS['light']}" stop-opacity="0.15" />
                <stop offset="100%" stop-color="transparent" />
            </radialGradient>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="{COLORS['accent']}" stroke-width="0.5" opacity="0.08"/>
            </pattern>
            <pattern id="code" width="60" height="12" patternUnits="userSpaceOnUse">
                <rect x="0" y="3" width="20" height="2" rx="1" fill="{COLORS['light']}" opacity="0.06"/>
                <rect x="25" y="3" width="12" height="2" rx="1" fill="{COLORS['pale']}" opacity="0.04"/>
                <rect x="42" y="3" width="18" height="2" rx="1" fill="{COLORS['accent']}" opacity="0.05"/>
                <rect x="8" y="7" width="15" height="2" rx="1" fill="{COLORS['accent']}" opacity="0.04"/>
                <rect x="28" y="7" width="22" height="2" rx="1" fill="{COLORS['light']}" opacity="0.05"/>
            </pattern>
            <filter id="blur" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="40"/>
            </filter>
        </defs>
        
        <!-- Base -->
        <rect width="794" height="1123" fill="url(#bg)"/>
        
        <!-- Grid pattern overlay -->
        <rect width="794" height="1123" fill="url(#grid)"/>
        
        <!-- Code pattern overlay -->
        <rect x="0" y="500" width="794" height="623" fill="url(#code)"/>
        
        <!-- Glowing orbs -->
        <circle cx="200" cy="300" r="180" fill="url(#glow)" filter="url(#blur)"/>
        <circle cx="650" cy="800" r="220" fill="url(#glow)" filter="url(#blur)"/>
        
        <!-- Geometric shapes - circuit-like lines -->
        <g opacity="0.12">
            <path d="M 0 200 Q 200 150 400 250 T 794 200" fill="none" stroke="{COLORS['light']}" stroke-width="1.5"/>
            <path d="M 0 280 Q 250 220 500 320 T 794 260" fill="none" stroke="{COLORS['accent']}" stroke-width="1"/>
            <path d="M 0 900 Q 300 850 600 950 T 794 880" fill="none" stroke="{COLORS['light']}" stroke-width="1"/>
        </g>
        
        <!-- Diagonal accent -->
        <polygon points="0,0 250,0 0,400" fill="url(#grad1)" opacity="0.5"/>
        <polygon points="794,1123 544,1123 794,723" fill="url(#grad1)" opacity="0.3"/>
        
        <!-- Hexagonal nodes (network) -->
        <g opacity="0.15">
            <polygon points="120,180 140,165 160,180 160,205 140,220 120,205" fill="none" stroke="{COLORS['light']}" stroke-width="1"/>
            <polygon points="680,850 700,835 720,850 720,875 700,890 680,875" fill="none" stroke="{COLORS['light']}" stroke-width="1"/>
            <polygon points="650,880 670,865 690,880 690,905 670,920 650,905" fill="none" stroke="{COLORS['accent']}" stroke-width="0.8"/>
        </g>
        
        <!-- Connecting lines between nodes -->
        <g opacity="0.1">
            <line x1="160" y1="192" x2="680" y2="862" stroke="{COLORS['accent']}" stroke-width="0.8" stroke-dasharray="8,6"/>
        </g>
        
        <!-- Subtle gold accent -->
        <circle cx="140" cy="200" r="4" fill="{COLORS['gold']}" opacity="0.4"/>
        <circle cx="700" cy="862" r="4" fill="{COLORS['gold']}" opacity="0.3"/>
    </svg>
    """

def body_svg():
    return f"""
    <svg xmlns="http://www.w3.org/2000/svg" width="794" height="1123">
        <defs>
            <linearGradient id="topgrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="{COLORS['primary']}" stop-opacity="0.06"/>
                <stop offset="100%" stop-color="transparent"/>
            </linearGradient>
            <pattern id="subtlegrid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="{COLORS['secondary']}" stroke-width="0.3" opacity="0.04"/>
            </pattern>
        </defs>
        
        <rect width="794" height="1123" fill="#FAFCFD"/>
        
        <!-- Top gradient accent -->
        <rect x="0" y="0" width="794" height="200" fill="url(#topgrad)"/>
        
        <!-- Very subtle grid -->
        <rect width="794" height="1123" fill="url(#subtlegrid)"/>
        
        <!-- Left margin accent line -->
        <rect x="0" y="0" width="4" height="1123" fill="{COLORS['primary']}" opacity="0.12"/>
        
        <!-- Corner accent -->
        <path d="M 794 0 L 700 0 L 794 100 Z" fill="{COLORS['accent']}" opacity="0.06"/>
    </svg>
    """

def backcover_svg():
    return f"""
    <svg xmlns="http://www.w3.org/2000/svg" width="794" height="1123">
        <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="{COLORS['secondary']}" />
                <stop offset="50%" stop-color="{COLORS['primary']}" />
                <stop offset="100%" stop-color="{COLORS['dark']}" />
            </linearGradient>
            <radialGradient id="glow2" cx="70%" cy="60%">
                <stop offset="0%" stop-color="{COLORS['accent']}" stop-opacity="0.2" />
                <stop offset="100%" stop-color="transparent" />
            </radialGradient>
            <filter id="blur2" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="50"/>
            </filter>
        </defs>
        
        <rect width="794" height="1123" fill="url(#bg)"/>
        
        <!-- Glowing center -->
        <circle cx="397" cy="561" r="300" fill="url(#glow2)" filter="url(#blur2)"/>
        
        <!-- Subtle geometric frame -->
        <rect x="80" y="80" width="634" height="963" fill="none" stroke="{COLORS['light']}" stroke-width="0.5" opacity="0.15" rx="4"/>
        <rect x="90" y="90" width="614" height="943" fill="none" stroke="{COLORS['accent']}" stroke-width="0.3" opacity="0.1" rx="3"/>
        
        <!-- Bottom accent line -->
        <line x1="200" y1="1020" x2="594" y2="1020" stroke="{COLORS['gold']}" stroke-width="0.8" opacity="0.3"/>
    </svg>
    """

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 794, "height": 1123})
        
        out_dir = "/mnt/agents/output/kristina_ld_assets"
        
        # Cover
        await page.set_content(cover_svg())
        await page.screenshot(path=f"{out_dir}/cover_bg.png", clip={"x": 0, "y": 0, "width": 794, "height": 1123})
        print("Generated cover_bg.png")
        
        # Body
        await page.set_content(body_svg())
        await page.screenshot(path=f"{out_dir}/body_bg.png", clip={"x": 0, "y": 0, "width": 794, "height": 1123})
        print("Generated body_bg.png")
        
        # Backcover
        await page.set_content(backcover_svg())
        await page.screenshot(path=f"{out_dir}/backcover_bg.png", clip={"x": 0, "y": 0, "width": 794, "height": 1123})
        print("Generated backcover_bg.png")
        
        await browser.close()

asyncio.run(main())
