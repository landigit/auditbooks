<template>
  <HugeiconsIcon
    :icon="mappedIcon"
    :size="size"
    :stroke-width="strokeWidth || 1.5"
    class="feather-icon"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import HugeiconsIcon from './HugeiconsIcon.vue';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  ChevronsUpIcon,
  ChevronsDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  Add01Icon,
  Delete02Icon,
  PencilIcon,
  SaveIcon,
  PrinterIcon,
  Cancel01Icon,
  CancelCircleIcon,
  CheckmarkCircle01Icon,
  CheckmarkSquare01Icon,
  Logout01Icon,
  Download01Icon,
  Upload01Icon,
  Link01Icon,
  Search01Icon,
  Settings01Icon,
  MoreHorizontalIcon,
  MoreVerticalIcon,
  RefreshIcon,
  RotateLeft01Icon,
  AddCircleIcon,
  Folder01Icon,
  FolderAddIcon,
  File01Icon,
  Pdf01Icon,
  Invoice04Icon,
  AddInvoiceIcon,
  FileAttachmentIcon,
  ComputerIcon,
  Book01Icon,
  BookOpen01Icon,
  ClipboardIcon,
  DatabaseIcon,
  HelpCircleIcon,
  InformationCircleIcon,
  AlertCircleIcon,
  TriangleIcon,
  Notification01Icon,
  UserIcon,
  UserGroupIcon,
  Mail01Icon,
  Calendar01Icon,
  Clock01Icon,
  LockIcon,
  CircleUnlock01Icon,
  Key01Icon,
  EyeIcon,
  EyeOffIcon,
  CopyIcon,
  Menu01Icon,
  FilterIcon,
  StarIcon,
  Image01Icon,
  DollarSignIcon,
  PercentIcon,
  Tag01Icon,
  Share01Icon,
  ExternalLinkIcon,
  SlidersHorizontalIcon,
  GridIcon,
  ListViewIcon,
  CommandIcon,
  Flag01Icon,
  MinimizeScreenIcon,
  MaximizeScreenIcon,
} from 'src/assets/icons/hugeicons';

const props = withDefaults(
  defineProps<{
    name: string;
    size?: number | string;
    strokeWidth?: number;
  }>(),
  {
    size: '100%',
  }
);

// Map of Feather icon names to Hugeicons exports
const iconMap: Record<string, any> = {
  // Navigation
  'chevron-left': ChevronLeftIcon,
  'chevron-right': ChevronRightIcon,
  'chevron-down': ChevronDownIcon,
  'chevron-up': ChevronUpIcon,
  'chevrons-left': ChevronsLeftIcon,
  'chevrons-right': ChevronsRightIcon,
  'chevrons-up': ChevronsUpIcon,
  'chevrons-down': ChevronsDownIcon,
  'arrow-left': ArrowLeftIcon,
  'arrow-right': ArrowRightIcon,
  'arrow-up': ArrowUpIcon,
  'arrow-down': ArrowDownIcon,

  // Actions
  plus: Add01Icon,
  trash: Delete02Icon,
  'trash-2': Delete02Icon,
  edit: PencilIcon,
  save: SaveIcon,
  printer: PrinterIcon,
  x: Cancel01Icon,
  'x-circle': CancelCircleIcon,
  close: Cancel01Icon,
  check: CheckmarkCircle01Icon,
  'check-circle': CheckmarkCircle01Icon,
  'check-square': CheckmarkSquare01Icon,
  'green-check': CheckmarkCircle01Icon,
  'log-out': Logout01Icon,
  download: Download01Icon,
  upload: Upload01Icon,
  link: Link01Icon,
  search: Search01Icon,
  settings: Settings01Icon,
  'more-horizontal': MoreHorizontalIcon,
  'more-vertical': MoreVerticalIcon,
  'refresh-cw': RefreshIcon,
  'refresh-ccw': RefreshIcon,
  'rotate-ccw': RotateLeft01Icon,
  'plus-circle': AddCircleIcon,
  sliders: SlidersHorizontalIcon,
  grid: GridIcon,
  list: ListViewIcon,
  minimize: MinimizeScreenIcon,
  maximize: MaximizeScreenIcon,

  // Items / Folders
  folder: Folder01Icon,
  'folder-plus': FolderAddIcon,
  file: File01Icon,
  'file-text': Pdf01Icon,
  'invoice-04': Invoice04Icon,
  'add-invoice': AddInvoiceIcon,
  'file-attachment': FileAttachmentIcon,
  monitor: ComputerIcon,
  book: Book01Icon,
  'book-open': BookOpen01Icon,
  clipboard: ClipboardIcon,
  database: DatabaseIcon,
  'help-circle': HelpCircleIcon,
  info: InformationCircleIcon,
  'alert-circle': AlertCircleIcon,
  'alert-triangle': TriangleIcon,
  bell: Notification01Icon,
  user: UserIcon,
  users: UserGroupIcon,
  mail: Mail01Icon,
  calendar: Calendar01Icon,
  clock: Clock01Icon,
  lock: LockIcon,
  unlock: CircleUnlock01Icon,
  key: Key01Icon,
  eye: EyeIcon,
  'eye-off': EyeOffIcon,
  copy: CopyIcon,
  menu: Menu01Icon,
  filter: FilterIcon,
  star: StarIcon,
  image: Image01Icon,
  'dollar-sign': DollarSignIcon,
  percent: PercentIcon,
  tag: Tag01Icon,
  'share-2': Share01Icon,
  'external-link': ExternalLinkIcon,
  command: CommandIcon,
  flag: Flag01Icon,
};

const mappedIcon = computed(() => {
  if (iconMap[props.name]) {
    return iconMap[props.name];
  }

  // Global fallback
  console.warn(`Hugeicon not found for feather name: ${props.name}`);
  return HelpCircleIcon;
});
</script>
