<template>
  <Dialog :open="true" @update:open="setPriceList">
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
              <LucideIcon name="tag" class="w-4 h-4 text-primary" />
              {{ t`Apply Price List` }}
            </h3>
            <p
              class="text-[10px] text-gray-500 dark:text-gray-400 font-medium tracking-normal normal-case"
            >
              {{ t`Change pricing strategy` }}
            </p>
          </div>
        </div>

        <!-- Content -->
        <div class="p-8 space-y-6">
          <div class="space-y-4">
            <div class="relative group">
              <label
                class="text-[10px] font-semibold normal-case tracking-normal text-gray-500 dark:text-gray-400 mb-2 block"
                >{{ t`Price List` }}</label
              >
              <div class="flex gap-2">
                <Select v-model="selectedPriceList" class="flex-1">
                  <SelectTrigger
                    class="h-14 rounded-lg bg-gray-50 dark:bg-gray-890 border-gray-100 dark:border-gray-800 focus:border-primary/50 focus:ring-primary/20 transition-all font-bold"
                  >
                    <SelectValue :placeholder="t`Choose a price list...`" />
                  </SelectTrigger>
                  <SelectContent
                    class="bg-white dark:bg-gray-875 border-gray-200 dark:border-gray-800 rounded-md"
                  >
                    <SelectGroup>
                      <SelectItem
                        v-for="option in priceListOptions"
                        :key="option.value"
                        :value="option.value"
                        class="hover:bg-primary/10 rounded-md font-medium"
                      >
                        {{ option.label }}
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <UIButton
                  variant="outline"
                  class="h-14 w-14 rounded-lg border-gray-100 dark:border-gray-800 hover:bg-red-500/10 hover:border-red-500/20 text-red-400 transition-all shrink-0"
                  @click="removePriceList"
                >
                  <LucideIcon name="trash-2" class="w-5 h-5" />
                </UIButton>
              </div>
            </div>

            <div
              class="bg-primary/5 rounded-lg p-4 border border-primary/10 flex items-center gap-4"
            >
              <div
                class="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center"
              >
                <LucideIcon name="info" class="w-5 h-5 text-primary" />
              </div>
              <div>
                <p
                  class="text-[10px] font-bold text-primary normal-case tracking-normal"
                >
                  {{ t`Pricing Note` }}
                </p>
                <p class="text-xs text-gray-600 dark:text-gray-300 font-medium">
                  {{
                    t`Changing the price list will update the rates of all items in this invoice.`
                  }}
                </p>
              </div>
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
            @click="cancelPriceList"
          >
            {{ t`Cancel` }}
          </UIButton>
          <UIButton
            class="h-14 rounded-lg font-semibold normal-case tracking-normal text-[10px] shadow-lg hover:translate-y-[-2px] active:translate-y-[0px] transition-all"
            @click="handleSave"
          >
            {{ t`Apply & Save` }}
          </UIButton>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script lang="ts">
import { defineComponent, inject } from 'vue';
import { t } from 'fyo';
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
import { SalesInvoice } from 'models/baseModels/SalesInvoice/SalesInvoice';
import { ModelNameEnum } from 'models/types';
import { fyo } from 'src/initFyo';
import { PriceListSchema } from 'src/shared/schemas';
import { showToast } from 'src/utils/interactive';

export default defineComponent({
  name: 'PriceListModal',
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
  emits: ['toggleModal'],
  setup() {
    return {
      t,
      sinvDoc: inject('sinvDoc') as SalesInvoice,
    };
  },
  data() {
    return {
      selectedPriceList: ((this as any).sinvDoc?.priceList as string) || '',
      priceListOptions: [] as { label: string; value: string }[],
    };
  },
  async mounted() {
    await this.loadPriceLists();
  },
  methods: {
    async loadPriceLists() {
      try {
        const priceLists = (await fyo.db.getAll(ModelNameEnum.PriceList, {
          fields: ['name'],
        })) as { name: string }[];
        this.priceListOptions = priceLists.map((pl) => ({
          label: pl.name,
          value: pl.name,
        }));
      } catch (error) {
        showToast({ type: 'error', message: t`Failed to load price lists` });
      }
    },
    async removePriceList() {
      this.selectedPriceList = '';
      await this.sinvDoc.set('priceList', '');
    },
    async handleSave() {
      const result = PriceListSchema.safeParse({
        priceList: this.selectedPriceList,
      });
      if (!result.success) {
        showToast({ type: 'error', message: t`Invalid selection` });
        return;
      }
      await this.applyPriceList(this.selectedPriceList);
    },
    async applyPriceList(value?: string) {
      try {
        await this.sinvDoc.set('priceList', value || '');
        this.$emit('toggleModal', 'PriceList');
      } catch (error) {
        showToast({
          type: 'error',
          message: t`${error as string}`,
        });
      }
    },
    cancelPriceList() {
      this.$emit('toggleModal', 'PriceList');
    },
    setPriceList() {
      this.$emit('toggleModal', 'PriceList');
    },
  },
});
</script>
