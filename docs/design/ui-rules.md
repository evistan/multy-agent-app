# UI Rules

## Design tokens

- **Primary color**: [e.g. blue-600 from the Tailwind palette]
- **Accent color**: [e.g. emerald-500]
- **Border radius**: `rounded-lg` (8px) default, `rounded-full` for avatars/badges
- **Font family**: Inter (already in the Next.js default)
- **Font sizes**: text-sm (mobile body), text-base (desktop body), text-lg (headings)

## Spacing scale

Use Tailwind default values (4px increments):
- Inline gap: `gap-2` (8px) or `gap-4` (16px)
- Section padding: `p-4 md:p-6 lg:p-8`
- Page max-width: `max-w-7xl mx-auto`

## Components

### shadcn/ui (preferred)
- Button, Input, Form, Dialog, Sheet, Avatar, Card, Badge, Toast, Tabs, Select
- Install on-demand: `pnpm dlx shadcn@latest add <name>`

### Custom components (only if shadcn lacks it)
- Put in `components/ui/` if a primitive
- Put in `components/features/<domain>/` if domain-specific

## State display

| State | Element | Rule |
|-------|---------|------|
| Loading | Spinner or Skeleton | <500ms = spinner, >500ms = skeleton with real structure |
| Empty | EmptyState component | Icon + title + CTA |
| Error | ErrorState component | Icon + description + Retry button |
| Success | Toast (sonner) | Auto-dismiss after 3s |

## Responsive breakpoints

```
sm: 640px   (large phones)
md: 768px   (tablet)
lg: 1024px  (small laptop)
xl: 1280px  (desktop)
```

Mobile-first always. Default classes are for mobile.

## Accessibility

- All interactive components must be reachable via Tab
- Focus ring visible (Tailwind default is enough)
- Color contrast WCAG AA minimum (text-foreground on bg-background always)
- Form inputs always have `<label>` (not placeholder-as-label)
- Modal/Dialog: focus trap, Esc to close
- Toast notifications: `role="status"` or `role="alert"` for screen readers

## Animation

- Transitions under 200ms — beyond that feels slow
- Use Tailwind `transition-colors`, `transition-transform`
- DO NOT use `animate-bounce`, `animate-spin` for UI (only for loading spinner)

## Loading skeletons

- Real content templates (not generic boxes)
- Color: `bg-muted` (darker than background, lighter than foreground)
- Animation: `animate-pulse`
