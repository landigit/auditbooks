<template>
  <Dialog :open="true" @update:open="closeModal">
    <DialogContent
      class="sm:max-w-[500px] p-0 overflow-hidden border-none bg-transparent shadow-none"
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
              <LucideIcon name="help-circle" class="w-4 h-4 text-primary" />
              {{ t`Item Enquiry` }}
            </h3>
            <p
              class="text-[10px] text-gray-500 dark:text-gray-400 font-medium tracking-normal normal-case"
            >
              {{ t`Submit a new product inquiry` }}
            </p>
          </div>
        </div>

        <ScrollArea class="max-h-[70vh]">
          <form class="p-8 space-y-6" @submit="onSubmit">
            <FormField v-slot="{ field }" name="item">
              <FormItem>
                <FormLabel
                  class="text-[10px] font-semibold normal-case tracking-normal text-gray-500 dark:text-gray-400"
                  >{{ t`Item` }}</FormLabel
                >
                <FormControl>
                  <Input
                    type="text"
                    placeholder="Search for an item..."
                    class="h-14 rounded-lg bg-gray-50 dark:bg-gray-890 border-gray-100 dark:border-gray-800 focus:border-primary/50 focus:ring-primary/20 transition-all font-bold"
                    v-bind="field"
                  />
                </FormControl>
                <FormMessage
                  class="text-[10px] font-bold text-red-400 normal-case tracking-tight"
                />
              </FormItem>
            </FormField>

            <FormField v-slot="{ field }" name="description">
              <FormItem>
                <FormLabel
                  class="text-[10px] font-semibold normal-case tracking-normal text-gray-500 dark:text-gray-400"
                  >{{ t`Description` }}</FormLabel
                >
                <FormControl>
                  <Input
                    type="text"
                    placeholder="Enter description..."
                    class="h-14 rounded-lg bg-gray-50 dark:bg-gray-890 border-gray-100 dark:border-gray-800 focus:border-primary/50 focus:ring-primary/20 transition-all font-bold"
                    v-bind="field"
                  />
                </FormControl>
                <FormMessage
                  class="text-[10px] font-bold text-red-400 normal-case tracking-tight"
                />
              </FormItem>
            </FormField>

            <div class="grid grid-cols-2 gap-4">
              <FormField v-slot="{ field }" name="customer">
                <FormItem>
                  <FormLabel
                    class="text-[10px] font-semibold normal-case tracking-normal text-gray-500 dark:text-gray-400"
                    >{{ t`Customer` }}</FormLabel
                  >
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Customer name..."
                      class="h-14 rounded-lg bg-gray-50 dark:bg-gray-890 border-gray-100 dark:border-gray-800 focus:border-primary/50 focus:ring-primary/20 transition-all font-bold"
                      v-bind="field"
                      @input="handleCustomerInput"
                    />
                  </FormControl>
                  <FormMessage
                    class="text-[10px] font-bold text-red-400 normal-case tracking-tight"
                  />
                </FormItem>
              </FormField>

              <FormField v-slot="{ field }" name="contact">
                <FormItem>
                  <FormLabel
                    class="text-[10px] font-semibold normal-case tracking-normal text-gray-500 dark:text-gray-400"
                    >{{ t`Contact` }}</FormLabel
                  >
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Contact number..."
                      class="h-14 rounded-lg bg-gray-50 dark:bg-gray-890 border-gray-100 dark:border-gray-800 focus:border-primary/50 focus:ring-primary/20 transition-all font-bold"
                      v-bind="field"
                    />
                  </FormControl>
                  <FormMessage
                    class="text-[10px] font-bold text-red-400 normal-case tracking-tight"
                  />
                </FormItem>
              </FormField>
            </div>

            <FormField v-slot="{ field }" name="similarProduct">
              <FormItem>
                <FormLabel
                  class="text-[10px] font-semibold normal-case tracking-normal text-gray-500 dark:text-gray-400"
                  >{{ t`Similar Product` }}</FormLabel
                >
                <FormControl>
                  <Input
                    type="text"
                    placeholder="Search for similar items..."
                    class="h-14 rounded-lg bg-gray-50 dark:bg-gray-890 border-gray-100 dark:border-gray-800 focus:border-primary/50 focus:ring-primary/20 transition-all font-bold"
                    v-bind="field"
                  />
                </FormControl>
                <FormMessage
                  class="text-[10px] font-bold text-red-400 normal-case tracking-tight"
                />
              </FormItem>
            </FormField>
          </form>
        </ScrollArea>

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
            @click="onSubmit"
          >
            {{ t`Submit Inquiry` }}
          </UIButton>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { t } from 'fyo';
import { showToast } from 'src/utils/interactive';
import {
  Dialog,
  DialogContent,
  Input,
  ScrollArea,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from 'src/components/ui';
import LucideIcon from 'src/components/LucideIcon.vue';
import { ModelNameEnum } from 'models/types';
import { fyo } from 'src/initFyo';
import { ItemEnquirySchema } from 'src/shared/schemas';

export default defineComponent({
  name: 'ItemEnquiryModal',
  components: {
    Dialog,
    DialogContent,
    Input,
    ScrollArea,
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
    LucideIcon,
  },
  emits: ['toggleModal'],
  setup(props, { emit }) {
    const { handleSubmit, setFieldValue, resetForm } = useForm({
      validationSchema: toTypedSchema(ItemEnquirySchema),
    });

    const updateCustomerContact = async (customer: string) => {
      if (!customer) return;
      try {
        const contact =
          ((await fyo.getValue('Party', customer, 'phone')) as string) || '';
        setFieldValue('contact', contact);
      } catch (error) {
        console.error('Failed to fetch customer contact:', error);
      }
    };

    const handleCustomerInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      updateCustomerContact(target.value);
    };

    const onSubmit = handleSubmit(async (values) => {
      try {
        const itemEnquiryDoc = fyo.doc.getNewDoc(
          ModelNameEnum.ItemEnquiry,
          values as any
        );
        await itemEnquiryDoc.sync();
        showToast({
          type: 'success',
          message: t`Item enquiry submitted`,
        });
        resetForm();
        emit('toggleModal', 'ItemEnquiry');
      } catch (error) {
        showToast({
          type: 'error',
          message: t`${error as string}`,
        });
      }
    });

    const closeModal = () => {
      resetForm();
      emit('toggleModal', 'ItemEnquiry');
    };

    return {
      t,
      onSubmit,
      closeModal,
      handleCustomerInput,
    };
  },
});
</script>
