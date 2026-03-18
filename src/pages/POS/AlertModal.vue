<template>
  <Dialog :open="true" @update:open="$emit('toggleModal', 'Alert')">
    <DialogContent
      class="sm:max-w-[450px] p-0 overflow-hidden border-none bg-transparent shadow-none"
    >
      <div
        class="bg-white dark:bg-gray-875 border border-gray-100 dark:border-gray-800 rounded-lg shadow-xl overflow-hidden flex flex-col transition-all duration-500 animate-in fade-in zoom-in-95"
      >
        <!-- Header -->
        <div
          class="px-8 py-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-890 flex items-center justify-between"
        >
          <div class="flex flex-col gap-1">
            <h3
              class="text-xs font-semibold normal-case tracking-[0.3em] text-destructive/80 flex items-center gap-2"
            >
              <LucideIcon
                name="alert-triangle"
                class="w-4 h-4 text-destructive"
              />
              {{ t`Attention Required` }}
            </h3>
            <p
              class="text-[10px] text-gray-500 dark:text-gray-400 font-medium tracking-normal normal-case"
            >
              {{ t`Confirm Action` }}
            </p>
          </div>
        </div>

        <!-- Content -->
        <div class="p-8 space-y-4">
          <div
            class="w-16 h-16 rounded-lg bg-destructive/10 flex items-center justify-center mb-4"
          >
            <LucideIcon name="trash-2" class="w-8 h-8 text-destructive" />
          </div>
          <p
            class="text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight tracking-tight"
          >
            {{
              t`Clicking continue will remove all the selected items from this invoice.`
            }}
          </p>
          <p
            class="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed"
          >
            {{
              t`This action cannot be undone. Please ensure you have saved any necessary progress before proceeding.`
            }}
          </p>
        </div>

        <!-- Footer -->
        <div
          class="px-8 py-6 bg-gray-50 dark:bg-gray-890 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-3"
        >
          <div class="grid grid-cols-2 gap-3">
            <UIButton
              variant="outline"
              class="h-14 rounded-lg font-semibold normal-case tracking-normal text-[10px] border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:bg-gray-800 transition-all"
              @click="$emit('toggleModal', 'Alert')"
            >
              {{ t`Cancel` }}
            </UIButton>
            <UIButton
              variant="destructive"
              class="h-14 rounded-lg font-semibold normal-case tracking-normal text-[10px] shadow-[0_10px_20px_-5px_rgba(var(--destructive-rgb),0.3)] hover:translate-y-[-2px] active:translate-y-[0px] transition-all bg-destructive text-destructive-foreground"
              @click="handleContinue"
            >
              {{ t`Clear & Leave` }}
            </UIButton>
          </div>
          <UIButton
            variant="secondary"
            class="h-14 rounded-lg font-semibold normal-case tracking-normal text-[10px] border border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:bg-gray-800 transition-all bg-primary/10 text-primary"
            @click="$emit('saveAndContinue')"
          >
            {{ t`Save and Continue` }}
          </UIButton>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script lang="ts">
import Dialog from 'src/components/ui/Dialog.vue';
import DialogContent from 'src/components/ui/DialogContent.vue';
import LucideIcon from 'src/components/LucideIcon.vue';
import { defineComponent } from 'vue';
import { routeTo } from 'src/utils/ui';
import { t } from 'fyo';

export default defineComponent({
  name: 'AlertModal',
  components: {
    Dialog,
    DialogContent,
    LucideIcon,
  },
  emits: ['toggleModal', 'saveAndContinue'],
  setup() {
    return {
      t,
    };
  },
  methods: {
    handleContinue() {
      routeTo('/list/SalesInvoice');
      this.$emit('toggleModal', 'Alert');
    },
  },
});
</script>
