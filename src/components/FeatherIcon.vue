<script>
import * as icons from 'lucide-vue-next';
import { h } from 'vue';

const toPascalCase = (str) =>
  str.replace(/(^\w|-\w)/g, (match) => match.replace(/-/, '').toUpperCase());

export default {
  props: {
    name: {
      type: String,
      required: true,
    },
    size: {
      type: [String, Number],
      default: 16,
    },
    strokeWidth: {
      type: [String, Number],
      default: 2,
    },
  },
  render() {
    const iconName = toPascalCase(this.name);
    const Icon = icons[iconName];

    if (!Icon) {
      console.warn(
        `[Lucide] Icon "${this.name}" (mapped to "${iconName}") not found.`
      );
      return null;
    }

    return h(Icon, {
      size: this.size,
      'stroke-width': this.strokeWidth,
      class: 'lucide-icon',
    });
  },
};
</script>

<style scoped>
.lucide-icon {
  display: inline-block;
  vertical-align: middle;
}
</style>
