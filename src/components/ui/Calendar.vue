<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue';
import {
  CalendarRoot,
  type CalendarRootEmits,
  type CalendarRootProps,
  CalendarHeader,
  CalendarHeading,
  CalendarNext,
  CalendarPrev,
  CalendarGrid,
  CalendarGridHead,
  CalendarHeadCell,
  CalendarGridBody,
  CalendarGridRow,
  CalendarCell,
  CalendarCellTrigger,
  useForwardPropsEmits,
} from 'reka-ui';
import { cn } from 'src/utils/cn';

const props = defineProps<
  CalendarRootProps & { class?: HTMLAttributes['class'] }
>();
const emits = defineEmits<CalendarRootEmits>();

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props;
  return delegated;
});

const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <CalendarRoot
    v-slot="{ grid, weekDays }"
    :class="cn('p-4 bg-surface border border-border rounded', props.class)"
    v-bind="forwarded"
  >
    <CalendarHeader class="flex items-center justify-between">
      <CalendarPrev
        :class="
          cn(
            'h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100 flex items-center justify-center rounded-md hover:bg-surface-hover transition-colors cursor-pointer'
          )
        "
        aria-label="Previous month"
      >
        <lucide-icon name="chevron-left" class="h-4 w-4" />
      </CalendarPrev>
      <CalendarHeading class="text-base font-medium text-main" />
      <CalendarNext
        :class="
          cn(
            'h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100 flex items-center justify-center rounded-md hover:bg-surface-hover transition-colors cursor-pointer'
          )
        "
        aria-label="Next month"
      >
        <lucide-icon name="chevron-right" class="h-4 w-4" />
      </CalendarNext>
    </CalendarHeader>

    <div
      class="flex flex-col space-y-4 pt-4 sm:flex-row sm:space-x-4 sm:space-y-0"
    >
      <CalendarGrid
        v-for="month in grid"
        :key="month.value.toString()"
        class="w-full border-collapse space-y-1"
      >
        <CalendarGridHead>
          <CalendarGridRow class="flex w-full justify-between">
            <CalendarHeadCell
              v-for="day in weekDays"
              :key="day"
              class="text-description rounded-md w-9 font-medium text-xs flex items-center justify-center h-9"
            >
              {{ day }}
            </CalendarHeadCell>
          </CalendarGridRow>
        </CalendarGridHead>
        <CalendarGridBody>
          <CalendarGridRow
            v-for="(weekDates, index) in month.rows"
            :key="`weekDate-${index}`"
            class="flex w-full mt-1 justify-between"
          >
            <CalendarCell
              v-for="weekDate in weekDates"
              :key="weekDate.toString()"
              :date="weekDate"
              class="h-9 w-9 text-center p-0 relative focus-within:relative focus-within:z-20"
            >
              <CalendarCellTrigger
                :day="weekDate"
                :month="month.value"
                :class="
                  cn(
                    'h-9 w-9 p-0 font-normal text-sm aria-selected:opacity-100 flex items-center justify-center rounded-full hover:bg-surface-hover transition-colors cursor-pointer',
                    'data-[selected]:bg-indicator-green-bg data-[selected]:text-white data-[selected]:hover:bg-indicator-green-bg data-[selected]:hover:text-white data-[selected]:font-bold',
                    'data-[today]:bg-surface-hover data-[today]:text-indicator-green-bg data-[today]:font-semibold',
                    'data-[outside-view]:text-description data-[outside-view]:opacity-20',
                    'data-[disabled]:text-description data-[disabled]:opacity-20'
                  )
                "
              />
            </CalendarCell>
          </CalendarGridRow>
        </CalendarGridBody>
      </CalendarGrid>
    </div>
  </CalendarRoot>
</template>
