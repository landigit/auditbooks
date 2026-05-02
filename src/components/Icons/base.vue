<script lang="ts">
export default {
  name: 'IconBase',
  props: {
    active: Boolean,
  },
  computed: {
    lightColor(): string {
      return this.active
        ? 'var(--icon-light-active)'
        : 'var(--icon-light-passive)';
    },
    darkColor(): string {
      return this.active
        ? 'var(--icon-dark-active)'
        : 'var(--icon-dark-passive)';
    },
  },
};
</script>
