# 0009 – One publish pulse from Magic UI

## Context

There are two ways to publish: select the Published step and press "Publish", or drag a card to the Published column. Both should feel like the same action.

## Decision

- Use the Magic UI Pulsating Button (variant `pulse`) for the armed Publish button.
- Use the same keyframes and colour on the Published column during a drag: one shared utility, `animate-publish-pulse`.
- Values: a crisp ring from 0 to 8px and back, 1.5s, publish orange at 50%.
- Add reduced-motion support (the component has none): no animation, a static 4px ring.

## Consequences

- One animation to maintain.
- The state stays visible without motion.
