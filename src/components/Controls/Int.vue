<script lang="ts">
import { safeParseInt } from 'utils/index';
import { defineComponent } from 'vue';
import Data from './Data.vue';

export default defineComponent({
  name: 'Int',
  extends: Data,
  computed: {
    inputType() {
      return 'number';
    },
  },
  methods: {
    parse(value: unknown): number {
      return safeParseInt(value);
    },
  },
});
</script>
