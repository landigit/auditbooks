import { ref, watch } from 'vue';
import { PeriodKey } from 'src/utils/types';

export function useDashboardChart(
  props: { commonPeriod: PeriodKey },
  emit: (event: 'period-change', value: PeriodKey) => void,
  setData: () => Promise<void>,
  periodOptions: PeriodKey[]
) {
  const period = ref<PeriodKey>('This Year');

  watch(
    () => props.commonPeriod,
    (val) => {
      if (periodOptions.includes(val)) {
        period.value = val;
      }
    },
    { immediate: true }
  );

  watch(period, async (newVal) => {
    emit('period-change', newVal);
    await setData();
  });

  return {
    period,
  };
}
