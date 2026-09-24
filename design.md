# Snip UI design language

## Core tokens
- Background: `#090b10` near-black with subtle warm depth
- Surface: `rgba(17, 24, 39, 0.72)` for cards and panels
- Text: `#f8fafc` primary, `#cbd5e1` secondary, `#94a3b8` muted
- Accent gradient: `linear-gradient(135deg, #f97316 0%, #f472b6 35%, #fb7185 70%, #f59e0b 100%)`
- Border: `1px solid rgba(148, 163, 184, 0.18)`
- Shadow: soft ambient glow with `0 20px 60px rgba(15, 23, 42, 0.35)`
- Glow: fixed warm radial / linear band across the full viewport top

## Type
- Font stack: `Inter, "Segoe UI", sans-serif`
- Hero headline: 48-72px, bold, tight tracking, centered
- Body: 16-18px, medium weight, low contrast for helper text
- Labels and table headings: uppercase, small letter spacing, low-contrast gray

## Spacing and radius
- Layout padding: 24-48px outer, 20-28px card padding
- Input height: generous pill radius, comfortable padding
- Card radius: 22-28px
- Button radius: fully rounded pill
- Gap scale: 8, 12, 16, 20, 28, 40

## Mapping to Snip
- Page header / hero: large centered title + muted subline
- URL form: large pill container, input + gradient action button, chat-like centerpiece
- Result/error notices: compact inline cards with border + subdued background
- Links table: dark card with rounded corners and subtle borders, rows separated by lines

## Usage
Use a dark, airy composition with lots of breathing room, generous rounded corners, and a warm coral/pink/orange accent glow behind the top section only. Keep the interface minimal and product-like; the glow is atmospheric, not decorative clutter.
