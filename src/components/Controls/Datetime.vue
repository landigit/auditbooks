<script lang="ts">
import { DateTime } from 'luxon';
import { defineComponent } from 'vue';
import DateVue from './Date.vue';

export default defineComponent({
  extends: DateVue,
  computed: {
    inputType() {
      return 'datetime-local';
    },
    inputValue(): string {
      let value = this.value;
      if (typeof value === 'string') {
        value = new Date(value);
      }

      if (value instanceof Date && !Number.isNaN(value.valueOf())) {
        return DateTime.fromJSDate(value).toISO().split('.')[0];
      }

      return '';
    },
  },
});
</script>
