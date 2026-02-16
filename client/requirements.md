## Packages
recharts | For visualizing transaction history and balance trends
framer-motion | For smooth page transitions and micro-interactions
date-fns | For formatting dates in transaction history
lucide-react | For beautiful icons (already in base, but emphasizing usage)
clsx | For conditional class names (already in base)
tailwind-merge | For merging tailwind classes (already in base)

## Notes
- Authentication uses cookie-based sessions (credentials: "include" is critical)
- Backend provides /api/user for current user state
- Admin routes require is_admin check on frontend for UI hiding (backend enforces security)
- Currency formatting should use Intl.NumberFormat
