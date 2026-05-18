<script setup lang="ts">
import { useIconColors } from './useIconColors';

const props = withDefaults(defineProps<{
  active?: boolean;
}>(), {
  active: false,
});

const { lightColor, darkColor } = useIconColors(() => !!props.active);

defineExpose({
  lightColor,
  darkColor,
});
</script>
