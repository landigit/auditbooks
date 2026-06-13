<script lang="ts">
import { uicolors } from 'src/utils/colors';

const iconColorMap: Record<string, string> = {
  general: 'cyan',
  dashboard: 'blue',
  sales: 'green',
  purchase: 'purple',
  'common-entries': 'indigo',
  reports: 'pink',
  inventory: 'teal',
  pos: 'orange',
  gst: 'amber',
  settings: 'violet',
};

export default {
  name: 'IconBase',
  props: {
    active: Boolean,
    darkMode: { type: Boolean, default: false },
    name: String,
  },
  computed: {
    lightColor(): string {
      const colorKey = this.name && iconColorMap[this.name];
      if (colorKey && (uicolors as any)[colorKey]) {
        const colorPalette = (uicolors as any)[colorKey];
        if (this.active) {
          return this.darkMode ? colorPalette['300'] : colorPalette['400'];
        } else {
          return this.darkMode ? colorPalette['700'] : colorPalette['400'];
        }
      }
      const activeGray = this.darkMode
        ? uicolors.gray['400']
        : uicolors.gray['600'];
      const passiveGray = this.darkMode
        ? uicolors.gray['600']
        : uicolors.gray['500'];
      return this.active ? activeGray : passiveGray;
    },
    darkColor(): string {
      const colorKey = this.name && iconColorMap[this.name];
      if (colorKey && (uicolors as any)[colorKey]) {
        const colorPalette = (uicolors as any)[colorKey];
        if (this.active) {
          return this.darkMode ? colorPalette['200'] : colorPalette['600'];
        } else {
          return this.darkMode ? colorPalette['500'] : colorPalette['500'];
        }
      }
      const activeGray = this.darkMode
        ? uicolors.gray['200']
        : uicolors.gray['800'];
      const passiveGray = this.darkMode
        ? uicolors.gray['500']
        : uicolors.gray['650'];
      return this.active ? activeGray : passiveGray;
    },
    bgColor(): string {
      return this.darkMode ? uicolors.gray['900'] : uicolors.gray['100'];
    },
  },
};
</script>
