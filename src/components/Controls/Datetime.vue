<script lang="ts">
import { defineComponent } from 'vue';
import DateVue from './Date.vue';
import { DateTime } from 'luxon';

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

        const iso = value instanceof Date ? DateTime.fromJSDate(value).toISO() : null;
        return iso ? iso.split('.')[0] : '';

      return '';
    },
  },
});
</script>
