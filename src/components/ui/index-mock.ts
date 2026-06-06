import { defineComponent, h } from "vue";

// Safe dummy component for all UI exports in Lynx native build
const DummyComponent = defineComponent({
  name: "DummyUiComponent",
  setup(_, { slots }) {
    return () => (slots.default ? slots.default() : h("view"));
  },
});

export const Button = DummyComponent;
export const Calendar = DummyComponent;
export const DatePicker = DummyComponent;
export const DateTimePicker = DummyComponent;
export const Popover = DummyComponent;
export const PopoverTrigger = DummyComponent;
export const PopoverAnchor = DummyComponent;
export const PopoverContent = DummyComponent;
export const Tooltip = DummyComponent;
export const TooltipTrigger = DummyComponent;
export const TooltipContent = DummyComponent;
export const HoverCard = DummyComponent;
export const HoverCardTrigger = DummyComponent;
export const HoverCardContent = DummyComponent;
export const Dialog = DummyComponent;
export const DialogTrigger = DummyComponent;
export const DialogPortal = DummyComponent;
export const DialogClose = DummyComponent;
export const DialogOverlay = DummyComponent;
export const DialogContent = DummyComponent;
export const DialogHeader = DummyComponent;
export const DialogFooter = DummyComponent;
export const DialogTitle = DummyComponent;
export const DialogDescription = DummyComponent;
export const ScrollArea = DummyComponent;
