<template>
  <Dialog :open="true" @update:open="closeModal">
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
              class="text-xs font-semibold normal-case tracking-[0.3em] text-primary dark:text-primary flex items-center gap-2"
            >
              <LucideIcon name="package" class="w-4 h-4 text-primary" />
              {{ t`Batch Selection` }}
            </h3>
            <p
              class="text-[10px] text-gray-500 dark:text-gray-400 font-medium tracking-normal normal-case"
            >
              {{ itemCode || t`No Item` }}
            </p>
          </div>
        </div>

        <!-- Content -->
        <div class="p-8 space-y-6">
          <div class="space-y-4">
            <div class="relative group">
              <label
                class="text-[10px] font-semibold normal-case tracking-normal text-gray-500 dark:text-gray-400 mb-2 block"
                >{{ t`Select Batch` }}</label
              >
              <Select v-model="selectedBatch">
                <SelectTrigger
                  class="h-14 rounded-lg bg-gray-50 dark:bg-gray-890 border-gray-100 dark:border-gray-800 focus:border-primary/50 focus:ring-primary/20 transition-all font-bold"
                >
                  <SelectValue :placeholder="t`Choose a batch...`" />
                </SelectTrigger>
                <SelectContent
                  class="bg-white dark:bg-gray-875 border-gray-200 dark:border-gray-800 rounded-md"
                >
                  <SelectGroup>
                    <SelectItem
                      v-for="option in batchOptions"
                      :key="option.value"
                      :value="option.value"
                      class="hover:bg-primary/10 rounded-md"
                    >
                      {{ option.label }}
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div
              v-if="batchOptions.length === 0"
              class="py-10 text-center space-y-3 bg-gray-50 dark:bg-gray-890 rounded-lg border border-dashed border-gray-100 dark:border-gray-800"
            >
              <LucideIcon
                name="package-x"
                class="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto"
              />
              <p
                class="text-[10px] font-bold text-gray-400 dark:text-gray-500 normal-case tracking-normal"
              >
                {{ t`No Batches Available` }}
              </p>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div
          class="px-8 py-6 bg-gray-50 dark:bg-gray-890 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-4"
        >
          <UIButton
            variant="outline"
            class="h-14 rounded-lg font-semibold normal-case tracking-normal text-[10px] border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:bg-gray-800 transition-all text-red-400"
            @click="closeModal"
          >
            {{ t`Cancel` }}
          </UIButton>
          <UIButton
            class="h-14 rounded-lg font-semibold normal-case tracking-normal text-[10px] shadow-lg hover:translate-y-[-2px] active:translate-y-[0px] transition-all"
            :disabled="!selectedBatch"
            @click="submitSelection"
          >
            {{ t`Select Batch` }}
          </UIButton>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { t } from 'fyo';
import { showToast } from 'src/utils/interactive';
import {
  Dialog,
  DialogContent,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'src/components/ui';
import LucideIcon from 'src/components/LucideIcon.vue';
import { ModelNameEnum } from 'models/types';
import { fyo } from 'src/initFyo';
import { BatchSelectionSchema } from 'src/shared/schemas';

export default defineComponent({
  name: 'BatchSelectionModal',
  components: {
    Dialog,
    DialogContent,
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
    LucideIcon,
  },
  props: {
    itemCode: {
      type: String,
      required: true,
    },
  },
  emits: ['toggleModal', 'batchSelected'],
  setup() {
    return {
      t,
    };
  },
  data() {
    return {
      selectedBatch: '' as string,
      batchOptions: [] as { label: string; value: string }[],
    };
  },
  watch: {
    async itemCode(newVal) {
      if (newVal) {
        this.batchOptions = await this.getBatchOptions();
      }
    },
  },
  async mounted() {
    this.batchOptions = await this.getBatchOptions();
  },
  methods: {
    async getBatchOptions() {
      if (!this.itemCode) {
        return [];
      }

      try {
        const batches = (await fyo.db.getAll(ModelNameEnum.Batch, {
          filters: { item: this.itemCode },
          fields: ['name'],
        })) as { name: string; itemCode: string }[];

        return batches.map((b) => ({ label: b.name, value: b.name }));
      } catch (error) {
        showToast({ type: 'error', message: t`Failed to load batches` });
        return [];
      }
    },
    submitSelection() {
      const result = BatchSelectionSchema.safeParse({
        batch: this.selectedBatch,
      });
      if (!result.success) {
        showToast({ type: 'error', message: t`Please select a valid batch` });
        return;
      }

      this.$emit('batchSelected', this.selectedBatch);
      this.$emit('toggleModal', 'BatchSelection');
      this.selectedBatch = '';
    },
    closeModal() {
      this.$emit('toggleModal', 'BatchSelection');
      this.selectedBatch = '';
    },
  },
});
</script>
