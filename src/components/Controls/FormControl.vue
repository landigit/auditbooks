<script lang="ts">
import { defineComponent, h, Component, PropType } from 'vue';
import AttachImage from './AttachImage.vue';
import Attachment from './Attachment.vue';
import AutoComplete from './AutoComplete.vue';
import Check from './Check.vue';
import Button from './Button.vue';
import Color from './Color.vue';
import Currency from './Currency.vue';
import Data from './Data.vue';
import Date from './Date.vue';
import Datetime from './Datetime.vue';
import DynamicLink from './DynamicLink.vue';
import Float from './Float.vue';
import Int from './Int.vue';
import Link from './Link.vue';
import Select from './Select.vue';
import Text from './Text.vue';
import Secret from './Secret.vue';
import { Field } from 'schemas/types';

const components: Record<string, Component> = {
  AttachImage,
  Data,
  Check,
  Button,
  Color,
  Select,
  Link,
  Date,
  Datetime,
  AutoComplete,
  DynamicLink,
  Int,
  Float,
  Attachment,
  Currency,
  Text,
  Secret,
};
interface ControlInstance {
  focus?: () => void;
  $refs?: {
    input?: unknown;
  };
}

export default defineComponent({
  name: 'FormControl',
  props: {
    df: {
      type: Object as PropType<Field>,
      required: true,
    },
    value: {
      type: [String, Number, Boolean, Object] as PropType<unknown>,
    },
  },
  methods: {
    clear() {
      // Cast to access dynamic Vue ref methods safely
      const control = this.$refs.control as unknown as ControlInstance;
      const input = control?.$refs?.input;
      if (input instanceof HTMLInputElement) {
        input.value = '';
      }
    },
    select() {
      // Cast to access dynamic Vue ref methods safely
      const control = this.$refs.control as unknown as ControlInstance;
      const input = control?.$refs?.input;
      if (
        input &&
        typeof input === 'object' &&
        'select' in input &&
        typeof input.select === 'function'
      ) {
        input.select();
      }
    },
    focus() {
      // Cast to access dynamic Vue ref methods safely
      const control = this.$refs.control as unknown as ControlInstance;
      control?.focus?.();
    },
    getInput() {
      // Cast to access dynamic Vue ref methods safely
      const control = this.$refs.control as unknown as ControlInstance;
      return control?.$refs?.input;
    },
  },
  render() {
    const fieldtype = this.df.fieldtype;
    const component = components[fieldtype] ?? Data;

    return h(component, {
      ...this.$attrs,
      df: this.df,
      value: this.value,
      ref: 'control',
    });
  },
});
</script>
