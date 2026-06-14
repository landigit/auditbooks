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
import { HugeiconsIcon } from '@hugeicons/vue';
import * as HugeiconsFree from '@hugeicons/core-free-icons';

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
  'chevron-left': HugeiconsFree.ChevronLeftIcon,
  'chevron-right': HugeiconsFree.ChevronRightIcon,
  'chevron-down': HugeiconsFree.ChevronDownIcon,
  'chevron-up': HugeiconsFree.ChevronUpIcon,
  'chevrons-left': HugeiconsFree.ChevronsLeftIcon,
  'chevrons-right': HugeiconsFree.ChevronsRightIcon,
  'chevrons-up': HugeiconsFree.ChevronsUpIcon,
  'chevrons-down': HugeiconsFree.ChevronsDownIcon,
  'arrow-left': HugeiconsFree.ArrowLeftIcon,
  'arrow-right': HugeiconsFree.ArrowRightIcon,
  'arrow-up': HugeiconsFree.ArrowUpIcon,
  'arrow-down': HugeiconsFree.ArrowDownIcon,

  // Actions
  'plus': HugeiconsFree.Add01Icon,
  'trash': HugeiconsFree.Delete02Icon,
  'trash-2': HugeiconsFree.Delete02Icon,
  'edit': HugeiconsFree.PencilIcon,
  'save': HugeiconsFree.SaveIcon,
  'printer': HugeiconsFree.PrinterIcon,
  'x': HugeiconsFree.Cancel01Icon,
  'x-circle': HugeiconsFree.CancelCircleIcon,
  'close': HugeiconsFree.Cancel01Icon,
  'check': HugeiconsFree.CheckmarkCircle01Icon,
  'check-square': HugeiconsFree.CheckmarkSquare01Icon,
  'green-check': HugeiconsFree.CheckmarkCircle01Icon,
  'log-out': HugeiconsFree.Logout01Icon,
  'download': HugeiconsFree.Download01Icon,
  'upload': HugeiconsFree.Upload01Icon,
  'link': HugeiconsFree.Link01Icon,
  'search': HugeiconsFree.Search01Icon,
  'settings': HugeiconsFree.Settings01Icon,
  'more-horizontal': HugeiconsFree.MoreHorizontalIcon,
  'more-vertical': HugeiconsFree.MoreVerticalIcon,
  'refresh-cw': HugeiconsFree.RefreshIcon,
  'refresh-ccw': HugeiconsFree.RefreshIcon,
  'rotate-ccw': HugeiconsFree.RotateLeft01Icon,
  'plus-circle': HugeiconsFree.AddCircleIcon,

  // Items / Folders
  'folder': HugeiconsFree.Folder01Icon,
  'folder-plus': HugeiconsFree.FolderAddIcon,
  'file': HugeiconsFree.File01Icon,
  'file-text': HugeiconsFree.Pdf01Icon,
  'invoice-04': HugeiconsFree.Invoice04Icon,
  'add-invoice': HugeiconsFree.AddInvoiceIcon,
  'file-attachment': HugeiconsFree.FileAttachmentIcon,
  'monitor': HugeiconsFree.ComputerIcon,
  'book': HugeiconsFree.Book01Icon,
  'book-open': HugeiconsFree.BookOpen01Icon,
  'clipboard': HugeiconsFree.ClipboardIcon,
  'database': HugeiconsFree.DatabaseIcon,
  'help-circle': HugeiconsFree.HelpCircleIcon,
  'info': HugeiconsFree.InformationCircleIcon,
  'alert-circle': HugeiconsFree.AlertCircleIcon,
  'alert-triangle': HugeiconsFree.TriangleIcon,
  'bell': HugeiconsFree.Notification01Icon,
  'user': HugeiconsFree.UserIcon,
  'users': HugeiconsFree.UserGroupIcon,
  'mail': HugeiconsFree.Mail01Icon,
  'calendar': HugeiconsFree.Calendar01Icon,
  'clock': HugeiconsFree.Clock01Icon,
  'lock': HugeiconsFree.LockIcon,
  'unlock': HugeiconsFree.CircleUnlock01Icon,
  'key': HugeiconsFree.Key01Icon,
  'eye': HugeiconsFree.EyeIcon,
  'eye-off': HugeiconsFree.EyeOffIcon,
  'copy': HugeiconsFree.CopyIcon,
  'menu': HugeiconsFree.Menu01Icon,
  'filter': HugeiconsFree.FilterIcon,
  'star': HugeiconsFree.StarIcon,
  'image': HugeiconsFree.Image01Icon,
  'dollar-sign': HugeiconsFree.DollarSignIcon,
  'percent': HugeiconsFree.PercentIcon,
  'tag': HugeiconsFree.Tag01Icon,
  'share-2': HugeiconsFree.Share01Icon,
  'external-link': HugeiconsFree.ExternalLinkIcon,
};

const mappedIcon = computed(() => {
  // Try direct map
  if (iconMap[props.name]) {
    return iconMap[props.name];
  }

  // Dynamic fallback: convert kebab-case to PascalCase + "Icon"
  const pascalName = props.name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('') + 'Icon';

  const dynamicIcon = (HugeiconsFree as any)[pascalName];
  if (dynamicIcon) {
    return dynamicIcon;
  }

  // Global fallback
  console.warn(`Hugeicon not found for feather name: ${props.name}`);
  return HugeiconsFree.HelpCircleIcon;
});
</script>
