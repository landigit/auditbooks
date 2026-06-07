import { defineComponent, h } from 'vue';

// Safe mock components for reka-ui elements under Lynx
const DummyComponent = defineComponent({
  name: 'DummyRekaComponent',
  setup(_, { slots }) {
    return () => (slots.default ? slots.default() : h('view'));
  },
});

export const Primitive = DummyComponent;
export const DialogDescription = DummyComponent;
export const DialogTitle = DummyComponent;
export const PopoverTrigger = DummyComponent;
export const PopoverAnchor = DummyComponent;
export const TooltipTrigger = DummyComponent;
export const HoverCardTrigger = DummyComponent;
export const DialogTrigger = DummyComponent;
export const DialogPortal = DummyComponent;
export const DialogClose = DummyComponent;
export const DialogOverlay = DummyComponent;
export const Popover = DummyComponent;
export const PopoverContent = DummyComponent;
export const Tooltip = DummyComponent;
export const TooltipContent = DummyComponent;
export const HoverCard = DummyComponent;
export const HoverCardContent = DummyComponent;
export const Dialog = DummyComponent;
export const DialogContent = DummyComponent;
export const ScrollArea = DummyComponent;
export const Calendar = DummyComponent;
